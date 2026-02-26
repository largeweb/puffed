import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

// Lunch Break Lounge: 11am - 2pm
const LUNCH_START_HOUR = 11;
const LUNCH_END_HOUR = 14;

function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export async function GET() {
  const { env } = getRequestContext();
  
  // Get user from session
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  let user: { id: string; username: string } | null = null;
  
  if (sessionId) {
    const session = await env.DB.prepare(
      "SELECT u.id, u.username FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > ?"
    ).bind(sessionId, Math.floor(Date.now() / 1000)).first() as { id: string; username: string } | null;
    user = session;
  }
  
  // Get current hour in EST
  const now = new Date();
  const estOffset = -5 * 60;
  const utcOffset = now.getTimezoneOffset();
  const estTime = new Date(now.getTime() + (utcOffset + estOffset) * 60000);
  const currentHour = estTime.getHours();
  
  const isLunchTime = currentHour >= LUNCH_START_HOUR && currentHour < LUNCH_END_HOUR;
  
  // Get today's start timestamp
  const todayStart = new Date(estTime);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartTs = Math.floor(todayStart.getTime() / 1000);
  
  // Lunch window timestamps for today
  const lunchStartTs = todayStartTs + (LUNCH_START_HOUR * 3600);
  const lunchEndTs = todayStartTs + (LUNCH_END_HOUR * 3600);
  
  // Today's lunch smokers
  const lunchSmokers = await env.DB.prepare(`
    SELECT DISTINCT c.user_id, u.username, u.avatar_url,
      COUNT(*) as lunch_smokes,
      MIN(c.created_at) as first_lunch_smoke
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.created_at >= ? AND c.created_at < ?
    GROUP BY c.user_id
    ORDER BY first_lunch_smoke ASC
    LIMIT 20
  `).bind(lunchStartTs, lunchEndTs).all();
  
  // All-time lunch break stats (simple count approach)
  const lunchStats = await env.DB.prepare(`
    SELECT 
      COUNT(*) as total_lunch_smokes
    FROM checkins c
    WHERE 
      ((c.created_at - ?) % 86400) >= ? 
      AND ((c.created_at - ?) % 86400) < ?
  `).bind(todayStartTs, LUNCH_START_HOUR * 3600, todayStartTs, LUNCH_END_HOUR * 3600).first() as { total_lunch_smokes: number } | null;
  
  // Unique lunch smokers count
  const uniqueLunchers = await env.DB.prepare(`
    SELECT COUNT(DISTINCT user_id) as count
    FROM checkins
    WHERE 
      ((created_at - ?) % 86400) >= ? 
      AND ((created_at - ?) % 86400) < ?
  `).bind(todayStartTs, LUNCH_START_HOUR * 3600, todayStartTs, LUNCH_END_HOUR * 3600).first() as { count: number } | null;
  
  // Lunch break leaderboard (all time)
  const lunchLeaders = await env.DB.prepare(`
    SELECT u.id, u.username, u.avatar_url,
      COUNT(*) as total_lunch_smokes
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE 
      ((c.created_at - ?) % 86400) >= ? 
      AND ((c.created_at - ?) % 86400) < ?
    GROUP BY c.user_id
    ORDER BY total_lunch_smokes DESC
    LIMIT 10
  `).bind(todayStartTs, LUNCH_START_HOUR * 3600, todayStartTs, LUNCH_END_HOUR * 3600).all();
  
  // Personal lunch stats
  let personalStats = null;
  if (user) {
    const myLunchStats = await env.DB.prepare(`
      SELECT COUNT(*) as my_lunch_smokes
      FROM checkins
      WHERE user_id = ?
        AND ((created_at - ?) % 86400) >= ? 
        AND ((created_at - ?) % 86400) < ?
    `).bind(user.id, todayStartTs, LUNCH_START_HOUR * 3600, todayStartTs, LUNCH_END_HOUR * 3600).first() as { my_lunch_smokes: number } | null;
    
    // Favorite lunch brand
    const favBrand = await env.DB.prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins
      WHERE user_id = ?
        AND ((created_at - ?) % 86400) >= ? 
        AND ((created_at - ?) % 86400) < ?
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 1
    `).bind(user.id, todayStartTs, LUNCH_START_HOUR * 3600, todayStartTs, LUNCH_END_HOUR * 3600).first() as { brand: string; count: number } | null;
    
    // Percentile calculation
    const totalUsers = await env.DB.prepare(`SELECT COUNT(DISTINCT user_id) as count FROM checkins`).first() as { count: number } | null;
    const usersWithMoreLunches = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT user_id, COUNT(*) as lunch_count
        FROM checkins
        WHERE 
          ((created_at - ?) % 86400) >= ? 
          AND ((created_at - ?) % 86400) < ?
        GROUP BY user_id
        HAVING lunch_count > ?
      )
    `).bind(todayStartTs, LUNCH_START_HOUR * 3600, todayStartTs, LUNCH_END_HOUR * 3600, myLunchStats?.my_lunch_smokes || 0).first() as { count: number } | null;
    
    const percentile = totalUsers?.count 
      ? Math.round(100 - ((usersWithMoreLunches?.count || 0) / totalUsers.count * 100))
      : 0;
    
    personalStats = {
      totalLunchSmokes: myLunchStats?.my_lunch_smokes || 0,
      favoriteLunchBrand: favBrand?.brand || null,
      percentile
    };
  }
  
  // Get lunch break vibes text
  let vibeText = "Take a break, enjoy a smoke!";
  if (currentHour === 11) vibeText = "Early lunch? Smart move! 🍽️";
  else if (currentHour === 12) vibeText = "Peak lunch hour - the break room is buzzing! 🔥";
  else if (currentHour === 13) vibeText = "Post-lunch puff - the perfect digestif 😌";
  
  return Response.json({
    isLunchTime,
    currentHour,
    vibeText,
    todaySmokers: lunchSmokers.results,
    todayCount: lunchSmokers.results?.length || 0,
    platformStats: {
      totalLunchSmokes: lunchStats?.total_lunch_smokes || 0,
      uniqueLunchSmokers: uniqueLunchers?.count || 0,
      lunchDays: 0 // Simplified
    },
    leaderboard: lunchLeaders.results,
    personalStats
  });
}
