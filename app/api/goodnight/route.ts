import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

export const runtime = "edge";

interface GoodnightSmoker {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  checkedAt: number;
  timeAgo: string;
  imageUrl?: string;
}

interface GoodnightStats {
  totalGoodnightSmokes: number;
  uniqueGoodnightSmokers: number;
  avgGoodnightHour: number;
  yourGoodnightCount: number;
  yourAvgBedtime: string;
  isGoodnightWindow: boolean;
  currentHour: number;
  mostPopularGoodnightBrand?: string;
}

interface Leader {
  username: string;
  count: number;
  avgHour: string;
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export async function GET(request: Request) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    // Auth check
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);
    
    let userId: number | null = null;
    if (sessionId) {
      const now = Math.floor(Date.now() / 1000);
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
        .bind(sessionId, now)
        .first<{ user_id: number }>();
      if (session) {
        userId = session.user_id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = Math.floor(Date.now() / 1000);
    const currentHour = new Date().getHours();
    
    // Goodnight window: 9 PM - 2 AM (prime bedtime smoking hours)
    const isGoodnightWindow = currentHour >= 21 || currentHour <= 2;
    
    // Tonight's goodnight smokers (9 PM - 2 AM window)
    // Look at last 7 hours for "tonight" context
    const tonightStart = now - (7 * 3600);
    
    const tonightResult = await db.prepare(`
      SELECT c.*, u.username 
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      ORDER BY c.created_at DESC
      LIMIT 30
    `).bind(tonightStart).all();
    
    // Filter to goodnight window hours (9 PM - 2 AM)
    const tonightsSmokers: GoodnightSmoker[] = (tonightResult.results || [])
      .filter((r: Record<string, unknown>) => {
        const hour = new Date((r.created_at as number) * 1000).getHours();
        return hour >= 21 || hour <= 2;
      })
      .slice(0, 20)
      .map((r: Record<string, unknown>) => ({
        username: r.username as string,
        brand: r.brand as string,
        product: r.product as string | undefined,
        rating: r.rating as number | undefined,
        checkedAt: r.created_at as number,
        timeAgo: getTimeAgo(new Date((r.created_at as number) * 1000)),
        imageUrl: r.image_url as string | undefined,
      }));

    // Platform-wide goodnight stats - simple count approach
    const allCheckinsResult = await db.prepare(`
      SELECT created_at, user_id, brand FROM checkins
    `).all();
    
    let totalGoodnightSmokes = 0;
    const uniqueSmokersSet = new Set<number>();
    const brandCounts: Record<string, number> = {};
    
    for (const r of (allCheckinsResult.results || [])) {
      const hour = new Date((r.created_at as number) * 1000).getHours();
      if (hour >= 21 || hour <= 2) {
        totalGoodnightSmokes++;
        uniqueSmokersSet.add(r.user_id as number);
        const brand = r.brand as string;
        brandCounts[brand] = (brandCounts[brand] || 0) + 1;
      }
    }
    
    // Most popular goodnight brand
    let mostPopularGoodnightBrand: string | undefined;
    let maxCount = 0;
    for (const [brand, count] of Object.entries(brandCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostPopularGoodnightBrand = brand;
      }
    }

    // User's personal goodnight stats
    const userCheckinsResult = await db.prepare(`
      SELECT created_at FROM checkins WHERE user_id = ?
    `).bind(userId).all();
    
    let yourGoodnightCount = 0;
    const yourHours: number[] = [];
    
    for (const r of (userCheckinsResult.results || [])) {
      const hour = new Date((r.created_at as number) * 1000).getHours();
      if (hour >= 21 || hour <= 2) {
        yourGoodnightCount++;
        yourHours.push(hour);
      }
    }
    
    let yourAvgBedtime = "N/A";
    if (yourHours.length > 0) {
      // Handle wraparound (e.g., 11 PM and 1 AM should average to midnight)
      const normalizedHours = yourHours.map(h => h <= 2 ? h + 24 : h);
      const avgNormalized = normalizedHours.reduce((a, b) => a + b, 0) / normalizedHours.length;
      const avgHour = avgNormalized >= 24 ? avgNormalized - 24 : avgNormalized;
      yourAvgBedtime = formatHour(Math.round(avgHour));
    }

    // Goodnight leaders (most late-night smokes)
    const userGoodnightCounts: Record<number, { count: number; hours: number[] }> = {};
    for (const r of (allCheckinsResult.results || [])) {
      const hour = new Date((r.created_at as number) * 1000).getHours();
      if (hour >= 21 || hour <= 2) {
        const uid = r.user_id as number;
        if (!userGoodnightCounts[uid]) {
          userGoodnightCounts[uid] = { count: 0, hours: [] };
        }
        userGoodnightCounts[uid].count++;
        userGoodnightCounts[uid].hours.push(hour);
      }
    }
    
    // Get usernames
    const userIds = Object.keys(userGoodnightCounts).map(Number);
    const usernameMap: Record<number, string> = {};
    if (userIds.length > 0) {
      const usersResult = await db.prepare(`
        SELECT id, username FROM users WHERE id IN (${userIds.join(",")})
      `).all();
      for (const u of (usersResult.results || [])) {
        usernameMap[u.id as number] = u.username as string;
      }
    }
    
    const leaders: Leader[] = Object.entries(userGoodnightCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([uid, data]) => {
        const normalizedHours = data.hours.map(h => h <= 2 ? h + 24 : h);
        const avgNormalized = normalizedHours.reduce((a, b) => a + b, 0) / normalizedHours.length;
        const avgHour = avgNormalized >= 24 ? avgNormalized - 24 : avgNormalized;
        return {
          username: usernameMap[Number(uid)] || "Unknown",
          count: data.count,
          avgHour: formatHour(Math.round(avgHour)),
        };
      });

    const stats: GoodnightStats = {
      totalGoodnightSmokes,
      uniqueGoodnightSmokers: uniqueSmokersSet.size,
      avgGoodnightHour: 22,
      yourGoodnightCount,
      yourAvgBedtime,
      isGoodnightWindow,
      currentHour,
      mostPopularGoodnightBrand,
    };

    return NextResponse.json({
      tonightsSmokers,
      stats,
      leaders,
    });
  } catch (error) {
    console.error("Goodnight API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
