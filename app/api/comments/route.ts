import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";
import type { CommentRequest, Comment } from "@/lib/types";

export const runtime = "edge";

// Get comments for a check-in
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const { searchParams } = new URL(request.url);
    const checkinId = searchParams.get("checkinId");

    if (!checkinId) {
      return NextResponse.json({ error: "checkinId required" }, { status: 400 });
    }

    const comments = await db
      .prepare(`
        SELECT c.*, u.username
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.checkin_id = ?
        ORDER BY c.created_at ASC
      `)
      .bind(checkinId)
      .all<Comment>();

    return NextResponse.json({ comments: comments.results });
  } catch (error) {
    console.error("Get comments error:", error);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

// Post a new comment
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

    const body: CommentRequest = await request.json();
    const { checkinId, text } = body;

    if (!checkinId || !text?.trim()) {
      return NextResponse.json({ error: "checkinId and text required" }, { status: 400 });
    }

    // Verify check-in exists
    const checkin = await db
      .prepare("SELECT id FROM checkins WHERE id = ?")
      .bind(checkinId)
      .first();

    if (!checkin) {
      return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
    }

    const commentId = crypto.randomUUID();

    await db
      .prepare(`
        INSERT INTO comments (id, checkin_id, user_id, text)
        VALUES (?, ?, ?, ?)
      `)
      .bind(commentId, checkinId, session.user_id, text.trim())
      .run();

    // Get the created comment with username
    const comment = await db
      .prepare(`
        SELECT c.*, u.username
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `)
      .bind(commentId)
      .first<Comment>();

    return NextResponse.json({ comment });
  } catch (error) {
    console.error("Post comment error:", error);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}

// Delete a comment (only own comments)
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("id");

    if (!commentId) {
      return NextResponse.json({ error: "Comment id required" }, { status: 400 });
    }

    // Only delete own comments
    const result = await db
      .prepare("DELETE FROM comments WHERE id = ? AND user_id = ?")
      .bind(commentId, session.user_id)
      .run();

    if (result.meta.changes === 0) {
      return NextResponse.json({ error: "Comment not found or not yours" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete comment error:", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
