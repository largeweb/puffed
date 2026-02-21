import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export interface StreakResponse {
  currentStreak: number;
  bestStreak: number;
  lastCheckinDate: string | null;
  streakActive: boolean; // true if user logged today or yesterday
  error?: string;
}

export const runtime = "edge";

// Get start of day in UTC for a given timestamp
function getDateString(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Get today's date string
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Get yesterday's date string
function getYesterdayString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

// Calculate consecutive days from a list of unique dates (sorted descending)
function calculateStreak(dates: string[]): { current: number; best: number; active: boolean } {
  if (dates.length === 0) {
    return { current: 0, best: 0, active: false };
  }

  const today = getTodayString();
  const yesterday = getYesterdayString();
  
  // Check if streak is still active (logged today or yesterday)
  const lastDate = dates[0];
  const streakActive = lastDate === today || lastDate === yesterday;
  
  // Calculate current streak starting from most recent date
  let currentStreak = 0;
  
  if (streakActive) {
    // Start from the first date and count consecutive days
    let expectedDate = lastDate;
    
    for (const date of dates) {
      if (date === expectedDate) {
        currentStreak++;
        // Calculate previous day
        const dateObj = new Date(expectedDate + 'T12:00:00Z');
        dateObj.setUTCDate(dateObj.getUTCDate() - 1);
        expectedDate = dateObj.toISOString().split('T')[0];
      } else if (date < expectedDate) {
        // Gap found, streak ends
        break;
      }
    }
  }
  
  // Calculate best streak (iterate through all dates)
  let bestStreak = dates.length > 0 ? 1 : 0;
  let tempStreak = 1;
  
  for (let i = 1; i < dates.length; i++) {
    const prevDateObj = new Date(dates[i - 1] + 'T12:00:00Z');
    prevDateObj.setUTCDate(prevDateObj.getUTCDate() - 1);
    const expectedPrev = prevDateObj.toISOString().split('T')[0];
    
    if (expectedPrev === dates[i]) {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  bestStreak = Math.max(bestStreak, currentStreak);
  
  return { current: currentStreak, best: bestStreak, active: streakActive };
}

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return Response.json({ error: "Not authenticated" } as StreakResponse, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Session expired" } as StreakResponse, { status: 401 });
    }

    const userId = session.user_id;

    // Get all unique check-in dates for this user, sorted descending
    const result = await db
      .prepare(`
        SELECT DISTINCT date(created_at, 'unixepoch') as checkin_date
        FROM checkins
        WHERE user_id = ?
        ORDER BY checkin_date DESC
      `)
      .bind(userId)
      .all<{ checkin_date: string }>();

    const dates = result.results?.map(r => r.checkin_date) || [];
    const { current, best, active } = calculateStreak(dates);

    return Response.json({
      currentStreak: current,
      bestStreak: best,
      lastCheckinDate: dates[0] || null,
      streakActive: active,
    } as StreakResponse);
  } catch (error) {
    console.error("Streak error:", error);
    return Response.json({ error: "Server error" } as StreakResponse, { status: 500 });
  }
}
