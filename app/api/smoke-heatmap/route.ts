import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

interface DayData {
  date: string; // YYYY-MM-DD
  count: number;
  avgRating: number | null;
}

interface HeatmapResponse {
  days: DayData[];
  stats: {
    totalDays: number;
    maxStreak: number;
    currentStreak: number;
    busiestDay: string | null;
    busiestDayCount: number;
    totalCheckins: number;
    avgPerActiveDay: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const DB = env.DB;

    // Get username from query or use current user
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    
    let userId: string | null = null;
    
    if (username) {
      // Get user by username
      const userRow = await DB.prepare(
        "SELECT id FROM users WHERE username = ?"
      ).bind(username).first<{ id: string }>();
      userId = userRow?.id || null;
    } else {
      // Get current user from session
      const cookieStore = await cookies();
      const session = cookieStore.get("session")?.value;
      if (session) {
        const sessionRow = await DB.prepare(
          "SELECT user_id FROM sessions WHERE id = ?"
        ).bind(session).first<{ user_id: string }>();
        userId = sessionRow?.user_id || null;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get check-ins grouped by day for the last 365 days
    const oneYearAgo = Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60);
    
    const result = await DB.prepare(`
      SELECT 
        DATE(created_at, 'unixepoch') as date,
        COUNT(*) as count,
        AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating
      FROM checkins
      WHERE user_id = ? AND created_at >= ?
      GROUP BY DATE(created_at, 'unixepoch')
      ORDER BY date ASC
    `).bind(userId, oneYearAgo).all<{ date: string; count: number; avg_rating: number | null }>();

    const days: DayData[] = (result.results || []).map(r => ({
      date: r.date,
      count: r.count,
      avgRating: r.avg_rating ? Math.round(r.avg_rating * 10) / 10 : null
    }));

    // Calculate stats
    const totalCheckins = days.reduce((sum, d) => sum + d.count, 0);
    const totalDays = days.length;
    const avgPerActiveDay = totalDays > 0 ? Math.round((totalCheckins / totalDays) * 10) / 10 : 0;
    
    // Find busiest day
    let busiestDay: string | null = null;
    let busiestDayCount = 0;
    for (const day of days) {
      if (day.count > busiestDayCount) {
        busiestDayCount = day.count;
        busiestDay = day.date;
      }
    }

    // Calculate streaks
    const daySet = new Set(days.map(d => d.date));
    let maxStreak = 0;
    let currentStreak = 0;
    
    // Check current streak (counting back from today)
    const today = new Date();
    let checkDate = new Date(today);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (daySet.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    // Calculate max streak
    if (days.length > 0) {
      let streak = 1;
      for (let i = 1; i < days.length; i++) {
        const prevDate = new Date(days[i - 1].date);
        const currDate = new Date(days[i].date);
        const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          streak++;
        } else {
          maxStreak = Math.max(maxStreak, streak);
          streak = 1;
        }
      }
      maxStreak = Math.max(maxStreak, streak, currentStreak);
    }

    const response: HeatmapResponse = {
      days,
      stats: {
        totalDays,
        maxStreak,
        currentStreak,
        busiestDay,
        busiestDayCount,
        totalCheckins,
        avgPerActiveDay
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Smoke heatmap error:", error);
    return NextResponse.json({ error: "Failed to fetch heatmap data" }, { status: 500 });
  }
}
