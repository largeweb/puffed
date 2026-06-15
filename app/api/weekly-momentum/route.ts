import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

interface MomentumData {
  thisWeek: number;
  lastWeek: number;
  streak: number;
  bestStreak: number;
  daysSinceLastSmoke: number;
  lastBrand?: string;
  weeklyGoal?: number;
  totalAllTime: number;
}

export const runtime = "edge";

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Session expired" }, { status: 401 });
    }

    const userId = session.user_id;
    const now = Math.floor(Date.now() / 1000);
    
    // Get start of this week (Monday) and last week
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setHours(0, 0, 0, 0);
    startOfThisWeek.setDate(today.getDate() - daysSinceMonday);
    const thisWeekStart = Math.floor(startOfThisWeek.getTime() / 1000);
    
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const lastWeekStart = Math.floor(startOfLastWeek.getTime() / 1000);
    
    // Get check-in counts for this week and last week
    const thisWeekResult = await db.prepare(
      `SELECT COUNT(*) as count FROM checkins 
       WHERE user_id = ? AND created_at >= ?`
    ).bind(userId, thisWeekStart).first<{ count: number }>();
    
    const lastWeekResult = await db.prepare(
      `SELECT COUNT(*) as count FROM checkins 
       WHERE user_id = ? AND created_at >= ? AND created_at < ?`
    ).bind(userId, lastWeekStart, thisWeekStart).first<{ count: number }>();
    
    // Get total all time
    const totalResult = await db.prepare(
      `SELECT COUNT(*) as count FROM checkins WHERE user_id = ?`
    ).bind(userId).first<{ count: number }>();
    
    // Get most recent check-in for "days since" and last brand
    const lastCheckin = await db.prepare(
      `SELECT created_at, brand FROM checkins 
       WHERE user_id = ? 
       ORDER BY created_at DESC LIMIT 1`
    ).bind(userId).first<{ created_at: number; brand: string }>();
    
    // Calculate days since last smoke
    let daysSinceLastSmoke = 0;
    let lastBrand: string | undefined;
    
    if (lastCheckin) {
      const lastSmokeDate = new Date(lastCheckin.created_at * 1000);
      lastSmokeDate.setHours(0, 0, 0, 0);
      const todayMidnight = new Date(today);
      todayMidnight.setHours(0, 0, 0, 0);
      daysSinceLastSmoke = Math.floor((todayMidnight.getTime() - lastSmokeDate.getTime()) / (24 * 60 * 60 * 1000));
      lastBrand = lastCheckin.brand;
    }
    
    // Get current streak
    const streakResult = await db.prepare(
      `SELECT current_streak, best_streak FROM user_streaks WHERE user_id = ?`
    ).bind(userId).first<{ current_streak: number; best_streak: number }>();
    
    // Get weekly goal if set
    const goalResult = await db.prepare(
      `SELECT weekly_goal FROM user_preferences WHERE user_id = ?`
    ).bind(userId).first<{ weekly_goal: number | null }>();
    
    const momentum: MomentumData = {
      thisWeek: thisWeekResult?.count || 0,
      lastWeek: lastWeekResult?.count || 0,
      streak: streakResult?.current_streak || 0,
      bestStreak: streakResult?.best_streak || 0,
      daysSinceLastSmoke,
      lastBrand,
      weeklyGoal: goalResult?.weekly_goal || undefined,
      totalAllTime: totalResult?.count || 0,
    };

    return Response.json({
      momentum,
      generatedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error("Weekly momentum error:", error);
    return Response.json(
      { error: "Failed to fetch momentum" },
      { status: 500 }
    );
  }
}
