import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie, generateId } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// Toggle follow on a user
export async function POST(request: NextRequest) {
  try {
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

    const { username } = (await request.json()) as { username: string };

    if (!username) {
      return NextResponse.json({ error: "username required" }, { status: 400 });
    }

    // Get target user
    const targetUser = await db
      .prepare("SELECT id FROM users WHERE username = ?")
      .bind(username.toLowerCase())
      .first<{ id: string }>();

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Can't follow yourself
    if (targetUser.id === session.user_id) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }

    // Check if already following
    const existingFollow = await db
      .prepare("SELECT id FROM follows WHERE follower_id = ? AND following_id = ?")
      .bind(session.user_id, targetUser.id)
      .first();

    if (existingFollow) {
      // Unfollow
      await db
        .prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?")
        .bind(session.user_id, targetUser.id)
        .run();
      // Remove follow notification
      await db
        .prepare("DELETE FROM notifications WHERE type = 'follow' AND from_user_id = ? AND user_id = ?")
        .bind(session.user_id, targetUser.id)
        .run();
      return NextResponse.json({ following: false });
    } else {
      // Follow
      const followId = generateId();
      await db
        .prepare("INSERT INTO follows (id, follower_id, following_id) VALUES (?, ?, ?)")
        .bind(followId, session.user_id, targetUser.id)
        .run();

      // Create notification for followed user
      const notifId = generateId();
      await db
        .prepare("INSERT INTO notifications (id, user_id, type, from_user_id) VALUES (?, ?, 'follow', ?)")
        .bind(notifId, targetUser.id, session.user_id)
        .run();

      return NextResponse.json({ following: true });
    }
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json({ error: "Failed to follow" }, { status: 500 });
  }
}

// Check if following a user
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({ following: false });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    const now = Math.floor(Date.now() / 1000);
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
      .bind(sessionId, now)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ following: false });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ error: "username required" }, { status: 400 });
    }

    const targetUser = await db
      .prepare("SELECT id FROM users WHERE username = ?")
      .bind(username.toLowerCase())
      .first<{ id: string }>();

    if (!targetUser) {
      return NextResponse.json({ following: false });
    }

    const follow = await db
      .prepare("SELECT id FROM follows WHERE follower_id = ? AND following_id = ?")
      .bind(session.user_id, targetUser.id)
      .first();

    return NextResponse.json({ following: !!follow });
  } catch (error) {
    console.error("Check follow error:", error);
    return NextResponse.json({ following: false });
  }
}
