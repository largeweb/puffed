import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

// Happy Hour: 4pm - 7pm EST
const HAPPY_HOUR_START = 16;
const HAPPY_HOUR_END = 19;

export async function GET() {
  const { env } = getRequestContext();
  
  // Get user from session
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  let userId: string | null = null;
  
  if (sessionId) {
    const session = await env.DB.prepare(
      "SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?"
    ).bind(sessionId, Math.floor(Date.now() / 1000)).first() as { user_id: string } | null;
    userId = session?.user_id || null;
  }
  
  // Get current hour in EST
  const now = new Date();
  const estOffset = -5 * 60;
  const utcOffset = now.getTimezoneOffset();
  const estTime = new Date(now.getTime() + (utcOffset + estOffset) * 60000);
  const currentHour = estTime.getHours();
  
  const isHappyHour = currentHour >= HAPPY_HOUR_START && currentHour < HAPPY_HOUR_END;
  
  // Vibe text based on time
  let vibeText = 'Happy Hour! 🍻';
  if (currentHour === 16) vibeText = 'Happy Hour just started! 🎉';
  else if (currentHour === 17) vibeText = 'Peak Happy Hour vibes! 🍻';
  else if (currentHour === 18) vibeText = 'Last call for Happy Hour! ⏰';
  else if (currentHour < 16) vibeText = `Happy Hour in ${16 - currentHour}h`;
  else vibeText = 'Happy Hour is over - see you tomorrow! 🌙';

  // Get today's start timestamp
  const todayStart = new Date(estTime);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartTs = Math.floor(todayStart.getTime() / 1000);
  
  // Happy Hour window timestamps for today
  const happyHourStartTs = todayStartTs + (HAPPY_HOUR_START * 3600);
  const happyHourEndTs = todayStartTs + (HAPPY_HOUR_END * 3600);
  
  // Today's happy hour smokers
  const todaySmokers = await env.DB.prepare(`
    SELECT DISTINCT c.user_id, u.username, u.avatar_url,
      COUNT(*) as happy_hour_smokes,
      MIN(c.created_at) as first_happy_hour_smoke
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.created_at >= ? AND c.created_at < ?
    GROUP BY c.user_id
    ORDER BY first_happy_hour_smoke ASC
    LIMIT 20
  `).bind(happyHourStartTs, happyHourEndTs).all();
  
  // All-time happy hour leaderboard
  const leaderboard = await env.DB.prepare(`
    SELECT 
      u.id,
      u.username,
      u.avatar_url,
      COUNT(*) as total_happy_hour_smokes,
      (
        SELECT brand FROM checkins c2 
        WHERE c2.user_id = u.id 
          AND ((c2.created_at - ?) % 86400) >= ?
          AND ((c2.created_at - ?) % 86400) < ?
        GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1
      ) as favorite_brand
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE ((c.created_at - ?) % 86400) >= ?
      AND ((c.created_at - ?) % 86400) < ?
    GROUP BY c.user_id
    ORDER BY total_happy_hour_smokes DESC
    LIMIT 10
  `).bind(
    todayStartTs, HAPPY_HOUR_START * 3600, todayStartTs, HAPPY_HOUR_END * 3600,
    todayStartTs, HAPPY_HOUR_START * 3600, todayStartTs, HAPPY_HOUR_END * 3600
  ).all();

  // Platform-wide happy hour stats
  const platformStats = await env.DB.prepare(`
    SELECT 
      COUNT(*) as total_happy_hour_smokes,
      COUNT(DISTINCT user_id) as unique_happy_hour_smokers
    FROM checkins
    WHERE ((created_at - ?) % 86400) >= ?
      AND ((created_at - ?) % 86400) < ?
  `).bind(todayStartTs, HAPPY_HOUR_START * 3600, todayStartTs, HAPPY_HOUR_END * 3600).first() as {
    total_happy_hour_smokes: number;
    unique_happy_hour_smokers: number;
  } | null;

  // Count distinct days with happy hour smokes
  const happyHourDays = await env.DB.prepare(`
    SELECT COUNT(DISTINCT DATE(datetime(created_at, 'unixepoch', '-5 hours'))) as days
    FROM checkins
    WHERE ((created_at - ?) % 86400) >= ?
      AND ((created_at - ?) % 86400) < ?
  `).bind(todayStartTs, HAPPY_HOUR_START * 3600, todayStartTs, HAPPY_HOUR_END * 3600).first() as { days: number } | null;

  // Personal happy hour stats (if logged in)
  let personalStats = null;
  if (userId) {
    const personal = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total_happy_hour_smokes,
        (
          SELECT brand FROM checkins 
          WHERE user_id = ?
            AND ((created_at - ?) % 86400) >= ?
            AND ((created_at - ?) % 86400) < ?
          GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1
        ) as favorite_happy_hour_brand
      FROM checkins
      WHERE user_id = ?
        AND ((created_at - ?) % 86400) >= ?
        AND ((created_at - ?) % 86400) < ?
    `).bind(
      userId, todayStartTs, HAPPY_HOUR_START * 3600, todayStartTs, HAPPY_HOUR_END * 3600,
      userId, todayStartTs, HAPPY_HOUR_START * 3600, todayStartTs, HAPPY_HOUR_END * 3600
    ).first() as { total_happy_hour_smokes: number; favorite_happy_hour_brand: string | null } | null;

    // Calculate percentile
    const totalUsers = platformStats?.unique_happy_hour_smokers || 1;
    const userSmokes = personal?.total_happy_hour_smokes || 0;
    
    const rank = await env.DB.prepare(`
      SELECT COUNT(DISTINCT user_id) as better_count
      FROM checkins
      WHERE ((created_at - ?) % 86400) >= ?
        AND ((created_at - ?) % 86400) < ?
      GROUP BY user_id
      HAVING COUNT(*) > ?
    `).bind(todayStartTs, HAPPY_HOUR_START * 3600, todayStartTs, HAPPY_HOUR_END * 3600, userSmokes).all();

    const betterCount = rank.results?.length || 0;
    const percentile = totalUsers > 0 ? Math.max(1, Math.round(((totalUsers - betterCount) / totalUsers) * 100)) : 100;

    if (personal) {
      personalStats = {
        totalHappyHourSmokes: personal.total_happy_hour_smokes,
        favoriteHappyHourBrand: personal.favorite_happy_hour_brand,
        percentile
      };
    }
  }

  // Get popular happy hour brands
  const popularBrands = await env.DB.prepare(`
    SELECT brand, COUNT(*) as count, AVG(rating) as avg_rating
    FROM checkins
    WHERE ((created_at - ?) % 86400) >= ?
      AND ((created_at - ?) % 86400) < ?
      AND rating IS NOT NULL
    GROUP BY brand
    ORDER BY count DESC
    LIMIT 5
  `).bind(todayStartTs, HAPPY_HOUR_START * 3600, todayStartTs, HAPPY_HOUR_END * 3600).all();

  return Response.json({
    isHappyHour,
    currentHour,
    vibeText,
    todaySmokers: todaySmokers.results || [],
    todayCount: todaySmokers.results?.length || 0,
    platformStats: {
      totalHappyHourSmokes: platformStats?.total_happy_hour_smokes || 0,
      uniqueHappyHourSmokers: platformStats?.unique_happy_hour_smokers || 0,
      happyHourDays: happyHourDays?.days || 0
    },
    leaderboard: leaderboard.results || [],
    personalStats,
    popularBrands: popularBrands.results || []
  });
}
