import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

export const runtime = "edge";

interface CovenMember {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  checkedAt: number;
  timeAgo: string;
  imageUrl?: string;
}

interface WitchingStats {
  totalWitchingSmokes: number;
  uniqueWitches: number;
  yourWitchingCount: number;
  yourMysticTitle: string;
  isWitchingHour: boolean;
  currentHour: number;
  mostCommonOffering?: string;
  darkestHour?: number;
}

interface MysticLeader {
  username: string;
  count: number;
  mysticTitle: string;
  favoriteHour: string;
}

interface TarotReading {
  card: string;
  emoji: string;
  meaning: string;
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
  if (hour === 0) return "Midnight";
  if (hour === 1) return "1 AM";
  if (hour === 2) return "2 AM";
  if (hour === 3) return "3 AM";
  return `${hour} AM`;
}

function getMysticTitle(count: number): string {
  if (count === 0) return "Mortal";
  if (count === 1) return "Initiate";
  if (count <= 3) return "Apprentice";
  if (count <= 7) return "Seer";
  if (count <= 12) return "Mystic";
  if (count <= 20) return "Warlock";
  if (count <= 35) return "Witch";
  if (count <= 50) return "High Priestess";
  return "Grand Coven Master";
}

function getTarotReading(count: number, favoriteBrand?: string): TarotReading {
  const readings: TarotReading[] = [
    { card: "The Moon", emoji: "🌙", meaning: "Mystery surrounds your next smoke. Trust your instincts." },
    { card: "The Star", emoji: "⭐", meaning: "A perfect smoking session awaits in your near future." },
    { card: "The Tower", emoji: "🗼", meaning: "Your usual brand may surprise you. Embrace change." },
    { card: "The Hermit", emoji: "🧙", meaning: "Solo smoke sessions will bring clarity tonight." },
    { card: "The Magician", emoji: "🪄", meaning: "Your next pairing will be magical. Wine perhaps?" },
    { card: "Death", emoji: "💀", meaning: "Time to retire an old brand and discover something new." },
    { card: "The High Priestess", emoji: "🔮", meaning: "The smoke whispers secrets. Listen closely." },
    { card: "The Devil", emoji: "😈", meaning: "Indulge tonight. The witching hour demands it." },
    { card: "The Empress", emoji: "👑", meaning: "Share your wisdom with a fellow smoker." },
    { card: "The Fool", emoji: "🃏", meaning: "Take a chance on an unknown brand tonight." },
  ];
  
  // Deterministic based on count + day
  const dayOfYear = Math.floor(Date.now() / 86400000);
  const index = (count + dayOfYear) % readings.length;
  return readings[index];
}

export async function GET(request: Request) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
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
    
    // Witching Hour window: 12 AM - 3 AM (the mystical hours)
    const isWitchingHour = currentHour >= 0 && currentHour < 3;
    
    // Tonight's coven (past 4 hours context)
    const tonightStart = now - (4 * 3600);
    
    const tonightResult = await db.prepare(`
      SELECT c.*, u.username 
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      ORDER BY c.created_at DESC
      LIMIT 50
    `).bind(tonightStart).all();
    
    // Filter to witching hours (12 AM - 3 AM)
    const covenMembers: CovenMember[] = (tonightResult.results || [])
      .filter((r: Record<string, unknown>) => {
        const hour = new Date((r.created_at as number) * 1000).getHours();
        return hour >= 0 && hour < 3;
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

    // Platform-wide witching stats
    const allCheckinsResult = await db.prepare(`
      SELECT created_at, user_id, brand FROM checkins
    `).all();
    
    let totalWitchingSmokes = 0;
    const uniqueWitchesSet = new Set<number>();
    const brandCounts: Record<string, number> = {};
    const hourCounts: Record<number, number> = {};
    
    for (const r of (allCheckinsResult.results || [])) {
      const date = new Date((r.created_at as number) * 1000);
      const hour = date.getHours();
      if (hour >= 0 && hour < 3) {
        totalWitchingSmokes++;
        uniqueWitchesSet.add(r.user_id as number);
        const brand = r.brand as string;
        brandCounts[brand] = (brandCounts[brand] || 0) + 1;
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    }
    
    // Most common offering (brand)
    let mostCommonOffering: string | undefined;
    let maxBrandCount = 0;
    for (const [brand, count] of Object.entries(brandCounts)) {
      if (count > maxBrandCount) {
        maxBrandCount = count;
        mostCommonOffering = brand;
      }
    }

    // Darkest hour (most active)
    let darkestHour: number | undefined;
    let maxHourCount = 0;
    for (const [hour, count] of Object.entries(hourCounts)) {
      if (count > maxHourCount) {
        maxHourCount = count;
        darkestHour = Number(hour);
      }
    }

    // User's personal witching stats
    const userCheckinsResult = await db.prepare(`
      SELECT created_at, brand FROM checkins WHERE user_id = ?
    `).bind(userId).all();
    
    let yourWitchingCount = 0;
    const userBrandCounts: Record<string, number> = {};
    
    for (const r of (userCheckinsResult.results || [])) {
      const hour = new Date((r.created_at as number) * 1000).getHours();
      if (hour >= 0 && hour < 3) {
        yourWitchingCount++;
        const brand = r.brand as string;
        userBrandCounts[brand] = (userBrandCounts[brand] || 0) + 1;
      }
    }
    
    // User's favorite brand for tarot reading
    let userFavoriteBrand: string | undefined;
    let maxUserBrandCount = 0;
    for (const [brand, count] of Object.entries(userBrandCounts)) {
      if (count > maxUserBrandCount) {
        maxUserBrandCount = count;
        userFavoriteBrand = brand;
      }
    }

    // Mystic leaders (most witching hour smokes)
    const userWitchingCounts: Record<number, { count: number; hours: number[] }> = {};
    for (const r of (allCheckinsResult.results || [])) {
      const hour = new Date((r.created_at as number) * 1000).getHours();
      if (hour >= 0 && hour < 3) {
        const uid = r.user_id as number;
        if (!userWitchingCounts[uid]) {
          userWitchingCounts[uid] = { count: 0, hours: [] };
        }
        userWitchingCounts[uid].count++;
        userWitchingCounts[uid].hours.push(hour);
      }
    }
    
    // Get usernames
    const userIds = Object.keys(userWitchingCounts).map(Number);
    const usernameMap: Record<number, string> = {};
    if (userIds.length > 0) {
      const usersResult = await db.prepare(`
        SELECT id, username FROM users WHERE id IN (${userIds.join(",")})
      `).all();
      for (const u of (usersResult.results || [])) {
        usernameMap[u.id as number] = u.username as string;
      }
    }
    
    const mysticLeaders: MysticLeader[] = Object.entries(userWitchingCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([uid, data]) => {
        // Find most common hour
        const hCounts: Record<number, number> = {};
        for (const h of data.hours) {
          hCounts[h] = (hCounts[h] || 0) + 1;
        }
        let favoriteHour = 0;
        let maxHCount = 0;
        for (const [h, c] of Object.entries(hCounts)) {
          if (c > maxHCount) {
            maxHCount = c;
            favoriteHour = Number(h);
          }
        }
        return {
          username: usernameMap[Number(uid)] || "Unknown",
          count: data.count,
          mysticTitle: getMysticTitle(data.count),
          favoriteHour: formatHour(favoriteHour),
        };
      });

    const stats: WitchingStats = {
      totalWitchingSmokes,
      uniqueWitches: uniqueWitchesSet.size,
      yourWitchingCount,
      yourMysticTitle: getMysticTitle(yourWitchingCount),
      isWitchingHour,
      currentHour,
      mostCommonOffering,
      darkestHour,
    };

    const tarotReading = getTarotReading(yourWitchingCount, userFavoriteBrand);

    return NextResponse.json({
      covenMembers,
      stats,
      mysticLeaders,
      tarotReading,
    });
  } catch (error) {
    console.error("Witching Hour API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
