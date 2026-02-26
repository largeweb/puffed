import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";
import type { NextRequest } from "next/server";

export const runtime = "edge";

interface ComparisonStat {
  label: string;
  emoji: string;
  yours: number | string;
  community: number | string;
  yoursFormatted: string;
  communityFormatted: string;
  comparison: "higher" | "lower" | "same" | "different";
  insight: string;
}

interface YouVsCommunityResponse {
  comparisons: ComparisonStat[];
  summary: {
    title: string;
    description: string;
    emoji: string;
  };
  error?: string;
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
      .bind(sessionId, Math.floor(Date.now() / 1000))
      .first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Session expired" }, { status: 401 });
    }

    const userId = session.user_id;

    // Fetch user stats
    const userStatsQuery = `
      SELECT
        AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating,
        COUNT(*) as total_checkins,
        COUNT(DISTINCT brand) as unique_brands,
        AVG(LENGTH(COALESCE(review, ''))) as avg_review_length,
        SUM(CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END) as photos_count
      FROM checkins
      WHERE user_id = ?
    `;

    // Fetch user time stats (peak hour)
    const userTimeQuery = `
      SELECT 
        CAST(strftime('%H', created_at, 'unixepoch', 'localtime') AS INTEGER) as hour,
        COUNT(*) as count
      FROM checkins
      WHERE user_id = ?
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `;

    // Fetch user early/late stats
    const userTimeDistQuery = `
      SELECT
        SUM(CASE WHEN CAST(strftime('%H', created_at, 'unixepoch', 'localtime') AS INTEGER) BETWEEN 5 AND 11 THEN 1 ELSE 0 END) as morning_count,
        SUM(CASE WHEN CAST(strftime('%H', created_at, 'unixepoch', 'localtime') AS INTEGER) >= 22 OR CAST(strftime('%H', created_at, 'unixepoch', 'localtime') AS INTEGER) < 4 THEN 1 ELSE 0 END) as night_count,
        COUNT(*) as total
      FROM checkins
      WHERE user_id = ?
    `;

    // Community stats
    const communityStatsQuery = `
      SELECT
        AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating,
        COUNT(*) as total_checkins,
        COUNT(DISTINCT brand) as total_brands,
        AVG(LENGTH(COALESCE(review, ''))) as avg_review_length,
        SUM(CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as photo_rate
      FROM checkins
    `;

    // Community brands per user
    const communityBrandsPerUserQuery = `
      SELECT AVG(brand_count) as avg_brands_per_user
      FROM (
        SELECT user_id, COUNT(DISTINCT brand) as brand_count
        FROM checkins
        GROUP BY user_id
      )
    `;

    // Community peak hour
    const communityTimeQuery = `
      SELECT 
        CAST(strftime('%H', created_at, 'unixepoch', 'localtime') AS INTEGER) as hour,
        COUNT(*) as count
      FROM checkins
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `;

    // Community time distribution
    const communityTimeDistQuery = `
      SELECT
        SUM(CASE WHEN CAST(strftime('%H', created_at, 'unixepoch', 'localtime') AS INTEGER) BETWEEN 5 AND 11 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as morning_rate,
        SUM(CASE WHEN CAST(strftime('%H', created_at, 'unixepoch', 'localtime') AS INTEGER) >= 22 OR CAST(strftime('%H', created_at, 'unixepoch', 'localtime') AS INTEGER) < 4 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as night_rate
      FROM checkins
    `;

    // User's favorite brand
    const userFavBrandQuery = `
      SELECT brand, COUNT(*) as count
      FROM checkins
      WHERE user_id = ?
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 1
    `;

    // Community's favorite brand
    const communityFavBrandQuery = `
      SELECT brand, COUNT(*) as count
      FROM checkins
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 1
    `;

    const [
      userStats,
      userTime,
      userTimeDist,
      communityStats,
      communityBrandsPerUser,
      communityTime,
      communityTimeDist,
      userFavBrand,
      communityFavBrand,
    ] = await Promise.all([
      db.prepare(userStatsQuery).bind(userId).first<Record<string, number | null>>(),
      db.prepare(userTimeQuery).bind(userId).first<{ hour: number; count: number } | null>(),
      db.prepare(userTimeDistQuery).bind(userId).first<{ morning_count: number; night_count: number; total: number }>(),
      db.prepare(communityStatsQuery).first<Record<string, number | null>>(),
      db.prepare(communityBrandsPerUserQuery).first<{ avg_brands_per_user: number | null }>(),
      db.prepare(communityTimeQuery).first<{ hour: number; count: number } | null>(),
      db.prepare(communityTimeDistQuery).first<{ morning_rate: number; night_rate: number }>(),
      db.prepare(userFavBrandQuery).bind(userId).first<{ brand: string; count: number } | null>(),
      db.prepare(communityFavBrandQuery).first<{ brand: string; count: number } | null>(),
    ]);

    const comparisons: ComparisonStat[] = [];

    // 1. Average Rating
    const yourAvgRating = userStats?.avg_rating || 0;
    const commAvgRating = communityStats?.avg_rating || 0;
    const ratingDiff = yourAvgRating - commAvgRating;
    comparisons.push({
      label: "Average Rating",
      emoji: "⭐",
      yours: yourAvgRating,
      community: commAvgRating,
      yoursFormatted: yourAvgRating ? yourAvgRating.toFixed(1) : "—",
      communityFormatted: commAvgRating ? commAvgRating.toFixed(1) : "—",
      comparison: ratingDiff > 0.2 ? "higher" : ratingDiff < -0.2 ? "lower" : "same",
      insight: ratingDiff > 0.5 ? "You're a generous rater! 🎉" : 
               ratingDiff < -0.5 ? "You're a tough critic! 🧐" : 
               "You rate about average"
    });

    // 2. Brand Diversity
    const yourBrands = userStats?.unique_brands || 0;
    const avgBrandsPerUser = communityBrandsPerUser?.avg_brands_per_user || 1;
    comparisons.push({
      label: "Brands Explored",
      emoji: "🔍",
      yours: yourBrands,
      community: avgBrandsPerUser,
      yoursFormatted: String(yourBrands),
      communityFormatted: avgBrandsPerUser.toFixed(1),
      comparison: yourBrands > avgBrandsPerUser * 1.2 ? "higher" : yourBrands < avgBrandsPerUser * 0.8 ? "lower" : "same",
      insight: yourBrands > avgBrandsPerUser * 1.5 ? "True explorer! 🧭" : 
               yourBrands < avgBrandsPerUser * 0.5 ? "Loyal to your brands 💎" : 
               "Balanced explorer"
    });

    // 3. Peak Smoking Hour
    const yourPeakHour = userTime?.hour ?? 12;
    const commPeakHour = communityTime?.hour ?? 12;
    const formatHour = (h: number) => {
      if (h === 0) return "12 AM";
      if (h < 12) return `${h} AM`;
      if (h === 12) return "12 PM";
      return `${h - 12} PM`;
    };
    comparisons.push({
      label: "Peak Smoke Hour",
      emoji: "🕐",
      yours: yourPeakHour,
      community: commPeakHour,
      yoursFormatted: formatHour(yourPeakHour),
      communityFormatted: formatHour(commPeakHour),
      comparison: yourPeakHour === commPeakHour ? "same" : "different",
      insight: yourPeakHour < 8 ? "Early bird gets the smoke! 🌅" :
               yourPeakHour >= 22 ? "Night owl vibes 🦉" :
               "Classic daytime smoker ☀️"
    });

    // 4. Review Length
    const yourReviewLen = userStats?.avg_review_length || 0;
    const commReviewLen = communityStats?.avg_review_length || 0;
    comparisons.push({
      label: "Review Length",
      emoji: "📝",
      yours: yourReviewLen,
      community: commReviewLen,
      yoursFormatted: `${Math.round(yourReviewLen)} chars`,
      communityFormatted: `${Math.round(commReviewLen)} chars`,
      comparison: yourReviewLen > commReviewLen * 1.3 ? "higher" : yourReviewLen < commReviewLen * 0.7 ? "lower" : "same",
      insight: yourReviewLen > commReviewLen * 2 ? "The storyteller! 📖" :
               yourReviewLen < commReviewLen * 0.5 ? "Short & sweet 💨" :
               "Just right"
    });

    // 5. Photo Rate
    const yourPhotoRate = userStats?.total_checkins ? (userStats?.photos_count || 0) / userStats.total_checkins : 0;
    const commPhotoRate = communityStats?.photo_rate || 0;
    comparisons.push({
      label: "Photos per Smoke",
      emoji: "📸",
      yours: yourPhotoRate,
      community: commPhotoRate,
      yoursFormatted: `${Math.round(yourPhotoRate * 100)}%`,
      communityFormatted: `${Math.round(commPhotoRate * 100)}%`,
      comparison: yourPhotoRate > commPhotoRate * 1.2 ? "higher" : yourPhotoRate < commPhotoRate * 0.8 ? "lower" : "same",
      insight: yourPhotoRate > 0.8 ? "Visual storyteller! 🎨" :
               yourPhotoRate < 0.2 ? "Action over aesthetics 💪" :
               "Nice balance"
    });

    // 6. Night Owl vs Early Bird
    const yourTotal = userTimeDist?.total || 1;
    const yourNightRate = (userTimeDist?.night_count || 0) / yourTotal;
    const yourMorningRate = (userTimeDist?.morning_count || 0) / yourTotal;
    const commNightRate = communityTimeDist?.night_rate || 0;
    
    const yourChronotype = yourNightRate > yourMorningRate ? "night" : yourMorningRate > yourNightRate ? "morning" : "balanced";
    comparisons.push({
      label: "Night Owl Score",
      emoji: "🦉",
      yours: yourNightRate,
      community: commNightRate,
      yoursFormatted: `${Math.round(yourNightRate * 100)}%`,
      communityFormatted: `${Math.round(commNightRate * 100)}%`,
      comparison: yourNightRate > commNightRate * 1.2 ? "higher" : yourNightRate < commNightRate * 0.8 ? "lower" : "same",
      insight: yourChronotype === "night" ? "Creature of the night 🌙" :
               yourChronotype === "morning" ? "Rise and puff ☀️" :
               "Any time is smoke time"
    });

    // 7. Favorite Brand comparison
    if (userFavBrand && communityFavBrand) {
      comparisons.push({
        label: "Go-To Brand",
        emoji: "👑",
        yours: userFavBrand.brand,
        community: communityFavBrand.brand,
        yoursFormatted: userFavBrand.brand,
        communityFormatted: communityFavBrand.brand,
        comparison: userFavBrand.brand.toLowerCase() === communityFavBrand.brand.toLowerCase() ? "same" : "different",
        insight: userFavBrand.brand.toLowerCase() === communityFavBrand.brand.toLowerCase() 
          ? "You're with the majority! 🤝" 
          : "Marching to your own beat 🎸"
      });
    }

    // Generate summary
    const higherCount = comparisons.filter(c => c.comparison === "higher").length;
    const lowerCount = comparisons.filter(c => c.comparison === "lower").length;
    const differentCount = comparisons.filter(c => c.comparison === "different").length;

    let summary: YouVsCommunityResponse["summary"];
    if (higherCount >= 4) {
      summary = {
        title: "The Overachiever",
        description: "You're above average in most categories! Leading the pack.",
        emoji: "🏆"
      };
    } else if (lowerCount >= 4) {
      summary = {
        title: "The Minimalist",
        description: "You keep it simple and focused. Quality over quantity!",
        emoji: "🎯"
      };
    } else if (differentCount >= 3) {
      summary = {
        title: "The Maverick",
        description: "You do things your own way. A true original!",
        emoji: "🌟"
      };
    } else {
      summary = {
        title: "The Balanced Smoker",
        description: "You're right in line with the community. Great taste!",
        emoji: "⚖️"
      };
    }

    return Response.json({
      comparisons,
      summary,
    } as YouVsCommunityResponse);

  } catch (error) {
    console.error("You vs Community error:", error);
    return Response.json({ error: "Failed to load comparison" }, { status: 500 });
  }
}
