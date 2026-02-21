import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import type { NotificationsResponse, NotificationCountResponse } from "@/lib/types";

export const runtime = "edge";

async function getSession(db: D1Database, sessionId: string) {
  const session = await db.prepare(
    "SELECT user_id FROM sessions WHERE id = ? AND expires_at > unixepoch()"
  ).bind(sessionId).first<{ user_id: string }>();
  return session;
}

// GET /api/notifications - Get user's notifications
export async function GET(request: NextRequest): Promise<NextResponse<NotificationsResponse | NotificationCountResponse>> {
  const { env } = getRequestContext();
  const db = env.DB;

  const sessionId = request.cookies.get("session")?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = await getSession(db, sessionId);
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const countOnly = searchParams.get("countOnly") === "true";

  if (countOnly) {
    // Just return unread count
    const result = await db.prepare(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0"
    ).bind(session.user_id).first<{ count: number }>();
    
    return NextResponse.json({ unread_count: result?.count || 0 });
  }

  // Get notifications with user info and checkin/comment details
  const notifications = await db.prepare(`
    SELECT 
      n.id,
      n.user_id,
      n.type,
      n.from_user_id,
      u.username as from_username,
      n.checkin_id,
      c.brand as checkin_brand,
      n.comment_id,
      cm.text as comment_text,
      n.read,
      n.created_at
    FROM notifications n
    JOIN users u ON n.from_user_id = u.id
    LEFT JOIN checkins c ON n.checkin_id = c.id
    LEFT JOIN comments cm ON n.comment_id = cm.id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `).bind(session.user_id).all<{
    id: string;
    user_id: string;
    type: string;
    from_user_id: string;
    from_username: string;
    checkin_id: string | null;
    checkin_brand: string | null;
    comment_id: string | null;
    comment_text: string | null;
    read: number;
    created_at: number;
  }>();

  const unreadResult = await db.prepare(
    "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0"
  ).bind(session.user_id).first<{ count: number }>();

  return NextResponse.json({
    notifications: notifications.results?.map(n => ({
      ...n,
      read: n.read === 1,
    })) || [],
    unread_count: unreadResult?.count || 0,
  });
}

// POST /api/notifications - Mark notifications as read
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { env } = getRequestContext();
  const db = env.DB;

  const sessionId = request.cookies.get("session")?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = await getSession(db, sessionId);
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const body = await request.json() as { notificationId?: string; markAllRead?: boolean };

  if (body.markAllRead) {
    // Mark all as read
    await db.prepare(
      "UPDATE notifications SET read = 1 WHERE user_id = ?"
    ).bind(session.user_id).run();
  } else if (body.notificationId) {
    // Mark specific notification as read
    await db.prepare(
      "UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?"
    ).bind(body.notificationId, session.user_id).run();
  }

  return NextResponse.json({ success: true });
}
