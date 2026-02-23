import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// GET /api/platform-stats - Platform health and engagement stats
// Useful for monitoring and CEO-level overview

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 86400;
    const oneWeekAgo = now - 7 * 86400;
    const oneMonthAgo = now - 30 * 86400;

    // Core counts
    const [userCount, checkinCount, brandCount] = await Promise.all([
      db.prepare("SELECT COUNT(*) as count FROM users WHERE username NOT LIKE 'puffed%'").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM checkins").first<{ count: number }>(),
      db.prepare("SELECT COUNT(DISTINCT brand) as count FROM checkins").first<{ count: number }>(),
    ]);

    // Recent activity
    const [recentCheckins, recentUsers, activeUsers24h] = await Promise.all([
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE created_at >= ?").bind(oneDayAgo).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= ? AND username NOT LIKE 'puffed%'").bind(oneWeekAgo).first<{ count: number }>(),
      db.prepare(`
        SELECT COUNT(DISTINCT user_id) as count 
        FROM checkins 
        WHERE created_at >= ?
      `).bind(oneDayAgo).first<{ count: number }>(),
    ]);

    // Engagement stats
    const [totalLikes, totalComments, totalReactions, totalFollows] = await Promise.all([
      db.prepare("SELECT COUNT(*) as count FROM likes").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM comments").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM reactions").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM follows").first<{ count: number }>(),
    ]);

    // Weekly trends
    const [weeklyCheckins, weeklyLikes, weeklyFollows] = await Promise.all([
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE created_at >= ?").bind(oneWeekAgo).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM likes WHERE created_at >= ?").bind(oneWeekAgo).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM follows WHERE created_at >= ?").bind(oneWeekAgo).first<{ count: number }>(),
    ]);

    // Active streaks
    const activeStreaks = await db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM checkins
      WHERE created_at >= ?
      GROUP BY user_id
      HAVING COUNT(DISTINCT DATE(created_at, 'unixepoch')) >= 2
    `).bind(oneWeekAgo).all<{ count: number }>();

    // Top users by activity
    const topUsers = await db.prepare(`
      SELECT u.username, 
             COUNT(c.id) as checkins,
             (SELECT COUNT(*) FROM likes WHERE checkin_id IN (SELECT id FROM checkins WHERE user_id = u.id)) as likes_received
      FROM users u
      LEFT JOIN checkins c ON c.user_id = u.id
      WHERE u.username NOT LIKE 'puffed%'
      GROUP BY u.id
      ORDER BY checkins DESC
      LIMIT 5
    `).all<{ username: string; checkins: number; likes_received: number }>();

    // Calculate averages
    const totalUsers = userCount?.count || 0;
    const totalCheckins = checkinCount?.count || 0;

    return NextResponse.json({
      overview: {
        total_users: totalUsers,
        total_checkins: totalCheckins,
        unique_brands: brandCount?.count || 0,
        checkins_per_user: totalUsers > 0 ? Math.round((totalCheckins / totalUsers) * 10) / 10 : 0,
      },
      engagement: {
        total_likes: totalLikes?.count || 0,
        total_comments: totalComments?.count || 0,
        total_reactions: totalReactions?.count || 0,
        total_follows: totalFollows?.count || 0,
      },
      recent_24h: {
        checkins: recentCheckins?.count || 0,
        active_users: activeUsers24h?.count || 0,
      },
      weekly: {
        checkins: weeklyCheckins?.count || 0,
        likes: weeklyLikes?.count || 0,
        follows: weeklyFollows?.count || 0,
        new_users: recentUsers?.count || 0,
      },
      health: {
        users_with_active_streaks: activeStreaks.results?.length || 0,
        engagement_rate: totalCheckins > 0 
          ? Math.round(((totalLikes?.count || 0) + (totalComments?.count || 0)) / totalCheckins * 100) 
          : 0,
      },
      top_users: topUsers.results || [],
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Platform stats error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch stats",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
