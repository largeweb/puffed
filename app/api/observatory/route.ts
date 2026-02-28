import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

export const runtime = "edge";

interface RecentStar {
  id: number;
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  image_url?: string;
  created_at: number;
  category?: string;
  x: number;
  y: number;
  size: "small" | "medium" | "large";
  twinkle: number;
}

interface Constellation {
  username: string;
  checkins: number;
  lastActive: number;
  brightness: number;
}

interface ObservatoryData {
  currentTime: {
    hour: number;
    dayOfWeek: number;
    phase: string;
    message: string;
  };
  recentStars: RecentStar[];
  constellations: Constellation[];
  cosmicStats: {
    totalSmokesEver: number;
    smokesToday: number;
    activeNow: number;
    brightestStar: string | null;
    cosmicEnergy: number;
  };
  meteors: {
    count: number;
    message: string;
  };
  userStar?: {
    username: string;
    totalSmokes: number;
    constellation: string;
    stardust: number;
  };
}

function getPhase(hour: number): { phase: string; message: string } {
  if (hour >= 5 && hour < 8) return { phase: "dawn", message: "The smoking sun rises..." };
  if (hour >= 8 && hour < 17) return { phase: "day", message: "Clear skies, good smoking." };
  if (hour >= 17 && hour < 20) return { phase: "dusk", message: "Golden hour smoking vibes." };
  if (hour >= 20 && hour < 23) return { phase: "night", message: "Stars are appearing..." };
  if (hour >= 23 || hour < 2) return { phase: "midnight", message: "The cosmos unfolds." };
  return { phase: "late", message: "Deep night observation." };
}

function getConstellation(count: number): string {
  if (count >= 50) return "The Phoenix";
  if (count >= 30) return "Orion the Smoker";
  if (count >= 20) return "The Great Cigar";
  if (count >= 10) return "The Rising Star";
  if (count >= 5) return "The Spark";
  return "Nascent Star";
}

function getStarSize(rating?: number): "small" | "medium" | "large" {
  if (!rating) return "small";
  if (rating >= 4.5) return "large";
  if (rating >= 3.5) return "medium";
  return "small";
}

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const session = await db.prepare(`
      SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?
    `).bind(sessionId, Date.now()).first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = session.user_id;
    const now = Date.now() / 1000;
    const oneDayAgo = now - 86400;
    const oneHourAgo = now - 3600;
    const date = new Date();
    const hour = date.getHours();
    const dayOfWeek = date.getDay();

    // Get recent check-ins as "stars"
    const recentRes = await db.prepare(`
      SELECT c.id, u.username, c.brand, c.product, c.rating, c.image_url, c.created_at, c.category
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at > ?
      ORDER BY c.created_at DESC
      LIMIT 30
    `).bind(oneDayAgo).all();

    const recentStars: RecentStar[] = (recentRes.results || []).map((r: Record<string, unknown>, i: number) => ({
      id: r.id as number,
      username: r.username as string,
      brand: r.brand as string,
      product: r.product as string | undefined,
      rating: r.rating as number | undefined,
      image_url: r.image_url as string | undefined,
      created_at: r.created_at as number,
      category: r.category as string | undefined,
      x: Math.random() * 90 + 5,
      y: Math.random() * 70 + 10,
      size: getStarSize(r.rating as number | undefined),
      twinkle: Math.random() * 3,
    }));

    // Get active "constellations" (users)
    const constellationsRes = await db.prepare(`
      SELECT u.username, COUNT(c.id) as checkins, MAX(c.created_at) as lastActive
      FROM users u
      JOIN checkins c ON u.id = c.user_id
      GROUP BY u.id
      ORDER BY checkins DESC
      LIMIT 10
    `).all();

    const constellations: Constellation[] = (constellationsRes.results || []).map((r: Record<string, unknown>) => ({
      username: r.username as string,
      checkins: r.checkins as number,
      lastActive: r.lastActive as number,
      brightness: Math.min(100, ((r.checkins as number) * 5)),
    }));

    // Cosmic stats
    const totalRes = await db.prepare(`SELECT COUNT(*) as count FROM checkins`).first() as { count: number } | null;
    const todayRes = await db.prepare(`
      SELECT COUNT(*) as count FROM checkins WHERE created_at > ?
    `).bind(oneDayAgo).first() as { count: number } | null;
    const hourRes = await db.prepare(`
      SELECT COUNT(*) as count FROM checkins WHERE created_at > ?
    `).bind(oneHourAgo).first() as { count: number } | null;
    const activeRes = await db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count FROM checkins WHERE created_at > ?
    `).bind(oneHourAgo).first() as { count: number } | null;
    const brightestRes = await db.prepare(`
      SELECT u.username, COUNT(c.id) as cnt
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      GROUP BY u.id
      ORDER BY cnt DESC
      LIMIT 1
    `).first() as { username: string } | null;

    const meteorsCount = hourRes?.count || 0;
    const meteorMessage = meteorsCount === 0 ? "Quiet skies..." :
                         meteorsCount < 3 ? "A few shooting stars..." :
                         meteorsCount < 5 ? "Meteor shower incoming!" :
                         "Cosmic storm! 🌠";

    // User's star info
    const userStarRes = await db.prepare(`
      SELECT COUNT(c.id) as smokes,
             (SELECT COUNT(*) FROM likes WHERE user_id = ?) +
             (SELECT COUNT(*) FROM comments WHERE user_id = ?) +
             (SELECT COUNT(*) FROM reactions WHERE user_id = ?) as engagement
      FROM checkins c
      WHERE c.user_id = ?
    `).bind(userId, userId, userId, userId).first() as { smokes: number; engagement: number } | null;

    const usernameRes = await db.prepare(`SELECT username FROM users WHERE id = ?`).bind(userId).first() as { username: string } | null;

    const { phase, message } = getPhase(hour);
    const totalSmokes = totalRes?.count || 0;
    const smokesToday = todayRes?.count || 0;
    const cosmicEnergy = Math.min(100, smokesToday * 10);

    const data: ObservatoryData = {
      currentTime: {
        hour,
        dayOfWeek,
        phase,
        message,
      },
      recentStars,
      constellations,
      cosmicStats: {
        totalSmokesEver: totalSmokes,
        smokesToday,
        activeNow: activeRes?.count || 0,
        brightestStar: brightestRes?.username || null,
        cosmicEnergy,
      },
      meteors: {
        count: meteorsCount,
        message: meteorMessage,
      },
      userStar: usernameRes ? {
        username: usernameRes.username,
        totalSmokes: userStarRes?.smokes || 0,
        constellation: getConstellation(userStarRes?.smokes || 0),
        stardust: userStarRes?.engagement || 0,
      } : undefined,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Observatory error:", error);
    return NextResponse.json({ error: "Failed to observe the cosmos" }, { status: 500 });
  }
}
