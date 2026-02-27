import { getRequestContext } from "@cloudflare/next-on-pages";
import { headers } from "next/headers";

export const runtime = "edge";

// Dawn Patrol: 4 AM - 7 AM window
const DAWN_START_HOUR = 4;
const DAWN_END_HOUR = 7;

interface DawnPatroller {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  checkedAt: number;
  timeAgo: string;
  imageUrl?: string;
  exactTime: string;
}

interface DawnLeader {
  username: string;
  count: number;
  avgRating: string;
  earliestSmoke: string;
}

function timeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatExactTime(timestamp: number): string {
  const date = new Date(timestamp);
  // Apply EST offset
  const estOffset = -5 * 60;
  const estTime = new Date(date.getTime() + (date.getTimezoneOffset() + estOffset) * 60000);
  const hours = estTime.getHours();
  const minutes = estTime.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

export async function GET() {
  const headersList = await headers();
  const sessionId = headersList.get("x-session-id");
  if (!sessionId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getRequestContext().env.DB;

  // Get current user
  const session = await db
    .prepare("SELECT user_id FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }

  const userId = session.user_id;

  // Get current time in EST
  const now = new Date();
  const estOffset = -5 * 60; // EST
  const estTime = new Date(now.getTime() + (now.getTimezoneOffset() + estOffset) * 60000);
  const currentHour = estTime.getHours();
  const isDawnWindow = currentHour >= DAWN_START_HOUR && currentHour < DAWN_END_HOUR;

  // Get start of today (EST)
  const todayStart = new Date(estTime);
  todayStart.setHours(0, 0, 0, 0);
  // Convert back to UTC for DB queries
  const todayStartUtc = new Date(todayStart.getTime() - (todayStart.getTimezoneOffset() + estOffset) * 60000);

  // Dawn window timestamps for today (in UTC)
  const dawnStartToday = new Date(todayStartUtc);
  dawnStartToday.setHours(dawnStartToday.getHours() + DAWN_START_HOUR);
  const dawnEndToday = new Date(todayStartUtc);
  dawnEndToday.setHours(dawnEndToday.getHours() + DAWN_END_HOUR);

  // Get today's dawn patrol (check-ins between 4-7 AM EST today)
  const todaysPatrolResult = await db.prepare(`
    SELECT 
      u.username,
      c.brand,
      c.product,
      c.rating,
      c.created_at as checkedAt,
      c.image_url as imageUrl
    FROM checkins c
    JOIN users u ON u.id = c.user_id
    WHERE c.created_at >= ?
      AND c.created_at < ?
    ORDER BY c.created_at ASC
  `).bind(dawnStartToday.getTime(), dawnEndToday.getTime()).all();

  const todaysPatrol: DawnPatroller[] = (todaysPatrolResult.results || []).map((row: Record<string, unknown>) => ({
    username: row.username as string,
    brand: row.brand as string,
    product: row.product as string | undefined,
    rating: row.rating as number | undefined,
    checkedAt: row.checkedAt as number,
    timeAgo: timeAgo(row.checkedAt as number),
    imageUrl: row.imageUrl as string | undefined,
    exactTime: formatExactTime(row.checkedAt as number),
  }));

  // Get all-time dawn patrol stats
  // Use hour extraction from timestamp (accounting for EST offset = UTC - 5)
  // For dawn hours 4-7 AM EST, that's 9-12 UTC (in standard time)
  // We need to check the hour in EST, which means checking ((timestamp / 3600000 - 5) % 24)
  const statsResult = await db.prepare(`
    SELECT 
      COUNT(*) as totalDawnSmokes,
      COUNT(DISTINCT user_id) as uniqueDawnPatrollers,
      AVG(rating) as avgRating
    FROM checkins
    WHERE ((created_at / 3600000 - 5) % 24 + 24) % 24 >= ? 
      AND ((created_at / 3600000 - 5) % 24 + 24) % 24 < ?
  `).bind(DAWN_START_HOUR, DAWN_END_HOUR).all();

  // User's dawn smoke count
  let yourDawnCount = 0;
  let earliestThisWeek: string | null = null;
  
  const userDawnResult = await db.prepare(`
    SELECT COUNT(*) as count
    FROM checkins
    WHERE user_id = ?
      AND ((created_at / 3600000 - 5) % 24 + 24) % 24 >= ?
      AND ((created_at / 3600000 - 5) % 24 + 24) % 24 < ?
  `).bind(userId, DAWN_START_HOUR, DAWN_END_HOUR).first<{ count: number }>();
  yourDawnCount = userDawnResult?.count || 0;

  // Get user's earliest dawn smoke this week
  const weekStart = new Date(estTime);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekStartUtc = new Date(weekStart.getTime() - (weekStart.getTimezoneOffset() + estOffset) * 60000);
  
  const earliestResult = await db.prepare(`
    SELECT created_at
    FROM checkins
    WHERE user_id = ?
      AND created_at >= ?
      AND ((created_at / 3600000 - 5) % 24 + 24) % 24 >= ?
      AND ((created_at / 3600000 - 5) % 24 + 24) % 24 < ?
    ORDER BY ((created_at / 3600000 - 5) % 24 + 24) % 24 ASC, created_at % 3600000 ASC
    LIMIT 1
  `).bind(userId, weekStartUtc.getTime(), DAWN_START_HOUR, DAWN_END_HOUR).first<{ created_at: number }>();
  
  if (earliestResult) {
    earliestThisWeek = formatExactTime(earliestResult.created_at);
  }

  // Get most dedicated patroller (most dawn smokes)
  const dedicatedResult = await db.prepare(`
    SELECT u.username, COUNT(*) as cnt
    FROM checkins c
    JOIN users u ON u.id = c.user_id
    WHERE ((c.created_at / 3600000 - 5) % 24 + 24) % 24 >= ?
      AND ((c.created_at / 3600000 - 5) % 24 + 24) % 24 < ?
    GROUP BY c.user_id
    ORDER BY cnt DESC
    LIMIT 1
  `).bind(DAWN_START_HOUR, DAWN_END_HOUR).first<{ username: string; cnt: number }>();

  // Get peak dawn minute (relative to 4 AM EST)
  const peakResult = await db.prepare(`
    SELECT 
      (((created_at / 60000) - 5 * 60) % 1440 + 1440) % 1440 - (? * 60) as dawnMinute,
      COUNT(*) as cnt
    FROM checkins
    WHERE ((created_at / 3600000 - 5) % 24 + 24) % 24 >= ?
      AND ((created_at / 3600000 - 5) % 24 + 24) % 24 < ?
    GROUP BY dawnMinute
    ORDER BY cnt DESC
    LIMIT 1
  `).bind(DAWN_START_HOUR, DAWN_START_HOUR, DAWN_END_HOUR).first<{ dawnMinute: number; cnt: number }>();

  // Get dawn patrol leaders (all-time)
  const leadersResult = await db.prepare(`
    SELECT 
      u.username,
      COUNT(*) as count,
      ROUND(AVG(c.rating), 1) as avgRating,
      MIN(c.created_at) as earliestSmoke
    FROM checkins c
    JOIN users u ON u.id = c.user_id
    WHERE ((c.created_at / 3600000 - 5) % 24 + 24) % 24 >= ?
      AND ((c.created_at / 3600000 - 5) % 24 + 24) % 24 < ?
    GROUP BY c.user_id
    ORDER BY count DESC
    LIMIT 10
  `).bind(DAWN_START_HOUR, DAWN_END_HOUR).all();

  const leaders: DawnLeader[] = (leadersResult.results || []).map((row: Record<string, unknown>) => ({
    username: row.username as string,
    count: row.count as number,
    avgRating: row.avgRating ? String(row.avgRating) : "—",
    earliestSmoke: row.earliestSmoke ? formatExactTime(row.earliestSmoke as number) : "",
  }));

  const statsRow = statsResult.results?.[0] as Record<string, unknown> | undefined;

  return Response.json({
    todaysPatrol,
    stats: {
      totalDawnSmokes: (statsRow?.totalDawnSmokes as number) || 0,
      uniqueDawnPatrollers: (statsRow?.uniqueDawnPatrollers as number) || 0,
      yourDawnCount,
      isDawnWindow,
      currentHour,
      earliestThisWeek,
      mostDedicatedPatroller: dedicatedResult?.username || null,
      avgDawnRating: statsRow?.avgRating ? Number(statsRow.avgRating).toFixed(1) : null,
      peakDawnMinute: peakResult?.dawnMinute || null,
    },
    leaders,
  });
}
