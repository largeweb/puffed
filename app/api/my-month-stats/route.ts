import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({ smokesThisMonth: 0, daysActive: 0 });
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
      return NextResponse.json({ smokesThisMonth: 0, daysActive: 0 });
    }

    // Get first day of current month
    const nowDate = new Date();
    const firstOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
    const startTimestamp = Math.floor(firstOfMonth.getTime() / 1000);

    // Count check-ins this month
    const smokesResult = await db.prepare(`
      SELECT COUNT(*) as count FROM checkins 
      WHERE user_id = ? AND created_at >= ?
    `).bind(session.user_id, startTimestamp).first<{ count: number }>();

    // Count unique days with check-ins this month
    const daysResult = await db.prepare(`
      SELECT COUNT(DISTINCT date(created_at, 'unixepoch')) as days FROM checkins 
      WHERE user_id = ? AND created_at >= ?
    `).bind(session.user_id, startTimestamp).first<{ days: number }>();

    return NextResponse.json({
      smokesThisMonth: smokesResult?.count || 0,
      daysActive: daysResult?.days || 0
    });

  } catch (error) {
    console.error("My month stats error:", error);
    return NextResponse.json({ smokesThisMonth: 0, daysActive: 0 });
  }
}
