import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface DrinkPairing {
  drink_id: string;
  count: number;
  percentage: number;
  avg_rating: number | null;
}

interface DrinkPairingsResponse {
  brand: string;
  total_with_pairings: number;
  pairings: DrinkPairing[];
  top_rated_pairing: DrinkPairing | null;
  error?: string;
}

// GET /api/brand/[brand]/drink-pairings - Get popular drink pairings for a brand
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brand: string }> }
): Promise<NextResponse<DrinkPairingsResponse>> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const { brand } = await params;
    
    const decodedBrand = decodeURIComponent(brand);

    // Get all check-ins with drink pairings for this brand
    const pairingsResult = await db.prepare(`
      SELECT 
        drink_pairing,
        COUNT(*) as count,
        AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating
      FROM checkins
      WHERE LOWER(brand) = LOWER(?)
        AND drink_pairing IS NOT NULL 
        AND drink_pairing != ''
      GROUP BY drink_pairing
      ORDER BY count DESC
      LIMIT 10
    `).bind(decodedBrand).all<{ drink_pairing: string; count: number; avg_rating: number | null }>();

    // Get total check-ins with pairings for percentage calculation
    const totalResult = await db.prepare(`
      SELECT COUNT(*) as total
      FROM checkins
      WHERE LOWER(brand) = LOWER(?)
        AND drink_pairing IS NOT NULL 
        AND drink_pairing != ''
    `).bind(decodedBrand).first<{ total: number }>();

    const total = totalResult?.total || 0;

    const pairings: DrinkPairing[] = (pairingsResult.results || []).map(row => ({
      drink_id: row.drink_pairing,
      count: row.count,
      percentage: total > 0 ? Math.round((row.count / total) * 100) : 0,
      avg_rating: row.avg_rating ? Math.round(row.avg_rating * 10) / 10 : null,
    }));

    // Find top-rated pairing (must have at least 1 check-in with rating)
    const topRated = pairings
      .filter(p => p.avg_rating !== null)
      .sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))[0] || null;

    return NextResponse.json({
      brand: decodedBrand,
      total_with_pairings: total,
      pairings,
      top_rated_pairing: topRated,
    });
  } catch (error) {
    console.error("Drink pairings error:", error);
    return NextResponse.json(
      { 
        brand: "",
        total_with_pairings: 0,
        pairings: [],
        top_rated_pairing: null,
        error: "Failed to fetch drink pairings" 
      },
      { status: 500 }
    );
  }
}
