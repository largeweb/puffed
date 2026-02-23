import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface BrandStats {
  brand: string;
  total_checkins: number;
  unique_smokers: number;
  avg_rating: number;
  five_star_count: number;
  recent_image: string | null;
  top_product: string | null;
  flavors: string[];
  recent_reviews: Array<{
    username: string;
    rating: number;
    review: string | null;
    product: string | null;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const url = new URL(request.url);
    const brandA = url.searchParams.get("a")?.trim();
    const brandB = url.searchParams.get("b")?.trim();

    if (!brandA || !brandB) {
      return NextResponse.json(
        { error: "Both brands (a and b) are required" },
        { status: 400 }
      );
    }

    async function getBrandStats(brand: string): Promise<BrandStats | null> {
      // Basic stats
      const stats = await db
        .prepare(`
          SELECT 
            brand,
            COUNT(*) as total_checkins,
            COUNT(DISTINCT user_id) as unique_smokers,
            AVG(rating) as avg_rating,
            SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star_count
          FROM checkins
          WHERE LOWER(brand) = LOWER(?)
          GROUP BY brand
        `)
        .bind(brand)
        .first<{
          brand: string;
          total_checkins: number;
          unique_smokers: number;
          avg_rating: number;
          five_star_count: number;
        }>();

      if (!stats) return null;

      // Most recent image
      const recentImage = await db
        .prepare(`
          SELECT image_url
          FROM checkins
          WHERE LOWER(brand) = LOWER(?) AND image_url IS NOT NULL
          ORDER BY created_at DESC
          LIMIT 1
        `)
        .bind(brand)
        .first<{ image_url: string }>();

      // Top product/vitola
      const topProduct = await db
        .prepare(`
          SELECT product, COUNT(*) as cnt
          FROM checkins
          WHERE LOWER(brand) = LOWER(?) AND product IS NOT NULL AND product != ''
          GROUP BY product
          ORDER BY cnt DESC
          LIMIT 1
        `)
        .bind(brand)
        .first<{ product: string; cnt: number }>();

      // Flavor profile (aggregate all flavors from check-ins)
      const flavorRows = await db
        .prepare(`
          SELECT flavors
          FROM checkins
          WHERE LOWER(brand) = LOWER(?) AND flavors IS NOT NULL AND flavors != ''
        `)
        .bind(brand)
        .all<{ flavors: string }>();

      const flavorCounts: Record<string, number> = {};
      for (const row of flavorRows.results || []) {
        const flavors = row.flavors.split(",").map((f) => f.trim());
        for (const f of flavors) {
          if (f) flavorCounts[f] = (flavorCounts[f] || 0) + 1;
        }
      }
      const topFlavors = Object.entries(flavorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([f]) => f);

      // Recent reviews with content
      const recentReviews = await db
        .prepare(`
          SELECT u.username, c.rating, c.review, c.product
          FROM checkins c
          JOIN users u ON c.user_id = u.id
          WHERE LOWER(c.brand) = LOWER(?)
          ORDER BY c.created_at DESC
          LIMIT 3
        `)
        .bind(brand)
        .all<{
          username: string;
          rating: number;
          review: string | null;
          product: string | null;
        }>();

      return {
        brand: stats.brand,
        total_checkins: stats.total_checkins,
        unique_smokers: stats.unique_smokers,
        avg_rating: Math.round(stats.avg_rating * 10) / 10,
        five_star_count: stats.five_star_count,
        recent_image: recentImage?.image_url || null,
        top_product: topProduct?.product || null,
        flavors: topFlavors,
        recent_reviews: recentReviews.results || [],
      };
    }

    const [statsA, statsB] = await Promise.all([
      getBrandStats(brandA),
      getBrandStats(brandB),
    ]);

    if (!statsA && !statsB) {
      return NextResponse.json(
        { error: "Neither brand found" },
        { status: 404 }
      );
    }

    // Determine winner in various categories
    const comparison = {
      brandA: statsA,
      brandB: statsB,
      winners: {
        more_popular: null as string | null,
        higher_rated: null as string | null,
        more_smokers: null as string | null,
        more_five_stars: null as string | null,
      },
    };

    if (statsA && statsB) {
      if (statsA.total_checkins > statsB.total_checkins) {
        comparison.winners.more_popular = statsA.brand;
      } else if (statsB.total_checkins > statsA.total_checkins) {
        comparison.winners.more_popular = statsB.brand;
      }

      if (statsA.avg_rating > statsB.avg_rating) {
        comparison.winners.higher_rated = statsA.brand;
      } else if (statsB.avg_rating > statsA.avg_rating) {
        comparison.winners.higher_rated = statsB.brand;
      }

      if (statsA.unique_smokers > statsB.unique_smokers) {
        comparison.winners.more_smokers = statsA.brand;
      } else if (statsB.unique_smokers > statsA.unique_smokers) {
        comparison.winners.more_smokers = statsB.brand;
      }

      if (statsA.five_star_count > statsB.five_star_count) {
        comparison.winners.more_five_stars = statsA.brand;
      } else if (statsB.five_star_count > statsA.five_star_count) {
        comparison.winners.more_five_stars = statsB.brand;
      }
    }

    return NextResponse.json(comparison);
  } catch (error) {
    console.error("Compare error:", error);
    return NextResponse.json(
      { error: "Comparison failed" },
      { status: 500 }
    );
  }
}
