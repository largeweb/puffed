import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

// Afternoon Break: 2pm - 4pm EST
const AFTERNOON_START = 14;
const AFTERNOON_END = 16;

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
  const dayOfWeek = estTime.getDay();
  
  const isAfternoonBreak = currentHour >= AFTERNOON_START && currentHour < AFTERNOON_END;
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  
  // Vibe text based on time
  let vibeText = 'Afternoon Break ☕';
  if (currentHour === 14) vibeText = '☕ The perfect mid-afternoon pause';
  else if (currentHour === 15) vibeText = '😴 Fight the slump with a smoke';
  else if (currentHour < 14) vibeText = `Afternoon break in ${14 - currentHour}h`;
  else vibeText = 'Afternoon break hours: 2pm - 4pm';

  // Productivity tips
  const tips = [
    "📊 Studies show short breaks boost productivity by 30%",
    "🧠 Micro-breaks help your brain consolidate learning",
    "☕ Pair with coffee for the perfect pick-me-up",
    "🚶 A short walk + smoke = afternoon reset",
    "💡 Best ideas often come during downtime"
  ];
  const productivityTip = tips[Math.floor(Math.random() * tips.length)];

  // Get today's start timestamp
  const todayStart = new Date(estTime);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartTs = Math.floor(todayStart.getTime() / 1000);
  
  // Afternoon window timestamps for today
  const afternoonStartTs = todayStartTs + (AFTERNOON_START * 3600);
  const afternoonEndTs = todayStartTs + (AFTERNOON_END * 3600);
  
  // Today's afternoon break smokers
  const todaySmokers = await env.DB.prepare(`
    SELECT DISTINCT c.user_id, u.username, u.avatar_url,
      COUNT(*) as afternoon_smokes,
      MIN(c.created_at) as first_afternoon_smoke
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.created_at >= ? AND c.created_at < ?
    GROUP BY c.user_id
    ORDER BY first_afternoon_smoke ASC
    LIMIT 20
  `).bind(afternoonStartTs, afternoonEndTs).all();
  
  // All-time afternoon break leaderboard
  const leaderboard = await env.DB.prepare(`
    SELECT 
      u.id,
      u.username,
      u.avatar_url,
      COUNT(*) as total_afternoon_smokes,
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
    ORDER BY total_afternoon_smokes DESC
    LIMIT 10
  `).bind(
    todayStartTs, AFTERNOON_START * 3600, todayStartTs, AFTERNOON_END * 3600,
    todayStartTs, AFTERNOON_START * 3600, todayStartTs, AFTERNOON_END * 3600
  ).all();

  // Platform-wide afternoon break stats
  const platformStats = await env.DB.prepare(`
    SELECT 
      COUNT(*) as total_afternoon_smokes,
      COUNT(DISTINCT user_id) as unique_afternoon_smokers
    FROM checkins
    WHERE ((created_at - ?) % 86400) >= ?
      AND ((created_at - ?) % 86400) < ?
  `).bind(todayStartTs, AFTERNOON_START * 3600, todayStartTs, AFTERNOON_END * 3600).first() as {
    total_afternoon_smokes: number;
    unique_afternoon_smokers: number;
  } | null;

  // Count distinct days with afternoon break smokes
  const afternoonDays = await env.DB.prepare(`
    SELECT COUNT(DISTINCT DATE(datetime(created_at, 'unixepoch', '-5 hours'))) as days
    FROM checkins
    WHERE ((created_at - ?) % 86400) >= ?
      AND ((created_at - ?) % 86400) < ?
  `).bind(todayStartTs, AFTERNOON_START * 3600, todayStartTs, AFTERNOON_END * 3600).first() as { days: number } | null;

  // Personal afternoon break stats (if logged in)
  let personalStats = null;
  if (userId) {
    const personal = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total_afternoon_smokes,
        (
          SELECT brand FROM checkins 
          WHERE user_id = ?
            AND ((created_at - ?) % 86400) >= ?
            AND ((created_at - ?) % 86400) < ?
          GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1
        ) as favorite_afternoon_brand
      FROM checkins
      WHERE user_id = ?
        AND ((created_at - ?) % 86400) >= ?
        AND ((created_at - ?) % 86400) < ?
    `).bind(
      userId, todayStartTs, AFTERNOON_START * 3600, todayStartTs, AFTERNOON_END * 3600,
      userId, todayStartTs, AFTERNOON_START * 3600, todayStartTs, AFTERNOON_END * 3600
    ).first() as { total_afternoon_smokes: number; favorite_afternoon_brand: string | null } | null;

    // Calculate percentile
    const totalUsers = platformStats?.unique_afternoon_smokers || 1;
    const userSmokes = personal?.total_afternoon_smokes || 0;
    
    const rank = await env.DB.prepare(`
      SELECT COUNT(DISTINCT user_id) as better_count
      FROM checkins
      WHERE ((created_at - ?) % 86400) >= ?
        AND ((created_at - ?) % 86400) < ?
      GROUP BY user_id
      HAVING COUNT(*) > ?
    `).bind(todayStartTs, AFTERNOON_START * 3600, todayStartTs, AFTERNOON_END * 3600, userSmokes).all();

    const betterCount = rank.results?.length || 0;
    const percentile = totalUsers > 0 ? Math.max(1, Math.round(((totalUsers - betterCount) / totalUsers) * 100)) : 100;

    if (personal) {
      personalStats = {
        totalAfternoonSmokes: personal.total_afternoon_smokes,
        favoriteAfternoonBrand: personal.favorite_afternoon_brand,
        percentile
      };
    }
  }

  return Response.json({
    isAfternoonBreak,
    currentHour,
    vibeText,
    isWeekday,
    productivityTip,
    todaySmokers: todaySmokers.results || [],
    todayCount: todaySmokers.results?.length || 0,
    platformStats: {
      totalAfternoonSmokes: platformStats?.total_afternoon_smokes || 0,
      uniqueAfternoonSmokers: platformStats?.unique_afternoon_smokers || 0,
      afternoonDays: afternoonDays?.days || 0
    },
    leaderboard: leaderboard.results || [],
    personalStats
  });
}
