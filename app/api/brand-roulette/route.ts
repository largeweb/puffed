import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface BrandOption {
  brand: string;
  source: 'personal' | 'trending' | 'community';
  userRating?: number;
  avgRating?: number;
  checkinCount?: number;
}

/**
 * Brand Roulette - Get random brand suggestions for indecisive smokers
 * Returns a mix of personal favorites, trending brands, and community picks
 */
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    const { env } = getRequestContext();
    const db = env.DB;

    let userId: string | null = null;

    // Get user if authenticated
    if (sessionId) {
      const now = Math.floor(Date.now() / 1000);
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
        .bind(sessionId, now)
        .first<{ user_id: string }>();
      
      if (session) {
        userId = session.user_id;
      }
    }

    const brands: BrandOption[] = [];

    // Get user's personal brands (if logged in)
    if (userId) {
      const personalBrands = await db
        .prepare(`
          SELECT 
            brand,
            AVG(rating) as avg_rating,
            COUNT(*) as count
          FROM checkins 
          WHERE user_id = ?
          GROUP BY LOWER(brand)
          ORDER BY count DESC, avg_rating DESC
          LIMIT 10
        `)
        .bind(userId)
        .all<{ brand: string; avg_rating: number; count: number }>();

      for (const b of personalBrands.results || []) {
        brands.push({
          brand: b.brand,
          source: 'personal',
          userRating: Math.round(b.avg_rating * 10) / 10,
          checkinCount: b.count,
        });
      }
    }

    // Get trending brands (most logged this week)
    const weekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
    const trendingBrands = await db
      .prepare(`
        SELECT 
          brand,
          AVG(rating) as avg_rating,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_smokers
        FROM checkins 
        WHERE created_at > ?
        GROUP BY LOWER(brand)
        ORDER BY count DESC
        LIMIT 8
      `)
      .bind(weekAgo)
      .all<{ brand: string; avg_rating: number; count: number; unique_smokers: number }>();

    for (const b of trendingBrands.results || []) {
      // Avoid duplicates from personal brands
      if (!brands.find(existing => existing.brand.toLowerCase() === b.brand.toLowerCase())) {
        brands.push({
          brand: b.brand,
          source: 'trending',
          avgRating: Math.round(b.avg_rating * 10) / 10,
          checkinCount: b.count,
        });
      }
    }

    // Get community favorites (all-time top rated with min 2 check-ins)
    const communityBrands = await db
      .prepare(`
        SELECT 
          brand,
          AVG(rating) as avg_rating,
          COUNT(*) as count
        FROM checkins 
        WHERE rating IS NOT NULL
        GROUP BY LOWER(brand)
        HAVING count >= 2
        ORDER BY avg_rating DESC, count DESC
        LIMIT 8
      `)
      .all<{ brand: string; avg_rating: number; count: number }>();

    for (const b of communityBrands.results || []) {
      // Avoid duplicates
      if (!brands.find(existing => existing.brand.toLowerCase() === b.brand.toLowerCase())) {
        brands.push({
          brand: b.brand,
          source: 'community',
          avgRating: Math.round(b.avg_rating * 10) / 10,
          checkinCount: b.count,
        });
      }
    }

    // Shuffle the brands for randomness
    const shuffled = brands.sort(() => Math.random() - 0.5);

    // Pick a winner (random from top half for better quality)
    const winnerPool = shuffled.slice(0, Math.max(3, Math.floor(shuffled.length / 2)));
    const winner = winnerPool[Math.floor(Math.random() * winnerPool.length)] || shuffled[0];

    return NextResponse.json({
      brands: shuffled,
      winner: winner,
      totalOptions: shuffled.length,
      hasPersonalBrands: brands.some(b => b.source === 'personal'),
    });
  } catch (error) {
    console.error("Brand roulette error:", error);
    return NextResponse.json({ error: "Failed to load brand roulette" }, { status: 500 });
  }
}
