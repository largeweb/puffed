import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie, generateId } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// Toggle like on a check-in
export async function POST(request: NextRequest) {
  try {
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

    const { checkinId } = (await request.json()) as { checkinId: string };

    if (!checkinId) {
      return NextResponse.json({ error: "checkinId required" }, { status: 400 });
    }

    // Check if already liked
    const existingLike = await db
      .prepare("SELECT id FROM likes WHERE user_id = ? AND checkin_id = ?")
      .bind(session.user_id, checkinId)
      .first();

    if (existingLike) {
      // Unlike
      await db
        .prepare("DELETE FROM likes WHERE user_id = ? AND checkin_id = ?")
        .bind(session.user_id, checkinId)
        .run();
      // Also remove the notification
      await db
        .prepare("DELETE FROM notifications WHERE type = 'like' AND from_user_id = ? AND checkin_id = ?")
        .bind(session.user_id, checkinId)
        .run();
      return NextResponse.json({ liked: false });
    } else {
      // Like
      const likeId = generateId();
      await db
        .prepare("INSERT INTO likes (id, user_id, checkin_id) VALUES (?, ?, ?)")
        .bind(likeId, session.user_id, checkinId)
        .run();

      // Create notification for checkin owner (if not liking own checkin)
      const checkin = await db
        .prepare("SELECT user_id FROM checkins WHERE id = ?")
        .bind(checkinId)
        .first<{ user_id: string }>();

      if (checkin && checkin.user_id !== session.user_id) {
        const notifId = generateId();
        await db
          .prepare("INSERT INTO notifications (id, user_id, type, from_user_id, checkin_id) VALUES (?, ?, 'like', ?, ?)")
          .bind(notifId, checkin.user_id, session.user_id, checkinId)
          .run();
      }

      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error("Like error:", error);
    return NextResponse.json({ error: "Failed to like" }, { status: 500 });
  }
}
