import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// Get feed from users you follow
export async function GET(request: NextRequest) {
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
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get check-ins from users you follow + your own
    const checkins = await db
      .prepare(`
        SELECT c.*, u.username,
          (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count,
          EXISTS(SELECT 1 FROM likes WHERE checkin_id = c.id AND user_id = ?) as liked_by_me
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE c.user_id IN (
          SELECT following_id FROM follows WHERE follower_id = ?
          UNION
          SELECT ?
        )
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(session.user_id, session.user_id, session.user_id, limit, offset)
      .all();

    // Get follow stats
    const followStats = await db
      .prepare(`
        SELECT 
          (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following,
          (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followers
      `)
      .bind(session.user_id, session.user_id)
      .first<{ following: number; followers: number }>();

    return NextResponse.json({ 
      checkins: checkins.results,
      stats: {
        following: followStats?.following || 0,
        followers: followStats?.followers || 0,
      }
    });
  } catch (error) {
    console.error("Feed error:", error);
    return NextResponse.json({ error: "Failed to load feed" }, { status: 500 });
  }
}
