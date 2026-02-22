import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface WeeklyInsights {
  thisWeek: {
    checkins: number;
    brands: number;
    avgRating: number | null;
    topBrand: string | null;
    newBrands: number;
  };
  lastWeek: {
    checkins: number;
    brands: number;
    avgRating: number | null;
  };
  allTime: {
    totalCheckins: number;
    uniqueBrands: number;
    avgRating: number | null;
    topBrand: string | null;
    topBrandCount: number;
  };
  trend: 'up' | 'down' | 'same';
  error?: string;
}

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Session expired" }, { status: 401 });
    }

    const userId = session.user_id;
    const now = Math.floor(Date.now() / 1000);
    const todayStart = now - (now % 86400);
    const weekStart = todayStart - (7 * 86400);
    const twoWeeksStart = todayStart - (14 * 86400);

    // This week's stats
    const thisWeekCheckins = await db
      .prepare(`
        SELECT COUNT(*) as count, AVG(rating) as avg_rating
        FROM checkins 
        WHERE user_id = ? AND created_at >= ?
      `)
      .bind(userId, weekStart)
      .first<{ count: number; avg_rating: number | null }>();

    const thisWeekBrands = await db
      .prepare(`
        SELECT COUNT(DISTINCT brand) as count
        FROM checkins 
        WHERE user_id = ? AND created_at >= ?
      `)
      .bind(userId, weekStart)
      .first<{ count: number }>();

    const thisWeekTopBrand = await db
      .prepare(`
        SELECT brand, COUNT(*) as count
        FROM checkins 
        WHERE user_id = ? AND created_at >= ?
        GROUP BY brand
        ORDER BY count DESC
        LIMIT 1
      `)
      .bind(userId, weekStart)
      .first<{ brand: string; count: number }>();

    // New brands this week (first time trying a brand)
    const newBrandsResult = await db
      .prepare(`
        SELECT COUNT(DISTINCT c1.brand) as count
        FROM checkins c1
        WHERE c1.user_id = ? 
          AND c1.created_at >= ?
          AND NOT EXISTS (
            SELECT 1 FROM checkins c2 
            WHERE c2.user_id = c1.user_id 
              AND c2.brand = c1.brand 
              AND c2.created_at < ?
          )
      `)
      .bind(userId, weekStart, weekStart)
      .first<{ count: number }>();

    // Last week's stats
    const lastWeekCheckins = await db
      .prepare(`
        SELECT COUNT(*) as count, AVG(rating) as avg_rating
        FROM checkins 
        WHERE user_id = ? AND created_at >= ? AND created_at < ?
      `)
      .bind(userId, twoWeeksStart, weekStart)
      .first<{ count: number; avg_rating: number | null }>();

    const lastWeekBrands = await db
      .prepare(`
        SELECT COUNT(DISTINCT brand) as count
        FROM checkins 
        WHERE user_id = ? AND created_at >= ? AND created_at < ?
      `)
      .bind(userId, twoWeeksStart, weekStart)
      .first<{ count: number }>();

    // All-time stats
    const allTimeCheckins = await db
      .prepare(`
        SELECT COUNT(*) as count, AVG(rating) as avg_rating
        FROM checkins 
        WHERE user_id = ?
      `)
      .bind(userId)
      .first<{ count: number; avg_rating: number | null }>();

    const allTimeBrands = await db
      .prepare(`
        SELECT COUNT(DISTINCT brand) as count
        FROM checkins 
        WHERE user_id = ?
      `)
      .bind(userId)
      .first<{ count: number }>();

    const allTimeTopBrand = await db
      .prepare(`
        SELECT brand, COUNT(*) as count
        FROM checkins 
        WHERE user_id = ?
        GROUP BY brand
        ORDER BY count DESC
        LIMIT 1
      `)
      .bind(userId)
      .first<{ brand: string; count: number }>();

    // Calculate trend
    const thisWeekCount = thisWeekCheckins?.count || 0;
    const lastWeekCount = lastWeekCheckins?.count || 0;
    let trend: 'up' | 'down' | 'same' = 'same';
    if (thisWeekCount > lastWeekCount) trend = 'up';
    else if (thisWeekCount < lastWeekCount) trend = 'down';

    const insights: WeeklyInsights = {
      thisWeek: {
        checkins: thisWeekCount,
        brands: thisWeekBrands?.count || 0,
        avgRating: thisWeekCheckins?.avg_rating ?? null,
        topBrand: thisWeekTopBrand?.brand || null,
        newBrands: newBrandsResult?.count || 0,
      },
      lastWeek: {
        checkins: lastWeekCount,
        brands: lastWeekBrands?.count || 0,
        avgRating: lastWeekCheckins?.avg_rating ?? null,
      },
      allTime: {
        totalCheckins: allTimeCheckins?.count || 0,
        uniqueBrands: allTimeBrands?.count || 0,
        avgRating: allTimeCheckins?.avg_rating ?? null,
        topBrand: allTimeTopBrand?.brand || null,
        topBrandCount: allTimeTopBrand?.count || 0,
      },
      trend,
    };

    return Response.json(insights);
  } catch (error) {
    console.error("Insights error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
