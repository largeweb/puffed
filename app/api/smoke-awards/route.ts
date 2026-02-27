import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { verifyToken } from "@/lib/auth";

export const runtime = "edge";

interface Award {
  id: string;
  title: string;
  emoji: string;
  description: string;
  value?: string | number;
  tier: 'gold' | 'silver' | 'bronze' | 'special';
}

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token, env.JWT_SECRET);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = payload.userId;

    // Get start of current week (Sunday)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const weekStart = Math.floor(startOfWeek.getTime() / 1000);

    const awards: Award[] = [];

    // 1. Best Rating This Week
    const bestRating = await db.prepare(`
      SELECT brand, product, rating 
      FROM checkins 
      WHERE user_id = ? AND created_at >= ? AND rating IS NOT NULL
      ORDER BY rating DESC, created_at DESC
      LIMIT 1
    `).bind(userId, weekStart).first();

    if (bestRating && bestRating.rating) {
      awards.push({
        id: 'best_rating',
        title: 'Top Rated This Week',
        emoji: '⭐',
        description: `${bestRating.brand}${bestRating.product ? ` ${bestRating.product}` : ''}`,
        value: `${bestRating.rating}/5`,
        tier: (bestRating.rating as number) === 5 ? 'gold' : (bestRating.rating as number) >= 4 ? 'silver' : 'bronze'
      });
    }

    // 2. Most Active Day
    const activeDays = await db.prepare(`
      SELECT 
        strftime('%w', datetime(created_at, 'unixepoch')) as day_num,
        COUNT(*) as count
      FROM checkins 
      WHERE user_id = ? AND created_at >= ?
      GROUP BY day_num
      ORDER BY count DESC
      LIMIT 1
    `).bind(userId, weekStart).first();

    if (activeDays && (activeDays.count as number) > 0) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[activeDays.day_num as number] || 'Unknown';
      awards.push({
        id: 'most_active_day',
        title: 'Most Active Day',
        emoji: '📅',
        description: dayName,
        value: `${activeDays.count} smokes`,
        tier: (activeDays.count as number) >= 3 ? 'gold' : (activeDays.count as number) >= 2 ? 'silver' : 'bronze'
      });
    }

    // 3. Flavor Explorer - new flavors tried this week
    const newFlavors = await db.prepare(`
      SELECT flavors FROM checkins 
      WHERE user_id = ? AND created_at >= ? AND flavors IS NOT NULL AND flavors != '[]'
    `).bind(userId, weekStart).all();

    const allFlavors = new Set<string>();
    for (const row of newFlavors.results || []) {
      try {
        const flavors = JSON.parse(row.flavors as string);
        flavors.forEach((f: string) => allFlavors.add(f));
      } catch {}
    }

    if (allFlavors.size > 0) {
      awards.push({
        id: 'flavor_explorer',
        title: 'Flavor Explorer',
        emoji: '🎨',
        description: Array.from(allFlavors).slice(0, 3).join(', ') + (allFlavors.size > 3 ? '...' : ''),
        value: `${allFlavors.size} flavors`,
        tier: allFlavors.size >= 5 ? 'gold' : allFlavors.size >= 3 ? 'silver' : 'bronze'
      });
    }

    // 4. Social Star - engagement given
    const engagement = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM likes WHERE user_id = ? AND created_at >= ?) as likes_given,
        (SELECT COUNT(*) FROM comments WHERE user_id = ? AND created_at >= ?) as comments_given,
        (SELECT COUNT(*) FROM reactions WHERE user_id = ? AND created_at >= ?) as reactions_given
    `).bind(userId, weekStart, userId, weekStart, userId, weekStart).first();

    const totalEngagement = ((engagement?.likes_given as number) || 0) + 
                           ((engagement?.comments_given as number) || 0) + 
                           ((engagement?.reactions_given as number) || 0);

    if (totalEngagement > 0) {
      awards.push({
        id: 'social_star',
        title: 'Social Star',
        emoji: '💕',
        description: 'Spreading the love',
        value: `${totalEngagement} interactions`,
        tier: totalEngagement >= 10 ? 'gold' : totalEngagement >= 5 ? 'silver' : 'bronze'
      });
    }

    // 5. Streak Champion
    const user = await db.prepare(`
      SELECT current_streak FROM users WHERE id = ?
    `).bind(userId).first();

    if (user && (user.current_streak as number) > 0) {
      awards.push({
        id: 'streak_champion',
        title: 'Streak Champion',
        emoji: '🔥',
        description: 'Consistency is key',
        value: `${user.current_streak} days`,
        tier: (user.current_streak as number) >= 7 ? 'gold' : (user.current_streak as number) >= 3 ? 'silver' : 'bronze'
      });
    }

    // 6. Brand Diversity - unique brands this week
    const brands = await db.prepare(`
      SELECT COUNT(DISTINCT brand) as count FROM checkins 
      WHERE user_id = ? AND created_at >= ?
    `).bind(userId, weekStart).first();

    if (brands && (brands.count as number) > 1) {
      awards.push({
        id: 'brand_diversity',
        title: 'Brand Explorer',
        emoji: '🧭',
        description: 'Trying new things',
        value: `${brands.count} brands`,
        tier: (brands.count as number) >= 5 ? 'gold' : (brands.count as number) >= 3 ? 'silver' : 'bronze'
      });
    }

    // 7. Night Owl - late night smokes (10pm-4am)
    const nightSmokes = await db.prepare(`
      SELECT COUNT(*) as count FROM checkins 
      WHERE user_id = ? AND created_at >= ?
      AND (
        CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) >= 22
        OR CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) < 4
      )
    `).bind(userId, weekStart).first();

    if (nightSmokes && (nightSmokes.count as number) > 0) {
      awards.push({
        id: 'night_owl',
        title: 'Night Owl',
        emoji: '🦉',
        description: 'Burning the midnight oil',
        value: `${nightSmokes.count} late nights`,
        tier: (nightSmokes.count as number) >= 3 ? 'gold' : (nightSmokes.count as number) >= 2 ? 'silver' : 'bronze'
      });
    }

    // 8. Early Bird - morning smokes (5am-9am)
    const morningSmokes = await db.prepare(`
      SELECT COUNT(*) as count FROM checkins 
      WHERE user_id = ? AND created_at >= ?
      AND CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) >= 5
      AND CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) < 9
    `).bind(userId, weekStart).first();

    if (morningSmokes && (morningSmokes.count as number) > 0) {
      awards.push({
        id: 'early_bird',
        title: 'Early Bird',
        emoji: '🌅',
        description: 'Rise and shine',
        value: `${morningSmokes.count} mornings`,
        tier: (morningSmokes.count as number) >= 3 ? 'gold' : (morningSmokes.count as number) >= 2 ? 'silver' : 'bronze'
      });
    }

    // 9. Photo Pro - check-ins with photos
    const photoCount = await db.prepare(`
      SELECT COUNT(*) as count FROM checkins 
      WHERE user_id = ? AND created_at >= ? AND photo_url IS NOT NULL
    `).bind(userId, weekStart).first();

    if (photoCount && (photoCount.count as number) > 0) {
      awards.push({
        id: 'photo_pro',
        title: 'Photo Pro',
        emoji: '📸',
        description: 'Capturing the moments',
        value: `${photoCount.count} photos`,
        tier: (photoCount.count as number) >= 5 ? 'gold' : (photoCount.count as number) >= 2 ? 'silver' : 'bronze'
      });
    }

    // 10. Engagement Received
    const received = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM likes l JOIN checkins c ON l.checkin_id = c.id 
         WHERE c.user_id = ? AND l.created_at >= ?) as likes_received,
        (SELECT COUNT(*) FROM comments cm JOIN checkins c ON cm.checkin_id = c.id 
         WHERE c.user_id = ? AND cm.created_at >= ? AND cm.user_id != ?) as comments_received
    `).bind(userId, weekStart, userId, weekStart, userId).first();

    const totalReceived = ((received?.likes_received as number) || 0) + 
                         ((received?.comments_received as number) || 0);

    if (totalReceived > 0) {
      awards.push({
        id: 'popular',
        title: 'Fan Favorite',
        emoji: '🌟',
        description: 'The community loves you',
        value: `${totalReceived} interactions`,
        tier: totalReceived >= 10 ? 'gold' : totalReceived >= 5 ? 'silver' : 'bronze'
      });
    }

    // Calculate total check-ins this week
    const weeklyStats = await db.prepare(`
      SELECT COUNT(*) as total_checkins FROM checkins 
      WHERE user_id = ? AND created_at >= ?
    `).bind(userId, weekStart).first();

    // Sort awards: gold first, then silver, then bronze, then special
    const tierOrder = { gold: 0, silver: 1, bronze: 2, special: 3 };
    awards.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);

    return NextResponse.json({
      awards,
      weekStart: startOfWeek.toISOString(),
      totalCheckinsThisWeek: weeklyStats?.total_checkins || 0,
      userId
    });

  } catch (error) {
    console.error("Smoke awards error:", error);
    return NextResponse.json({ error: "Failed to load awards" }, { status: 500 });
  }
}
