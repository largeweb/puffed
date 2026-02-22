import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface RecentBrand {
  brand: string;
  product: string | null;
  last_smoked: number;
  times_smoked: number;
  last_rating: number | null;
  last_image: string | null;
}

// Get user's recently smoked brands (unique, ordered by recency)
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const now = Math.floor(Date.now() / 1000);
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
      .bind(sessionId, now)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    // Get limit from query params (default 5)
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 10);

    // Get unique brands with stats, ordered by most recent
    const brands = await db
      .prepare(`
        WITH RankedCheckins AS (
          SELECT 
            brand,
            product,
            rating,
            image_url,
            created_at,
            ROW_NUMBER() OVER (PARTITION BY brand ORDER BY created_at DESC) as rn
          FROM checkins 
          WHERE user_id = ?
        ),
        BrandStats AS (
          SELECT 
            brand,
            COUNT(*) as times_smoked,
            MAX(created_at) as last_smoked
          FROM checkins
          WHERE user_id = ?
          GROUP BY brand
        )
        SELECT 
          r.brand,
          r.product,
          s.last_smoked,
          s.times_smoked,
          r.rating as last_rating,
          r.image_url as last_image
        FROM RankedCheckins r
        JOIN BrandStats s ON r.brand = s.brand
        WHERE r.rn = 1
        ORDER BY s.last_smoked DESC
        LIMIT ?
      `)
      .bind(session.user_id, session.user_id, limit)
      .all<RecentBrand>();

    return NextResponse.json({ 
      brands: brands.results || [],
      count: brands.results?.length || 0
    });
  } catch (error) {
    console.error("Get recent brands error:", error);
    return NextResponse.json({ error: "Failed to get recent brands" }, { status: 500 });
  }
}
