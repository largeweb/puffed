import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface ShiftWorker {
  username: string;
  shiftCount: number;
  totalShiftSmokes: number;
  avgRating: number;
  favoriteHour: number;
  lastShift: string;
}

export async function GET() {
  const { env } = getRequestContext();
  const db = env.DB;

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("puffed_session");
  let currentUserId: string | null = null;

  if (sessionCookie?.value) {
    try {
      const sessionData = JSON.parse(atob(sessionCookie.value));
      currentUserId = sessionData.userId;
    } catch {
      // Invalid session
    }
  }

  // Check if graveyard shift is open (3-6 AM)
  const now = new Date();
  const hour = now.getHours();
  const isOpen = hour >= 3 && hour < 6;

  // Get today's date string for filtering
  const today = now.toISOString().split("T")[0];
  const todayStart = new Date(today + "T03:00:00").getTime() / 1000;
  const todayEnd = new Date(today + "T06:00:00").getTime() / 1000;

  // Get on-shift smokers tonight (3-6 AM smokes from today)
  const onShiftNow = await db
    .prepare(
      `SELECT 
        c.id, c.brand, c.product, c.rating, c.created_at,
        u.username
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at < ?
      ORDER BY c.created_at DESC
      LIMIT 20`
    )
    .bind(todayStart, todayEnd)
    .all();

  // Get all graveyard shift smokes (3-6 AM any day)
  // Using SQLite's strftime to extract hour from unix timestamp
  const shiftLeaderboard = await db
    .prepare(
      `SELECT 
        u.username,
        COUNT(DISTINCT date(c.created_at, 'unixepoch', 'localtime')) as shift_count,
        COUNT(*) as total_smokes,
        AVG(c.rating) as avg_rating,
        CAST(strftime('%H', c.created_at, 'unixepoch', 'localtime') AS INTEGER) as fav_hour,
        MAX(c.created_at) as last_shift
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE CAST(strftime('%H', c.created_at, 'unixepoch', 'localtime') AS INTEGER) >= 3
        AND CAST(strftime('%H', c.created_at, 'unixepoch', 'localtime') AS INTEGER) < 6
      GROUP BY u.id
      ORDER BY shift_count DESC, total_smokes DESC
      LIMIT 20`
    )
    .all();

  // Get platform stats
  const statsResult = await db
    .prepare(
      `SELECT 
        COUNT(*) as total_smokes,
        COUNT(DISTINCT user_id) as unique_workers,
        AVG(rating) as avg_rating
      FROM checkins
      WHERE CAST(strftime('%H', created_at, 'unixepoch', 'localtime') AS INTEGER) >= 3
        AND CAST(strftime('%H', created_at, 'unixepoch', 'localtime') AS INTEGER) < 6`
    )
    .first();

  // Get peak hour within graveyard shift
  const peakHourResult = await db
    .prepare(
      `SELECT 
        CAST(strftime('%H', created_at, 'unixepoch', 'localtime') AS INTEGER) as hour,
        COUNT(*) as count
      FROM checkins
      WHERE CAST(strftime('%H', created_at, 'unixepoch', 'localtime') AS INTEGER) >= 3
        AND CAST(strftime('%H', created_at, 'unixepoch', 'localtime') AS INTEGER) < 6
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1`
    )
    .first();

  // Tonight's count
  const tonightResult = await db
    .prepare(
      `SELECT COUNT(*) as count FROM checkins
      WHERE created_at >= ? AND created_at < ?`
    )
    .bind(todayStart, todayEnd)
    .first();

  // Get current user's stats if logged in
  let myStats = null;
  if (currentUserId) {
    const userStats = await db
      .prepare(
        `SELECT 
          COUNT(DISTINCT date(created_at, 'unixepoch', 'localtime')) as shift_count,
          COUNT(*) as total_smokes
        FROM checkins
        WHERE user_id = ?
          AND CAST(strftime('%H', created_at, 'unixepoch', 'localtime') AS INTEGER) >= 3
          AND CAST(strftime('%H', created_at, 'unixepoch', 'localtime') AS INTEGER) < 6`
      )
      .bind(currentUserId)
      .first();

    if (userStats) {
      // Calculate percentile
      const totalWorkers = (statsResult as Record<string, number>)?.unique_workers || 1;
      const userRank = shiftLeaderboard.results.findIndex(
        (w) => (w as ShiftWorker).username === currentUserId
      );
      const percentile = userRank >= 0 
        ? Math.round(((totalWorkers - userRank) / totalWorkers) * 100)
        : 0;

      myStats = {
        shiftCount: (userStats as Record<string, number>).shift_count || 0,
        totalSmokes: (userStats as Record<string, number>).total_smokes || 0,
        currentStreak: 0, // Could calculate consecutive days
        rank: "Night Intern",
        percentile,
      };
    }
  }

  // Format on-shift data
  const formattedOnShift = onShiftNow.results.map((row) => {
    const r = row as Record<string, unknown>;
    const createdAt = r.created_at as number;
    const minutesAgo = Math.floor((Date.now() / 1000 - createdAt) / 60);
    let timeAgo = `${minutesAgo}m ago`;
    if (minutesAgo >= 60) {
      timeAgo = `${Math.floor(minutesAgo / 60)}h ago`;
    }
    return {
      username: r.username as string,
      brand: r.brand as string,
      product: r.product as string | null,
      rating: r.rating as number,
      createdAt,
      timeAgo,
    };
  });

  // Format leaderboard
  const formattedLeaderboard: ShiftWorker[] = shiftLeaderboard.results.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      username: r.username as string,
      shiftCount: (r.shift_count as number) || 0,
      totalShiftSmokes: (r.total_smokes as number) || 0,
      avgRating: (r.avg_rating as number) || 0,
      favoriteHour: (r.fav_hour as number) || 3,
      lastShift: new Date((r.last_shift as number) * 1000).toLocaleDateString(),
    };
  });

  return Response.json({
    isOpen,
    currentHour: hour,
    onShiftNow: formattedOnShift,
    shiftLeaderboard: formattedLeaderboard,
    stats: {
      totalShiftSmokes: (statsResult as Record<string, number>)?.total_smokes || 0,
      uniqueWorkers: (statsResult as Record<string, number>)?.unique_workers || 0,
      peakHour: (peakHourResult as Record<string, number>)?.hour || 3,
      avgRating: (statsResult as Record<string, number>)?.avg_rating || 0,
      tonightCount: (tonightResult as Record<string, number>)?.count || 0,
    },
    myStats,
  });
}
