import { NextRequest } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface MidweekData {
  isWednesday: boolean;
  weekProgress: number; // 0-100% through the week
  userStats: {
    smokesThisWeek: number;
    smokesToday: number;
    weeklyGoalProgress: number;
    avgWeeklySmokes: number;
  } | null;
  communityStats: {
    smokesThisWeek: number;
    smokesToday: number;
    activeSmokersThisWeek: number;
    topBrandThisWeek: string | null;
  };
  midweekChampions: {
    username: string;
    smokesThisWeek: number;
    todaySmokes: number;
  }[];
  motivationalMessage: string;
  humpDayStreak: number; // How many Wednesdays in a row they've smoked
}

const MOTIVATIONAL_MESSAGES = [
  "🐪 Hump Day! You're over the hump – reward yourself!",
  "💪 Midweek milestone! Keep that momentum going!",
  "🌟 Wednesday warriors smoke together!",
  "🔥 Halfway through the week – you've earned this!",
  "⚡ Midweek recharge time! Light one up!",
  "🎯 Wednesday check-in = peak smoker energy!",
  "🏆 Champions don't skip Hump Day!",
  "✨ It's Wednesday, my dude – time to puff!",
];

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Check if it's Wednesday (in user's likely timezone - we'll use EST as default)
    const now = new Date();
    // Adjust for EST (UTC-5)
    const estOffset = -5 * 60 * 60 * 1000;
    const estNow = new Date(now.getTime() + estOffset);
    const dayOfWeek = estNow.getUTCDay(); // 0=Sun, 3=Wed
    const isWednesday = dayOfWeek === 3;

    // Calculate week progress (0% = Monday 12am, 100% = Sunday 11:59pm)
    // Adjust so Monday = 0, Sunday = 6
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const hourProgress = estNow.getUTCHours() / 24;
    const weekProgress = Math.round(((adjustedDay + hourProgress) / 7) * 100);

    // Get timestamps for this week (Monday start)
    const nowUnix = Math.floor(Date.now() / 1000);
    const todayStart = nowUnix - (nowUnix % 86400);
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = todayStart - (daysSinceMonday * 86400);

    // Community stats for this week
    const [weekSmokesResult, todaySmokesResult, activeSmokersResult, topBrandResult] = await Promise.all([
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE created_at >= ?")
        .bind(weekStart).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE created_at >= ?")
        .bind(todayStart).first<{ count: number }>(),
      db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM checkins WHERE created_at >= ?")
        .bind(weekStart).first<{ count: number }>(),
      db.prepare(`
        SELECT brand, COUNT(*) as count 
        FROM checkins 
        WHERE created_at >= ? 
        GROUP BY brand 
        ORDER BY count DESC 
        LIMIT 1
      `).bind(weekStart).first<{ brand: string; count: number }>(),
    ]);

    // Midweek champions - top smokers this week
    const championsResult = await db.prepare(`
      SELECT 
        u.username,
        COUNT(*) as smokes_this_week,
        SUM(CASE WHEN c.created_at >= ? THEN 1 ELSE 0 END) as today_smokes
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      GROUP BY u.id
      ORDER BY smokes_this_week DESC
      LIMIT 5
    `).bind(todayStart, weekStart).all<{ username: string; smokes_this_week: number; today_smokes: number }>();

    // Check authentication for personal stats
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);
    
    let userStats: MidweekData["userStats"] = null;
    let humpDayStreak = 0;

    if (sessionId) {
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
        .bind(sessionId, nowUnix)
        .first<{ user_id: string }>();

      if (session) {
        // User's weekly smokes
        const [userWeekSmokes, userTodaySmokes, userAvgWeekly] = await Promise.all([
          db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND created_at >= ?")
            .bind(session.user_id, weekStart).first<{ count: number }>(),
          db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND created_at >= ?")
            .bind(session.user_id, todayStart).first<{ count: number }>(),
          db.prepare(`
            SELECT CAST(COUNT(*) AS REAL) / MAX(1, (? - MIN(created_at)) / 604800) as avg_weekly
            FROM checkins 
            WHERE user_id = ?
          `).bind(nowUnix, session.user_id).first<{ avg_weekly: number }>(),
        ]);

        // Calculate goal progress (weekly goal = avg + 1 or minimum 3)
        const avgWeekly = Math.round(userAvgWeekly?.avg_weekly || 0);
        const weeklyGoal = Math.max(avgWeekly + 1, 3);
        const userWeekCount = userWeekSmokes?.count || 0;
        const goalProgress = Math.min(100, Math.round((userWeekCount / weeklyGoal) * 100));

        userStats = {
          smokesThisWeek: userWeekCount,
          smokesToday: userTodaySmokes?.count || 0,
          weeklyGoalProgress: goalProgress,
          avgWeeklySmokes: avgWeekly,
        };

        // Calculate Hump Day streak (Wednesdays with at least one smoke)
        const wednesdayStreakResult = await db.prepare(`
          WITH wednesday_smokes AS (
            SELECT DISTINCT date(created_at, 'unixepoch', 'weekday 3', '-7 days') as wed_date
            FROM checkins
            WHERE user_id = ?
            AND CAST(strftime('%w', created_at, 'unixepoch') AS INTEGER) = 3
            ORDER BY wed_date DESC
          )
          SELECT COUNT(*) as streak
          FROM (
            SELECT wed_date,
              ROW_NUMBER() OVER (ORDER BY wed_date DESC) as rn
            FROM wednesday_smokes
          ) numbered
          WHERE julianday(wed_date) = julianday('now', 'weekday 3', '-7 days') - (rn - 1) * 7
        `).bind(session.user_id).first<{ streak: number }>();
        
        humpDayStreak = wednesdayStreakResult?.streak || 0;
      }
    }

    // Pick a motivational message (deterministic per day)
    const dayIndex = Math.floor(nowUnix / 86400);
    const messageIndex = dayIndex % MOTIVATIONAL_MESSAGES.length;
    const motivationalMessage = MOTIVATIONAL_MESSAGES[messageIndex];

    const response: MidweekData = {
      isWednesday,
      weekProgress,
      userStats,
      communityStats: {
        smokesThisWeek: weekSmokesResult?.count || 0,
        smokesToday: todaySmokesResult?.count || 0,
        activeSmokersThisWeek: activeSmokersResult?.count || 0,
        topBrandThisWeek: topBrandResult?.brand || null,
      },
      midweekChampions: (championsResult.results || []).map(r => ({
        username: r.username,
        smokesThisWeek: r.smokes_this_week,
        todaySmokes: r.today_smokes,
      })),
      motivationalMessage,
      humpDayStreak,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Midweek momentum error:", error);
    return Response.json({ error: "Failed to load midweek data" }, { status: 500 });
  }
}
