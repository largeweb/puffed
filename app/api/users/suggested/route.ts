import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface SuggestedUser {
  username: string;
  bio: string | null;
  checkin_count: number;
  follower_count: number;
  is_following: boolean;
}

// Get suggested users to follow
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    const { env } = getRequestContext();
    const db = env.DB;

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

    // Get users with their stats, excluding current user
    // Prioritize users with most check-ins (most active)
    const query = `
      SELECT 
        u.id,
        u.username,
        u.bio,
        (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) as checkin_count,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count
      FROM users u
      ${currentUserId ? `WHERE u.id != ?` : ''}
      ORDER BY checkin_count DESC, follower_count DESC
      LIMIT 10
    `;

    const stmt = currentUserId 
      ? db.prepare(query).bind(currentUserId)
      : db.prepare(query);

    const { results: users } = await stmt.all<{
      id: string;
      username: string;
      bio: string | null;
      checkin_count: number;
      follower_count: number;
    }>();

    // Check which users current user is following
    let followingSet = new Set<string>();
    if (currentUserId && users.length > 0) {
      const userIds = users.map(u => u.id);
      const placeholders = userIds.map(() => '?').join(',');
      const { results: follows } = await db
        .prepare(`SELECT following_id FROM follows WHERE follower_id = ? AND following_id IN (${placeholders})`)
        .bind(currentUserId, ...userIds)
        .all<{ following_id: string }>();
      followingSet = new Set(follows.map(f => f.following_id));
    }

    const suggested: SuggestedUser[] = users.map(u => ({
      username: u.username,
      bio: u.bio,
      checkin_count: u.checkin_count,
      follower_count: u.follower_count,
      is_following: followingSet.has(u.id),
    }));

    return NextResponse.json({ users: suggested });
  } catch (error) {
    console.error("Suggested users error:", error);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}
