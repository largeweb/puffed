import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

interface MonthlyStats {
  totalSmokes: number;
  uniqueBrands: number;
  avgRating: string;
  totalLikesReceived: number;
  totalCommentsReceived: number;
  favoriteBrand: string | null;
  favoriteProduct: string | null;
  highestRatedSmoke: {
    brand: string;
    product?: string;
    rating: number;
    date: number;
  } | null;
  mostActiveDay: string | null;
  mostActiveHour: number | null;
  smokingPattern: {
    morning: number;   // 5-11 AM
    afternoon: number; // 11 AM - 5 PM
    evening: number;   // 5-9 PM
    night: number;     // 9 PM - 5 AM
  };
  badgesEarned: string[];
  streakDays: number;
  firstSmoke: { brand: string; date: number } | null;
  lastSmoke: { brand: string; date: number } | null;
}

interface PlatformMonthlyStats {
  totalSmokes: number;
  totalUsers: number;
  avgRating: string;
  topBrand: string | null;
  mostActiveUser: string | null;
  peakDay: string | null;
}

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = env.DB;

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const month = parseInt(url.searchParams.get("month") || "2"); // Default to February
  const year = parseInt(url.searchParams.get("year") || "2026");

  // Calculate month boundaries (Unix timestamps)
  const monthStart = new Date(year, month - 1, 1, 0, 0, 0).getTime() / 1000;
  const monthEnd = new Date(year, month, 1, 0, 0, 0).getTime() / 1000;

  const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });

  try {
    let userStats: MonthlyStats | null = null;

    if (userId) {
      // User's personal stats for the month
      const smokesResult = await db.prepare(`
        SELECT 
          COUNT(*) as total,
          COUNT(DISTINCT brand) as unique_brands,
          ROUND(AVG(rating), 1) as avg_rating
        FROM checkins 
        WHERE user_id = ? AND created_at >= ? AND created_at < ?
      `).bind(userId, monthStart, monthEnd).first<any>();

      // Favorite brand
      const favBrandResult = await db.prepare(`
        SELECT brand, COUNT(*) as count
        FROM checkins
        WHERE user_id = ? AND created_at >= ? AND created_at < ?
        GROUP BY brand
        ORDER BY count DESC
        LIMIT 1
      `).bind(userId, monthStart, monthEnd).first<any>();

      // Highest rated smoke
      const topRatedResult = await db.prepare(`
        SELECT brand, product, rating, created_at
        FROM checkins
        WHERE user_id = ? AND created_at >= ? AND created_at < ? AND rating IS NOT NULL
        ORDER BY rating DESC, created_at DESC
        LIMIT 1
      `).bind(userId, monthStart, monthEnd).first<any>();

      // Most active day of week
      const activeDayResult = await db.prepare(`
        SELECT 
          CASE strftime('%w', datetime(created_at, 'unixepoch'))
            WHEN '0' THEN 'Sunday'
            WHEN '1' THEN 'Monday'
            WHEN '2' THEN 'Tuesday'
            WHEN '3' THEN 'Wednesday'
            WHEN '4' THEN 'Thursday'
            WHEN '5' THEN 'Friday'
            WHEN '6' THEN 'Saturday'
          END as day_name,
          COUNT(*) as count
        FROM checkins
        WHERE user_id = ? AND created_at >= ? AND created_at < ?
        GROUP BY day_name
        ORDER BY count DESC
        LIMIT 1
      `).bind(userId, monthStart, monthEnd).first<any>();

      // Most active hour
      const activeHourResult = await db.prepare(`
        SELECT 
          CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) as hour,
          COUNT(*) as count
        FROM checkins
        WHERE user_id = ? AND created_at >= ? AND created_at < ?
        GROUP BY hour
        ORDER BY count DESC
        LIMIT 1
      `).bind(userId, monthStart, monthEnd).first<any>();

      // Smoking pattern (time buckets)
      const patternResult = await db.prepare(`
        SELECT 
          SUM(CASE WHEN CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) BETWEEN 5 AND 10 THEN 1 ELSE 0 END) as morning,
          SUM(CASE WHEN CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) BETWEEN 11 AND 16 THEN 1 ELSE 0 END) as afternoon,
          SUM(CASE WHEN CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) BETWEEN 17 AND 20 THEN 1 ELSE 0 END) as evening,
          SUM(CASE WHEN CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) >= 21 OR CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) < 5 THEN 1 ELSE 0 END) as night
        FROM checkins
        WHERE user_id = ? AND created_at >= ? AND created_at < ?
      `).bind(userId, monthStart, monthEnd).first<any>();

      // Likes received this month
      const likesResult = await db.prepare(`
        SELECT COUNT(*) as count
        FROM likes l
        JOIN checkins c ON l.checkin_id = c.id
        WHERE c.user_id = ? AND l.created_at >= ? AND l.created_at < ?
      `).bind(userId, monthStart, monthEnd).first<any>();

      // Comments received this month
      const commentsResult = await db.prepare(`
        SELECT COUNT(*) as count
        FROM comments cm
        JOIN checkins c ON cm.checkin_id = c.id
        WHERE c.user_id = ? AND cm.created_at >= ? AND cm.created_at < ? AND cm.user_id != c.user_id
      `).bind(userId, monthStart, monthEnd).first<any>();

      // First and last smoke of the month
      const firstSmokeResult = await db.prepare(`
        SELECT brand, created_at
        FROM checkins
        WHERE user_id = ? AND created_at >= ? AND created_at < ?
        ORDER BY created_at ASC
        LIMIT 1
      `).bind(userId, monthStart, monthEnd).first<any>();

      const lastSmokeResult = await db.prepare(`
        SELECT brand, created_at
        FROM checkins
        WHERE user_id = ? AND created_at >= ? AND created_at < ?
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(userId, monthStart, monthEnd).first<any>();

      userStats = {
        totalSmokes: smokesResult?.total || 0,
        uniqueBrands: smokesResult?.unique_brands || 0,
        avgRating: smokesResult?.avg_rating || "0.0",
        totalLikesReceived: likesResult?.count || 0,
        totalCommentsReceived: commentsResult?.count || 0,
        favoriteBrand: favBrandResult?.brand || null,
        favoriteProduct: null,
        highestRatedSmoke: topRatedResult ? {
          brand: topRatedResult.brand,
          product: topRatedResult.product,
          rating: topRatedResult.rating,
          date: topRatedResult.created_at
        } : null,
        mostActiveDay: activeDayResult?.day_name || null,
        mostActiveHour: activeHourResult?.hour ?? null,
        smokingPattern: {
          morning: patternResult?.morning || 0,
          afternoon: patternResult?.afternoon || 0,
          evening: patternResult?.evening || 0,
          night: patternResult?.night || 0
        },
        badgesEarned: [], // Would need badges table query
        streakDays: 0, // Would need streak calculation
        firstSmoke: firstSmokeResult ? { brand: firstSmokeResult.brand, date: firstSmokeResult.created_at } : null,
        lastSmoke: lastSmokeResult ? { brand: lastSmokeResult.brand, date: lastSmokeResult.created_at } : null
      };
    }

    // Platform-wide stats for the month
    const platformSmokes = await db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT user_id) as users,
        ROUND(AVG(rating), 1) as avg_rating
      FROM checkins 
      WHERE created_at >= ? AND created_at < ?
    `).bind(monthStart, monthEnd).first<any>();

    const platformTopBrand = await db.prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins
      WHERE created_at >= ? AND created_at < ?
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 1
    `).bind(monthStart, monthEnd).first<any>();

    const platformTopUser = await db.prepare(`
      SELECT u.username, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at < ?
      GROUP BY c.user_id
      ORDER BY count DESC
      LIMIT 1
    `).bind(monthStart, monthEnd).first<any>();

    const platformStats: PlatformMonthlyStats = {
      totalSmokes: platformSmokes?.total || 0,
      totalUsers: platformSmokes?.users || 0,
      avgRating: platformSmokes?.avg_rating || "0.0",
      topBrand: platformTopBrand?.brand || null,
      mostActiveUser: platformTopUser?.username || null,
      peakDay: null
    };

    return NextResponse.json({
      month: monthName,
      year,
      userStats,
      platformStats,
      daysInMonth: new Date(year, month, 0).getDate(),
      daysRemaining: Math.max(0, new Date(year, month, 0).getDate() - new Date().getDate())
    });
  } catch (error) {
    console.error("Monthly recap error:", error);
    return NextResponse.json({ error: "Failed to fetch recap" }, { status: 500 });
  }
}
