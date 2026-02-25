import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface EarlyBirdUser {
  username: string;
  lastSmoke: string;
  morningSmokes: number;
  isActive: boolean;
}

interface MorningResponse {
  isMorningTime: boolean;
  currentHour: number;
  loungeOpen: boolean;
  earlyBirds: EarlyBirdUser[];
  stats: {
    totalMorningSmokes: number;
    yourMorningSmokes: number;
    earlyBirdPercentile: number;
    mostActiveHour: number;
    morningRisers: number;
  };
  vibes: {
    message: string;
    emoji: string;
  };
  error?: string;
}

function getMorningVibes(hour: number): { message: string; emoji: string } {
  if (hour >= 5 && hour <= 6) {
    return { message: "Dawn Patrol ☀️", emoji: "🌅" };
  } else if (hour === 7) {
    return { message: "Early Bird Gets the Smoke", emoji: "☕" };
  } else if (hour === 8) {
    return { message: "Rise & Grind", emoji: "💪" };
  } else if (hour === 9) {
    return { message: "Morning Ritual", emoji: "🌤️" };
  }
  return { message: "Morning Mode Active", emoji: "☕" };
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
    
    // Morning hours: 5 AM to 10 AM
    const isMorningTime = estHour >= 5 && estHour < 10;

    if (!isMorningTime) {
      return Response.json({
        isMorningTime: false,
        currentHour: estHour,
        loungeOpen: false,
        earlyBirds: [],
        stats: {
          totalMorningSmokes: 0,
          yourMorningSmokes: 0,
          earlyBirdPercentile: 0,
          mostActiveHour: 0,
          morningRisers: 0,
        },
        vibes: { message: "Morning Coffee opens 5 AM - 10 AM", emoji: "☕" },
      } as MorningResponse);
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

    // Get early birds who have smoked in the last 6 hours during morning hours
    const sixHoursAgo = Math.floor(Date.now() / 1000) - (6 * 60 * 60);

    const recentSmokers = await db.prepare(`
      SELECT 
        u.username,
        MAX(c.created_at) as last_smoke,
        COUNT(CASE 
          WHEN (CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 5 
            AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 10)
          THEN 1 
        END) as morning_smokes
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      GROUP BY u.id
      ORDER BY last_smoke DESC
      LIMIT 20
    `).bind(sixHoursAgo).all<{
      username: string;
      last_smoke: number;
      morning_smokes: number;
    }>();

    // Get total morning smokes platform-wide
    const platformStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_morning_smokes,
        COUNT(DISTINCT user_id) as morning_risers
      FROM checkins
      WHERE CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 5
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 10
    `).first<{ total_morning_smokes: number; morning_risers: number }>();

    // Get most active morning hour
    const activeHour = await db.prepare(`
      SELECT 
        CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) as hour,
        COUNT(*) as count
      FROM checkins
      WHERE CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 5
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 10
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `).first<{ hour: number; count: number }>();

    // Get user's personal morning stats
    let yourMorningSmokes = 0;
    let earlyBirdPercentile = 0;

    if (userId) {
      const userStats = await db.prepare(`
        SELECT COUNT(*) as morning_smokes
        FROM checkins
        WHERE user_id = ?
          AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 5
          AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 10
      `).bind(userId).first<{ morning_smokes: number }>();

      yourMorningSmokes = userStats?.morning_smokes || 0;

      // Calculate percentile among morning smokers
      if (yourMorningSmokes > 0 && platformStats?.morning_risers) {
        const betterThan = await db.prepare(`
          SELECT COUNT(DISTINCT user_id) as count
          FROM checkins
          WHERE user_id != ?
            AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 5
            AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 10
          GROUP BY user_id
          HAVING COUNT(*) < ?
        `).bind(userId, yourMorningSmokes).all();
        
        earlyBirdPercentile = Math.round(
          ((betterThan.results?.length || 0) / platformStats.morning_risers) * 100
        );
      }
    }

    const earlyBirds: EarlyBirdUser[] = (recentSmokers.results || [])
      .filter(r => r.morning_smokes > 0)
      .map(row => ({
        username: row.username,
        lastSmoke: formatTimeAgo(row.last_smoke),
        morningSmokes: row.morning_smokes,
        isActive: (Date.now() / 1000 - row.last_smoke) < 3600, // Active if smoked in last hour
      }));

    const response: MorningResponse = {
      isMorningTime: true,
      currentHour: estHour,
      loungeOpen: true,
      earlyBirds,
      stats: {
        totalMorningSmokes: platformStats?.total_morning_smokes || 0,
        yourMorningSmokes,
        earlyBirdPercentile,
        mostActiveHour: activeHour?.hour || 7,
        morningRisers: platformStats?.morning_risers || 0,
      },
      vibes: getMorningVibes(estHour),
    };

    return Response.json(response);
  } catch (error) {
    console.error("Morning coffee error:", error);
    return Response.json(
      { error: "Failed to load morning data" },
      { status: 500 }
    );
  }
}
