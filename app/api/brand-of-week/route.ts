import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

// Brand of the Week pool - interesting brands to feature
const FEATURED_BRANDS = [
  "Arturo Fuente",
  "Padron",
  "Oliva",
  "My Father",
  "Drew Estate",
  "Davidoff",
  "Romeo y Julieta",
  "Montecristo",
  "Cohiba",
  "Ashton",
  "Rocky Patel",
  "CAO",
  "Perdomo",
  "Alec Bradley",
  "La Flor Dominicana",
  "Tatuaje",
  "Liga Privada",
  "Undercrown",
  "Acid",
  "Punch",
];

// Get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Get deterministic brand for this week
function getBrandOfWeek(): { brand: string; weekNumber: number; year: number } {
  const now = new Date();
  const weekNumber = getWeekNumber(now);
  const year = now.getFullYear();
  
  // Use week + year to deterministically pick a brand
  const seed = weekNumber + (year * 53);
  const brandIndex = seed % FEATURED_BRANDS.length;
  
  return {
    brand: FEATURED_BRANDS[brandIndex],
    weekNumber,
    year,
  };
}

interface BrandOfWeekResponse {
  brand: string;
  weekNumber: number;
  year: number;
  platformStats: {
    totalCheckins: number;
    avgRating: number | null;
    uniqueSmokers: number;
  };
  userHasTried: boolean;
  userTriedThisWeek: boolean;
  participants: {
    username: string;
    rating: number | null;
    checkedInAt: number;
  }[];
  daysRemaining: number;
}

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = env.DB;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  const { brand, weekNumber, year } = getBrandOfWeek();

  // Get platform stats for this brand
  const platformStats = await db
    .prepare(`
      SELECT 
        COUNT(*) as total_checkins,
        AVG(rating) as avg_rating,
        COUNT(DISTINCT user_id) as unique_smokers
      FROM checkins 
      WHERE LOWER(brand) = LOWER(?)
    `)
    .bind(brand)
    .first<{ total_checkins: number; avg_rating: number | null; unique_smokers: number }>();

  // Calculate week start/end timestamps
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartTs = Math.floor(weekStart.getTime() / 1000);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndTs = Math.floor(weekEnd.getTime() / 1000);

  // Days remaining in the week
  const daysRemaining = Math.ceil((weekEndTs * 1000 - Date.now()) / (1000 * 60 * 60 * 24));

  // Get participants who tried this brand this week
  const participants = await db
    .prepare(`
      SELECT u.username, c.rating, c.created_at as checked_in_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE LOWER(c.brand) = LOWER(?)
        AND c.created_at >= ? AND c.created_at < ?
      ORDER BY c.created_at DESC
      LIMIT 10
    `)
    .bind(brand, weekStartTs, weekEndTs)
    .all<{ username: string; rating: number | null; checked_in_at: number }>();

  let userHasTried = false;
  let userTriedThisWeek = false;

  if (sessionId) {
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (session) {
      // Check if user has ever tried this brand
      const everTried = await db
        .prepare("SELECT 1 FROM checkins WHERE user_id = ? AND LOWER(brand) = LOWER(?) LIMIT 1")
        .bind(session.user_id, brand)
        .first();
      userHasTried = !!everTried;

      // Check if user tried this week
      const triedThisWeek = await db
        .prepare(`
          SELECT 1 FROM checkins 
          WHERE user_id = ? AND LOWER(brand) = LOWER(?) 
            AND created_at >= ? AND created_at < ?
          LIMIT 1
        `)
        .bind(session.user_id, brand, weekStartTs, weekEndTs)
        .first();
      userTriedThisWeek = !!triedThisWeek;
    }
  }

  const response: BrandOfWeekResponse = {
    brand,
    weekNumber,
    year,
    platformStats: {
      totalCheckins: platformStats?.total_checkins || 0,
      avgRating: platformStats?.avg_rating ? Math.round(platformStats.avg_rating * 10) / 10 : null,
      uniqueSmokers: platformStats?.unique_smokers || 0,
    },
    userHasTried,
    userTriedThisWeek,
    participants: (participants.results || []).map(p => ({
      username: p.username,
      rating: p.rating,
      checkedInAt: p.checked_in_at,
    })),
    daysRemaining,
  };

  return NextResponse.json(response);
}
