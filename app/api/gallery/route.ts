import { NextRequest } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface GalleryItem {
  id: string;
  user_id: string;
  username: string;
  brand: string;
  product: string | null;
  rating: number | null;
  image_url: string;
  created_at: number;
  like_count: number;
  comment_count: number;
  reaction_count: number;
}

// GET /api/gallery?sort=recent|liked|top&limit=50&offset=0
export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const DB = env.DB;
  const { searchParams } = new URL(request.url);
  
  const sort = searchParams.get("sort") || "recent";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

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

  // Build query based on sort
  let orderBy = "c.created_at DESC";
  if (sort === "liked") {
    orderBy = "like_count DESC, c.created_at DESC";
  } else if (sort === "top") {
    orderBy = "(like_count + comment_count + reaction_count) DESC, c.created_at DESC";
  }

  const query = `
    SELECT 
      c.id,
      c.user_id,
      u.username,
      c.brand,
      c.product,
      c.rating,
      c.image_url,
      c.created_at,
      (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) as comment_count,
      (SELECT COUNT(*) FROM reactions WHERE checkin_id = c.id) as reaction_count
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.image_url IS NOT NULL AND c.image_url != ''
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  try {
    const result = await DB.prepare(query).bind(limit, offset).all<GalleryItem>();
    
    // Get total count for pagination
    const countResult = await DB.prepare(
      "SELECT COUNT(*) as total FROM checkins WHERE image_url IS NOT NULL AND image_url != ''"
    ).first<{ total: number }>();

    return Response.json({
      photos: result.results || [],
      total: countResult?.total || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Gallery fetch error:", error);
    return Response.json({ error: "Failed to fetch gallery" }, { status: 500 });
  }
}
