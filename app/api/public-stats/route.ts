import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

// GET /api/public-stats
// Returns public platform statistics (no auth required)
export async function GET() {
  const { env } = getRequestContext();
  
  try {
    // Get aggregate stats in parallel
    const [
      userCount,
      checkinCount,
      likeCount,
      followCount,
      commentCount,
      reactionCount,
      brandCount,
      todayCheckins,
      weekCheckins,
    ] = await Promise.all([
      // Total users
      env.DB.prepare("SELECT COUNT(*) as count FROM users").first<{ count: number }>(),
      // Total check-ins
      env.DB.prepare("SELECT COUNT(*) as count FROM checkins").first<{ count: number }>(),
      // Total likes
      env.DB.prepare("SELECT COUNT(*) as count FROM likes").first<{ count: number }>(),
      // Total follows
      env.DB.prepare("SELECT COUNT(*) as count FROM follows").first<{ count: number }>(),
      // Total comments
      env.DB.prepare("SELECT COUNT(*) as count FROM comments").first<{ count: number }>(),
      // Total reactions
      env.DB.prepare("SELECT COUNT(*) as count FROM reactions").first<{ count: number }>(),
      // Unique brands
      env.DB.prepare("SELECT COUNT(DISTINCT LOWER(brand)) as count FROM checkins").first<{ count: number }>(),
      // Check-ins today
      env.DB.prepare(`
        SELECT COUNT(*) as count FROM checkins 
        WHERE created_at >= unixepoch('now', 'start of day')
      `).first<{ count: number }>(),
      // Check-ins this week
      env.DB.prepare(`
        SELECT COUNT(*) as count FROM checkins 
        WHERE created_at >= unixepoch('now', '-7 days')
      `).first<{ count: number }>(),
    ]);

    // Get top 5 brands this week
    const topBrands = await env.DB.prepare(`
      SELECT brand, COUNT(*) as count, AVG(rating) as avg_rating
      FROM checkins
      WHERE created_at >= unixepoch('now', '-7 days')
      GROUP BY LOWER(brand)
      ORDER BY count DESC
      LIMIT 5
    `).all();

    // Get most active users this week (just usernames, no private data)
    const topUsers = await env.DB.prepare(`
      SELECT u.username, COUNT(c.id) as checkin_count
      FROM users u
      JOIN checkins c ON c.user_id = u.id
      WHERE c.created_at >= unixepoch('now', '-7 days')
      GROUP BY u.id
      ORDER BY checkin_count DESC
      LIMIT 5
    `).all();

    // Get most recent check-in timestamp (community pulse)
    const lastCheckin = await env.DB.prepare(`
      SELECT created_at FROM checkins ORDER BY created_at DESC LIMIT 1
    `).first<{ created_at: number }>();

    return NextResponse.json({
      stats: {
        users: userCount?.count || 0,
        checkins: checkinCount?.count || 0,
        likes: likeCount?.count || 0,
        follows: followCount?.count || 0,
        comments: commentCount?.count || 0,
        reactions: reactionCount?.count || 0,
        brands: brandCount?.count || 0,
      },
      activity: {
        checkinsToday: todayCheckins?.count || 0,
        checkinsThisWeek: weekCheckins?.count || 0,
        lastCheckinAt: lastCheckin?.created_at || null,
      },
      trending: {
        topBrands: (topBrands.results || []).map((row: Record<string, unknown>) => ({
          brand: row.brand,
          count: row.count,
          avgRating: row.avg_rating ? Math.round((row.avg_rating as number) * 10) / 10 : null,
        })),
        topUsers: (topUsers.results || []).map((row: Record<string, unknown>) => ({
          username: row.username,
          checkins: row.checkin_count,
        })),
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Public stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
