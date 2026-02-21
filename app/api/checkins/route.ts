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
    const { brand, product, rating, review, flavorNotes, drawRating, burnRating, aromaRating, smokeTimeMins } = body;

    if (!brand) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 });
    }

    const checkinId = generateId();

    await db
      .prepare(`
        INSERT INTO checkins (id, user_id, brand, product, rating, review, flavor_notes, draw_rating, burn_rating, aroma_rating, smoke_time_mins)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        checkinId,
        session.user_id,
        brand,
        product || null,
        rating || null,
        review || null,
        flavorNotes || null,
        drawRating || null,
        burnRating || null,
        aromaRating || null,
        smokeTimeMins || null
      )
      .run();

    return NextResponse.json({ success: true, id: checkinId });
  } catch (error) {
    console.error("Create checkin error:", error);
    return NextResponse.json({ error: "Failed to create check-in" }, { status: 500 });
  }
}
