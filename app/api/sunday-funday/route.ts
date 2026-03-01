import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface FundayUser {
  username: string;
  lastSmoke: string;
  sundaySmokes: number;
  fundaySmokes: number;
  isActive: boolean;
}

interface FundayResponse {
  isSunday: boolean;
  isFundayTime: boolean;
  currentHour: number;
  loungeOpen: boolean;
  fundayers: FundayUser[];
  stats: {
    totalFundaySmokes: number;
    yourFundaySmokes: number;
    fundayPercentile: number;
    favoriteFundayBrand: string | null;
    fundayRegulars: number;
    avgFundayRating: number;
  };
  vibes: {
    message: string;
    emoji: string;
  };
  activities: string[];
  hoursLeft: number;
}

function getFundayVibes(hour: number): { message: string; emoji: string } {
  if (hour >= 11 && hour < 13) {
    return { message: "Late morning energy! The day is young 🌞", emoji: "☀️" };
  } else if (hour >= 13 && hour < 15) {
    return { message: "Peak funday hours! Make it count 🎯", emoji: "🎉" };
  } else if (hour >= 15 && hour < 17) {
    return { message: "Afternoon golden hour vibes ✨", emoji: "🌅" };
  } else {
    return { message: "Last call for funday! Live it up 🚀", emoji: "🎊" };
  }
}

function getFundayActivities(): string[] {
  const allActivities = [
    "🎮 Gaming session with a smoke",
    "📺 Binge that show you've been meaning to watch",
    "🍔 Fire up the grill, smoke something tasty",
    "🎵 Put on your favorite playlist and vibe",
    "☀️ Take a walk outside while the weather's nice",
    "📞 Call a friend you haven't talked to in a while",
    "🎬 Movie marathon with the good stuff",
    "🏈 Watch some sports with friends",
    "🎲 Board games or cards with the crew",
    "📚 Read that book gathering dust on your shelf",
    "🍳 Cook something special for dinner",
    "🛋️ Just chill — it's your day!",
  ];
  const shuffled = allActivities.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    const { env } = getRequestContext();
    const db = env.DB;

    // Get current time in EST
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    // Approximate EST (UTC-5)
    const estHour = (utcHour - 5 + 24) % 24;
    // Adjust day if we crossed midnight
    let estDay = utcDay;
    if (utcHour < 5) {
      estDay = (utcDay - 1 + 7) % 7;
    }

    // Sunday = 0, Funday hours: 11 AM to 6 PM
    const isSunday = estDay === 0;
    const isFundayTime = estHour >= 11 && estHour < 18;
    const loungeOpen = isSunday && isFundayTime;
    const hoursLeft = loungeOpen ? Math.max(0, 18 - estHour) : 0;

    if (!loungeOpen) {
      const closedMessage = !isSunday
        ? "Sunday Funday opens Sundays 11 AM - 6 PM"
        : estHour < 11
          ? "Funday starts at 11 AM — just a little longer!"
          : "Funday's over, but there's always next Sunday! 🎉";

      return Response.json({
        isSunday,
        isFundayTime: false,
        currentHour: estHour,
        loungeOpen: false,
        fundayers: [],
        stats: {
          totalFundaySmokes: 0,
          yourFundaySmokes: 0,
          fundayPercentile: 0,
          favoriteFundayBrand: null,
          fundayRegulars: 0,
          avgFundayRating: 0,
        },
        vibes: { message: closedMessage, emoji: "🎉" },
        activities: [],
        hoursLeft: 0,
      } as FundayResponse);
    }

    // Get current user if logged in
    let currentUserId: number | null = null;
    let currentUsername: string | null = null;
    if (sessionId) {
      const userResult = await db
        .prepare(
          `SELECT u.id, u.username FROM users u
           JOIN sessions s ON s.user_id = u.id
           WHERE s.id = ?`
        )
        .bind(sessionId)
        .first() as { id: number; username: string } | null;
      if (userResult) {
        currentUserId = userResult.id;
        currentUsername = userResult.username;
      }
    }

    // Get Sunday funday smokes (11 AM - 6 PM window)
    const fundaySmokesResult = await db
      .prepare(
        `SELECT 
          u.username,
          c.created_at,
          c.rating
        FROM check_ins c
        JOIN users u ON c.user_id = u.id
        WHERE strftime('%w', datetime(c.created_at, 'unixepoch', '-5 hours')) = '0'
          AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 11
          AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 18
        ORDER BY c.created_at DESC`
      )
      .all();

    const fundaySmokes = (fundaySmokesResult.results || []) as Array<{
      username: string;
      created_at: number;
      rating: number;
    }>;

    // Count by user
    const userCounts: Record<string, { fundaySmokes: number; ratings: number[] }> = {};
    for (const smoke of fundaySmokes) {
      if (!userCounts[smoke.username]) {
        userCounts[smoke.username] = { fundaySmokes: 0, ratings: [] };
      }
      userCounts[smoke.username].fundaySmokes++;
      if (smoke.rating) {
        userCounts[smoke.username].ratings.push(smoke.rating);
      }
    }

    // Get total Sunday smokes for context
    const sundaySmokesResult = await db
      .prepare(
        `SELECT 
          u.username,
          COUNT(*) as count
        FROM check_ins c
        JOIN users u ON c.user_id = u.id
        WHERE strftime('%w', datetime(c.created_at, 'unixepoch', '-5 hours')) = '0'
        GROUP BY u.username`
      )
      .all();

    const sundaySmokes: Record<string, number> = {};
    for (const row of (sundaySmokesResult.results || []) as Array<{
      username: string;
      count: number;
    }>) {
      sundaySmokes[row.username] = row.count;
    }

    // Check who's active today during funday hours
    const todayStart = Math.floor(now.getTime() / 1000) - (estHour * 3600) - (now.getMinutes() * 60) - now.getSeconds();
    const fundayStart = todayStart + (11 * 3600); // 11 AM today

    const activeResult = await db
      .prepare(
        `SELECT DISTINCT u.username
        FROM check_ins c
        JOIN users u ON c.user_id = u.id
        WHERE c.created_at >= ?`
      )
      .bind(fundayStart)
      .all();

    const activeUsers = new Set(
      ((activeResult.results || []) as Array<{ username: string }>).map((r) => r.username)
    );

    // Build fundayers list
    const fundayers = Object.entries(userCounts)
      .map(([username, data]) => ({
        username,
        lastSmoke: "—",
        sundaySmokes: sundaySmokes[username] || 0,
        fundaySmokes: data.fundaySmokes,
        isActive: activeUsers.has(username),
      }))
      .sort((a, b) => b.fundaySmokes - a.fundaySmokes);

    // Calculate stats
    const totalFundaySmokes = fundaySmokes.length;
    const fundayRegulars = Object.values(userCounts).filter((u) => u.fundaySmokes >= 2).length;

    // Calculate average rating
    const allRatings = fundaySmokes.filter((s) => s.rating).map((s) => s.rating);
    const avgFundayRating =
      allRatings.length > 0
        ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
        : 0;

    // User-specific stats
    let yourFundaySmokes = 0;
    let fundayPercentile = 0;
    let favoriteFundayBrand: string | null = null;

    if (currentUserId && currentUsername) {
      yourFundaySmokes = userCounts[currentUsername]?.fundaySmokes || 0;

      // Calculate percentile
      const userCount = fundayers.length;
      if (userCount > 0 && yourFundaySmokes > 0) {
        const rank = fundayers.findIndex((f) => f.username === currentUsername) + 1;
        fundayPercentile = Math.round((1 - rank / userCount) * 100);
      }

      // Get favorite brand during funday hours
      const brandResult = await db
        .prepare(
          `SELECT c.brand, COUNT(*) as count
          FROM check_ins c
          WHERE c.user_id = ?
            AND strftime('%w', datetime(c.created_at, 'unixepoch', '-5 hours')) = '0'
            AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 11
            AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 18
          GROUP BY c.brand
          ORDER BY count DESC
          LIMIT 1`
        )
        .bind(currentUserId)
        .first() as { brand: string; count: number } | null;

      favoriteFundayBrand = brandResult?.brand || null;
    }

    return Response.json({
      isSunday,
      isFundayTime,
      currentHour: estHour,
      loungeOpen,
      fundayers,
      stats: {
        totalFundaySmokes,
        yourFundaySmokes,
        fundayPercentile,
        favoriteFundayBrand,
        fundayRegulars,
        avgFundayRating,
      },
      vibes: getFundayVibes(estHour),
      activities: getFundayActivities(),
      hoursLeft,
    } as FundayResponse);
  } catch (error) {
    console.error("Sunday Funday API error:", error);
    return Response.json(
      { error: "Failed to load funday data" },
      { status: 500 }
    );
  }
}
