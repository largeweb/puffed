import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface FollowingUser {
  username: string;
  bio: string | null;
  checkin_count: number;
  is_following: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const { env } = getRequestContext();
    const db = env.DB;

    // Get current user if logged in
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);
    let currentUserId: string | null = null;

    if (sessionId) {
      const now = Math.floor(Date.now() / 1000);
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
        .bind(sessionId, now)
        .first<{ user_id: string }>();
      if (session) {
        currentUserId = session.user_id;
      }
    }

    // Get the target user
    const user = await db
      .prepare("SELECT id, username FROM users WHERE username = ?")
      .bind(username.toLowerCase())
      .first<{ id: string; username: string }>();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get users that this user follows, with their stats and whether current user follows them
    const following = await db
      .prepare(`
        SELECT 
          u.username,
          u.bio,
          (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) as checkin_count,
          CASE WHEN f2.id IS NOT NULL THEN 1 ELSE 0 END as is_following
        FROM follows f
        JOIN users u ON f.following_id = u.id
        LEFT JOIN follows f2 ON f2.follower_id = ? AND f2.following_id = u.id
        WHERE f.follower_id = ?
        ORDER BY f.created_at DESC
        LIMIT 100
      `)
      .bind(currentUserId || "", user.id)
      .all<FollowingUser>();

    return NextResponse.json({
      username: user.username,
      following: following.results.map((f) => ({
        ...f,
        is_following: Boolean(f.is_following),
      })),
      count: following.results.length,
    });
  } catch (error) {
    console.error("Following error:", error);
    return NextResponse.json({ error: "Failed to load following" }, { status: 500 });
  }
}
