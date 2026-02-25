import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface SpotStats {
  spot: string;
  count: number;
  unique_smokers: number;
  avg_rating: number;
}

interface AdventurousSmoker {
  user_id: string;
  username: string;
  unique_spots: number;
  total_smokes_with_spot: number;
  favorite_spot: string;
}

interface UserSpotHistory {
  spot: string;
  count: number;
  last_used: number;
  avg_rating: number;
}

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    const { env } = getRequestContext();
    const db = env.DB;

    let userId: string | null = null;
    
    if (sessionId) {
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ?")
        .bind(sessionId)
        .first<{ user_id: string }>();
      userId = session?.user_id || null;
    }

    // Get popular smoke spots across the platform
    const popularSpotsResult = await db.prepare(`
      SELECT 
        smoke_spot as spot,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_smokers,
        ROUND(AVG(rating), 1) as avg_rating
      FROM checkins
      WHERE smoke_spot IS NOT NULL AND smoke_spot != ''
      GROUP BY smoke_spot
      ORDER BY count DESC
      LIMIT 20
    `).all<SpotStats>();

    // Get adventurous smokers leaderboard (most unique spots)
    const adventurousResult = await db.prepare(`
      SELECT 
        c.user_id,
        u.username,
        COUNT(DISTINCT c.smoke_spot) as unique_spots,
        COUNT(*) as total_smokes_with_spot,
        (
          SELECT smoke_spot 
          FROM checkins 
          WHERE user_id = c.user_id AND smoke_spot IS NOT NULL 
          GROUP BY smoke_spot 
          ORDER BY COUNT(*) DESC 
          LIMIT 1
        ) as favorite_spot
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.smoke_spot IS NOT NULL AND c.smoke_spot != ''
      GROUP BY c.user_id
      HAVING unique_spots >= 1
      ORDER BY unique_spots DESC, total_smokes_with_spot DESC
      LIMIT 10
    `).all<AdventurousSmoker>();

    // Get platform stats
    const statsResult = await db.prepare(`
      SELECT 
        COUNT(DISTINCT smoke_spot) as total_unique_spots,
        COUNT(*) as total_smokes_with_spot,
        COUNT(DISTINCT user_id) as users_logging_spots
      FROM checkins
      WHERE smoke_spot IS NOT NULL AND smoke_spot != ''
    `).first<{ total_unique_spots: number; total_smokes_with_spot: number; users_logging_spots: number }>();

    // Get user's personal spot history if logged in
    let userSpots: UserSpotHistory[] = [];
    let userUniqueSpots = 0;
    
    if (userId) {
      const userSpotsResult = await db.prepare(`
        SELECT 
          smoke_spot as spot,
          COUNT(*) as count,
          MAX(created_at) as last_used,
          ROUND(AVG(rating), 1) as avg_rating
        FROM checkins
        WHERE user_id = ? AND smoke_spot IS NOT NULL AND smoke_spot != ''
        GROUP BY smoke_spot
        ORDER BY count DESC
      `).bind(userId).all<UserSpotHistory>();
      
      userSpots = userSpotsResult.results || [];
      userUniqueSpots = userSpots.length;
    }

    // Get recent spot activity (last 24h)
    const recentActivity = await db.prepare(`
      SELECT 
        c.smoke_spot as spot,
        u.username,
        c.brand,
        c.created_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.smoke_spot IS NOT NULL 
        AND c.smoke_spot != ''
        AND c.created_at > ?
      ORDER BY c.created_at DESC
      LIMIT 10
    `).bind(Math.floor(Date.now() / 1000) - 86400).all<{
      spot: string;
      username: string;
      brand: string;
      created_at: number;
    }>();

    // Get spot variety suggestions (spots the user hasn't tried)
    let suggestedSpots: string[] = [];
    if (userId && userSpots.length > 0) {
      const userSpotNames = userSpots.map(s => s.spot);
      const allPopularSpots = popularSpotsResult.results?.map(s => s.spot) || [];
      suggestedSpots = allPopularSpots
        .filter(spot => !userSpotNames.includes(spot))
        .slice(0, 5);
    }

    return Response.json({
      popularSpots: popularSpotsResult.results || [],
      adventurousSmokers: adventurousResult.results || [],
      platformStats: statsResult || { total_unique_spots: 0, total_smokes_with_spot: 0, users_logging_spots: 0 },
      userSpots,
      userUniqueSpots,
      recentActivity: recentActivity.results || [],
      suggestedSpots,
    });
  } catch (error) {
    console.error("Smoke spots explorer error:", error);
    return Response.json({ error: "Failed to load smoke spots data" }, { status: 500 });
  }
}
