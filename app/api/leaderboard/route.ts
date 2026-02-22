import { getRequestContext } from "@cloudflare/next-on-pages";
import type { LeaderboardResponse, StreakLeaderEntry } from "@/lib/types";

export const runtime = "edge";

// Calculate streak for a user given their check-in dates (sorted descending)
function calculateUserStreak(dates: string[]): { current: number; best: number; active: boolean } {
  if (dates.length === 0) {
    return { current: 0, best: 0, active: false };
  }

  const today = new Date().toISOString().split('T')[0];
  const yesterday = (() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return y.toISOString().split('T')[0];
  })();
  
  const lastDate = dates[0];
  const streakActive = lastDate === today || lastDate === yesterday;
  
  let currentStreak = 0;
  
  if (streakActive) {
    let expectedDate = lastDate;
    for (const date of dates) {
      if (date === expectedDate) {
        currentStreak++;
        const dateObj = new Date(expectedDate + 'T12:00:00Z');
        dateObj.setUTCDate(dateObj.getUTCDate() - 1);
        expectedDate = dateObj.toISOString().split('T')[0];
      } else if (date < expectedDate) {
        break;
      }
    }
  }
  
  let bestStreak = dates.length > 0 ? 1 : 0;
  let tempStreak = 1;
  
  for (let i = 1; i < dates.length; i++) {
    const prevDateObj = new Date(dates[i - 1] + 'T12:00:00Z');
    prevDateObj.setUTCDate(prevDateObj.getUTCDate() - 1);
    const expectedPrev = prevDateObj.toISOString().split('T')[0];
    
    if (expectedPrev === dates[i]) {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  bestStreak = Math.max(bestStreak, currentStreak);
  
  return { current: currentStreak, best: bestStreak, active: streakActive };
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Calculate timestamps
    const now = Math.floor(Date.now() / 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60);
    const oneMonthAgo = now - (30 * 24 * 60 * 60);

    // All-time leaderboard (top 20 users by check-ins)
    const allTimeQuery = `
      SELECT 
        u.username,
        COUNT(c.id) as checkin_count,
        ROUND(AVG(CASE WHEN c.rating IS NOT NULL THEN c.rating END), 1) as avg_rating,
        COUNT(DISTINCT c.brand) as unique_brands,
        COALESCE(SUM(l.like_count), 0) as total_likes_received
      FROM users u
      LEFT JOIN checkins c ON u.id = c.user_id
      LEFT JOIN (
        SELECT checkin_id, COUNT(*) as like_count 
        FROM likes 
        GROUP BY checkin_id
      ) l ON c.id = l.checkin_id
      GROUP BY u.id, u.username
      HAVING checkin_count > 0
      ORDER BY checkin_count DESC, total_likes_received DESC
      LIMIT 20
    `;

    // This week leaderboard
    const weekQuery = `
      SELECT 
        u.username,
        COUNT(c.id) as checkin_count,
        ROUND(AVG(CASE WHEN c.rating IS NOT NULL THEN c.rating END), 1) as avg_rating,
        COUNT(DISTINCT c.brand) as unique_brands,
        COALESCE(SUM(l.like_count), 0) as total_likes_received
      FROM users u
      LEFT JOIN checkins c ON u.id = c.user_id AND c.created_at >= ?
      LEFT JOIN (
        SELECT checkin_id, COUNT(*) as like_count 
        FROM likes 
        GROUP BY checkin_id
      ) l ON c.id = l.checkin_id
      GROUP BY u.id, u.username
      HAVING checkin_count > 0
      ORDER BY checkin_count DESC, total_likes_received DESC
      LIMIT 20
    `;

    // This month leaderboard
    const monthQuery = `
      SELECT 
        u.username,
        COUNT(c.id) as checkin_count,
        ROUND(AVG(CASE WHEN c.rating IS NOT NULL THEN c.rating END), 1) as avg_rating,
        COUNT(DISTINCT c.brand) as unique_brands,
        COALESCE(SUM(l.like_count), 0) as total_likes_received
      FROM users u
      LEFT JOIN checkins c ON u.id = c.user_id AND c.created_at >= ?
      LEFT JOIN (
        SELECT checkin_id, COUNT(*) as like_count 
        FROM likes 
        GROUP BY checkin_id
      ) l ON c.id = l.checkin_id
      GROUP BY u.id, u.username
      HAVING checkin_count > 0
      ORDER BY checkin_count DESC, total_likes_received DESC
      LIMIT 20
    `;

    // Streak leaderboard - get all users with their check-in dates
    const streakQuery = `
      SELECT 
        u.id as user_id,
        u.username,
        GROUP_CONCAT(DISTINCT date(c.created_at, 'unixepoch')) as dates
      FROM users u
      INNER JOIN checkins c ON u.id = c.user_id
      GROUP BY u.id, u.username
    `;

    const [allTimeResult, weekResult, monthResult, streakResult] = await Promise.all([
      db.prepare(allTimeQuery).all(),
      db.prepare(weekQuery).bind(oneWeekAgo).all(),
      db.prepare(monthQuery).bind(oneMonthAgo).all(),
      db.prepare(streakQuery).all(),
    ]);

    // Calculate streaks for each user
    const streakEntries: StreakLeaderEntry[] = [];
    for (const row of (streakResult.results || []) as { user_id: string; username: string; dates: string }[]) {
      if (!row.dates) continue;
      const dates = row.dates.split(',').sort((a, b) => b.localeCompare(a)); // Sort descending
      const { current, best, active } = calculateUserStreak(dates);
      
      // Only include users with active streaks
      if (active && current > 0) {
        streakEntries.push({
          username: row.username,
          currentStreak: current,
          bestStreak: best,
          rank: 0, // Will be set below
        });
      }
    }
    
    // Sort by current streak descending, then by best streak
    streakEntries.sort((a, b) => b.currentStreak - a.currentStreak || b.bestStreak - a.bestStreak);
    
    // Add ranks
    const addRanks = (entries: any[]) => 
      entries.map((entry, index) => ({ ...entry, rank: index + 1 }));

    const response: LeaderboardResponse = {
      allTime: addRanks(allTimeResult.results || []),
      thisWeek: addRanks(weekResult.results || []),
      thisMonth: addRanks(monthResult.results || []),
      streaks: addRanks(streakEntries),
    };

    return Response.json(response);
  } catch (error) {
    console.error("Leaderboard error:", error);
    return Response.json({ error: "Failed to load leaderboard" }, { status: 500 });
  }
}
