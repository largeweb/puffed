import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface TonightsPick {
  brand: string;
  product?: string;
  reason: string;
  reasonEmoji: string;
  confidence: "perfect" | "strong" | "good";
  lastSmoked?: number; // unix timestamp
  avgRating?: number;
  communityAvgRating?: number;
  timesSmoked: number;
  flavorProfile: string[];
  suggestion: string;
  alternatives: {
    brand: string;
    reason: string;
  }[];
}

const PICK_REASONS = {
  favorite: { emoji: "❤️", text: "Your go-to favorite" },
  highRated: { emoji: "⭐", text: "You rated this highly" },
  missedIt: { emoji: "🔄", text: "Been a while since this one" },
  trending: { emoji: "🔥", text: "Trending in the community" },
  flavorMatch: { emoji: "🎯", text: "Matches your flavor profile" },
  newExplore: { emoji: "🆕", text: "Time to explore something new" },
  communityFav: { emoji: "👥", text: "Community favorite" },
  perfectTiming: { emoji: "🌙", text: "Perfect for tonight" },
};

const EVENING_SUGGESTIONS = [
  "Perfect for winding down after a long day.",
  "Light this up and let the stress melt away.",
  "A classic choice for an evening unwind.",
  "Pair it with your favorite drink and enjoy.",
  "The kind of smoke that makes the night feel right.",
  "Sit back, relax, and savor every puff.",
  "Your evening ritual awaits.",
  "Tonight's the night for something special.",
];

export async function GET() {
  try {
    const { env } = getRequestContext();
    const DB = env.DB;

    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;
    
    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user ID from session
    const sessionRow = await DB.prepare(
      "SELECT user_id FROM sessions WHERE id = ?"
    ).bind(sessionId).first<{ user_id: string }>();

    if (!sessionRow) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = sessionRow.user_id;

    // Get user's smoking history with ratings and flavors
    const userHistory = await DB.prepare(`
      SELECT 
        brand,
        product,
        rating,
        flavor_notes,
        created_at,
        COUNT(*) OVER (PARTITION BY brand) as brand_count
      FROM checkins
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all<{
      brand: string;
      product: string | null;
      rating: number | null;
      flavor_notes: string | null;
      created_at: number;
      brand_count: number;
    }>();

    const checkins = userHistory.results || [];
    
    // If user has no history, suggest trending
    if (checkins.length === 0) {
      const trending = await DB.prepare(`
        SELECT brand, COUNT(*) as count, AVG(rating) as avg_rating
        FROM checkins
        WHERE created_at > ?
        GROUP BY brand
        ORDER BY count DESC
        LIMIT 1
      `).bind(Date.now() - 7 * 24 * 60 * 60 * 1000).first<{
        brand: string;
        count: number;
        avg_rating: number;
      }>();

      if (trending) {
        return NextResponse.json({
          brand: trending.brand,
          reason: PICK_REASONS.trending.text,
          reasonEmoji: PICK_REASONS.trending.emoji,
          confidence: "good",
          communityAvgRating: trending.avg_rating,
          timesSmoked: 0,
          flavorProfile: [],
          suggestion: "Start your journey with what the community loves!",
          alternatives: [],
        });
      }

      return NextResponse.json({
        brand: "Your First Pick",
        reason: "Log a smoke to get personalized picks!",
        reasonEmoji: "🎯",
        confidence: "good",
        timesSmoked: 0,
        flavorProfile: [],
        suggestion: "Check in your first smoke and we'll learn your taste.",
        alternatives: [],
      });
    }

    // Build user profile
    const brandStats = new Map<string, {
      count: number;
      totalRating: number;
      ratingCount: number;
      lastSmoked: number;
      flavors: Set<string>;
      products: Set<string>;
    }>();

    const allFlavors = new Map<string, number>();
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

    for (const c of checkins) {
      const brand = c.brand;
      if (!brandStats.has(brand)) {
        brandStats.set(brand, {
          count: 0,
          totalRating: 0,
          ratingCount: 0,
          lastSmoked: 0,
          flavors: new Set(),
          products: new Set(),
        });
      }
      
      const stats = brandStats.get(brand)!;
      stats.count++;
      if (c.rating) {
        stats.totalRating += c.rating;
        stats.ratingCount++;
      }
      if (c.created_at > stats.lastSmoked) {
        stats.lastSmoked = c.created_at;
      }
      if (c.product) {
        stats.products.add(c.product);
      }
      
      // Parse flavors
      if (c.flavor_notes) {
        try {
          const flavors = JSON.parse(c.flavor_notes) as string[];
          flavors.forEach(f => {
            stats.flavors.add(f);
            allFlavors.set(f, (allFlavors.get(f) || 0) + 1);
          });
        } catch {}
      }
    }

    // Get top flavors for user
    const topFlavors = [...allFlavors.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([f]) => f);

    // Get community trending brands
    const trendingBrands = await DB.prepare(`
      SELECT brand, COUNT(*) as count, AVG(rating) as avg_rating
      FROM checkins
      WHERE created_at > ?
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 10
    `).bind(oneWeekAgo).all<{ brand: string; count: number; avg_rating: number }>();

    const trendingSet = new Set((trendingBrands.results || []).map(b => b.brand.toLowerCase()));
    const trendingMap = new Map((trendingBrands.results || []).map(b => [b.brand.toLowerCase(), b]));

    // Score each brand for tonight
    type PickCandidate = {
      brand: string;
      product?: string;
      score: number;
      reason: keyof typeof PICK_REASONS;
      avgRating?: number;
      communityAvgRating?: number;
      lastSmoked: number;
      timesSmoked: number;
      flavorProfile: string[];
    };

    const candidates: PickCandidate[] = [];

    for (const [brand, stats] of brandStats) {
      const avgRating = stats.ratingCount > 0 ? stats.totalRating / stats.ratingCount : undefined;
      const daysSinceSmoked = (now - stats.lastSmoked) / (24 * 60 * 60 * 1000);
      const isTrending = trendingSet.has(brand.toLowerCase());
      const trendingData = trendingMap.get(brand.toLowerCase());
      
      let score = 0;
      let reason: keyof typeof PICK_REASONS = "favorite";

      // High rating boost (max +30)
      if (avgRating && avgRating >= 4.5) {
        score += 30;
        reason = "highRated";
      } else if (avgRating && avgRating >= 4) {
        score += 20;
        reason = "highRated";
      } else if (avgRating && avgRating >= 3.5) {
        score += 10;
      }

      // Frequency boost - favorites get points (max +20)
      if (stats.count >= 5) {
        score += 20;
        reason = "favorite";
      } else if (stats.count >= 3) {
        score += 15;
      } else if (stats.count >= 2) {
        score += 10;
      }

      // "Miss it" boost - haven't had it in a while (max +25)
      if (stats.count >= 2 && daysSinceSmoked >= 14) {
        score += 25;
        reason = "missedIt";
      } else if (stats.count >= 2 && daysSinceSmoked >= 7) {
        score += 15;
        reason = "missedIt";
      }

      // Trending boost (max +15)
      if (isTrending) {
        score += 15;
        if (reason === "favorite" || reason === "highRated") {
          // Keep original reason for user favorites
        } else {
          reason = "trending";
        }
      }

      // Slight randomness for variety (+0-10)
      score += Math.floor(Math.random() * 10);

      // Evening vibe - slightly prefer brands smoked in evening before
      // (We don't have hour data easily, so skip this for now)

      // Penalty for smoked very recently (within 24h)
      if (daysSinceSmoked < 1) {
        score -= 20;
      } else if (daysSinceSmoked < 3) {
        score -= 10;
      }

      candidates.push({
        brand,
        product: stats.products.size === 1 ? [...stats.products][0] : undefined,
        score,
        reason,
        avgRating,
        communityAvgRating: trendingData?.avg_rating,
        lastSmoked: stats.lastSmoked,
        timesSmoked: stats.count,
        flavorProfile: [...stats.flavors],
      });
    }

    // Sort by score
    candidates.sort((a, b) => b.score - a.score);

    // Pick the top one
    const pick = candidates[0];

    if (!pick) {
      return NextResponse.json({
        brand: "Your First Pick",
        reason: "Log a smoke to get personalized picks!",
        reasonEmoji: "🎯",
        confidence: "good",
        timesSmoked: 0,
        flavorProfile: [],
        suggestion: "Check in your first smoke and we'll learn your taste.",
        alternatives: [],
      });
    }

    // Get 2 alternatives
    const alternatives = candidates.slice(1, 3).map(c => ({
      brand: c.brand,
      reason: PICK_REASONS[c.reason].text,
    }));

    // Determine confidence
    let confidence: "perfect" | "strong" | "good" = "good";
    if (pick.score >= 50) confidence = "perfect";
    else if (pick.score >= 30) confidence = "strong";

    // Random evening suggestion
    const suggestion = EVENING_SUGGESTIONS[Math.floor(Math.random() * EVENING_SUGGESTIONS.length)];

    const response: TonightsPick = {
      brand: pick.brand,
      product: pick.product,
      reason: PICK_REASONS[pick.reason].text,
      reasonEmoji: PICK_REASONS[pick.reason].emoji,
      confidence,
      lastSmoked: pick.lastSmoked,
      avgRating: pick.avgRating,
      communityAvgRating: pick.communityAvgRating,
      timesSmoked: pick.timesSmoked,
      flavorProfile: pick.flavorProfile,
      suggestion,
      alternatives,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Tonight's pick error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
