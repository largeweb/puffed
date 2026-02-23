import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface BrandChampion {
  brand: string;
  champion_username: string;
  champion_checkins: number;
  total_checkins: number;
  unique_smokers: number;
  avg_rating: number;
  five_star_count: number;
}

interface BrandLeaderboardResponse {
  champions: BrandChampion[];
  topRated: Array<{
    brand: string;
    avg_rating: number;
    total_checkins: number;
    unique_smokers: number;
  }>;
  mostPopular: Array<{
    brand: string;
    total_checkins: number;
    unique_smokers: number;
    avg_rating: number;
  }>;
  risingStars: Array<{
    brand: string;
    week_checkins: number;
    growth_pct: number;
    avg_rating: number;
  }>;
}

export async function GET(request: NextRequest): Promise<NextResponse<BrandLeaderboardResponse>> {
  const { env } = getRequestContext();
  const db = env.DB;

  const now = Math.floor(Date.now() / 1000);
  const oneWeekAgo = now - 7 * 86400;
  const twoWeeksAgo = now - 14 * 86400;

  // Get brand champions - the user who has logged each brand the most
  const championsQuery = await db.prepare(`
    WITH brand_stats AS (
      SELECT 
        brand,
        COUNT(*) as total_checkins,
        COUNT(DISTINCT user_id) as unique_smokers,
        ROUND(AVG(rating), 1) as avg_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star_count
      FROM checkins
      GROUP BY LOWER(brand)
      HAVING COUNT(*) >= 2
    ),
    user_brand_counts AS (
      SELECT 
        c.brand,
        c.user_id,
        u.username,
        COUNT(*) as user_checkins,
        ROW_NUMBER() OVER (PARTITION BY LOWER(c.brand) ORDER BY COUNT(*) DESC) as rn
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      GROUP BY LOWER(c.brand), c.user_id
    )
    SELECT 
      bs.brand,
      ubc.username as champion_username,
      ubc.user_checkins as champion_checkins,
      bs.total_checkins,
      bs.unique_smokers,
      bs.avg_rating,
      bs.five_star_count
    FROM brand_stats bs
    JOIN user_brand_counts ubc ON LOWER(bs.brand) = LOWER(ubc.brand) AND ubc.rn = 1
    ORDER BY bs.total_checkins DESC
    LIMIT 20
  `).all<BrandChampion>();

  // Top rated brands (minimum 2 check-ins for credibility)
  const topRatedQuery = await db.prepare(`
    SELECT 
      brand,
      ROUND(AVG(rating), 2) as avg_rating,
      COUNT(*) as total_checkins,
      COUNT(DISTINCT user_id) as unique_smokers
    FROM checkins
    WHERE rating IS NOT NULL
    GROUP BY LOWER(brand)
    HAVING COUNT(*) >= 2
    ORDER BY avg_rating DESC, total_checkins DESC
    LIMIT 10
  `).all<{
    brand: string;
    avg_rating: number;
    total_checkins: number;
    unique_smokers: number;
  }>();

  // Most popular brands (by check-in count)
  const mostPopularQuery = await db.prepare(`
    SELECT 
      brand,
      COUNT(*) as total_checkins,
      COUNT(DISTINCT user_id) as unique_smokers,
      ROUND(AVG(rating), 1) as avg_rating
    FROM checkins
    GROUP BY LOWER(brand)
    ORDER BY total_checkins DESC
    LIMIT 10
  `).all<{
    brand: string;
    total_checkins: number;
    unique_smokers: number;
    avg_rating: number;
  }>();

  // Rising stars - brands with growth this week vs last week
  const risingStarsQuery = await db.prepare(`
    WITH this_week AS (
      SELECT brand, COUNT(*) as checkins
      FROM checkins
      WHERE created_at >= ?
      GROUP BY LOWER(brand)
    ),
    last_week AS (
      SELECT brand, COUNT(*) as checkins
      FROM checkins
      WHERE created_at >= ? AND created_at < ?
      GROUP BY LOWER(brand)
    )
    SELECT 
      tw.brand,
      tw.checkins as week_checkins,
      CASE 
        WHEN COALESCE(lw.checkins, 0) = 0 THEN 100
        ELSE ROUND((tw.checkins - COALESCE(lw.checkins, 0)) * 100.0 / COALESCE(lw.checkins, 1), 0)
      END as growth_pct,
      (SELECT ROUND(AVG(rating), 1) FROM checkins c WHERE LOWER(c.brand) = LOWER(tw.brand)) as avg_rating
    FROM this_week tw
    LEFT JOIN last_week lw ON LOWER(tw.brand) = LOWER(lw.brand)
    WHERE tw.checkins >= 1
    ORDER BY growth_pct DESC, week_checkins DESC
    LIMIT 10
  `).bind(oneWeekAgo, twoWeeksAgo, oneWeekAgo).all<{
    brand: string;
    week_checkins: number;
    growth_pct: number;
    avg_rating: number;
  }>();

  return NextResponse.json({
    champions: championsQuery.results || [],
    topRated: topRatedQuery.results || [],
    mostPopular: mostPopularQuery.results || [],
    risingStars: risingStarsQuery.results || [],
  });
}
