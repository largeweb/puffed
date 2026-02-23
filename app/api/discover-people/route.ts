import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface UserSuggestion {
  id: string;
  username: string;
  bio: string | null;
  checkin_count: number;
  follower_count: number;
  following_count: number;
  taste_match?: number;
  common_brands?: string[];
  recent_brand?: string;
  is_following: boolean;
  reason: string;
}

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    const now = Math.floor(Date.now() / 1000);
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
      .bind(sessionId, now)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const currentUserId = session.user_id;

    // Get all users except current user
    const allUsers = await db
      .prepare(`
        SELECT 
          u.id,
          u.username,
          u.bio,
          (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) as checkin_count,
          (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count,
          (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count
        FROM users u
        WHERE u.id != ?
        ORDER BY checkin_count DESC
        LIMIT 50
      `)
      .bind(currentUserId)
      .all<{
        id: string;
        username: string;
        bio: string | null;
        checkin_count: number;
        follower_count: number;
        following_count: number;
      }>();

    if (!allUsers.results || allUsers.results.length === 0) {
      return NextResponse.json({ suggestions: [], message: "No users to discover yet" });
    }

    // Get who current user is following
    const following = await db
      .prepare("SELECT following_id FROM follows WHERE follower_id = ?")
      .bind(currentUserId)
      .all<{ following_id: string }>();
    
    const followingSet = new Set(following.results?.map(f => f.following_id) || []);

    // Get current user's brands for taste matching
    const currentUserBrands = await db
      .prepare(`
        SELECT brand, rating, flavor_notes
        FROM checkins
        WHERE user_id = ?
      `)
      .bind(currentUserId)
      .all<{ brand: string; rating: number | null; flavor_notes: string | null }>();

    const currentBrands = new Set(
      (currentUserBrands.results || []).map(c => c.brand.toLowerCase())
    );

    // Calculate suggestions with reasons
    const suggestions: UserSuggestion[] = [];

    for (const user of allUsers.results) {
      // Get this user's brands
      const userBrands = await db
        .prepare(`
          SELECT brand, rating
          FROM checkins
          WHERE user_id = ?
          ORDER BY created_at DESC
        `)
        .bind(user.id)
        .all<{ brand: string; rating: number | null }>();

      const userBrandSet = new Set(
        (userBrands.results || []).map(c => c.brand.toLowerCase())
      );
      
      // Find common brands
      const commonBrands = [...currentBrands].filter(b => userBrandSet.has(b));
      
      // Calculate simple taste match
      let tasteMatch: number | undefined;
      if (currentBrands.size > 0 && userBrandSet.size > 0) {
        const intersection = commonBrands.length;
        const union = new Set([...currentBrands, ...userBrandSet]).size;
        tasteMatch = Math.round((intersection / Math.min(currentBrands.size, userBrandSet.size)) * 100);
      }

      // Get recent brand
      const recentBrand = userBrands.results?.[0]?.brand;

      // Determine reason for suggestion
      let reason = "Active smoker";
      if (commonBrands.length >= 3) {
        reason = `Smokes ${commonBrands.length} brands you love`;
      } else if (commonBrands.length > 0) {
        reason = `Also smokes ${commonBrands[0]}`;
      } else if (tasteMatch && tasteMatch >= 50) {
        reason = `${tasteMatch}% taste match`;
      } else if (user.checkin_count >= 5) {
        reason = "Very active smoker";
      } else if (user.follower_count >= 3) {
        reason = "Popular in community";
      }

      suggestions.push({
        id: user.id,
        username: user.username,
        bio: user.bio,
        checkin_count: user.checkin_count,
        follower_count: user.follower_count,
        following_count: user.following_count,
        taste_match: tasteMatch,
        common_brands: commonBrands.slice(0, 3),
        recent_brand: recentBrand,
        is_following: followingSet.has(user.id),
        reason,
      });
    }

    // Sort: not following first, then by taste match, then by activity
    suggestions.sort((a, b) => {
      // Not following comes first
      if (a.is_following !== b.is_following) {
        return a.is_following ? 1 : -1;
      }
      // Then by taste match
      if ((a.taste_match || 0) !== (b.taste_match || 0)) {
        return (b.taste_match || 0) - (a.taste_match || 0);
      }
      // Then by check-in count
      return b.checkin_count - a.checkin_count;
    });

    return NextResponse.json({ 
      suggestions: suggestions.slice(0, 20),
      following_count: followingSet.size,
      total_users: allUsers.results.length,
    });

  } catch (error) {
    console.error("Discover people error:", error);
    return NextResponse.json({ error: "Failed to load suggestions" }, { status: 500 });
  }
}
