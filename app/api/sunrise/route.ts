import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse, NextRequest } from "next/server";

export const runtime = "edge";

interface CheckinRow {
  id: number;
  user_id: number;
  username: string;
  brand: string;
  product: string | null;
  rating: number | null;
  created_at: number;
  image_url: string | null;
}

interface LeaderRow {
  username: string;
  dawn_count: number;
}

interface CountRow {
  count: number;
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getNightPhase(hour: number): { phase: string; emoji: string } {
  if (hour >= 5 && hour < 6) return { phase: "Pre-Dawn Glow", emoji: "🌅" };
  if (hour >= 4 && hour < 5) return { phase: "The Quiet Hour", emoji: "🌄" };
  if (hour >= 3 && hour < 4) return { phase: "Devil's Hour", emoji: "👿" };
  if (hour >= 2 && hour < 3) return { phase: "Deep Night", emoji: "🌑" };
  if (hour >= 1 && hour < 2) return { phase: "Witching Hour", emoji: "🧙" };
  if (hour >= 0 && hour < 1) return { phase: "Midnight Watch", emoji: "🕛" };
  if (hour >= 22 || hour < 0) return { phase: "Evening Fade", emoji: "🌙" };
  return { phase: "Daytime", emoji: "☀️" };
}

function getMotivationalMessage(hour: number): string {
  const messages = {
    preDawn: [
      "The darkest hour is just before dawn...",
      "Few have the courage to watch night become day.",
      "You've outlasted the shadows. The light approaches.",
      "Dawn rewards those who wait in darkness.",
    ],
    devilsHour: [
      "3 AM — when the veil between worlds is thinnest.",
      "Only the bold smoke at the devil's hour.",
      "The night tests you. Hold strong.",
      "This is when legends are made.",
    ],
    deepNight: [
      "The world sleeps. You remain vigilant.",
      "Every night owl knows this sacred silence.",
      "The deepest night hides the brightest stars.",
      "You're not awake — you're alive.",
    ],
    witchingHour: [
      "Magic happens between midnight and dawn.",
      "The witching hour belongs to dreamers and rebels.",
      "Let the smoke carry your midnight thoughts.",
      "Some truths only reveal themselves at night.",
    ],
    midnight: [
      "A new day begins in darkness.",
      "Midnight: where yesterday and tomorrow meet.",
      "The world resets. Your watch begins.",
      "First smoke of a new day hits different.",
    ],
    evening: [
      "The night is young. The journey begins.",
      "Settle in. The long watch awaits.",
      "Evening fades into something more.",
      "The stars are coming out to play.",
    ],
  };

  let category: keyof typeof messages;
  if (hour >= 5 && hour < 6) category = "preDawn";
  else if (hour >= 3 && hour < 5) category = "devilsHour";
  else if (hour >= 2 && hour < 3) category = "deepNight";
  else if (hour >= 1 && hour < 2) category = "witchingHour";
  else if (hour >= 0 && hour < 1) category = "midnight";
  else category = "evening";

  const msgs = messages[category];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

function getSunriseTime(): { time: string; hours: number; minutes: number } {
  const now = new Date();
  const month = now.getMonth();
  // Rough EST sunrise times by season
  const isSummer = month >= 4 && month <= 8;
  const sunriseHour = isSummer ? 5 : 6;
  const sunriseMinute = isSummer ? 45 : 45;

  const sunrise = new Date(now);
  sunrise.setHours(sunriseHour, sunriseMinute, 0, 0);

  // If we've passed sunrise, it's 0
  if (now >= sunrise) {
    return { time: `${sunriseHour}:${sunriseMinute.toString().padStart(2, "0")} AM`, hours: 0, minutes: 0 };
  }

  const diff = sunrise.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return {
    time: `${sunriseHour}:${sunriseMinute.toString().padStart(2, "0")} AM`,
    hours,
    minutes,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Get session cookie
    const sessionToken = request.cookies.get("session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate session
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?")
      .bind(sessionToken, Date.now())
      .first<{ user_id: number }>();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user_id;
    const now = Date.now();
    const currentHour = new Date().getHours();
    
    // Tonight's window: 10 PM yesterday to 6 AM today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const tonightStart = new Date(todayStart);
    if (currentHour < 10) {
      // We're past midnight, so "tonight" started yesterday at 10 PM
      tonightStart.setDate(tonightStart.getDate() - 1);
    }
    tonightStart.setHours(22, 0, 0, 0);
    
    const tonightEnd = new Date(tonightStart);
    tonightEnd.setDate(tonightEnd.getDate() + 1);
    tonightEnd.setHours(8, 0, 0, 0);

    // Get active night owls (smokes logged between 10 PM - 6 AM tonight)
    const activeOwls = await db
      .prepare(
        `SELECT c.id, c.user_id, u.username, c.brand, c.product, c.rating, c.created_at, c.image_url
         FROM checkins c
         JOIN users u ON c.user_id = u.id
         WHERE c.created_at >= ? AND c.created_at <= ?
         ORDER BY c.created_at DESC
         LIMIT 20`
      )
      .bind(tonightStart.getTime(), Math.min(now, tonightEnd.getTime()))
      .all<CheckinRow>();

    // Get dawn watch leaders (smokes logged between 4-7 AM all time)
    const dawnLeaders = await db
      .prepare(
        `SELECT u.username, COUNT(*) as dawn_count
         FROM checkins c
         JOIN users u ON c.user_id = u.id
         WHERE (c.created_at / 1000 / 3600 + 19) % 24 >= 4 
         AND (c.created_at / 1000 / 3600 + 19) % 24 < 7
         GROUP BY u.id
         ORDER BY dawn_count DESC
         LIMIT 10`
      )
      .all<LeaderRow>();

    // Total dawn watches (4-7 AM smokes)
    const totalDawnWatches = await db
      .prepare(
        `SELECT COUNT(*) as count FROM checkins
         WHERE (created_at / 1000 / 3600 + 19) % 24 >= 4 
         AND (created_at / 1000 / 3600 + 19) % 24 < 7`
      )
      .first<CountRow>();

    // User's dawn watches
    const userDawnWatches = await db
      .prepare(
        `SELECT COUNT(*) as count FROM checkins
         WHERE user_id = ?
         AND (created_at / 1000 / 3600 + 19) % 24 >= 4 
         AND (created_at / 1000 / 3600 + 19) % 24 < 7`
      )
      .bind(userId)
      .first<CountRow>();

    // Tonight's active count
    const tonightActive = await db
      .prepare(
        `SELECT COUNT(DISTINCT user_id) as count FROM checkins
         WHERE created_at >= ? AND created_at <= ?`
      )
      .bind(tonightStart.getTime(), Math.min(now, tonightEnd.getTime()))
      .first<CountRow>();

    const sunriseInfo = getSunriseTime();
    const nightPhaseInfo = getNightPhase(currentHour);

    const formattedOwls = (activeOwls.results || []).map((owl) => ({
      username: owl.username,
      brand: owl.brand,
      product: owl.product,
      rating: owl.rating,
      checkedAt: owl.created_at,
      timeAgo: getTimeAgo(owl.created_at),
      imageUrl: owl.image_url,
    }));

    const formattedLeaders = (dawnLeaders.results || []).map((leader, idx) => ({
      username: leader.username,
      count: leader.dawn_count,
      rank: idx + 1,
    }));

    return NextResponse.json({
      activeNightOwls: formattedOwls,
      stats: {
        hoursUntilSunrise: sunriseInfo.hours,
        minutesUntilSunrise: sunriseInfo.minutes,
        sunriseTime: sunriseInfo.time,
        isPreDawn: currentHour >= 4 && currentHour < 6,
        nightPhase: nightPhaseInfo.phase,
        phaseEmoji: nightPhaseInfo.emoji,
        totalDawnWatchers: totalDawnWatches?.count || 0,
        yourDawnWatches: userDawnWatches?.count || 0,
        tonightActiveCount: tonightActive?.count || 0,
      },
      dawnLeaders: formattedLeaders,
      motivationalMessage: getMotivationalMessage(currentHour),
    });
  } catch (error) {
    console.error("Sunrise API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
