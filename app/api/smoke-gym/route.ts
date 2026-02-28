import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface DailyStats {
  date: string;
  reps: number; // total smokes
  sets: number; // unique hours with activity
  brands: number; // unique brands
}

interface GymSession {
  name: string;
  emoji: string;
  reps: number;
  startHour: number;
  endHour: number;
}

interface Leaderboard {
  username: string;
  repsToday: number;
  streak: number;
}

// Get user's "gym" stats - treating smokes like workout reps
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;
    const now = Math.floor(Date.now() / 1000);

    // Get current user
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
      .bind(sessionId, now)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const userId = session.user_id;
    
    // Get user info
    const user = await db
      .prepare("SELECT username FROM users WHERE id = ?")
      .bind(userId)
      .first<{ username: string }>();

    // Calculate time boundaries (Eastern Time approximation)
    const nowDate = new Date();
    const todayStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime() / 1000;
    const yesterdayStart = todayStart - 86400;
    const weekStart = todayStart - (nowDate.getDay() * 86400);
    
    // Today's workout stats
    const todayStats = await db
      .prepare(`
        SELECT 
          COUNT(*) as reps,
          COUNT(DISTINCT brand) as brands,
          COUNT(DISTINCT (created_at / 3600)) as sets
        FROM checkins
        WHERE user_id = ? AND created_at >= ?
      `)
      .bind(userId, todayStart)
      .first<{ reps: number; brands: number; sets: number }>();

    // Today's sessions (morning, afternoon, evening, night)
    const sessions = await db
      .prepare(`
        SELECT 
          created_at,
          brand,
          product
        FROM checkins
        WHERE user_id = ? AND created_at >= ?
        ORDER BY created_at ASC
      `)
      .bind(userId, todayStart)
      .all<{ created_at: number; brand: string; product: string | null }>();

    // Categorize into gym sessions
    const gymSessions: GymSession[] = [
      { name: "Dawn Warm-up", emoji: "🌅", reps: 0, startHour: 5, endHour: 9 },
      { name: "Morning Workout", emoji: "☀️", reps: 0, startHour: 9, endHour: 12 },
      { name: "Afternoon Sets", emoji: "🏋️", reps: 0, startHour: 12, endHour: 17 },
      { name: "Evening Cool-down", emoji: "🌆", reps: 0, startHour: 17, endHour: 21 },
      { name: "Night Lifts", emoji: "🌙", reps: 0, startHour: 21, endHour: 24 },
      { name: "Graveyard Grind", emoji: "💀", reps: 0, startHour: 0, endHour: 5 },
    ];

    for (const checkin of sessions.results || []) {
      const hour = new Date(checkin.created_at * 1000).getHours();
      for (const s of gymSessions) {
        if ((s.startHour <= hour && hour < s.endHour) || 
            (s.startHour === 21 && hour >= 21) ||
            (s.startHour === 0 && hour < 5)) {
          s.reps++;
          break;
        }
      }
    }

    // Filter to sessions with activity
    const activeSessions = gymSessions.filter(s => s.reps > 0);

    // Personal records - best day ever
    const personalRecord = await db
      .prepare(`
        SELECT 
          DATE(created_at, 'unixepoch') as date,
          COUNT(*) as reps
        FROM checkins
        WHERE user_id = ?
        GROUP BY DATE(created_at, 'unixepoch')
        ORDER BY reps DESC
        LIMIT 1
      `)
      .bind(userId)
      .first<{ date: string; reps: number }>();

    // This week's total
    const weeklyTotal = await db
      .prepare(`
        SELECT COUNT(*) as reps
        FROM checkins
        WHERE user_id = ? AND created_at >= ?
      `)
      .bind(userId, weekStart)
      .first<{ reps: number }>();

    // Yesterday's reps (for comparison)
    const yesterdayReps = await db
      .prepare(`
        SELECT COUNT(*) as reps
        FROM checkins
        WHERE user_id = ? AND created_at >= ? AND created_at < ?
      `)
      .bind(userId, yesterdayStart, todayStart)
      .first<{ reps: number }>();

    // Current streak (consecutive days)
    const recentDays = await db
      .prepare(`
        SELECT DISTINCT DATE(created_at, 'unixepoch') as date
        FROM checkins
        WHERE user_id = ?
        ORDER BY date DESC
        LIMIT 30
      `)
      .bind(userId)
      .all<{ date: string }>();

    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const dates = (recentDays.results || []).map(r => r.date);
    
    // Check if smoked today or yesterday
    let checkDate = new Date();
    if (!dates.includes(today)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    for (let i = 0; i < 30; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Leaderboard - today's top performers
    const leaderboard = await db
      .prepare(`
        SELECT 
          u.username,
          COUNT(c.id) as repsToday
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE c.created_at >= ?
        GROUP BY c.user_id
        ORDER BY repsToday DESC
        LIMIT 5
      `)
      .bind(todayStart)
      .all<{ username: string; repsToday: number }>();

    // Motivational message based on reps
    const reps = todayStats?.reps || 0;
    let motivation = "";
    let level = "Beginner";
    
    if (reps === 0) {
      motivation = "Time to hit the gym! Log your first rep! 💪";
      level = "Rest Day";
    } else if (reps === 1) {
      motivation = "You're warmed up! Keep pushing!";
      level = "Warm-up";
    } else if (reps < 3) {
      motivation = "Light workout in progress. You got this!";
      level = "Light Session";
    } else if (reps < 5) {
      motivation = "Solid workout! You're in the zone!";
      level = "Regular";
    } else if (reps < 8) {
      motivation = "Beast mode! You're crushing it today! 🔥";
      level = "Power Lifter";
    } else {
      motivation = "LEGENDARY! You're a smoke gym champion! 🏆";
      level = "Champion";
    }

    // Check if today is a PR day
    const isPR = personalRecord && reps > 0 && reps >= personalRecord.reps;

    return NextResponse.json({
      username: user?.username,
      today: {
        reps: reps,
        sets: todayStats?.sets || 0,
        brands: todayStats?.brands || 0,
        sessions: activeSessions,
      },
      comparison: {
        yesterday: yesterdayReps?.reps || 0,
        change: reps - (yesterdayReps?.reps || 0),
      },
      records: {
        personalBest: personalRecord?.reps || 0,
        personalBestDate: personalRecord?.date || null,
        isPR: isPR,
        weeklyTotal: weeklyTotal?.reps || 0,
        streak: streak,
      },
      motivation,
      level,
      leaderboard: leaderboard.results || [],
    });
  } catch (error) {
    console.error("Smoke gym error:", error);
    return NextResponse.json({ error: "Failed to load gym stats" }, { status: 500 });
  }
}
