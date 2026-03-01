import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface BrunchUser {
  username: string;
  lastSmoke: string;
  sundaySmokes: number;
  brunchSmokes: number;
  isActive: boolean;
}

interface BrunchResponse {
  isSunday: boolean;
  isBrunchTime: boolean;
  currentHour: number;
  loungeOpen: boolean;
  brunchers: BrunchUser[];
  stats: {
    totalBrunchSmokes: number;
    yourBrunchSmokes: number;
    brunchPercentile: number;
    favoriteBrunchBrand: string | null;
    brunchRegulars: number;
    avgBrunchRating: number;
  };
  vibes: {
    message: string;
    emoji: string;
  };
  specials: string[];
  error?: string;
}

function getBrunchVibes(hour: number): { message: string; emoji: string } {
  if (hour === 10) {
    return { message: "Early Brunch Crowd", emoji: "🌞" };
  } else if (hour === 11) {
    return { message: "Peak Brunch Hour", emoji: "🥂" };
  } else if (hour === 12) {
    return { message: "Mimosas & Cigars", emoji: "🍾" };
  } else if (hour === 13) {
    return { message: "Late Brunch Society", emoji: "☕" };
  } else if (hour === 14) {
    return { message: "Brunch Afterglow", emoji: "😌" };
  }
  return { message: "Sunday Brunch Vibes", emoji: "🥂" };
}

function getBrunchSpecials(): string[] {
  const specials = [
    "🥂 Bottomless mimosas pair great with a light Connecticut wrapper",
    "🥓 Nothing beats bacon, eggs & a smooth morning smoke",
    "☕ Try a maduro with your espresso — trust us",
    "🍳 Benedict and a belicoso? Chef's kiss 🤌",
    "🥐 Croissants and Cameroon wrappers — the French know what's up",
    "🧇 Waffles wait for no one, but a good smoke is worth the pause",
    "🍊 Fresh OJ + a citrus-forward blend = Sunday morning perfection",
  ];
  // Return 2-3 random specials
  const shuffled = specials.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}

function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    const { env } = getRequestContext();
    const db = env.DB;

    // Get current time in EST
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    // Approximate EST (UTC-5)
    const estHour = (utcHour - 5 + 24) % 24;
    // Adjust day if we crossed midnight
    let estDay = utcDay;
    if (utcHour < 5) {
      estDay = (utcDay - 1 + 7) % 7;
    }
    
    // Sunday = 0, Brunch hours: 10 AM to 3 PM
    const isSunday = estDay === 0;
    const isBrunchTime = estHour >= 10 && estHour < 15;
    const loungeOpen = isSunday && isBrunchTime;

    if (!loungeOpen) {
      const closedMessage = !isSunday 
        ? "Sunday Brunch opens Sundays 10 AM - 3 PM" 
        : estHour < 10 
          ? "Brunch opens at 10 AM — patience, darling" 
          : "Brunch is over, see you next Sunday!";
      
      return Response.json({
        isSunday,
        isBrunchTime: false,
        currentHour: estHour,
        loungeOpen: false,
        brunchers: [],
        stats: {
          totalBrunchSmokes: 0,
          yourBrunchSmokes: 0,
          brunchPercentile: 0,
          favoriteBrunchBrand: null,
          brunchRegulars: 0,
          avgBrunchRating: 0,
        },
        vibes: { message: closedMessage, emoji: "🥂" },
        specials: [],
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

    // Get today's brunch smokers (Sunday 10 AM - 3 PM)
    const todayStart = Math.floor(Date.now() / 1000) - (estHour * 3600) - (now.getUTCMinutes() * 60);
    const brunchStart = todayStart + (10 * 3600); // 10 AM today

    const recentBrunchers = await db.prepare(`
      SELECT 
        u.username,
        MAX(c.created_at) as last_smoke,
        COUNT(CASE 
          WHEN strftime('%w', datetime(c.created_at, 'unixepoch', '-5 hours')) = '0'
            AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 10 
            AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 15
          THEN 1 
        END) as brunch_smokes,
        COUNT(CASE 
          WHEN strftime('%w', datetime(c.created_at, 'unixepoch', '-5 hours')) = '0'
          THEN 1 
        END) as sunday_smokes
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      GROUP BY u.id
      ORDER BY last_smoke DESC
      LIMIT 20
    `).bind(brunchStart).all<{
      username: string;
      last_smoke: number;
      brunch_smokes: number;
      sunday_smokes: number;
    }>();

    // Get all-time brunch stats (Sunday 10 AM - 3 PM)
    const platformStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_brunch_smokes,
        COUNT(DISTINCT user_id) as brunch_regulars,
        AVG(rating) as avg_rating
      FROM checkins
      WHERE strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) = '0'
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 10
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 15
    `).first<{ total_brunch_smokes: number; brunch_regulars: number; avg_rating: number }>();

    // Get favorite brunch brand
    const favBrand = await db.prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins
      WHERE strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) = '0'
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 10
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 15
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 1
    `).first<{ brand: string; count: number }>();

    // Get user's personal brunch stats
    let yourBrunchSmokes = 0;
    let brunchPercentile = 0;

    if (userId) {
      const userStats = await db.prepare(`
        SELECT COUNT(*) as brunch_smokes
        FROM checkins
        WHERE user_id = ?
          AND strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) = '0'
          AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 10
          AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 15
      `).bind(userId).first<{ brunch_smokes: number }>();

      yourBrunchSmokes = userStats?.brunch_smokes || 0;

      // Calculate percentile among brunchers
      if (yourBrunchSmokes > 0 && platformStats?.brunch_regulars) {
        const betterThan = await db.prepare(`
          SELECT COUNT(DISTINCT user_id) as count
          FROM checkins
          WHERE user_id != ?
            AND strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) = '0'
            AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 10
            AND CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 15
          GROUP BY user_id
          HAVING COUNT(*) < ?
        `).bind(userId, yourBrunchSmokes).all();
        
        brunchPercentile = Math.round(
          ((betterThan.results?.length || 0) / platformStats.brunch_regulars) * 100
        );
      }
    }

    const brunchers: BrunchUser[] = (recentBrunchers.results || [])
      .filter(r => r.brunch_smokes > 0 || r.sunday_smokes > 0)
      .map(row => ({
        username: row.username,
        lastSmoke: formatTimeAgo(row.last_smoke),
        sundaySmokes: row.sunday_smokes,
        brunchSmokes: row.brunch_smokes,
        isActive: (Date.now() / 1000 - row.last_smoke) < 3600,
      }));

    const response: BrunchResponse = {
      isSunday: true,
      isBrunchTime: true,
      currentHour: estHour,
      loungeOpen: true,
      brunchers,
      stats: {
        totalBrunchSmokes: platformStats?.total_brunch_smokes || 0,
        yourBrunchSmokes,
        brunchPercentile,
        favoriteBrunchBrand: favBrand?.brand || null,
        brunchRegulars: platformStats?.brunch_regulars || 0,
        avgBrunchRating: platformStats?.avg_rating ? Math.round(platformStats.avg_rating * 10) / 10 : 0,
      },
      vibes: getBrunchVibes(estHour),
      specials: getBrunchSpecials(),
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
