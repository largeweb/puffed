import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Auth check
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);
    
    let userId: number | null = null;
    if (sessionId) {
      const now = Math.floor(Date.now() / 1000);
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
        .bind(sessionId, now)
        .first<{ user_id: number }>();
      if (session) {
        userId = session.user_id;
      }
    }

    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    // Thursday evening window: 6 PM Thursday to 2 AM Friday
    const thursdayEveningStart = new Date();
    thursdayEveningStart.setHours(18, 0, 0, 0);
    const thursdayEveningStartMs = thursdayEveningStart.getTime();
    
    // Get current day of week (0 = Sunday, 4 = Thursday)
    const dayOfWeek = new Date().getDay();
    const isThursday = dayOfWeek === 4;
    const isFridayEarlyMorning = dayOfWeek === 5 && new Date().getHours() < 4;
    const isFridayEve = isThursday || isFridayEarlyMorning;

    // Tonight's Friday Eve smokers (6 PM - 2 AM)
    const tonightRes = await db.prepare(`
      SELECT c.id, u.username, c.brand, c.product, c.rating, c.image_url, c.created_at, c.drink_pairing
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      ORDER BY c.created_at DESC
      LIMIT 20
    `).bind(thursdayEveningStartMs).all();
    
    const tonightSmokers = tonightRes.results || [];

    // Tonight's stats
    const statsRes = await db.prepare(`
      SELECT 
        COUNT(*) as count,
        AVG(rating) as avgRating,
        COUNT(DISTINCT user_id) as uniqueSmokers
      FROM checkins
      WHERE created_at >= ?
    `).bind(thursdayEveningStartMs).first();

    // Most popular brand tonight
    const topBrandRes = await db.prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins
      WHERE created_at >= ?
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 1
    `).bind(thursdayEveningStartMs).first<{ brand: string }>();

    // All-time Thursday stats
    const thursdayStatsRes = await db.prepare(`
      SELECT 
        COUNT(*) as totalThursdaySmokes,
        AVG(rating) as avgRating,
        COUNT(DISTINCT user_id) as uniqueSmokers
      FROM checkins
      WHERE strftime('%w', datetime(created_at/1000, 'unixepoch')) = '4'
    `).first();

    // Top Thursday smokers (all time)
    const leadersRes = await db.prepare(`
      SELECT 
        u.username,
        COUNT(*) as count,
        AVG(c.rating) as avgRating
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE strftime('%w', datetime(c.created_at/1000, 'unixepoch')) = '4'
      GROUP BY c.user_id
      ORDER BY count DESC
      LIMIT 10
    `).all();

    // User's stats (if logged in)
    let userStats = {
      thursdaySmokes: 0,
      thursdayAvgRating: "0.0",
      tonightSmokes: 0
    };

    if (userId) {
      const userThursdayRes = await db.prepare(`
        SELECT 
          COUNT(*) as count,
          AVG(rating) as avgRating
        FROM checkins
        WHERE user_id = ?
        AND strftime('%w', datetime(created_at/1000, 'unixepoch')) = '4'
      `).bind(userId).first<{ count: number; avgRating: number }>();

      const userTonightRes = await db.prepare(`
        SELECT COUNT(*) as count
        FROM checkins
        WHERE user_id = ? AND created_at >= ?
      `).bind(userId, thursdayEveningStartMs).first<{ count: number }>();

      userStats = {
        thursdaySmokes: Number(userThursdayRes?.count || 0),
        thursdayAvgRating: Number(userThursdayRes?.avgRating || 0).toFixed(1),
        tonightSmokes: Number(userTonightRes?.count || 0)
      };
    }

    // Calculate time until Friday 5 PM (weekend kickoff!)
    const fridayFivePM = new Date();
    if (isThursday) {
      fridayFivePM.setDate(fridayFivePM.getDate() + 1);
    }
    fridayFivePM.setHours(17, 0, 0, 0);
    const msUntilWeekend = fridayFivePM.getTime() - now;
    const hoursUntilWeekend = Math.floor(msUntilWeekend / (1000 * 60 * 60));
    const minutesUntilWeekend = Math.floor((msUntilWeekend % (1000 * 60 * 60)) / (1000 * 60));

    return NextResponse.json({
      isFridayEve,
      tonightSmokers,
      countdown: {
        hours: hoursUntilWeekend,
        minutes: minutesUntilWeekend,
        label: "until weekend!"
      },
      tonightStats: {
        count: Number(statsRes?.count || 0),
        avgRating: Number(statsRes?.avgRating || 0).toFixed(1),
        uniqueSmokers: Number(statsRes?.uniqueSmokers || 0),
        topBrand: topBrandRes?.brand || null
      },
      allTimeThursday: {
        totalSmokes: Number(thursdayStatsRes?.totalThursdaySmokes || 0),
        avgRating: Number(thursdayStatsRes?.avgRating || 0).toFixed(1),
        uniqueSmokers: Number(thursdayStatsRes?.uniqueSmokers || 0)
      },
      leaders: leadersRes.results || [],
      userStats
    });
  } catch (error) {
    console.error("Friday Eve API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
