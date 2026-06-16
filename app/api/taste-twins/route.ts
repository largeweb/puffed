import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface TasteTwin {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  sharedFlavors: string[];
  matchScore: number;
  totalCheckins: number;
  isFollowing: boolean;
}

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Session expired" }, { status: 401 });
    }

    const userId = session.user_id;

    // Get current user's flavor profile from their check-ins
    const userFlavors = await db
      .prepare(`
        SELECT flavor_tags
        FROM checkins 
        WHERE user_id = ? AND flavor_tags IS NOT NULL AND flavor_tags != ''
      `)
      .bind(userId)
      .all<{ flavor_tags: string }>();

    if (!userFlavors.results || userFlavors.results.length === 0) {
      return Response.json({
        twins: [],
        userTopFlavors: [],
        message: "Log some smokes with flavor tags to find your taste twins!"
      });
    }

    // Count user's flavor frequencies
    const userFlavorCounts = new Map<string, number>();
    for (const row of userFlavors.results) {
      const flavors = row.flavor_tags.split(",").filter(Boolean);
      for (const flavor of flavors) {
        userFlavorCounts.set(flavor.trim(), (userFlavorCounts.get(flavor.trim()) || 0) + 1);
      }
    }

    // Get user's top 5 flavors
    const userTopFlavors = Array.from(userFlavorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([flavor]) => flavor);

    if (userTopFlavors.length < 2) {
      return Response.json({
        twins: [],
        userTopFlavors,
        message: "Log a few more smokes with flavors to find your taste twins!"
      });
    }

    // Find other users with similar flavors
    const otherUsersFlavors = await db
      .prepare(`
        SELECT 
          c.user_id,
          u.username,
          u.display_name,
          u.avatar_url,
          GROUP_CONCAT(c.flavor_tags) as all_flavors,
          COUNT(c.id) as total_checkins
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE c.user_id != ? 
          AND c.flavor_tags IS NOT NULL 
          AND c.flavor_tags != ''
        GROUP BY c.user_id
        HAVING total_checkins >= 2
      `)
      .bind(userId)
      .all<{ 
        user_id: string; 
        username: string; 
        display_name: string | null;
        avatar_url: string | null;
        all_flavors: string; 
        total_checkins: number;
      }>();

    // Get who the user is following
    const followingResult = await db
      .prepare("SELECT following_id FROM follows WHERE follower_id = ?")
      .bind(userId)
      .all<{ following_id: string }>();
    
    const followingSet = new Set(followingResult.results?.map(r => r.following_id) || []);

    // Calculate match scores
    const twins: TasteTwin[] = [];

    for (const otherUser of otherUsersFlavors.results || []) {
      // Parse all their flavors
      const otherFlavorCounts = new Map<string, number>();
      const allFlavors = otherUser.all_flavors.split(",").filter(Boolean);
      for (const flavor of allFlavors) {
        otherFlavorCounts.set(flavor.trim(), (otherFlavorCounts.get(flavor.trim()) || 0) + 1);
      }

      // Find shared flavors from user's top flavors
      const sharedFlavors = userTopFlavors.filter(f => otherFlavorCounts.has(f));
      
      if (sharedFlavors.length >= 2) {
        // Calculate match score based on shared flavors and their frequency
        let matchScore = 0;
        for (const flavor of sharedFlavors) {
          const userFreq = userFlavorCounts.get(flavor) || 0;
          const otherFreq = otherFlavorCounts.get(flavor) || 0;
          matchScore += Math.min(userFreq, otherFreq);
        }
        // Normalize and boost by number of shared flavors
        matchScore = Math.round((matchScore / userTopFlavors.length) * 10 + sharedFlavors.length * 5);
        matchScore = Math.min(100, matchScore);

        twins.push({
          userId: otherUser.user_id,
          username: otherUser.username,
          displayName: otherUser.display_name,
          avatarUrl: otherUser.avatar_url,
          sharedFlavors,
          matchScore,
          totalCheckins: otherUser.total_checkins,
          isFollowing: followingSet.has(otherUser.user_id)
        });
      }
    }

    // Sort by match score, then by not-following (to prioritize discovery)
    twins.sort((a, b) => {
      if (a.isFollowing !== b.isFollowing) {
        return a.isFollowing ? 1 : -1; // Non-following first
      }
      return b.matchScore - a.matchScore;
    });

    return Response.json({
      twins: twins.slice(0, 10),
      userTopFlavors,
      message: twins.length > 0 ? null : "No taste twins found yet. The community is growing!"
    });
  } catch (error) {
    console.error("Taste twins error:", error);
    return Response.json({ error: "Failed to find taste twins" }, { status: 500 });
  }
}
