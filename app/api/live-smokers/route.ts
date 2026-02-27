import { NextRequest } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = env.DB;

  const now = Math.floor(Date.now() / 1000);
  const oneHourAgo = now - 3600;
  const twoHoursAgo = now - 7200;
  const todayStart = now - (now % 86400);

  // Get users who checked in within the last hour (actively smoking)
  const activeSmokers = await db.prepare(`
    SELECT 
      c.id,
      c.brand,
      c.product,
      c.rating,
      c.review,
      c.image_url,
      c.created_at,
      c.category,
      u.username,
      u.avatar_url,
      (? - c.created_at) as seconds_ago
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.created_at >= ?
    ORDER BY c.created_at DESC
  `).bind(now, oneHourAgo).all<{
    id: number;
    brand: string;
    product: string | null;
    rating: number;
    review: string | null;
    image_url: string | null;
    created_at: number;
    category: string | null;
    username: string;
    avatar_url: string | null;
    seconds_ago: number;
  }>();

  // Get users who smoked in the last 1-2 hours (recently active)
  const recentSmokers = await db.prepare(`
    SELECT 
      c.id,
      c.brand,
      c.product,
      c.rating,
      c.created_at,
      c.category,
      u.username,
      u.avatar_url,
      (? - c.created_at) as seconds_ago
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.created_at >= ? AND c.created_at < ?
    ORDER BY c.created_at DESC
  `).bind(now, twoHoursAgo, oneHourAgo).all<{
    id: number;
    brand: string;
    product: string | null;
    rating: number;
    created_at: number;
    category: string | null;
    username: string;
    avatar_url: string | null;
    seconds_ago: number;
  }>();

  // Get today's total check-ins for context
  const todayStats = await db.prepare(`
    SELECT COUNT(*) as count
    FROM checkins
    WHERE created_at >= ?
  `).bind(todayStart).first<{ count: number }>();

  // Get peak hour today
  const peakHour = await db.prepare(`
    SELECT 
      (created_at % 86400) / 3600 as hour,
      COUNT(*) as count
    FROM checkins
    WHERE created_at >= ?
    GROUP BY hour
    ORDER BY count DESC
    LIMIT 1
  `).bind(todayStart).first<{ hour: number; count: number }>();

  // Get most popular brand right now (last 2 hours)
  const hotBrand = await db.prepare(`
    SELECT brand, COUNT(*) as count
    FROM checkins
    WHERE created_at >= ?
    GROUP BY brand
    ORDER BY count DESC
    LIMIT 1
  `).bind(twoHoursAgo).first<{ brand: string; count: number }>();

  return Response.json({
    activeSmokers: activeSmokers.results || [],
    recentSmokers: recentSmokers.results || [],
    stats: {
      activeCount: (activeSmokers.results || []).length,
      recentCount: (recentSmokers.results || []).length,
      todayTotal: todayStats?.count || 0,
      peakHour: peakHour?.hour,
      peakHourCount: peakHour?.count || 0,
      hotBrand: hotBrand?.brand,
      hotBrandCount: hotBrand?.count || 0,
    },
    timestamp: now,
  });
}
