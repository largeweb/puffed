import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

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
}

export const runtime = "edge";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { env } = getRequestContext();
  const DB = env.DB;

  // Get current user if logged in
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  let currentUserId: string | null = null;

  if (session) {
    const sessionRow = await DB.prepare(
      "SELECT user_id FROM sessions WHERE id = ?"
    ).bind(session).first<{ user_id: string }>();
    currentUserId = sessionRow?.user_id || null;
  }

  // Get check-in with user info
  const checkin = await DB.prepare(`
    SELECT c.*, u.username
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).bind(id).first<CheckinRow>();

  if (!checkin) {
    return Response.json({ error: "Check-in not found" }, { status: 404 });
  }

  // Get like count and whether current user liked it
  const likeCountResult = await DB.prepare(
    "SELECT COUNT(*) as count FROM likes WHERE checkin_id = ?"
  ).bind(id).first<{ count: number }>();
  const likeCount = likeCountResult?.count || 0;

  let likedByMe = false;
  if (currentUserId) {
    const likeRow = await DB.prepare(
      "SELECT 1 FROM likes WHERE checkin_id = ? AND user_id = ?"
    ).bind(id, currentUserId).first();
    likedByMe = !!likeRow;
  }

  // Get comment count
  const commentCountResult = await DB.prepare(
    "SELECT COUNT(*) as count FROM comments WHERE checkin_id = ?"
  ).bind(id).first<{ count: number }>();
  const commentCount = commentCountResult?.count || 0;

  return Response.json({
    checkin: {
      ...checkin,
      like_count: likeCount,
      liked_by_me: likedByMe,
      comment_count: commentCount,
    },
  });
}
