import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface FirstSmokeResponse {
  claimed: boolean;
  winner?: {
    username: string;
    brand: string;
    product?: string;
    rating?: number;
    time: string;
    timeAgo: string;
    checkinId: string;
    imageUrl?: string;
  };
  recentEarlyBirds: Array<{
    username: string;
    brand: string;
    time: string;
    rank: number;
  }>;
  yourRank?: number;
  yourTime?: string;
  totalSmokesToday: number;
  dayOfWeek: string;
  funFact?: string;
  error?: string;
}

// Fun facts for different days
const DAY_FACTS: Record<string, string[]> = {
  Sunday: [
    "Sunday morning cigars are 40% more relaxing (probably)",
    "The most popular Sunday pairing: coffee ☕",
    "Sunday = the original cigar day since 1492",
  ],
  Monday: [
    "Monday smokers are 3x more likely to have their life together",
    "Starting the week right! 💪",
    "Monday morning smoke = power move energy",
  ],
  Tuesday: [
    "Tuesday is the most underrated cigar day",
    "Taco Tuesday? More like Tobacco Tuesday 🌮",
    "Second day momentum building!",
  ],
  Wednesday: [
    "Hump Day smoke hits different 🐫",
    "Midweek motivation in smoke form",
    "Wednesday warriors rise up!",
  ],
  Thursday: [
    "Almost Friday vibes in every puff",
    "Thursday = the warm-up weekend smoke",
    "Pre-Friday celebration mode",
  ],
  Friday: [
    "TGIF energy is the best energy 🎉",
    "Friday morning smoke = weekend officially started",
    "The most celebrated smoking day!",
  ],
  Saturday: [
    "Weekend warrior status: ACTIVE",
    "Saturday mornings were made for cigars",
    "No rush, just vibes ✨",
  ],
};

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours === 1) return "1 hour ago";
  return `${hours} hours ago`;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });
}

function getDayOfWeek(): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const now = new Date();
  return days[now.getDay()];
}

function getRandomFact(day: string): string {
  const facts = DAY_FACTS[day] || DAY_FACTS.Wednesday;
  return facts[Math.floor(Math.random() * facts.length)];
}

export async function GET(request: NextRequest): Promise<NextResponse<FirstSmokeResponse>> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Get current user if logged in
    const sessionId = request.cookies.get("session")?.value;
    let currentUserId: string | null = null;

    if (sessionId) {
      const session = await db.prepare(
        "SELECT user_id FROM sessions WHERE id = ? AND expires_at > unixepoch()"
      ).bind(sessionId).first<{ user_id: string }>();
      currentUserId = session?.user_id || null;
    }

    // Get today's date boundaries (EST timezone)
    const now = new Date();
    const estOffset = -5 * 60; // EST is UTC-5
    const utcNow = now.getTime() + (now.getTimezoneOffset() * 60000);
    const estNow = new Date(utcNow + (estOffset * 60000));
    
    const todayStart = new Date(estNow);
    todayStart.setHours(0, 0, 0, 0);
    const todayStartUnix = Math.floor((todayStart.getTime() - (estOffset * 60000) + (now.getTimezoneOffset() * 60000)) / 1000);

    const dayOfWeek = getDayOfWeek();

    // Get all check-ins today, ordered by time
    const todayCheckins = await db.prepare(`
      SELECT 
        c.id,
        c.user_id,
        c.brand,
        c.product,
        c.rating,
        c.image_url,
        c.created_at,
        u.username
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      ORDER BY c.created_at ASC
      LIMIT 10
    `).bind(todayStartUnix).all<{
      id: string;
      user_id: string;
      brand: string;
      product: string | null;
      rating: number | null;
      image_url: string | null;
      created_at: number;
      username: string;
    }>();

    const checkins = todayCheckins.results || [];
    const totalSmokesToday = checkins.length;

    // No smokes yet today
    if (checkins.length === 0) {
      return NextResponse.json({
        claimed: false,
        recentEarlyBirds: [],
        totalSmokesToday: 0,
        dayOfWeek,
        funFact: getRandomFact(dayOfWeek),
      });
    }

    // First smoke winner
    const winner = checkins[0];
    
    // Build early birds list (top 5)
    const recentEarlyBirds = checkins.slice(0, 5).map((c, i) => ({
      username: c.username,
      brand: c.brand,
      time: formatTime(c.created_at),
      rank: i + 1,
    }));

    // Find current user's rank if they smoked today
    let yourRank: number | undefined;
    let yourTime: string | undefined;
    
    if (currentUserId) {
      const userIndex = checkins.findIndex(c => c.user_id === currentUserId);
      if (userIndex >= 0) {
        yourRank = userIndex + 1;
        yourTime = formatTime(checkins[userIndex].created_at);
      }
    }

    return NextResponse.json({
      claimed: true,
      winner: {
        username: winner.username,
        brand: winner.brand,
        product: winner.product || undefined,
        rating: winner.rating || undefined,
        time: formatTime(winner.created_at),
        timeAgo: getTimeAgo(winner.created_at),
        checkinId: winner.id,
        imageUrl: winner.image_url || undefined,
      },
      recentEarlyBirds,
      yourRank,
      yourTime,
      totalSmokesToday,
      dayOfWeek,
      funFact: getRandomFact(dayOfWeek),
    });
  } catch (error) {
    console.error("First smoke today error:", error);
    return NextResponse.json({ 
      error: "Failed to load first smoke data",
      claimed: false,
      recentEarlyBirds: [],
      totalSmokesToday: 0,
      dayOfWeek: getDayOfWeek(),
    } as FirstSmokeResponse, { status: 500 });
  }
}
