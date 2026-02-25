import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

interface BrandStoryData {
  brand: string;
  firstSmoke: {
    date: string;
    daysAgo: number;
    rating?: number;
  };
  totalSmokes: number;
  avgRating: number | null;
  ratingTrend: "up" | "down" | "stable" | "unknown";
  favoriteTimeOfDay: string;
  favoriteDay: string;
  highestRated: number | null;
  lowestRated: number | null;
  fiveStarCount: number;
  mostRecentSmoke: {
    date: string;
    daysAgo: number;
    rating?: number;
  };
  flavorProfile: string[];
  drinkPairings: string[];
  moodWhenSmoking: string[];
  percentile: number; // How much you smoke this brand vs others
  shareText: string;
}

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brand: string }> }
) {
  const { brand: brandParam } = await params;
  const brand = decodeURIComponent(brandParam);

  try {
    const ctx = getRequestContext();
    const db = ctx.env.DB;

    // Get user from session
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);
    
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = Math.floor(Date.now() / 1000);
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
      .bind(sessionId, now)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user_id;

    // Get all check-ins for this brand by this user
    const checkins = await db
      .prepare(
        `SELECT id, rating, review, created_at, flavor_notes, drink_pairing, mood
         FROM checkins 
         WHERE user_id = ? AND LOWER(brand) = LOWER(?)
         ORDER BY created_at ASC`
      )
      .bind(userId, brand)
      .all();

    if (!checkins.results || checkins.results.length === 0) {
      return NextResponse.json(
        { error: "No check-ins found for this brand" },
        { status: 404 }
      );
    }

    const allCheckins = checkins.results as Array<{
      id: string;
      rating: number | null;
      review: string | null;
      created_at: number;
      flavor_notes: string | null;
      drink_pairing: string | null;
      mood: string | null;
    }>;

    const nowMs = Date.now();
    const firstCheckin = allCheckins[0];
    const lastCheckin = allCheckins[allCheckins.length - 1];

    // Calculate first smoke info
    const firstSmokeDate = new Date(firstCheckin.created_at * 1000);
    const firstSmokeDaysAgo = Math.floor(
      (nowMs - firstSmokeDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate most recent smoke
    const lastSmokeDate = new Date(lastCheckin.created_at * 1000);
    const lastSmokeDaysAgo = Math.floor(
      (nowMs - lastSmokeDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate average rating
    const ratedCheckins = allCheckins.filter((c) => c.rating !== null);
    const avgRating =
      ratedCheckins.length > 0
        ? Math.round(
            (ratedCheckins.reduce((sum, c) => sum + (c.rating || 0), 0) /
              ratedCheckins.length) *
              10
          ) / 10
        : null;

    // Calculate rating trend (compare first half to second half)
    let ratingTrend: "up" | "down" | "stable" | "unknown" = "unknown";
    if (ratedCheckins.length >= 4) {
      const midpoint = Math.floor(ratedCheckins.length / 2);
      const firstHalf = ratedCheckins.slice(0, midpoint);
      const secondHalf = ratedCheckins.slice(midpoint);

      const firstHalfAvg =
        firstHalf.reduce((sum, c) => sum + (c.rating || 0), 0) / firstHalf.length;
      const secondHalfAvg =
        secondHalf.reduce((sum, c) => sum + (c.rating || 0), 0) / secondHalf.length;

      if (secondHalfAvg > firstHalfAvg + 0.3) {
        ratingTrend = "up";
      } else if (secondHalfAvg < firstHalfAvg - 0.3) {
        ratingTrend = "down";
      } else {
        ratingTrend = "stable";
      }
    }

    // Find highest and lowest ratings
    const ratings = ratedCheckins.map((c) => c.rating || 0);
    const highestRated = ratings.length > 0 ? Math.max(...ratings) : null;
    const lowestRated = ratings.length > 0 ? Math.min(...ratings) : null;
    const fiveStarCount = ratedCheckins.filter((c) => c.rating === 5).length;

    // Calculate favorite time of day
    const hourCounts: Record<string, number> = {};
    allCheckins.forEach((c) => {
      const hour = new Date(c.created_at * 1000).getHours();
      let period: string;
      if (hour >= 5 && hour < 12) period = "morning";
      else if (hour >= 12 && hour < 17) period = "afternoon";
      else if (hour >= 17 && hour < 21) period = "evening";
      else period = "night";
      hourCounts[period] = (hourCounts[period] || 0) + 1;
    });
    const favoriteTimeOfDay =
      Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "anytime";

    // Calculate favorite day of week
    const dayCounts: Record<string, number> = {};
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    allCheckins.forEach((c) => {
      const day = dayNames[new Date(c.created_at * 1000).getDay()];
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const favoriteDay =
      Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "any day";

    // Collect flavor profile
    const flavors: Record<string, number> = {};
    allCheckins.forEach((c) => {
      if (c.flavor_notes) {
        const notes = c.flavor_notes.split(",").map((f) => f.trim());
        notes.forEach((f) => {
          flavors[f] = (flavors[f] || 0) + 1;
        });
      }
    });
    const flavorProfile = Object.entries(flavors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((f) => f[0]);

    // Collect drink pairings
    const drinks: Record<string, number> = {};
    allCheckins.forEach((c) => {
      if (c.drink_pairing) {
        drinks[c.drink_pairing] = (drinks[c.drink_pairing] || 0) + 1;
      }
    });
    const drinkPairings = Object.entries(drinks)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((d) => d[0]);

    // Collect moods
    const moods: Record<string, number> = {};
    allCheckins.forEach((c) => {
      if (c.mood) {
        moods[c.mood] = (moods[c.mood] || 0) + 1;
      }
    });
    const moodWhenSmoking = Object.entries(moods)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((m) => m[0]);

    // Calculate percentile (how much this brand vs your other brands)
    const brandCounts = await db
      .prepare(
        `SELECT brand, COUNT(*) as count 
         FROM checkins 
         WHERE user_id = ? 
         GROUP BY LOWER(brand)
         ORDER BY count DESC`
      )
      .bind(userId)
      .all();

    const brandRanks = brandCounts.results as Array<{ brand: string; count: number }>;
    const thisBrandRank = brandRanks.findIndex(
      (b) => b.brand.toLowerCase() === brand.toLowerCase()
    );
    const percentile =
      brandRanks.length > 1
        ? Math.round(((brandRanks.length - thisBrandRank) / brandRanks.length) * 100)
        : 100;

    // Generate share text
    const trendEmoji =
      ratingTrend === "up" ? "📈" : ratingTrend === "down" ? "📉" : "📊";
    const shareText = `My ${brand} Story on Puffed 🚬\n\n` +
      `🎯 ${allCheckins.length} smokes\n` +
      (avgRating ? `⭐ ${avgRating} avg rating ${trendEmoji}\n` : "") +
      `📅 First tried ${firstSmokeDaysAgo} days ago\n` +
      (favoriteTimeOfDay !== "anytime" ? `🕐 Favorite time: ${favoriteTimeOfDay}\n` : "") +
      `\nTrack your smokes at puffed.pages.dev`;

    const data: BrandStoryData = {
      brand,
      firstSmoke: {
        date: firstSmokeDate.toISOString(),
        daysAgo: firstSmokeDaysAgo,
        rating: firstCheckin.rating || undefined,
      },
      totalSmokes: allCheckins.length,
      avgRating,
      ratingTrend,
      favoriteTimeOfDay,
      favoriteDay,
      highestRated,
      lowestRated,
      fiveStarCount,
      mostRecentSmoke: {
        date: lastSmokeDate.toISOString(),
        daysAgo: lastSmokeDaysAgo,
        rating: lastCheckin.rating || undefined,
      },
      flavorProfile,
      drinkPairings,
      moodWhenSmoking,
      percentile,
      shareText,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Brand story error:", error);
    return NextResponse.json(
      { error: "Failed to load brand story" },
      { status: 500 }
    );
  }
}
