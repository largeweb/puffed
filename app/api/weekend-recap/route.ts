import { NextRequest } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface WeekdayStats {
  day: string;
  count: number;
  avgRating: number;
}

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = env.DB;

  // Get user from auth cookie
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("puffed_auth");
  if (!authCookie) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let userId: number;
  try {
    const auth = JSON.parse(authCookie.value);
    userId = auth.id;
  } catch {
    return Response.json({ error: "Invalid auth" }, { status: 401 });
  }

  const now = Math.floor(Date.now() / 1000);
  const weekStart = now - (7 * 86400);
  const twoWeeksStart = now - (14 * 86400);

  // User's check-ins this week
  const thisWeekCheckins = await db.prepare(`
    SELECT id, brand, product, rating, review, image_url, created_at, category
    FROM checkins 
    WHERE user_id = ? AND created_at >= ?
    ORDER BY created_at DESC
  `).bind(userId, weekStart).all<{
    id: number;
    brand: string;
    product: string | null;
    rating: number;
    review: string | null;
    image_url: string | null;
    created_at: number;
    category: string | null;
  }>();

  // User's check-ins last week (for comparison)
  const lastWeekCheckins = await db.prepare(`
    SELECT COUNT(*) as count, AVG(rating) as avgRating
    FROM checkins 
    WHERE user_id = ? AND created_at >= ? AND created_at < ?
  `).bind(userId, twoWeeksStart, weekStart).first<{ count: number; avgRating: number | null }>();

  // Top brand this week
  const topBrand = await db.prepare(`
    SELECT brand, COUNT(*) as count, AVG(rating) as avgRating
    FROM checkins 
    WHERE user_id = ? AND created_at >= ?
    GROUP BY brand
    ORDER BY count DESC, avgRating DESC
    LIMIT 1
  `).bind(userId, weekStart).first<{ brand: string; count: number; avgRating: number }>();

  // Best rated smoke this week
  const bestRated = await db.prepare(`
    SELECT id, brand, product, rating, review, created_at
    FROM checkins 
    WHERE user_id = ? AND created_at >= ?
    ORDER BY rating DESC, created_at DESC
    LIMIT 1
  `).bind(userId, weekStart).first<{
    id: number;
    brand: string;
    product: string | null;
    rating: number;
    review: string | null;
    created_at: number;
  }>();

  // Engagement received this week (likes, comments, reactions on user's check-ins)
  const [likesReceived, commentsReceived, reactionsReceived] = await Promise.all([
    db.prepare(`
      SELECT COUNT(*) as count FROM likes l
      JOIN checkins c ON l.checkin_id = c.id
      WHERE c.user_id = ? AND l.created_at >= ?
    `).bind(userId, weekStart).first<{ count: number }>(),
    db.prepare(`
      SELECT COUNT(*) as count FROM comments cm
      JOIN checkins c ON cm.checkin_id = c.id
      WHERE c.user_id = ? AND cm.created_at >= ? AND cm.user_id != ?
    `).bind(userId, weekStart, userId).first<{ count: number }>(),
    db.prepare(`
      SELECT COUNT(*) as count FROM reactions r
      JOIN checkins c ON r.checkin_id = c.id
      WHERE c.user_id = ? AND r.created_at >= ?
    `).bind(userId, weekStart).first<{ count: number }>(),
  ]);

  // Engagement given this week
  const [likesGiven, commentsGiven, reactionsGiven] = await Promise.all([
    db.prepare(`
      SELECT COUNT(*) as count FROM likes WHERE user_id = ? AND created_at >= ?
    `).bind(userId, weekStart).first<{ count: number }>(),
    db.prepare(`
      SELECT COUNT(*) as count FROM comments WHERE user_id = ? AND created_at >= ?
    `).bind(userId, weekStart).first<{ count: number }>(),
    db.prepare(`
      SELECT COUNT(*) as count FROM reactions WHERE user_id = ? AND created_at >= ?
    `).bind(userId, weekStart).first<{ count: number }>(),
  ]);

  // Check-ins by day of week
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const weekdayStats: WeekdayStats[] = [];
  
  const checkinsByDay: Record<number, { count: number; totalRating: number }> = {};
  for (const checkin of thisWeekCheckins.results || []) {
    const date = new Date(checkin.created_at * 1000);
    const day = date.getDay();
    if (!checkinsByDay[day]) {
      checkinsByDay[day] = { count: 0, totalRating: 0 };
    }
    checkinsByDay[day].count++;
    checkinsByDay[day].totalRating += checkin.rating;
  }
  
  for (let i = 0; i < 7; i++) {
    const stats = checkinsByDay[i];
    weekdayStats.push({
      day: dayNames[i],
      count: stats?.count || 0,
      avgRating: stats ? stats.totalRating / stats.count : 0,
    });
  }

  // Peak smoking hour this week
  const hourStats: Record<number, number> = {};
  for (const checkin of thisWeekCheckins.results || []) {
    const date = new Date(checkin.created_at * 1000);
    const hour = date.getHours();
    hourStats[hour] = (hourStats[hour] || 0) + 1;
  }
  
  let peakHour = 0;
  let peakCount = 0;
  for (const [hour, count] of Object.entries(hourStats)) {
    if (count > peakCount) {
      peakCount = count;
      peakHour = parseInt(hour);
    }
  }

  // Unique brands this week
  const uniqueBrands = new Set((thisWeekCheckins.results || []).map(c => c.brand));

  // Calculate week stats
  const totalCheckins = thisWeekCheckins.results?.length || 0;
  const avgRating = totalCheckins > 0 
    ? (thisWeekCheckins.results || []).reduce((sum, c) => sum + c.rating, 0) / totalCheckins 
    : 0;

  // Comparison to last week
  const lastWeekCount = lastWeekCheckins?.count || 0;
  const changeFromLastWeek = totalCheckins - lastWeekCount;
  const changePercent = lastWeekCount > 0 
    ? Math.round((changeFromLastWeek / lastWeekCount) * 100) 
    : (totalCheckins > 0 ? 100 : 0);

  // Category breakdown
  const categoryStats: Record<string, number> = {};
  for (const checkin of thisWeekCheckins.results || []) {
    const cat = checkin.category || "cigar";
    categoryStats[cat] = (categoryStats[cat] || 0) + 1;
  }

  // Streak info
  const streakResult = await db.prepare(`
    SELECT current_streak, longest_streak FROM users WHERE id = ?
  `).bind(userId).first<{ current_streak: number; longest_streak: number }>();

  return Response.json({
    totalCheckins,
    avgRating: Math.round(avgRating * 10) / 10,
    uniqueBrands: uniqueBrands.size,
    topBrand: topBrand ? {
      brand: topBrand.brand,
      count: topBrand.count,
      avgRating: Math.round(topBrand.avgRating * 10) / 10,
    } : null,
    bestRated: bestRated ? {
      id: bestRated.id,
      brand: bestRated.brand,
      product: bestRated.product,
      rating: bestRated.rating,
      review: bestRated.review,
    } : null,
    comparison: {
      lastWeekCount,
      change: changeFromLastWeek,
      changePercent,
    },
    engagement: {
      received: {
        likes: likesReceived?.count || 0,
        comments: commentsReceived?.count || 0,
        reactions: reactionsReceived?.count || 0,
      },
      given: {
        likes: likesGiven?.count || 0,
        comments: commentsGiven?.count || 0,
        reactions: reactionsGiven?.count || 0,
      },
    },
    weekdayStats,
    peakHour,
    peakCount,
    categoryStats,
    streak: {
      current: streakResult?.current_streak || 0,
      longest: streakResult?.longest_streak || 0,
    },
    recentCheckins: (thisWeekCheckins.results || []).slice(0, 5).map(c => ({
      id: c.id,
      brand: c.brand,
      product: c.product,
      rating: c.rating,
      photoUrl: c.image_url,
      createdAt: c.created_at,
    })),
  });
}
