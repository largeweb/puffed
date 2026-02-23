import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface ActiveSmoker {
  user_id: string;
  username: string;
  brand: string;
  product: string | null;
  image_url: string | null;
  rating: number | null;
  minutes_ago: number;
  checkin_id: string;
}

// Get users who have smoked recently (last N hours)
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    // Allow unauthenticated access for discovery
    const { env } = getRequestContext();
    const db = env.DB;

    // Get current user ID if authenticated
    let currentUserId: string | null = null;
    if (sessionId) {
      const now = Math.floor(Date.now() / 1000);
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
        .bind(sessionId, now)
        .first<{ user_id: string }>();
      if (session) {
        currentUserId = session.user_id;
      }
    }

    // Get hours from query params (default 2 hours)
    const { searchParams } = new URL(request.url);
    const hours = Math.min(parseInt(searchParams.get("hours") || "2"), 24);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20);

    const cutoffTime = Math.floor(Date.now() / 1000) - (hours * 60 * 60);
    const now = Math.floor(Date.now() / 1000);

    // Get recent check-ins with user info, one per user (most recent)
    const smokers = await db
      .prepare(`
        WITH RecentCheckins AS (
          SELECT 
            c.id as checkin_id,
            c.user_id,
            c.brand,
            c.product,
            c.image_url,
            c.rating,
            c.created_at,
            u.username,
            ROW_NUMBER() OVER (PARTITION BY c.user_id ORDER BY c.created_at DESC) as rn
          FROM checkins c
          JOIN users u ON c.user_id = u.id
          WHERE c.created_at >= ?
        )
        SELECT 
          user_id,
          username,
          brand,
          product,
          image_url,
          rating,
          checkin_id,
          CAST((? - created_at) / 60 AS INTEGER) as minutes_ago
        FROM RecentCheckins
        WHERE rn = 1
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .bind(cutoffTime, now, limit)
      .all<ActiveSmoker>();

    // Filter out current user if authenticated
    const filteredSmokers = (smokers.results || []).filter(
      s => s.user_id !== currentUserId
    );

    // Also get count of unique smokers in last 24h for context
    const stats = await db
      .prepare(`
        SELECT 
          COUNT(DISTINCT user_id) as smokers_24h,
          COUNT(*) as checkins_24h
        FROM checkins
        WHERE created_at >= ?
      `)
      .bind(Math.floor(Date.now() / 1000) - (24 * 60 * 60))
      .first<{ smokers_24h: number; checkins_24h: number }>();

    return NextResponse.json({ 
      smokers: filteredSmokers,
      count: filteredSmokers.length,
      stats: {
        activeNow: filteredSmokers.length,
        smokersToday: stats?.smokers_24h || 0,
        checkinsToday: stats?.checkins_24h || 0,
      }
    });
  } catch (error) {
    console.error("Get active smokers error:", error);
    return NextResponse.json({ error: "Failed to get active smokers" }, { status: 500 });
  }
}
