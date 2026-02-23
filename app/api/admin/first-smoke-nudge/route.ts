import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/admin/first-smoke-nudge - Nudge users who signed up but never logged a smoke
// Targets users with 0 check-ins who haven't been nudged in 3 days
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { env } = getRequestContext();
  const db = env.DB;

  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get("key");
  if (adminKey !== "puffed-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const sixHoursAgo = now - (6 * 60 * 60); // Account must be 6h old
    const threeDaysAgo = now - (3 * 24 * 60 * 60); // Nudge cooldown

    // Find users who:
    // 1. Created account more than 6 hours ago
    // 2. Have 0 check-ins
    // 3. Haven't received a first-smoke-nudge in the last 3 days
    // 4. Not admin accounts
    const eligibleUsers = await db.prepare(`
      SELECT u.id, u.username, u.created_at
      FROM users u
      WHERE 
        u.created_at < ?
        AND u.username NOT LIKE 'puffed%'
        AND (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) = 0
        AND NOT EXISTS (
          SELECT 1 FROM notifications 
          WHERE user_id = u.id AND type = 'first-smoke-nudge' AND created_at >= ?
        )
      ORDER BY u.created_at DESC
    `).bind(sixHoursAgo, threeDaysAgo).all<{ id: string; username: string; created_at: number }>();

    const users = eligibleUsers.results || [];
    
    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No users need first-smoke nudge",
        sent: 0
      });
    }

    // Variety of encouraging messages
    const messages = [
      "🚬 Ready to log your first smoke? It only takes 10 seconds! →",
      "👋 We noticed you haven't logged a smoke yet — let's fix that! →",
      "⚡ Quick! Log your first smoke and start your journey →",
      "🔥 Your smoke log is looking empty! Time to change that →",
      "💨 What are you smoking? Log it and earn your First Smoke badge! →",
      "🏆 Log your first smoke to unlock badges and join the community →"
    ];

    let sent = 0;

    for (const user of users) {
      const message = messages[Math.floor(Math.random() * messages.length)];
      const notifId = crypto.randomUUID();
      
      await db.prepare(`
        INSERT INTO notifications (id, user_id, type, from_user_id, message, created_at)
        VALUES (?, ?, 'first-smoke-nudge', ?, ?, ?)
      `).bind(
        notifId, 
        user.id,
        user.id, // from_user_id = self for system notifications
        message,
        now
      ).run();
      
      sent++;
    }

    return NextResponse.json({
      success: true,
      message: `Sent first-smoke nudge to ${sent} users`,
      sent,
      users: users.map(u => ({ username: u.username, signedUpAt: new Date(u.created_at * 1000).toISOString() }))
    });
  } catch (error) {
    console.error("First smoke nudge error:", error);
    return NextResponse.json({ error: "Nudge failed", details: String(error) }, { status: 500 });
  }
}

// GET - Check eligible users without sending
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { env } = getRequestContext();
  const db = env.DB;

  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get("key");
  if (adminKey !== "puffed-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const sixHoursAgo = now - (6 * 60 * 60);
    const threeDaysAgo = now - (3 * 24 * 60 * 60);

    const eligibleUsers = await db.prepare(`
      SELECT u.id, u.username, u.created_at,
        (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) as checkin_count
      FROM users u
      WHERE 
        u.created_at < ?
        AND u.username NOT LIKE 'puffed%'
        AND (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) = 0
        AND NOT EXISTS (
          SELECT 1 FROM notifications 
          WHERE user_id = u.id AND type = 'first-smoke-nudge' AND created_at >= ?
        )
      ORDER BY u.created_at DESC
    `).bind(sixHoursAgo, threeDaysAgo).all<{ id: string; username: string; created_at: number; checkin_count: number }>();

    return NextResponse.json({
      eligibleCount: eligibleUsers.results?.length || 0,
      users: (eligibleUsers.results || []).map(u => ({
        username: u.username,
        signedUpAt: new Date(u.created_at * 1000).toISOString(),
        checkinCount: u.checkin_count
      }))
    });
  } catch (error) {
    console.error("Check first-smoke nudge error:", error);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}
