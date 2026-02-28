import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface CheckIn {
  id: number;
  brand: string;
  product: string | null;
  rating: number;
  created_at: number;
  photo_url: string | null;
  username: string;
  review: string | null;
}

interface BonfireRegular {
  username: string;
  bonfireSmokes: number;
  avgRating: number;
  topBrand: string | null;
}

export async function GET(): Promise<Response> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;

  const { env } = getRequestContext();
  const db = env.DB;

  // Get user from session if logged in
  let userId: string | null = null;
  let currentUsername: string | null = null;
  if (sessionId) {
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();
    if (session) {
      userId = session.user_id;
      const user = await db
        .prepare("SELECT username FROM users WHERE id = ?")
        .bind(userId)
        .first<{ username: string }>();
      if (user) currentUsername = user.username;
    }
  }

  const now = new Date();
  const hour = now.getUTCHours() - 5; // Adjust for EST
  const adjustedHour = hour < 0 ? hour + 24 : hour;
  const day = now.getUTCDay();
  const adjustedDay = hour < 0 ? (day === 0 ? 6 : day - 1) : day;

  // Bonfire time: Weekend evenings 5 PM - 11 PM EST
  const isWeekend = adjustedDay === 0 || adjustedDay === 6;
  const isBonfireTime = isWeekend && adjustedHour >= 17 && adjustedHour < 23;

  // Time messages
  let timeMessage = "";
  let bonfireMood = "";
  
  if (!isWeekend) {
    const daysUntilSaturday = (6 - adjustedDay + 7) % 7 || 7;
    timeMessage = `The bonfire lights up on weekends. ${daysUntilSaturday} day${daysUntilSaturday > 1 ? "s" : ""} until Saturday!`;
    bonfireMood = "waiting";
  } else if (adjustedHour < 17) {
    const hoursUntil = 17 - adjustedHour;
    timeMessage = `Bonfire lights up in ${hoursUntil} hour${hoursUntil > 1 ? "s" : ""}! Come back at 5 PM.`;
    bonfireMood = "anticipation";
  } else if (adjustedHour >= 23) {
    timeMessage = "The embers are dying down. See you tomorrow evening!";
    bonfireMood = "embers";
  } else {
    const hoursLeft = 23 - adjustedHour;
    timeMessage = `${hoursLeft} hour${hoursLeft > 1 ? "s" : ""} of bonfire vibes left tonight!`;
    bonfireMood = "blazing";
  }

  // Bonfire phases based on time
  const bonfirePhases = [
    { hour: 17, phase: "Kindling", emoji: "🪵", desc: "Getting the fire started", color: "amber" },
    { hour: 18, phase: "First Flames", emoji: "🔥", desc: "The fire catches and grows", color: "orange" },
    { hour: 19, phase: "Full Blaze", emoji: "🔥", desc: "Peak bonfire energy", color: "red" },
    { hour: 20, phase: "Golden Hour", emoji: "✨", desc: "Stories and good vibes", color: "yellow" },
    { hour: 21, phase: "Stargazing", emoji: "⭐", desc: "Look up, light up", color: "purple" },
    { hour: 22, phase: "Ember Glow", emoji: "🌙", desc: "Winding down under the stars", color: "indigo" },
  ];
  const currentPhase = bonfirePhases.find(p => p.hour === adjustedHour) || bonfirePhases[0];

  // Bonfire hours for weekend: 5 PM - 11 PM EST = 22 UTC - 04 UTC next day
  // Calculate today's bonfire window
  const todayDate = new Date(now);
  todayDate.setUTCHours(0, 0, 0, 0);
  const bonfireStartToday = Math.floor(todayDate.getTime() / 1000) + (22 * 3600); // 5 PM EST = 22 UTC
  const bonfireEndToday = bonfireStartToday + (6 * 3600); // 6 hour window

  // Get current bonfire smokers (tonight's session)
  let currentBonfireSmokers: CheckIn[] = [];
  if (isWeekend) {
    const smokersResult = await db
      .prepare(
        `
        SELECT c.id, c.brand, c.product, c.rating, c.created_at, c.photo_url, c.review, u.username
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE c.created_at >= ? AND c.created_at < ?
        ORDER BY c.created_at DESC
        LIMIT 25
      `
      )
      .bind(bonfireStartToday, bonfireEndToday)
      .all<CheckIn>();
    currentBonfireSmokers = smokersResult.results || [];
  }

  // Calculate weekend bonfire hours (Sat+Sun 5-11 PM)
  // Last 4 weeks of weekend bonfire data
  const fourWeeksAgo = Math.floor(now.getTime() / 1000) - (28 * 24 * 3600);
  
  // All-time bonfire leaderboard
  const leaderboardResult = await db
    .prepare(
      `
      SELECT 
        u.username,
        COUNT(*) as bonfireSmokes,
        AVG(c.rating) as avgRating,
        (
          SELECT brand FROM checkins c2 
          WHERE c2.user_id = u.id 
          AND strftime('%w', datetime(c2.created_at, 'unixepoch', '-5 hours')) IN ('0', '6')
          AND CAST(strftime('%H', datetime(c2.created_at, 'unixepoch', '-5 hours')) as INTEGER) >= 17
          AND CAST(strftime('%H', datetime(c2.created_at, 'unixepoch', '-5 hours')) as INTEGER) < 23
          GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1
        ) as topBrand
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE strftime('%w', datetime(c.created_at, 'unixepoch', '-5 hours')) IN ('0', '6')
      AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) as INTEGER) >= 17
      AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) as INTEGER) < 23
      GROUP BY u.id
      ORDER BY bonfireSmokes DESC
      LIMIT 10
    `
    )
    .all<BonfireRegular>();

  // Platform bonfire stats
  const statsResult = await db
    .prepare(
      `
      SELECT 
        COUNT(*) as totalSmokes,
        COUNT(DISTINCT user_id) as uniqueSmokers,
        AVG(rating) as avgRating
      FROM checkins
      WHERE strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) IN ('0', '6')
      AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) as INTEGER) >= 17
      AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) as INTEGER) < 23
    `
    )
    .first<{ totalSmokes: number; uniqueSmokers: number; avgRating: number }>();

  // Top bonfire brand
  const topBrandResult = await db
    .prepare(
      `
      SELECT brand, COUNT(*) as cnt
      FROM checkins
      WHERE strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) IN ('0', '6')
      AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) as INTEGER) >= 17
      AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) as INTEGER) < 23
      GROUP BY brand
      ORDER BY cnt DESC
      LIMIT 1
    `
    )
    .first<{ brand: string; cnt: number }>();

  // User's bonfire stats
  let myStats = null;
  if (userId) {
    const myResult = await db
      .prepare(
        `
        SELECT 
          COUNT(*) as totalSmokes,
          AVG(rating) as avgRating
        FROM checkins
        WHERE user_id = ?
        AND strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) IN ('0', '6')
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) as INTEGER) >= 17
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) as INTEGER) < 23
      `
      )
      .bind(userId)
      .first<{ totalSmokes: number; avgRating: number }>();

    const myTopBrand = await db
      .prepare(
        `
        SELECT brand FROM checkins
        WHERE user_id = ?
        AND strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) IN ('0', '6')
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) as INTEGER) >= 17
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) as INTEGER) < 23
        GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1
      `
      )
      .bind(userId)
      .first<{ brand: string }>();

    if (myResult) {
      myStats = {
        totalSmokes: myResult.totalSmokes || 0,
        avgRating: myResult.avgRating ? Math.round(myResult.avgRating * 10) / 10 : 0,
        favoriteBrand: myTopBrand?.brand || null,
        username: currentUsername,
      };
    }
  }

  // Bonfire stories/prompts
  const bonfirePrompts = [
    "What's the best cigar you've ever had?",
    "Tell us about your perfect smoking spot",
    "First cigar memory?",
    "What are you celebrating tonight?",
    "Weekend plans?",
    "What music goes with tonight's smoke?",
    "Best cigar + drink pairing?",
    "If you could smoke anywhere in the world, where?",
    "Favorite late night smoke memory?",
    "What got you into smoking?",
  ];
  const tonightPrompt = bonfirePrompts[new Date().getDate() % bonfirePrompts.length];

  // Bonfire facts
  const bonfireFacts = [
    "Weekend evening smokes are 40% more likely to be shared experiences",
    "The average bonfire smoke session lasts 45 minutes",
    "Saturday nights see 2x more social engagement",
    "Full moon weekends show 15% more check-ins",
    "Most bonfire smokers prefer fuller-bodied cigars",
    "Group smoking increases enjoyment ratings by 0.3 stars on average",
    "The most popular bonfire hour is 8 PM",
    "Weekend warriors smoke 60% of their weekly total on Sat/Sun",
  ];
  const bonfireFact = bonfireFacts[new Date().getDate() % bonfireFacts.length];

  return Response.json({
    isBonfireTime,
    isWeekend,
    currentHour: adjustedHour,
    dayOfWeek: adjustedDay,
    timeMessage,
    bonfireMood,
    currentPhase,
    allPhases: bonfirePhases,
    currentBonfireSmokers: currentBonfireSmokers.map((s) => ({
      id: s.id,
      username: s.username,
      brand: s.brand,
      product: s.product,
      rating: s.rating,
      photoUrl: s.photo_url,
      review: s.review,
      time: formatTime(s.created_at),
    })),
    leaderboard: (leaderboardResult.results || []).map((l) => ({
      username: l.username,
      bonfireSmokes: l.bonfireSmokes,
      avgRating: Math.round((l.avgRating || 0) * 10) / 10,
      topBrand: l.topBrand,
    })),
    stats: {
      totalSmokes: statsResult?.totalSmokes || 0,
      uniqueSmokers: statsResult?.uniqueSmokers || 0,
      avgRating: statsResult?.avgRating ? Math.round(statsResult.avgRating * 10) / 10 : 0,
      topBrand: topBrandResult?.brand || null,
    },
    myStats,
    tonightPrompt,
    bonfireFact,
  });
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
