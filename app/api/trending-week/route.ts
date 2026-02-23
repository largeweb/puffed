import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface TrendingBrand {
  brand: string;
  thisWeekCount: number;
  lastWeekCount: number;
  change: number; // percentage change
  direction: "up" | "down" | "new" | "same";
  avgRating: number | null;
  uniqueSmokers: number;
}

interface TrendingResponse {
  trending: TrendingBrand[];
  period: {
    thisWeekStart: string;
    lastWeekStart: string;
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 20);

    const now = Math.floor(Date.now() / 1000);
    const todayStart = now - (now % 86400);
    const thisWeekStart = todayStart - (6 * 86400); // Last 7 days
    const lastWeekStart = thisWeekStart - (7 * 86400); // 7-14 days ago

    // Get this week's brand counts
    const thisWeekBrands = await db
      .prepare(`
        SELECT 
          brand,
          COUNT(*) as count,
          AVG(rating) as avg_rating,
          COUNT(DISTINCT user_id) as unique_smokers
        FROM checkins 
        WHERE created_at >= ?
        GROUP BY brand
      `)
      .bind(thisWeekStart)
      .all<{ brand: string; count: number; avg_rating: number | null; unique_smokers: number }>();

    // Get last week's brand counts
    const lastWeekBrands = await db
      .prepare(`
        SELECT 
          brand,
          COUNT(*) as count
        FROM checkins 
        WHERE created_at >= ? AND created_at < ?
        GROUP BY brand
      `)
      .bind(lastWeekStart, thisWeekStart)
      .all<{ brand: string; count: number }>();

    // Create lookup for last week
    const lastWeekMap = new Map<string, number>();
    for (const b of lastWeekBrands.results || []) {
      lastWeekMap.set(b.brand.toLowerCase(), b.count);
    }

    // Calculate trending scores
    const trending: TrendingBrand[] = [];
    
    for (const b of thisWeekBrands.results || []) {
      const lastCount = lastWeekMap.get(b.brand.toLowerCase()) || 0;
      const thisCount = b.count;
      
      let direction: "up" | "down" | "new" | "same";
      let change = 0;
      
      if (lastCount === 0 && thisCount > 0) {
        direction = "new";
        change = 100;
      } else if (thisCount > lastCount) {
        direction = "up";
        change = lastCount > 0 ? Math.round(((thisCount - lastCount) / lastCount) * 100) : 100;
      } else if (thisCount < lastCount) {
        direction = "down";
        change = Math.round(((lastCount - thisCount) / lastCount) * 100);
      } else {
        direction = "same";
        change = 0;
      }
      
      trending.push({
        brand: b.brand,
        thisWeekCount: thisCount,
        lastWeekCount: lastCount,
        change,
        direction,
        avgRating: b.avg_rating ? Math.round(b.avg_rating * 10) / 10 : null,
        uniqueSmokers: b.unique_smokers,
      });
    }

    // Sort by: new brands first, then by change percentage, then by this week's count
    trending.sort((a, b) => {
      // New brands get priority
      if (a.direction === "new" && b.direction !== "new") return -1;
      if (b.direction === "new" && a.direction !== "new") return 1;
      
      // Then sort by positive change
      if (a.direction === "up" && b.direction !== "up") return -1;
      if (b.direction === "up" && a.direction !== "up") return 1;
      
      // Among same direction, sort by change percentage
      if (a.direction === b.direction) {
        if (a.direction === "up" || a.direction === "new") {
          // For up/new, higher change is better
          if (b.change !== a.change) return b.change - a.change;
        }
      }
      
      // Finally, sort by this week's count
      return b.thisWeekCount - a.thisWeekCount;
    });

    const response: TrendingResponse = {
      trending: trending.slice(0, limit),
      period: {
        thisWeekStart: new Date(thisWeekStart * 1000).toISOString().split("T")[0],
        lastWeekStart: new Date(lastWeekStart * 1000).toISOString().split("T")[0],
      },
    };

    return Response.json(response);
  } catch (error) {
    console.error("Trending week error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
