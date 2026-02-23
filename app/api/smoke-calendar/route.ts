import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

export interface SmokeCalendarDay {
  date: string; // YYYY-MM-DD
  count: number;
  brands: string[];
}

export interface SmokeCalendarResponse {
  days: SmokeCalendarDay[];
  totalDays: number; // Days with at least one smoke
  totalSmokes: number;
  longestStreak: number;
  currentStreak: number;
  mostProductiveDay: string | null; // Day of week
  error?: string;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Session expired" }, { status: 401 });
    }

    const userId = session.user_id;

    // Get URL params for date range (default: last 365 days)
    const url = new URL(request.url);
    const daysBack = parseInt(url.searchParams.get("days") || "365");
    
    // Calculate start date
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);
    const startTimestamp = Math.floor(startDate.getTime() / 1000);

    // Get all check-ins in the date range
    const checkins = await db
      .prepare(`
        SELECT 
          date(created_at, 'unixepoch') as date,
          brand
        FROM checkins
        WHERE user_id = ? AND created_at >= ?
        ORDER BY created_at DESC
      `)
      .bind(userId, startTimestamp)
      .all<{ date: string; brand: string }>();

    // Group by date
    const dayMap = new Map<string, { count: number; brands: Set<string> }>();
    
    for (const checkin of checkins.results || []) {
      const existing = dayMap.get(checkin.date) || { count: 0, brands: new Set() };
      existing.count++;
      existing.brands.add(checkin.brand);
      dayMap.set(checkin.date, existing);
    }

    // Convert to array
    const days: SmokeCalendarDay[] = Array.from(dayMap.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      brands: Array.from(data.brands),
    }));

    // Sort by date ascending
    days.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    // Create a set of all smoke dates for easy lookup
    const smokeDates = new Set(days.map(d => d.date));
    
    // Count from today backwards for current streak
    const today = new Date();
    for (let i = 0; i < daysBack; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      if (smokeDates.has(dateStr)) {
        currentStreak++;
      } else if (i > 0) {
        // Allow today to not have a smoke yet
        break;
      }
    }

    // Calculate longest streak
    const allDates = [];
    for (let i = 0; i < daysBack; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(checkDate.getDate() + i);
      allDates.push(checkDate.toISOString().split('T')[0]);
    }

    for (const dateStr of allDates) {
      if (smokeDates.has(dateStr)) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Find most productive day of week
    const dayOfWeekCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    for (const day of days) {
      const date = new Date(day.date + 'T12:00:00');
      dayOfWeekCounts[date.getDay()] += day.count;
    }
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let mostProductiveDay: string | null = null;
    let maxCount = 0;
    for (const [dayNum, count] of Object.entries(dayOfWeekCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostProductiveDay = dayNames[parseInt(dayNum)];
      }
    }

    const response: SmokeCalendarResponse = {
      days,
      totalDays: days.length,
      totalSmokes: days.reduce((sum, d) => sum + d.count, 0),
      longestStreak,
      currentStreak,
      mostProductiveDay,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Smoke calendar error:", error);
    return Response.json(
      { error: "Failed to load smoke calendar" },
      { status: 500 }
    );
  }
}
