import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

interface AlsoEnjoyedBrand {
  brand: string;
  fan_count: number;  // how many fans of the source brand also smoke this
  avg_rating: number | null;
  total_checkins: number;
}

// GET /api/brand/[brand]/also-enjoyed - Get brands that fans of this brand also enjoy
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ brand: string }> }
) {
  try {
    const { brand } = await params;
    const decodedBrand = decodeURIComponent(brand);
    
    const { env } = getRequestContext();
    const DB = env.DB;

    // Find other brands that users who smoked this brand also enjoy
    // Algorithm:
    // 1. Find all users who checked in this brand
    // 2. Find other brands those users also checked in
    // 3. Rank by number of fans who also smoke that brand
    // 4. Exclude the source brand itself
    const result = await DB.prepare(`
      WITH brand_fans AS (
        SELECT DISTINCT user_id
        FROM checkins
        WHERE LOWER(brand) = LOWER(?)
      ),
      fan_other_brands AS (
        SELECT 
          c.brand,
          COUNT(DISTINCT c.user_id) as fan_count,
          AVG(CASE WHEN c.rating IS NOT NULL THEN c.rating END) as avg_rating,
          COUNT(*) as total_checkins
        FROM checkins c
        INNER JOIN brand_fans bf ON c.user_id = bf.user_id
        WHERE LOWER(c.brand) != LOWER(?)
        GROUP BY c.brand
        HAVING COUNT(DISTINCT c.user_id) >= 1
        ORDER BY fan_count DESC, avg_rating DESC
        LIMIT 5
      )
      SELECT * FROM fan_other_brands
    `).bind(decodedBrand, decodedBrand).all<AlsoEnjoyedBrand>();

    return NextResponse.json({
      brand: decodedBrand,
      alsoEnjoyed: result.results || []
    });
  } catch (error) {
    console.error("Also enjoyed error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
