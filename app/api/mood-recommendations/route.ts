import { NextRequest } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";
import { MOOD_TAGS } from "@/lib/moods";

export const runtime = "edge";

interface MoodCigar {
  brand: string;
  product: string | null;
  avgRating: number;
  moodCount: number;
  totalCheckins: number;
  uniqueSmokers: number;
  topReview: {
    username: string;
    review: string;
    rating: number;
  } | null;
  topFlavors: string[];
}

interface MoodRecommendationsResponse {
  mood: {
    id: string;
    emoji: string;
    label: string;
  };
  recommendations: MoodCigar[];
  platformStats: {
    totalMoodCheckins: number;
    topMoodBrand: string | null;
    usersWithMood: number;
  };
  userHasTriedTop: boolean;
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    const { searchParams } = new URL(request.url);
    const moodId = searchParams.get("mood");

    if (!moodId) {
      return Response.json({ error: "Mood parameter required" }, { status: 400 });
    }

    const moodTag = MOOD_TAGS.find(m => m.id === moodId);
    if (!moodTag) {
      return Response.json({ error: "Invalid mood" }, { status: 400 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user info if logged in
    let userId: string | null = null;
    let userBrands: string[] = [];

    if (sessionId) {
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ?")
        .bind(sessionId)
        .first<{ user_id: string }>();
      
      if (session) {
        userId = session.user_id;
        
        // Get brands the user has already tried
        const userBrandsResult = await db
          .prepare("SELECT DISTINCT brand FROM checkins WHERE user_id = ?")
          .bind(userId)
          .all<{ brand: string }>();
        
        userBrands = userBrandsResult.results?.map(r => r.brand) || [];
      }
    }

    // Get cigars smoked with this mood, ranked by rating and popularity
    const recommendations = await db
      .prepare(`
        SELECT 
          c.brand,
          c.product,
          COUNT(*) as mood_count,
          AVG(c.rating) as avg_rating,
          COUNT(DISTINCT c.user_id) as unique_smokers,
          GROUP_CONCAT(DISTINCT c.flavors) as all_flavors
        FROM checkins c
        WHERE c.mood = ?
          AND c.rating IS NOT NULL
          AND c.rating >= 3
        GROUP BY c.brand
        HAVING mood_count >= 1
        ORDER BY avg_rating DESC, mood_count DESC
        LIMIT 12
      `)
      .bind(moodId)
      .all<{
        brand: string;
        product: string | null;
        mood_count: number;
        avg_rating: number;
        unique_smokers: number;
        all_flavors: string | null;
      }>();

    // Get total checkins for each brand
    const brandStats: Record<string, number> = {};
    if (recommendations.results && recommendations.results.length > 0) {
      const brands = recommendations.results.map(r => r.brand);
      for (const brand of brands) {
        const total = await db
          .prepare("SELECT COUNT(*) as count FROM checkins WHERE brand = ?")
          .bind(brand)
          .first<{ count: number }>();
        brandStats[brand] = total?.count || 0;
      }
    }

    // Get a top review for each recommendation
    const recsWithReviews: MoodCigar[] = [];
    for (const rec of recommendations.results || []) {
      let topReview: MoodCigar["topReview"] = null;
      
      const reviewResult = await db
        .prepare(`
          SELECT c.review, c.rating, u.username
          FROM checkins c
          JOIN users u ON c.user_id = u.id
          WHERE c.brand = ? AND c.mood = ? AND c.review IS NOT NULL AND c.review != ''
          ORDER BY c.rating DESC, c.created_at DESC
          LIMIT 1
        `)
        .bind(rec.brand, moodId)
        .first<{ review: string; rating: number; username: string }>();
      
      if (reviewResult) {
        topReview = {
          username: reviewResult.username,
          review: reviewResult.review.length > 100 
            ? reviewResult.review.substring(0, 100) + "..." 
            : reviewResult.review,
          rating: reviewResult.rating,
        };
      }

      // Parse flavors
      const flavors: string[] = [];
      if (rec.all_flavors) {
        const flavorParts = rec.all_flavors.split(",").filter(Boolean);
        const flavorCounts: Record<string, number> = {};
        for (const f of flavorParts) {
          const cleaned = f.trim();
          if (cleaned) {
            flavorCounts[cleaned] = (flavorCounts[cleaned] || 0) + 1;
          }
        }
        const sorted = Object.entries(flavorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([f]) => f);
        flavors.push(...sorted);
      }

      recsWithReviews.push({
        brand: rec.brand,
        product: rec.product,
        avgRating: Math.round(rec.avg_rating * 10) / 10,
        moodCount: rec.mood_count,
        totalCheckins: brandStats[rec.brand] || rec.mood_count,
        uniqueSmokers: rec.unique_smokers,
        topReview,
        topFlavors: flavors,
      });
    }

    // Platform stats for this mood
    const platformStats = await db
      .prepare(`
        SELECT 
          COUNT(*) as total_checkins,
          COUNT(DISTINCT user_id) as unique_users
        FROM checkins 
        WHERE mood = ?
      `)
      .bind(moodId)
      .first<{ total_checkins: number; unique_users: number }>();

    const topBrand = await db
      .prepare(`
        SELECT brand, COUNT(*) as count
        FROM checkins
        WHERE mood = ?
        GROUP BY brand
        ORDER BY count DESC
        LIMIT 1
      `)
      .bind(moodId)
      .first<{ brand: string; count: number }>();

    // Check if user has tried the top recommendation
    let userHasTriedTop = false;
    if (recsWithReviews.length > 0 && userBrands.length > 0) {
      userHasTriedTop = userBrands.includes(recsWithReviews[0].brand);
    }

    const response: MoodRecommendationsResponse = {
      mood: {
        id: moodTag.id,
        emoji: moodTag.emoji,
        label: moodTag.label,
      },
      recommendations: recsWithReviews,
      platformStats: {
        totalMoodCheckins: platformStats?.total_checkins || 0,
        topMoodBrand: topBrand?.brand || null,
        usersWithMood: platformStats?.unique_users || 0,
      },
      userHasTriedTop,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Mood recommendations error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
