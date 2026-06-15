import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

export const runtime = "edge";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCheckinDate: string | null;
  checkinDates: string[];
  isOnFire: boolean;
}

const emptyStreak: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastCheckinDate: null,
  checkinDates: [],
  isOnFire: false
};

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);
    
    if (!sessionId) {
      return NextResponse.json({ streak: emptyStreak });
    }
    
    const { env } = getRequestContext();
    const db = env.DB;
    
    // Get user from session
    const now = Math.floor(Date.now() / 1000);
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
      .bind(sessionId, now)
      .first<{ user_id: string }>();
    
    if (!session) {
      return NextResponse.json({ streak: emptyStreak });
    }
    
    const userId = session.user_id;
    
    // Get all check-in dates for this user in the last 90 days
    const ninetyDaysAgo = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);
    
    const result = await db.prepare(`
      SELECT DISTINCT date(created_at, 'unixepoch') as checkin_date
      FROM checkins
      WHERE user_id = ?
      AND created_at > ?
      ORDER BY checkin_date DESC
    `).bind(userId, ninetyDaysAgo).all<{ checkin_date: string }>();
    
    const checkinDates = result.results?.map((r: { checkin_date: string }) => r.checkin_date) || [];
    
    if (checkinDates.length === 0) {
      return NextResponse.json({ streak: emptyStreak });
    }
    
    // Calculate current streak
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    let currentStreak = 0;
    const sortedDates = [...checkinDates].sort().reverse(); // Most recent first
    
    // Check if streak is active (checked in today or yesterday)
    if (sortedDates[0] === today || sortedDates[0] === yesterday) {
      currentStreak = 1;
      
      // Count consecutive days
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / (24 * 60 * 60 * 1000));
        
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    
    // Calculate longest streak from all dates
    let longestStreak = 0;
    let tempStreak = 1;
    const allSortedDates = [...checkinDates].sort(); // Oldest first for longest calc
    
    for (let i = 1; i < allSortedDates.length; i++) {
      const prevDate = new Date(allSortedDates[i - 1]);
      const currDate = new Date(allSortedDates[i]);
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));
      
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    
    // Get last 30 days of dates for display
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const recentDates = checkinDates.filter((d: string) => d >= thirtyDaysAgo);
    
    const streakData: StreakData = {
      currentStreak,
      longestStreak,
      lastCheckinDate: sortedDates[0] || null,
      checkinDates: recentDates,
      isOnFire: currentStreak >= 3
    };
    
    return NextResponse.json({ streak: streakData });
  } catch (error) {
    console.error("Streak error:", error);
    return NextResponse.json({ streak: emptyStreak });
  }
}
