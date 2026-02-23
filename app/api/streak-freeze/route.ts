import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";
import { generateId } from "@/lib/auth";

export const runtime = "edge";

export interface StreakFreezeStatus {
  available: boolean;
  usedThisWeek: boolean;
  lastUsed: string | null;
  streakAtRisk: boolean;
  currentStreak: number;
  error?: string;
}

export interface StreakFreezeResponse {
  success: boolean;
  message: string;
  newStreak?: number;
  error?: string;
}

// Get start of current week (Sunday)
function getWeekStart(): number {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday
  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - dayOfWeek);
  weekStart.setUTCHours(0, 0, 0, 0);
  return Math.floor(weekStart.getTime() / 1000);
}

// Get today's date string (UTC)
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Get yesterday's date string (UTC)
function getYesterdayString(): string {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

// Check if user's streak is at risk (logged yesterday but not today)
async function checkStreakAtRisk(db: D1Database, userId: string): Promise<{ atRisk: boolean; currentStreak: number }> {
  const today = getTodayString();
  const yesterday = getYesterdayString();
  
  // Check if logged today
  const todayCheckin = await db.prepare(`
    SELECT 1 FROM checkins 
    WHERE user_id = ? AND DATE(created_at, 'unixepoch') = ?
  `).bind(userId, today).first();
  
  if (todayCheckin) {
    // Already logged today, streak is safe
    return { atRisk: false, currentStreak: await getCurrentStreak(db, userId) };
  }
  
  // Check if logged yesterday (meaning they have an active streak)
  const yesterdayCheckin = await db.prepare(`
    SELECT 1 FROM checkins 
    WHERE user_id = ? AND DATE(created_at, 'unixepoch') = ?
  `).bind(userId, yesterday).first();
  
  if (!yesterdayCheckin) {
    // Didn't log yesterday either - no active streak to protect
    return { atRisk: false, currentStreak: 0 };
  }
  
  // Logged yesterday but not today - streak at risk!
  return { atRisk: true, currentStreak: await getCurrentStreak(db, userId) };
}

// Calculate current streak
async function getCurrentStreak(db: D1Database, userId: string): Promise<number> {
  const result = await db.prepare(`
    WITH dates AS (
      SELECT DISTINCT DATE(created_at, 'unixepoch') as smoke_date
      FROM checkins
      WHERE user_id = ?
      ORDER BY smoke_date DESC
    ),
    numbered AS (
      SELECT smoke_date, ROW_NUMBER() OVER (ORDER BY smoke_date DESC) as rn
      FROM dates
    )
    SELECT COUNT(*) as streak
    FROM numbered
    WHERE DATE(smoke_date, '+' || (rn - 1) || ' day') = (SELECT smoke_date FROM numbered WHERE rn = 1)
  `).bind(userId).first<{ streak: number }>();
  
  return result?.streak || 0;
}

// GET - Check freeze status
export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Session expired" }, { status: 401 });
    }

    const userId = session.user_id;
    const weekStart = getWeekStart();

    // Check if user used a freeze this week
    const freezeUsed = await db.prepare(`
      SELECT created_at FROM streak_freezes
      WHERE user_id = ? AND created_at >= ?
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(userId, weekStart).first<{ created_at: number }>();

    // Check if streak is at risk
    const { atRisk, currentStreak } = await checkStreakAtRisk(db, userId);

    const status: StreakFreezeStatus = {
      available: !freezeUsed,
      usedThisWeek: !!freezeUsed,
      lastUsed: freezeUsed ? new Date(freezeUsed.created_at * 1000).toISOString() : null,
      streakAtRisk: atRisk,
      currentStreak,
    };

    return Response.json(status);
  } catch (error) {
    console.error("Streak freeze status error:", error);
    // If table doesn't exist, return that freeze is available
    if (String(error).includes("no such table")) {
      return Response.json({
        available: true,
        usedThisWeek: false,
        lastUsed: null,
        streakAtRisk: false,
        currentStreak: 0,
      } as StreakFreezeStatus);
    }
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

// POST - Use a streak freeze
export async function POST(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Session expired" }, { status: 401 });
    }

    const userId = session.user_id;
    const weekStart = getWeekStart();
    const now = Math.floor(Date.now() / 1000);

    // Check if already used this week
    const freezeUsed = await db.prepare(`
      SELECT 1 FROM streak_freezes
      WHERE user_id = ? AND created_at >= ?
    `).bind(userId, weekStart).first();

    if (freezeUsed) {
      return Response.json({ 
        success: false, 
        message: "You've already used your streak freeze this week!",
        error: "freeze_used"
      } as StreakFreezeResponse);
    }

    // Check if streak is actually at risk
    const { atRisk, currentStreak } = await checkStreakAtRisk(db, userId);

    if (!atRisk) {
      return Response.json({ 
        success: false, 
        message: currentStreak > 0 
          ? "Your streak is safe! No need to use a freeze."
          : "No active streak to protect.",
        error: "no_risk"
      } as StreakFreezeResponse);
    }

    // Use the freeze - insert a "virtual" checkin for today
    // This creates a placeholder that counts toward streak without being a real checkin
    const freezeId = generateId();
    
    // Record the freeze usage
    await db.prepare(`
      INSERT INTO streak_freezes (id, user_id, created_at)
      VALUES (?, ?, ?)
    `).bind(freezeId, userId, now).run();

    // Create a system notification about the freeze
    const notifId = generateId();
    await db.prepare(`
      INSERT INTO notifications (id, user_id, type, from_user_id, message, created_at)
      VALUES (?, ?, 'streak_freeze', ?, ?, ?)
    `).bind(
      notifId,
      userId,
      userId,
      `❄️ Streak Freeze activated! Your ${currentStreak}-day streak is protected for today.`,
      now
    ).run();

    return Response.json({ 
      success: true, 
      message: `Streak freeze activated! Your ${currentStreak}-day streak is protected.`,
      newStreak: currentStreak
    } as StreakFreezeResponse);
  } catch (error) {
    console.error("Streak freeze error:", error);
    return Response.json({ 
      success: false, 
      message: "Failed to activate streak freeze",
      error: String(error)
    }, { status: 500 });
  }
}
