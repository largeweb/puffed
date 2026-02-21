import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";
import { FLAVOR_TAGS } from "@/lib/flavors";

export const runtime = "edge";

interface CheckinRow {
  id: string;
  user_id: string;
  brand: string;
  product: string | null;
  rating: number | null;
  review: string | null;
  flavor_notes: string | null;
  draw_rating: number | null;
  burn_rating: number | null;
  aroma_rating: number | null;
  smoke_time_mins: number | null;
  image_url: string | null;
  created_at: number;
  username: string;
  like_count: number;
  comment_count: number;
  liked_by_me: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const { id: flavorId } = await params;

    // Validate flavor ID
    const flavor = FLAVOR_TAGS.find(f => f.id === flavorId);
    if (!flavor) {
      return NextResponse.json(
        { error: "Invalid flavor" },
        { status: 400 }
      );
    }

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

    // Search for check-ins containing this flavor
    // flavor_notes is stored as JSON array like '["coffee","leather"]'
    const searchPattern = `%"${flavorId}"%`;

    const query = `
      SELECT 
        c.id, c.user_id, c.brand, c.product, c.rating, c.review,
        c.flavor_notes, c.draw_rating, c.burn_rating, c.aroma_rating,
        c.smoke_time_mins, c.image_url, c.created_at,
        u.username,
        (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) as comment_count
        ${currentUserId ? ", EXISTS(SELECT 1 FROM likes WHERE checkin_id = c.id AND user_id = ?) as liked_by_me" : ", 0 as liked_by_me"}
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.flavor_notes LIKE ?
      ORDER BY c.created_at DESC
      LIMIT 50
    `;

    const result = currentUserId
      ? await db.prepare(query).bind(currentUserId, searchPattern).all<CheckinRow>()
      : await db.prepare(query).bind(searchPattern).all<CheckinRow>();

    const checkins = (result.results || []).map(row => ({
      id: row.id,
      user_id: row.user_id,
      brand: row.brand,
      product: row.product,
      rating: row.rating,
      review: row.review,
      flavor_notes: row.flavor_notes,
      draw_rating: row.draw_rating,
      burn_rating: row.burn_rating,
      aroma_rating: row.aroma_rating,
      smoke_time_mins: row.smoke_time_mins,
      image_url: row.image_url,
      created_at: row.created_at,
      username: row.username,
      like_count: row.like_count,
      comment_count: row.comment_count,
      liked_by_me: Boolean(row.liked_by_me),
    }));

    return NextResponse.json({
      flavor,
      checkins,
      total: checkins.length,
    });
  } catch (error) {
    console.error("Flavor search error:", error);
    return NextResponse.json(
      { error: "Failed to search by flavor" },
      { status: 500 }
    );
  }
}
