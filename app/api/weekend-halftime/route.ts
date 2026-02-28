import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

interface HalftimeStats {
  isWeekend: boolean;
  isHalftime: boolean; // Saturday 10 AM - 6 PM
  weekendProgress: number; // 0-100%
  hoursIn: number;
  hoursRemaining: number;
  
  // Weekend so far
  saturdayCheckins: number;
  fridayNightCheckins: number;
  totalWeekendCheckins: number;
  activeSmokersToday: number;
  
  // Performance comparison
  thisWeekendVsLast: number; // percentage difference
  saturdayVsFriday: number;
  
  // Community pulse
  currentMood: string;
  moodEmoji: string;
  avgRating: number;
  topBrandToday: string | null;
  peakHourToday: number | null;
  
  // MVP so far
  mvp: {
    username: string;
    checkins: number;
    avgRating: number;
    streak: number;
  } | null;
  
  // Runners up
  topPerformers: Array<{
    username: string;
    checkins: number;
    stat: string;
  }>;
  
  // Sunday prediction
  prediction: {
    expectedCheckins: number;
    expectedPeak: string;
    vibeLevel: string;
  };
  
  // Your stats (if logged in)
  yourStats?: {
    weekendCheckins: number;
    saturdayCheckins: number;
    rank: number;
    avgRating: number;
    momentum: "rising" | "steady" | "quiet";
  };
}

function getWeekendMood(avgRating: number, checkinCount: number): { mood: string; emoji: string } {
  if (checkinCount < 3) return { mood: "Waking Up", emoji: "😴" };
  if (avgRating >= 4.8) return { mood: "Peak Vibes", emoji: "🔥" };
  if (avgRating >= 4.5) return { mood: "Excellent", emoji: "✨" };
  if (avgRating >= 4.0) return { mood: "Good Times", emoji: "😎" };
  if (avgRating >= 3.5) return { mood: "Chill", emoji: "🛋️" };
  return { mood: "Mellow", emoji: "😌" };
}

function getSundayPrediction(saturdayCheckins: number, fridayCheckins: number, activeUsers: number) {
  // Simple prediction based on patterns
  const avgPerDay = (saturdayCheckins + fridayCheckins) / 2;
  const momentum = saturdayCheckins > fridayCheckins ? 1.1 : 0.9;
  const expectedCheckins = Math.round(avgPerDay * momentum);
  
  let vibeLevel = "Chill Sunday";
  if (expectedCheckins > 15) vibeLevel = "Active Sunday";
  if (expectedCheckins > 25) vibeLevel = "Big Sunday Energy";
  
  const peakHour = activeUsers > 3 ? "2-5 PM" : "4-7 PM";
  
  return {
    expectedCheckins,
    expectedPeak: peakHour,
    vibeLevel
  };
}

export async function GET(request: Request) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    
    // Calculate weekend boundaries (Friday 5 PM to Sunday 11:59 PM)
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const utcHour = now.getUTCHours();
    const localOffset = -5; // EST
    const localHour = (utcHour + localOffset + 24) % 24;
    const localDay = dayOfWeek; // Simplified
    
    // Weekend = Friday 5PM through Sunday
    const isFridayEvening = localDay === 5 && localHour >= 17;
    const isSaturday = localDay === 6;
    const isSunday = localDay === 0;
    const isWeekend = isFridayEvening || isSaturday || isSunday;
    
    // Halftime = Saturday 10 AM to 6 PM
    const isHalftime = isSaturday && localHour >= 10 && localHour < 18;
    
    // Calculate weekend progress
    // Total weekend hours: ~55 (Friday 5PM to Sunday midnight)
    let hoursIn = 0;
    if (isSunday) {
      hoursIn = 31 + localHour; // 31 hours (Fri 5PM to Sat midnight) + Sunday hours
    } else if (isSaturday) {
      hoursIn = 7 + localHour; // 7 hours Friday (5PM-midnight) + Saturday hours
    } else if (isFridayEvening) {
      hoursIn = localHour - 17;
    }
    const totalWeekendHours = 55;
    const weekendProgress = Math.min(100, Math.round((hoursIn / totalWeekendHours) * 100));
    const hoursRemaining = Math.max(0, totalWeekendHours - hoursIn);
    
    // Get weekend start timestamp (most recent Friday 5 PM)
    const weekendStart = new Date(now);
    const daysBack = localDay === 0 ? 2 : (localDay === 6 ? 1 : 0);
    weekendStart.setDate(weekendStart.getDate() - daysBack);
    weekendStart.setHours(17, 0, 0, 0);
    const weekendStartTs = Math.floor(weekendStart.getTime() / 1000);
    
    // Saturday start (for Saturday vs Friday comparison)
    const saturdayStart = new Date(weekendStart);
    saturdayStart.setDate(saturdayStart.getDate() + 1);
    saturdayStart.setHours(0, 0, 0, 0);
    const saturdayStartTs = Math.floor(saturdayStart.getTime() / 1000);
    
    // Today's timestamps
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTs = Math.floor(todayStart.getTime() / 1000);
    const nowTs = Math.floor(now.getTime() / 1000);
    
    // Get check-in stats
    const totalWeekend = await db.prepare(
      `SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM checkins WHERE created_at >= ?`
    ).bind(weekendStartTs).first() as { count: number; avg_rating: number | null };
    
    const saturdayStats = await db.prepare(
      `SELECT COUNT(*) as count FROM checkins WHERE created_at >= ?`
    ).bind(saturdayStartTs).first() as { count: number };
    
    const fridayStats = await db.prepare(
      `SELECT COUNT(*) as count FROM checkins WHERE created_at >= ? AND created_at < ?`
    ).bind(weekendStartTs, saturdayStartTs).first() as { count: number };
    
    // Active smokers today
    const activeToday = await db.prepare(
      `SELECT COUNT(DISTINCT user_id) as count FROM checkins WHERE created_at >= ?`
    ).bind(todayStartTs).first() as { count: number };
    
    // Top brand today
    const topBrand = await db.prepare(
      `SELECT brand, COUNT(*) as count FROM checkins WHERE created_at >= ? GROUP BY brand ORDER BY count DESC LIMIT 1`
    ).bind(todayStartTs).first() as { brand: string; count: number } | null;
    
    // Peak hour today
    const peakHour = await db.prepare(`
      SELECT CAST((created_at - ?) / 3600 AS INTEGER) as hour, COUNT(*) as count 
      FROM checkins 
      WHERE created_at >= ? 
      GROUP BY hour 
      ORDER BY count DESC 
      LIMIT 1
    `).bind(todayStartTs, todayStartTs).first() as { hour: number; count: number } | null;
    
    // MVP of the weekend
    const mvpQuery = await db.prepare(`
      SELECT 
        u.username,
        COUNT(c.id) as checkins,
        AVG(c.rating) as avg_rating,
        COALESCE(u.current_streak, 0) as streak
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      GROUP BY c.user_id
      ORDER BY checkins DESC, avg_rating DESC
      LIMIT 1
    `).bind(weekendStartTs).first() as { username: string; checkins: number; avg_rating: number; streak: number } | null;
    
    // Top performers
    const topPerformers = await db.prepare(`
      SELECT 
        u.username,
        COUNT(c.id) as checkins,
        AVG(c.rating) as avg_rating
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      GROUP BY c.user_id
      ORDER BY checkins DESC
      LIMIT 5
    `).bind(weekendStartTs).all() as { results: Array<{ username: string; checkins: number; avg_rating: number }> };
    
    // Last weekend comparison (7 days ago)
    const lastWeekendStart = weekendStartTs - 7 * 24 * 3600;
    const lastWeekendEnd = lastWeekendStart + totalWeekendHours * 3600;
    const lastWeekendSamePoint = lastWeekendStart + hoursIn * 3600;
    
    const lastWeekendStats = await db.prepare(
      `SELECT COUNT(*) as count FROM checkins WHERE created_at >= ? AND created_at < ?`
    ).bind(lastWeekendStart, lastWeekendSamePoint).first() as { count: number };
    
    const thisWeekendVsLast = lastWeekendStats.count > 0 
      ? Math.round(((totalWeekend.count - lastWeekendStats.count) / lastWeekendStats.count) * 100)
      : 0;
    
    const saturdayVsFriday = fridayStats.count > 0
      ? Math.round(((saturdayStats.count - fridayStats.count) / fridayStats.count) * 100)
      : 0;
    
    // Get mood
    const { mood, emoji } = getWeekendMood(totalWeekend.avg_rating || 0, totalWeekend.count);
    
    // Sunday prediction
    const prediction = getSundayPrediction(saturdayStats.count, fridayStats.count, activeToday.count);
    
    const response: HalftimeStats = {
      isWeekend,
      isHalftime,
      weekendProgress,
      hoursIn,
      hoursRemaining,
      saturdayCheckins: saturdayStats.count,
      fridayNightCheckins: fridayStats.count,
      totalWeekendCheckins: totalWeekend.count,
      activeSmokersToday: activeToday.count,
      thisWeekendVsLast,
      saturdayVsFriday,
      currentMood: mood,
      moodEmoji: emoji,
      avgRating: totalWeekend.avg_rating || 0,
      topBrandToday: topBrand?.brand || null,
      peakHourToday: peakHour?.hour || null,
      mvp: mvpQuery ? {
        username: mvpQuery.username,
        checkins: mvpQuery.checkins,
        avgRating: mvpQuery.avg_rating,
        streak: mvpQuery.streak
      } : null,
      topPerformers: topPerformers.results.slice(1).map((p, idx) => ({
        username: p.username,
        checkins: p.checkins,
        stat: `${p.checkins} smokes`
      })),
      prediction
    };
    
    // User's stats
    if (userId) {
      const userWeekend = await db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as saturday,
          AVG(rating) as avg_rating
        FROM checkins
        WHERE user_id = ? AND created_at >= ?
      `).bind(saturdayStartTs, userId, weekendStartTs).first() as { total: number; saturday: number; avg_rating: number | null };
      
      // Calculate rank
      const userRank = await db.prepare(`
        SELECT COUNT(*) + 1 as rank
        FROM (
          SELECT user_id, COUNT(*) as cnt
          FROM checkins
          WHERE created_at >= ?
          GROUP BY user_id
          HAVING cnt > (SELECT COUNT(*) FROM checkins WHERE user_id = ? AND created_at >= ?)
        )
      `).bind(weekendStartTs, userId, weekendStartTs).first() as { rank: number };
      
      // Determine momentum
      let momentum: "rising" | "steady" | "quiet" = "steady";
      if (userWeekend.saturday > userWeekend.total - userWeekend.saturday) {
        momentum = "rising";
      } else if (userWeekend.total === 0) {
        momentum = "quiet";
      }
      
      response.yourStats = {
        weekendCheckins: userWeekend.total,
        saturdayCheckins: userWeekend.saturday,
        rank: userRank.rank,
        avgRating: userWeekend.avg_rating || 0,
        momentum
      };
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("Weekend halftime error:", error);
    return NextResponse.json({ error: "Failed to load halftime stats" }, { status: 500 });
  }
}
