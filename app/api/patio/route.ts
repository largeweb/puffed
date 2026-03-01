import { getRequestContext } from "@cloudflare/next-on-pages";
import { getUserId } from "@/lib/auth";

export const runtime = "edge";

interface PatioVibes {
  condition: string;
  emoji: string;
  temp: string;
  desc: string;
}

function getPatioVibes(hour: number, dayOfWeek: number): PatioVibes {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  // Evening phases
  if (hour >= 17 && hour < 19) {
    return {
      condition: "Golden Hour",
      emoji: "🌅",
      temp: "Perfect 72°",
      desc: "That magic sunset light hitting just right",
    };
  } else if (hour >= 19 && hour < 21) {
    return {
      condition: "Twilight Chill",
      emoji: "🌆",
      temp: "Cooling down to 68°",
      desc: "Stars starting to peek out",
    };
  } else if (hour >= 21 && hour < 23) {
    return {
      condition: "Night Breeze",
      emoji: "🌙",
      temp: "Cool 65°",
      desc: "Perfect patio weather under the stars",
    };
  } else if (hour >= 23 || hour < 2) {
    return {
      condition: "Midnight Garden",
      emoji: "✨",
      temp: "Crisp 62°",
      desc: "The neighborhood is quiet, just you and the night",
    };
  } else if (hour >= 5 && hour < 8) {
    return {
      condition: "Dawn Patrol",
      emoji: "🌄",
      temp: "Fresh 58°",
      desc: "Early bird gets the peaceful patio",
    };
  }
  
  // Default daytime
  return {
    condition: isWeekend ? "Weekend Sunshine" : "Afternoon Glow",
    emoji: "☀️",
    temp: "Warm 78°",
    desc: "A bit hot for the patio, maybe wait for sunset",
  };
}

function getPatioMood(hour: number): string {
  if (hour >= 17 && hour < 23) return "prime";
  if (hour >= 23 || hour < 2) return "late";
  if (hour >= 5 && hour < 8) return "early";
  return "waiting";
}

function getPatioTip(): string {
  const tips = [
    "Pro tip: citronella candle adds ambiance AND keeps bugs away",
    "String lights transform any patio into a vibe",
    "Nothing beats a good cigar with cricket sounds",
    "The patio is therapy, the smoke is meditation",
    "Best conversations happen on the patio after dark",
    "A cold drink and a good smoke - that's patio perfection",
    "The stars are your ceiling tonight",
    "Your neighbors are jealous of your patio game",
    "Every smoke tastes better outdoors",
    "The patio doesn't judge, it just welcomes",
  ];
  const dayOfYear = Math.floor(Date.now() / 86400000);
  return tips[dayOfYear % tips.length];
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const userId = await getUserId();
    
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isPatioTime = (hour >= 17 && hour <= 23) || hour < 2;
    
    // Get today's date bounds (5 PM today to 2 AM tomorrow for "tonight")
    const todayStart = new Date(now);
    todayStart.setHours(17, 0, 0, 0);
    const tonightEnd = new Date(todayStart);
    tonightEnd.setHours(26, 0, 0, 0); // 2 AM next day
    
    // Adjust if before 5 PM - show yesterday evening
    let startTs: number, endTs: number;
    if (hour < 17) {
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      startTs = Math.floor(yesterdayStart.getTime() / 1000);
      endTs = Math.floor(todayStart.getTime() / 1000);
    } else {
      startTs = Math.floor(todayStart.getTime() / 1000);
      endTs = Math.floor(now.getTime() / 1000) + 3600; // Include next hour
    }
    
    // Get evening patio smokers (5 PM - 2 AM window)
    const patioSmokers = await db
      .prepare(`
        SELECT 
          c.id,
          u.username,
          c.brand,
          c.product,
          c.rating,
          c.photo_url as photoUrl,
          c.review,
          c.created_at as createdAt
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE c.created_at >= ? AND c.created_at < ?
        ORDER BY c.created_at DESC
        LIMIT 20
      `)
      .bind(startTs, endTs)
      .all();
    
    const formatTime = (ts: number) => {
      const d = new Date(ts * 1000);
      const h = d.getHours();
      const m = d.getMinutes();
      const ampm = h >= 12 ? "PM" : "AM";
      const hour12 = h % 12 || 12;
      return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
    };
    
    const currentPatioSmokers = (patioSmokers.results || []).map((s: any) => ({
      id: s.id,
      username: s.username,
      brand: s.brand,
      product: s.product,
      rating: s.rating,
      photoUrl: s.photoUrl,
      review: s.review,
      time: formatTime(s.createdAt),
    }));
    
    // Get all-time patio leaderboard (evening smokes 5 PM - 2 AM)
    const leaderboard = await db
      .prepare(`
        SELECT 
          u.username,
          COUNT(*) as patioSmokes,
          ROUND(AVG(c.rating), 1) as avgRating,
          (
            SELECT brand FROM checkins 
            WHERE user_id = u.id 
            AND (
              CAST(strftime('%H', datetime(created_at, 'unixepoch', 'localtime')) AS INTEGER) >= 17
              OR CAST(strftime('%H', datetime(created_at, 'unixepoch', 'localtime')) AS INTEGER) < 2
            )
            GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1
          ) as topBrand
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE 
          CAST(strftime('%H', datetime(c.created_at, 'unixepoch', 'localtime')) AS INTEGER) >= 17
          OR CAST(strftime('%H', datetime(c.created_at, 'unixepoch', 'localtime')) AS INTEGER) < 2
        GROUP BY u.id
        ORDER BY patioSmokes DESC
        LIMIT 10
      `)
      .all();
    
    // Platform stats for patio hours
    const statsResult = await db
      .prepare(`
        SELECT 
          COUNT(*) as totalSmokes,
          COUNT(DISTINCT user_id) as uniqueSmokers,
          ROUND(AVG(rating), 1) as avgRating,
          (
            SELECT brand FROM checkins 
            WHERE 
              CAST(strftime('%H', datetime(created_at, 'unixepoch', 'localtime')) AS INTEGER) >= 17
              OR CAST(strftime('%H', datetime(created_at, 'unixepoch', 'localtime')) AS INTEGER) < 2
            GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1
          ) as topBrand
        FROM checkins
        WHERE 
          CAST(strftime('%H', datetime(created_at, 'unixepoch', 'localtime')) AS INTEGER) >= 17
          OR CAST(strftime('%H', datetime(created_at, 'unixepoch', 'localtime')) AS INTEGER) < 2
      `)
      .first();
    
    // User's patio stats
    let myStats = null;
    if (userId) {
      const myStatsResult = await db
        .prepare(`
          SELECT 
            COUNT(*) as totalSmokes,
            ROUND(AVG(rating), 1) as avgRating,
            (
              SELECT brand FROM checkins 
              WHERE user_id = ? 
              AND (
                CAST(strftime('%H', datetime(created_at, 'unixepoch', 'localtime')) AS INTEGER) >= 17
                OR CAST(strftime('%H', datetime(created_at, 'unixepoch', 'localtime')) AS INTEGER) < 2
              )
              GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1
            ) as favoriteBrand
          FROM checkins
          WHERE user_id = ?
          AND (
            CAST(strftime('%H', datetime(created_at, 'unixepoch', 'localtime')) AS INTEGER) >= 17
            OR CAST(strftime('%H', datetime(created_at, 'unixepoch', 'localtime')) AS INTEGER) < 2
          )
        `)
        .bind(userId, userId)
        .first();
      
      const userResult = await db
        .prepare(`SELECT username FROM users WHERE id = ?`)
        .bind(userId)
        .first();
      
      if (myStatsResult) {
        myStats = {
          totalSmokes: (myStatsResult as any).totalSmokes || 0,
          avgRating: (myStatsResult as any).avgRating || 0,
          favoriteBrand: (myStatsResult as any).favoriteBrand || null,
          username: (userResult as any)?.username || null,
        };
      }
    }
    
    const patioVibes = getPatioVibes(hour, dayOfWeek);
    
    // Time until patio prime time
    let timeMessage: string;
    if (isPatioTime) {
      timeMessage = hour < 2 
        ? "Late night patio session in progress" 
        : `Patio vibes until 2 AM`;
    } else if (hour < 17) {
      const hoursUntil = 17 - hour;
      timeMessage = `Patio opens in ${hoursUntil} hour${hoursUntil > 1 ? "s" : ""}`;
    } else {
      timeMessage = "See you tomorrow evening!";
    }
    
    return Response.json({
      isPatioTime,
      isWeekend,
      currentHour: hour,
      dayOfWeek,
      timeMessage,
      patioMood: getPatioMood(hour),
      patioVibes,
      patioTip: getPatioTip(),
      currentPatioSmokers,
      leaderboard: (leaderboard.results || []).map((e: any) => ({
        username: e.username,
        patioSmokes: e.patioSmokes,
        avgRating: e.avgRating || 0,
        topBrand: e.topBrand,
      })),
      stats: {
        totalSmokes: (statsResult as any)?.totalSmokes || 0,
        uniqueSmokers: (statsResult as any)?.uniqueSmokers || 0,
        avgRating: (statsResult as any)?.avgRating || 0,
        topBrand: (statsResult as any)?.topBrand || null,
      },
      myStats,
    });
  } catch (error) {
    console.error("Patio API error:", error);
    return Response.json({ error: "Failed to load patio data" }, { status: 500 });
  }
}
