import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface FlavorRecommendation {
  brand: string;
  matchScore: number;
  matchingFlavors: string[];
  avgRating: number;
  checkinCount: number;
  topProduct: string | null;
}

interface FlavorRecsResponse {
  userTopFlavors: string[];
  recommendations: FlavorRecommendation[];
  message: string;
}

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = env.DB;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  if (!sessionId) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const session = await db
    .prepare("SELECT user_id FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ user_id: string }>();

  if (!session) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 401 }
    );
  }

  // Get user's flavor preferences from their check-in history
  const userFlavors = await db.prepare(`
    SELECT flavor_notes FROM checkins 
    WHERE user_id = ? AND flavor_notes IS NOT NULL
  `).bind(session.user_id)
    .all<{ flavor_notes: string }>();

  // Count flavor occurrences
  const flavorCounts: Record<string, number> = {};
  for (const row of userFlavors.results || []) {
    try {
      const flavors = JSON.parse(row.flavor_notes) as string[];
      for (const flavor of flavors) {
        flavorCounts[flavor] = (flavorCounts[flavor] || 0) + 1;
      }
    } catch {
      // Skip invalid JSON
    }
  }

  // If user has no flavor history, return generic message
  if (Object.keys(flavorCounts).length === 0) {
    return NextResponse.json({
      userTopFlavors: [],
      recommendations: [],
      message: "Log some smokes with flavor tags to get personalized recommendations!",
    });
  }

  // Get top 5 flavors for this user
  const topFlavors = Object.entries(flavorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([flavor]) => flavor);

  // Get user's brands they've already tried
  const userBrands = await db.prepare(`
    SELECT DISTINCT LOWER(brand) as brand FROM checkins WHERE user_id = ?
  `).bind(session.user_id)
    .all<{ brand: string }>();
  
  const triedBrands = new Set((userBrands.results || []).map(b => b.brand));

  // Find brands with matching flavors that user hasn't tried
  const allBrands = await db.prepare(`
    SELECT 
      brand,
      flavor_notes,
      rating,
      product
    FROM checkins 
    WHERE flavor_notes IS NOT NULL
  `).all<{ brand: string; flavor_notes: string; rating: number; product: string | null }>();

  // Score each brand by flavor match
  const brandScores: Record<string, {
    matchingFlavors: Set<string>;
    totalRating: number;
    count: number;
    products: Record<string, number>;
  }> = {};

  for (const row of allBrands.results || []) {
    const brandLower = row.brand.toLowerCase();
    
    // Skip brands user has already tried
    if (triedBrands.has(brandLower)) continue;

    if (!brandScores[row.brand]) {
      brandScores[row.brand] = {
        matchingFlavors: new Set(),
        totalRating: 0,
        count: 0,
        products: {},
      };
    }

    try {
      const flavors = JSON.parse(row.flavor_notes) as string[];
      for (const flavor of flavors) {
        if (topFlavors.includes(flavor)) {
          brandScores[row.brand].matchingFlavors.add(flavor);
        }
      }
    } catch {
      // Skip invalid JSON
    }

    brandScores[row.brand].totalRating += row.rating;
    brandScores[row.brand].count += 1;
    if (row.product) {
      brandScores[row.brand].products[row.product] = 
        (brandScores[row.brand].products[row.product] || 0) + 1;
    }
  }

  // Convert to recommendations array and sort by match score
  const recommendations: FlavorRecommendation[] = Object.entries(brandScores)
    .filter(([_, data]) => data.matchingFlavors.size > 0)
    .map(([brand, data]) => {
      const matchingFlavors = Array.from(data.matchingFlavors);
      // Score: number of matching flavors * avg rating
      const avgRating = Math.round((data.totalRating / data.count) * 10) / 10;
      const matchScore = Math.round((matchingFlavors.length / topFlavors.length) * avgRating * 20);
      
      // Find most popular product
      const topProduct = Object.entries(data.products)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      return {
        brand,
        matchScore,
        matchingFlavors,
        avgRating,
        checkinCount: data.count,
        topProduct,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 8);

  const response: FlavorRecsResponse = {
    userTopFlavors: topFlavors,
    recommendations,
    message: recommendations.length > 0
      ? `Based on your love of ${topFlavors.slice(0, 3).join(", ")}:`
      : "No new brand recommendations yet. Keep logging to discover more!",
  };

  return NextResponse.json(response);
}
