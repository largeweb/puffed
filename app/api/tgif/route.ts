import { getRequestContext } from "@cloudflare/next-on-pages";
import { headers } from "next/headers";

export const runtime = "edge";

interface TGIFMember {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  checkedAt: number;
  timeAgo: string;
  imageUrl?: string;
}

interface TGIFStats {
  totalFridaySmokes: number;
  uniqueFridaySmokers: number;
  yourFridayCount: number;
  isTGIFWindow: boolean;
  currentHour: number;
  dayOfWeek: number;
  mostPopularFridayBrand?: string;
  peakFridayHour?: number;
  avgFridayRating?: number;
}

interface Leader {
  username: string;
  count: number;
  avgRating: string;
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export async function GET() {
  const headersList = await headers();
  const sessionId = headersList.get("x-session-id");
  if (!sessionId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getRequestContext().env.DB;

  // Get current user
  const session = await db
    .prepare("SELECT user_id FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }

  const userId = session.user_id;

  // Determine if we're in TGIF window (Friday 5pm - Saturday 3am)
  const now = new Date();
  const estOffset = -5 * 60; // EST
  const estTime = new Date(now.getTime() + (now.getTimezoneOffset() + estOffset) * 60000);
  const dayOfWeek = estTime.getDay(); // 0=Sun, 5=Fri, 6=Sat
  const currentHour = estTime.getHours();

  // TGIF window: Friday 5pm onwards OR Saturday before 3am
  const isTGIFWindow = 
    (dayOfWeek === 5 && currentHour >= 17) || // Friday 5pm+
    (dayOfWeek === 6 && currentHour < 3);     // Saturday before 3am

  // Calculate the start of this TGIF window
  const windowStart = new Date(estTime);
  if (dayOfWeek === 6 && currentHour < 3) {
    // It's early Saturday, go back to Friday 5pm
    windowStart.setDate(windowStart.getDate() - 1);
  }
  windowStart.setHours(17, 0, 0, 0);
  const windowStartMs = windowStart.getTime();

  // Get tonight's TGIF members (check-ins during current TGIF window)
  const tonightResult = await db
    .prepare(`
      SELECT c.*, u.username
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      ORDER BY c.created_at DESC
      LIMIT 30
    `)
    .bind(windowStartMs)
    .all();

  const tonightsMembers: TGIFMember[] = (tonightResult.results || []).map((row: Record<string, unknown>) => ({
    username: row.username as string,
    brand: row.brand as string,
    product: row.product as string | undefined,
    rating: row.rating as number | undefined,
    checkedAt: row.created_at as number,
    timeAgo: getTimeAgo(row.created_at as number),
    imageUrl: row.image_url as string | undefined,
  }));

  // Get all-time Friday evening stats (Friday 5pm - Saturday 3am window)
  // We'll use hour extraction - Fridays where hour >= 17 OR early Saturday before 3am
  const fridayStatsResult = await db
    .prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT user_id) as unique_smokers,
        AVG(rating) as avg_rating
      FROM checkins
      WHERE (
        (strftime('%w', datetime(created_at/1000, 'unixepoch', '-5 hours')) = '5' 
         AND CAST(strftime('%H', datetime(created_at/1000, 'unixepoch', '-5 hours')) AS INTEGER) >= 17)
        OR
        (strftime('%w', datetime(created_at/1000, 'unixepoch', '-5 hours')) = '6'
         AND CAST(strftime('%H', datetime(created_at/1000, 'unixepoch', '-5 hours')) AS INTEGER) < 3)
      )
    `)
    .first<{ total: number; unique_smokers: number; avg_rating: number }>();

  // Get user's Friday evening count
  const userFridayResult = await db
    .prepare(`
      SELECT COUNT(*) as count
      FROM checkins
      WHERE user_id = ?
      AND (
        (strftime('%w', datetime(created_at/1000, 'unixepoch', '-5 hours')) = '5' 
         AND CAST(strftime('%H', datetime(created_at/1000, 'unixepoch', '-5 hours')) AS INTEGER) >= 17)
        OR
        (strftime('%w', datetime(created_at/1000, 'unixepoch', '-5 hours')) = '6'
         AND CAST(strftime('%H', datetime(created_at/1000, 'unixepoch', '-5 hours')) AS INTEGER) < 3)
      )
    `)
    .bind(userId)
    .first<{ count: number }>();

  // Get most popular Friday evening brand
  const topBrandResult = await db
    .prepare(`
      SELECT brand, COUNT(*) as cnt
      FROM checkins
      WHERE (
        (strftime('%w', datetime(created_at/1000, 'unixepoch', '-5 hours')) = '5' 
         AND CAST(strftime('%H', datetime(created_at/1000, 'unixepoch', '-5 hours')) AS INTEGER) >= 17)
        OR
        (strftime('%w', datetime(created_at/1000, 'unixepoch', '-5 hours')) = '6'
         AND CAST(strftime('%H', datetime(created_at/1000, 'unixepoch', '-5 hours')) AS INTEGER) < 3)
      )
      GROUP BY brand
      ORDER BY cnt DESC
      LIMIT 1
    `)
    .first<{ brand: string; cnt: number }>();

  // Get peak Friday evening hour
  const peakHourResult = await db
    .prepare(`
      SELECT CAST(strftime('%H', datetime(created_at/1000, 'unixepoch', '-5 hours')) AS INTEGER) as hour,
             COUNT(*) as cnt
      FROM checkins
      WHERE (
        (strftime('%w', datetime(created_at/1000, 'unixepoch', '-5 hours')) = '5' 
         AND CAST(strftime('%H', datetime(created_at/1000, 'unixepoch', '-5 hours')) AS INTEGER) >= 17)
        OR
        (strftime('%w', datetime(created_at/1000, 'unixepoch', '-5 hours')) = '6'
         AND CAST(strftime('%H', datetime(created_at/1000, 'unixepoch', '-5 hours')) AS INTEGER) < 3)
      )
      GROUP BY hour
      ORDER BY cnt DESC
      LIMIT 1
    `)
    .first<{ hour: number; cnt: number }>();

  // Get leaderboard - top Friday evening smokers
  const leadersResult = await db
    .prepare(`
      SELECT u.username, COUNT(*) as count, AVG(c.rating) as avg_rating
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE (
        (strftime('%w', datetime(c.created_at/1000, 'unixepoch', '-5 hours')) = '5' 
         AND CAST(strftime('%H', datetime(c.created_at/1000, 'unixepoch', '-5 hours')) AS INTEGER) >= 17)
        OR
        (strftime('%w', datetime(c.created_at/1000, 'unixepoch', '-5 hours')) = '6'
         AND CAST(strftime('%H', datetime(c.created_at/1000, 'unixepoch', '-5 hours')) AS INTEGER) < 3)
      )
      GROUP BY u.id
      ORDER BY count DESC
      LIMIT 10
    `)
    .all();

  const leaders: Leader[] = (leadersResult.results || []).map((row: Record<string, unknown>) => ({
    username: row.username as string,
    count: row.count as number,
    avgRating: (row.avg_rating as number)?.toFixed(1) || "—",
  }));

  const stats: TGIFStats = {
    totalFridaySmokes: fridayStatsResult?.total || 0,
    uniqueFridaySmokers: fridayStatsResult?.unique_smokers || 0,
    yourFridayCount: userFridayResult?.count || 0,
    isTGIFWindow,
    currentHour,
    dayOfWeek,
    mostPopularFridayBrand: topBrandResult?.brand,
    peakFridayHour: peakHourResult?.hour,
    avgFridayRating: fridayStatsResult?.avg_rating ? Math.round(fridayStatsResult.avg_rating * 10) / 10 : undefined,
  };

  return Response.json({
    tonightsMembers,
    stats,
    leaders,
  });
}
