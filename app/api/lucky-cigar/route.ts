import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

export const runtime = "edge";

interface LuckyCigarData {
  cigar: {
    brand: string;
    product: string | null;
    avgRating: number | null;
    totalCheckins: number;
    uniqueSmokers: number;
    topFlavors: string[];
    recentSmoker: {
      username: string;
      rating: number | null;
      review: string | null;
      timeAgo: string;
    } | null;
  } | null;
  triedBrands: string[];
  communityBrands: number;
  discoveryPercentage: number;
  spinsToday: number;
  message: string;
  error?: string;
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

const MESSAGES = [
  "🎲 The wheel has spoken!",
  "✨ Destiny has chosen...",
  "🔮 The smoke gods decree...",
  "🎰 Your lucky draw is...",
  "🌟 Today's adventure awaits!",
  "🎯 Bullseye on discovery!",
  "🚀 Launch into new flavors!",
  "🔥 Hot pick incoming!",
];

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  
  // Get authenticated user
  const cookieHeader = request.headers.get("cookie");
  const sessionId = parseSessionCookie(cookieHeader);
  
  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  // Get user ID from session
  const sessionRow = await env.DB.prepare(
    "SELECT user_id FROM sessions WHERE id = ?"
  ).bind(sessionId).first<{ user_id: string }>();
  
  if (!sessionRow) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
  
  const userId = sessionRow.user_id;
  
  // Get brands the user has already tried
  const triedBrandsResult = await env.DB.prepare(`
    SELECT DISTINCT LOWER(brand) as brand FROM checkins WHERE user_id = ?
  `).bind(userId).all<{ brand: string }>();
  
  const triedBrands = new Set((triedBrandsResult.results || []).map(r => r.brand.toLowerCase()));
  
  // Get all brands from community that user hasn't tried
  const communityBrands = await env.DB.prepare(`
    SELECT 
      brand,
      AVG(rating) as avg_rating,
      COUNT(*) as total_checkins,
      COUNT(DISTINCT user_id) as unique_smokers,
      MAX(created_at) as last_checkin
    FROM checkins
    WHERE LOWER(brand) NOT IN (
      SELECT DISTINCT LOWER(brand) FROM checkins WHERE user_id = ?
    )
    GROUP BY LOWER(brand)
    HAVING total_checkins >= 1
    ORDER BY RANDOM()
    LIMIT 20
  `).bind(userId).all<{
    brand: string;
    avg_rating: number | null;
    total_checkins: number;
    unique_smokers: number;
    last_checkin: number;
  }>();
  
  // Get total community brands
  const totalBrandsResult = await env.DB.prepare(`
    SELECT COUNT(DISTINCT LOWER(brand)) as count FROM checkins
  `).first<{ count: number }>();
  
  const totalBrands = totalBrandsResult?.count || 0;
  const discoveryPercentage = totalBrands > 0 
    ? Math.round((triedBrands.size / totalBrands) * 100) 
    : 0;
  
  // Track spins today (simple: based on query count in last 24h - could add proper tracking)
  const spinsToday = 1; // Placeholder - could track in a separate table
  
  if (!communityBrands.results || communityBrands.results.length === 0) {
    // User has tried everything or no community brands exist
    return NextResponse.json({
      cigar: null,
      triedBrands: Array.from(triedBrands),
      communityBrands: totalBrands,
      discoveryPercentage: 100,
      spinsToday,
      message: "🏆 You've tried every brand in the community! True connoisseur status!",
    } as LuckyCigarData);
  }
  
  // Pick a random one
  const lucky = communityBrands.results[Math.floor(Math.random() * communityBrands.results.length)];
  
  // Get flavor notes for this brand
  const flavorResult = await env.DB.prepare(`
    SELECT flavor_notes FROM checkins 
    WHERE LOWER(brand) = LOWER(?) AND flavor_notes IS NOT NULL AND flavor_notes != ''
    LIMIT 5
  `).bind(lucky.brand).all<{ flavor_notes: string }>();
  
  // Parse and count flavors
  const flavorCounts: Record<string, number> = {};
  for (const row of flavorResult.results || []) {
    try {
      const flavors = JSON.parse(row.flavor_notes) as string[];
      for (const f of flavors) {
        flavorCounts[f] = (flavorCounts[f] || 0) + 1;
      }
    } catch {
      // Ignore invalid JSON
    }
  }
  const topFlavors = Object.entries(flavorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([f]) => f);
  
  // Get most recent smoker's review
  const recentSmokerResult = await env.DB.prepare(`
    SELECT u.username, c.rating, c.review, c.created_at
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE LOWER(c.brand) = LOWER(?)
    ORDER BY c.created_at DESC
    LIMIT 1
  `).bind(lucky.brand).first<{
    username: string;
    rating: number | null;
    review: string | null;
    created_at: number;
  }>();
  
  const recentSmoker = recentSmokerResult ? {
    username: recentSmokerResult.username,
    rating: recentSmokerResult.rating,
    review: recentSmokerResult.review && recentSmokerResult.review.length > 100 
      ? recentSmokerResult.review.substring(0, 100) + "..." 
      : recentSmokerResult.review,
    timeAgo: getTimeAgo(recentSmokerResult.created_at),
  } : null;
  
  const response: LuckyCigarData = {
    cigar: {
      brand: lucky.brand,
      product: null, // Could add product recommendation later
      avgRating: lucky.avg_rating ? Math.round(lucky.avg_rating * 10) / 10 : null,
      totalCheckins: lucky.total_checkins,
      uniqueSmokers: lucky.unique_smokers,
      topFlavors,
      recentSmoker,
    },
    triedBrands: Array.from(triedBrands),
    communityBrands: totalBrands,
    discoveryPercentage,
    spinsToday,
    message: MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
  };
  
  return NextResponse.json(response);
}
