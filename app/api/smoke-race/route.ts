import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

export const runtime = "edge";

// Get today's boundaries in user timezone (default to EST)
function getTodayBoundaries(): { start: number; end: number; hoursRemaining: number } {
  const now = new Date();
  // Use EST for consistency
  const estOffset = -5 * 60; // EST is UTC-5
  const localOffset = now.getTimezoneOffset();
  const estNow = new Date(now.getTime() + (localOffset + estOffset) * 60 * 1000);
  
  // Start of today EST
  const todayStart = new Date(estNow);
  todayStart.setHours(0, 0, 0, 0);
  const startUtc = new Date(todayStart.getTime() - (localOffset + estOffset) * 60 * 1000);
  
  // End of today EST
  const todayEnd = new Date(estNow);
  todayEnd.setHours(23, 59, 59, 999);
  const endUtc = new Date(todayEnd.getTime() - (localOffset + estOffset) * 60 * 1000);
  
  const hoursRemaining = Math.max(0, Math.ceil((endUtc.getTime() - Date.now()) / (1000 * 60 * 60)));
  
  return {
    start: Math.floor(startUtc.getTime() / 1000),
    end: Math.floor(endUtc.getTime() / 1000),
    hoursRemaining,
  };
}

// Fun titles for race positions
function getRaceTitle(position: number): { title: string; emoji: string } {
  const titles: Record<number, { title: string; emoji: string }> = {
    1: { title: "Race Leader", emoji: "🏆" },
    2: { title: "Hot Pursuit", emoji: "🔥" },
    3: { title: "Podium Contender", emoji: "🥉" },
    4: { title: "Closing In", emoji: "💨" },
    5: { title: "In The Pack", emoji: "🚬" },
  };
  return titles[position] || { title: "Racing", emoji: "🏁" };
}

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);
    
    const { env } = getRequestContext();
    const db = env.DB;
    
    let currentUserId: string | null = null;
    
    if (sessionId) {
      const now = Math.floor(Date.now() / 1000);
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
        .bind(sessionId, now)
        .first<{ user_id: string }>();
      currentUserId = session?.user_id || null;
    }
    
    const { start, end, hoursRemaining } = getTodayBoundaries();
    
    // Get today's check-in counts per user
    const racers = await db
      .prepare(`
        SELECT 
          u.id as user_id,
          u.username,
          COUNT(c.id) as today_count,
          MAX(c.created_at) as last_smoke
        FROM users u
        LEFT JOIN checkins c ON u.id = c.user_id 
          AND c.created_at >= ? AND c.created_at <= ?
        GROUP BY u.id
        HAVING today_count > 0
        ORDER BY today_count DESC, last_smoke DESC
        LIMIT 20
      `)
      .bind(start, end)
      .all<{ user_id: string; username: string; today_count: number; last_smoke: number }>();
    
    // Get total check-ins today
    const totalResult = await db
      .prepare(`
        SELECT COUNT(*) as total
        FROM checkins
        WHERE created_at >= ? AND created_at <= ?
      `)
      .bind(start, end)
      .first<{ total: number }>();
    
    // Get current user's position if not in top 20
    let myPosition: number | null = null;
    let myCount = 0;
    
    if (currentUserId) {
      const myResult = await db
        .prepare(`
          SELECT COUNT(*) as count
          FROM checkins
          WHERE user_id = ? AND created_at >= ? AND created_at <= ?
        `)
        .bind(currentUserId, start, end)
        .first<{ count: number }>();
      
      myCount = myResult?.count || 0;
      
      if (myCount > 0) {
        // Find position
        const posResult = await db
          .prepare(`
            SELECT COUNT(*) + 1 as position
            FROM (
              SELECT user_id, COUNT(*) as cnt
              FROM checkins
              WHERE created_at >= ? AND created_at <= ?
              GROUP BY user_id
              HAVING cnt > ?
            )
          `)
          .bind(start, end, myCount)
          .first<{ position: number }>();
        
        myPosition = posResult?.position || null;
      }
    }
    
    // Build leaderboard with titles
    const leaderboard = (racers.results || []).map((racer, idx) => ({
      username: racer.username,
      count: racer.today_count,
      position: idx + 1,
      ...getRaceTitle(idx + 1),
      isMe: racer.user_id === currentUserId,
      lastSmoke: racer.last_smoke,
    }));
    
    // Get yesterday's winner for comparison
    const yesterdayStart = start - 86400;
    const yesterdayEnd = end - 86400;
    
    const yesterdayWinner = await db
      .prepare(`
        SELECT u.username, COUNT(c.id) as count
        FROM users u
        JOIN checkins c ON u.id = c.user_id
        WHERE c.created_at >= ? AND c.created_at <= ?
        GROUP BY u.id
        ORDER BY count DESC
        LIMIT 1
      `)
      .bind(yesterdayStart, yesterdayEnd)
      .first<{ username: string; count: number }>();
    
    return NextResponse.json({
      leaderboard,
      totalSmokesToday: totalResult?.total || 0,
      hoursRemaining,
      myPosition: myPosition || (myCount > 0 ? leaderboard.length + 1 : null),
      myCount,
      yesterdayWinner: yesterdayWinner ? {
        username: yesterdayWinner.username,
        count: yesterdayWinner.count,
      } : null,
      raceEndsAt: end,
    });
    
  } catch (error) {
    console.error("Smoke race error:", error);
    return NextResponse.json(
      { error: "Failed to load smoke race" },
      { status: 500 }
    );
  }
}
