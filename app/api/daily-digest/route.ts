import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const session = await verifySession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;
    const userId = session.userId;

    // Get user info
    const user = await db.prepare(
      'SELECT username, streak, longest_streak FROM users WHERE id = ?'
    ).bind(userId).first() as { username: string; streak: number; longest_streak: number } | null;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get today's date boundaries (UTC)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
    const todayEnd = todayStart + 86400;

    // This week (Monday start)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset).getTime() / 1000;
    
    // Last week
    const lastWeekStart = weekStart - (7 * 86400);
    const lastWeekEnd = weekStart;

    // User's check-ins this week
    const thisWeekCheckins = await db.prepare(
      'SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND created_at >= ?'
    ).bind(userId, weekStart).first() as { count: number };

    // User's check-ins last week
    const lastWeekCheckins = await db.prepare(
      'SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND created_at >= ? AND created_at < ?'
    ).bind(userId, lastWeekStart, lastWeekEnd).first() as { count: number };

    // User's average rating this week vs last week
    const thisWeekAvg = await db.prepare(
      'SELECT AVG(rating) as avg FROM checkins WHERE user_id = ? AND created_at >= ? AND rating IS NOT NULL'
    ).bind(userId, weekStart).first() as { avg: number | null };

    const lastWeekAvg = await db.prepare(
      'SELECT AVG(rating) as avg FROM checkins WHERE user_id = ? AND created_at >= ? AND created_at < ? AND rating IS NOT NULL'
    ).bind(userId, lastWeekStart, lastWeekEnd).first() as { avg: number | null };

    // Today's check-ins for user
    const todayCheckins = await db.prepare(
      'SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND created_at >= ?'
    ).bind(userId, todayStart).first() as { count: number };

    // Community activity today
    const communityToday = await db.prepare(
      'SELECT COUNT(*) as checkins, COUNT(DISTINCT user_id) as users FROM checkins WHERE created_at >= ?'
    ).bind(todayStart).first() as { checkins: number; users: number };

    // Active smokers this morning (last 4 hours)
    const fourHoursAgo = Math.floor(Date.now() / 1000) - (4 * 3600);
    const morningSmokersResult = await db.prepare(`
      SELECT DISTINCT u.username, c.brand, c.created_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      ORDER BY c.created_at DESC
      LIMIT 5
    `).bind(fourHoursAgo).all();
    const morningSmokers = morningSmokersResult.results || [];

    // User's most smoked brand (for suggestion)
    const topBrandResult = await db.prepare(`
      SELECT brand, COUNT(*) as count, AVG(rating) as avg_rating
      FROM checkins
      WHERE user_id = ?
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 3
    `).bind(userId).all();
    const topBrands = topBrandResult.results || [];

    // Featured check-in of the day (deterministic)
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    const featuredResult = await db.prepare(`
      SELECT c.id, c.brand, c.product, c.rating, c.image_url, c.review,
             u.username,
             (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as likes
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.image_url IS NOT NULL AND c.rating >= 4
      ORDER BY c.id
      LIMIT 1 OFFSET ?
    `).bind(dayOfYear % 50).first() as {
      id: number;
      brand: string;
      product: string | null;
      rating: number;
      image_url: string;
      review: string | null;
      username: string;
      likes: number;
    } | null;

    // Weekly goals progress (simplified)
    const weeklyGoalTarget = Math.max(3, Math.round((lastWeekCheckins.count || 3) * 1.1));
    const weeklyProgress = Math.min(100, Math.round((thisWeekCheckins.count / weeklyGoalTarget) * 100));

    // Get hour for time-appropriate greeting
    const hour = now.getHours();
    let greeting = 'Good morning';
    let timeEmoji = '☀️';
    if (hour >= 12 && hour < 17) {
      greeting = 'Good afternoon';
      timeEmoji = '🌤️';
    } else if (hour >= 17 && hour < 21) {
      greeting = 'Good evening';
      timeEmoji = '🌅';
    } else if (hour >= 21 || hour < 5) {
      greeting = 'Good night';
      timeEmoji = '🌙';
    }

    // Calculate week comparison
    const weekChange = thisWeekCheckins.count - (lastWeekCheckins.count || 0);
    const ratingChange = (thisWeekAvg.avg || 0) - (lastWeekAvg.avg || 0);

    return NextResponse.json({
      greeting: `${greeting}, ${user.username}!`,
      timeEmoji,
      streak: {
        current: user.streak || 0,
        longest: user.longest_streak || 0,
        atRisk: user.streak > 0 && todayCheckins.count === 0
      },
      today: {
        yourSmokes: todayCheckins.count,
        communitySmokes: communityToday.checkins,
        activeUsers: communityToday.users
      },
      weekComparison: {
        thisWeek: thisWeekCheckins.count,
        lastWeek: lastWeekCheckins.count || 0,
        change: weekChange,
        percentChange: lastWeekCheckins.count > 0 
          ? Math.round((weekChange / lastWeekCheckins.count) * 100) 
          : (thisWeekCheckins.count > 0 ? 100 : 0)
      },
      ratingTrend: {
        thisWeekAvg: thisWeekAvg.avg ? Number(thisWeekAvg.avg.toFixed(1)) : null,
        lastWeekAvg: lastWeekAvg.avg ? Number(lastWeekAvg.avg.toFixed(1)) : null,
        change: ratingChange ? Number(ratingChange.toFixed(1)) : 0
      },
      morningSmokers: morningSmokers.map((s: Record<string, unknown>) => ({
        username: s.username,
        brand: s.brand,
        timeAgo: getTimeAgo(s.created_at as number)
      })),
      suggestion: topBrands.length > 0 ? {
        brand: (topBrands[0] as Record<string, unknown>).brand,
        reason: `Your favorite - you've logged it ${(topBrands[0] as Record<string, unknown>).count} times`
      } : null,
      featured: featuredResult ? {
        id: featuredResult.id,
        brand: featuredResult.brand,
        product: featuredResult.product,
        rating: featuredResult.rating,
        imageUrl: featuredResult.image_url,
        username: featuredResult.username,
        likes: featuredResult.likes
      } : null,
      weeklyGoal: {
        target: weeklyGoalTarget,
        current: thisWeekCheckins.count,
        progress: weeklyProgress
      },
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()],
      date: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    });
  } catch (error) {
    console.error('Daily digest error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
