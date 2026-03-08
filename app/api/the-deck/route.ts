import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface CheckIn {
  id: number;
  brand: string;
  product: string | null;
  rating: number;
  created_at: number;
  image_url: string | null;
  username: string;
  review: string | null;
}

interface DeckChampion {
  username: string;
  deckSmokes: number;
  avgRating: number;
  favoriteHour: number;
  topBrand: string | null;
}

export async function GET(): Promise<Response> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;

  const { env } = getRequestContext();
  const db = env.DB;

  // Get user from session if logged in
  let userId: string | null = null;
  if (sessionId) {
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();
    if (session) {
      userId = session.user_id;
    }
  }

  const now = new Date();
  const hour = now.getUTCHours() - 5; // Adjust for EST (simplistic)
  const adjustedHour = hour < 0 ? hour + 24 : hour;
  const day = now.getUTCDay();
  const adjustedDay = hour < 0 ? (day === 0 ? 6 : day - 1) : day;

  // Deck time: Every day 12 PM - 7 PM EST (the afternoon sweet spot)
  const isDeckTime = adjustedHour >= 12 && adjustedHour < 19;
  const isWeekend = adjustedDay === 0 || adjustedDay === 6;

  // Time context messages
  let timeMessage = "";
  let deckMood = "";
  if (adjustedHour < 12) {
    const hoursUntil = 12 - adjustedHour;
    timeMessage = `${hoursUntil} hour${hoursUntil > 1 ? "s" : ""} until deck time!`;
    deckMood = "anticipation";
  } else if (adjustedHour >= 19) {
    timeMessage = "The deck is closed for the day. Come back tomorrow afternoon!";
    deckMood = "closed";
  } else {
    const hoursLeft = 19 - adjustedHour;
    timeMessage = `${hoursLeft} hour${hoursLeft > 1 ? "s" : ""} of afternoon vibes left!`;
    deckMood = "open";
  }

  // Current deck vibes based on time
  const deckVibes = [
    { hour: 12, vibe: "Post-Lunch Chill", emoji: "🍽️", desc: "Perfect post-meal smoke" },
    { hour: 13, vibe: "Afternoon Starter", emoji: "☀️", desc: "The day is young" },
    { hour: 14, vibe: "Peak Relaxation", emoji: "😎", desc: "Prime deck time" },
    { hour: 15, vibe: "Mid-Afternoon Zen", emoji: "🧘", desc: "Find your peace" },
    { hour: 16, vibe: "Golden Hour Approaching", emoji: "🌤️", desc: "The light gets good" },
    { hour: 17, vibe: "Happy Hour Smoke", emoji: "🍺", desc: "Wind down time" },
    { hour: 18, vibe: "Evening Transition", emoji: "🌅", desc: "Day's final smoke" },
  ];
  const currentVibe = deckVibes.find(v => v.hour === adjustedHour) || deckVibes[0];

  // Today's deck sessions (12 PM - 7 PM today)
  const todayStart = new Date(now);
  todayStart.setUTCHours(17, 0, 0, 0); // 12 PM EST = 17 UTC
  const todayEnd = new Date(now);
  todayEnd.setUTCHours(24, 0, 0, 0); // 7 PM EST = 00 UTC next day

  let currentDeckSmokers: CheckIn[] = [];
  const smokersResult = await db
    .prepare(
      `
      SELECT c.id, c.brand, c.product, c.rating, c.created_at, c.image_url, c.review, u.username
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at < ?
      ORDER BY c.created_at DESC
      LIMIT 20
    `
    )
    .bind(
      Math.floor(todayStart.getTime() / 1000),
      Math.floor(todayEnd.getTime() / 1000)
    )
    .all();
  currentDeckSmokers = (smokersResult.results || []) as unknown as CheckIn[];

  // All-time afternoon leaderboard (12 PM - 7 PM any day)
  const leaderboardResult = await db
    .prepare(
      `
      SELECT 
        u.username,
        COUNT(*) as deckSmokes,
        AVG(c.rating) as avgRating,
        (
          SELECT brand FROM checkins c2 
          WHERE c2.user_id = u.id 
          AND (strftime('%H', datetime(c2.created_at, 'unixepoch', '-5 hours')) BETWEEN '12' AND '18')
          GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1
        ) as topBrand
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) BETWEEN '12' AND '18'
      GROUP BY u.id
      ORDER BY deckSmokes DESC
      LIMIT 10
    `
    )
    .all();
  const leaderboard = (leaderboardResult.results || []) as unknown as DeckChampion[];

  // Platform deck stats
  const statsResult = await db
    .prepare(
      `
      SELECT 
        COUNT(*) as totalSmokes,
        COUNT(DISTINCT user_id) as uniqueSmokers,
        AVG(rating) as avgRating,
        (
          SELECT brand FROM checkins 
          WHERE strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) BETWEEN '12' AND '18'
          GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1
        ) as topBrand
      FROM checkins
      WHERE strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) BETWEEN '12' AND '18'
    `
    )
    .first<{ totalSmokes: number; uniqueSmokers: number; avgRating: number; topBrand: string | null }>();

  // User's deck stats
  let myStats = null;
  if (userId) {
    const myResult = await db
      .prepare(
        `
        SELECT 
          COUNT(*) as totalSmokes,
          AVG(rating) as avgRating,
          (
            SELECT brand FROM checkins 
            WHERE user_id = ? 
            AND strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) BETWEEN '12' AND '18'
            GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1
          ) as favoriteBrand
        FROM checkins
        WHERE user_id = ?
        AND strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) BETWEEN '12' AND '18'
      `
      )
      .bind(userId, userId)
      .first<{ totalSmokes: number; avgRating: number; favoriteBrand: string | null }>();
    if (myResult && myResult.totalSmokes > 0) {
      myStats = myResult;
    }
  }

  // Fun deck facts
  const deckFacts = [
    "The perfect deck temperature for cigar smoking is between 65-75°F",
    "Afternoon sunlight actually helps you see smoke rings better",
    "Most cigars taste their best after a good meal",
    "The 'golden hour' makes for the best cigar photography",
    "A light breeze on the deck can enhance the smoking experience",
    "Many cigar aficionados prefer afternoon over evening smoking",
    "The post-lunch smoke is a tradition dating back centuries",
    "Deck time is scientifically the most relaxing part of the day",
  ];
  const randomFact = deckFacts[Math.floor(Math.random() * deckFacts.length)];

  // Weather vibe (simulated - could integrate real weather)
  const weatherVibes = ["☀️ Perfect deck weather", "🌤️ Great afternoon", "⛅ Cloudy but cozy", "🌈 After the rain"];
  const todayWeather = weatherVibes[now.getDay() % weatherVibes.length];

  return Response.json({
    isDeckTime,
    isWeekend,
    currentHour: adjustedHour,
    timeMessage,
    deckMood,
    currentVibe,
    allVibes: deckVibes,
    todayWeather,
    currentDeckSmokers: currentDeckSmokers.map(s => ({
      id: s.id,
      username: s.username,
      brand: s.brand,
      product: s.product,
      rating: s.rating,
      photoUrl: s.image_url,
      review: s.review,
      time: new Date(s.created_at * 1000).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/New_York",
      }),
    })),
    leaderboard,
    stats: {
      totalSmokes: statsResult?.totalSmokes || 0,
      uniqueSmokers: statsResult?.uniqueSmokers || 0,
      avgRating: Math.round((statsResult?.avgRating || 0) * 10) / 10,
      topBrand: statsResult?.topBrand,
    },
    myStats,
    deckFact: randomFact,
  });
}
