import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../lib/auth';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  
  const authResult = await verifyAuth(request, db);
  const userId = authResult?.userId || null;

  // Get current week start (Sunday)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekStartTs = Math.floor(weekStart.getTime() / 1000);

  // Get today start
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartTs = Math.floor(todayStart.getTime() / 1000);

  // User's week stats
  let weekSmokes = 0;
  let weekAvgRating = 0;
  let weekTopBrand: string | null = null;
  let weekLikesReceived = 0;
  let weekCommentsReceived = 0;
  let sundaySmokes = 0;

  if (userId) {
    // Week smokes and avg rating
    const weekStats = await db.prepare(`
      SELECT COUNT(*) as count, AVG(rating) as avg_rating
      FROM check_ins
      WHERE user_id = ? AND created_at >= ?
    `).bind(userId, weekStartTs).first<{ count: number; avg_rating: number }>();
    
    weekSmokes = weekStats?.count || 0;
    weekAvgRating = weekStats?.avg_rating || 0;

    // Top brand this week
    const topBrand = await db.prepare(`
      SELECT brand, COUNT(*) as count
      FROM check_ins
      WHERE user_id = ? AND created_at >= ?
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 1
    `).bind(userId, weekStartTs).first<{ brand: string }>();
    weekTopBrand = topBrand?.brand || null;

    // Likes received this week
    const likesResult = await db.prepare(`
      SELECT COUNT(*) as count
      FROM likes l
      JOIN check_ins c ON l.check_in_id = c.id
      WHERE c.user_id = ? AND l.created_at >= ?
    `).bind(userId, weekStartTs).first<{ count: number }>();
    weekLikesReceived = likesResult?.count || 0;

    // Comments received this week
    const commentsResult = await db.prepare(`
      SELECT COUNT(*) as count
      FROM comments cm
      JOIN check_ins c ON cm.check_in_id = c.id
      WHERE c.user_id = ? AND cm.created_at >= ?
    `).bind(userId, weekStartTs).first<{ count: number }>();
    weekCommentsReceived = commentsResult?.count || 0;

    // User's Sunday smokes (all time)
    const userSunday = await db.prepare(`
      SELECT COUNT(*) as count
      FROM check_ins
      WHERE user_id = ? AND strftime('%w', datetime(created_at, 'unixepoch')) = '0'
    `).bind(userId).first<{ count: number }>();
    sundaySmokes = userSunday?.count || 0;
  }

  // Sunday leaderboard (all-time)
  const sundayLeaders = await db.prepare(`
    SELECT u.username, COUNT(*) as count, AVG(c.rating) as avg_rating
    FROM check_ins c
    JOIN users u ON c.user_id = u.id
    WHERE strftime('%w', datetime(c.created_at, 'unixepoch')) = '0'
    GROUP BY c.user_id
    ORDER BY count DESC
    LIMIT 10
  `).all<{ username: string; count: number; avg_rating: number }>();

  // Today's smokers (if Sunday)
  let todaySmokers: Array<{ username: string; brand: string; created_at: number }> = [];
  if (now.getDay() === 0) {
    const todayResult = await db.prepare(`
      SELECT u.username, c.brand, c.created_at
      FROM check_ins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      ORDER BY c.created_at DESC
      LIMIT 10
    `).bind(todayStartTs).all<{ username: string; brand: string; created_at: number }>();
    todaySmokers = todayResult.results || [];
  }

  // Platform Sunday stats
  const platformSunday = await db.prepare(`
    SELECT COUNT(*) as count
    FROM check_ins
    WHERE strftime('%w', datetime(created_at, 'unixepoch')) = '0'
  `).first<{ count: number }>();
  const platformSundaySmokes = platformSunday?.count || 0;

  // Most reflective hour (peak Sunday hour)
  const peakHour = await db.prepare(`
    SELECT CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) as hour, COUNT(*) as count
    FROM check_ins
    WHERE strftime('%w', datetime(created_at, 'unixepoch')) = '0'
    GROUP BY hour
    ORDER BY count DESC
    LIMIT 1
  `).first<{ hour: number }>();
  const mostReflectiveHour = peakHour?.hour ?? null;

  // Sunday top brand
  const sundayBrand = await db.prepare(`
    SELECT brand, COUNT(*) as count
    FROM check_ins
    WHERE strftime('%w', datetime(created_at, 'unixepoch')) = '0'
    GROUP BY brand
    ORDER BY count DESC
    LIMIT 1
  `).first<{ brand: string }>();
  const sundayTopBrand = sundayBrand?.brand || null;

  return NextResponse.json({
    weekSmokes,
    weekAvgRating,
    weekTopBrand,
    weekLikesReceived,
    weekCommentsReceived,
    sundaySmokes,
    sundayLeaders: sundayLeaders.results || [],
    todaySmokers,
    platformSundaySmokes,
    mostReflectiveHour,
    sundayTopBrand,
  });
}
