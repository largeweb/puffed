import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

export const runtime = "edge";

interface TwilightSmoker {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  checkedAt: number;
  timeAgo: string;
  imageUrl?: string;
}

interface TwilightStats {
  totalTwilightSmokes: number;
  uniqueTwilightSmokers: number;
  twilightPercent: number;
  yourTwilightCount: number;
  yourTwilightPercent: number;
  isTwilightZone: boolean;
  currentHour: number;
  minutesUntilDawn: number;
}

interface Leader {
  username: string;
  count: number;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const sessionId = parseSessionCookie(cookieHeader);
  
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { env } = getRequestContext();
  const db = env.DB;
  
  // Verify session
  const nowTs = Math.floor(Date.now() / 1000);
  const session = await db
    .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
    .bind(sessionId, nowTs)
    .first<{ user_id: string }>();
    
  if (!session) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }
  const userId = session.user_id;

  // Check if it's currently twilight zone (4-5 AM EST)
  const now = new Date();
  // Adjust for EST (UTC-5)
  const estOffset = -5 * 60 * 60 * 1000;
  const estNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + estOffset);
  const currentHour = estNow.getHours();
  const currentMinute = estNow.getMinutes();
  const isTwilightZone = currentHour === 4;
  
  // Minutes until dawn (5 AM)
  const minutesUntilDawn = isTwilightZone ? (60 - currentMinute) : (currentHour < 4 ? ((4 - currentHour) * 60 + (60 - currentMinute)) : 0);

  try {
    // Get today's twilight smokers (4-5 AM)
    const todayStart = new Date(estNow);
    todayStart.setHours(4, 0, 0, 0);
    if (currentHour < 4) {
      // If before 4 AM, look at yesterday's twilight zone
      todayStart.setDate(todayStart.getDate() - 1);
    }
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(5, 0, 0, 0);

    const startTs = Math.floor(todayStart.getTime() / 1000);
    const endTs = Math.floor(todayEnd.getTime() / 1000);

    // Get recent twilight check-ins
    const recentResult = await db
      .prepare(
        `SELECT c.id, c.brand, c.product, c.rating, c.created_at, c.image_url, u.username
         FROM checkins c
         JOIN users u ON c.user_id = u.id
         WHERE c.created_at >= ? AND c.created_at < ?
         ORDER BY c.created_at DESC
         LIMIT 10`
      )
      .bind(startTs, endTs)
      .all();

    const twilightSmokers: TwilightSmoker[] = (recentResult.results || []).map((r: Record<string, unknown>) => ({
      username: r.username as string,
      brand: r.brand as string,
      product: r.product as string | undefined,
      rating: r.rating as number | undefined,
      checkedAt: r.created_at as number,
      timeAgo: formatTimeAgo(r.created_at as number),
      imageUrl: r.image_url as string | undefined,
    }));

    // Get all-time twilight stats (4-5 AM EST)
    const statsResult = await db
      .prepare(
        `SELECT 
           COUNT(*) as total_twilight_smokes,
           COUNT(DISTINCT user_id) as unique_smokers
         FROM checkins
         WHERE CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) = 4`
      )
      .first<{ total_twilight_smokes: number; unique_smokers: number }>();

    // Get total users for percentage
    const totalUsersResult = await db
      .prepare("SELECT COUNT(*) as count FROM users")
      .first<{ count: number }>();
    const totalUsers = totalUsersResult?.count || 1;

    // Get user's personal twilight count
    const userStatsResult = await db
      .prepare(
        `SELECT COUNT(*) as count FROM checkins
         WHERE user_id = ? 
           AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) = 4`
      )
      .bind(userId)
      .first<{ count: number }>();

    // Get user's total check-ins for percentage
    const userTotalResult = await db
      .prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ?")
      .bind(userId)
      .first<{ count: number }>();

    const userTotal = userTotalResult?.count || 1;
    const userTwilightCount = userStatsResult?.count || 0;

    const stats: TwilightStats = {
      totalTwilightSmokes: statsResult?.total_twilight_smokes || 0,
      uniqueTwilightSmokers: statsResult?.unique_smokers || 0,
      twilightPercent: Math.round(((statsResult?.unique_smokers || 0) / totalUsers) * 100),
      yourTwilightCount: userTwilightCount,
      yourTwilightPercent: Math.round((userTwilightCount / userTotal) * 100),
      isTwilightZone,
      currentHour,
      minutesUntilDawn,
    };

    // Get twilight zone leaders (all-time 4-5 AM smokers)
    const leadersResult = await db
      .prepare(
        `SELECT u.username, COUNT(*) as count
         FROM checkins c
         JOIN users u ON c.user_id = u.id
         WHERE CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) = 4
         GROUP BY c.user_id
         ORDER BY count DESC
         LIMIT 5`
      )
      .all();

    const leaders: Leader[] = (leadersResult.results || []).map((r: Record<string, unknown>) => ({
      username: r.username as string,
      count: r.count as number,
    }));

    return NextResponse.json({
      twilightSmokers,
      stats,
      leaders,
    });
  } catch (error) {
    console.error("Twilight zone error:", error);
    return NextResponse.json({ error: "Failed to load twilight data" }, { status: 500 });
  }
}
