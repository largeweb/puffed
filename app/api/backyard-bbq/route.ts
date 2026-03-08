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
}

interface BBQChampion {
  username: string;
  saturdayAfternoonSmokes: number;
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
  // Adjust day if we crossed midnight
  const adjustedDay = hour < 0 ? (day === 0 ? 6 : day - 1) : day;

  // BBQ time: Saturday 12 PM - 6 PM EST
  const isSaturday = adjustedDay === 6;
  const isBBQTime = isSaturday && adjustedHour >= 12 && adjustedHour < 18;
  const isWeekend = adjustedDay === 0 || adjustedDay === 6;

  // Time until/since BBQ time
  let countdownMessage = "";
  if (!isSaturday) {
    const daysUntil = adjustedDay === 0 ? 6 : 6 - adjustedDay;
    countdownMessage = `${daysUntil} day${daysUntil > 1 ? "s" : ""} until BBQ Saturday!`;
  } else if (adjustedHour < 12) {
    const hoursUntil = 12 - adjustedHour;
    countdownMessage = `${hoursUntil} hour${hoursUntil > 1 ? "s" : ""} until the grill fires up!`;
  } else if (adjustedHour >= 18) {
    countdownMessage = "BBQ's over for today - see you next Saturday!";
  } else {
    const hoursLeft = 18 - adjustedHour;
    countdownMessage = `${hoursLeft} hour${hoursLeft > 1 ? "s" : ""} of backyard vibes left!`;
  }

  // Today's Saturday afternoon check-ins (12 PM - 6 PM today)
  const todayStart = new Date(now);
  todayStart.setUTCHours(17, 0, 0, 0); // 12 PM EST = 17 UTC
  const todayEnd = new Date(now);
  todayEnd.setUTCHours(23, 0, 0, 0); // 6 PM EST = 23 UTC

  let currentGrillers: CheckIn[] = [];
  if (isSaturday) {
    const grillersResult = await db
      .prepare(
        `
        SELECT c.id, c.brand, c.product, c.rating, c.created_at, c.image_url, u.username
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
    currentGrillers = (grillersResult.results || []) as unknown as CheckIn[];
  }

  // All-time Saturday afternoon leaderboard (12 PM - 6 PM on Saturdays)
  const leaderboardResult = await db
    .prepare(
      `
      SELECT 
        u.username,
        COUNT(*) as saturdayAfternoonSmokes,
        ROUND(AVG(c.rating), 1) as avgRating,
        (
          SELECT CAST(strftime('%H', datetime(c2.created_at, 'unixepoch', '-5 hours')) AS INTEGER)
          FROM checkins c2
          WHERE c2.user_id = u.id
            AND strftime('%w', datetime(c2.created_at, 'unixepoch', '-5 hours')) = '6'
            AND CAST(strftime('%H', datetime(c2.created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 12
            AND CAST(strftime('%H', datetime(c2.created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 18
          GROUP BY CAST(strftime('%H', datetime(c2.created_at, 'unixepoch', '-5 hours')) AS INTEGER)
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as favoriteHour,
        (
          SELECT c3.brand
          FROM checkins c3
          WHERE c3.user_id = u.id
            AND strftime('%w', datetime(c3.created_at, 'unixepoch', '-5 hours')) = '6'
            AND CAST(strftime('%H', datetime(c3.created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 12
            AND CAST(strftime('%H', datetime(c3.created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 18
          GROUP BY c3.brand
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as topBrand
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE strftime('%w', datetime(c.created_at, 'unixepoch', '-5 hours')) = '6'
        AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 12
        AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 18
      GROUP BY u.id
      ORDER BY saturdayAfternoonSmokes DESC
      LIMIT 10
    `
    )
    .all();

  const leaderboard: BBQChampion[] = (leaderboardResult.results || []).map(
    (r: Record<string, unknown>) => ({
      username: r.username as string,
      saturdayAfternoonSmokes: r.saturdayAfternoonSmokes as number,
      avgRating: (r.avgRating as number) || 0,
      favoriteHour: (r.favoriteHour as number) || 14,
      topBrand: r.topBrand as string | null,
    })
  );

  // Platform stats
  const statsResult = await db
    .prepare(
      `
      SELECT 
        COUNT(*) as totalSmokes,
        COUNT(DISTINCT user_id) as uniqueGrillers,
        ROUND(AVG(rating), 1) as avgRating
      FROM checkins
      WHERE strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) = '6'
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 12
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 18
    `
    )
    .first();

  // Current user stats
  let myStats = null;
  if (userId) {
    const myResult = await db
      .prepare(
        `
        SELECT 
          COUNT(*) as totalSmokes,
          ROUND(AVG(rating), 1) as avgRating,
          (
            SELECT c2.brand
            FROM checkins c2
            WHERE c2.user_id = ?
              AND strftime('%w', datetime(c2.created_at, 'unixepoch', '-5 hours')) = '6'
              AND CAST(strftime('%H', datetime(c2.created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 12
              AND CAST(strftime('%H', datetime(c2.created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 18
            GROUP BY c2.brand
            ORDER BY COUNT(*) DESC
            LIMIT 1
          ) as favoriteBrand
        FROM checkins
        WHERE user_id = ?
          AND strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) = '6'
          AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 12
          AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 18
      `
      )
      .bind(userId, userId)
      .first();

    if (myResult && (myResult.totalSmokes as number) > 0) {
      myStats = {
        totalSmokes: myResult.totalSmokes as number,
        avgRating: (myResult.avgRating as number) || 0,
        favoriteBrand: myResult.favoriteBrand as string | null,
      };
    }
  }

  // Fun BBQ activities based on the hour
  const bbqActivities = [
    { hour: 12, activity: "🍖 Firing Up the Grill", desc: "Coals getting hot, first smoke of the afternoon!" },
    { hour: 13, activity: "🌭 Lunch Rush", desc: "Post-lunch smoke break" },
    { hour: 14, activity: "🌳 Yard Work Break", desc: "Take a load off, you earned it" },
    { hour: 15, activity: "🍺 Cold Ones o'Clock", desc: "Peak backyard chillin'" },
    { hour: 16, activity: "🎸 Golden Hour Vibes", desc: "Sun's going down, smoke's going up" },
    { hour: 17, activity: "🌅 Sunset Session", desc: "Last smoke before dinner" },
  ];

  const currentActivity =
    bbqActivities.find((a) => a.hour === adjustedHour) || bbqActivities[2];

  // Fun BBQ facts
  const bbqFacts = [
    "🥩 The word 'barbecue' comes from the Taíno word 'barbacoa'",
    "🔥 Low and slow is the secret to perfect BBQ",
    "🌡️ The perfect smoke ring forms between 140-180°F",
    "🍖 Texas BBQ is all about the beef",
    "🐷 Kansas City is famous for its sweet, tomato-based sauce",
    "🌿 Hickory is the most popular smoking wood in America",
    "🦴 Memphis BBQ is known for its dry rubs",
    "☀️ Saturday is America's most popular grilling day",
  ];

  const todaysFact = bbqFacts[Math.floor(Date.now() / 86400000) % bbqFacts.length];

  return Response.json({
    isSaturday,
    isBBQTime,
    isWeekend,
    currentHour: adjustedHour,
    countdownMessage,
    currentActivity,
    bbqActivities,
    currentGrillers: currentGrillers.map((c) => ({
      id: c.id,
      username: c.username,
      brand: c.brand,
      product: c.product,
      rating: c.rating,
      photoUrl: c.image_url,
      time: formatTimeAgo(c.created_at),
    })),
    leaderboard,
    stats: {
      totalSmokes: (statsResult?.totalSmokes as number) || 0,
      uniqueGrillers: (statsResult?.uniqueGrillers as number) || 0,
      avgRating: (statsResult?.avgRating as number) || 0,
    },
    myStats,
    todaysFact,
  });
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
