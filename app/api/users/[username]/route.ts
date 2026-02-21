import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const { env } = getRequestContext();
    const db = env.DB;

    // Get user
    const user = await db
      .prepare("SELECT id, username, created_at FROM users WHERE username = ?")
      .bind(username.toLowerCase())
      .first<{ id: string; username: string; created_at: number }>();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's check-ins with like counts
    const checkins = await db
      .prepare(`
        SELECT c.*, 
          (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count
        FROM checkins c
        WHERE c.user_id = ?
        ORDER BY c.created_at DESC
        LIMIT 50
      `)
      .bind(user.id)
      .all();

    // Get stats
    const stats = await db
      .prepare(`
        SELECT 
          COUNT(*) as total_checkins,
          AVG(rating) as avg_rating,
          COUNT(DISTINCT brand) as unique_brands
        FROM checkins 
        WHERE user_id = ?
      `)
      .bind(user.id)
      .first<{ total_checkins: number; avg_rating: number; unique_brands: number }>();

    return NextResponse.json({
      user: {
        username: user.username,
        joinedAt: user.created_at,
      },
      stats: {
        totalCheckins: stats?.total_checkins || 0,
        avgRating: stats?.avg_rating ? Number(stats.avg_rating.toFixed(1)) : 0,
        uniqueBrands: stats?.unique_brands || 0,
      },
      checkins: checkins.results,
    });
  } catch (error) {
    console.error("User profile error:", error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
