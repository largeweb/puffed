import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface NightcapCheckin {
  id: string;
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  review?: string;
  imageUrl?: string;
  checkedAt: number;
  timeAgo: string;
}

interface NightcapStats {
  totalNightcaps: number;
  uniqueNightcappers: number;
  yourNightcapCount: number;
  avgNightcapHour: number;
  yourAvgHour?: number;
  mostPopularBrand?: string;
  tonightHasNightcap: boolean;
}

interface NightcapLeader {
  username: string;
  count: number;
  avgHour: number;
}

function getTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = session.user_id;

    // Nightcap = last check-in of each day, typically after 8 PM (20:00)
    // We'll consider "nightcap" as check-ins after 8 PM local time (approximated via UTC)
    
    // Get tonight's nightcaps (after 8 PM today, Eastern time approximation)
    const now = Math.floor(Date.now() / 1000);
    const todayStart = now - (now % 86400) - (5 * 3600); // Approximate Eastern time
    const nightcapStart = todayStart + (20 * 3600); // 8 PM
    
    interface CheckinRow {
      id: string;
      user_id: string;
      username: string;
      brand: string;
      product?: string;
      rating?: number;
      review?: string;
      image_url?: string;
      created_at: number;
    }

    // Get tonight's late-night check-ins (after 8 PM)
    const tonightsNightcaps = await db
      .prepare(`
        SELECT c.id, c.user_id, u.username, c.brand, c.product, c.rating, c.review, c.image_url, c.created_at
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE c.created_at > ?
        ORDER BY c.created_at DESC
        LIMIT 20
      `)
      .bind(nightcapStart)
      .all<CheckinRow>();

    // Get all-time nightcap stats (check-ins between 8 PM and 4 AM)
    interface StatsRow {
      total: number;
      unique_users: number;
    }

    const allTimeStats = await db
      .prepare(`
        SELECT COUNT(*) as total, COUNT(DISTINCT user_id) as unique_users
        FROM checkins
        WHERE (strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) >= '20'
           OR strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) < '04')
      `)
      .first<StatsRow>();

    // Get user's nightcap count
    const userNightcaps = await db
      .prepare(`
        SELECT COUNT(*) as count
        FROM checkins
        WHERE user_id = ?
        AND (strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) >= '20'
           OR strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) < '04')
      `)
      .bind(userId)
      .first<{ count: number }>();

    // Check if user has a nightcap tonight
    const userTonightNightcap = await db
      .prepare(`
        SELECT COUNT(*) as count
        FROM checkins
        WHERE user_id = ? AND created_at > ?
      `)
      .bind(userId, nightcapStart)
      .first<{ count: number }>();

    // Get nightcap leaders
    interface LeaderRow {
      username: string;
      count: number;
      avg_hour: number;
    }

    const leaders = await db
      .prepare(`
        SELECT u.username, COUNT(*) as count,
               AVG(CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER)) as avg_hour
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE (strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) >= '20'
           OR strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) < '04')
        GROUP BY c.user_id
        ORDER BY count DESC
        LIMIT 10
      `)
      .all<LeaderRow>();

    // Get most popular nightcap brand
    interface BrandRow {
      brand: string;
      count: number;
    }

    const popularBrand = await db
      .prepare(`
        SELECT brand, COUNT(*) as count
        FROM checkins
        WHERE (strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) >= '20'
           OR strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) < '04')
        GROUP BY brand
        ORDER BY count DESC
        LIMIT 1
      `)
      .first<BrandRow>();

    // Get average nightcap hour across platform
    const avgHourResult = await db
      .prepare(`
        SELECT AVG(
          CASE 
            WHEN CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 20 
            THEN CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER)
            ELSE CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) + 24
          END
        ) as avg_hour
        FROM checkins
        WHERE (strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) >= '20'
           OR strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) < '04')
      `)
      .first<{ avg_hour: number }>();

    // Format tonight's nightcaps
    const formattedNightcaps: NightcapCheckin[] = (tonightsNightcaps.results || []).map(c => ({
      id: c.id,
      username: c.username,
      brand: c.brand,
      product: c.product,
      rating: c.rating,
      review: c.review,
      imageUrl: c.image_url,
      checkedAt: c.created_at,
      timeAgo: getTimeAgo(c.created_at),
    }));

    // Format leaders
    const formattedLeaders: NightcapLeader[] = (leaders.results || []).map(l => ({
      username: l.username,
      count: l.count,
      avgHour: Math.round(l.avg_hour) % 24,
    }));

    const stats: NightcapStats = {
      totalNightcaps: allTimeStats?.total || 0,
      uniqueNightcappers: allTimeStats?.unique_users || 0,
      yourNightcapCount: userNightcaps?.count || 0,
      avgNightcapHour: avgHourResult?.avg_hour ? Math.round(avgHourResult.avg_hour) % 24 : 22,
      mostPopularBrand: popularBrand?.brand,
      tonightHasNightcap: (userTonightNightcap?.count || 0) > 0,
    };

    return NextResponse.json({
      tonightsNightcaps: formattedNightcaps,
      stats,
      leaders: formattedLeaders,
      currentHour: new Date().getHours(),
      isNightcapTime: new Date().getHours() >= 20 || new Date().getHours() < 4,
    });

  } catch (error) {
    console.error("Nightcap API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch nightcap data" },
      { status: 500 }
    );
  }
}
