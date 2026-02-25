import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface EveningSmoker {
  username: string;
  lastSmoke: string;
  eveningSmokes: number;
  isActive: boolean;
}

interface EveningResponse {
  isEveningTime: boolean;
  currentHour: number;
  loungeOpen: boolean;
  eveningSmokers: EveningSmoker[];
  stats: {
    totalEveningSmokes: number;
    yourEveningSmokes: number;
    sunsetPercentile: number;
    mostActiveHour: number;
    eveningRegulars: number;
  };
  vibes: {
    message: string;
    emoji: string;
  };
  error?: string;
}

function getEveningVibes(hour: number): { message: string; emoji: string } {
  if (hour === 18) {
    return { message: "Golden Hour", emoji: "🌅" };
  } else if (hour === 19) {
    return { message: "Sunset Session", emoji: "🌇" };
  } else if (hour === 20) {
    return { message: "Twilight Time", emoji: "🌆" };
  } else if (hour === 21) {
    return { message: "Evening Wind-Down", emoji: "🌃" };
  }
  return { message: "Evening Vibes", emoji: "🌙" };
}

function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    const { env } = getRequestContext();
    const db = env.DB;

    // Get current hour (UTC - adjust for EST timezone)
    const now = new Date();
    const utcHour = now.getUTCHours();
    // Approximate EST (UTC-5)
    const estHour = (utcHour - 5 + 24) % 24;
    
    // Evening hours: 6 PM (18) to 10 PM (22)
    const isEveningTime = estHour >= 18 && estHour < 22;

    if (!isEveningTime) {
      return Response.json({
        isEveningTime: false,
        currentHour: estHour,
        loungeOpen: false,
        eveningSmokers: [],
        stats: {
          totalEveningSmokes: 0,
          yourEveningSmokes: 0,
          sunsetPercentile: 0,
          mostActiveHour: 0,
          eveningRegulars: 0,
        },
        vibes: { message: "Sunset Lounge opens 6 PM - 10 PM", emoji: "🌅" },
      } as EveningResponse);
    }

    // Get user's ID if logged in
    let userId: string | null = null;
    if (sessionId) {
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ?")
        .bind(sessionId)
        .first<{ user_id: string }>();
      userId = session?.user_id || null;
    }

    // Get evening smokers who have smoked in the last 6 hours during evening hours
    const sixHoursAgo = Math.floor(Date.now() / 1000) - (6 * 60 * 60);

    const recentSmokers = await db.prepare(`
      SELECT 
        u.username,
        MAX(c.created_at) as last_smoke,
        COUNT(CASE 
          WHEN (CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 18 
            AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 22)
          THEN 1 
        END) as evening_smokes
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      GROUP BY u.id
      ORDER BY last_smoke DESC
      LIMIT 20
    `).bind(sixHoursAgo).all<{
      username: string;
      last_smoke: number;
      evening_smokes: number;
    }>();

    // Get total evening smokes platform-wide
    const platformStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_evening_smokes,
        COUNT(DISTINCT user_id) as evening_regulars
      FROM checkins
      WHERE CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 18
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 22
    `).first<{ total_evening_smokes: number; evening_regulars: number }>();

    // Get most active evening hour
    const activeHour = await db.prepare(`
      SELECT 
        CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) as hour,
        COUNT(*) as count
      FROM checkins
      WHERE CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 18
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 22
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `).first<{ hour: number; count: number }>();

    // Get user's personal evening stats
    let yourEveningSmokes = 0;
    let sunsetPercentile = 0;

    if (userId) {
      const userStats = await db.prepare(`
        SELECT COUNT(*) as evening_smokes
        FROM checkins
        WHERE user_id = ?
          AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 18
          AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 22
      `).bind(userId).first<{ evening_smokes: number }>();

      yourEveningSmokes = userStats?.evening_smokes || 0;

      // Calculate percentile among evening smokers
      if (yourEveningSmokes > 0 && platformStats?.evening_regulars) {
        const betterThan = await db.prepare(`
          SELECT COUNT(DISTINCT user_id) as count
          FROM checkins
          WHERE user_id != ?
            AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 18
            AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 22
          GROUP BY user_id
          HAVING COUNT(*) < ?
        `).bind(userId, yourEveningSmokes).all();
        
        sunsetPercentile = Math.round(
          ((betterThan.results?.length || 0) / platformStats.evening_regulars) * 100
        );
      }
    }

    const eveningSmokers: EveningSmoker[] = (recentSmokers.results || [])
      .filter(r => r.evening_smokes > 0)
      .map(row => ({
        username: row.username,
        lastSmoke: formatTimeAgo(row.last_smoke),
        eveningSmokes: row.evening_smokes,
        isActive: (Date.now() / 1000 - row.last_smoke) < 3600, // Active if smoked in last hour
      }));

    const response: EveningResponse = {
      isEveningTime: true,
      currentHour: estHour,
      loungeOpen: true,
      eveningSmokers,
      stats: {
        totalEveningSmokes: platformStats?.total_evening_smokes || 0,
        yourEveningSmokes,
        sunsetPercentile,
        mostActiveHour: activeHour?.hour || 19,
        eveningRegulars: platformStats?.evening_regulars || 0,
      },
      vibes: getEveningVibes(estHour),
    };

    return Response.json(response);
  } catch (error) {
    console.error("Evening lounge error:", error);
    return Response.json(
      { error: "Failed to load evening data" },
      { status: 500 }
    );
  }
}
