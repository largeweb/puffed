import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

interface FirstLighter {
  username: string;
  firstLightCount: number;
  lastFirstLight: string;
  rank: number;
}

interface DailyFirstLight {
  date: string;
  username: string;
  brand: string;
  time: string;
}

interface FirstLightResponse {
  leaders: FirstLighter[];
  recentDays: DailyFirstLight[];
  todaysFirstLight: DailyFirstLight | null;
  platformStats: {
    totalDays: number;
    mostWins: number;
    competitionLevel: string;
  };
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export async function GET(): Promise<Response> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Get first smoke of each day with user info
    const dailyFirstSmokes = await db
      .prepare(`
        WITH DailyFirst AS (
          SELECT 
            DATE(created_at, 'unixepoch') as smoke_date,
            MIN(created_at) as first_time
          FROM checkins
          GROUP BY DATE(created_at, 'unixepoch')
        )
        SELECT 
          df.smoke_date,
          df.first_time,
          c.brand,
          u.username
        FROM DailyFirst df
        JOIN checkins c ON DATE(c.created_at, 'unixepoch') = df.smoke_date 
          AND c.created_at = df.first_time
        JOIN users u ON c.user_id = u.id
        ORDER BY df.smoke_date DESC
        LIMIT 30
      `)
      .all<{
        smoke_date: string;
        first_time: number;
        brand: string;
        username: string;
      }>();

    const results = dailyFirstSmokes.results || [];

    // Count wins per user
    const winCounts: Record<string, { count: number; lastWin: string }> = {};
    for (const row of results) {
      if (!winCounts[row.username]) {
        winCounts[row.username] = { count: 0, lastWin: row.smoke_date };
      }
      winCounts[row.username].count++;
    }

    // Create leaderboard
    const leaders: FirstLighter[] = Object.entries(winCounts)
      .map(([username, data]) => ({
        username,
        firstLightCount: data.count,
        lastFirstLight: formatDate(data.lastWin),
        rank: 0,
      }))
      .sort((a, b) => b.firstLightCount - a.firstLightCount)
      .map((leader, index) => ({ ...leader, rank: index + 1 }))
      .slice(0, 10);

    // Get recent days for display
    const recentDays: DailyFirstLight[] = results.slice(0, 7).map((row) => ({
      date: formatDate(row.smoke_date),
      username: row.username,
      brand: row.brand,
      time: formatTime(row.first_time),
    }));

    // Check if today has a first light
    const today = new Date().toISOString().split("T")[0];
    const todayEntry = results.find((r) => r.smoke_date === today);
    const todaysFirstLight = todayEntry
      ? {
          date: formatDate(todayEntry.smoke_date),
          username: todayEntry.username,
          brand: todayEntry.brand,
          time: formatTime(todayEntry.first_time),
        }
      : null;

    // Platform stats
    const totalDays = results.length;
    const mostWins = leaders.length > 0 ? leaders[0].firstLightCount : 0;
    const uniqueWinners = Object.keys(winCounts).length;
    const competitionLevel =
      uniqueWinners <= 1
        ? "Unopposed"
        : uniqueWinners <= 3
        ? "Friendly"
        : uniqueWinners <= 5
        ? "Competitive"
        : "Fierce";

    const response: FirstLightResponse = {
      leaders,
      recentDays,
      todaysFirstLight,
      platformStats: {
        totalDays,
        mostWins,
        competitionLevel,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("First Light API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch first light data" },
      { status: 500 }
    );
  }
}
