import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

interface RatingCount {
  rating: number;
  count: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brand: string }> }
) {
  try {
    const { brand } = await params;
    const decodedBrand = decodeURIComponent(brand);
    
    const { env } = getRequestContext();
    const DB = env.DB;

    // Get rating distribution for this brand
    const result = await DB.prepare(`
      SELECT 
        rating,
        COUNT(*) as count
      FROM checkins
      WHERE LOWER(brand) = LOWER(?)
        AND rating IS NOT NULL
      GROUP BY rating
      ORDER BY rating DESC
    `).bind(decodedBrand).all<RatingCount>();

    // Build full distribution (1-5 stars, defaulting to 0)
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRated = 0;
    
    for (const row of result.results) {
      if (row.rating >= 1 && row.rating <= 5) {
        distribution[row.rating] = row.count;
        totalRated += row.count;
      }
    }

    // Calculate percentages and find the max for bar scaling
    const maxCount = Math.max(...Object.values(distribution), 1);
    
    const ratings = [5, 4, 3, 2, 1].map(rating => ({
      rating,
      count: distribution[rating],
      percentage: totalRated > 0 ? Math.round((distribution[rating] / totalRated) * 100) : 0,
      barWidth: Math.round((distribution[rating] / maxCount) * 100),
    }));

    // Calculate sentiment breakdown
    const positive = distribution[5] + distribution[4];
    const neutral = distribution[3];
    const negative = distribution[2] + distribution[1];

    return NextResponse.json({
      brand: decodedBrand,
      ratings,
      totalRated,
      sentiment: {
        positive,
        neutral,
        negative,
        positivePercent: totalRated > 0 ? Math.round((positive / totalRated) * 100) : 0,
        neutralPercent: totalRated > 0 ? Math.round((neutral / totalRated) * 100) : 0,
        negativePercent: totalRated > 0 ? Math.round((negative / totalRated) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Rating distribution error:", error);
    return NextResponse.json({ error: "Failed to fetch rating distribution" }, { status: 500 });
  }
}
