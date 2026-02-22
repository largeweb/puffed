import { NextRequest } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = env.DB;

  const now = Math.floor(Date.now() / 1000);
  const todayStart = now - (now % 86400); // Start of UTC day
  const yesterdayStart = todayStart - 86400;
  const weekStart = todayStart - (7 * 86400);

  // Overall stats
  const [
    usersResult,
    checkinsResult,
    likesResult,
    followsResult,
    commentsResult,
    reactionsResult,
    notificationsResult,
  ] = await Promise.all([
    db.prepare("SELECT COUNT(*) as count FROM users").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM checkins").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM likes").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM follows").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM comments").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM reactions").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM notifications").first<{ count: number }>(),
  ]);

  // Today's stats
  const [
    todayUsersResult,
    todayCheckinsResult,
    todayLikesResult,
    todayFollowsResult,
    todayCommentsResult,
    todayReactionsResult,
  ] = await Promise.all([
    db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= ?").bind(todayStart).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM checkins WHERE created_at >= ?").bind(todayStart).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM likes WHERE created_at >= ?").bind(todayStart).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM follows WHERE created_at >= ?").bind(todayStart).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM comments WHERE created_at >= ?").bind(todayStart).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM reactions WHERE created_at >= ?").bind(todayStart).first<{ count: number }>(),
  ]);

  // Yesterday's stats
  const [
    yesterdayUsersResult,
    yesterdayCheckinsResult,
    yesterdayLikesResult,
    yesterdayFollowsResult,
    yesterdayCommentsResult,
    yesterdayReactionsResult,
  ] = await Promise.all([
    db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= ? AND created_at < ?").bind(yesterdayStart, todayStart).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM checkins WHERE created_at >= ? AND created_at < ?").bind(yesterdayStart, todayStart).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM likes WHERE created_at >= ? AND created_at < ?").bind(yesterdayStart, todayStart).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM follows WHERE created_at >= ? AND created_at < ?").bind(yesterdayStart, todayStart).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM comments WHERE created_at >= ? AND created_at < ?").bind(yesterdayStart, todayStart).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM reactions WHERE created_at >= ? AND created_at < ?").bind(yesterdayStart, todayStart).first<{ count: number }>(),
  ]);

  // This week's stats
  const [
    weekUsersResult,
    weekCheckinsResult,
    weekLikesResult,
    weekFollowsResult,
    weekCommentsResult,
    weekReactionsResult,
  ] = await Promise.all([
    db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= ?").bind(weekStart).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM checkins WHERE created_at >= ?").bind(weekStart).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM likes WHERE created_at >= ?").bind(weekStart).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM follows WHERE created_at >= ?").bind(weekStart).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM comments WHERE created_at >= ?").bind(weekStart).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM reactions WHERE created_at >= ?").bind(weekStart).first<{ count: number }>(),
  ]);

  // Daily stats for the last 7 days
  const dailyStats: Array<{
    date: string;
    users: number;
    checkins: number;
    likes: number;
    follows: number;
    comments: number;
    reactions: number;
  }> = [];

  for (let i = 6; i >= 0; i--) {
    const dayStart = todayStart - (i * 86400);
    const dayEnd = dayStart + 86400;
    const dateStr = new Date(dayStart * 1000).toISOString().split('T')[0];

    const [dayUsers, dayCheckins, dayLikes, dayFollows, dayComments, dayReactions] = await Promise.all([
      db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= ? AND created_at < ?").bind(dayStart, dayEnd).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE created_at >= ? AND created_at < ?").bind(dayStart, dayEnd).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM likes WHERE created_at >= ? AND created_at < ?").bind(dayStart, dayEnd).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM follows WHERE created_at >= ? AND created_at < ?").bind(dayStart, dayEnd).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM comments WHERE created_at >= ? AND created_at < ?").bind(dayStart, dayEnd).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM reactions WHERE created_at >= ? AND created_at < ?").bind(dayStart, dayEnd).first<{ count: number }>(),
    ]);

    dailyStats.push({
      date: dateStr,
      users: dayUsers?.count || 0,
      checkins: dayCheckins?.count || 0,
      likes: dayLikes?.count || 0,
      follows: dayFollows?.count || 0,
      comments: dayComments?.count || 0,
      reactions: dayReactions?.count || 0,
    });
  }

  // Top brands
  const topBrandsResult = await db.prepare(`
    SELECT brand, COUNT(*) as count, AVG(rating) as avg_rating
    FROM checkins
    GROUP BY brand
    ORDER BY count DESC
    LIMIT 5
  `).all<{ brand: string; count: number; avg_rating: number }>();

  // Most active users
  const activeUsersResult = await db.prepare(`
    SELECT u.username, COUNT(c.id) as checkin_count
    FROM users u
    LEFT JOIN checkins c ON u.id = c.user_id
    GROUP BY u.id
    ORDER BY checkin_count DESC
    LIMIT 5
  `).all<{ username: string; checkin_count: number }>();

  // Recent activity - combine recent signups, checkins, likes, follows, comments, reactions
  const [recentSignups, recentCheckins, recentLikes, recentFollows, recentComments, recentReactions] = await Promise.all([
    db.prepare(`
      SELECT username, created_at FROM users ORDER BY created_at DESC LIMIT 10
    `).all<{ username: string; created_at: number }>(),
    db.prepare(`
      SELECT u.username, c.brand, c.created_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC LIMIT 10
    `).all<{ username: string; brand: string; created_at: number }>(),
    db.prepare(`
      SELECT u.username, c.brand, l.created_at
      FROM likes l
      JOIN users u ON l.user_id = u.id
      JOIN checkins c ON l.checkin_id = c.id
      ORDER BY l.created_at DESC LIMIT 10
    `).all<{ username: string; brand: string; created_at: number }>(),
    db.prepare(`
      SELECT follower.username as follower_name, followed.username as followed_name, f.created_at
      FROM follows f
      JOIN users follower ON f.follower_id = follower.id
      JOIN users followed ON f.following_id = followed.id
      ORDER BY f.created_at DESC LIMIT 10
    `).all<{ follower_name: string; followed_name: string; created_at: number }>(),
    db.prepare(`
      SELECT u.username, c.brand, cm.created_at
      FROM comments cm
      JOIN users u ON cm.user_id = u.id
      JOIN checkins c ON cm.checkin_id = c.id
      ORDER BY cm.created_at DESC LIMIT 10
    `).all<{ username: string; brand: string; created_at: number }>(),
    db.prepare(`
      SELECT u.username, c.brand, r.emoji, r.created_at
      FROM reactions r
      JOIN users u ON r.user_id = u.id
      JOIN checkins c ON r.checkin_id = c.id
      ORDER BY r.created_at DESC LIMIT 10
    `).all<{ username: string; brand: string; emoji: string; created_at: number }>(),
  ]);

  // Combine and sort recent activity
  const recentActivity: Array<{
    type: 'signup' | 'checkin' | 'like' | 'follow' | 'comment' | 'reaction';
    username: string;
    details: string;
    created_at: number;
  }> = [
    ...(recentSignups.results || []).map((s) => ({
      type: 'signup' as const,
      username: s.username,
      details: 'joined Puffed',
      created_at: s.created_at,
    })),
    ...(recentCheckins.results || []).map((c) => ({
      type: 'checkin' as const,
      username: c.username,
      details: `logged ${c.brand}`,
      created_at: c.created_at,
    })),
    ...(recentLikes.results || []).map((l) => ({
      type: 'like' as const,
      username: l.username,
      details: `liked a ${l.brand} check-in`,
      created_at: l.created_at,
    })),
    ...(recentFollows.results || []).map((f) => ({
      type: 'follow' as const,
      username: f.follower_name,
      details: `followed @${f.followed_name}`,
      created_at: f.created_at,
    })),
    ...(recentComments.results || []).map((c) => ({
      type: 'comment' as const,
      username: c.username,
      details: `commented on ${c.brand}`,
      created_at: c.created_at,
    })),
    ...(recentReactions.results || []).map((r) => ({
      type: 'reaction' as const,
      username: r.username,
      details: `reacted ${r.emoji} to ${r.brand}`,
      created_at: r.created_at,
    })),
  ]
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 20);

  return Response.json({
    overall: {
      total_users: usersResult?.count || 0,
      total_checkins: checkinsResult?.count || 0,
      total_likes: likesResult?.count || 0,
      total_follows: followsResult?.count || 0,
      total_comments: commentsResult?.count || 0,
      total_reactions: reactionsResult?.count || 0,
      total_notifications: notificationsResult?.count || 0,
    },
    today: {
      new_users: todayUsersResult?.count || 0,
      new_checkins: todayCheckinsResult?.count || 0,
      new_likes: todayLikesResult?.count || 0,
      new_follows: todayFollowsResult?.count || 0,
      new_comments: todayCommentsResult?.count || 0,
      new_reactions: todayReactionsResult?.count || 0,
    },
    yesterday: {
      new_users: yesterdayUsersResult?.count || 0,
      new_checkins: yesterdayCheckinsResult?.count || 0,
      new_likes: yesterdayLikesResult?.count || 0,
      new_follows: yesterdayFollowsResult?.count || 0,
      new_comments: yesterdayCommentsResult?.count || 0,
      new_reactions: yesterdayReactionsResult?.count || 0,
    },
    week: {
      new_users: weekUsersResult?.count || 0,
      new_checkins: weekCheckinsResult?.count || 0,
      new_likes: weekLikesResult?.count || 0,
      new_follows: weekFollowsResult?.count || 0,
      new_comments: weekCommentsResult?.count || 0,
      new_reactions: weekReactionsResult?.count || 0,
    },
    dailyStats,
    topBrands: topBrandsResult.results || [],
    activeUsers: activeUsersResult.results || [],
    recentActivity,
  });
}
