import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface FeedCheckin {
  id: string;
  user_id: string;
  brand: string;
  product: string | null;
  rating: number | null;
  review: string | null;
  flavor_notes: string | null;
  image_url: string | null;
  category: string;
  created_at: number;
  username: string;
  like_count: number;
  comment_count: number;
  liked_by_me: number;
}

interface FollowingFeedResponse {
  checkins: FeedCheckin[];
  followingCount: number;
  hasMore: boolean;
}

export type { FollowingFeedResponse, FeedCheckin };

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = env.DB;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;

  if (!sessionId) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const session = await db
    .prepare("SELECT user_id FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ user_id: string }>();

  if (!session) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 401 }
    );
  }

  const userId = session.user_id;
  
  // Get query params
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = parseInt(searchParams.get("offset") || "0");

  // Get count of who user follows
  const followingRow = await db
    .prepare("SELECT COUNT(*) as count FROM follows WHERE follower_id = ?")
    .bind(userId)
    .first<{ count: number }>();
  
  const followingCount = followingRow?.count || 0;

  // Get check-ins from followed users
  const checkinsResult = await db.prepare(`
    SELECT 
      c.id,
      c.user_id,
      c.brand,
      c.product,
      c.rating,
      c.review,
      c.flavor_notes,
      c.image_url,
      c.category,
      c.created_at,
      u.username,
      (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) as comment_count,
      (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id AND user_id = ?) as liked_by_me
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.user_id IN (SELECT followed_id FROM follows WHERE follower_id = ?)
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(userId, userId, limit + 1, offset).all<FeedCheckin>();

  const checkins = checkinsResult.results || [];
  const hasMore = checkins.length > limit;
  
  if (hasMore) {
    checkins.pop(); // Remove extra item used for hasMore check
  }

  const response: FollowingFeedResponse = {
    checkins,
    followingCount,
    hasMore
  };

  return NextResponse.json(response);
}
