import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface MissedBrand {
  brand: string;
  lastSmokedAt: number;
  daysSince: number;
  totalSmokes: number;
  avgRating: number | null;
  bestRating: number | null;
  lastProduct: string | null;
  lastImageUrl: string | null;
}

interface BrandReunionResponse {
  missedBrands: MissedBrand[];
  stats: {
    totalBrands: number;
    oldestMiss: string | null;
    longestAway: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user from session
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = session.user_id;
    const now = Math.floor(Date.now() / 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60); // 7 days ago
    
    // Get all brands the user has smoked, ordered by last smoke date
    // Only include brands not smoked in the last week
    const brands = await db
      .prepare(`
        SELECT 
          brand,
          MAX(created_at) as last_smoked_at,
          COUNT(*) as total_smokes,
          AVG(CAST(rating AS REAL)) as avg_rating,
          MAX(rating) as best_rating
        FROM checkins 
        WHERE user_id = ?
        GROUP BY brand
        HAVING MAX(created_at) < ?
        ORDER BY last_smoked_at ASC
        LIMIT 20
      `)
      .bind(userId, oneWeekAgo)
      .all<{
        brand: string;
        last_smoked_at: number;
        total_smokes: number;
        avg_rating: number | null;
        best_rating: number | null;
      }>();

    // Get the last checkin details for each brand
    const missedBrands: MissedBrand[] = [];
    
    for (const brand of brands.results || []) {
      // Get the most recent checkin for this brand
      const lastCheckin = await db
        .prepare(`
          SELECT product, image_url 
          FROM checkins 
          WHERE user_id = ? AND brand = ?
          ORDER BY created_at DESC 
          LIMIT 1
        `)
        .bind(userId, brand.brand)
        .first<{ product: string | null; image_url: string | null }>();

      const daysSince = Math.floor((now - brand.last_smoked_at) / (24 * 60 * 60));
      
      missedBrands.push({
        brand: brand.brand,
        lastSmokedAt: brand.last_smoked_at,
        daysSince,
        totalSmokes: brand.total_smokes,
        avgRating: brand.avg_rating ? Math.round(brand.avg_rating * 10) / 10 : null,
        bestRating: brand.best_rating,
        lastProduct: lastCheckin?.product || null,
        lastImageUrl: lastCheckin?.image_url || null,
      });
    }

    // Sort by days since (longest first)
    missedBrands.sort((a, b) => b.daysSince - a.daysSince);

    // Calculate stats
    const totalBrandsResult = await db
      .prepare("SELECT COUNT(DISTINCT brand) as count FROM checkins WHERE user_id = ?")
      .bind(userId)
      .first<{ count: number }>();

    const stats = {
      totalBrands: totalBrandsResult?.count || 0,
      oldestMiss: missedBrands.length > 0 ? missedBrands[0].brand : null,
      longestAway: missedBrands.length > 0 ? missedBrands[0].daysSince : 0,
    };

    return NextResponse.json({
      missedBrands,
      stats,
    } as BrandReunionResponse);

  } catch (error) {
    console.error("Brand reunion error:", error);
    return NextResponse.json({ error: "Failed to load brand reunion" }, { status: 500 });
  }
}
