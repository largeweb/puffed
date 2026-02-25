import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

export const runtime = "edge";

interface WitchingHourSmoker {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  checkedAt: number;
  timeAgo: string;
  imageUrl?: string;
}

interface WitchingHourStats {
  totalWitchingHourSmokes: number;
  uniqueWitchingHourSmokers: number;
  witchingHourPercent: number;
  yourWitchingHourCount: number;
  yourWitchingHourPercent: number;
  isWitchingHour: boolean;
  currentHour: number;
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

  // Check if it's currently witching hour (2-4 AM in user's timezone)
  // We'll use server time and let the client adjust if needed
  const now = new Date();
  const currentHour = now.getHours();
  const isWitchingHour = currentHour >= 2 && currentHour < 4;

  try {
    // Get tonight's witching hour smokers (2-4 AM today)
    const todayStart = new Date();
    todayStart.setHours(2, 0, 0, 0);
    if (currentHour < 2) {
      // If before 2 AM, look at yesterday's witching hour
      todayStart.setDate(todayStart.getDate() - 1);
    }
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(4, 0, 0, 0);

    const startTs = Math.floor(todayStart.getTime() / 1000);
    const endTs = Math.floor(todayEnd.getTime() / 1000);

    // Get recent witching hour check-ins
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

    const tonightsSmokers: WitchingHourSmoker[] = (recentResult.results || []).map((r: Record<string, unknown>) => ({
      username: r.username as string,
      brand: r.brand as string,
      product: r.product as string | undefined,
      rating: r.rating as number | undefined,
      checkedAt: r.created_at as number,
      timeAgo: formatTimeAgo(r.created_at as number),
      imageUrl: r.image_url as string | undefined,
    }));

    // Get all-time witching hour stats
    // Count check-ins made between 2-4 AM EST
    // EST is UTC-5, so 2 AM EST = 7 UTC, 4 AM EST = 9 UTC
    // We use strftime to extract hour in UTC then adjust
    const statsResult = await db
      .prepare(
        `SELECT 
           COUNT(*) as total_witching_smokes,
           COUNT(DISTINCT user_id) as unique_smokers
         FROM checkins
         WHERE CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 2
           AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 4`
      )
      .first<{ total_witching_smokes: number; unique_smokers: number }>();

    // Get total users for percentage
    const totalUsersResult = await db
      .prepare("SELECT COUNT(*) as count FROM users")
      .first<{ count: number }>();
    const totalUsers = totalUsersResult?.count || 1;

    // Get user's personal witching hour count
    const userStatsResult = await db
      .prepare(
        `SELECT COUNT(*) as count FROM checkins
         WHERE user_id = ? 
           AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 2
           AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 4`
      )
      .bind(userId)
      .first<{ count: number }>();

    // Get user's total check-ins for percentage
    const userTotalResult = await db
      .prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ?")
      .bind(userId)
      .first<{ count: number }>();

    const userTotal = userTotalResult?.count || 1;
    const userWitchingCount = userStatsResult?.count || 0;

    const stats: WitchingHourStats = {
      totalWitchingHourSmokes: statsResult?.total_witching_smokes || 0,
      uniqueWitchingHourSmokers: statsResult?.unique_smokers || 0,
      witchingHourPercent: Math.round(((statsResult?.unique_smokers || 0) / totalUsers) * 100),
      yourWitchingHourCount: userWitchingCount,
      yourWitchingHourPercent: Math.round((userWitchingCount / userTotal) * 100),
      isWitchingHour,
      currentHour,
    };

    // Get all-time witching hour leaders
    const leadersResult = await db
      .prepare(
        `SELECT u.username, COUNT(*) as count
         FROM checkins c
         JOIN users u ON c.user_id = u.id
         WHERE CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 2
           AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 4
         GROUP BY c.user_id
         ORDER BY count DESC
         LIMIT 5`
      )
      .all();

    const leaders = (leadersResult.results || []).map((r: Record<string, unknown>) => ({
      username: r.username as string,
      count: r.count as number,
    }));

    return NextResponse.json({
      tonightsSmokers,
      stats,
      leaders,
    });
  } catch (error) {
    console.error("Witching hour error:", error);
    return NextResponse.json(
      { error: "Failed to load witching hour data" },
      { status: 500 }
    );
  }
}
