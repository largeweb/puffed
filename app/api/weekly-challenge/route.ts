import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function getWeekBounds(): { start: number; end: number } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  
  // Start of week (Sunday 00:00:00)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  
  // End of week (Saturday 23:59:59)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return {
    start: Math.floor(startOfWeek.getTime() / 1000),
    end: Math.floor(endOfWeek.getTime() / 1000),
  };
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { env } = getRequestContext();
    const DB = env.DB;

    // Auth check
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const sessionRow = await DB.prepare(
      "SELECT user_id FROM sessions WHERE id = ?"
    ).bind(session).first<{ user_id: string }>();

    if (!sessionRow) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = sessionRow.user_id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "checkins";
    
    const { start, end } = getWeekBounds();

    let progress = 0;

    switch (type) {
      case "checkins": {
        // Count check-ins this week
        const result = await DB.prepare(
          "SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND created_at >= ? AND created_at <= ?"
        ).bind(userId, start, end).first<{ count: number }>();
        progress = result?.count || 0;
        break;
      }

      case "newBrands": {
        // Count brands logged this week that weren't logged before this week
        const result = await DB.prepare(`
          SELECT COUNT(DISTINCT c.brand) as count 
          FROM checkins c 
          WHERE c.user_id = ? 
            AND c.created_at >= ? 
            AND c.created_at <= ?
            AND c.brand NOT IN (
              SELECT DISTINCT brand FROM checkins 
              WHERE user_id = ? AND created_at < ?
            )
        `).bind(userId, start, end, userId, start).first<{ count: number }>();
        progress = result?.count || 0;
        break;
      }

      case "ratings": {
        // Count 5-star ratings this week
        const result = await DB.prepare(
          "SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND created_at >= ? AND created_at <= ? AND rating = 5"
        ).bind(userId, start, end).first<{ count: number }>();
        progress = result?.count || 0;
        break;
      }

      case "social": {
        // Count likes + comments given this week
        const [likes, comments] = await Promise.all([
          DB.prepare(
            "SELECT COUNT(*) as count FROM likes WHERE user_id = ? AND created_at >= ? AND created_at <= ?"
          ).bind(userId, start, end).first<{ count: number }>(),
          DB.prepare(
            "SELECT COUNT(*) as count FROM comments WHERE user_id = ? AND created_at >= ? AND created_at <= ?"
          ).bind(userId, start, end).first<{ count: number }>(),
        ]);
        progress = (likes?.count || 0) + (comments?.count || 0);
        break;
      }

      case "flavors": {
        // Count unique flavors tagged this week
        const result = await DB.prepare(`
          SELECT COUNT(DISTINCT cft.flavor_id) as count 
          FROM checkin_flavor_tags cft
          JOIN checkins c ON cft.checkin_id = c.id
          WHERE c.user_id = ? AND c.created_at >= ? AND c.created_at <= ?
        `).bind(userId, start, end).first<{ count: number }>();
        progress = result?.count || 0;
        break;
      }

      default:
        progress = 0;
    }

    return NextResponse.json({ progress, type });
  } catch (error) {
    console.error("Weekly challenge error:", error);
    return NextResponse.json({ progress: 0, type: "error" });
  }
}
