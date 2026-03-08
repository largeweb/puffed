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

interface CartoonViewer {
  username: string;
  saturdayMorningSmokes: number;
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

  // Cartoon time: Saturday 6 AM - 12 PM EST
  const isSaturday = adjustedDay === 6;
  const isCartoonTime = isSaturday && adjustedHour >= 6 && adjustedHour < 12;

  // Time until/since cartoon time
  let countdownMessage = "";
  if (!isSaturday) {
    const daysUntil = adjustedDay === 0 ? 6 : 6 - adjustedDay;
    countdownMessage = `${daysUntil} day${daysUntil > 1 ? "s" : ""} until Saturday!`;
  } else if (adjustedHour < 6) {
    countdownMessage = `${6 - adjustedHour} hours until cartoons!`;
  } else if (adjustedHour >= 12) {
    countdownMessage = "Cartoons are over for today - see you next Saturday!";
  } else {
    const hoursLeft = 12 - adjustedHour;
    countdownMessage = `${hoursLeft} hour${hoursLeft > 1 ? "s" : ""} of cartoons left!`;
  }

  // Today's Saturday morning check-ins (6 AM - 12 PM today)
  // Calculate timestamps for today's Saturday morning window
  const todayStart = new Date(now);
  todayStart.setUTCHours(11, 0, 0, 0); // 6 AM EST = 11 UTC
  const todayEnd = new Date(now);
  todayEnd.setUTCHours(17, 0, 0, 0); // 12 PM EST = 17 UTC

  let currentViewers: CheckIn[] = [];
  if (isSaturday) {
    const viewersResult = await db
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
    currentViewers = (viewersResult.results || []) as unknown as CheckIn[];
  }

  // All-time Saturday morning leaderboard (6 AM - 12 PM on Saturdays)
  // Using strftime to extract day of week and hour
  const leaderboardResult = await db
    .prepare(
      `
      SELECT 
        u.username,
        COUNT(*) as saturdayMorningSmokes,
        ROUND(AVG(c.rating), 1) as avgRating,
        (
          SELECT CAST(strftime('%H', datetime(c2.created_at, 'unixepoch', '-5 hours')) AS INTEGER)
          FROM checkins c2
          WHERE c2.user_id = u.id
            AND strftime('%w', datetime(c2.created_at, 'unixepoch', '-5 hours')) = '6'
            AND CAST(strftime('%H', datetime(c2.created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 6
            AND CAST(strftime('%H', datetime(c2.created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 12
          GROUP BY CAST(strftime('%H', datetime(c2.created_at, 'unixepoch', '-5 hours')) AS INTEGER)
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as favoriteHour,
        (
          SELECT c3.brand
          FROM checkins c3
          WHERE c3.user_id = u.id
            AND strftime('%w', datetime(c3.created_at, 'unixepoch', '-5 hours')) = '6'
            AND CAST(strftime('%H', datetime(c3.created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 6
            AND CAST(strftime('%H', datetime(c3.created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 12
          GROUP BY c3.brand
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as topBrand
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE strftime('%w', datetime(c.created_at, 'unixepoch', '-5 hours')) = '6'
        AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 6
        AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 12
      GROUP BY u.id
      ORDER BY saturdayMorningSmokes DESC
      LIMIT 10
    `
    )
    .all();

  const leaderboard: CartoonViewer[] = (leaderboardResult.results || []).map(
    (r: Record<string, unknown>) => ({
      username: r.username as string,
      saturdayMorningSmokes: r.saturdayMorningSmokes as number,
      avgRating: (r.avgRating as number) || 0,
      favoriteHour: (r.favoriteHour as number) || 9,
      topBrand: r.topBrand as string | null,
    })
  );

  // Platform stats
  const statsResult = await db
    .prepare(
      `
      SELECT 
        COUNT(*) as totalSmokes,
        COUNT(DISTINCT user_id) as uniqueViewers,
        ROUND(AVG(rating), 1) as avgRating
      FROM checkins
      WHERE strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) = '6'
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 6
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 12
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
              AND CAST(strftime('%H', datetime(c2.created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 6
              AND CAST(strftime('%H', datetime(c2.created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 12
            GROUP BY c2.brand
            ORDER BY COUNT(*) DESC
            LIMIT 1
          ) as favoriteBrand
        FROM checkins
        WHERE user_id = ?
          AND strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) = '6'
          AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 6
          AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 12
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

  // Fun cartoon "shows" based on the hour
  const cartoonLineup = [
    { hour: 6, show: "🌅 Early Bird Express", desc: "First smoke of the weekend!" },
    { hour: 7, show: "☕ Coffee & Cigars Club", desc: "The perfect pairing" },
    { hour: 8, show: "🥞 Pancake Puffers", desc: "Breakfast smoke vibes" },
    { hour: 9, show: "📺 Classic Cartoon Hour", desc: "Peak Saturday morning!" },
    { hour: 10, show: "🎮 Weekend Warrior Time", desc: "Gaming and smoking" },
    { hour: 11, show: "🏠 Lazy Day Lounge", desc: "No rush, just vibes" },
  ];

  const currentShow =
    cartoonLineup.find((s) => s.hour === adjustedHour) || cartoonLineup[3];

  return Response.json({
    isSaturday,
    isCartoonTime,
    currentHour: adjustedHour,
    countdownMessage,
    currentShow,
    cartoonLineup,
    currentViewers: currentViewers.map((c) => ({
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
      uniqueViewers: (statsResult?.uniqueViewers as number) || 0,
      avgRating: (statsResult?.avgRating as number) || 0,
    },
    myStats,
  });
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
