import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { generateId, getUserFromRequest } from "@/lib/auth";

export const runtime = "edge";

/**
 * POST /api/follow-all
 * Follow all suggested users (those the current user isn't already following)
 * Returns the count of new follows created
 */
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { env } = getRequestContext();
  const db = env.DB;

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
    `).bind(user.id, user.id).all<{ id: string; username: string; checkin_count: number }>();

    let followCount = 0;

    for (const targetUser of suggestedUsers.results || []) {
      // Create the follow
      const followId = generateId();
      await db.prepare(`
        INSERT INTO follows (id, follower_id, following_id)
        VALUES (?, ?, ?)
      `).bind(followId, user.id, targetUser.id).run();

      // Notify the followed user
      const notifId = generateId();
      await db.prepare(`
        INSERT INTO notifications (id, user_id, type, from_user_id)
        VALUES (?, ?, 'follow', ?)
      `).bind(notifId, targetUser.id, user.id).run();

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
