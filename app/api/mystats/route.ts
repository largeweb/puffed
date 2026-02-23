import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

export interface MyStatsResponse {
  // Overview
  totalSmokes: number;
  daysSinceFirstSmoke: number;
  avgRating: number | null;
  
  // Brands
  uniqueBrands: number;
  favoriteBrand: { name: string; count: number } | null;
  topBrands: { name: string; count: number; avgRating: number | null }[];
  
  // Categories breakdown
  categories: { category: string; count: number }[];
  
  // Rating distribution (1-5 stars)
  ratingDistribution: { rating: number; count: number }[];
  
  // Flavors explored (for cigars)
  topFlavors: { id: string; count: number }[];
  uniqueFlavors: number;
  
  // Streaks
  currentStreak: number;
  bestStreak: number;
  streakActive: boolean;
  
  // Social stats
  totalLikesGiven: number;
  totalLikesReceived: number;
  totalCommentsGiven: number;
  totalCommentsReceived: number;
  following: number;
  followers: number;
  
  // Badges
  badgesEarned: number;
  totalBadges: number;
  
  // Timeline
  firstCheckinDate: string | null;
  mostActiveDay: string | null; // Day of week
  mostActiveMonth: string | null;
  
  // Smoke Time Patterns (NEW)
  timePatterns: {
    // Time of day distribution
    timeOfDay: {
      morning: number;   // 5am-12pm
      afternoon: number; // 12pm-5pm
      evening: number;   // 5pm-9pm
      night: number;     // 9pm-5am
    };
    // Day of week distribution
    dayOfWeek: {
      day: string;
      count: number;
    }[];
    // Peak hour (0-23)
    peakHour: number | null;
    // Peak hour label
    peakHourLabel: string | null;
    // Favorite time period
    favoriteTime: 'morning' | 'afternoon' | 'evening' | 'night' | null;
  } | null;
  
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

    // Basic stats
    const basicStats = await db
      .prepare(`
        SELECT 
          COUNT(*) as total_smokes,
          AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating,
          COUNT(DISTINCT brand) as unique_brands,
          MIN(created_at) as first_checkin,
          MAX(created_at) as last_checkin
        FROM checkins
        WHERE user_id = ?
      `)
      .bind(userId)
      .first<{ total_smokes: number; avg_rating: number | null; unique_brands: number; first_checkin: number | null; last_checkin: number | null }>();

    // Favorite brand
    const favoriteBrand = await db
      .prepare(`
        SELECT brand as name, COUNT(*) as count
        FROM checkins
        WHERE user_id = ?
        GROUP BY brand
        ORDER BY count DESC
        LIMIT 1
      `)
      .bind(userId)
      .first<{ name: string; count: number }>();

    // Top 5 brands
    const topBrandsResult = await db
      .prepare(`
        SELECT 
          brand as name, 
          COUNT(*) as count,
          AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating
        FROM checkins
        WHERE user_id = ?
        GROUP BY brand
        ORDER BY count DESC, avg_rating DESC
        LIMIT 5
      `)
      .bind(userId)
      .all<{ name: string; count: number; avg_rating: number | null }>();

    // Category breakdown
    const categoriesResult = await db
      .prepare(`
        SELECT COALESCE(category, 'cigar') as category, COUNT(*) as count
        FROM checkins
        WHERE user_id = ?
        GROUP BY category
        ORDER BY count DESC
      `)
      .bind(userId)
      .all<{ category: string; count: number }>();

    // Rating distribution
    const ratingResult = await db
      .prepare(`
        SELECT rating, COUNT(*) as count
        FROM checkins
        WHERE user_id = ? AND rating IS NOT NULL
        GROUP BY rating
        ORDER BY rating ASC
      `)
      .bind(userId)
      .all<{ rating: number; count: number }>();

    // Flavor tags (from flavor_notes JSON)
    const flavorResult = await db
      .prepare(`
        SELECT flavor_notes
        FROM checkins
        WHERE user_id = ? AND flavor_notes IS NOT NULL AND flavor_notes != '[]'
      `)
      .bind(userId)
      .all<{ flavor_notes: string }>();

    // Count flavors
    const flavorCounts: Record<string, number> = {};
    for (const row of flavorResult.results || []) {
      try {
        const flavors = JSON.parse(row.flavor_notes) as string[];
        for (const f of flavors) {
          flavorCounts[f] = (flavorCounts[f] || 0) + 1;
        }
      } catch { /* ignore */ }
    }
    const topFlavors = Object.entries(flavorCounts)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Streak calculation
    const streakDates = await db
      .prepare(`
        SELECT DISTINCT date(created_at, 'unixepoch') as checkin_date
        FROM checkins
        WHERE user_id = ?
        ORDER BY checkin_date DESC
      `)
      .bind(userId)
      .all<{ checkin_date: string }>();

    const dates = streakDates.results?.map(r => r.checkin_date) || [];
    const streakInfo = calculateStreak(dates);

    // Social stats - likes given
    const likesGiven = await db
      .prepare(`SELECT COUNT(*) as count FROM likes WHERE user_id = ?`)
      .bind(userId)
      .first<{ count: number }>();

    // Likes received
    const likesReceived = await db
      .prepare(`
        SELECT COUNT(*) as count 
        FROM likes l
        JOIN checkins c ON l.checkin_id = c.id
        WHERE c.user_id = ?
      `)
      .bind(userId)
      .first<{ count: number }>();

    // Comments given
    const commentsGiven = await db
      .prepare(`SELECT COUNT(*) as count FROM comments WHERE user_id = ?`)
      .bind(userId)
      .first<{ count: number }>();

    // Comments received
    const commentsReceived = await db
      .prepare(`
        SELECT COUNT(*) as count 
        FROM comments co
        JOIN checkins c ON co.checkin_id = c.id
        WHERE c.user_id = ? AND co.user_id != ?
      `)
      .bind(userId, userId)
      .first<{ count: number }>();

    // Following/followers
    const following = await db
      .prepare(`SELECT COUNT(*) as count FROM follows WHERE follower_id = ?`)
      .bind(userId)
      .first<{ count: number }>();

    const followers = await db
      .prepare(`SELECT COUNT(*) as count FROM follows WHERE following_id = ?`)
      .bind(userId)
      .first<{ count: number }>();

    // Badges earned
    // (We'll count based on the badge logic - simplified version)
    const badgesEarned = await countBadges(db, userId);

    // Most active day of week
    const mostActiveDay = await db
      .prepare(`
        SELECT 
          CASE strftime('%w', created_at, 'unixepoch')
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
        WHERE user_id = ?
        GROUP BY strftime('%w', created_at, 'unixepoch')
        ORDER BY count DESC
        LIMIT 1
      `)
      .bind(userId)
      .first<{ day_name: string; count: number }>();

    // ===== SMOKE TIME PATTERNS =====
    
    // Time of day distribution (hour-based, then categorized)
    const hourDistribution = await db
      .prepare(`
        SELECT 
          CAST(strftime('%H', created_at, 'unixepoch', 'localtime') AS INTEGER) as hour,
          COUNT(*) as count
        FROM checkins
        WHERE user_id = ?
        GROUP BY hour
        ORDER BY count DESC
      `)
      .bind(userId)
      .all<{ hour: number; count: number }>();

    // Day of week distribution (all days, ordered Sun-Sat)
    const dayOfWeekDistribution = await db
      .prepare(`
        SELECT 
          strftime('%w', created_at, 'unixepoch') as day_num,
          CASE strftime('%w', created_at, 'unixepoch')
            WHEN '0' THEN 'Sun'
            WHEN '1' THEN 'Mon'
            WHEN '2' THEN 'Tue'
            WHEN '3' THEN 'Wed'
            WHEN '4' THEN 'Thu'
            WHEN '5' THEN 'Fri'
            WHEN '6' THEN 'Sat'
          END as day,
          COUNT(*) as count
        FROM checkins
        WHERE user_id = ?
        GROUP BY day_num
        ORDER BY CAST(day_num AS INTEGER)
      `)
      .bind(userId)
      .all<{ day_num: string; day: string; count: number }>();

    // Calculate time patterns
    let timePatterns: MyStatsResponse['timePatterns'] = null;
    
    if ((hourDistribution.results?.length || 0) > 0) {
      const hours = hourDistribution.results || [];
      
      // Categorize into time periods
      const timeOfDay = { morning: 0, afternoon: 0, evening: 0, night: 0 };
      
      for (const h of hours) {
        const hour = h.hour;
        if (hour >= 5 && hour < 12) {
          timeOfDay.morning += h.count;
        } else if (hour >= 12 && hour < 17) {
          timeOfDay.afternoon += h.count;
        } else if (hour >= 17 && hour < 21) {
          timeOfDay.evening += h.count;
        } else {
          timeOfDay.night += h.count;
        }
      }

      // Find peak hour
      const peakHourData = hours[0]; // Already sorted by count DESC
      const peakHour = peakHourData?.hour ?? null;
      
      // Format peak hour label
      let peakHourLabel: string | null = null;
      if (peakHour !== null) {
        const hour12 = peakHour % 12 || 12;
        const ampm = peakHour >= 12 ? 'PM' : 'AM';
        peakHourLabel = `${hour12}${ampm}`;
      }

      // Find favorite time period
      const periods = [
        { name: 'morning' as const, count: timeOfDay.morning },
        { name: 'afternoon' as const, count: timeOfDay.afternoon },
        { name: 'evening' as const, count: timeOfDay.evening },
        { name: 'night' as const, count: timeOfDay.night },
      ];
      const topPeriod = periods.sort((a, b) => b.count - a.count)[0];
      const favoriteTime = topPeriod.count > 0 ? topPeriod.name : null;

      // Day of week array (ensure all 7 days are represented)
      const dayMap: Record<string, number> = {};
      for (const d of (dayOfWeekDistribution.results || [])) {
        dayMap[d.day] = d.count;
      }
      const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => ({
        day,
        count: dayMap[day] || 0
      }));

      timePatterns = {
        timeOfDay,
        dayOfWeek,
        peakHour,
        peakHourLabel,
        favoriteTime,
      };
    }

    // Calculate days since first smoke
    let daysSinceFirstSmoke = 0;
    let firstCheckinDate: string | null = null;
    if (basicStats?.first_checkin) {
      const firstDate = new Date(basicStats.first_checkin * 1000);
      firstCheckinDate = firstDate.toISOString().split('T')[0];
      daysSinceFirstSmoke = Math.floor((Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    const response: MyStatsResponse = {
      totalSmokes: basicStats?.total_smokes || 0,
      daysSinceFirstSmoke,
      avgRating: basicStats?.avg_rating ? Math.round(basicStats.avg_rating * 10) / 10 : null,
      uniqueBrands: basicStats?.unique_brands || 0,
      favoriteBrand: favoriteBrand || null,
      topBrands: topBrandsResult.results?.map(b => ({
        name: b.name,
        count: b.count,
        avgRating: b.avg_rating ? Math.round(b.avg_rating * 10) / 10 : null
      })) || [],
      categories: categoriesResult.results || [],
      ratingDistribution: ratingResult.results || [],
      topFlavors,
      uniqueFlavors: Object.keys(flavorCounts).length,
      currentStreak: streakInfo.current,
      bestStreak: streakInfo.best,
      streakActive: streakInfo.active,
      totalLikesGiven: likesGiven?.count || 0,
      totalLikesReceived: likesReceived?.count || 0,
      totalCommentsGiven: commentsGiven?.count || 0,
      totalCommentsReceived: commentsReceived?.count || 0,
      following: following?.count || 0,
      followers: followers?.count || 0,
      badgesEarned: badgesEarned.earned,
      totalBadges: badgesEarned.total,
      firstCheckinDate,
      mostActiveDay: mostActiveDay?.day_name || null,
      mostActiveMonth: null, // Could add this later
      timePatterns,
    };

    return Response.json(response);
  } catch (error) {
    console.error("MyStats error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

// Streak calculation helper
function calculateStreak(dates: string[]): { current: number; best: number; active: boolean } {
  if (dates.length === 0) {
    return { current: 0, best: 0, active: false };
  }

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  const lastDate = dates[0];
  const streakActive = lastDate === today || lastDate === yesterday;
  
  let currentStreak = 0;
  
  if (streakActive) {
    let expectedDate = lastDate;
    
    for (const date of dates) {
      if (date === expectedDate) {
        currentStreak++;
        const dateObj = new Date(expectedDate + 'T12:00:00Z');
        dateObj.setUTCDate(dateObj.getUTCDate() - 1);
        expectedDate = dateObj.toISOString().split('T')[0];
      } else if (date < expectedDate) {
        break;
      }
    }
  }
  
  let bestStreak = dates.length > 0 ? 1 : 0;
  let tempStreak = 1;
  
  for (let i = 1; i < dates.length; i++) {
    const prevDateObj = new Date(dates[i - 1] + 'T12:00:00Z');
    prevDateObj.setUTCDate(prevDateObj.getUTCDate() - 1);
    const expectedPrev = prevDateObj.toISOString().split('T')[0];
    
    if (expectedPrev === dates[i]) {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  bestStreak = Math.max(bestStreak, currentStreak);
  
  return { current: currentStreak, best: bestStreak, active: streakActive };
}

// Badge counting (simplified - mirrors badges API logic)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countBadges(db: any, userId: string): Promise<{ earned: number; total: number }> {
  const total = 12; // Total badges available
  let earned = 0;

  // Get user stats for badge calculation
  const stats = (await db
    .prepare(`
      SELECT 
        COUNT(*) as total_checkins,
        COUNT(DISTINCT brand) as unique_brands,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star_count,
        SUM(CASE WHEN rating IS NOT NULL THEN 1 ELSE 0 END) as rated_count,
        SUM(CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END) as photo_count
      FROM checkins
      WHERE user_id = ?
    `)
    .bind(userId)
    .first()) as { total_checkins: number; unique_brands: number; five_star_count: number; rated_count: number; photo_count: number } | null;

  const likesGiven = (await db
    .prepare(`SELECT COUNT(*) as count FROM likes WHERE user_id = ?`)
    .bind(userId)
    .first()) as { count: number } | null;

  const followCount = (await db
    .prepare(`SELECT COUNT(*) as count FROM follows WHERE follower_id = ?`)
    .bind(userId)
    .first()) as { count: number } | null;

  const commentCount = (await db
    .prepare(`SELECT COUNT(*) as count FROM comments WHERE user_id = ?`)
    .bind(userId)
    .first()) as { count: number } | null;

  // Count earned badges
  if ((stats?.total_checkins || 0) >= 1) earned++; // First Smoke
  if ((stats?.total_checkins || 0) >= 5) earned++; // Getting Started
  if ((stats?.total_checkins || 0) >= 25) earned++; // Regular
  if ((stats?.total_checkins || 0) >= 100) earned++; // Aficionado
  if ((stats?.total_checkins || 0) >= 500) earned++; // Legend
  if ((stats?.five_star_count || 0) >= 1) earned++; // Five Star
  if ((stats?.rated_count || 0) >= 10) earned++; // Critic
  if ((stats?.photo_count || 0) >= 5) earned++; // Photographer
  if ((likesGiven?.count || 0) >= 1) earned++; // First Love
  if ((followCount?.count || 0) >= 5) earned++; // Socialite
  if ((commentCount?.count || 0) >= 3) earned++; // Commentator
  if ((stats?.unique_brands || 0) >= 10) earned++; // Explorer

  return { earned, total };
}
