import { NextRequest, NextResponse } from "next/server";
import { getDbFromEnv, getUserFromRequest } from "@/lib/db";

interface Env {
  DB: D1Database;
}

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const env = (process.env as unknown) as Env;
  const db = getDbFromEnv(env);
  const currentUser = await getUserFromRequest(request);

  const now = new Date();
  // Convert to Eastern time
  const etOffset = -5; // EST (would be -4 for EDT)
  const utcHour = now.getUTCHours();
  const etHour = (utcHour + 24 + etOffset) % 24;
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday

  const isSunday = dayOfWeek === 0;
  const isFundayTime = etHour >= 11 && etHour < 18; // 11 AM - 6 PM
  const loungeOpen = isSunday && isFundayTime;

  // Calculate hours left until 6 PM
  const hoursLeft = loungeOpen ? Math.max(0, 18 - etHour) : 0;

  // Vibes based on time
  const getVibes = () => {
    if (etHour >= 11 && etHour < 13) {
      return { message: "Late morning energy! The day is young 🌞", emoji: "☀️" };
    } else if (etHour >= 13 && etHour < 15) {
      return { message: "Peak funday hours! Make it count 🎯", emoji: "🎉" };
    } else if (etHour >= 15 && etHour < 17) {
      return { message: "Afternoon golden hour vibes ✨", emoji: "🌅" };
    } else {
      return { message: "Last call for funday! Live it up 🚀", emoji: "🎊" };
    }
  };

  // Activity suggestions
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

  // Pick 3-4 random activities
  const shuffled = allActivities.sort(() => Math.random() - 0.5);
  const activities = shuffled.slice(0, 4);

  // Get Sunday funday smokes (11 AM - 6 PM window)
  // First, get all Sunday check-ins during funday hours
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
  const todayStart = Math.floor(now.getTime() / 1000) - (etHour * 3600) - (now.getMinutes() * 60) - now.getSeconds();
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
  const allRatings = fundaySmokes.filter(s => s.rating).map(s => s.rating);
  const avgFundayRating = allRatings.length > 0 
    ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length 
    : 0;

  // User-specific stats
  let yourFundaySmokes = 0;
  let fundayPercentile = 0;
  let favoriteFundayBrand: string | null = null;

  if (currentUser) {
    yourFundaySmokes = userCounts[currentUser.username]?.fundaySmokes || 0;
    
    // Calculate percentile
    const userCount = fundayers.length;
    if (userCount > 0 && yourFundaySmokes > 0) {
      const rank = fundayers.findIndex((f) => f.username === currentUser.username) + 1;
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
      .bind(currentUser.id)
      .first() as { brand: string; count: number } | null;

    favoriteFundayBrand = brandResult?.brand || null;
  }

  return NextResponse.json({
    isSunday,
    isFundayTime,
    currentHour: etHour,
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
    vibes: getVibes(),
    activities,
    hoursLeft,
  });
}
