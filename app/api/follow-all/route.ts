import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { generateId, parseSessionCookie } from "@/lib/auth";

export const runtime = "edge";

/**
 * POST /api/follow-all
 * Follow all suggested users (those the current user isn't already following)
 * Returns the count of new follows created
 */
export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const sessionId = parseSessionCookie(cookieHeader);

  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { env } = getRequestContext();
  const db = env.DB;

  const now = Math.floor(Date.now() / 1000);
  const session = await db
    .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
    .bind(sessionId, now)
    .first<{ user_id: string }>();

  if (!session) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const userId = session.user_id;

  try {
    // Find users to follow:
    // - Has at least 1 check-in
    // - Not the current user
    // - Not already followed
    const suggestedUsers = await db.prepare(`
      SELECT u.id, u.username, COUNT(c.id) as checkin_count
      FROM users u
      LEFT JOIN checkins c ON u.id = c.user_id
      WHERE u.id != ?
        AND u.id NOT IN (
          SELECT following_id FROM follows WHERE follower_id = ?
        )
      GROUP BY u.id
      HAVING checkin_count > 0
      ORDER BY checkin_count DESC
      LIMIT 10
    `).bind(userId, userId).all<{ id: string; username: string; checkin_count: number }>();

    let followCount = 0;

    for (const targetUser of suggestedUsers.results || []) {
      // Create the follow
      const followId = generateId();
      await db.prepare(`
        INSERT INTO follows (id, follower_id, following_id)
        VALUES (?, ?, ?)
      `).bind(followId, userId, targetUser.id).run();

      // Notify the followed user
      const notifId = generateId();
      await db.prepare(`
        INSERT INTO notifications (id, user_id, type, from_user_id)
        VALUES (?, ?, 'follow', ?)
      `).bind(notifId, targetUser.id, userId).run();

      followCount++;
    }

    return NextResponse.json({
      success: true,
      followedCount: followCount,
      message: followCount > 0 
        ? `You're now following ${followCount} new user${followCount > 1 ? 's' : ''}!`
        : "You're already following everyone active!",
    });
  } catch (error) {
    console.error("Follow all error:", error);
    return NextResponse.json({ error: "Failed to follow users" }, { status: 500 });
  }
}
