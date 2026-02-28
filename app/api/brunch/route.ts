import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface BrunchSmoker {
  username: string;
  lastSmoke: string;
  brunchSmokes: number;
  favoriteDay: string;
  isActive: boolean;
}

interface BrunchMenu {
  name: string;
  emoji: string;
  desc: string;
  pairing: string;
}

interface BrunchResponse {
  isBrunchTime: boolean;
  isWeekend: boolean;
  currentHour: number;
  dayOfWeek: string;
  countdownMessage: string;
  menu: BrunchMenu;
  brunchCrew: BrunchSmoker[];
  leaderboard: {
    username: string;
    totalBrunchSmokes: number;
    avgRating: number;
    streak: number;
    topBrand: string | null;
  }[];
  stats: {
    totalBrunchSmokes: number;
    yourBrunchSmokes: number;
    brunchersToday: number;
    mostPopularHour: number;
    saturdaySmokes: number;
    sundaySmokes: number;
    topBrunchBrand: string | null;
  };
  vibes: {
    message: string;
    emoji: string;
    suggestion: string;
  };
  error?: string;
}

function getBrunchMenu(hour: number, dayOfWeek: number): BrunchMenu {
  const saturdayMenus: BrunchMenu[] = [
    { name: "Early Bird Brunch", emoji: "🌅", desc: "First seating vibes", pairing: "Black coffee + a mild cigar" },
    { name: "Mimosa Hour", emoji: "🥂", desc: "Bubbles & smoke", pairing: "Champagne + a creamy medium body" },
    { name: "Bloody Mary Brunch", emoji: "🍅", desc: "Spicy wake-up call", pairing: "Bloody Mary + a peppery stick" },
    { name: "Eggs Benedict Special", emoji: "🍳", desc: "Classic sophistication", pairing: "Hollandaise vibes + rich Maduro" },
    { name: "Late Brunch Lazy", emoji: "🛋️", desc: "No rush Saturday", pairing: "Irish coffee + your favorite smoke" },
  ];
  
  const sundayMenus: BrunchMenu[] = [
    { name: "Sunday Sunrise", emoji: "☀️", desc: "Peaceful morning", pairing: "Fresh juice + a Connecticut wrapper" },
    { name: "Gospel Brunch", emoji: "🎵", desc: "Soul food Sunday", pairing: "Sweet tea + a smooth robusto" },
    { name: "Lazy Sunday Special", emoji: "😴", desc: "Sleep in champions", pairing: "Coffee with cream + a mellow smoke" },
    { name: "Sunday Funday", emoji: "🎉", desc: "Last hurrah before Monday", pairing: "Bellini + a celebration smoke" },
    { name: "Recovery Brunch", emoji: "🩹", desc: "Take it easy", pairing: "Hair of the dog + a gentle cigar" },
  ];
  
  const menus = dayOfWeek === 0 ? sundayMenus : saturdayMenus;
  const idx = Math.min(hour - 9, menus.length - 1);
  return menus[Math.max(0, idx)];
}

function getBrunchVibes(hour: number, dayOfWeek: number): { message: string; emoji: string; suggestion: string } {
  const day = dayOfWeek === 0 ? "Sunday" : "Saturday";
  
  if (hour === 9) {
    return { 
      message: `Early ${day} Brunch Vibes`, 
      emoji: "🌅",
      suggestion: "Perfect time for a smoke before the crowd arrives"
    };
  } else if (hour === 10) {
    return { 
      message: "Peak Brunch Hour", 
      emoji: "🥞",
      suggestion: "The patio is calling — grab a table and light up"
    };
  } else if (hour === 11) {
    return { 
      message: "Mid-Brunch Mode", 
      emoji: "🥂",
      suggestion: "Time for round two — another drink, another smoke"
    };
  } else if (hour === 12) {
    return { 
      message: "High Noon Brunch", 
      emoji: "☀️",
      suggestion: "The sun is up, the smoke is smooth"
    };
  } else if (hour === 13) {
    return { 
      message: "Late Brunch Lingering", 
      emoji: "🛋️",
      suggestion: "No rush, enjoy the last of brunch hours"
    };
  }
  return { 
    message: `${day} Brunch Club`, 
    emoji: "🥞",
    suggestion: "Weekend brunch is the best brunch"
  };
}

function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getCountdownMessage(currentHour: number, dayOfWeek: number): string {
  // If it's a weekday
  if (dayOfWeek > 0 && dayOfWeek < 6) {
    const daysUntilSaturday = 6 - dayOfWeek;
    return `Brunch Club opens in ${daysUntilSaturday} day${daysUntilSaturday > 1 ? 's' : ''} — Saturday 9 AM!`;
  }
  
  // If it's weekend but before brunch
  if (currentHour < 9) {
    const hoursUntil = 9 - currentHour;
    return `Brunch starts in ${hoursUntil} hour${hoursUntil > 1 ? 's' : ''} — get ready!`;
  }
  
  // If it's weekend but after brunch
  if (currentHour >= 14) {
    if (dayOfWeek === 6) {
      return "Brunch is over for today — see you tomorrow at 9 AM!";
    }
    return "Brunch Club closed — see you next Saturday!";
  }
  
  return "Brunch is NOW!";
}

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    const { env } = getRequestContext();
    const db = env.DB;

    // Get current time (EST)
    const now = new Date();
    const utcHour = now.getUTCHours();
    const estHour = (utcHour - 5 + 24) % 24;
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
    
    // Brunch hours: Saturday/Sunday 9 AM to 2 PM (14:00)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isBrunchTime = isWeekend && estHour >= 9 && estHour < 14;
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek];

    if (!isBrunchTime) {
      return Response.json({
        isBrunchTime: false,
        isWeekend,
        currentHour: estHour,
        dayOfWeek: dayName,
        countdownMessage: getCountdownMessage(estHour, dayOfWeek),
        menu: { name: "Closed", emoji: "🔒", desc: "Come back during brunch hours", pairing: "" },
        brunchCrew: [],
        leaderboard: [],
        stats: {
          totalBrunchSmokes: 0,
          yourBrunchSmokes: 0,
          brunchersToday: 0,
          mostPopularHour: 11,
          saturdaySmokes: 0,
          sundaySmokes: 0,
          topBrunchBrand: null,
        },
        vibes: { 
          message: "Weekend Brunch Club", 
          emoji: "🥞",
          suggestion: "Join us Saturday & Sunday, 9 AM - 2 PM"
        },
      } as BrunchResponse);
    }

    // Get user's ID if logged in
    let userId: string | null = null;
    if (sessionId) {
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ?")
        .bind(sessionId)
        .first<{ user_id: string }>();
      userId = session?.user_id || null;
    }

    // Get recent brunch smokers (9 AM - 2 PM on weekends)
    const sixHoursAgo = Math.floor(Date.now() / 1000) - (6 * 60 * 60);

    const recentBrunchers = await db.prepare(`
      SELECT 
        u.username,
        MAX(c.created_at) as last_smoke,
        COUNT(CASE 
          WHEN (CAST(strftime('%w', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) IN (0, 6)
            AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 9
            AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 14)
          THEN 1 
        END) as brunch_smokes,
        CASE 
          WHEN SUM(CASE WHEN CAST(strftime('%w', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) = 6 THEN 1 ELSE 0 END) >
               SUM(CASE WHEN CAST(strftime('%w', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) = 0 THEN 1 ELSE 0 END)
          THEN 'Saturday' ELSE 'Sunday'
        END as fav_day
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      GROUP BY u.id
      ORDER BY last_smoke DESC
      LIMIT 20
    `).bind(sixHoursAgo).all<{
      username: string;
      last_smoke: number;
      brunch_smokes: number;
      fav_day: string;
    }>();

    // Get brunch leaderboard (all-time weekend brunch smokers)
    const leaderboardData = await db.prepare(`
      SELECT 
        u.username,
        COUNT(*) as total_brunch,
        AVG(c.rating) as avg_rating,
        c.brand as top_brand
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE CAST(strftime('%w', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) IN (0, 6)
        AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 9
        AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 14
      GROUP BY u.id
      ORDER BY total_brunch DESC
      LIMIT 10
    `).all<{
      username: string;
      total_brunch: number;
      avg_rating: number;
      top_brand: string | null;
    }>();

    // Get platform stats
    const platformStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_brunch_smokes,
        COUNT(DISTINCT user_id) as brunchers,
        SUM(CASE WHEN CAST(strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) = 6 THEN 1 ELSE 0 END) as saturday_smokes,
        SUM(CASE WHEN CAST(strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) = 0 THEN 1 ELSE 0 END) as sunday_smokes
      FROM checkins
      WHERE CAST(strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) IN (0, 6)
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 9
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 14
    `).first<{ 
      total_brunch_smokes: number; 
      brunchers: number; 
      saturday_smokes: number; 
      sunday_smokes: number;
    }>();

    // Get today's brunchers
    const todayStart = Math.floor(Date.now() / 1000) - (estHour * 3600);
    const todayBrunchers = await db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM checkins
      WHERE created_at >= ?
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 9
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 14
    `).bind(todayStart).first<{ count: number }>();

    // Get most popular brunch hour
    const popularHour = await db.prepare(`
      SELECT 
        CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) as hour,
        COUNT(*) as count
      FROM checkins
      WHERE CAST(strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) IN (0, 6)
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 9
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 14
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `).first<{ hour: number; count: number }>();

    // Get top brunch brand
    const topBrand = await db.prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins
      WHERE CAST(strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) IN (0, 6)
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 9
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 14
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 1
    `).first<{ brand: string; count: number }>();

    // Get user's personal brunch stats
    let yourBrunchSmokes = 0;
    if (userId) {
      const userStats = await db.prepare(`
        SELECT COUNT(*) as brunch_smokes
        FROM checkins
        WHERE user_id = ?
          AND CAST(strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) IN (0, 6)
          AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 9
          AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 14
      `).bind(userId).first<{ brunch_smokes: number }>();
      yourBrunchSmokes = userStats?.brunch_smokes || 0;
    }

    const brunchCrew: BrunchSmoker[] = (recentBrunchers.results || [])
      .filter(r => r.brunch_smokes > 0)
      .map(row => ({
        username: row.username,
        lastSmoke: formatTimeAgo(row.last_smoke),
        brunchSmokes: row.brunch_smokes,
        favoriteDay: row.fav_day,
        isActive: (Date.now() / 1000 - row.last_smoke) < 3600,
      }));

    const leaderboard = (leaderboardData.results || []).map((row, idx) => ({
      username: row.username,
      totalBrunchSmokes: row.total_brunch,
      avgRating: Math.round(row.avg_rating * 10) / 10,
      streak: Math.max(1, Math.floor(row.total_brunch / 4)), // Approximate weekend streaks
      topBrand: row.top_brand,
    }));

    const response: BrunchResponse = {
      isBrunchTime: true,
      isWeekend: true,
      currentHour: estHour,
      dayOfWeek: dayName,
      countdownMessage: "Brunch is NOW!",
      menu: getBrunchMenu(estHour, dayOfWeek),
      brunchCrew,
      leaderboard,
      stats: {
        totalBrunchSmokes: platformStats?.total_brunch_smokes || 0,
        yourBrunchSmokes,
        brunchersToday: todayBrunchers?.count || 0,
        mostPopularHour: popularHour?.hour || 11,
        saturdaySmokes: platformStats?.saturday_smokes || 0,
        sundaySmokes: platformStats?.sunday_smokes || 0,
        topBrunchBrand: topBrand?.brand || null,
      },
      vibes: getBrunchVibes(estHour, dayOfWeek),
    };

    return Response.json(response);
  } catch (error) {
    console.error("Brunch error:", error);
    return Response.json(
      { error: "Failed to load brunch data" },
      { status: 500 }
    );
  }
}
