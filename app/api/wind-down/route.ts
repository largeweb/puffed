import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";

export const runtime = "edge";

// Wind Down: 9 PM - Midnight (21:00 - 24:00)
const WIND_DOWN_START = 21;
const WIND_DOWN_END = 24; // midnight

function isWindDownTime(unixTimestamp: number): boolean {
  const date = new Date(unixTimestamp * 1000);
  const hour = date.getHours();
  return hour >= WIND_DOWN_START && hour < WIND_DOWN_END;
}

function isSameDay(ts1: number, ts2: number): boolean {
  const d1 = new Date(ts1 * 1000);
  const d2 = new Date(ts2 * 1000);
  return d1.toDateString() === d2.toDateString();
}

interface CheckinRow {
  id: number;
  brand: string;
  product?: string;
  rating?: number;
  image_url?: string;
  created_at: number;
  username?: string;
  user_id: string;
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { env } = getRequestContext();
    const db = env.DB;
    
    const user = await verifyAuth(token, db);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const now = Math.floor(Date.now() / 1000);
    const todayStart = now - (now % 86400) - (new Date().getTimezoneOffset() * 60);
    
    // Get tonight's wind down smokes (9 PM - midnight today)
    const todaySmokes = await db.prepare(`
      SELECT 
        c.id, c.brand, c.product, c.rating, c.image_url, c.created_at, c.user_id,
        u.username
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      ORDER BY c.created_at DESC
    `).bind(todayStart).all();
    
    // Filter to wind down hours (9 PM - midnight)
    const tonightWindDown = ((todaySmokes.results || []) as unknown as CheckinRow[]).filter((c) => 
      isWindDownTime(c.created_at)
    );
    
    // Tonight's stats
    const tonightRatings = tonightWindDown.filter(c => c.rating).map(c => c.rating as number);
    const tonightAvgRating = tonightRatings.length > 0
      ? tonightRatings.reduce((a, b) => a + b, 0) / tonightRatings.length
      : 0;
    
    const tonightBrandCounts: Record<string, number> = {};
    tonightWindDown.forEach(c => {
      tonightBrandCounts[c.brand] = (tonightBrandCounts[c.brand] || 0) + 1;
    });
    const tonightTopBrand = Object.entries(tonightBrandCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;
    
    const tonightSmokers = new Set(tonightWindDown.map(c => c.user_id)).size;
    
    // User's today smokes (all day, for recap)
    const allTodaySmokes = (todaySmokes.results || []) as unknown as CheckinRow[];
    const yourTodaySmokes = allTodaySmokes.filter(c => c.user_id === user.id);
    const yourTodayRatings = yourTodaySmokes.filter(c => c.rating).map(c => c.rating as number);
    const yourTodayAvgRating = yourTodayRatings.length > 0
      ? yourTodayRatings.reduce((a, b) => a + b, 0) / yourTodayRatings.length
      : 0;
    const yourTodayBrands = [...new Set(yourTodaySmokes.map(c => c.brand))];
    
    // All-time wind down stats
    const allSmokes = await db.prepare(`
      SELECT id, brand, product, rating, image_url, created_at, user_id FROM checkins
    `).all();
    
    const allWindDownSmokes = ((allSmokes.results || []) as unknown as CheckinRow[]).filter(c =>
      isWindDownTime(c.created_at)
    );
    
    const totalWindDownSmokes = allWindDownSmokes.length;
    const yourWindDownSmokes = allWindDownSmokes.filter(c => c.user_id === user.id).length;
    
    // Peak wind down hour
    const hourCounts: Record<number, number> = {};
    allWindDownSmokes.forEach(c => {
      const hour = new Date(c.created_at * 1000).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakWindDownHour = Number(
      Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 21
    );
    
    // Recent check-ins from wind down time (last 3 hours or tonight)
    const threeHoursAgo = now - (3 * 3600);
    const recentCheckins = tonightWindDown
      .filter(c => c.created_at >= threeHoursAgo)
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        username: c.username,
        brand: c.brand,
        product: c.product,
        rating: c.rating,
        image_url: c.image_url,
        created_at: c.created_at
      }));
    
    return NextResponse.json({
      tonightSmokes: tonightWindDown.length,
      tonightAvgRating,
      tonightTopBrand,
      tonightSmokers,
      yourTodaySmokes: yourTodaySmokes.length,
      yourTodayAvgRating,
      yourTodayBrands,
      totalWindDownSmokes,
      yourWindDownSmokes,
      peakWindDownHour,
      recentCheckins
    });
  } catch (error) {
    console.error("Wind down API error:", error);
    return NextResponse.json({ error: "Failed to fetch wind down data" }, { status: 500 });
  }
}
