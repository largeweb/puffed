import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/admin/daily-digest - Send daily digest notifications to all users
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { env } = getRequestContext();
  const db = env.DB;

  // Simple admin auth via query param
  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get("key");
  if (adminKey !== "puffed-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get yesterday's date boundaries (UTC)
    const now = Math.floor(Date.now() / 1000);
    const todayStart = now - (now % 86400);
    const yesterdayStart = todayStart - 86400;

    // Get yesterday's stats
    const yesterdayStats = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE created_at >= ? AND created_at < ?) as new_users,
        (SELECT COUNT(*) FROM checkins WHERE created_at >= ? AND created_at < ?) as new_checkins,
        (SELECT COUNT(*) FROM likes WHERE created_at >= ? AND created_at < ?) as new_likes,
        (SELECT COUNT(*) FROM follows WHERE created_at >= ? AND created_at < ?) as new_follows,
        (SELECT COUNT(*) FROM comments WHERE created_at >= ? AND created_at < ?) as new_comments,
        (SELECT COUNT(*) FROM reactions WHERE created_at >= ? AND created_at < ?) as new_reactions
    `).bind(
      yesterdayStart, todayStart,
      yesterdayStart, todayStart,
      yesterdayStart, todayStart,
      yesterdayStart, todayStart,
      yesterdayStart, todayStart,
      yesterdayStart, todayStart
    ).first();

    // Don't send digest if nothing happened
    const totalActivity = 
      ((yesterdayStats?.new_users as number) || 0) +
      ((yesterdayStats?.new_checkins as number) || 0) +
      ((yesterdayStats?.new_likes as number) || 0) +
      ((yesterdayStats?.new_follows as number) || 0) +
      ((yesterdayStats?.new_comments as number) || 0) +
      ((yesterdayStats?.new_reactions as number) || 0);

    if (totalActivity === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No activity yesterday, skipping digest",
        sent: 0
      });
    }

    // Build digest message
    const parts = [];
    const checkins = (yesterdayStats?.new_checkins as number) || 0;
    const users = (yesterdayStats?.new_users as number) || 0;
    const engagement = 
      ((yesterdayStats?.new_likes as number) || 0) +
      ((yesterdayStats?.new_comments as number) || 0) +
      ((yesterdayStats?.new_reactions as number) || 0);

    if (checkins > 0) parts.push(`${checkins} smoke${checkins > 1 ? 's' : ''} logged`);
    if (users > 0) parts.push(`${users} new member${users > 1 ? 's' : ''} joined`);
    if (engagement > 0) parts.push(`${engagement} interaction${engagement > 1 ? 's' : ''}`);

    // Get all users
    const allUsers = await db.prepare("SELECT id FROM users").all<{ id: string }>();
    const userIds = allUsers.results || [];

    let sent = 0;
    for (const user of userIds) {
      // Check if user already has a digest notification from today
      // (to avoid duplicates if cron runs multiple times)
      const existing = await db.prepare(`
        SELECT 1 FROM notifications 
        WHERE user_id = ? AND type = 'digest' AND created_at >= ?
      `).bind(user.id, todayStart).first();

      if (!existing) {
        const notifId = crypto.randomUUID();
        await db.prepare(`
          INSERT INTO notifications (id, user_id, type, from_user_id, message, created_at)
          VALUES (?, ?, 'digest', ?, ?, ?)
        `).bind(notifId, user.id, user.id, parts.join(' • '), Math.floor(Date.now() / 1000)).run();
        sent++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sent daily digest to ${sent} users`,
      stats: yesterdayStats,
      digestContent: parts.join(' • ')
    });
  } catch (error) {
    console.error("Daily digest error:", error);
    return NextResponse.json({ error: "Daily digest failed" }, { status: 500 });
  }
}
