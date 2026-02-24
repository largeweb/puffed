import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie, generateId } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";
import type { CheckinRequest } from "@/lib/types";
import { normalizeBrandName, normalizeProductName } from "@/lib/normalize";

export const runtime = "edge";

// Get user's check-ins
export async function GET(request: NextRequest) {
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

    // Get check-ins
    const checkins = await db
      .prepare(`
        SELECT * FROM checkins 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 50
      `)
      .bind(session.user_id)
      .all();

    return NextResponse.json({ checkins: checkins.results });
  } catch (error) {
    console.error("Get checkins error:", error);
    return NextResponse.json({ error: "Failed to get check-ins" }, { status: 500 });
  }
}

// Delete a check-in
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const checkinId = searchParams.get("id");

    if (!checkinId) {
      return NextResponse.json({ error: "Check-in ID is required" }, { status: 400 });
    }

    // Verify ownership before deleting
    const checkin = await db
      .prepare("SELECT id FROM checkins WHERE id = ? AND user_id = ?")
      .bind(checkinId, session.user_id)
      .first();

    if (!checkin) {
      return NextResponse.json({ error: "Check-in not found or not owned by you" }, { status: 404 });
    }

    // Delete associated likes and comments first
    await db.prepare("DELETE FROM likes WHERE checkin_id = ?").bind(checkinId).run();
    await db.prepare("DELETE FROM comments WHERE checkin_id = ?").bind(checkinId).run();
    
    // Delete the check-in
    await db.prepare("DELETE FROM checkins WHERE id = ?").bind(checkinId).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete checkin error:", error);
    return NextResponse.json({ error: "Failed to delete check-in" }, { status: 500 });
  }
}

// Edit a check-in
export async function PATCH(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const checkinId = searchParams.get("id");

    if (!checkinId) {
      return NextResponse.json({ error: "Check-in ID is required" }, { status: 400 });
    }

    // Verify ownership before editing
    const existingCheckin = await db
      .prepare("SELECT id, brand, product FROM checkins WHERE id = ? AND user_id = ?")
      .bind(checkinId, session.user_id)
      .first<{ id: string; brand: string; product: string | null }>();

    if (!existingCheckin) {
      return NextResponse.json({ error: "Check-in not found or not owned by you" }, { status: 404 });
    }

    const body = await request.json() as {
      brand?: string;
      product?: string;
      rating?: number;
      review?: string;
      flavorNotes?: string;
      drawRating?: number;
      burnRating?: number;
      aromaRating?: number;
      smokeTimeMins?: number;
      strainName?: string;
      strainType?: string;
      effects?: string;
      thcPercent?: number;
    };
    const { 
      brand, product, rating, review,
      flavorNotes, drawRating, burnRating, aromaRating, smokeTimeMins,
      strainName, strainType, effects, thcPercent
    } = body;

    // Normalize brand and product names if provided
    const normalizedBrand = brand ? normalizeBrandName(brand) : existingCheckin.brand;
    const normalizedProduct = product !== undefined ? normalizeProductName(product || null) : existingCheckin.product;

    // Build dynamic UPDATE query with only provided fields
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (brand !== undefined) {
      updates.push("brand = ?");
      values.push(normalizedBrand);
    }
    if (product !== undefined) {
      updates.push("product = ?");
      values.push(normalizedProduct);
    }
    if (rating !== undefined) {
      updates.push("rating = ?");
      values.push(rating);
    }
    if (review !== undefined) {
      updates.push("review = ?");
      values.push(review || null);
    }
    if (flavorNotes !== undefined) {
      updates.push("flavor_notes = ?");
      values.push(flavorNotes || null);
    }
    if (drawRating !== undefined) {
      updates.push("draw_rating = ?");
      values.push(drawRating);
    }
    if (burnRating !== undefined) {
      updates.push("burn_rating = ?");
      values.push(burnRating);
    }
    if (aromaRating !== undefined) {
      updates.push("aroma_rating = ?");
      values.push(aromaRating);
    }
    if (smokeTimeMins !== undefined) {
      updates.push("smoke_time_mins = ?");
      values.push(smokeTimeMins);
    }
    if (strainName !== undefined) {
      updates.push("strain_name = ?");
      values.push(strainName || null);
    }
    if (strainType !== undefined) {
      updates.push("strain_type = ?");
      values.push(strainType || null);
    }
    if (effects !== undefined) {
      updates.push("effects = ?");
      values.push(effects || null);
    }
    if (thcPercent !== undefined) {
      updates.push("thc_percent = ?");
      values.push(thcPercent);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // Add checkin ID to values
    values.push(checkinId);

    await db
      .prepare(`UPDATE checkins SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();

    return NextResponse.json({ success: true, id: checkinId });
  } catch (error) {
    console.error("Edit checkin error:", error);
    return NextResponse.json({ error: "Failed to edit check-in" }, { status: 500 });
  }
}

// Create new check-in
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

    const body = (await request.json()) as CheckinRequest;
    const { 
      category = 'cigar',
      brand, product, rating, review, imageUrl, mood, drinkPairing,
      // Cigar fields
      flavorNotes, drawRating, burnRating, aromaRating, smokeTimeMins,
      // Cannabis fields
      strainName, strainType, effects, thcPercent
    } = body;

    if (!brand) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 });
    }

    // Normalize brand and product names for consistency
    const normalizedBrand = normalizeBrandName(brand);
    const normalizedProduct = normalizeProductName(product || null);

    const checkinId = generateId();

    await db
      .prepare(`
        INSERT INTO checkins (
          id, user_id, category, brand, product, rating, review, image_url, mood, drink_pairing,
          flavor_notes, draw_rating, burn_rating, aroma_rating, smoke_time_mins,
          strain_name, strain_type, effects, thc_percent
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        checkinId,
        session.user_id,
        category,
        normalizedBrand,
        normalizedProduct,
        rating || null,
        review || null,
        imageUrl || null,
        mood || null,
        drinkPairing || null,
        flavorNotes || null,
        drawRating || null,
        burnRating || null,
        aromaRating || null,
        smokeTimeMins || null,
        strainName || null,
        strainType || null,
        effects || null,
        thcPercent || null
      )
      .run();

    // Create "smoke buddy" notifications for users who have smoked the same brand
    // This creates connection and drives engagement
    try {
      // Find other users who have logged this brand (limit to 10 to prevent spam)
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

      // Create notifications for each smoke buddy
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
      // Non-critical - don't fail the check-in if notifications fail
      console.error("Failed to create smoke buddy notifications:", e);
    }

    // Check for milestone check-in counts and celebrate!
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

    // Check if this brand was on user's wishlist and celebrate!
    try {
      const wishlistItem = await db
        .prepare(`
          SELECT id FROM wishlist 
          WHERE user_id = ? AND LOWER(brand) = LOWER(?)
        `)
        .bind(session.user_id, normalizedBrand)
        .first<{ id: string }>();

      if (wishlistItem) {
        // Send celebration notification
        const notifId = generateId();
        const wishlistMsg = `🎯 Wishlist complete! You finally tried ${normalizedBrand}! How was it? 🎉`;
        await db
          .prepare(`
            INSERT INTO notifications (id, user_id, type, from_user_id, message, checkin_id, created_at)
            VALUES (?, ?, 'milestone', ?, ?, ?, unixepoch())
          `)
          .bind(notifId, session.user_id, session.user_id, wishlistMsg, checkinId)
          .run();
        
        // Note: We don't auto-remove from wishlist - the UI shows it as "completed" instead
        // Users can remove manually if they want
      }
    } catch (e) {
      console.error("Failed to check wishlist:", e);
    }

    return NextResponse.json({ success: true, id: checkinId });
  } catch (error) {
    console.error("Create checkin error:", error);
    return NextResponse.json({ error: "Failed to create check-in" }, { status: 500 });
  }
}
