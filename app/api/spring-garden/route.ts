import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  
  const { env } = getRequestContext();
  const db = env.DB;

  // Get user from session (optional for this page)
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

  // Spring months: March, April, May (or we track from March 1st onwards)
  const now = new Date();
  const currentHour = now.getHours();
  
  // Spring Garden is best enjoyed 6 AM - 6 PM (daylight hours)
  const isActive = currentHour >= 6 && currentHour < 18;
  
  // Calculate spring start (March 1st of current year)
  const springStart = new Date(now.getFullYear(), 2, 1, 0, 0, 0);
  const springStartISO = springStart.toISOString();
  
  // Get today's garden smokers (check-ins today during daylight)
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartISO = todayStart.toISOString();

  const gardenSmokers = await db.prepare(`
    SELECT c.id, u.username, c.brand, c.product, c.rating, c.review, c.created_at as createdAt
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.created_at >= ?
    ORDER BY c.created_at DESC
    LIMIT 10
  `).bind(todayStartISO).all();

  // Get spring bloomers (most check-ins since spring started)
  const springBloomers = await db.prepare(`
    SELECT u.username, COUNT(*) as count, AVG(c.rating) as avgRating
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.created_at >= ?
    GROUP BY u.id
    ORDER BY count DESC
    LIMIT 10
  `).bind(springStartISO).all();

  // Get user's spring stats
  let userStats = { springCount: 0, avgRating: null as number | null };
  if (userId) {
    const stats = await db.prepare(`
      SELECT COUNT(*) as springCount, AVG(rating) as avgRating
      FROM checkins
      WHERE user_id = ? AND created_at >= ?
    `).bind(userId, springStartISO).first<{ springCount: number; avgRating: number | null }>();
    if (stats) userStats = stats;
  }

  // Get platform spring stats
  const platformStats = await db.prepare(`
    SELECT 
      COUNT(*) as totalSpringSmokes,
      COUNT(DISTINCT user_id) as bloomers,
      AVG(rating) as avgRating
    FROM checkins
    WHERE created_at >= ?
  `).bind(springStartISO).first<{ totalSpringSmokes: number; bloomers: number; avgRating: number | null }>();

  // Days since spring started
  const daysSinceSpring = Math.floor((now.getTime() - springStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Spring quotes and vibes
  const springQuotes = [
    "Spring is nature's way of saying, 'Let's party!' – Robin Williams",
    "In the spring, I have counted 136 different kinds of weather inside of 24 hours. – Mark Twain",
    "Spring: A lovely reminder of how beautiful change can truly be.",
    "No matter how long the winter, spring is sure to follow.",
    "The earth laughs in flowers. – Ralph Waldo Emerson",
    "Spring adds new life and new beauty to all that is.",
    "Where flowers bloom, so does hope.",
    "Spring is when you feel like whistling even with a shoe full of slush.",
    "The first day of spring is one thing, and the first spring day is another.",
    "Spring work is going on with joyful enthusiasm. – John Muir"
  ];

  // Flower types for animation
  const flowers = ['🌸', '🌷', '🌻', '🌺', '💐', '🌹', '🌼', '🪻', '🪷'];

  // Pick quote based on day
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const todaysQuote = springQuotes[dayOfYear % springQuotes.length];

  // Calculate time info
  let timeInfo;
  if (isActive) {
    const minutesRemaining = (18 - currentHour) * 60 - now.getMinutes();
    const phase = currentHour < 10 ? 'morning' : currentHour < 14 ? 'midday' : 'afternoon';
    timeInfo = { isActive: true, minutesRemaining, phase };
  } else {
    const hoursUntil = currentHour >= 18 ? (24 - currentHour) + 6 : 6 - currentHour;
    timeInfo = { isActive: false, hoursUntil };
  }

  return NextResponse.json({
    isActive,
    daysSinceSpring,
    springStart: springStart.toISOString(),
    timeInfo,
    todaysQuote,
    flowers,
    gardenSmokers: gardenSmokers.results || [],
    springBloomers: (springBloomers.results || []).map((b: Record<string, unknown>, i: number) => ({ ...b, rank: i + 1 })),
    userStats,
    platformStats: platformStats || { totalSpringSmokes: 0, bloomers: 0, avgRating: null }
  });
}
