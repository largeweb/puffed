import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface ThursdayHubResponse {
  isThursday: boolean;
  dayName: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  hoursUntilWeekend: number;
  activeSmokersTonight: Array<{
    username: string;
    brand: string;
    rating: number | null;
    minutesAgo: number;
    avatar_url: string | null;
  }>;
  hotTakesToday: Array<{
    id: string;
    username: string;
    take: string;
    upvotes: number;
    downvotes: number;
  }>;
  tonightsPick: {
    brand: string;
    reason: string;
    checkinsTonight: number;
    avgRating: number | null;
  } | null;
  communityMood: {
    avgRating: number | null;
    totalCheckinsToday: number;
    topBrandToday: string | null;
    vibeEmoji: string;
    vibeText: string;
  };
  thursdayStats: {
    allTimeThursdayCheckins: number;
    avgThursdayRating: number | null;
    favoriteThursdayBrand: string | null;
  };
}

const EVENING_PICKS = [
  { reason: "Perfect for unwinding after a long week", tags: ["smooth", "mellow"] },
  { reason: "Great for contemplation and reflection", tags: ["complex", "cedar"] },
  { reason: "Celebrate making it to Thursday!", tags: ["bold", "rich"] },
  { reason: "Pairs well with your favorite evening drink", tags: ["chocolate", "coffee"] },
  { reason: "Classic choice for a Thursday night", tags: ["wood", "leather"] },
];

export async function GET(request: NextRequest): Promise<NextResponse<ThursdayHubResponse | { error: string }>> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 4 = Thursday
    const hour = now.getUTCHours();
    const isThursday = dayOfWeek === 4;

    // Get day name and time of day
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = dayNames[dayOfWeek];
    
    let timeOfDay: "morning" | "afternoon" | "evening" | "night";
    if (hour >= 5 && hour < 12) timeOfDay = "morning";
    else if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
    else if (hour >= 17 && hour < 22) timeOfDay = "evening";
    else timeOfDay = "night";

    // Calculate hours until weekend (Friday 5 PM)
    let hoursUntilWeekend = 0;
    if (dayOfWeek < 5) {
      const daysUntilFriday = 5 - dayOfWeek;
      hoursUntilWeekend = (daysUntilFriday * 24) + (17 - hour);
    } else if (dayOfWeek === 5 && hour < 17) {
      hoursUntilWeekend = 17 - hour;
    }
    // Weekend is here if Friday 5PM+ or Sat/Sun

    const nowMs = Date.now();
    const todayStartMs = nowMs - (nowMs % 86400000);
    const twoHoursAgoMs = nowMs - (2 * 60 * 60 * 1000);

    // Get active smokers tonight (last 2 hours)
    const activeSmokersResult = await db.prepare(`
      SELECT 
        u.username,
        c.brand,
        c.rating,
        c.created_at,
        u.avatar_url
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      ORDER BY c.created_at DESC
      LIMIT 10
    `).bind(twoHoursAgoMs).all<{
      username: string;
      brand: string;
      rating: number | null;
      created_at: number;
      avatar_url: string | null;
    }>();

    const activeSmokersTonight = (activeSmokersResult.results || []).map(s => ({
      username: s.username,
      brand: s.brand,
      rating: s.rating,
      minutesAgo: Math.floor((nowMs - s.created_at) / 60000),
      avatar_url: s.avatar_url,
    }));

    // Get today's hot takes (if Hot Takes Thursday exists)
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - now.getUTCDay() + 1); // Monday
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekStartMs = weekStart.getTime();

    let hotTakesToday: ThursdayHubResponse["hotTakesToday"] = [];
    try {
      const hotTakesResult = await db.prepare(`
        SELECT 
          ht.id,
          u.username,
          ht.take,
          ht.upvotes,
          ht.downvotes
        FROM hot_takes ht
        JOIN users u ON ht.user_id = u.id
        WHERE ht.week_start = ?
        ORDER BY (ht.upvotes - ht.downvotes) DESC
        LIMIT 5
      `).bind(weekStartMs).all<{
        id: string;
        username: string;
        take: string;
        upvotes: number;
        downvotes: number;
      }>();
      hotTakesToday = hotTakesResult.results || [];
    } catch {
      // Hot takes table might not exist
    }

    // Get tonight's top brand suggestion
    const tonightsBrandResult = await db.prepare(`
      SELECT 
        brand,
        COUNT(*) as count,
        AVG(rating) as avg_rating
      FROM checkins
      WHERE created_at >= ?
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 1
    `).bind(todayStartMs).first<{ brand: string; count: number; avg_rating: number | null }>();

    let tonightsPick: ThursdayHubResponse["tonightsPick"] = null;
    if (tonightsBrandResult) {
      const pickReason = EVENING_PICKS[Math.floor(Date.now() / 86400000) % EVENING_PICKS.length];
      tonightsPick = {
        brand: tonightsBrandResult.brand,
        reason: pickReason.reason,
        checkinsTonight: tonightsBrandResult.count,
        avgRating: tonightsBrandResult.avg_rating ? Math.round(tonightsBrandResult.avg_rating * 10) / 10 : null,
      };
    }

    // Get community mood for today
    const moodResult = await db.prepare(`
      SELECT 
        COUNT(*) as total_checkins,
        AVG(rating) as avg_rating
      FROM checkins
      WHERE created_at >= ?
    `).bind(todayStartMs).first<{ total_checkins: number; avg_rating: number | null }>();

    const topBrandTodayResult = await db.prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins
      WHERE created_at >= ?
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 1
    `).bind(todayStartMs).first<{ brand: string; count: number }>();

    const avgRating = moodResult?.avg_rating ? Math.round(moodResult.avg_rating * 10) / 10 : null;
    let vibeEmoji = "😌";
    let vibeText = "Chill vibes";
    if (avgRating !== null) {
      if (avgRating >= 4.5) { vibeEmoji = "🔥"; vibeText = "On fire tonight!"; }
      else if (avgRating >= 4) { vibeEmoji = "😎"; vibeText = "Good times rolling"; }
      else if (avgRating >= 3) { vibeEmoji = "😌"; vibeText = "Relaxed evening"; }
      else { vibeEmoji = "🤔"; vibeText = "Experimental mood"; }
    }

    const communityMood = {
      avgRating,
      totalCheckinsToday: moodResult?.total_checkins || 0,
      topBrandToday: topBrandTodayResult?.brand || null,
      vibeEmoji,
      vibeText,
    };

    // Get all-time Thursday stats
    const thursdayStatsResult = await db.prepare(`
      SELECT 
        COUNT(*) as total_checkins,
        AVG(rating) as avg_rating
      FROM checkins
      WHERE strftime('%w', datetime(created_at/1000, 'unixepoch')) = '4'
    `).first<{ total_checkins: number; avg_rating: number | null }>();

    const favoriteThursdayBrandResult = await db.prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins
      WHERE strftime('%w', datetime(created_at/1000, 'unixepoch')) = '4'
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 1
    `).first<{ brand: string; count: number }>();

    const thursdayStats = {
      allTimeThursdayCheckins: thursdayStatsResult?.total_checkins || 0,
      avgThursdayRating: thursdayStatsResult?.avg_rating ? Math.round(thursdayStatsResult.avg_rating * 10) / 10 : null,
      favoriteThursdayBrand: favoriteThursdayBrandResult?.brand || null,
    };

    return NextResponse.json({
      isThursday,
      dayName,
      timeOfDay,
      hoursUntilWeekend,
      activeSmokersTonight,
      hotTakesToday,
      tonightsPick,
      communityMood,
      thursdayStats,
    });
  } catch (error) {
    console.error("Thursday hub error:", error);
    return NextResponse.json({ error: "Failed to load Thursday hub" }, { status: 500 });
  }
}
