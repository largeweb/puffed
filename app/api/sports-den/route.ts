import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface DBRow {
  id?: number;
  username?: string;
  brand?: string;
  product?: string;
  rating?: number;
  photo_url?: string;
  created_at?: string;
  total?: number;
  count?: number;
  smoke_count?: number;
  avg_rating?: number;
  top_brand?: string;
  favorite_hour?: number;
  unique_fans?: number;
  fav_brand?: string;
  user_id?: string;
}

const SPORTS_SCHEDULE = [
  { hour: 12, activity: "🏈 Pre-Game Warmup", desc: "Get your snacks and cigars ready" },
  { hour: 13, activity: "⚽ Early Kickoff", desc: "First games of the day" },
  { hour: 14, activity: "🏀 Prime Time Action", desc: "Main event energy" },
  { hour: 15, activity: "🏒 Intermission Smoke", desc: "Halftime cigar break" },
  { hour: 16, activity: "⚾ Late Afternoon Games", desc: "Multiple screens going" },
  { hour: 17, activity: "🏆 Victory Formation", desc: "Winners celebrating, losers coping" },
  { hour: 18, activity: "🌅 Post-Game Analysis", desc: "Reviewing the day's action" },
];

const SPORTS_TIPS = [
  "Pro tip: Robusto cigars are perfect for halftime - 30-45 min smoke time",
  "The best cigar debates happen during commercial breaks",
  "College football + premium cigars = peak Saturday energy",
  "Studies show 73% of sports fans smoke better when their team wins (made up stat)",
  "Remember: It's called a 'sport smoke' not a 'stress smoke' even when your team loses",
  "Multiple TV setup? Multiple cigars. It's simple math.",
  "The Sports Den rule: No spoilers if someone's streaming delayed",
  "Best pairing: Close game + slow-burning maduro",
  "Unpopular opinion: Playoff cigars taste 40% better",
  "Fantasy sports + fantasy cigars = peak Saturday afternoon",
];

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
  const estOffset = -5 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const estMinutes = utcMinutes + estOffset;
  const estHours = Math.floor(((estMinutes % 1440) + 1440) % 1440 / 60);
  
  const dayOfWeek = now.getUTCDay();
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;
  const isWeekend = isSaturday || isSunday;
  const isSportsDenTime = isWeekend && estHours >= 12 && estHours <= 18;

  // Find current activity
  const currentActivity = SPORTS_SCHEDULE.find(s => s.hour === estHours) || SPORTS_SCHEDULE[0];

  // Get countdown message
  let countdownMessage = "";
  if (!isWeekend) {
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    countdownMessage = daysUntilSaturday === 1 
      ? "Tomorrow! Sat & Sun 12-6 PM"
      : `${daysUntilSaturday} days until game day!`;
  } else if (estHours < 12) {
    countdownMessage = `Pre-game in ${12 - estHours} hours!`;
  } else if (estHours > 18) {
    countdownMessage = isSaturday 
      ? "Back tomorrow for Sunday games!" 
      : "See you next weekend for game day!";
  }

  // Get today's sports smokes (weekend 12-6 PM)
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  
  const currentSpectators = await db
    .prepare(`
      SELECT c.id, u.username, c.brand, c.product, c.rating, c.photo_url, c.created_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
        AND cast(strftime('%w', c.created_at) as integer) IN (0, 6)
        AND cast(strftime('%H', c.created_at) as integer) BETWEEN 12 AND 18
      ORDER BY c.created_at DESC
      LIMIT 10
    `)
    .bind(todayStart.toISOString())
    .all<DBRow>();

  // All-time weekend afternoon stats
  const allTimeStats = await db
    .prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT user_id) as unique_fans,
        AVG(rating) as avg_rating
      FROM checkins
      WHERE cast(strftime('%w', created_at) as integer) IN (0, 6)
        AND cast(strftime('%H', created_at) as integer) BETWEEN 12 AND 18
    `)
    .first<DBRow>();

  // Top brand during sports hours
  const topBrand = await db
    .prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins
      WHERE cast(strftime('%w', created_at) as integer) IN (0, 6)
        AND cast(strftime('%H', created_at) as integer) BETWEEN 12 AND 18
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 1
    `)
    .first<{ brand: string; count: number }>();

  // Leaderboard - most weekend afternoon smokes
  const leaderboard = await db
    .prepare(`
      SELECT 
        u.username,
        COUNT(*) as smoke_count,
        AVG(c.rating) as avg_rating,
        (
          SELECT brand FROM checkins c2 
          WHERE c2.user_id = u.id 
            AND cast(strftime('%w', c2.created_at) as integer) IN (0, 6)
            AND cast(strftime('%H', c2.created_at) as integer) BETWEEN 12 AND 18
          GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1
        ) as top_brand,
        (
          SELECT cast(strftime('%H', c3.created_at) as integer) FROM checkins c3 
          WHERE c3.user_id = u.id 
            AND cast(strftime('%w', c3.created_at) as integer) IN (0, 6)
            AND cast(strftime('%H', c3.created_at) as integer) BETWEEN 12 AND 18
          GROUP BY strftime('%H', c3.created_at) ORDER BY COUNT(*) DESC LIMIT 1
        ) as favorite_hour
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE cast(strftime('%w', created_at) as integer) IN (0, 6)
        AND cast(strftime('%H', created_at) as integer) BETWEEN 12 AND 18
      GROUP BY u.id
      ORDER BY smoke_count DESC
      LIMIT 10
    `)
    .all<DBRow>();

  // Current user stats
  let myStats = null;
  if (userId) {
    const userStats = await db
      .prepare(`
        SELECT 
          COUNT(*) as count,
          AVG(rating) as avg_rating,
          (SELECT brand FROM checkins WHERE user_id = ? 
            AND cast(strftime('%w', created_at) as integer) IN (0, 6)
            AND cast(strftime('%H', created_at) as integer) BETWEEN 12 AND 18
           GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1) as fav_brand
        FROM checkins
        WHERE user_id = ?
          AND cast(strftime('%w', created_at) as integer) IN (0, 6)
          AND cast(strftime('%H', created_at) as integer) BETWEEN 12 AND 18
      `)
      .bind(userId, userId)
      .first<DBRow>();

    if (userStats && (userStats.count ?? 0) > 0) {
      myStats = {
        totalSmokes: userStats.count,
        avgRating: userStats.avg_rating,
        favoriteBrand: userStats.fav_brand,
      };
    }
  }

  // Random tip of the day (based on date)
  const dayIndex = now.getUTCDate() % SPORTS_TIPS.length;
  const todaysTip = SPORTS_TIPS[dayIndex];

  // Game intensity based on hour
  let gameIntensity = 0;
  if (isSportsDenTime) {
    if (estHours >= 14 && estHours <= 16) gameIntensity = 100; // Peak hours
    else if (estHours === 13 || estHours === 17) gameIntensity = 75;
    else gameIntensity = 50;
  }

  return NextResponse.json({
    isSaturday,
    isSunday,
    isWeekend,
    isSportsDenTime,
    currentHour: estHours,
    countdownMessage,
    currentActivity,
    sportsSchedule: SPORTS_SCHEDULE,
    gameIntensity,
    todaysTip,
    currentSpectators: currentSpectators.results?.map((r: DBRow) => ({
      id: r.id,
      username: r.username,
      brand: r.brand,
      product: r.product,
      rating: r.rating || 0,
      photoUrl: r.photo_url,
      time: new Date(r.created_at || "").toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    })) || [],
    stats: {
      totalSmokes: allTimeStats?.total || 0,
      uniqueFans: allTimeStats?.unique_fans || 0,
      avgRating: allTimeStats?.avg_rating || 0,
      topBrand: topBrand?.brand || null,
    },
    leaderboard: leaderboard.results?.map((r: DBRow) => ({
      username: r.username,
      sportsSmokes: r.smoke_count || 0,
      avgRating: r.avg_rating || 0,
      topBrand: r.top_brand || null,
      favoriteHour: r.favorite_hour || 14,
    })) || [],
    myStats,
  });
}
