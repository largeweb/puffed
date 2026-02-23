import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface RouletteSpin {
  brand: string;
  avgRating: number;
  totalCheckins: number;
  uniqueSmokers: number;
  lastSmoked: string; // time ago
  reason: string; // Why this brand was suggested
  isNew: boolean; // Whether user has tried this brand
}

interface RouletteResponse {
  spin: RouletteSpin;
  alternatives: RouletteSpin[];
  spinCount?: number; // How many times user has spun today
  error?: string;
}

function getTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

const SPIN_REASONS = [
  "🎲 Random pick from the community!",
  "🔥 Hot pick right now",
  "⭐ Highly rated by smokers",
  "🆕 Recently discovered on the platform",
  "👥 Popular with multiple smokers",
  "💫 Give this one a try!",
  "🎯 Randomly selected just for you",
  "🌟 Community favorite",
];

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    const { env } = getRequestContext();
    const db = env.DB;

    let userId: string | null = null;
    let userBrands: Set<string> = new Set();

    // Get user's brands if logged in
    if (sessionId) {
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ?")
        .bind(sessionId)
        .first<{ user_id: string }>();
      
      if (session) {
        userId = session.user_id;
        
        // Get brands user has already tried
        const userBrandsResult = await db
          .prepare("SELECT DISTINCT brand FROM checkins WHERE user_id = ?")
          .bind(userId)
          .all<{ brand: string }>();
        
        userBrands = new Set((userBrandsResult.results || []).map(b => b.brand.toLowerCase()));
      }
    }

    // Get all brands with stats
    const brandsResult = await db.prepare(`
      SELECT 
        brand,
        AVG(rating) as avg_rating,
        COUNT(*) as total_checkins,
        COUNT(DISTINCT user_id) as unique_smokers,
        MAX(created_at) as last_checkin
      FROM checkins
      GROUP BY brand
      ORDER BY RANDOM()
    `).all<{
      brand: string;
      avg_rating: number;
      total_checkins: number;
      unique_smokers: number;
      last_checkin: number;
    }>();

    const brands = brandsResult.results || [];

    if (brands.length === 0) {
      return Response.json({
        error: "No brands in the community yet. Be the first to log a smoke!",
      } as RouletteResponse, { status: 404 });
    }

    // Separate into new (not tried) and tried brands
    const newBrands = brands.filter(b => !userBrands.has(b.brand.toLowerCase()));
    const triedBrands = brands.filter(b => userBrands.has(b.brand.toLowerCase()));

    // Pick main spin - prefer new brands (70% chance if available)
    let mainBrand;
    let useNewBrand = newBrands.length > 0 && (Math.random() < 0.7 || triedBrands.length === 0);
    
    if (useNewBrand) {
      mainBrand = newBrands[Math.floor(Math.random() * newBrands.length)];
    } else if (triedBrands.length > 0) {
      mainBrand = triedBrands[Math.floor(Math.random() * triedBrands.length)];
    } else {
      mainBrand = brands[Math.floor(Math.random() * brands.length)];
    }

    // Pick a fun reason
    const reason = SPIN_REASONS[Math.floor(Math.random() * SPIN_REASONS.length)];

    const mainSpin: RouletteSpin = {
      brand: mainBrand.brand,
      avgRating: mainBrand.avg_rating ? Math.round(mainBrand.avg_rating * 10) / 10 : 0,
      totalCheckins: mainBrand.total_checkins,
      uniqueSmokers: mainBrand.unique_smokers,
      lastSmoked: getTimeAgo(mainBrand.last_checkin),
      reason,
      isNew: !userBrands.has(mainBrand.brand.toLowerCase()),
    };

    // Get 2 alternatives (different from main)
    const otherBrands = brands.filter(b => b.brand !== mainBrand.brand);
    const alternatives: RouletteSpin[] = [];
    
    for (let i = 0; i < Math.min(2, otherBrands.length); i++) {
      const randomIndex = Math.floor(Math.random() * otherBrands.length);
      const alt = otherBrands.splice(randomIndex, 1)[0];
      alternatives.push({
        brand: alt.brand,
        avgRating: alt.avg_rating ? Math.round(alt.avg_rating * 10) / 10 : 0,
        totalCheckins: alt.total_checkins,
        uniqueSmokers: alt.unique_smokers,
        lastSmoked: getTimeAgo(alt.last_checkin),
        reason: "Alternative option",
        isNew: !userBrands.has(alt.brand.toLowerCase()),
      });
    }

    return Response.json({
      spin: mainSpin,
      alternatives,
    } as RouletteResponse);
  } catch (error) {
    console.error("Smoke roulette error:", error);
    return Response.json({ error: "Failed to spin" } as RouletteResponse, { status: 500 });
  }
}
