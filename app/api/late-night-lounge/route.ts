import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface NightOwlUser {
  username: string;
  lastSmoke: string;
  nightSmokes: number;
  isActive: boolean;
}

interface LoungeResponse {
  isNightTime: boolean;
  currentHour: number;
  loungeOpen: boolean;
  nightOwls: NightOwlUser[];
  stats: {
    totalNightSmokes: number;
    yourNightSmokes: number;
    nightOwlPercentile: number;
    mostActiveHour: number;
    loungeMembers: number;
  };
  vibes: {
    message: string;
    emoji: string;
  };
  error?: string;
}

function getNightVibes(hour: number): { message: string; emoji: string } {
  if (hour === 0) {
    return { message: "The Midnight Hour 🕛", emoji: "🌙" };
  } else if (hour >= 1 && hour <= 2) {
    return { message: "Deep Night Session", emoji: "🦉" };
  } else if (hour >= 3 && hour <= 4) {
    return { message: "The Witching Hours", emoji: "✨" };
  } else if (hour >= 22 && hour <= 23) {
    return { message: "Evening Wind-Down", emoji: "🌆" };
  }
  return { message: "Night Mode Active", emoji: "🌙" };
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

    // Get current hour (UTC - adjust for typical US timezone approximation)
    const now = new Date();
    const utcHour = now.getUTCHours();
    // Approximate EST/EDT (UTC-5 or UTC-4)
    const estHour = (utcHour - 5 + 24) % 24;
    
    // Night hours: 10 PM (22) to 4 AM
    const isNightTime = estHour >= 22 || estHour <= 4;

    if (!isNightTime) {
      return Response.json({
        isNightTime: false,
        currentHour: estHour,
        loungeOpen: false,
        nightOwls: [],
        stats: {
          totalNightSmokes: 0,
          yourNightSmokes: 0,
          nightOwlPercentile: 0,
          mostActiveHour: 0,
          loungeMembers: 0,
        },
        vibes: { message: "The lounge opens at 10 PM", emoji: "🌙" },
      } as LoungeResponse);
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

    // Get night owls who have smoked in the last 6 hours during night hours
    const sixHoursAgo = Math.floor(Date.now() / 1000) - (6 * 60 * 60);
    const twoHoursAgo = Math.floor(Date.now() / 1000) - (2 * 60 * 60);

    const nightOwlsResult = await db.prepare(`
      SELECT 
        u.username,
        MAX(c.created_at) as last_smoke,
        COUNT(*) as night_count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
        AND (
          CAST(strftime('%H', c.created_at, 'unixepoch') AS INTEGER) >= 22
          OR CAST(strftime('%H', c.created_at, 'unixepoch') AS INTEGER) <= 4
        )
      GROUP BY u.id
      ORDER BY last_smoke DESC
      LIMIT 10
    `).bind(sixHoursAgo).all<{ username: string; last_smoke: number; night_count: number }>();

    const nightOwls: NightOwlUser[] = (nightOwlsResult.results || []).map(row => ({
      username: row.username,
      lastSmoke: formatTimeAgo(row.last_smoke),
      nightSmokes: row.night_count,
      isActive: row.last_smoke >= twoHoursAgo,
    }));

    // Get total night smokes on platform (all time during night hours)
    const totalNightResult = await db.prepare(`
      SELECT COUNT(*) as count FROM checkins
      WHERE CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) >= 22
        OR CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) <= 4
    `).first<{ count: number }>();

    // Get user's night smokes if logged in
    let yourNightSmokes = 0;
    if (userId) {
      const userNightResult = await db.prepare(`
        SELECT COUNT(*) as count FROM checkins
        WHERE user_id = ?
          AND (
            CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) >= 22
            OR CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) <= 4
          )
      `).bind(userId).first<{ count: number }>();
      yourNightSmokes = userNightResult?.count || 0;
    }

    // Get most active night hour
    const hourResult = await db.prepare(`
      SELECT 
        CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) as hour,
        COUNT(*) as count
      FROM checkins
      WHERE CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) >= 22
        OR CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) <= 4
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `).first<{ hour: number; count: number }>();

    // Get count of unique night owl users
    const membersResult = await db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count FROM checkins
      WHERE CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) >= 22
        OR CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) <= 4
    `).first<{ count: number }>();

    // Calculate percentile (how you rank among night owls)
    let nightOwlPercentile = 0;
    if (userId && yourNightSmokes > 0) {
      const rankResult = await db.prepare(`
        SELECT COUNT(*) as count FROM (
          SELECT user_id, COUNT(*) as night_count
          FROM checkins
          WHERE CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) >= 22
            OR CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) <= 4
          GROUP BY user_id
          HAVING night_count < ?
        )
      `).bind(yourNightSmokes).first<{ count: number }>();
      const totalUsers = membersResult?.count || 1;
      nightOwlPercentile = Math.round(((rankResult?.count || 0) / totalUsers) * 100);
    }

    const vibes = getNightVibes(estHour);

    return Response.json({
      isNightTime: true,
      currentHour: estHour,
      loungeOpen: true,
      nightOwls,
      stats: {
        totalNightSmokes: totalNightResult?.count || 0,
        yourNightSmokes,
        nightOwlPercentile,
        mostActiveHour: hourResult?.hour || 0,
        loungeMembers: membersResult?.count || 0,
      },
      vibes,
    } as LoungeResponse);
  } catch (error) {
    console.error("Late night lounge error:", error);
    return Response.json({
      isNightTime: false,
      currentHour: 0,
      loungeOpen: false,
      nightOwls: [],
      stats: {
        totalNightSmokes: 0,
        yourNightSmokes: 0,
        nightOwlPercentile: 0,
        mostActiveHour: 0,
        loungeMembers: 0,
      },
      vibes: { message: "Error loading lounge", emoji: "😔" },
      error: "Server error",
    } as LoungeResponse, { status: 500 });
  }
}
