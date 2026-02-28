import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

interface ChillQuote {
  text: string;
  mood: string;
}

const CHILL_QUOTES: ChillQuote[] = [
  { text: "The art of doing nothing is underrated.", mood: "zen" },
  { text: "Saturday afternoons were made for this.", mood: "content" },
  { text: "Time moves slower in a hammock.", mood: "relaxed" },
  { text: "No agenda, no problem.", mood: "carefree" },
  { text: "This is peak weekend energy.", mood: "blissful" },
  { text: "Productivity can wait until Monday.", mood: "peaceful" },
  { text: "The hammock doesn't judge.", mood: "accepting" },
  { text: "Just swaying through life.", mood: "mellow" },
  { text: "Weekend mode: fully activated.", mood: "zen" },
  { text: "Let the stress melt away.", mood: "serene" },
  { text: "Nothing to do, nowhere to be.", mood: "content" },
  { text: "This is what weekends are for.", mood: "blissful" },
];

const CHILL_ACTIVITIES = [
  "🌴 Swaying gently in the breeze",
  "☀️ Soaking up the afternoon sun",
  "🎶 Listening to smooth tunes",
  "📖 Maybe reading... maybe not",
  "🧊 Enjoying a cold drink",
  "💤 Drifting in and out of naps",
  "🌤️ Cloud watching",
  "🍃 Feeling the wind",
];

export async function GET() {
  try {
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
    
    // Get current time info
    const now = new Date();
    const estOffset = -5 * 60;
    const estTime = new Date(now.getTime() + (estOffset - now.getTimezoneOffset()) * 60000);
    const currentHour = estTime.getHours();
    const dayOfWeek = estTime.getDay(); // 0 = Sunday, 6 = Saturday
    
    const isSaturday = dayOfWeek === 0 || dayOfWeek === 6; // Weekend vibes for both Sat/Sun
    const isHammockTime = currentHour >= 12 && currentHour < 17; // 12 PM - 5 PM
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Weekend progress (Saturday 12 AM to Sunday 11:59 PM)
    let weekendProgress = 0;
    if (dayOfWeek === 6) {
      // Saturday: 0-50%
      weekendProgress = Math.round((estTime.getHours() * 60 + estTime.getMinutes()) / 28.8);
    } else if (dayOfWeek === 0) {
      // Sunday: 50-100%
      weekendProgress = 50 + Math.round((estTime.getHours() * 60 + estTime.getMinutes()) / 28.8);
    }
    weekendProgress = Math.min(100, Math.max(0, weekendProgress));
    
    // Hours until hammock time or time remaining
    let countdownMessage = "";
    if (!isWeekend) {
      const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
      countdownMessage = `${daysUntilSaturday} day${daysUntilSaturday > 1 ? 's' : ''} until the weekend hammock`;
    } else if (currentHour < 12) {
      const hoursUntil = 12 - currentHour;
      countdownMessage = `Hammock opens in ${hoursUntil} hour${hoursUntil > 1 ? 's' : ''}`;
    } else if (currentHour >= 17) {
      countdownMessage = "Hammock closed for today. See you tomorrow!";
    } else {
      const hoursRemaining = 17 - currentHour;
      countdownMessage = `${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} of chill left today`;
    }
    
    // Get afternoon check-ins for today (12-5 PM on weekends)
    const todayStart = new Date(estTime);
    todayStart.setHours(0, 0, 0, 0);
    const todayNoonTs = Math.floor(todayStart.getTime() / 1000) + (12 * 3600);
    const todayEveningTs = Math.floor(todayStart.getTime() / 1000) + (17 * 3600);
    const nowTs = Math.floor(Date.now() / 1000);
    
    // Get current hammock occupants (people who smoked 12-5 PM today on weekend)
    const currentOccupants = isWeekend ? await db.prepare(`
      SELECT c.id, u.username, c.brand, c.product, c.rating, c.photo_url as photoUrl,
             datetime(c.created_at, 'unixepoch') as time
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at < ?
        AND (strftime('%w', c.created_at, 'unixepoch') = '0' OR strftime('%w', c.created_at, 'unixepoch') = '6')
      ORDER BY c.created_at DESC
      LIMIT 15
    `).bind(todayNoonTs, Math.min(todayEveningTs, nowTs + 3600)).all() : { results: [] };
    
    // Get all-time weekend afternoon stats
    const allTimeStats = await db.prepare(`
      SELECT 
        COUNT(*) as totalSmokes,
        COUNT(DISTINCT user_id) as uniqueChillers,
        AVG(rating) as avgRating,
        (SELECT brand FROM checkins 
         WHERE strftime('%H', created_at, 'unixepoch') >= '12' 
         AND strftime('%H', created_at, 'unixepoch') < '17'
         AND (strftime('%w', created_at, 'unixepoch') = '0' OR strftime('%w', created_at, 'unixepoch') = '6')
         GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1) as topBrand
      FROM checkins
      WHERE strftime('%H', created_at, 'unixepoch') >= '12' 
        AND strftime('%H', created_at, 'unixepoch') < '17'
        AND (strftime('%w', created_at, 'unixepoch') = '0' OR strftime('%w', created_at, 'unixepoch') = '6')
    `).first<{ totalSmokes: number; uniqueChillers: number; avgRating: number; topBrand: string | null }>();
    
    // Leaderboard - most weekend afternoon smokes
    const leaderboard = await db.prepare(`
      SELECT u.username, 
             COUNT(*) as hammockSmokes,
             AVG(c.rating) as avgRating,
             (SELECT brand FROM checkins c2 
              WHERE c2.user_id = c.user_id 
              AND strftime('%H', c2.created_at, 'unixepoch') >= '12' 
              AND strftime('%H', c2.created_at, 'unixepoch') < '17'
              AND (strftime('%w', c2.created_at, 'unixepoch') = '0' OR strftime('%w', c2.created_at, 'unixepoch') = '6')
              GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1) as favoriteBrand
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE strftime('%H', c.created_at, 'unixepoch') >= '12' 
        AND strftime('%H', c.created_at, 'unixepoch') < '17'
        AND (strftime('%w', c.created_at, 'unixepoch') = '0' OR strftime('%w', c.created_at, 'unixepoch') = '6')
      GROUP BY c.user_id
      ORDER BY hammockSmokes DESC, avgRating DESC
      LIMIT 10
    `).all();
    
    // User's personal hammock stats
    let myStats = null;
    if (userId) {
      const userStats = await db.prepare(`
        SELECT COUNT(*) as totalSmokes,
               AVG(rating) as avgRating,
               (SELECT brand FROM checkins 
                WHERE user_id = ? 
                AND strftime('%H', created_at, 'unixepoch') >= '12' 
                AND strftime('%H', created_at, 'unixepoch') < '17'
                AND (strftime('%w', created_at, 'unixepoch') = '0' OR strftime('%w', created_at, 'unixepoch') = '6')
                GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1) as favoriteBrand
        FROM checkins
        WHERE user_id = ?
          AND strftime('%H', created_at, 'unixepoch') >= '12' 
          AND strftime('%H', created_at, 'unixepoch') < '17'
          AND (strftime('%w', created_at, 'unixepoch') = '0' OR strftime('%w', created_at, 'unixepoch') = '6')
      `).bind(userId, userId).first<{ totalSmokes: number; avgRating: number; favoriteBrand: string | null }>();
      
      if (userStats && userStats.totalSmokes > 0) {
        myStats = userStats;
      }
    }
    
    // Calculate "chill factor" - how relaxed is the platform (0-100)
    const activeOccupants = (currentOccupants.results?.length || 0);
    const avgRatingFactor = (allTimeStats?.avgRating || 4) / 5 * 30;
    const activityFactor = Math.min(40, activeOccupants * 8);
    const timeFactor = isHammockTime ? 30 : (isWeekend ? 15 : 0);
    const chillFactor = Math.round(Math.min(100, avgRatingFactor + activityFactor + timeFactor));
    
    // Pick a random quote and activity
    const randomQuote = CHILL_QUOTES[Math.floor(Math.random() * CHILL_QUOTES.length)];
    const randomActivity = CHILL_ACTIVITIES[Math.floor(Math.random() * CHILL_ACTIVITIES.length)];
    
    return NextResponse.json({
      isWeekend,
      isHammockTime: isWeekend && isHammockTime,
      currentHour,
      countdownMessage,
      weekendProgress,
      chillFactor,
      chillQuote: randomQuote,
      currentActivity: randomActivity,
      currentOccupants: currentOccupants.results || [],
      stats: {
        totalSmokes: allTimeStats?.totalSmokes || 0,
        uniqueChillers: allTimeStats?.uniqueChillers || 0,
        avgRating: allTimeStats?.avgRating || 0,
        topBrand: allTimeStats?.topBrand || null,
      },
      leaderboard: leaderboard.results || [],
      myStats,
    });
  } catch (error) {
    console.error("Hammock API error:", error);
    return NextResponse.json({ error: "Failed to fetch hammock data" }, { status: 500 });
  }
}
