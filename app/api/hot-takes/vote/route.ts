import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

// POST /api/hot-takes/vote - Vote on a hot take
export async function POST(request: NextRequest) {
  const { env } = getRequestContext();
  const db = env.DB;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = await db.prepare(
    "SELECT user_id FROM sessions WHERE id = ?"
  ).bind(sessionId).first<{ user_id: string }>();

  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  try {
    const body = await request.json() as { takeId?: string; vote?: number };
    const { takeId, vote } = body;

    if (!takeId) {
      return NextResponse.json({ error: "Take ID required" }, { status: 400 });
    }

    // vote: 1 = upvote, -1 = downvote, 0 = remove vote
    if (vote !== 1 && vote !== -1 && vote !== 0) {
      return NextResponse.json({ error: "Invalid vote value" }, { status: 400 });
    }

    // Check take exists
    const take = await db.prepare(
      "SELECT id, user_id FROM hot_takes WHERE id = ?"
    ).bind(takeId).first<{ id: string; user_id: string }>();

    if (!take) {
      return NextResponse.json({ error: "Hot take not found" }, { status: 404 });
    }

    // Can't vote on your own take
    if (take.user_id === session.user_id) {
      return NextResponse.json({ error: "Can't vote on your own hot take!" }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);

    if (vote === 0) {
      // Remove existing vote
      await db.prepare(`
        DELETE FROM hot_take_votes WHERE take_id = ? AND user_id = ?
      `).bind(takeId, session.user_id).run();
    } else {
      // Upsert vote
      await db.prepare(`
        INSERT INTO hot_take_votes (id, take_id, user_id, vote, created_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(take_id, user_id) DO UPDATE SET vote = ?, created_at = ?
      `).bind(
        crypto.randomUUID(),
        takeId,
        session.user_id,
        vote,
        now,
        vote,
        now
      ).run();
    }

    // Get updated counts
    const counts = await db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END), 0) as upvotes,
        COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END), 0) as downvotes
      FROM hot_take_votes
      WHERE take_id = ?
    `).bind(takeId).first<{ upvotes: number; downvotes: number }>();

    return NextResponse.json({ 
      success: true,
      upvotes: counts?.upvotes || 0,
      downvotes: counts?.downvotes || 0,
      userVote: vote
    });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
