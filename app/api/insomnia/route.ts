import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

interface CheckinRow {
  id: string;
  user_id: string;
  brand: string;
  product: string | null;
  rating: number | null;
  review: string | null;
  image_url: string | null;
  checked_at: number;
  username: string;
}

interface StatRow {
  count: number;
}

interface UserStatRow {
  username: string;
  count: number;
  avg_hour: number;
}

interface HourRow {
  hour: number;
  count: number;
}

interface BrandRow {
  brand: string;
  count: number;
}

export const runtime = "edge";

function timeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export async function GET(request: Request) {
  try {
    const ctx = getRequestContext();
    const db = ctx.env.DB;

    // Auth check
    const cookieHeader = request.headers.get("cookie") || "";
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify session and get user
    const session = await db.prepare(`
      SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?
    `).bind(sessionId, Date.now()).first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = session.user_id;

    // Current time info (EST/EDT)
    const now = new Date();
    const estOffset = -5 * 60; // EST offset in minutes
    const estTime = new Date(now.getTime() + (now.getTimezoneOffset() + estOffset) * 60000);
    const currentHour = estTime.getHours();
    const isInsomniaTime = currentHour >= 2 && currentHour < 5;

    // Start of today at midnight (EST)
    const todayStart = new Date(estTime);
    todayStart.setHours(0, 0, 0, 0);
    const todayTimestamp = Math.floor(todayStart.getTime() / 1000);

    // Get tonight's insomnia smokes (2 AM - 5 AM, today and yesterday's window)
    const yesterdayTimestamp = todayTimestamp - 86400;
    
    const insomniaSql = `
      SELECT c.id, c.user_id, c.brand, c.product, c.rating, c.review, c.image_url, c.checked_at, u.username
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE (
        (c.checked_at >= ? AND ((c.checked_at - ?) % 86400) / 3600 >= 2 AND ((c.checked_at - ?) % 86400) / 3600 < 5)
        OR
        (c.checked_at >= ? AND ((c.checked_at - ?) % 86400) / 3600 >= 2 AND ((c.checked_at - ?) % 86400) / 3600 < 5)
      )
      ORDER BY c.checked_at DESC
      LIMIT 20
    `;

    // Simpler approach: get recent check-ins and filter by hour
    const recentCheckinsRes = await db.prepare(`
      SELECT c.id, c.user_id, c.brand, c.product, c.rating, c.review, c.image_url, c.checked_at, u.username
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.checked_at >= ?
      ORDER BY c.checked_at DESC
    `).bind(yesterdayTimestamp).all<CheckinRow>();

    const tonightsInsomnia = (recentCheckinsRes.results || []).filter((c) => {
      const checkinDate = new Date(c.checked_at * 1000);
      const checkinHour = new Date(checkinDate.getTime() + (checkinDate.getTimezoneOffset() + estOffset) * 60000).getHours();
      return checkinHour >= 2 && checkinHour < 5;
    }).slice(0, 15).map((c) => ({
      id: c.id,
      username: c.username,
      brand: c.brand,
      product: c.product,
      rating: c.rating,
      review: c.review,
      imageUrl: c.image_url,
      checkedAt: c.checked_at,
      timeAgo: timeAgo(c.checked_at),
    }));

    // Get all-time insomnia stats (2-5 AM)
    const allCheckinsRes = await db.prepare(`
      SELECT c.id, c.user_id, c.brand, c.checked_at, u.username
      FROM checkins c
      JOIN users u ON c.user_id = u.id
    `).all<CheckinRow>();

    const allInsomnia = (allCheckinsRes.results || []).filter((c) => {
      const checkinDate = new Date(c.checked_at * 1000);
      const checkinHour = new Date(checkinDate.getTime() + (checkinDate.getTimezoneOffset() + estOffset) * 60000).getHours();
      return checkinHour >= 2 && checkinHour < 5;
    });

    // Stats
    const totalInsomnia = allInsomnia.length;
    const uniqueInsomniacs = new Set(allInsomnia.map((c) => c.user_id)).size;

    // User's insomnia count
    const userInsomnia = allInsomnia.filter((c) => c.user_id === userId).length;

    // Check if user has smoked during insomnia hours tonight
    const tonightHasInsomnia = tonightsInsomnia.some((c) => 
      allInsomnia.find((a) => a.id === c.id && a.user_id === userId)
    );

    // Most popular insomnia brand
    const brandCounts: Record<string, number> = {};
    allInsomnia.forEach((c) => {
      brandCounts[c.brand] = (brandCounts[c.brand] || 0) + 1;
    });
    const mostPopularBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Peak insomnia hour
    const hourCounts: Record<number, number> = { 2: 0, 3: 0, 4: 0 };
    allInsomnia.forEach((c) => {
      const checkinDate = new Date(c.checked_at * 1000);
      const checkinHour = new Date(checkinDate.getTime() + (checkinDate.getTimezoneOffset() + estOffset) * 60000).getHours();
      if (hourCounts[checkinHour] !== undefined) {
        hourCounts[checkinHour]++;
      }
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    const avgInsomniaHour = peakHour ? parseInt(peakHour[0]) : 3;

    // Leaderboard
    const userCounts: Record<string, { count: number; hours: number[] }> = {};
    allInsomnia.forEach((c) => {
      if (!userCounts[c.username]) {
        userCounts[c.username] = { count: 0, hours: [] };
      }
      userCounts[c.username].count++;
      const checkinDate = new Date(c.checked_at * 1000);
      const checkinHour = new Date(checkinDate.getTime() + (checkinDate.getTimezoneOffset() + estOffset) * 60000).getHours();
      userCounts[c.username].hours.push(checkinHour);
    });

    const leaders = Object.entries(userCounts)
      .map(([username, data]) => ({
        username,
        count: data.count,
        avgHour: Math.round(data.hours.reduce((a, b) => a + b, 0) / data.hours.length),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Achievements
    const achievements = [];
    if (userInsomnia >= 1) achievements.push({ id: "first_insomnia", name: "Sleepless", emoji: "😴", desc: "First smoke at 2-5 AM" });
    if (userInsomnia >= 5) achievements.push({ id: "insomniac", name: "Insomniac", emoji: "🌃", desc: "5 smokes at 2-5 AM" });
    if (userInsomnia >= 10) achievements.push({ id: "night_terror", name: "Night Terror", emoji: "👻", desc: "10 smokes at 2-5 AM" });
    if (userInsomnia >= 25) achievements.push({ id: "vampire", name: "Vampire", emoji: "🧛", desc: "25 smokes at 2-5 AM" });

    return Response.json({
      tonightsInsomnia,
      stats: {
        totalInsomnia,
        uniqueInsomniacs,
        yourInsomniaCount: userInsomnia,
        avgInsomniaHour,
        mostPopularBrand,
        tonightHasInsomnia,
      },
      leaders,
      achievements,
      currentHour,
      isInsomniaTime,
    });
  } catch (error) {
    console.error("Insomnia API error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
