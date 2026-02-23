import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie, generateId } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { normalizeBrandName, normalizeProductName } from "@/lib/normalize";

export const runtime = "edge";

interface QuickSmokeRequest {
  brand: string;
  product?: string;
  rating?: number;
}

/**
 * Quick Smoke - One-tap check-in for your regular brands
 * Creates a minimal check-in with just brand/product, no photo required
 */
export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const now = Math.floor(Date.now() / 1000);
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
      .bind(sessionId, now)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const body: QuickSmokeRequest = await request.json();
    const { brand, product, rating } = body;

    if (!brand || typeof brand !== "string" || brand.trim().length === 0) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 });
    }

    // Normalize brand and product names
    const normalizedBrand = normalizeBrandName(brand);
    const normalizedProduct = product ? normalizeProductName(product) : null;

    // Validate rating if provided
    const validRating = rating && rating >= 1 && rating <= 5 ? rating : null;

    // Create the quick check-in (category defaults to 'cigar')
    const checkinId = generateId();
    await db
      .prepare(`
        INSERT INTO checkins (
          id, user_id, brand, product, rating, category, created_at
        ) VALUES (?, ?, ?, ?, ?, 'cigar', unixepoch())
      `)
      .bind(
        checkinId,
        session.user_id,
        normalizedBrand,
        normalizedProduct,
        validRating
      )
      .run();

    // Create "smoke buddy" notifications for users who have smoked the same brand
    try {
      const smokeBuddies = await db
        .prepare(`
          SELECT DISTINCT c.user_id 
          FROM checkins c 
          WHERE LOWER(c.brand) = LOWER(?) 
            AND c.user_id != ?
          LIMIT 10
        `)
        .bind(normalizedBrand, session.user_id)
        .all<{ user_id: string }>();

      for (const buddy of smokeBuddies.results || []) {
        const notifId = generateId();
        await db
          .prepare(`
            INSERT INTO notifications (id, user_id, type, from_user_id, checkin_id, created_at)
            VALUES (?, ?, 'smoke_buddy', ?, ?, unixepoch())
          `)
          .bind(notifId, buddy.user_id, session.user_id, checkinId)
          .run();
      }
    } catch (e) {
      console.error("Failed to create smoke buddy notifications:", e);
    }

    // Check for milestone check-in counts
    try {
      const countResult = await db
        .prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ?")
        .bind(session.user_id)
        .first<{ count: number }>();

      const checkInCount = countResult?.count || 0;
      const milestones = [5, 10, 25, 50, 100, 250, 500, 1000];
      
      if (milestones.includes(checkInCount)) {
        const notifId = generateId();
        const milestoneMsg = `🎉 Milestone: ${checkInCount} check-ins! You're on fire! Keep the smokes coming 🔥`;
        await db
          .prepare(`
            INSERT INTO notifications (id, user_id, type, from_user_id, message, created_at)
            VALUES (?, ?, 'milestone', ?, ?, unixepoch())
          `)
          .bind(notifId, session.user_id, session.user_id, milestoneMsg)
          .run();
      }
    } catch (e) {
      console.error("Failed to create milestone notification:", e);
    }

    // Check if this brand was on user's wishlist
    try {
      const wishlistItem = await db
        .prepare(`
          SELECT id FROM wishlist 
          WHERE user_id = ? AND LOWER(brand) = LOWER(?)
        `)
        .bind(session.user_id, normalizedBrand)
        .first<{ id: string }>();

      if (wishlistItem) {
        const notifId = generateId();
        const wishlistMsg = `🎯 Wishlist complete! You finally tried ${normalizedBrand}! How was it? 🎉`;
        await db
          .prepare(`
            INSERT INTO notifications (id, user_id, type, from_user_id, message, checkin_id, created_at)
            VALUES (?, ?, 'milestone', ?, ?, ?, unixepoch())
          `)
          .bind(notifId, session.user_id, session.user_id, wishlistMsg, checkinId)
          .run();
      }
    } catch (e) {
      console.error("Failed to check wishlist:", e);
    }

    // Get updated user stats for response
    const statsResult = await db
      .prepare(`
        SELECT 
          COUNT(*) as total_checkins,
          COUNT(DISTINCT brand) as unique_brands
        FROM checkins 
        WHERE user_id = ?
      `)
      .bind(session.user_id)
      .first<{ total_checkins: number; unique_brands: number }>();

    return NextResponse.json({ 
      success: true, 
      id: checkinId,
      brand: normalizedBrand,
      product: normalizedProduct,
      stats: {
        total_checkins: statsResult?.total_checkins || 0,
        unique_brands: statsResult?.unique_brands || 0,
      },
      message: `⚡ Quick smoke logged: ${normalizedBrand}${normalizedProduct ? ` - ${normalizedProduct}` : ''}!`
    });
  } catch (error) {
    console.error("Quick smoke error:", error);
    return NextResponse.json({ error: "Failed to log quick smoke" }, { status: 500 });
  }
}
