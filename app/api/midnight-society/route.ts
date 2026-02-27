import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

export const runtime = "edge";

interface MidnightMember {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  checkedAt: number;
  timeAgo: string;
  imageUrl?: string;
}

interface MidnightStats {
  totalMidnightSmokes: number;
  uniqueMidnightSmokers: number;
  yourMidnightCount: number;
  yourMidnightRank: string;
  isMidnightWindow: boolean;
  currentHour: number;
  mostPopularMidnightBrand?: string;
  peakMinute?: number;
}

interface Leader {
  username: string;
  count: number;
  favoriteHour: string;
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

function getMidnightRank(count: number): string {
  if (count === 0) return "Outsider";
  if (count === 1) return "Initiate";
  if (count <= 3) return "Night Wanderer";
  if (count <= 7) return "Shadow Smoker";
  if (count <= 15) return "Midnight Regular";
  if (count <= 30) return "Dark Hour Master";
  return "Society Elder";
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
    
    // Midnight Society window: 12 AM - 2 AM (the true midnight hours)
    const isMidnightWindow = currentHour >= 0 && currentHour < 2;
    
    // Tonight's midnight members (past 3 hours context)
    const tonightStart = now - (3 * 3600);
    
    const tonightResult = await db.prepare(`
      SELECT c.*, u.username 
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      ORDER BY c.created_at DESC
      LIMIT 50
    `).bind(tonightStart).all();
    
    // Filter to midnight window (12 AM - 2 AM)
    const tonightsMembers: MidnightMember[] = (tonightResult.results || [])
      .filter((r: Record<string, unknown>) => {
        const hour = new Date((r.created_at as number) * 1000).getHours();
        return hour >= 0 && hour < 2;
      })
      .slice(0, 15)
      .map((r: Record<string, unknown>) => ({
        username: r.username as string,
        brand: r.brand as string,
        product: r.product as string | undefined,
        rating: r.rating as number | undefined,
        checkedAt: r.created_at as number,
        timeAgo: getTimeAgo(new Date((r.created_at as number) * 1000)),
        imageUrl: r.image_url as string | undefined,
      }));

    // Platform-wide midnight stats
    const allCheckinsResult = await db.prepare(`
      SELECT created_at, user_id, brand FROM checkins
    `).all();
    
    let totalMidnightSmokes = 0;
    const uniqueSmokersSet = new Set<number>();
    const brandCounts: Record<string, number> = {};
    const minuteCounts: Record<number, number> = {};
    
    for (const r of (allCheckinsResult.results || [])) {
      const date = new Date((r.created_at as number) * 1000);
      const hour = date.getHours();
      if (hour >= 0 && hour < 2) {
        totalMidnightSmokes++;
        uniqueSmokersSet.add(r.user_id as number);
        const brand = r.brand as string;
        brandCounts[brand] = (brandCounts[brand] || 0) + 1;
        const minute = date.getMinutes();
        minuteCounts[minute] = (minuteCounts[minute] || 0) + 1;
      }
    }
    
    // Most popular midnight brand
    let mostPopularMidnightBrand: string | undefined;
    let maxBrandCount = 0;
    for (const [brand, count] of Object.entries(brandCounts)) {
      if (count > maxBrandCount) {
        maxBrandCount = count;
        mostPopularMidnightBrand = brand;
      }
    }

    // Peak smoking minute
    let peakMinute: number | undefined;
    let maxMinuteCount = 0;
    for (const [minute, count] of Object.entries(minuteCounts)) {
      if (count > maxMinuteCount) {
        maxMinuteCount = count;
        peakMinute = Number(minute);
      }
    }

    // User's personal midnight stats
    const userCheckinsResult = await db.prepare(`
      SELECT created_at FROM checkins WHERE user_id = ?
    `).bind(userId).all();
    
    let yourMidnightCount = 0;
    
    for (const r of (userCheckinsResult.results || [])) {
      const hour = new Date((r.created_at as number) * 1000).getHours();
      if (hour >= 0 && hour < 2) {
        yourMidnightCount++;
      }
    }

    // Midnight leaders
    const userMidnightCounts: Record<number, { count: number; hours: number[] }> = {};
    for (const r of (allCheckinsResult.results || [])) {
      const hour = new Date((r.created_at as number) * 1000).getHours();
      if (hour >= 0 && hour < 2) {
        const uid = r.user_id as number;
        if (!userMidnightCounts[uid]) {
          userMidnightCounts[uid] = { count: 0, hours: [] };
        }
        userMidnightCounts[uid].count++;
        userMidnightCounts[uid].hours.push(hour);
      }
    }
    
    // Get usernames
    const userIds = Object.keys(userMidnightCounts).map(Number);
    const usernameMap: Record<number, string> = {};
    if (userIds.length > 0) {
      const usersResult = await db.prepare(`
        SELECT id, username FROM users WHERE id IN (${userIds.join(",")})
      `).all();
      for (const u of (usersResult.results || [])) {
        usernameMap[u.id as number] = u.username as string;
      }
    }
    
    const leaders: Leader[] = Object.entries(userMidnightCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([uid, data]) => {
        // Find most common hour
        const hourCounts: Record<number, number> = {};
        for (const h of data.hours) {
          hourCounts[h] = (hourCounts[h] || 0) + 1;
        }
        let favoriteHour = 0;
        let maxHourCount = 0;
        for (const [h, c] of Object.entries(hourCounts)) {
          if (c > maxHourCount) {
            maxHourCount = c;
            favoriteHour = Number(h);
          }
        }
        return {
          username: usernameMap[Number(uid)] || "Unknown",
          count: data.count,
          favoriteHour: formatHour(favoriteHour),
        };
      });

    const stats: MidnightStats = {
      totalMidnightSmokes,
      uniqueMidnightSmokers: uniqueSmokersSet.size,
      yourMidnightCount,
      yourMidnightRank: getMidnightRank(yourMidnightCount),
      isMidnightWindow,
      currentHour,
      mostPopularMidnightBrand,
      peakMinute,
    };

    return NextResponse.json({
      tonightsMembers,
      stats,
      leaders,
    });
  } catch (error) {
    console.error("Midnight Society API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
