import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

export const runtime = "edge";

interface SearchResult {
  type: 'user' | 'cigar';
  // User fields
  username?: string;
  bio?: string;
  checkin_count?: number;
  follower_count?: number;
  is_following?: boolean;
  // Cigar fields
  brand?: string;
  product?: string;
  avg_rating?: number;
  total_checkins?: number;
  last_checkin_image?: string;
}

interface SearchResponse {
  results?: SearchResult[];
  users?: SearchResult[];
  cigars?: SearchResult[];
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();
    const type = url.searchParams.get("type") || "all"; // all, users, cigars

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [], users: [], cigars: [] });
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

    const searchTerm = `%${query}%`;
    const response: SearchResponse = { users: [], cigars: [] };

    // Search users
    if (type === "all" || type === "users") {
      let usersQuery: string;
      let usersResult: any;

      if (currentUserId) {
        usersQuery = `
          SELECT 
            u.username,
            u.bio,
            (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) as checkin_count,
            (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count,
            EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id) as is_following
          FROM users u
          WHERE u.username LIKE ?
          ORDER BY checkin_count DESC
          LIMIT 10
        `;
        usersResult = await db.prepare(usersQuery).bind(currentUserId, searchTerm).all();
      } else {
        usersQuery = `
          SELECT 
            u.username,
            u.bio,
            (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) as checkin_count,
            (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count
          FROM users u
          WHERE u.username LIKE ?
          ORDER BY checkin_count DESC
          LIMIT 10
        `;
        usersResult = await db.prepare(usersQuery).bind(searchTerm).all();
      }

      response.users = (usersResult.results || []).map((row: any) => ({
        type: 'user' as const,
        username: row.username,
        bio: row.bio,
        checkin_count: row.checkin_count,
        follower_count: row.follower_count,
        is_following: currentUserId ? Boolean(row.is_following) : false
      }));
    }

    // Search cigars (unique brand + product combinations)
    if (type === "all" || type === "cigars") {
      const cigarsQuery = `
        SELECT 
          brand,
          product,
          AVG(rating) as avg_rating,
          COUNT(*) as total_checkins,
          (SELECT image_url FROM checkins c2 
           WHERE c2.brand = c.brand AND (c2.product = c.product OR (c2.product IS NULL AND c.product IS NULL))
           AND c2.image_url IS NOT NULL
           ORDER BY c2.created_at DESC LIMIT 1) as last_checkin_image
        FROM checkins c
        WHERE brand LIKE ? OR product LIKE ?
        GROUP BY brand, COALESCE(product, '')
        ORDER BY total_checkins DESC, avg_rating DESC
        LIMIT 20
      `;
      
      const cigarsResult = await db.prepare(cigarsQuery).bind(searchTerm, searchTerm).all();

      response.cigars = (cigarsResult.results || []).map((row: any) => ({
        type: 'cigar' as const,
        brand: row.brand,
        product: row.product,
        avg_rating: row.avg_rating ? Math.round(row.avg_rating * 10) / 10 : undefined,
        total_checkins: row.total_checkins,
        last_checkin_image: row.last_checkin_image
      }));
    }

    // Combined results for "all" type
    response.results = [...(response.users || []), ...(response.cigars || [])];

    return NextResponse.json(response);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
