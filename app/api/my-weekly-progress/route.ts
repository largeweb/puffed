import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const sessionId = parseSessionCookie(cookieHeader);

  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { env } = getRequestContext();
  const db = env.DB;

  // Get user from session
  const now = Math.floor(Date.now() / 1000);
  const session = await db
    .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
    .bind(sessionId, now)
    .first<{ user_id: string }>();

  if (!session) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const userId = session.user_id;

  // Get start of current week (Monday)
  const nowDate = new Date();
  const dayOfWeek = nowDate.getUTCDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
  const weekStart = new Date(nowDate);
  weekStart.setUTCDate(nowDate.getUTCDate() - diff);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekStartTs = Math.floor(weekStart.getTime() / 1000);

  // Get user's check-ins this week
  const result = await db
    .prepare(
      `SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND created_at >= ?`
    )
    .bind(userId, weekStartTs)
    .first<{ count: number }>();

  const checkinsThisWeek = result?.count || 0;
  const weeklyGoal = 3; // Default goal
  const progress = Math.min((checkinsThisWeek / weeklyGoal) * 100, 100);

  // Get streak (consecutive weeks with at least 1 check-in)
  let streak = 0;
  let checkWeekStart = weekStartTs;
  
  for (let i = 0; i < 12; i++) { // Check up to 12 weeks back
    const checkWeekEnd = checkWeekStart;
    checkWeekStart = checkWeekStart - (7 * 24 * 60 * 60);
    
    const weekResult = await db
      .prepare(
        `SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND created_at >= ? AND created_at < ?`
      )
      .bind(userId, checkWeekStart, checkWeekEnd)
      .first<{ count: number }>();
    
    if (weekResult && weekResult.count > 0) {
      streak++;
    } else {
      break;
    }
  }

  return NextResponse.json({
    checkinsThisWeek,
    weeklyGoal,
    progress: Math.round(progress),
    streak,
    weekStartDate: weekStart.toISOString().split('T')[0],
  });
}
