import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface BrandDiscovered {
  brand: string;
  discovered_at: number;
  total_checkins: number;
  unique_smokers: number;
}

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
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

    // Get brands this user discovered first, with stats
    const result = await db.prepare(`
      SELECT 
        first_brands.brand,
        first_brands.first_checkin as discovered_at,
        (SELECT COUNT(*) FROM checkins c2 WHERE c2.brand = first_brands.brand) as total_checkins,
        (SELECT COUNT(DISTINCT user_id) FROM checkins c3 WHERE c3.brand = first_brands.brand) as unique_smokers
      FROM (
        SELECT brand, user_id, MIN(created_at) as first_checkin
        FROM checkins
        GROUP BY brand
        HAVING user_id = ?
      ) first_brands
      ORDER BY first_brands.first_checkin DESC
    `).bind(userId).all<BrandDiscovered>();

    return Response.json({
      brands: result.results || [],
      count: result.results?.length || 0,
    });
  } catch (error) {
    console.error("Brands discovered error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
