import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "edge";

interface TasteMatchResult {
  score: number; // 0-100
  commonBrands: number;
  totalBrands: number;
  ratingCorrelation: number; // -1 to 1, where 1 is perfect match
  sharedFlavors: string[];
  matchLevel: 'soulmate' | 'great' | 'good' | 'different' | 'opposite';
  details: {
    brandScore: number;
    ratingScore: number;
    flavorScore: number;
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get("userId");

  if (!targetUserId) {
    return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
  }

  try {
    const { env } = getRequestContext();
    const DB = env.DB;

    // Get current user
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const sessionRow = await DB.prepare(
      "SELECT user_id FROM sessions WHERE id = ?"
    ).bind(session).first<{ user_id: string }>();

    if (!sessionRow) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const currentUserId = sessionRow.user_id;

    // Can't compare with yourself
    if (currentUserId === targetUserId) {
      return NextResponse.json({ error: "Cannot compare with yourself" }, { status: 400 });
    }

    // Get all check-ins for both users with ratings and flavors
    const [currentUserCheckins, targetUserCheckins] = await Promise.all([
      DB.prepare(`
        SELECT brand, rating, flavor_notes
        FROM checkins
        WHERE user_id = ?
      `).bind(currentUserId).all<{ brand: string; rating: number | null; flavor_notes: string | null }>(),
      
      DB.prepare(`
        SELECT brand, rating, flavor_notes
        FROM checkins
        WHERE user_id = ?
      `).bind(targetUserId).all<{ brand: string; rating: number | null; flavor_notes: string | null }>(),
    ]);

    const currentCheckins = currentUserCheckins.results || [];
    const targetCheckins = targetUserCheckins.results || [];

    // If either user has no check-ins, can't calculate
    if (currentCheckins.length === 0 || targetCheckins.length === 0) {
      return NextResponse.json({
        score: 0,
        commonBrands: 0,
        totalBrands: 0,
        ratingCorrelation: 0,
        sharedFlavors: [],
        matchLevel: 'different' as const,
        details: { brandScore: 0, ratingScore: 0, flavorScore: 0 },
        noData: true,
      });
    }

    // Build brand sets and rating maps
    const currentBrands = new Set(currentCheckins.map(c => c.brand.toLowerCase()));
    const targetBrands = new Set(targetCheckins.map(c => c.brand.toLowerCase()));
    
    // Get average ratings per brand for each user
    const currentRatings = new Map<string, number[]>();
    const targetRatings = new Map<string, number[]>();
    
    for (const c of currentCheckins) {
      const brand = c.brand.toLowerCase();
      if (c.rating) {
        if (!currentRatings.has(brand)) currentRatings.set(brand, []);
        currentRatings.get(brand)!.push(c.rating);
      }
    }
    
    for (const c of targetCheckins) {
      const brand = c.brand.toLowerCase();
      if (c.rating) {
        if (!targetRatings.has(brand)) targetRatings.set(brand, []);
        targetRatings.get(brand)!.push(c.rating);
      }
    }

    // Calculate average rating per brand
    const avgRating = (ratings: number[]) => ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const currentAvgRatings = new Map<string, number>();
    const targetAvgRatings = new Map<string, number>();
    
    for (const [brand, ratings] of currentRatings) {
      currentAvgRatings.set(brand, avgRating(ratings));
    }
    for (const [brand, ratings] of targetRatings) {
      targetAvgRatings.set(brand, avgRating(ratings));
    }

    // Find common brands
    const commonBrands = [...currentBrands].filter(b => targetBrands.has(b));
    const totalUniqueBrands = new Set([...currentBrands, ...targetBrands]).size;

    // 1. Brand overlap score (0-40 points)
    // More overlap = higher score, but also consider total brands tried
    const overlapRatio = commonBrands.length / Math.max(Math.min(currentBrands.size, targetBrands.size), 1);
    const brandScore = Math.round(overlapRatio * 40);

    // 2. Rating similarity score (0-40 points)
    // For brands both have rated, how similar are their ratings?
    let ratingScore = 0;
    let ratingCorrelation = 0;
    const ratingDiffs: number[] = [];
    
    for (const brand of commonBrands) {
      const currentRating = currentAvgRatings.get(brand);
      const targetRating = targetAvgRatings.get(brand);
      
      if (currentRating !== undefined && targetRating !== undefined) {
        const diff = Math.abs(currentRating - targetRating);
        ratingDiffs.push(diff);
      }
    }

    if (ratingDiffs.length > 0) {
      // Average difference (0-4 range, lower is better)
      const avgDiff = ratingDiffs.reduce((a, b) => a + b, 0) / ratingDiffs.length;
      // Convert to score (0 diff = 40 points, 4 diff = 0 points)
      ratingScore = Math.round(Math.max(0, (4 - avgDiff) / 4 * 40));
      // Correlation: 1 = identical, 0 = 2-star diff average, -1 = opposite (4-star diff)
      ratingCorrelation = Math.round(((4 - avgDiff) / 4 * 2 - 1) * 100) / 100;
    } else if (commonBrands.length > 0) {
      // Have common brands but no ratings to compare - give partial credit
      ratingScore = 20;
      ratingCorrelation = 0;
    }

    // 3. Flavor overlap score (0-20 points)
    const currentFlavors = new Set<string>();
    const targetFlavors = new Set<string>();
    
    for (const c of currentCheckins) {
      if (c.flavor_notes) {
        try {
          const flavors = JSON.parse(c.flavor_notes) as string[];
          flavors.forEach(f => currentFlavors.add(f));
        } catch {}
      }
    }
    
    for (const c of targetCheckins) {
      if (c.flavor_notes) {
        try {
          const flavors = JSON.parse(c.flavor_notes) as string[];
          flavors.forEach(f => targetFlavors.add(f));
        } catch {}
      }
    }

    const sharedFlavors = [...currentFlavors].filter(f => targetFlavors.has(f));
    const totalFlavors = new Set([...currentFlavors, ...targetFlavors]).size;
    
    let flavorScore = 0;
    if (totalFlavors > 0) {
      const flavorOverlapRatio = sharedFlavors.length / Math.max(Math.min(currentFlavors.size, targetFlavors.size), 1);
      flavorScore = Math.round(flavorOverlapRatio * 20);
    } else {
      // No flavor data - give partial credit
      flavorScore = 10;
    }

    // Total score
    const totalScore = brandScore + ratingScore + flavorScore;

    // Match level
    let matchLevel: TasteMatchResult['matchLevel'];
    if (totalScore >= 85) matchLevel = 'soulmate';
    else if (totalScore >= 65) matchLevel = 'great';
    else if (totalScore >= 40) matchLevel = 'good';
    else if (totalScore >= 20) matchLevel = 'different';
    else matchLevel = 'opposite';

    const result: TasteMatchResult = {
      score: totalScore,
      commonBrands: commonBrands.length,
      totalBrands: totalUniqueBrands,
      ratingCorrelation,
      sharedFlavors,
      matchLevel,
      details: {
        brandScore,
        ratingScore,
        flavorScore,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Taste match error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
