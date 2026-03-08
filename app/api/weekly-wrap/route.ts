import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { env } = getRequestContext();
  const db = env.DB;

  // Get user from session
  const session = await db
    .prepare("SELECT user_id FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ user_id: string }>();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user_id;

  // Calculate date ranges (Sunday to Saturday weeks)
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  
  // This week starts on last Sunday
  const thisWeekStart = new Date(now);
  thisWeekStart.setUTCDate(now.getUTCDate() - dayOfWeek);
  thisWeekStart.setUTCHours(0, 0, 0, 0);
  
  // Last week
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setUTCDate(thisWeekStart.getUTCDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);

  const thisWeekISO = thisWeekStart.toISOString();
  const lastWeekStartISO = lastWeekStart.toISOString();
  const lastWeekEndISO = lastWeekEnd.toISOString();

  try {
    // This week's check-ins
    const thisWeekCheckins = await db.prepare(`
      SELECT 
        COUNT(*) as count,
        AVG(rating) as avg_rating,
        COUNT(DISTINCT brand) as unique_brands
      FROM checkins 
      WHERE user_id = ? AND created_at >= ?
    `).bind(userId, thisWeekISO).first<{
      count: number;
      avg_rating: number;
      unique_brands: number;
    }>();

    // Photos count
    const photosCount = await db.prepare(`
      SELECT COUNT(*) as count 
      FROM checkins 
      WHERE user_id = ? AND created_at >= ? AND image_url IS NOT NULL
    `).bind(userId, thisWeekISO).first<{ count: number }>();

    // Last week's check-ins
    const lastWeekCheckins = await db.prepare(`
      SELECT COUNT(*) as count
      FROM checkins 
      WHERE user_id = ? AND created_at >= ? AND created_at < ?
    `).bind(userId, lastWeekStartISO, lastWeekEndISO).first<{ count: number }>();

    // Top brand this week
    const topBrand = await db.prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins 
      WHERE user_id = ? AND created_at >= ?
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 1
    `).bind(userId, thisWeekISO).first<{ brand: string; count: number }>();

    // Top flavor this week (if flavor_tags column exists)
    let topFlavor: { flavor: string } | null = null;
    try {
      topFlavor = await db.prepare(`
        SELECT value as flavor, COUNT(*) as count
        FROM checkins c, json_each(c.flavor_tags)
        WHERE c.user_id = ? AND c.created_at >= ?
        GROUP BY value
        ORDER BY count DESC
        LIMIT 1
      `).bind(userId, thisWeekISO).first<{ flavor: string; count: number }>();
    } catch {
      // flavor_tags might not exist, that's ok
    }

    // Best day (most check-ins)
    const bestDay = await db.prepare(`
      SELECT DATE(created_at) as day, COUNT(*) as count
      FROM checkins 
      WHERE user_id = ? AND created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY count DESC
      LIMIT 1
    `).bind(userId, thisWeekISO).first<{ day: string; count: number }>();

    // Likes received this week
    const likesReceived = await db.prepare(`
      SELECT COUNT(*) as count
      FROM likes l
      JOIN checkins c ON l.checkin_id = c.id
      WHERE c.user_id = ? AND l.created_at >= ?
    `).bind(userId, thisWeekISO).first<{ count: number }>();

    // Last week likes received
    const lastWeekLikes = await db.prepare(`
      SELECT COUNT(*) as count
      FROM likes l
      JOIN checkins c ON l.checkin_id = c.id
      WHERE c.user_id = ? AND l.created_at >= ? AND l.created_at < ?
    `).bind(userId, lastWeekStartISO, lastWeekEndISO).first<{ count: number }>();

    // Likes given this week
    const likesGiven = await db.prepare(`
      SELECT COUNT(*) as count
      FROM likes
      WHERE user_id = ? AND created_at >= ?
    `).bind(userId, thisWeekISO).first<{ count: number }>();

    // Comments received this week
    const commentsReceived = await db.prepare(`
      SELECT COUNT(*) as count
      FROM comments cm
      JOIN checkins c ON cm.checkin_id = c.id
      WHERE c.user_id = ? AND cm.created_at >= ? AND cm.user_id != ?
    `).bind(userId, thisWeekISO, userId).first<{ count: number }>();

    // Comments given this week
    const commentsGiven = await db.prepare(`
      SELECT COUNT(*) as count
      FROM comments
      WHERE user_id = ? AND created_at >= ?
    `).bind(userId, thisWeekISO).first<{ count: number }>();

    // Follows gained this week
    const followsGained = await db.prepare(`
      SELECT COUNT(*) as count
      FROM follows
      WHERE following_id = ? AND created_at >= ?
    `).bind(userId, thisWeekISO).first<{ count: number }>();

    // Streak check - did they maintain streak all week?
    const streakData = await db.prepare(`
      SELECT current_streak FROM users WHERE id = ?
    `).bind(userId).first<{ current_streak: number }>();
    const streakMaintained = (streakData?.current_streak || 0) >= 7;

    // Top highlights (best engagement)
    const highlights = await db.prepare(`
      SELECT 
        c.id, c.brand, c.product, c.rating, c.image_url,
        (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as likes
      FROM checkins c
      WHERE c.user_id = ? AND c.created_at >= ?
      ORDER BY likes DESC, c.rating DESC
      LIMIT 3
    `).bind(userId, thisWeekISO).all<{
      id: string;
      brand: string;
      product: string | null;
      rating: number;
      image_url: string | null;
      likes: number;
    }>();

    // Weekly ranking
    const rankingData = await db.prepare(`
      WITH weekly_counts AS (
        SELECT user_id, COUNT(*) as checkins
        FROM checkins
        WHERE created_at >= ?
        GROUP BY user_id
      ),
      ranked AS (
        SELECT 
          user_id,
          checkins,
          RANK() OVER (ORDER BY checkins DESC) as rank,
          COUNT(*) OVER () as total
        FROM weekly_counts
      )
      SELECT rank, total, checkins FROM ranked WHERE user_id = ?
    `).bind(thisWeekISO, userId).first<{ rank: number; total: number; checkins: number }>();

    const position = rankingData?.rank || 1;
    const total = rankingData?.total || 1;
    const percentile = Math.round(((total - position) / total) * 100);

    // Generate fun facts
    const funFacts: string[] = [];
    
    if ((thisWeekCheckins?.count || 0) > (lastWeekCheckins?.count || 0)) {
      funFacts.push(`📈 You smoked ${(thisWeekCheckins?.count || 0) - (lastWeekCheckins?.count || 0)} more times than last week!`);
    }
    
    if ((photosCount?.count || 0) > 0) {
      funFacts.push(`📸 You captured ${photosCount?.count || 0} smoke moments on camera`);
    }
    
    if ((thisWeekCheckins?.unique_brands || 0) > 3) {
      funFacts.push(`🎨 You explored ${thisWeekCheckins?.unique_brands || 0} different brands - variety is the spice of life!`);
    }
    
    if ((likesGiven?.count || 0) > 5) {
      funFacts.push(`💜 You spread the love with ${likesGiven?.count || 0} likes this week`);
    }
    
    if (streakMaintained) {
      funFacts.push(`🔥 Your streak is on fire! ${streakData?.current_streak || 0} days and counting`);
    }

    if (position === 1) {
      funFacts.push(`👑 You were the #1 smoker this week!`);
    }

    return NextResponse.json({
      thisWeek: {
        checkins: thisWeekCheckins?.count || 0,
        uniqueBrands: thisWeekCheckins?.unique_brands || 0,
        avgRating: thisWeekCheckins?.avg_rating || 0,
        likesReceived: likesReceived?.count || 0,
        likesGiven: likesGiven?.count || 0,
        commentsReceived: commentsReceived?.count || 0,
        commentsGiven: commentsGiven?.count || 0,
        followsGained: followsGained?.count || 0,
        photos: photosCount?.count || 0,
        topBrand: topBrand?.brand || null,
        topFlavor: topFlavor?.flavor || null,
        bestDay: bestDay?.day || null,
        streakMaintained,
      },
      lastWeek: {
        checkins: lastWeekCheckins?.count || 0,
        likesReceived: lastWeekLikes?.count || 0,
      },
      highlights: highlights?.results || [],
      rank: {
        position,
        total,
        percentile,
      },
      funFacts,
    });
  } catch (error) {
    console.error("Error fetching weekly wrap:", error);
    return NextResponse.json({ error: "Failed to fetch weekly wrap" }, { status: 500 });
  }
}
