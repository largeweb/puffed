import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface YesterdayHighlight {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  review?: string;
  imageUrl?: string;
  likes: number;
  comments: number;
}

interface BadgeEarner {
  username: string;
  badge: string;
  earnedAt: number;
}

interface TrendingBrand {
  brand: string;
  count: number;
  avgRating: number;
  trend: "up" | "stable" | "new";
}

interface FeaturedSmoker {
  username: string;
  totalCheckins: number;
  recentActivity: string;
  favoritesBrand?: string;
}

const SMOKE_FACTS = [
  "The longest cigar ever rolled was over 81 meters (268 feet) long.",
  "Cuba produces about 100 million hand-rolled cigars annually.",
  "Winston Churchill smoked an estimated 250,000 cigars in his lifetime.",
  "The art of cigar rolling is called 'torcedor' in Spanish.",
  "A premium cigar can contain up to 300 different tobacco leaves.",
  "The cigar band was invented to keep gentlemen's white gloves clean.",
  "Cigars should be stored at 65-70% humidity and 65-70°F.",
  "The 'foot' of a cigar is the end you light; the 'cap' is what you cut.",
  "Nicaragua has become one of the world's top premium cigar producers.",
  "A 'Churchill' cigar size is named after Sir Winston Churchill.",
  "Tobacco plants can grow up to 6 feet tall.",
  "The wrapper leaf accounts for about 60% of a cigar's flavor.",
  "Connecticut shade-grown wrappers are grown under tents to filter sunlight.",
  "A master blender may take years to develop a single cigar blend.",
  "Friday is statistically the most popular day for premium cigar smoking!",
];

const MORNING_QUOTES = [
  "A good cigar and a good cup of coffee are the pillars of a good morning.",
  "Start your day with intention, end it with a fine smoke.",
  "Every cigar tells a story. What will yours be today?",
  "The best time to smoke was yesterday. The next best time is today.",
  "Life is too short for bad cigars and bad coffee.",
  "Friday mornings are for planning great weekend smokes.",
  "Rise and shine, the smoke awaits.",
  "A morning without coffee is like a cigar without fire.",
];

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const url = new URL(request.url);
    const username = url.searchParams.get("username");
    
    // Get current time info
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 5 = Friday
    const isFriday = dayOfWeek === 5;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Yesterday's timestamps (last 24-48 hours to catch activity)
    const yesterday = Math.floor(now.getTime() / 1000) - 86400;
    const twoDaysAgo = Math.floor(now.getTime() / 1000) - 172800;
    
    // Get yesterday's highlights (top check-ins by engagement)
    const highlightsResult = await db.prepare(`
      SELECT 
        u.username,
        c.brand,
        c.product,
        c.rating,
        c.review,
        c.image_url as imageUrl,
        c.created_at as createdAt,
        (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as likes,
        (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) as comments
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      ORDER BY likes DESC, comments DESC, c.rating DESC
      LIMIT 5
    `).bind(twoDaysAgo).all();
    
    const yesterdayHighlights: YesterdayHighlight[] = (highlightsResult.results || []).map((row: any) => ({
      username: row.username,
      brand: row.brand,
      product: row.product,
      rating: row.rating,
      review: row.review,
      imageUrl: row.imageUrl,
      likes: row.likes || 0,
      comments: row.comments || 0,
    }));
    
    // Get trending brands (this week vs last week)
    const weekAgo = Math.floor(now.getTime() / 1000) - 604800;
    const twoWeeksAgo = Math.floor(now.getTime() / 1000) - 1209600;
    
    const trendingResult = await db.prepare(`
      SELECT 
        brand,
        COUNT(*) as count,
        AVG(rating) as avgRating
      FROM checkins
      WHERE created_at >= ?
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 5
    `).bind(weekAgo).all();
    
    // Get last week's counts for comparison
    const lastWeekResult = await db.prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins
      WHERE created_at >= ? AND created_at < ?
      GROUP BY brand
    `).bind(twoWeeksAgo, weekAgo).all();
    
    const lastWeekCounts: Record<string, number> = {};
    (lastWeekResult.results || []).forEach((row: any) => {
      lastWeekCounts[row.brand] = row.count;
    });
    
    const trendingBrands: TrendingBrand[] = (trendingResult.results || []).map((row: any) => {
      const lastWeekCount = lastWeekCounts[row.brand] || 0;
      let trend: "up" | "stable" | "new" = "stable";
      if (lastWeekCount === 0) trend = "new";
      else if (row.count > lastWeekCount) trend = "up";
      
      return {
        brand: row.brand,
        count: row.count,
        avgRating: Math.round(row.avgRating * 10) / 10,
        trend,
      };
    });
    
    // Get featured smoker (most active recently who hasn't been featured much)
    const featuredResult = await db.prepare(`
      SELECT 
        u.username,
        COUNT(c.id) as totalCheckins,
        MAX(c.created_at) as lastActive
      FROM users u
      JOIN checkins c ON c.user_id = u.id
      GROUP BY u.id
      ORDER BY COUNT(CASE WHEN c.created_at >= ? THEN 1 END) DESC, totalCheckins DESC
      LIMIT 1
    `).bind(weekAgo).all();
    
    let featuredSmoker: FeaturedSmoker | null = null;
    if (featuredResult.results?.[0]) {
      const row: any = featuredResult.results[0];
      
      // Get their favorite brand
      const favBrandResult = await db.prepare(`
        SELECT brand, COUNT(*) as count
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE u.username = ?
        GROUP BY brand
        ORDER BY count DESC
        LIMIT 1
      `).bind(row.username).all();
      
      const lastActive = new Date(row.lastActive * 1000);
      const hoursAgo = Math.floor((now.getTime() - lastActive.getTime()) / 3600000);
      
      featuredSmoker = {
        username: row.username,
        totalCheckins: row.totalCheckins,
        recentActivity: hoursAgo < 24 ? `Active ${hoursAgo}h ago` : "Active this week",
        favoritesBrand: favBrandResult.results?.[0] ? (favBrandResult.results[0] as any).brand : undefined,
      };
    }
    
    // Get platform stats
    const statsResult = await db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users) as totalUsers,
        (SELECT COUNT(*) FROM checkins) as totalCheckins,
        (SELECT COUNT(*) FROM checkins WHERE created_at >= ?) as yesterdayCheckins,
        (SELECT COUNT(DISTINCT user_id) FROM checkins WHERE created_at >= ?) as activeYesterday,
        (SELECT AVG(rating) FROM checkins WHERE created_at >= ? AND rating IS NOT NULL) as avgRatingYesterday
    `).bind(yesterday, yesterday, yesterday).first();
    
    // Get user's personal morning brief if logged in
    let personalBrief = null;
    if (username) {
      const userResult = await db.prepare(`
        SELECT 
          u.id,
          u.streak,
          (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) as yourTotal,
          (SELECT COUNT(*) FROM checkins WHERE user_id = u.id AND created_at >= ?) as yourYesterday,
          (SELECT brand FROM checkins WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as lastBrand
        FROM users u
        WHERE u.username = ?
      `).bind(yesterday, username).first();
      
      if (userResult) {
        const ur: any = userResult;
        personalBrief = {
          streak: ur.streak || 0,
          yourTotal: ur.yourTotal || 0,
          yourYesterday: ur.yourYesterday || 0,
          lastBrand: ur.lastBrand,
          streakAtRisk: ur.streak > 0 && ur.yourYesterday === 0,
        };
      }
    }
    
    // Select random quote and fact based on day
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    const quote = MORNING_QUOTES[dayOfYear % MORNING_QUOTES.length];
    const fact = SMOKE_FACTS[dayOfYear % SMOKE_FACTS.length];
    
    return NextResponse.json({
      greeting: getGreeting(now),
      quote,
      fact,
      isFriday,
      isWeekend,
      dayOfWeek,
      yesterdayHighlights,
      trendingBrands,
      featuredSmoker,
      stats: {
        totalUsers: (statsResult as any)?.totalUsers || 0,
        totalCheckins: (statsResult as any)?.totalCheckins || 0,
        yesterdayCheckins: (statsResult as any)?.yesterdayCheckins || 0,
        activeYesterday: (statsResult as any)?.activeYesterday || 0,
        avgRatingYesterday: (statsResult as any)?.avgRatingYesterday 
          ? Math.round((statsResult as any).avgRatingYesterday * 10) / 10 
          : null,
      },
      personalBrief,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Morning brief error:", error);
    return NextResponse.json({ error: "Failed to generate morning brief" }, { status: 500 });
  }
}

function getGreeting(now: Date): string {
  const hour = now.getUTCHours() - 5; // EST adjustment
  const adjustedHour = hour < 0 ? hour + 24 : hour;
  
  if (adjustedHour < 12) return "Good morning";
  if (adjustedHour < 17) return "Good afternoon";
  if (adjustedHour < 21) return "Good evening";
  return "Good night";
}
