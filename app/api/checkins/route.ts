import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie, generateId } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";
import type { CheckinRequest } from "@/lib/types";

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
      brand, product, rating, review, imageUrl,
      // Cigar fields
      flavorNotes, drawRating, burnRating, aromaRating, smokeTimeMins,
      // Cannabis fields
      strainName, strainType, effects, thcPercent
    } = body;

    if (!brand) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 });
    }

    const checkinId = generateId();

    await db
      .prepare(`
        INSERT INTO checkins (
          id, user_id, category, brand, product, rating, review, image_url,
          flavor_notes, draw_rating, burn_rating, aroma_rating, smoke_time_mins,
          strain_name, strain_type, effects, thc_percent
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        checkinId,
        session.user_id,
        category,
        brand,
        product || null,
        rating || null,
        review || null,
        imageUrl || null,
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
        .bind(brand, session.user_id)
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

    return NextResponse.json({ success: true, id: checkinId });
  } catch (error) {
    console.error("Create checkin error:", error);
    return NextResponse.json({ error: "Failed to create check-in" }, { status: 500 });
  }
}
