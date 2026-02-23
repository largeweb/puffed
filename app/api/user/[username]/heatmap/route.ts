import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const { env } = getRequestContext();
    const DB = env.DB;

    // Get user
    const userRow = await DB.prepare(`
      SELECT id FROM users WHERE LOWER(username) = LOWER(?)
    `).bind(username).first<{ id: string }>();

    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get check-ins for the past 365 days
    const oneYearAgo = Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60);
    
    const checkinsResult = await DB.prepare(`
      SELECT 
        DATE(created_at, 'unixepoch') as date,
        COUNT(*) as count
      FROM checkins
      WHERE user_id = ? AND created_at >= ?
      GROUP BY DATE(created_at, 'unixepoch')
      ORDER BY date ASC
    `).bind(userRow.id, oneYearAgo).all<{ date: string; count: number }>();

    // Convert to a map of date -> count
    const heatmapData: Record<string, number> = {};
    for (const row of (checkinsResult.results || [])) {
      heatmapData[row.date] = row.count;
    }

    // Calculate streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check backwards from today for current streak
    const checkDate = new Date(today);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (heatmapData[dateStr]) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (currentStreak === 0) {
        // If today has no smokes, check if yesterday starts a streak
        checkDate.setDate(checkDate.getDate() - 1);
        const yesterdayStr = checkDate.toISOString().split('T')[0];
        if (!heatmapData[yesterdayStr]) break;
      } else {
        break;
      }
    }

    // Calculate longest streak
    const sortedDates = Object.keys(heatmapData).sort();
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));
        
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Calculate total smokes in the last year
    const totalSmokes = Object.values(heatmapData).reduce((sum, count) => sum + count, 0);
    const activeDays = Object.keys(heatmapData).length;

    return NextResponse.json({
      heatmap: heatmapData,
      stats: {
        currentStreak,
        longestStreak,
        totalSmokes,
        activeDays,
        avgPerActiveDay: activeDays > 0 ? Math.round((totalSmokes / activeDays) * 10) / 10 : 0,
      },
    });
  } catch (error) {
    console.error("Heatmap API error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
