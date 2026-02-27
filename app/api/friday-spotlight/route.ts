import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface SpotlightWinner {
  userId: string;
  username: string;
  value: number;
  detail?: string;
}

interface SpotlightAward {
  id: string;
  title: string;
  emoji: string;
  description: string;
  winner: SpotlightWinner | null;
  runnerUp?: SpotlightWinner | null;
}

interface WeekStats {
  totalCheckins: number;
  totalLikes: number;
  totalComments: number;
  activeUsers: number;
  newBrands: number;
}

// Get the start of the current week (Monday 00:00)
function getWeekStart(): number {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // Adjust for Monday start
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return Math.floor(monday.getTime() / 1000);
}

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    const { env } = getRequestContext();
    const db = env.DB;

    // Get current user if authenticated
    let currentUserId: string | null = null;
    if (sessionId) {
      const now = Math.floor(Date.now() / 1000);
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
        .bind(sessionId, now)
        .first<{ user_id: string }>();
      if (session) {
        currentUserId = session.user_id;
      }
    }

    const weekStart = getWeekStart();
    const awards: SpotlightAward[] = [];

    // 🔥 Most Active Smoker - Most check-ins this week
    const mostActive = await db.prepare(`
      SELECT u.id as user_id, u.username, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      GROUP BY u.id
      ORDER BY count DESC
      LIMIT 2
    `).bind(weekStart).all<{ user_id: string; username: string; count: number }>();

    awards.push({
      id: "most-active",
      title: "Most Active Smoker",
      emoji: "🔥",
      description: "Most check-ins this week",
      winner: mostActive.results?.[0] ? {
        userId: mostActive.results[0].user_id,
        username: mostActive.results[0].username,
        value: mostActive.results[0].count,
        detail: `${mostActive.results[0].count} smokes`
      } : null,
      runnerUp: mostActive.results?.[1] ? {
        userId: mostActive.results[1].user_id,
        username: mostActive.results[1].username,
        value: mostActive.results[1].count,
        detail: `${mostActive.results[1].count} smokes`
      } : null
    });

    // ⭐ Quality King - Highest average rating (min 2 check-ins)
    const qualityKing = await db.prepare(`
      SELECT u.id as user_id, u.username, AVG(c.rating) as avg_rating, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.rating IS NOT NULL
      GROUP BY u.id
      HAVING count >= 2
      ORDER BY avg_rating DESC, count DESC
      LIMIT 2
    `).bind(weekStart).all<{ user_id: string; username: string; avg_rating: number; count: number }>();

    awards.push({
      id: "quality-king",
      title: "Quality King",
      emoji: "⭐",
      description: "Highest average rating",
      winner: qualityKing.results?.[0] ? {
        userId: qualityKing.results[0].user_id,
        username: qualityKing.results[0].username,
        value: qualityKing.results[0].avg_rating,
        detail: `${qualityKing.results[0].avg_rating.toFixed(1)}★ avg`
      } : null,
      runnerUp: qualityKing.results?.[1] ? {
        userId: qualityKing.results[1].user_id,
        username: qualityKing.results[1].username,
        value: qualityKing.results[1].avg_rating,
        detail: `${qualityKing.results[1].avg_rating.toFixed(1)}★ avg`
      } : null
    });

    // 💕 Social Butterfly - Most likes given
    const socialButterfly = await db.prepare(`
      SELECT u.id as user_id, u.username, COUNT(*) as count
      FROM likes l
      JOIN users u ON l.user_id = u.id
      WHERE l.created_at >= ?
      GROUP BY u.id
      ORDER BY count DESC
      LIMIT 2
    `).bind(weekStart).all<{ user_id: string; username: string; count: number }>();

    awards.push({
      id: "social-butterfly",
      title: "Social Butterfly",
      emoji: "💕",
      description: "Spread the most love",
      winner: socialButterfly.results?.[0] ? {
        userId: socialButterfly.results[0].user_id,
        username: socialButterfly.results[0].username,
        value: socialButterfly.results[0].count,
        detail: `${socialButterfly.results[0].count} likes given`
      } : null,
      runnerUp: socialButterfly.results?.[1] ? {
        userId: socialButterfly.results[1].user_id,
        username: socialButterfly.results[1].username,
        value: socialButterfly.results[1].count,
        detail: `${socialButterfly.results[1].count} likes given`
      } : null
    });

    // 🧭 Brand Explorer - Tried the most unique brands
    const brandExplorer = await db.prepare(`
      SELECT u.id as user_id, u.username, COUNT(DISTINCT c.brand) as unique_brands
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      GROUP BY u.id
      ORDER BY unique_brands DESC
      LIMIT 2
    `).bind(weekStart).all<{ user_id: string; username: string; unique_brands: number }>();

    awards.push({
      id: "brand-explorer",
      title: "Brand Explorer",
      emoji: "🧭",
      description: "Most brands tried",
      winner: brandExplorer.results?.[0] ? {
        userId: brandExplorer.results[0].user_id,
        username: brandExplorer.results[0].username,
        value: brandExplorer.results[0].unique_brands,
        detail: `${brandExplorer.results[0].unique_brands} brands`
      } : null,
      runnerUp: brandExplorer.results?.[1] ? {
        userId: brandExplorer.results[1].user_id,
        username: brandExplorer.results[1].username,
        value: brandExplorer.results[1].unique_brands,
        detail: `${brandExplorer.results[1].unique_brands} brands`
      } : null
    });

    // 💬 Commentator - Most comments left
    const commentator = await db.prepare(`
      SELECT u.id as user_id, u.username, COUNT(*) as count
      FROM comments co
      JOIN users u ON co.user_id = u.id
      WHERE co.created_at >= ?
      GROUP BY u.id
      ORDER BY count DESC
      LIMIT 2
    `).bind(weekStart).all<{ user_id: string; username: string; count: number }>();

    awards.push({
      id: "commentator",
      title: "Top Commentator",
      emoji: "💬",
      description: "Most engaged in conversations",
      winner: commentator.results?.[0] ? {
        userId: commentator.results[0].user_id,
        username: commentator.results[0].username,
        value: commentator.results[0].count,
        detail: `${commentator.results[0].count} comments`
      } : null,
      runnerUp: commentator.results?.[1] ? {
        userId: commentator.results[1].user_id,
        username: commentator.results[1].username,
        value: commentator.results[1].count,
        detail: `${commentator.results[1].count} comments`
      } : null
    });

    // 📸 Photo Master - Most photos shared
    const photoMaster = await db.prepare(`
      SELECT u.id as user_id, u.username, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.image_url IS NOT NULL
      GROUP BY u.id
      ORDER BY count DESC
      LIMIT 2
    `).bind(weekStart).all<{ user_id: string; username: string; count: number }>();

    awards.push({
      id: "photo-master",
      title: "Photo Master",
      emoji: "📸",
      description: "Best documented their sessions",
      winner: photoMaster.results?.[0] ? {
        userId: photoMaster.results[0].user_id,
        username: photoMaster.results[0].username,
        value: photoMaster.results[0].count,
        detail: `${photoMaster.results[0].count} photos`
      } : null,
      runnerUp: photoMaster.results?.[1] ? {
        userId: photoMaster.results[1].user_id,
        username: photoMaster.results[1].username,
        value: photoMaster.results[1].count,
        detail: `${photoMaster.results[1].count} photos`
      } : null
    });

    // 🌟 Fan Favorite - Most likes received
    const fanFavorite = await db.prepare(`
      SELECT u.id as user_id, u.username, COUNT(*) as count
      FROM likes l
      JOIN checkins c ON l.checkin_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE l.created_at >= ?
      GROUP BY u.id
      ORDER BY count DESC
      LIMIT 2
    `).bind(weekStart).all<{ user_id: string; username: string; count: number }>();

    awards.push({
      id: "fan-favorite",
      title: "Fan Favorite",
      emoji: "🌟",
      description: "Most loved by the community",
      winner: fanFavorite.results?.[0] ? {
        userId: fanFavorite.results[0].user_id,
        username: fanFavorite.results[0].username,
        value: fanFavorite.results[0].count,
        detail: `${fanFavorite.results[0].count} likes received`
      } : null,
      runnerUp: fanFavorite.results?.[1] ? {
        userId: fanFavorite.results[1].user_id,
        username: fanFavorite.results[1].username,
        value: fanFavorite.results[1].count,
        detail: `${fanFavorite.results[1].count} likes received`
      } : null
    });

    // 🌅 Early Bird - Most early morning smokes (before 8 AM)
    const earlyBird = await db.prepare(`
      SELECT u.id as user_id, u.username, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? 
        AND ((c.created_at % 86400) / 3600) < 13
      GROUP BY u.id
      ORDER BY count DESC
      LIMIT 2
    `).bind(weekStart).all<{ user_id: string; username: string; count: number }>();

    awards.push({
      id: "early-bird",
      title: "Early Bird",
      emoji: "🌅",
      description: "Most morning smokes",
      winner: earlyBird.results?.[0] ? {
        userId: earlyBird.results[0].user_id,
        username: earlyBird.results[0].username,
        value: earlyBird.results[0].count,
        detail: `${earlyBird.results[0].count} AM sessions`
      } : null,
      runnerUp: earlyBird.results?.[1] ? {
        userId: earlyBird.results[1].user_id,
        username: earlyBird.results[1].username,
        value: earlyBird.results[1].count,
        detail: `${earlyBird.results[1].count} AM sessions`
      } : null
    });

    // Week stats
    const statsResult = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM checkins WHERE created_at >= ?) as total_checkins,
        (SELECT COUNT(*) FROM likes WHERE created_at >= ?) as total_likes,
        (SELECT COUNT(*) FROM comments WHERE created_at >= ?) as total_comments,
        (SELECT COUNT(DISTINCT user_id) FROM checkins WHERE created_at >= ?) as active_users,
        (SELECT COUNT(DISTINCT brand) FROM checkins WHERE created_at >= ?) as unique_brands
    `).bind(weekStart, weekStart, weekStart, weekStart, weekStart)
      .first<{ total_checkins: number; total_likes: number; total_comments: number; active_users: number; unique_brands: number }>();

    const weekStats: WeekStats = {
      totalCheckins: statsResult?.total_checkins || 0,
      totalLikes: statsResult?.total_likes || 0,
      totalComments: statsResult?.total_comments || 0,
      activeUsers: statsResult?.active_users || 0,
      newBrands: statsResult?.unique_brands || 0
    };

    // Check user's awards
    const userAwards = currentUserId
      ? awards.filter(a => a.winner?.userId === currentUserId).map(a => a.id)
      : [];

    // Is it Friday?
    const now = new Date();
    const isFriday = now.getDay() === 5;
    const dayOfWeek = now.getDay();

    return NextResponse.json({
      awards,
      weekStats,
      userAwards,
      isFriday,
      dayOfWeek,
      weekStart,
      generatedAt: Date.now()
    });
  } catch (error) {
    console.error("Friday spotlight error:", error);
    return NextResponse.json({ error: "Failed to load spotlight" }, { status: 500 });
  }
}
