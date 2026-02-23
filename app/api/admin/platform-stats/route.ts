import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface PlatformStats {
  timestamp: string;
  users: {
    total: number;
    activeToday: number;
    activeThisWeek: number;
    newThisWeek: number;
  };
  checkins: {
    total: number;
    today: number;
    thisWeek: number;
    avgPerUser: number;
  };
  engagement: {
    totalLikes: number;
    totalComments: number;
    totalReactions: number;
    totalFollows: number;
    likesToday: number;
    commentsToday: number;
  };
  content: {
    uniqueBrands: number;
    photosUploaded: number;
    avgRating: number;
  };
  retention: {
    usersWithStreak: number;
    avgStreakLength: number;
    maxStreak: number;
  };
  topUsers: {
    username: string;
    checkins: number;
    streak: number;
  }[];
}

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = env.DB;

  const now = Math.floor(Date.now() / 1000);
  const todayStart = now - (now % 86400);
  const weekStart = now - 7 * 86400;

  // User stats
  const userStats = await db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN last_login >= ? THEN 1 ELSE 0 END) as active_today,
      SUM(CASE WHEN last_login >= ? THEN 1 ELSE 0 END) as active_this_week,
      SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as new_this_week
    FROM users
  `).bind(todayStart, weekStart, weekStart)
    .first<{ total: number; active_today: number; active_this_week: number; new_this_week: number }>();

  // Checkin stats
  const checkinStats = await db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as today,
      SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as this_week,
      COUNT(DISTINCT user_id) as unique_users
    FROM checkins
  `).bind(todayStart, weekStart)
    .first<{ total: number; today: number; this_week: number; unique_users: number }>();

  // Engagement stats
  const likeStats = await db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as today
    FROM likes
  `).bind(todayStart)
    .first<{ total: number; today: number }>();

  const commentStats = await db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as today
    FROM comments
  `).bind(todayStart)
    .first<{ total: number; today: number }>();

  const reactionStats = await db.prepare(`
    SELECT COUNT(*) as total FROM reactions
  `).first<{ total: number }>();

  const followStats = await db.prepare(`
    SELECT COUNT(*) as total FROM follows
  `).first<{ total: number }>();

  // Content stats
  const contentStats = await db.prepare(`
    SELECT 
      COUNT(DISTINCT brand) as unique_brands,
      SUM(CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END) as photos,
      AVG(rating) as avg_rating
    FROM checkins
  `).first<{ unique_brands: number; photos: number; avg_rating: number }>();

  // Streak stats (users with active streak)
  const streakStats = await db.prepare(`
    SELECT 
      COUNT(*) as users_with_streak,
      AVG(streak) as avg_streak,
      MAX(streak) as max_streak
    FROM (
      SELECT user_id, COUNT(*) as streak
      FROM (
        SELECT user_id, date(created_at, 'unixepoch') as smoke_date
        FROM checkins
        WHERE created_at >= ?
        GROUP BY user_id, smoke_date
      )
      GROUP BY user_id
    )
  `).bind(weekStart)
    .first<{ users_with_streak: number; avg_streak: number; max_streak: number }>();

  // Top users
  const topUsers = await db.prepare(`
    SELECT 
      u.username,
      COUNT(c.id) as checkin_count,
      COALESCE(s.current_streak, 0) as streak
    FROM users u
    LEFT JOIN checkins c ON u.id = c.user_id
    LEFT JOIN user_stats s ON u.id = s.user_id
    GROUP BY u.id
    ORDER BY checkin_count DESC
    LIMIT 5
  `).all<{ username: string; checkin_count: number; streak: number }>();

  const stats: PlatformStats = {
    timestamp: new Date().toISOString(),
    users: {
      total: userStats?.total || 0,
      activeToday: userStats?.active_today || 0,
      activeThisWeek: userStats?.active_this_week || 0,
      newThisWeek: userStats?.new_this_week || 0,
    },
    checkins: {
      total: checkinStats?.total || 0,
      today: checkinStats?.today || 0,
      thisWeek: checkinStats?.this_week || 0,
      avgPerUser: checkinStats?.unique_users 
        ? Math.round((checkinStats.total / checkinStats.unique_users) * 10) / 10 
        : 0,
    },
    engagement: {
      totalLikes: likeStats?.total || 0,
      totalComments: commentStats?.total || 0,
      totalReactions: reactionStats?.total || 0,
      totalFollows: followStats?.total || 0,
      likesToday: likeStats?.today || 0,
      commentsToday: commentStats?.today || 0,
    },
    content: {
      uniqueBrands: contentStats?.unique_brands || 0,
      photosUploaded: contentStats?.photos || 0,
      avgRating: contentStats?.avg_rating 
        ? Math.round(contentStats.avg_rating * 10) / 10 
        : 0,
    },
    retention: {
      usersWithStreak: streakStats?.users_with_streak || 0,
      avgStreakLength: streakStats?.avg_streak 
        ? Math.round(streakStats.avg_streak * 10) / 10 
        : 0,
      maxStreak: streakStats?.max_streak || 0,
    },
    topUsers: (topUsers.results || []).map(u => ({
      username: u.username,
      checkins: u.checkin_count,
      streak: u.streak,
    })),
  };

  return NextResponse.json(stats);
}
