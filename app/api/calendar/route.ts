import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface CalendarDay {
  date: string; // YYYY-MM-DD
  count: number;
  brands: string[];
}

interface CalendarResponse {
  days: CalendarDay[];
  stats: {
    totalDays: number;
    totalCheckins: number;
    longestStreak: number;
    currentStreak: number;
    mostActiveDay: string;
    mostActiveCount: number;
  };
}

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = env.DB;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get user from session
  const session = await db
    .prepare("SELECT user_id FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ user_id: string }>();

  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  // Get username from query or use current user
  const searchParams = request.nextUrl.searchParams;
  const targetUsername = searchParams.get("username");
  
  let targetUserId = session.user_id;
  
  if (targetUsername) {
    const targetUser = await db
      .prepare("SELECT id FROM users WHERE username = ?")
      .bind(targetUsername)
      .first<{ id: string }>();
    
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    targetUserId = targetUser.id;
  }

  // Get last 365 days of check-ins
  const oneYearAgo = Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60);
  
  const checkins = await db
    .prepare(`
      SELECT 
        date(created_at, 'unixepoch') as date,
        brand,
        created_at
      FROM checkins 
      WHERE user_id = ? AND created_at > ?
      ORDER BY created_at DESC
    `)
    .bind(targetUserId, oneYearAgo)
    .all<{ date: string; brand: string; created_at: number }>();

  // Group by date
  const dayMap = new Map<string, { count: number; brands: Set<string> }>();
  
  for (const checkin of checkins.results || []) {
    if (!dayMap.has(checkin.date)) {
      dayMap.set(checkin.date, { count: 0, brands: new Set() });
    }
    const day = dayMap.get(checkin.date)!;
    day.count++;
    day.brands.add(checkin.brand);
  }

  // Convert to array
  const days: CalendarDay[] = Array.from(dayMap.entries()).map(([date, data]) => ({
    date,
    count: data.count,
    brands: Array.from(data.brands),
  }));

  // Calculate stats
  const sortedDates = Array.from(dayMap.keys()).sort();
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  // Calculate streaks
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  // Check if today or yesterday has activity for current streak
  const hasToday = dayMap.has(today);
  const hasYesterday = dayMap.has(yesterday);
  
  if (hasToday || hasYesterday) {
    // Count backwards from most recent active day
    let checkDate = hasToday ? new Date() : new Date(Date.now() - 86400000);
    
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dayMap.has(dateStr)) {
        currentStreak++;
        checkDate = new Date(checkDate.getTime() - 86400000);
      } else {
        break;
      }
    }
  }
  
  // Calculate longest streak
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86400000);
      
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  // Find most active day
  let mostActiveDay = "";
  let mostActiveCount = 0;
  for (const [date, data] of dayMap.entries()) {
    if (data.count > mostActiveCount) {
      mostActiveCount = data.count;
      mostActiveDay = date;
    }
  }

  const response: CalendarResponse = {
    days,
    stats: {
      totalDays: dayMap.size,
      totalCheckins: (checkins.results || []).length,
      longestStreak,
      currentStreak,
      mostActiveDay,
      mostActiveCount,
    },
  };

  return NextResponse.json(response);
}
