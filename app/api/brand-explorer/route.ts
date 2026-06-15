import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

interface ExplorerBrand {
  brand: string;
  totalCheckins: number;
  avgRating: number;
  matchingFlavors: string[];
  topProduct?: string;
  recentReview?: string;
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    if (!sessionId) {
      return NextResponse.json({ brands: [] });
    }

    // Get user ID from session
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
      .bind(sessionId, Math.floor(Date.now() / 1000))
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ brands: [] });
    }

    const userId = session.user_id;

    // Get user's flavor preferences (from their check-ins)
    const userFlavors = await db
      .prepare(`
        SELECT flavor_notes 
        FROM checkins 
        WHERE user_id = ? AND flavor_notes IS NOT NULL AND flavor_notes != ''
        ORDER BY created_at DESC
        LIMIT 20
      `)
      .bind(userId)
      .all<{ flavor_notes: string }>();

    // Build a map of flavor frequencies
    const flavorCounts: Record<string, number> = {};
    for (const row of userFlavors.results || []) {
      if (row.flavor_notes) {
        const flavors = row.flavor_notes.split(",").map((f: string) => f.trim());
        for (const f of flavors) {
          if (f) flavorCounts[f] = (flavorCounts[f] || 0) + 1;
        }
      }
    }

    // Get user's top flavors (up to 5)
    const topFlavors = Object.entries(flavorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([flavor]) => flavor);

    // Get brands the user has already tried
    const userBrands = await db
      .prepare(`
        SELECT DISTINCT LOWER(brand) as brand 
        FROM checkins 
        WHERE user_id = ?
      `)
      .bind(userId)
      .all<{ brand: string }>();

    const triedBrands = new Set(
      (userBrands.results || []).map((r: { brand: string }) => r.brand.toLowerCase())
    );

    // Find unexplored brands that match user's flavors
    // Get popular brands the user hasn't tried
    const allBrands = await db
      .prepare(`
        SELECT 
          brand,
          COUNT(*) as total_checkins,
          AVG(rating) as avg_rating,
          GROUP_CONCAT(DISTINCT flavor_notes) as all_flavors,
          MAX(product) as top_product,
          (SELECT review FROM checkins c2 
           WHERE c2.brand = checkins.brand 
           AND c2.review IS NOT NULL AND c2.review != ''
           ORDER BY c2.created_at DESC LIMIT 1) as recent_review
        FROM checkins
        WHERE category = 'cigar'
        GROUP BY LOWER(brand)
        HAVING total_checkins >= 1
        ORDER BY avg_rating DESC, total_checkins DESC
        LIMIT 50
      `)
      .all<{
        brand: string;
        total_checkins: number;
        avg_rating: number;
        all_flavors: string | null;
        top_product: string | null;
        recent_review: string | null;
      }>();

    const explorerBrands: ExplorerBrand[] = [];

    for (const row of allBrands.results || []) {
      // Skip brands user has tried
      if (triedBrands.has(row.brand.toLowerCase())) {
        continue;
      }

      // Check for matching flavors
      const brandFlavors = new Set<string>();
      if (row.all_flavors) {
        const flavorsStr = row.all_flavors.split(",");
        for (const f of flavorsStr) {
          const trimmed = f.trim();
          if (trimmed) brandFlavors.add(trimmed);
        }
      }

      const matchingFlavors = topFlavors.filter((f) => brandFlavors.has(f));

      explorerBrands.push({
        brand: row.brand,
        totalCheckins: row.total_checkins,
        avgRating: Math.round((row.avg_rating || 0) * 10) / 10,
        matchingFlavors,
        topProduct: row.top_product || undefined,
        recentReview: row.recent_review || undefined,
      });
    }

    // Sort by matching flavors count first, then by rating
    explorerBrands.sort((a, b) => {
      if (b.matchingFlavors.length !== a.matchingFlavors.length) {
        return b.matchingFlavors.length - a.matchingFlavors.length;
      }
      return b.avgRating - a.avgRating;
    });

    return NextResponse.json({
      brands: explorerBrands.slice(0, 6),
      userTopFlavors: topFlavors,
    });
  } catch (error) {
    console.error("Brand explorer error:", error);
    return NextResponse.json({ brands: [], error: "Failed to load brands" });
  }
}
