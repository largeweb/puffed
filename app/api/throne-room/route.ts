import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface Champion {
  username: string;
  value: number;
  label: string;
}

interface ThroneCategory {
  id: string;
  name: string;
  emoji: string;
  description: string;
  champion: Champion | null;
  runnerUp: Champion | null;
  yourRank: number | null;
  yourValue: number | null;
}

interface ThroneRoomResponse {
  categories: ThroneCategory[];
  stats: {
    totalCompetitors: number;
    yourCrowns: number;
    yourRunnerUps: number;
  };
  lastUpdated: number;
  error?: string;
}

// Get start of current week (Sunday midnight EST)
function getWeekStart(): number {
  const now = new Date();
  // Adjust to EST
  const estOffset = -5 * 60;
  const localOffset = now.getTimezoneOffset();
  const estNow = new Date(now.getTime() + (localOffset + estOffset) * 60 * 1000);
  
  const dayOfWeek = estNow.getDay(); // 0 = Sunday
  const weekStart = new Date(estNow);
  weekStart.setDate(weekStart.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  
  return Math.floor(weekStart.getTime() / 1000);
}

export async function GET(request: NextRequest): Promise<NextResponse<ThroneRoomResponse>> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Get current user if logged in
    const sessionId = request.cookies.get("session")?.value;
    let currentUserId: string | null = null;
    let currentUsername: string | null = null;

    if (sessionId) {
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > unixepoch()")
        .bind(sessionId)
        .first<{ user_id: string }>();
      
      if (session) {
        currentUserId = session.user_id;
        const user = await db
          .prepare("SELECT username FROM users WHERE id = ?")
          .bind(currentUserId)
          .first<{ username: string }>();
        currentUsername = user?.username || null;
      }
    }

    const weekStart = getWeekStart();
    const categories: ThroneCategory[] = [];

    // 1. Weekly Smoke King 👑 - Most check-ins this week
    const weeklyCheckins = await db.prepare(`
      SELECT u.username, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      GROUP BY u.id
      ORDER BY count DESC
      LIMIT 3
    `).bind(weekStart).all<{ username: string; count: number }>();

    let yourWeeklyRank: number | null = null;
    let yourWeeklyCount: number | null = null;
    if (currentUsername) {
      const allWeekly = await db.prepare(`
        SELECT username, COUNT(*) as count,
               ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as rank
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE c.created_at >= ?
        GROUP BY u.id
      `).bind(weekStart).all<{ username: string; count: number; rank: number }>();
      
      const yourEntry = allWeekly.results?.find(r => r.username === currentUsername);
      yourWeeklyRank = yourEntry?.rank || null;
      yourWeeklyCount = yourEntry?.count || null;
    }

    categories.push({
      id: "weekly_king",
      name: "Weekly Smoke King",
      emoji: "👑",
      description: "Most check-ins this week",
      champion: weeklyCheckins.results?.[0] 
        ? { username: weeklyCheckins.results[0].username, value: weeklyCheckins.results[0].count, label: `${weeklyCheckins.results[0].count} smokes` }
        : null,
      runnerUp: weeklyCheckins.results?.[1]
        ? { username: weeklyCheckins.results[1].username, value: weeklyCheckins.results[1].count, label: `${weeklyCheckins.results[1].count} smokes` }
        : null,
      yourRank: yourWeeklyRank,
      yourValue: yourWeeklyCount,
    });

    // 2. Streak Master ⚡ - Longest current streak
    const streakLeaders = await db.prepare(`
      SELECT u.username,
        (SELECT COUNT(DISTINCT date(datetime(c2.created_at, 'unixepoch', '-5 hours')))
         FROM checkins c2 
         WHERE c2.user_id = u.id
         AND c2.created_at >= (
           SELECT COALESCE(
             (SELECT MAX(d) FROM (
               SELECT date(datetime(created_at, 'unixepoch', '-5 hours')) as d
               FROM checkins
               WHERE user_id = u.id
               GROUP BY d
               HAVING d < date(datetime(unixepoch(), 'unixepoch', '-5 hours'))
               AND NOT EXISTS (
                 SELECT 1 FROM checkins c3
                 WHERE c3.user_id = u.id
                 AND date(datetime(c3.created_at, 'unixepoch', '-5 hours')) = date(d, '+1 day')
               )
             )), 0)) * 86400
        ) as streak
      FROM users u
      WHERE EXISTS (SELECT 1 FROM checkins WHERE user_id = u.id)
      ORDER BY streak DESC
      LIMIT 3
    `).all<{ username: string; streak: number }>();

    // Simpler streak calculation
    const streakData = await db.prepare(`
      SELECT u.id, u.username, COUNT(DISTINCT date(datetime(c.created_at, 'unixepoch', '-5 hours'))) as total_days
      FROM users u
      JOIN checkins c ON u.id = c.user_id
      GROUP BY u.id
      ORDER BY total_days DESC
    `).all<{ id: string; username: string; total_days: number }>();

    // For now, use a simpler approach - just get users with most recent consecutive days
    categories.push({
      id: "streak_master",
      name: "Streak Master",
      emoji: "⚡",
      description: "Most consistent smoker",
      champion: streakData.results?.[0]
        ? { username: streakData.results[0].username, value: streakData.results[0].total_days, label: `${streakData.results[0].total_days} days active` }
        : null,
      runnerUp: streakData.results?.[1]
        ? { username: streakData.results[1].username, value: streakData.results[1].total_days, label: `${streakData.results[1].total_days} days active` }
        : null,
      yourRank: null,
      yourValue: null,
    });

    // 3. Five Star General ⭐ - Most 5-star ratings
    const fiveStarLeaders = await db.prepare(`
      SELECT u.username, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.rating = 5
      GROUP BY u.id
      ORDER BY count DESC
      LIMIT 3
    `).all<{ username: string; count: number }>();

    categories.push({
      id: "five_star",
      name: "Five Star General",
      emoji: "⭐",
      description: "Most perfect ratings given",
      champion: fiveStarLeaders.results?.[0]
        ? { username: fiveStarLeaders.results[0].username, value: fiveStarLeaders.results[0].count, label: `${fiveStarLeaders.results[0].count} × 5⭐` }
        : null,
      runnerUp: fiveStarLeaders.results?.[1]
        ? { username: fiveStarLeaders.results[1].username, value: fiveStarLeaders.results[1].count, label: `${fiveStarLeaders.results[1].count} × 5⭐` }
        : null,
      yourRank: null,
      yourValue: null,
    });

    // 4. Social Butterfly 💕 - Most likes received
    const likeLeaders = await db.prepare(`
      SELECT u.username, COUNT(*) as count
      FROM likes l
      JOIN checkins c ON l.checkin_id = c.id
      JOIN users u ON c.user_id = u.id
      GROUP BY c.user_id
      ORDER BY count DESC
      LIMIT 3
    `).all<{ username: string; count: number }>();

    categories.push({
      id: "social_butterfly",
      name: "Social Butterfly",
      emoji: "💕",
      description: "Most likes received",
      champion: likeLeaders.results?.[0]
        ? { username: likeLeaders.results[0].username, value: likeLeaders.results[0].count, label: `${likeLeaders.results[0].count} likes` }
        : null,
      runnerUp: likeLeaders.results?.[1]
        ? { username: likeLeaders.results[1].username, value: likeLeaders.results[1].count, label: `${likeLeaders.results[1].count} likes` }
        : null,
      yourRank: null,
      yourValue: null,
    });

    // 5. Night Owl King 🦉 - Most late-night smokes (12-4 AM)
    const nightOwlLeaders = await db.prepare(`
      SELECT u.username, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 0
        AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 4
      GROUP BY u.id
      ORDER BY count DESC
      LIMIT 3
    `).all<{ username: string; count: number }>();

    categories.push({
      id: "night_owl",
      name: "Night Owl King",
      emoji: "🦉",
      description: "Most midnight smokes (12-4 AM)",
      champion: nightOwlLeaders.results?.[0]
        ? { username: nightOwlLeaders.results[0].username, value: nightOwlLeaders.results[0].count, label: `${nightOwlLeaders.results[0].count} night smokes` }
        : null,
      runnerUp: nightOwlLeaders.results?.[1]
        ? { username: nightOwlLeaders.results[1].username, value: nightOwlLeaders.results[1].count, label: `${nightOwlLeaders.results[1].count} night smokes` }
        : null,
      yourRank: null,
      yourValue: null,
    });

    // 6. Early Bird Champion 🌅 - Most early morning smokes (5-9 AM)
    const earlyBirdLeaders = await db.prepare(`
      SELECT u.username, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) >= 5
        AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) AS INTEGER) < 9
      GROUP BY u.id
      ORDER BY count DESC
      LIMIT 3
    `).all<{ username: string; count: number }>();

    categories.push({
      id: "early_bird",
      name: "Early Bird Champion",
      emoji: "🌅",
      description: "Most morning smokes (5-9 AM)",
      champion: earlyBirdLeaders.results?.[0]
        ? { username: earlyBirdLeaders.results[0].username, value: earlyBirdLeaders.results[0].count, label: `${earlyBirdLeaders.results[0].count} morning smokes` }
        : null,
      runnerUp: earlyBirdLeaders.results?.[1]
        ? { username: earlyBirdLeaders.results[1].username, value: earlyBirdLeaders.results[1].count, label: `${earlyBirdLeaders.results[1].count} morning smokes` }
        : null,
      yourRank: null,
      yourValue: null,
    });

    // 7. Brand Explorer 🗺️ - Most unique brands tried
    const explorerLeaders = await db.prepare(`
      SELECT u.username, COUNT(DISTINCT c.brand) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      GROUP BY u.id
      ORDER BY count DESC
      LIMIT 3
    `).all<{ username: string; count: number }>();

    categories.push({
      id: "brand_explorer",
      name: "Brand Explorer",
      emoji: "🗺️",
      description: "Most unique brands tried",
      champion: explorerLeaders.results?.[0]
        ? { username: explorerLeaders.results[0].username, value: explorerLeaders.results[0].count, label: `${explorerLeaders.results[0].count} brands` }
        : null,
      runnerUp: explorerLeaders.results?.[1]
        ? { username: explorerLeaders.results[1].username, value: explorerLeaders.results[1].count, label: `${explorerLeaders.results[1].count} brands` }
        : null,
      yourRank: null,
      yourValue: null,
    });

    // 8. Photographer Pro 📸 - Most photos uploaded
    const photoLeaders = await db.prepare(`
      SELECT u.username, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.image_url IS NOT NULL AND c.image_url != ''
      GROUP BY u.id
      ORDER BY count DESC
      LIMIT 3
    `).all<{ username: string; count: number }>();

    categories.push({
      id: "photographer",
      name: "Photographer Pro",
      emoji: "📸",
      description: "Most photos shared",
      champion: photoLeaders.results?.[0]
        ? { username: photoLeaders.results[0].username, value: photoLeaders.results[0].count, label: `${photoLeaders.results[0].count} photos` }
        : null,
      runnerUp: photoLeaders.results?.[1]
        ? { username: photoLeaders.results[1].username, value: photoLeaders.results[1].count, label: `${photoLeaders.results[1].count} photos` }
        : null,
      yourRank: null,
      yourValue: null,
    });

    // Count total competitors
    const totalUsers = await db.prepare("SELECT COUNT(*) as count FROM users").first<{ count: number }>();

    // Count user's crowns and runner-ups
    let yourCrowns = 0;
    let yourRunnerUps = 0;
    if (currentUsername) {
      categories.forEach(cat => {
        if (cat.champion?.username === currentUsername) yourCrowns++;
        if (cat.runnerUp?.username === currentUsername) yourRunnerUps++;
      });
    }

    return NextResponse.json({
      categories,
      stats: {
        totalCompetitors: totalUsers?.count || 0,
        yourCrowns,
        yourRunnerUps,
      },
      lastUpdated: Date.now(),
    });

  } catch (error) {
    console.error("Throne room error:", error);
    return NextResponse.json({
      categories: [],
      stats: { totalCompetitors: 0, yourCrowns: 0, yourRunnerUps: 0 },
      lastUpdated: Date.now(),
      error: "Failed to load throne room",
    }, { status: 500 });
  }
}
