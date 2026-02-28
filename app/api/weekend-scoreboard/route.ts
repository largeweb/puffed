import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface WeekendUser {
  username: string;
  value: number;
  label: string;
}

interface WeekendScoreboard {
  weekendStart: number;
  weekendEnd: number;
  isWeekend: boolean;
  hoursRemaining: number;
  
  // Leaderboards
  mostCheckins: WeekendUser[];
  earlyBirds: WeekendUser[];
  nightOwls: WeekendUser[];
  varietyKings: WeekendUser[];
  ratingChamps: WeekendUser[];
  
  // Stats
  totalWeekendCheckins: number;
  totalWeekendSmokers: number;
  avgWeekendRating: number;
  topWeekendBrand: string | null;
  
  // Your stats (if logged in)
  yourStats?: {
    checkins: number;
    rank: number;
    earliestSmoke: string | null;
    latestSmoke: string | null;
    uniqueBrands: number;
  };
}

function getWeekendWindow(): { start: number; end: number; isWeekend: boolean } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Find the most recent Friday at 5pm
  const friday = new Date(now);
  const daysUntilFriday = (dayOfWeek + 2) % 7; // Days since Friday
  friday.setDate(friday.getDate() - daysUntilFriday);
  friday.setHours(17, 0, 0, 0); // 5 PM
  
  // If we're before Friday 5pm this week, go back a week
  if (now < friday) {
    friday.setDate(friday.getDate() - 7);
  }
  
  // Weekend ends Sunday at midnight (technically Monday 12:00 AM)
  const sunday = new Date(friday);
  sunday.setDate(sunday.getDate() + 2);
  sunday.setHours(23, 59, 59, 999);
  
  const start = Math.floor(friday.getTime() / 1000);
  const end = Math.floor(sunday.getTime() / 1000);
  const nowTs = Math.floor(now.getTime() / 1000);
  
  return {
    start,
    end,
    isWeekend: nowTs >= start && nowTs <= end
  };
}

export async function GET(request: Request) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    
    const { start, end, isWeekend } = getWeekendWindow();
    const now = Math.floor(Date.now() / 1000);
    const hoursRemaining = isWeekend ? Math.max(0, Math.floor((end - now) / 3600)) : 0;
    
    // Most check-ins
    const mostCheckinsResult = await db.prepare(`
      SELECT u.username, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at <= ?
      GROUP BY c.user_id
      ORDER BY count DESC
      LIMIT 10
    `).bind(start, end).all();
    
    const mostCheckins: WeekendUser[] = (mostCheckinsResult.results || []).map((r: Record<string, unknown>) => ({
      username: r.username as string,
      value: r.count as number,
      label: `${r.count} smokes`
    }));
    
    // Early birds - earliest smoke time of day
    const earlyBirdsResult = await db.prepare(`
      SELECT u.username, 
        MIN((c.created_at % 86400) / 3600) as earliest_hour,
        MIN(c.created_at) as earliest_ts
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at <= ?
        AND (c.created_at % 86400) / 3600 >= 4
        AND (c.created_at % 86400) / 3600 < 12
      GROUP BY c.user_id
      ORDER BY earliest_hour ASC
      LIMIT 10
    `).bind(start, end).all();
    
    const earlyBirds: WeekendUser[] = (earlyBirdsResult.results || []).map((r: Record<string, unknown>) => {
      const hour = r.earliest_hour as number;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return {
        username: r.username as string,
        value: hour,
        label: `${Math.floor(displayHour)}:00 ${ampm}`
      };
    });
    
    // Night owls - latest smoke time (10pm-4am)
    const nightOwlsResult = await db.prepare(`
      SELECT u.username,
        MAX(CASE 
          WHEN (c.created_at % 86400) / 3600 >= 22 THEN (c.created_at % 86400) / 3600
          WHEN (c.created_at % 86400) / 3600 < 4 THEN (c.created_at % 86400) / 3600 + 24
          ELSE 0
        END) as latest_hour
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at <= ?
        AND ((c.created_at % 86400) / 3600 >= 22 OR (c.created_at % 86400) / 3600 < 4)
      GROUP BY c.user_id
      HAVING latest_hour > 0
      ORDER BY latest_hour DESC
      LIMIT 10
    `).bind(start, end).all();
    
    const nightOwls: WeekendUser[] = (nightOwlsResult.results || []).map((r: Record<string, unknown>) => {
      let hour = r.latest_hour as number;
      if (hour >= 24) hour -= 24;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return {
        username: r.username as string,
        value: r.latest_hour as number,
        label: `${Math.floor(displayHour)}:00 ${ampm}`
      };
    });
    
    // Variety kings - most unique brands
    const varietyResult = await db.prepare(`
      SELECT u.username, COUNT(DISTINCT c.brand) as brands
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at <= ?
      GROUP BY c.user_id
      ORDER BY brands DESC
      LIMIT 10
    `).bind(start, end).all();
    
    const varietyKings: WeekendUser[] = (varietyResult.results || []).map((r: Record<string, unknown>) => ({
      username: r.username as string,
      value: r.brands as number,
      label: `${r.brands} brands`
    }));
    
    // Rating champs - highest avg rating (min 2 checkins)
    const ratingResult = await db.prepare(`
      SELECT u.username, AVG(c.rating) as avg_rating, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at <= ?
        AND c.rating IS NOT NULL
      GROUP BY c.user_id
      HAVING count >= 2
      ORDER BY avg_rating DESC
      LIMIT 10
    `).bind(start, end).all();
    
    const ratingChamps: WeekendUser[] = (ratingResult.results || []).map((r: Record<string, unknown>) => ({
      username: r.username as string,
      value: r.avg_rating as number,
      label: `${(r.avg_rating as number).toFixed(1)} avg`
    }));
    
    // Overall stats
    const statsResult = await db.prepare(`
      SELECT 
        COUNT(*) as total_checkins,
        COUNT(DISTINCT user_id) as total_smokers,
        AVG(rating) as avg_rating
      FROM checkins
      WHERE created_at >= ? AND created_at <= ?
    `).bind(start, end).first();
    
    const topBrandResult = await db.prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 1
    `).bind(start, end).first();
    
    // User's own stats
    let yourStats = undefined;
    if (userId) {
      const userStatsResult = await db.prepare(`
        SELECT 
          COUNT(*) as checkins,
          MIN(created_at) as earliest,
          MAX(created_at) as latest,
          COUNT(DISTINCT brand) as brands
        FROM checkins
        WHERE user_id = ? AND created_at >= ? AND created_at <= ?
      `).bind(userId, start, end).first();
      
      // Get rank
      const rankResult = await db.prepare(`
        SELECT COUNT(*) + 1 as rank
        FROM (
          SELECT user_id, COUNT(*) as count
          FROM checkins
          WHERE created_at >= ? AND created_at <= ?
          GROUP BY user_id
          HAVING count > (
            SELECT COUNT(*) FROM checkins 
            WHERE user_id = ? AND created_at >= ? AND created_at <= ?
          )
        )
      `).bind(start, end, userId, start, end).first();
      
      if (userStatsResult) {
        const earliest = userStatsResult.earliest as number | null;
        const latest = userStatsResult.latest as number | null;
        
        yourStats = {
          checkins: userStatsResult.checkins as number,
          rank: (rankResult?.rank as number) || 1,
          earliestSmoke: earliest ? new Date(earliest * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null,
          latestSmoke: latest ? new Date(latest * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null,
          uniqueBrands: userStatsResult.brands as number
        };
      }
    }
    
    const data: WeekendScoreboard = {
      weekendStart: start,
      weekendEnd: end,
      isWeekend,
      hoursRemaining,
      mostCheckins,
      earlyBirds,
      nightOwls,
      varietyKings,
      ratingChamps,
      totalWeekendCheckins: (statsResult?.total_checkins as number) || 0,
      totalWeekendSmokers: (statsResult?.total_smokers as number) || 0,
      avgWeekendRating: (statsResult?.avg_rating as number) || 0,
      topWeekendBrand: (topBrandResult?.brand as string) || null,
      yourStats
    };
    
    return Response.json(data);
  } catch (error) {
    console.error("Weekend scoreboard error:", error);
    return Response.json({ error: "Failed to load weekend scoreboard" }, { status: 500 });
  }
}
