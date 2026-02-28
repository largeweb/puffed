import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface EarlyRiser {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  image_url?: string;
  minutesAgo: number;
}

interface WeekendStats {
  totalWeekendMornings: number;
  yourWeekendMornings: number;
  peakHour: number;
  topBrand: string | null;
  earlyBirdStreak: number;
}

interface WeekendChampion {
  username: string;
  count: number;
  favoriteBrand: string | null;
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await env.DB.prepare(
      "SELECT id, username FROM users WHERE session_token = ?"
    )
      .bind(session)
      .first<{ id: number; username: string }>();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = Date.now();
    const currentHour = new Date().getHours();
    const dayOfWeek = new Date().getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isWakeBakeTime = isWeekend && currentHour >= 5 && currentHour < 10;

    // Get today's early risers (5-10 AM weekend morning smokes)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const morningStart = new Date(todayStart);
    morningStart.setHours(5);
    const morningEnd = new Date(todayStart);
    morningEnd.setHours(10);

    const earlyRisers = await env.DB.prepare(`
      SELECT u.username, c.brand, c.product, c.rating, c.image_url, c.created_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at < ?
      ORDER BY c.created_at DESC
      LIMIT 20
    `)
      .bind(morningStart.getTime(), morningEnd.getTime())
      .all<{ username: string; brand: string; product?: string; rating?: number; image_url?: string; created_at: number }>();

    const risers: EarlyRiser[] = (earlyRisers.results || []).map(r => ({
      username: r.username,
      brand: r.brand,
      product: r.product,
      rating: r.rating,
      image_url: r.image_url,
      minutesAgo: Math.floor((now - r.created_at) / 60000)
    }));

    // Get weekend morning stats (all time)
    const weekendMorningStats = await env.DB.prepare(`
      SELECT COUNT(*) as total
      FROM checkins
      WHERE 
        (strftime('%w', datetime(created_at/1000, 'unixepoch')) IN ('0', '6'))
        AND CAST(strftime('%H', datetime(created_at/1000, 'unixepoch')) AS INTEGER) BETWEEN 5 AND 9
    `).first<{ total: number }>();

    // Get user's weekend morning count
    const userWeekendMornings = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM checkins
      WHERE user_id = ?
        AND (strftime('%w', datetime(created_at/1000, 'unixepoch')) IN ('0', '6'))
        AND CAST(strftime('%H', datetime(created_at/1000, 'unixepoch')) AS INTEGER) BETWEEN 5 AND 9
    `)
      .bind(user.id)
      .first<{ count: number }>();

    // Get peak weekend morning hour
    const peakHour = await env.DB.prepare(`
      SELECT CAST(strftime('%H', datetime(created_at/1000, 'unixepoch')) AS INTEGER) as hour, COUNT(*) as cnt
      FROM checkins
      WHERE (strftime('%w', datetime(created_at/1000, 'unixepoch')) IN ('0', '6'))
        AND CAST(strftime('%H', datetime(created_at/1000, 'unixepoch')) AS INTEGER) BETWEEN 5 AND 9
      GROUP BY hour
      ORDER BY cnt DESC
      LIMIT 1
    `).first<{ hour: number; cnt: number }>();

    // Get top weekend morning brand
    const topBrand = await env.DB.prepare(`
      SELECT brand, COUNT(*) as cnt
      FROM checkins
      WHERE (strftime('%w', datetime(created_at/1000, 'unixepoch')) IN ('0', '6'))
        AND CAST(strftime('%H', datetime(created_at/1000, 'unixepoch')) AS INTEGER) BETWEEN 5 AND 9
      GROUP BY brand
      ORDER BY cnt DESC
      LIMIT 1
    `).first<{ brand: string; cnt: number }>();

    // Get weekend morning champions (top 5 users by weekend morning count)
    const champions = await env.DB.prepare(`
      SELECT u.username, COUNT(*) as count,
        (SELECT brand FROM checkins c2 WHERE c2.user_id = u.id 
         AND (strftime('%w', datetime(c2.created_at/1000, 'unixepoch')) IN ('0', '6'))
         AND CAST(strftime('%H', datetime(c2.created_at/1000, 'unixepoch')) AS INTEGER) BETWEEN 5 AND 9
         GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1) as favoriteBrand
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE (strftime('%w', datetime(c.created_at/1000, 'unixepoch')) IN ('0', '6'))
        AND CAST(strftime('%H', datetime(c.created_at/1000, 'unixepoch')) AS INTEGER) BETWEEN 5 AND 9
      GROUP BY u.id
      ORDER BY count DESC
      LIMIT 5
    `).all<{ username: string; count: number; favoriteBrand: string | null }>();

    // Calculate early bird streak for user (consecutive weekends with morning smokes)
    // Simplified: just count unique weekends
    const earlyBirdStreak = await env.DB.prepare(`
      SELECT COUNT(DISTINCT date(datetime(created_at/1000, 'unixepoch'))) as streak
      FROM checkins
      WHERE user_id = ?
        AND (strftime('%w', datetime(created_at/1000, 'unixepoch')) IN ('0', '6'))
        AND CAST(strftime('%H', datetime(created_at/1000, 'unixepoch')) AS INTEGER) BETWEEN 5 AND 9
        AND created_at > ?
    `)
      .bind(user.id, now - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      .first<{ streak: number }>();

    // Get recommended wake & bake cigars (user's favorites smoked in mornings)
    const recommendations = await env.DB.prepare(`
      SELECT brand, product, AVG(rating) as avgRating, COUNT(*) as count
      FROM checkins
      WHERE user_id = ?
        AND rating >= 4
      GROUP BY brand, product
      ORDER BY avgRating DESC, count DESC
      LIMIT 3
    `)
      .bind(user.id)
      .all<{ brand: string; product?: string; avgRating: number; count: number }>();

    // Morning vibes based on time
    const vibes = getVibes(currentHour);

    const stats: WeekendStats = {
      totalWeekendMornings: weekendMorningStats?.total || 0,
      yourWeekendMornings: userWeekendMornings?.count || 0,
      peakHour: peakHour?.hour || 7,
      topBrand: topBrand?.brand || null,
      earlyBirdStreak: earlyBirdStreak?.streak || 0
    };

    return Response.json({
      username: user.username,
      isWeekend,
      isWakeBakeTime,
      currentHour,
      dayOfWeek,
      earlyRisers: risers,
      stats,
      champions: champions.results || [],
      recommendations: recommendations.results || [],
      vibes
    });
  } catch (error) {
    console.error("Wake & Bake API error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

function getVibes(hour: number): { emoji: string; message: string; mood: string } {
  if (hour >= 5 && hour < 6) {
    return { emoji: "🌄", message: "The world is still asleep. Perfect time for contemplation.", mood: "twilight" };
  } else if (hour >= 6 && hour < 7) {
    return { emoji: "🌅", message: "First light of the weekend. Make it count.", mood: "dawn" };
  } else if (hour >= 7 && hour < 8) {
    return { emoji: "☕", message: "Coffee's brewing, weekend's calling.", mood: "golden" };
  } else if (hour >= 8 && hour < 9) {
    return { emoji: "🥞", message: "The lazy morning stretch. No rush, just vibes.", mood: "warm" };
  } else if (hour >= 9 && hour < 10) {
    return { emoji: "🌞", message: "Peak weekend morning energy!", mood: "bright" };
  } else {
    return { emoji: "🌤️", message: "Weekend vibes all day.", mood: "day" };
  }
}
