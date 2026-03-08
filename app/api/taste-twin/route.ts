import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

interface BrandOverlap {
  username: string;
  shared_brands: string[];
  overlap_count: number;
  is_following: boolean;
}

export const runtime = "edge";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;
    
    if (!userId) {
      return NextResponse.json({ twin: null, reason: "not_logged_in" });
    }
    
    const { env } = getRequestContext();
    const db = env.DB;
    
    // Get user's top brands (brands they've checked in at least once)
    const userBrands = await db.prepare(`
      SELECT DISTINCT LOWER(brand) as brand
      FROM checkins
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).bind(userId).all<{ brand: string }>();
    
    if (!userBrands.results || userBrands.results.length === 0) {
      return NextResponse.json({ twin: null, reason: "no_checkins" });
    }
    
    const brands = userBrands.results.map(b => b.brand);
    
    // Find users with the most brand overlap (excluding self)
    const placeholders = brands.map(() => '?').join(',');
    
    const twins = await db.prepare(`
      SELECT 
        u.username,
        GROUP_CONCAT(DISTINCT LOWER(c.brand)) as shared_brands,
        COUNT(DISTINCT LOWER(c.brand)) as overlap_count,
        CASE WHEN f.follower_id IS NOT NULL THEN 1 ELSE 0 END as is_following
      FROM users u
      JOIN checkins c ON c.user_id = u.id
      LEFT JOIN follows f ON f.following_id = u.id AND f.follower_id = ?
      WHERE u.id != ?
        AND LOWER(c.brand) IN (${placeholders})
      GROUP BY u.id, u.username
      HAVING overlap_count >= 1
      ORDER BY overlap_count DESC, RANDOM()
      LIMIT 5
    `).bind(userId, userId, ...brands).all<{
      username: string;
      shared_brands: string;
      overlap_count: number;
      is_following: number;
    }>();
    
    if (!twins.results || twins.results.length === 0) {
      return NextResponse.json({ twin: null, reason: "no_matches" });
    }
    
    // Prefer users not already following, with highest overlap
    const results: BrandOverlap[] = twins.results.map(t => ({
      username: t.username,
      shared_brands: t.shared_brands.split(',').slice(0, 3),
      overlap_count: t.overlap_count,
      is_following: t.is_following === 1
    }));
    
    // Pick best match: prefer unfollowed users with high overlap
    const unfollowed = results.filter(r => !r.is_following);
    const bestMatch = unfollowed.length > 0 ? unfollowed[0] : results[0];
    
    return NextResponse.json({
      twin: bestMatch,
      all_matches: results.slice(0, 3)
    });
    
  } catch (error) {
    console.error("Taste twin error:", error);
    return NextResponse.json({ twin: null, reason: "error" });
  }
}
