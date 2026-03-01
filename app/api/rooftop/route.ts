import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface CityVibes {
  skyline: string;
  emoji: string;
  mood: string;
  desc: string;
}

function getCityVibes(hour: number, dayOfWeek: number): CityVibes {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  if (hour >= 18 && hour < 20) {
    return {
      skyline: "Golden Hour",
      emoji: "🌇",
      mood: "magical",
      desc: "The city glows amber as the sun sets behind the skyline",
    };
  } else if (hour >= 20 && hour < 22) {
    return {
      skyline: "City Lights",
      emoji: "🌃",
      mood: "electric",
      desc: "Windows lighting up across the skyline like a thousand stars",
    };
  } else if (hour >= 22 || hour < 1) {
    return {
      skyline: "Late Night Glow",
      emoji: "✨",
      mood: "intimate",
      desc: "The city hums below, but up here it's just you and the stars",
    };
  } else if (hour >= 1 && hour < 4) {
    return {
      skyline: "After Hours",
      emoji: "🌙",
      mood: "exclusive",
      desc: "Only the true night owls are still up here",
    };
  }
  
  // Daytime
  return {
    skyline: isWeekend ? "Weekend Views" : "Afternoon Sun",
    emoji: "☀️",
    mood: "waiting",
    desc: "The rooftop opens at sunset - come back when the city lights up",
  };
}

function getRooftopTip(): string {
  const tips = [
    "Best seat in the house: corner with two skyline views",
    "The jazz from downstairs always finds its way up here",
    "Order a Manhattan to match the view",
    "The elevator ride up is worth every second",
    "Dress code: whatever makes you feel like a million bucks",
    "The wind up here carries the smoke away perfectly",
    "Nothing says 'I made it' like a rooftop cigar",
    "The penthouse floor has nothing on this view",
    "City noise becomes music from up here",
    "Every rooftop regular was once a first-timer",
  ];
  const dayOfYear = Math.floor(Date.now() / 86400000);
  return tips[dayOfYear % tips.length];
}

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
    
    const now = new Date();
    const hour = now.getUTCHours() - 5; // EST
    const adjustedHour = hour < 0 ? hour + 24 : hour;
    const dayOfWeek = now.getUTCDay();
    
    // Rooftop hours: 6 PM - 2 AM
    const isRooftopOpen = adjustedHour >= 18 || adjustedHour < 2;
    
    // Get tonight's rooftop smokers (6 PM - 2 AM)
    const rooftopSmokers = await db
      .prepare(`
        SELECT c.id, u.username, c.brand, c.product, c.rating, c.photo_url as photoUrl,
               c.review, c.created_at as createdAt
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE (
          (strftime('%H', c.created_at, '-5 hours') >= '18')
          OR (strftime('%H', c.created_at, '-5 hours') < '02')
        )
        AND date(c.created_at, '-5 hours') >= date('now', '-1 day', '-5 hours')
        ORDER BY c.created_at DESC
        LIMIT 20
      `)
      .all<{
        id: number;
        username: string;
        brand: string;
        product: string | null;
        rating: number;
        photoUrl: string | null;
        review: string | null;
        createdAt: string;
      }>();
    
    // Rooftop regulars leaderboard (most evening smokes 6 PM - 2 AM)
    const leaderboard = await db
      .prepare(`
        SELECT u.username, 
               COUNT(*) as rooftopSmokes,
               ROUND(AVG(c.rating), 1) as avgRating,
               (SELECT brand FROM checkins WHERE user_id = u.id GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1) as topBrand
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE (
          strftime('%H', c.created_at, '-5 hours') >= '18'
          OR strftime('%H', c.created_at, '-5 hours') < '02'
        )
        GROUP BY u.id
        ORDER BY rooftopSmokes DESC
        LIMIT 10
      `)
      .all<{
        username: string;
        rooftopSmokes: number;
        avgRating: number;
        topBrand: string | null;
      }>();
    
    // Platform rooftop stats
    const stats = await db
      .prepare(`
        SELECT 
          COUNT(*) as totalSmokes,
          COUNT(DISTINCT user_id) as uniqueSmokers,
          ROUND(AVG(rating), 1) as avgRating,
          (SELECT brand FROM checkins WHERE (strftime('%H', created_at, '-5 hours') >= '18' OR strftime('%H', created_at, '-5 hours') < '02') GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1) as topBrand
        FROM checkins
        WHERE (
          strftime('%H', created_at, '-5 hours') >= '18'
          OR strftime('%H', created_at, '-5 hours') < '02'
        )
      `)
      .first<{
        totalSmokes: number;
        uniqueSmokers: number;
        avgRating: number;
        topBrand: string | null;
      }>();
    
    // User's personal rooftop stats
    let myStats = null;
    if (userId) {
      const userStats = await db
        .prepare(`
          SELECT 
            u.username,
            COUNT(*) as totalSmokes,
            ROUND(AVG(c.rating), 1) as avgRating,
            (SELECT brand FROM checkins WHERE user_id = ? AND (strftime('%H', created_at, '-5 hours') >= '18' OR strftime('%H', created_at, '-5 hours') < '02') GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1) as favoriteBrand
          FROM checkins c
          JOIN users u ON c.user_id = u.id
          WHERE c.user_id = ?
          AND (
            strftime('%H', c.created_at, '-5 hours') >= '18'
            OR strftime('%H', c.created_at, '-5 hours') < '02'
          )
        `)
        .bind(userId, userId)
        .first<{
          username: string;
          totalSmokes: number;
          avgRating: number;
          favoriteBrand: string | null;
        }>();
      
      if (userStats && userStats.totalSmokes > 0) {
        myStats = userStats;
      }
    }
    
    const vibes = getCityVibes(adjustedHour, dayOfWeek);
    
    return Response.json({
      isRooftopOpen,
      currentHour: adjustedHour,
      dayOfWeek,
      cityVibes: vibes,
      rooftopTip: getRooftopTip(),
      currentSmokers: rooftopSmokers.results?.map((s) => ({
        id: s.id,
        username: s.username,
        brand: s.brand,
        product: s.product,
        rating: s.rating,
        photoUrl: s.photoUrl,
        review: s.review,
        time: new Date(s.createdAt).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      })) || [],
      leaderboard: leaderboard.results || [],
      stats: stats || {
        totalSmokes: 0,
        uniqueSmokers: 0,
        avgRating: 0,
        topBrand: null,
      },
      myStats,
    });
  } catch (error) {
    console.error("Rooftop API error:", error);
    return Response.json({ error: "Failed to fetch rooftop data" }, { status: 500 });
  }
}
