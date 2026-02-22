import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

interface DailyStat {
  date: string;
  users: number;
  checkins: number;
  likes: number;
  follows: number;
  comments: number;
  reactions: number;
}

interface RecentActivity {
  type: 'signup' | 'checkin' | 'like' | 'follow' | 'comment' | 'reaction';
  username: string;
  details: string;
  created_at: number;
}

export async function GET() {
  const { env } = getRequestContext();
  const db = env.DB;

  try {
    // Get overall stats
    const overallStats = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM checkins) as total_checkins,
        (SELECT COUNT(*) FROM likes) as total_likes,
        (SELECT COUNT(*) FROM follows) as total_follows,
        (SELECT COUNT(*) FROM comments) as total_comments,
        (SELECT COUNT(*) FROM reactions) as total_reactions,
        (SELECT COUNT(*) FROM notifications) as total_notifications
    `).first();

    // Get today's stats (Unix timestamp for today midnight)
    const now = Math.floor(Date.now() / 1000);
    const todayStart = now - (now % 86400);
    const yesterdayStart = todayStart - 86400;
    const weekAgoStart = todayStart - (7 * 86400);

    // Today's activity
    const todayStats = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE created_at >= ?) as new_users,
        (SELECT COUNT(*) FROM checkins WHERE created_at >= ?) as new_checkins,
        (SELECT COUNT(*) FROM likes WHERE created_at >= ?) as new_likes,
        (SELECT COUNT(*) FROM follows WHERE created_at >= ?) as new_follows,
        (SELECT COUNT(*) FROM comments WHERE created_at >= ?) as new_comments,
        (SELECT COUNT(*) FROM reactions WHERE created_at >= ?) as new_reactions
    `).bind(todayStart, todayStart, todayStart, todayStart, todayStart, todayStart).first();

    // Yesterday's activity
    const yesterdayStats = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE created_at >= ? AND created_at < ?) as new_users,
        (SELECT COUNT(*) FROM checkins WHERE created_at >= ? AND created_at < ?) as new_checkins,
        (SELECT COUNT(*) FROM likes WHERE created_at >= ? AND created_at < ?) as new_likes,
        (SELECT COUNT(*) FROM follows WHERE created_at >= ? AND created_at < ?) as new_follows,
        (SELECT COUNT(*) FROM comments WHERE created_at >= ? AND created_at < ?) as new_comments,
        (SELECT COUNT(*) FROM reactions WHERE created_at >= ? AND created_at < ?) as new_reactions
    `).bind(
      yesterdayStart, todayStart,
      yesterdayStart, todayStart,
      yesterdayStart, todayStart,
      yesterdayStart, todayStart,
      yesterdayStart, todayStart,
      yesterdayStart, todayStart
    ).first();

    // This week's activity
    const weekStats = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE created_at >= ?) as new_users,
        (SELECT COUNT(*) FROM checkins WHERE created_at >= ?) as new_checkins,
        (SELECT COUNT(*) FROM likes WHERE created_at >= ?) as new_likes,
        (SELECT COUNT(*) FROM follows WHERE created_at >= ?) as new_follows,
        (SELECT COUNT(*) FROM comments WHERE created_at >= ?) as new_comments,
        (SELECT COUNT(*) FROM reactions WHERE created_at >= ?) as new_reactions
    `).bind(weekAgoStart, weekAgoStart, weekAgoStart, weekAgoStart, weekAgoStart, weekAgoStart).first();

    // Daily stats for the past 7 days
    const dailyStats: DailyStat[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = todayStart - (i * 86400);
      const dayEnd = dayStart + 86400;
      const date = new Date(dayStart * 1000).toISOString().split('T')[0];
      
      const dayStat = await db.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE created_at >= ? AND created_at < ?) as users,
          (SELECT COUNT(*) FROM checkins WHERE created_at >= ? AND created_at < ?) as checkins,
          (SELECT COUNT(*) FROM likes WHERE created_at >= ? AND created_at < ?) as likes,
          (SELECT COUNT(*) FROM follows WHERE created_at >= ? AND created_at < ?) as follows,
          (SELECT COUNT(*) FROM comments WHERE created_at >= ? AND created_at < ?) as comments,
          (SELECT COUNT(*) FROM reactions WHERE created_at >= ? AND created_at < ?) as reactions
      `).bind(
        dayStart, dayEnd,
        dayStart, dayEnd,
        dayStart, dayEnd,
        dayStart, dayEnd,
        dayStart, dayEnd,
        dayStart, dayEnd
      ).first();
      
      dailyStats.push({
        date,
        users: (dayStat?.users as number) || 0,
        checkins: (dayStat?.checkins as number) || 0,
        likes: (dayStat?.likes as number) || 0,
        follows: (dayStat?.follows as number) || 0,
        comments: (dayStat?.comments as number) || 0,
        reactions: (dayStat?.reactions as number) || 0,
      });
    }

    // Recent activity (last 20 events)
    const recentActivity: RecentActivity[] = [];

    // Get recent signups
    const recentSignups = await db.prepare(`
      SELECT username, created_at FROM users ORDER BY created_at DESC LIMIT 5
    `).all();
    for (const row of recentSignups.results) {
      recentActivity.push({
        type: 'signup',
        username: row.username as string,
        details: 'joined Puffed',
        created_at: row.created_at as number,
      });
    }

    // Get recent check-ins
    const recentCheckins = await db.prepare(`
      SELECT u.username, c.brand, c.product, c.created_at 
      FROM checkins c 
      JOIN users u ON c.user_id = u.id 
      ORDER BY c.created_at DESC LIMIT 5
    `).all();
    for (const row of recentCheckins.results) {
      recentActivity.push({
        type: 'checkin',
        username: row.username as string,
        details: `checked in ${row.brand}${row.product ? ` ${row.product}` : ''}`,
        created_at: row.created_at as number,
      });
    }

    // Get recent likes
    const recentLikes = await db.prepare(`
      SELECT u.username, c.brand, l.created_at 
      FROM likes l 
      JOIN users u ON l.user_id = u.id 
      JOIN checkins c ON l.checkin_id = c.id 
      ORDER BY l.created_at DESC LIMIT 5
    `).all();
    for (const row of recentLikes.results) {
      recentActivity.push({
        type: 'like',
        username: row.username as string,
        details: `liked a ${row.brand} check-in`,
        created_at: row.created_at as number,
      });
    }

    // Get recent follows
    const recentFollows = await db.prepare(`
      SELECT follower.username as follower_name, followed.username as followed_name, f.created_at 
      FROM follows f 
      JOIN users follower ON f.follower_id = follower.id 
      JOIN users followed ON f.following_id = followed.id 
      ORDER BY f.created_at DESC LIMIT 5
    `).all();
    for (const row of recentFollows.results) {
      recentActivity.push({
        type: 'follow',
        username: row.follower_name as string,
        details: `followed @${row.followed_name}`,
        created_at: row.created_at as number,
      });
    }

    // Get recent comments
    const recentComments = await db.prepare(`
      SELECT u.username, c.brand, cm.created_at 
      FROM comments cm 
      JOIN users u ON cm.user_id = u.id 
      JOIN checkins c ON cm.checkin_id = c.id 
      ORDER BY cm.created_at DESC LIMIT 5
    `).all();
    for (const row of recentComments.results) {
      recentActivity.push({
        type: 'comment',
        username: row.username as string,
        details: `commented on a ${row.brand} check-in`,
        created_at: row.created_at as number,
      });
    }

    // Get recent reactions
    const recentReactions = await db.prepare(`
      SELECT u.username, c.brand, r.emoji, r.created_at 
      FROM reactions r 
      JOIN users u ON r.user_id = u.id 
      JOIN checkins c ON r.checkin_id = c.id 
      ORDER BY r.created_at DESC LIMIT 5
    `).all();
    for (const row of recentReactions.results) {
      recentActivity.push({
        type: 'reaction',
        username: row.username as string,
        details: `reacted ${row.emoji} to a ${row.brand} check-in`,
        created_at: row.created_at as number,
      });
    }

    // Sort all activity by time
    recentActivity.sort((a, b) => b.created_at - a.created_at);

    // Top brands
    const topBrands = await db.prepare(`
      SELECT brand, COUNT(*) as count, AVG(rating) as avg_rating
      FROM checkins
      WHERE rating IS NOT NULL
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 5
    `).all();

    // Active users (most check-ins)
    const activeUsers = await db.prepare(`
      SELECT u.username, COUNT(c.id) as checkin_count
      FROM users u
      LEFT JOIN checkins c ON c.user_id = u.id
      GROUP BY u.id
      ORDER BY checkin_count DESC
      LIMIT 5
    `).all();

    return NextResponse.json({
      overall: overallStats,
      today: todayStats,
      yesterday: yesterdayStats,
      week: weekStats,
      dailyStats,
      recentActivity: recentActivity.slice(0, 20),
      topBrands: topBrands.results,
      activeUsers: activeUsers.results,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
