import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface TailgateSmoker {
  id: number;
  username: string;
  brand: string;
  product: string | null;
  rating: number;
  photoUrl: string | null;
  review: string | null;
  time: string;
  sport?: string;
}

interface LeaderboardEntry {
  username: string;
  tailgateSmokes: number;
  avgRating: number;
  favoriteSport: string | null;
}

interface TailgateData {
  isTailgateTime: boolean;
  isWeekend: boolean;
  currentHour: number;
  timeMessage: string;
  gameDay: string;
  currentSport: {
    name: string;
    emoji: string;
    season: string;
  };
  allSports: Array<{
    name: string;
    emoji: string;
    inSeason: boolean;
  }>;
  currentTailgaters: TailgateSmoker[];
  leaderboard: LeaderboardEntry[];
  stats: {
    totalSmokes: number;
    uniqueTailgaters: number;
    avgRating: number;
    topBrand: string | null;
    peakHour: number | null;
  };
  myStats: {
    totalSmokes: number;
    avgRating: number;
    favoriteBrand: string | null;
    totalSaturdays: number;
  } | null;
  tailgateFact: string;
  countdown: {
    nextGame: string;
    hoursUntil: number;
  } | null;
}

const SPORTS = [
  { name: "Football", emoji: "🏈", months: [8, 9, 10, 11, 0, 1] },
  { name: "Basketball", emoji: "🏀", months: [10, 11, 0, 1, 2, 3, 4, 5] },
  { name: "Hockey", emoji: "🏒", months: [9, 10, 11, 0, 1, 2, 3, 4, 5] },
  { name: "Baseball", emoji: "⚾", months: [2, 3, 4, 5, 6, 7, 8, 9] },
  { name: "Soccer", emoji: "⚽", months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { name: "Golf", emoji: "⛳", months: [3, 4, 5, 6, 7, 8, 9] },
  { name: "NASCAR", emoji: "🏎️", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { name: "UFC", emoji: "🥊", months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
];

const TAILGATE_FACTS = [
  "The first tailgate parties started in the 1860s at college football games!",
  "Cigars and sports have been paired since the 1800s - a classic combo.",
  "The average tailgate starts 4 hours before kickoff.",
  "Churchill famously smoked cigars while watching polo matches.",
  "The Super Bowl is the biggest cigar sales day of the year!",
  "Many sports legends were known cigar enthusiasts - Jordan, Gretzky, Palmer.",
  "A good cigar can last the entire first half of a game.",
  "Tailgating is legal in all 50 states but rules vary by venue.",
  "The most popular tailgate cigar? Anything you can share with friends!",
  "Saturday afternoon sports + cigars = peak relaxation.",
];

function getTailgateTimeInfo(hour: number, dayOfWeek: number): { isTailgateTime: boolean; message: string; gameDay: string } {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isTailgateHours = hour >= 12 && hour <= 23;

  if (dayOfWeek === 6 && isTailgateHours) {
    if (hour < 15) return { isTailgateTime: true, message: "🏈 Pre-game warmup! Get your smoke ready.", gameDay: "Saturday" };
    if (hour < 18) return { isTailgateTime: true, message: "🔥 Prime time tailgating! Games are on!", gameDay: "Saturday" };
    if (hour < 21) return { isTailgateTime: true, message: "🌙 Night games heating up!", gameDay: "Saturday" };
    return { isTailgateTime: true, message: "🌟 Late night finisher territory.", gameDay: "Saturday" };
  }

  if (dayOfWeek === 0 && isTailgateHours) {
    if (hour < 13) return { isTailgateTime: true, message: "☀️ Sunday morning pre-game!", gameDay: "Sunday" };
    if (hour < 16) return { isTailgateTime: true, message: "🏈 NFL Sunday in full swing!", gameDay: "Sunday" };
    if (hour < 20) return { isTailgateTime: true, message: "🌅 Sunday night games!", gameDay: "Sunday" };
    return { isTailgateTime: true, message: "🌙 SNF closing it out.", gameDay: "Sunday" };
  }

  // Weekday games
  if (hour >= 19 && hour <= 23) {
    return { isTailgateTime: true, message: "📺 Weeknight game mode!", gameDay: "Weeknight" };
  }

  const hoursUntilWeekend = dayOfWeek < 6 ? ((6 - dayOfWeek) * 24) - hour + 12 : (7 - dayOfWeek) * 24 - hour + 12;
  return {
    isTailgateTime: false,
    message: `⏰ Next tailgate in ~${hoursUntilWeekend} hours (Saturday noon)`,
    gameDay: "None"
  };
}

function getCurrentSport(month: number): { name: string; emoji: string; season: string } {
  // Priority order for current month
  const inSeasonSports = SPORTS.filter(s => s.months.includes(month));
  
  // Prioritize by typical Saturday popularity
  const priorities: Record<string, number> = {
    "Football": 10,
    "Basketball": 8,
    "Hockey": 7,
    "Baseball": 6,
    "NASCAR": 5,
    "UFC": 4,
    "Soccer": 3,
    "Golf": 2,
  };

  inSeasonSports.sort((a, b) => (priorities[b.name] || 0) - (priorities[a.name] || 0));
  
  if (inSeasonSports.length > 0) {
    return {
      name: inSeasonSports[0].name,
      emoji: inSeasonSports[0].emoji,
      season: "In Season"
    };
  }

  return { name: "Sports", emoji: "🏆", season: "Off Season" };
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const month = now.getMonth();

    const { isTailgateTime, message, gameDay } = getTailgateTimeInfo(hour, dayOfWeek);
    const currentSport = getCurrentSport(month);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Get current user if logged in
    let currentUser: { id: number; username: string } | null = null;
    if (sessionToken) {
      const userResult = await db
        .prepare("SELECT id, username FROM users WHERE session = ?")
        .bind(sessionToken)
        .first<{ id: number; username: string }>();
      if (userResult) {
        currentUser = userResult;
      }
    }

    // Define tailgate hours: Sat/Sun 12pm-11pm, or weeknight 7pm-11pm
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const todayTimestamp = Math.floor(startOfToday.getTime() / 1000);

    // Get today's tailgate smokers (weekend afternoons/evenings)
    const tailgatersQuery = `
      SELECT 
        c.id, u.username, c.brand, c.product, c.rating, c.image_url as photoUrl,
        c.review, c.created_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      ORDER BY c.created_at DESC
      LIMIT 20
    `;
    
    const tailgaters = await db
      .prepare(tailgatersQuery)
      .bind(todayTimestamp)
      .all<{
        id: number;
        username: string;
        brand: string;
        product: string | null;
        rating: number;
        photoUrl: string | null;
        review: string | null;
        created_at: number;
      }>();

    const currentTailgaters: TailgateSmoker[] = (tailgaters.results || []).map((t) => {
      const checkinDate = new Date(t.created_at * 1000);
      const checkinHour = checkinDate.getHours();
      const timeStr = checkinDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      
      return {
        id: t.id,
        username: t.username,
        brand: t.brand,
        product: t.product,
        rating: t.rating,
        photoUrl: t.photoUrl,
        review: t.review,
        time: timeStr,
      };
    });

    // Get all-time Saturday/Sunday tailgate stats (12-23h on weekends)
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(rating) as avg_rating
      FROM checkins
      WHERE strftime('%w', datetime(created_at, 'unixepoch')) IN ('0', '6')
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) >= 12
    `;
    
    const statsResult = await db
      .prepare(statsQuery)
      .first<{ total: number; unique_users: number; avg_rating: number | null }>();

    // Get top brand for weekend tailgates
    const topBrandQuery = `
      SELECT brand, COUNT(*) as cnt
      FROM checkins
      WHERE strftime('%w', datetime(created_at, 'unixepoch')) IN ('0', '6')
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) >= 12
      GROUP BY brand
      ORDER BY cnt DESC
      LIMIT 1
    `;
    const topBrandResult = await db
      .prepare(topBrandQuery)
      .first<{ brand: string; cnt: number }>();

    // Get peak tailgate hour
    const peakHourQuery = `
      SELECT CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) as hour, COUNT(*) as cnt
      FROM checkins
      WHERE strftime('%w', datetime(created_at, 'unixepoch')) IN ('0', '6')
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) >= 12
      GROUP BY hour
      ORDER BY cnt DESC
      LIMIT 1
    `;
    const peakHourResult = await db
      .prepare(peakHourQuery)
      .first<{ hour: number; cnt: number }>();

    // Get leaderboard of top weekend tailgaters
    const leaderboardQuery = `
      SELECT 
        u.username,
        COUNT(*) as tailgate_smokes,
        AVG(c.rating) as avg_rating
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE strftime('%w', datetime(c.created_at, 'unixepoch')) IN ('0', '6')
        AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch')) AS INTEGER) >= 12
      GROUP BY u.id
      ORDER BY tailgate_smokes DESC
      LIMIT 10
    `;
    
    const leaderboardResult = await db
      .prepare(leaderboardQuery)
      .all<{ username: string; tailgate_smokes: number; avg_rating: number | null }>();

    const leaderboard: LeaderboardEntry[] = (leaderboardResult.results || []).map((l) => ({
      username: l.username,
      tailgateSmokes: l.tailgate_smokes,
      avgRating: l.avg_rating ? Math.round(l.avg_rating * 10) / 10 : 0,
      favoriteSport: null, // Could track this in future
    }));

    // Get personal stats if logged in
    let myStats: TailgateData["myStats"] = null;
    if (currentUser) {
      const myStatsQuery = `
        SELECT 
          COUNT(*) as total,
          AVG(rating) as avg_rating,
          COUNT(DISTINCT date(created_at, 'unixepoch')) as total_days
        FROM checkins
        WHERE user_id = ?
          AND strftime('%w', datetime(created_at, 'unixepoch')) IN ('0', '6')
          AND CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) >= 12
      `;
      const myStatsResult = await db
        .prepare(myStatsQuery)
        .bind(currentUser.id)
        .first<{ total: number; avg_rating: number | null; total_days: number }>();

      const myFavBrandQuery = `
        SELECT brand, COUNT(*) as cnt
        FROM checkins
        WHERE user_id = ?
          AND strftime('%w', datetime(created_at, 'unixepoch')) IN ('0', '6')
          AND CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) >= 12
        GROUP BY brand
        ORDER BY cnt DESC
        LIMIT 1
      `;
      const myFavBrand = await db
        .prepare(myFavBrandQuery)
        .bind(currentUser.id)
        .first<{ brand: string }>();

      if (myStatsResult) {
        myStats = {
          totalSmokes: myStatsResult.total,
          avgRating: myStatsResult.avg_rating ? Math.round(myStatsResult.avg_rating * 10) / 10 : 0,
          favoriteBrand: myFavBrand?.brand || null,
          totalSaturdays: myStatsResult.total_days,
        };
      }
    }

    // Get random tailgate fact
    const factIndex = Math.floor(Date.now() / 3600000) % TAILGATE_FACTS.length;
    const tailgateFact = TAILGATE_FACTS[factIndex];

    // Build sports list with in-season status
    const allSports = SPORTS.map(s => ({
      name: s.name,
      emoji: s.emoji,
      inSeason: s.months.includes(month),
    }));

    const response: TailgateData = {
      isTailgateTime,
      isWeekend,
      currentHour: hour,
      timeMessage: message,
      gameDay,
      currentSport,
      allSports,
      currentTailgaters,
      leaderboard,
      stats: {
        totalSmokes: statsResult?.total || 0,
        uniqueTailgaters: statsResult?.unique_users || 0,
        avgRating: statsResult?.avg_rating ? Math.round(statsResult.avg_rating * 10) / 10 : 0,
        topBrand: topBrandResult?.brand || null,
        peakHour: peakHourResult?.hour || null,
      },
      myStats,
      tailgateFact,
      countdown: isTailgateTime ? null : {
        nextGame: "Saturday 12:00 PM",
        hoursUntil: 0, // Calculated client-side
      },
    };

    return Response.json(response);
  } catch (error) {
    console.error("Tailgate API error:", error);
    return Response.json({ error: "Failed to load tailgate data" }, { status: 500 });
  }
}
