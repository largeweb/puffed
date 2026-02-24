import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface SuggestedUser {
  id: string;
  username: string;
  totalSmokes: number;
  commonBrands: number;
  tasteMatchScore: number;
  topBrand?: string;
}

interface SuggestedFollowsResponse {
  suggestions?: SuggestedUser[];
  error?: string;
}

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;
    
    if (!sessionId) {
      return Response.json({ error: "Not authenticated" } as SuggestedFollowsResponse, { status: 401 });
    }
    
    const { env } = getRequestContext();
    const db = env.DB;
    
    // Get current user
    const session = await db.prepare(
      "SELECT user_id FROM sessions WHERE id = ? AND expires_at > unixepoch()"
    ).bind(sessionId).first<{ user_id: string }>();
    
    if (!session) {
      return Response.json({ error: "Session expired" } as SuggestedFollowsResponse, { status: 401 });
    }
    
    const userId = session.user_id;
    
    // Get user's brands
    const userBrands = await db.prepare(`
      SELECT DISTINCT LOWER(brand) as brand FROM checkins WHERE user_id = ?
    `).bind(userId).all<{ brand: string }>();
    
    const myBrands = new Set(userBrands.results?.map(r => r.brand) || []);
    
    // Get all other users not already followed
    const otherUsers = await db.prepare(`
      SELECT 
        u.id,
        u.username,
        COUNT(DISTINCT c.id) as total_smokes,
        (SELECT LOWER(brand) FROM checkins WHERE user_id = u.id GROUP BY LOWER(brand) ORDER BY COUNT(*) DESC LIMIT 1) as top_brand
      FROM users u
      LEFT JOIN checkins c ON c.user_id = u.id
      WHERE u.id != ?
        AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
      GROUP BY u.id
      HAVING total_smokes > 0
      ORDER BY total_smokes DESC
      LIMIT 20
    `).bind(userId, userId).all<{ id: string; username: string; total_smokes: number; top_brand: string | null }>();
    
    if (!otherUsers.results || otherUsers.results.length === 0) {
      return Response.json({ suggestions: [] } as SuggestedFollowsResponse);
    }
    
    // Calculate taste match for each user
    const suggestions: SuggestedUser[] = [];
    
    for (const user of otherUsers.results) {
      // Get this user's brands
      const theirBrandsResult = await db.prepare(`
        SELECT DISTINCT LOWER(brand) as brand FROM checkins WHERE user_id = ?
      `).bind(user.id).all<{ brand: string }>();
      
      const theirBrands = new Set(theirBrandsResult.results?.map(r => r.brand) || []);
      
      // Calculate common brands
      let commonBrands = 0;
      for (const brand of myBrands) {
        if (theirBrands.has(brand)) commonBrands++;
      }
      
      // Calculate taste match score (0-100)
      // Based on: common brands, activity level
      const totalUniqueBrands = new Set([...myBrands, ...theirBrands]).size;
      const brandOverlap = totalUniqueBrands > 0 ? (commonBrands / totalUniqueBrands) * 100 : 0;
      
      // Boost active users slightly
      const activityBonus = Math.min(user.total_smokes * 2, 20);
      
      const tasteMatchScore = Math.round(Math.min(brandOverlap + activityBonus, 100));
      
      suggestions.push({
        id: user.id,
        username: user.username,
        totalSmokes: user.total_smokes,
        commonBrands,
        tasteMatchScore,
        topBrand: user.top_brand || undefined,
      });
    }
    
    // Sort by taste match score, then by common brands
    suggestions.sort((a, b) => {
      if (b.tasteMatchScore !== a.tasteMatchScore) {
        return b.tasteMatchScore - a.tasteMatchScore;
      }
      return b.commonBrands - a.commonBrands;
    });
    
    // Return top 3 suggestions
    return Response.json({ suggestions: suggestions.slice(0, 3) } as SuggestedFollowsResponse);
    
  } catch (error) {
    console.error("Suggested follows error:", error);
    return Response.json({ error: "Server error" } as SuggestedFollowsResponse, { status: 500 });
  }
}
