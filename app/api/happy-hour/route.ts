import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// Happy Hour: 5 PM - 8 PM (17:00 - 20:00)
const HAPPY_HOUR_START = 17;
const HAPPY_HOUR_END = 20;

function isHappyHourTime(unixTimestamp: number): boolean {
  const date = new Date(unixTimestamp * 1000);
  const hour = date.getHours();
  return hour >= HAPPY_HOUR_START && hour < HAPPY_HOUR_END;
}

interface CheckinRow {
  brand: string;
  product?: string;
  rating?: number;
  image_url?: string;
  created_at: number;
  drink_pairing?: string;
  username?: string;
  user_id: string;
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    const now = Math.floor(Date.now() / 1000);
    const todayStart = now - (now % 86400) - (new Date().getTimezoneOffset() * 60);
    const weekStart = todayStart - (6 * 86400);
    
    // Get today's happy hour smokes
    const todaySmokes = await db.prepare(`
      SELECT 
        c.brand, c.product, c.rating, c.image_url, c.created_at, c.drink_pairing,
        u.username
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      ORDER BY c.created_at DESC
      LIMIT 100
    `).bind(todayStart).all();
    
    // Filter to just happy hour (5-8 PM)
    const happyHourSmokers = ((todaySmokes.results || []) as unknown as CheckinRow[]).filter((c) => 
      isHappyHourTime(c.created_at)
    );
    
    // Get this week's happy hour smokes count
    const weekSmokes = await db.prepare(`
      SELECT COUNT(*) as count
      FROM checkins
      WHERE created_at >= ?
    `).bind(weekStart).first<{ count: number }>();
    
    // We need to filter week smokes by happy hour too
    const weekAllSmokes = await db.prepare(`
      SELECT created_at FROM checkins WHERE created_at >= ?
    `).bind(weekStart).all();
    
    const weekHappyHourCount = (weekAllSmokes.results as { created_at: number }[] || []).filter((c) => 
      isHappyHourTime(c.created_at)
    ).length;
    
    // Get all-time happy hour smokes
    const allSmokes = await db.prepare(`
      SELECT created_at, rating, brand, user_id FROM checkins
    `).all();
    
    const allHappyHourSmokes = ((allSmokes.results || []) as unknown as CheckinRow[]).filter((c) => 
      isHappyHourTime(c.created_at)
    );
    
    // Calculate stats
    const happyHourRatings = allHappyHourSmokes
      .filter((c) => c.rating)
      .map((c) => c.rating as number);
    
    const avgRating = happyHourRatings.length > 0 
      ? happyHourRatings.reduce((a, b) => a + b, 0) / happyHourRatings.length 
      : 0;
    
    // Find top brand during happy hour
    const brandCounts: Record<string, number> = {};
    allHappyHourSmokes.forEach((c) => {
      brandCounts[c.brand] = (brandCounts[c.brand] || 0) + 1;
    });
    const topBrand = Object.entries(brandCounts)
      .sort(([, a]: [string, number], [, b]: [string, number]) => b - a)[0]?.[0] || null;
    
    // Unique smokers
    const uniqueUserIds = new Set(allHappyHourSmokes.map((c) => c.user_id));
    
    // Peak minute (most popular smoking minute during happy hour)
    const minuteCounts: Record<number, number> = {};
    allHappyHourSmokes.forEach((c) => {
      const date = new Date(c.created_at * 1000);
      const minuteOfHour = date.getHours() * 60 + date.getMinutes();
      minuteCounts[minuteOfHour] = (minuteCounts[minuteOfHour] || 0) + 1;
    });
    const peakMinute = Object.entries(minuteCounts)
      .sort(([, a]: [string, number], [, b]: [string, number]) => b - a)[0]?.[0] || 0;
    
    // Get leaderboard - users with most happy hour smokes
    const userHappyHourCounts: Record<string, { count: number; ratings: number[]; brands: string[] }> = {};
    
    for (const smoke of allHappyHourSmokes) {
      const userId = smoke.user_id;
      if (!userHappyHourCounts[userId]) {
        userHappyHourCounts[userId] = { count: 0, ratings: [], brands: [] };
      }
      userHappyHourCounts[userId].count++;
      if (smoke.rating) {
        userHappyHourCounts[userId].ratings.push(smoke.rating);
      }
      userHappyHourCounts[userId].brands.push(smoke.brand);
    }
    
    // Get usernames for the leaders
    const leaderUserIds = Object.entries(userHappyHourCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([userId]) => userId);
    
    const leaders = [];
    for (const userId of leaderUserIds) {
      const user = await db.prepare(`
        SELECT username FROM users WHERE id = ?
      `).bind(userId).first<{ username: string }>();
      
      if (user) {
        const userData = userHappyHourCounts[userId];
        const avgUserRating = userData.ratings.length > 0 
          ? userData.ratings.reduce((a, b) => a + b, 0) / userData.ratings.length 
          : 0;
        
        // Find favorite brand
        const userBrandCounts: Record<string, number> = {};
        userData.brands.forEach(b => {
          userBrandCounts[b] = (userBrandCounts[b] || 0) + 1;
        });
        const favoriteBrand = Object.entries(userBrandCounts)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || null;
        
        leaders.push({
          username: user.username,
          count: userData.count,
          avgRating: avgUserRating,
          favoriteBrand
        });
      }
    }
    
    return NextResponse.json({
      smokers: happyHourSmokers.map((s: any) => ({
        username: s.username,
        brand: s.brand,
        product: s.product,
        rating: s.rating,
        image_url: s.image_url,
        created_at: s.created_at,
        drink_pairing: s.drink_pairing
      })),
      stats: {
        todayCount: happyHourSmokers.length,
        weekCount: weekHappyHourCount,
        allTimeCount: allHappyHourSmokes.length,
        avgRating,
        topBrand,
        peakMinute: Number(peakMinute),
        uniqueSmokers: uniqueUserIds.size
      },
      leaders
    });
  } catch (error) {
    console.error("Happy hour API error:", error);
    return NextResponse.json({ error: "Failed to fetch happy hour data" }, { status: 500 });
  }
}
