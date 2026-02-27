import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface FridayNightSmoker {
  id: number;
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  image_url?: string;
  created_at: number;
  likes: number;
  comments: number;
}

interface FridayNightLegend {
  username: string;
  fridayNightCount: number;
  avgRating: number;
  favoriteBrand: string | null;
}

// GET /api/friday-night-live - Real-time Friday night activity
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const now = new Date();
    const currentHour = now.getUTCHours() - 5; // EST offset
    const adjustedHour = currentHour < 0 ? currentHour + 24 : currentHour;
    const dayOfWeek = now.getUTCDay();
    
    // Friday night window: Friday 6 PM - Saturday 2 AM (18:00 - 26:00)
    // Or in terms of days: Friday 6-11:59 PM OR Saturday 12-2 AM
    const isFridayNight = 
      (dayOfWeek === 5 && adjustedHour >= 18) || // Friday 6 PM+
      (dayOfWeek === 6 && adjustedHour < 2);     // Saturday before 2 AM

    // Get tonight's Friday night window timestamps
    const nowTs = Math.floor(Date.now() / 1000);
    let windowStart: number;
    let windowEnd: number;
    
    if (dayOfWeek === 5 && adjustedHour >= 18) {
      // Friday evening - window started today at 6 PM
      const today6PM = new Date(now);
      today6PM.setUTCHours(23, 0, 0, 0); // 6 PM EST = 23 UTC
      windowStart = Math.floor(today6PM.getTime() / 1000);
      windowEnd = windowStart + 8 * 3600; // Until 2 AM
    } else if (dayOfWeek === 6 && adjustedHour < 2) {
      // Early Saturday - window started yesterday at 6 PM
      const yesterday6PM = new Date(now);
      yesterday6PM.setDate(yesterday6PM.getDate() - 1);
      yesterday6PM.setUTCHours(23, 0, 0, 0);
      windowStart = Math.floor(yesterday6PM.getTime() / 1000);
      windowEnd = windowStart + 8 * 3600;
    } else {
      // Not Friday night - show last Friday's data
      const lastFriday = new Date(now);
      const daysAgo = (dayOfWeek + 2) % 7 || 7; // Days since last Friday
      lastFriday.setDate(lastFriday.getDate() - daysAgo);
      lastFriday.setUTCHours(23, 0, 0, 0);
      windowStart = Math.floor(lastFriday.getTime() / 1000);
      windowEnd = windowStart + 8 * 3600;
    }

    // Get active Friday night smokers (check-ins in current window)
    const activeSmokers = await db.prepare(`
      SELECT 
        c.id, u.username, c.brand, c.product, c.rating, c.image_url, c.created_at,
        (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as likes,
        (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) as comments
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at <= ?
        AND u.username NOT LIKE 'puffed%'
      ORDER BY c.created_at DESC
      LIMIT 20
    `).bind(windowStart, windowEnd).all<FridayNightSmoker>();

    // Get all-time Friday night legends (Friday 6PM - Sat 2AM across all weeks)
    const legends = await db.prepare(`
      SELECT 
        u.username,
        COUNT(c.id) as fridayNightCount,
        ROUND(AVG(c.rating), 1) as avgRating,
        (
          SELECT brand FROM checkins c2 
          WHERE c2.user_id = u.id 
            AND strftime('%w', c2.created_at, 'unixepoch') = '5'
            AND CAST(strftime('%H', c2.created_at, 'unixepoch', '-5 hours') AS INTEGER) >= 18
          GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1
        ) as favoriteBrand
      FROM users u
      JOIN checkins c ON c.user_id = u.id
      WHERE u.username NOT LIKE 'puffed%'
        AND (
          (strftime('%w', c.created_at, 'unixepoch') = '5' AND CAST(strftime('%H', c.created_at, 'unixepoch', '-5 hours') AS INTEGER) >= 18)
          OR
          (strftime('%w', c.created_at, 'unixepoch') = '6' AND CAST(strftime('%H', c.created_at, 'unixepoch', '-5 hours') AS INTEGER) < 2)
        )
      GROUP BY u.id
      ORDER BY fridayNightCount DESC
      LIMIT 10
    `).all<FridayNightLegend>();

    // Tonight's stats
    const tonightStats = await db.prepare(`
      SELECT 
        COUNT(*) as checkins,
        COUNT(DISTINCT user_id) as uniqueSmokers,
        ROUND(AVG(rating), 1) as avgRating,
        (SELECT brand FROM checkins WHERE created_at >= ? AND created_at <= ? GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1) as topBrand
      FROM checkins
      WHERE created_at >= ? AND created_at <= ?
    `).bind(windowStart, windowEnd, windowStart, windowEnd).first<{
      checkins: number;
      uniqueSmokers: number;
      avgRating: number;
      topBrand: string | null;
    }>();

    // All-time Friday night stats
    const allTimeStats = await db.prepare(`
      SELECT 
        COUNT(*) as totalCheckins,
        COUNT(DISTINCT user_id) as uniqueSmokers,
        ROUND(AVG(rating), 1) as avgRating
      FROM checkins
      WHERE (
        (strftime('%w', created_at, 'unixepoch') = '5' AND CAST(strftime('%H', created_at, 'unixepoch', '-5 hours') AS INTEGER) >= 18)
        OR
        (strftime('%w', created_at, 'unixepoch') = '6' AND CAST(strftime('%H', created_at, 'unixepoch', '-5 hours') AS INTEGER) < 2)
      )
    `).first<{
      totalCheckins: number;
      uniqueSmokers: number;
      avgRating: number;
    }>();

    // Party vibes messages based on activity
    const partyLevel = activeSmokers.results?.length || 0;
    let partyVibe: { emoji: string; message: string };
    if (partyLevel >= 10) {
      partyVibe = { emoji: "🎉", message: "PACKED HOUSE! The party is ON! 🔥" };
    } else if (partyLevel >= 5) {
      partyVibe = { emoji: "🎊", message: "Getting lit! More smokers joining!" };
    } else if (partyLevel >= 2) {
      partyVibe = { emoji: "🎈", message: "Party's starting! Who's next?" };
    } else if (partyLevel >= 1) {
      partyVibe = { emoji: "🌟", message: "First one here! Start the party!" };
    } else {
      partyVibe = { emoji: "🚀", message: "Be the first to kick off Friday night!" };
    }

    return NextResponse.json({
      isFridayNight,
      currentHour: adjustedHour,
      dayOfWeek,
      partyVibe,
      activeSmokers: activeSmokers.results || [],
      legends: legends.results || [],
      tonightStats: tonightStats || { checkins: 0, uniqueSmokers: 0, avgRating: null, topBrand: null },
      allTimeStats: allTimeStats || { totalCheckins: 0, uniqueSmokers: 0, avgRating: null },
      windowStart,
      windowEnd,
    });

  } catch (error) {
    console.error("Friday Night Live error:", error);
    return NextResponse.json({ 
      error: "Failed to load",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
