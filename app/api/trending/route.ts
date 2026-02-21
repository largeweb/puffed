import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Get trending brands (most check-ins in last 7 days)
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
    
    const trendingBrands = await db
      .prepare(`
        SELECT 
          brand,
          COUNT(*) as checkin_count,
          ROUND(AVG(rating), 1) as avg_rating
        FROM checkins
        WHERE created_at > ?
        GROUP BY LOWER(brand)
        ORDER BY checkin_count DESC
        LIMIT 10
      `)
      .bind(sevenDaysAgo)
      .all();

    // Get top rated brands (all time, min 2 reviews)
    const topRated = await db
      .prepare(`
        SELECT 
          brand,
          COUNT(*) as checkin_count,
          ROUND(AVG(rating), 1) as avg_rating
        FROM checkins
        WHERE rating IS NOT NULL
        GROUP BY LOWER(brand)
        HAVING COUNT(*) >= 2
        ORDER BY avg_rating DESC
        LIMIT 10
      `)
      .all();

    // Get recent activity count
    const oneDayAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
    const recentActivity = await db
      .prepare(`
        SELECT COUNT(*) as count FROM checkins WHERE created_at > ?
      `)
      .bind(oneDayAgo)
      .first<{ count: number }>();

    return NextResponse.json({
      trending: trendingBrands.results,
      topRated: topRated.results,
      recentCheckins24h: recentActivity?.count || 0,
    });
  } catch (error) {
    console.error("Trending error:", error);
    return NextResponse.json({ error: "Failed to load trending" }, { status: 500 });
  }
}
