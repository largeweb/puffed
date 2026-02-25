import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

// Brand loyalty tiers
const LOYALTY_TIERS = [
  { name: "Newcomer", minSmokes: 1, emoji: "🌱", color: "gray" },
  { name: "Regular", minSmokes: 3, emoji: "⭐", color: "blue" },
  { name: "Fan", minSmokes: 5, emoji: "💙", color: "cyan" },
  { name: "Expert", minSmokes: 10, emoji: "🏅", color: "amber" },
  { name: "Ambassador", minSmokes: 20, emoji: "👑", color: "yellow" },
  { name: "Legend", minSmokes: 50, emoji: "🏆", color: "purple" },
];

function getTier(count: number) {
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    if (count >= LOYALTY_TIERS[i].minSmokes) {
      return LOYALTY_TIERS[i];
    }
  }
  return null;
}

function getNextTier(count: number) {
  for (const tier of LOYALTY_TIERS) {
    if (count < tier.minSmokes) {
      return tier;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    const url = new URL(request.url);
    const targetUsername = url.searchParams.get("username");
    
    let username: string | null = targetUsername;
    
    // If no username specified, get from session
    if (!username) {
      const cookieStore = await cookies();
      const sessionId = cookieStore.get("session")?.value;
      
      if (!sessionId) {
        return NextResponse.json({ error: "Auth required" }, { status: 401 });
      }
      
      const session = await db
        .prepare("SELECT u.username FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ?")
        .bind(sessionId)
        .first<{ username: string }>();
      
      if (!session) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
      }
      
      username = session.username;
    }
    
    // Get user's brand loyalty data
    const result = await db.prepare(`
      SELECT 
        brand,
        COUNT(*) as smoke_count,
        AVG(rating) as avg_rating,
        MIN(created_at) as first_smoke,
        MAX(created_at) as last_smoke
      FROM checkins
      WHERE username = ?
      GROUP BY brand
      ORDER BY smoke_count DESC
    `).bind(username).all();
    
    const brands = (result.results || []).map((row: Record<string, unknown>) => {
      const count = Number(row.smoke_count);
      const currentTier = getTier(count);
      const nextTier = getNextTier(count);
      
      return {
        brand: row.brand,
        smokeCount: count,
        avgRating: row.avg_rating ? Number(Number(row.avg_rating).toFixed(1)) : null,
        firstSmoke: row.first_smoke,
        lastSmoke: row.last_smoke,
        currentTier: currentTier,
        nextTier: nextTier,
        progressToNext: nextTier ? {
          current: count,
          needed: nextTier.minSmokes,
          remaining: nextTier.minSmokes - count,
          percentage: Math.round((count / nextTier.minSmokes) * 100),
        } : null,
      };
    });
    
    // Calculate summary stats
    const totalBrands = brands.length;
    const ambassadorCount = brands.filter((b: { currentTier?: { name: string } | null }) => 
      b.currentTier?.name === "Ambassador" || b.currentTier?.name === "Legend"
    ).length;
    const expertCount = brands.filter((b: { currentTier?: { name: string } | null }) => 
      b.currentTier?.name === "Expert"
    ).length;
    const fanCount = brands.filter((b: { currentTier?: { name: string } | null }) => 
      b.currentTier?.name === "Fan"
    ).length;
    
    // Find closest to next tier
    const closestToLevelUp = brands
      .filter((b: { progressToNext: { remaining: number } | null }) => b.progressToNext && b.progressToNext.remaining <= 3)
      .sort((a: { progressToNext: { remaining: number } | null }, b: { progressToNext: { remaining: number } | null }) => 
        (a.progressToNext?.remaining || 999) - (b.progressToNext?.remaining || 999)
      )
      .slice(0, 3);
    
    return NextResponse.json({
      username,
      brands,
      summary: {
        totalBrands,
        ambassadorCount,
        expertCount,
        fanCount,
        closestToLevelUp,
      },
      tiers: LOYALTY_TIERS,
    });
    
  } catch (error) {
    console.error("Brand loyalty error:", error);
    return NextResponse.json({ error: "Failed to load brand loyalty" }, { status: 500 });
  }
}
