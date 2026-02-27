import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

interface WeekHighlight {
  id: number;
  brand: string;
  product?: string;
  rating?: number;
  image_url?: string;
  review?: string;
  likes: number;
  comments: number;
  created_at: number;
}

interface WeekendSuggestion {
  brand: string;
  product?: string;
  reason: string;
  avgRating: number;
  timesSmoked: number;
}

interface FridaySmoker {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  image_url?: string;
  created_at: number;
}

interface WeekendStats {
  weekCheckins: number;
  weekLikes: number;
  weekComments: number;
  bestRating: number;
  uniqueBrands: number;
  fridayCount: number;
  weekendStreak: number;
}

interface WeekendWarrior {
  username: string;
  fridayCount: number;
  avgRating: number;
  favoriteBrand: string | null;
}

export async function GET(request: Request) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const now = Math.floor(Date.now() / 1000);
    const dayOfWeek = new Date().getDay(); // 0 = Sunday, 5 = Friday
    
    // Calculate this week's start (Monday)
    const today = new Date();
    const daysSinceMonday = (today.getDay() + 6) % 7;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysSinceMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartTs = Math.floor(weekStart.getTime() / 1000);
    
    // Friday bounds (today if it's Friday)
    const fridayStart = new Date(today);
    fridayStart.setHours(0, 0, 0, 0);
    const fridayStartTs = Math.floor(fridayStart.getTime() / 1000);
    const fridayEndTs = fridayStartTs + 86400;

    // Get today's Friday smokers (noon to 6 PM = kickoff time)
    const fridaySmokers = await db.prepare(`
      SELECT c.id, c.brand, c.product, c.rating, c.image_url, c.created_at,
             u.username
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at < ?
      ORDER BY c.created_at DESC
      LIMIT 20
    `).bind(fridayStartTs, fridayEndTs).all();

    // Get user-specific data if logged in
    let userHighlights: WeekHighlight[] = [];
    let userStats: WeekendStats | null = null;
    let suggestions: WeekendSuggestion[] = [];

    if (userId) {
      // User's best moments this week
      const highlights = await db.prepare(`
        SELECT c.id, c.brand, c.product, c.rating, c.image_url, c.review, c.created_at,
               (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as likes,
               (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) as comments
        FROM checkins c
        WHERE c.user_id = ? AND c.created_at >= ?
        ORDER BY (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) + 
                 (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) + 
                 COALESCE(c.rating, 0) DESC
        LIMIT 3
      `).bind(userId, weekStartTs).all();
      userHighlights = (highlights.results || []) as unknown as WeekHighlight[];

      // User's week stats
      const statsResult = await db.prepare(`
        SELECT 
          COUNT(*) as weekCheckins,
          (SELECT COUNT(*) FROM likes l JOIN checkins c2 ON l.checkin_id = c2.id WHERE c2.user_id = ? AND l.created_at >= ?) as weekLikes,
          (SELECT COUNT(*) FROM comments cm JOIN checkins c3 ON cm.checkin_id = c3.id WHERE c3.user_id = ? AND cm.created_at >= ?) as weekComments,
          MAX(rating) as bestRating,
          COUNT(DISTINCT brand) as uniqueBrands
        FROM checkins
        WHERE user_id = ? AND created_at >= ?
      `).bind(userId, weekStartTs, userId, weekStartTs, userId, weekStartTs).first();

      // Count Friday smokes
      const fridayCountResult = await db.prepare(`
        SELECT COUNT(*) as count FROM checkins 
        WHERE user_id = ? AND created_at >= ? AND created_at < ?
      `).bind(userId, fridayStartTs, fridayEndTs).first();

      userStats = {
        weekCheckins: (statsResult?.weekCheckins as number) || 0,
        weekLikes: (statsResult?.weekLikes as number) || 0,
        weekComments: (statsResult?.weekComments as number) || 0,
        bestRating: (statsResult?.bestRating as number) || 0,
        uniqueBrands: (statsResult?.uniqueBrands as number) || 0,
        fridayCount: (fridayCountResult?.count as number) || 0,
        weekendStreak: 0 // Could calculate actual streak
      };

      // Weekend suggestions based on user's favorites
      const suggestionsResult = await db.prepare(`
        SELECT brand, product, AVG(rating) as avgRating, COUNT(*) as timesSmoked
        FROM checkins
        WHERE user_id = ? AND rating >= 4
        GROUP BY brand
        ORDER BY avgRating DESC, timesSmoked DESC
        LIMIT 3
      `).bind(userId).all();

      suggestions = (suggestionsResult.results || []).map((s: Record<string, unknown>) => ({
        brand: s.brand as string,
        product: s.product as string | undefined,
        reason: (s.timesSmoked as number) > 1 
          ? `You've loved this ${s.timesSmoked} times` 
          : "A perfect weekend choice",
        avgRating: s.avgRating as number,
        timesSmoked: s.timesSmoked as number
      }));
    }

    // Get weekend warriors (most Friday smokes)
    const warriors = await db.prepare(`
      SELECT u.username, COUNT(*) as fridayCount, AVG(c.rating) as avgRating,
             (SELECT brand FROM checkins c2 WHERE c2.user_id = u.id 
              GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1) as favoriteBrand
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      GROUP BY u.id
      HAVING fridayCount > 0
      ORDER BY fridayCount DESC
      LIMIT 5
    `).all();

    // Platform weekend stats
    const platformStats = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM checkins WHERE created_at >= ?) as fridayCheckins,
        (SELECT COUNT(DISTINCT user_id) FROM checkins WHERE created_at >= ?) as activeFridaySmokers,
        (SELECT AVG(rating) FROM checkins WHERE created_at >= ? AND rating IS NOT NULL) as avgFridayRating
    `).bind(fridayStartTs, fridayStartTs, fridayStartTs).first();

    // Get trending brand this week
    const trendingBrand = await db.prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins
      WHERE created_at >= ?
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 1
    `).bind(weekStartTs).first();

    return NextResponse.json({
      isFriday: dayOfWeek === 5,
      fridaySmokers: (fridaySmokers.results || []).map((s: Record<string, unknown>) => ({
        username: s.username as string,
        brand: s.brand as string,
        product: s.product as string | undefined,
        rating: s.rating as number | undefined,
        image_url: s.image_url as string | undefined,
        created_at: s.created_at as number
      })) as FridaySmoker[],
      userHighlights,
      userStats,
      suggestions,
      warriors: (warriors.results || []) as unknown as WeekendWarrior[],
      platformStats: {
        fridayCheckins: (platformStats?.fridayCheckins as number) || 0,
        activeSmokers: (platformStats?.activeFridaySmokers as number) || 0,
        avgRating: (platformStats?.avgFridayRating as number) || 0,
        trendingBrand: (trendingBrand?.brand as string) || null
      }
    });
  } catch (error) {
    console.error("Error fetching weekend kickoff data:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
