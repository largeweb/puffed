import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export interface HotConversation {
  checkin_id: string;
  brand: string;
  product: string | null;
  rating: number | null;
  image_url: string | null;
  checkin_username: string;
  comment_count: number;
  like_count: number;
  reaction_count: number;
  latest_comment: string;
  latest_comment_username: string;
  latest_comment_at: number;
  created_at: number;
}

export interface HotConversationsResponse {
  conversations: HotConversation[];
  error?: string;
}

// GET /api/hot-conversations - Find check-ins with active discussions
export async function GET(request: NextRequest): Promise<NextResponse<HotConversationsResponse>> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const hoursBack = Math.min(parseInt(searchParams.get("hours") || "72"), 168); // Max 1 week

    const cutoffTime = Math.floor(Date.now() / 1000) - (hoursBack * 3600);

    // Find check-ins with the most recent comment activity
    // Prioritize: recent comments, multiple commenters, high engagement
    const result = await db.prepare(`
      WITH comment_stats AS (
        SELECT 
          checkin_id,
          COUNT(*) as comment_count,
          COUNT(DISTINCT user_id) as unique_commenters,
          MAX(created_at) as latest_comment_at
        FROM comments
        WHERE created_at >= ?
        GROUP BY checkin_id
        HAVING comment_count >= 1
      ),
      latest_comments AS (
        SELECT 
          c.checkin_id,
          c.text as latest_comment,
          u.username as latest_comment_username,
          c.created_at,
          ROW_NUMBER() OVER (PARTITION BY c.checkin_id ORDER BY c.created_at DESC) as rn
        FROM comments c
        JOIN users u ON c.user_id = u.id
      )
      SELECT 
        ch.id as checkin_id,
        ch.brand,
        ch.product,
        ch.rating,
        ch.image_url,
        ch.created_at,
        u.username as checkin_username,
        cs.comment_count,
        (SELECT COUNT(*) FROM likes WHERE checkin_id = ch.id) as like_count,
        (SELECT COUNT(*) FROM reactions WHERE checkin_id = ch.id) as reaction_count,
        lc.latest_comment,
        lc.latest_comment_username,
        cs.latest_comment_at
      FROM comment_stats cs
      JOIN checkins ch ON ch.id = cs.checkin_id
      JOIN users u ON ch.user_id = u.id
      LEFT JOIN latest_comments lc ON lc.checkin_id = ch.id AND lc.rn = 1
      ORDER BY cs.latest_comment_at DESC, cs.comment_count DESC
      LIMIT ?
    `).bind(cutoffTime, limit).all<HotConversation>();

    return NextResponse.json({
      conversations: result.results || []
    });
  } catch (error) {
    console.error("Hot conversations error:", error);
    return NextResponse.json({ conversations: [], error: "Failed to load conversations" });
  }
}
