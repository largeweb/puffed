import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface SocialMVP {
  username: string;
  likesGiven: number;
  commentsGiven: number;
  reactionsGiven: number;
  totalEngagement: number;
  rank: number;
}

interface SocialMVPsResponse {
  mvps: SocialMVP[];
  categories: {
    heartChampion: { username: string; count: number } | null;
    chatChampion: { username: string; count: number } | null;
    hypeChampion: { username: string; count: number } | null;
  };
  platformStats: {
    totalLikes: number;
    totalComments: number;
    totalReactions: number;
    avgEngagementPerUser: number;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<SocialMVPsResponse | { error: string }>> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const url = new URL(request.url);
    const timeframe = url.searchParams.get("timeframe") || "allTime";
    
    // Calculate time filter
    const now = Math.floor(Date.now() / 1000);
    let timeFilter = "";
    if (timeframe === "thisWeek") {
      timeFilter = `AND created_at > ${now - 7 * 86400}`;
    } else if (timeframe === "thisMonth") {
      timeFilter = `AND created_at > ${now - 30 * 86400}`;
    }

    // Get likes given per user
    const likesQuery = await db.prepare(`
      SELECT 
        u.username,
        COUNT(*) as likes_given
      FROM likes l
      JOIN users u ON l.user_id = u.id
      WHERE 1=1 ${timeFilter.replace('created_at', 'l.created_at')}
      GROUP BY u.username
    `).all();

    // Get comments given per user
    const commentsQuery = await db.prepare(`
      SELECT 
        u.username,
        COUNT(*) as comments_given
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE 1=1 ${timeFilter.replace('created_at', 'c.created_at')}
      GROUP BY u.username
    `).all();

    // Get reactions given per user
    const reactionsQuery = await db.prepare(`
      SELECT 
        u.username,
        COUNT(*) as reactions_given
      FROM reactions r
      JOIN users u ON r.user_id = u.id
      WHERE 1=1 ${timeFilter.replace('created_at', 'r.created_at')}
      GROUP BY u.username
    `).all();

    // Build a map of user engagement
    const userEngagement: Record<string, { likesGiven: number; commentsGiven: number; reactionsGiven: number }> = {};

    for (const row of likesQuery.results || []) {
      const r = row as { username: string; likes_given: number };
      if (!userEngagement[r.username]) {
        userEngagement[r.username] = { likesGiven: 0, commentsGiven: 0, reactionsGiven: 0 };
      }
      userEngagement[r.username].likesGiven = r.likes_given;
    }

    for (const row of commentsQuery.results || []) {
      const r = row as { username: string; comments_given: number };
      if (!userEngagement[r.username]) {
        userEngagement[r.username] = { likesGiven: 0, commentsGiven: 0, reactionsGiven: 0 };
      }
      userEngagement[r.username].commentsGiven = r.comments_given;
    }

    for (const row of reactionsQuery.results || []) {
      const r = row as { username: string; reactions_given: number };
      if (!userEngagement[r.username]) {
        userEngagement[r.username] = { likesGiven: 0, commentsGiven: 0, reactionsGiven: 0 };
      }
      userEngagement[r.username].reactionsGiven = r.reactions_given;
    }

    // Calculate totals and sort by overall engagement
    const mvps: SocialMVP[] = Object.entries(userEngagement)
      .map(([username, data]) => ({
        username,
        likesGiven: data.likesGiven,
        commentsGiven: data.commentsGiven,
        reactionsGiven: data.reactionsGiven,
        totalEngagement: data.likesGiven + data.commentsGiven + data.reactionsGiven,
        rank: 0,
      }))
      .filter(u => u.totalEngagement > 0)
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .map((u, i) => ({ ...u, rank: i + 1 }));

    // Find category champions
    const heartChampion = mvps.reduce<{ username: string; count: number } | null>((best, u) => {
      if (!best || u.likesGiven > best.count) {
        return { username: u.username, count: u.likesGiven };
      }
      return best;
    }, null);

    const chatChampion = mvps.reduce<{ username: string; count: number } | null>((best, u) => {
      if (!best || u.commentsGiven > best.count) {
        return { username: u.username, count: u.commentsGiven };
      }
      return best;
    }, null);

    const hypeChampion = mvps.reduce<{ username: string; count: number } | null>((best, u) => {
      if (!best || u.reactionsGiven > best.count) {
        return { username: u.username, count: u.reactionsGiven };
      }
      return best;
    }, null);

    // Platform stats
    const totalLikes = mvps.reduce((sum, u) => sum + u.likesGiven, 0);
    const totalComments = mvps.reduce((sum, u) => sum + u.commentsGiven, 0);
    const totalReactions = mvps.reduce((sum, u) => sum + u.reactionsGiven, 0);
    const avgEngagementPerUser = mvps.length > 0 
      ? Math.round((totalLikes + totalComments + totalReactions) / mvps.length) 
      : 0;

    return NextResponse.json({
      mvps: mvps.slice(0, 20), // Top 20
      categories: {
        heartChampion: heartChampion && heartChampion.count > 0 ? heartChampion : null,
        chatChampion: chatChampion && chatChampion.count > 0 ? chatChampion : null,
        hypeChampion: hypeChampion && hypeChampion.count > 0 ? hypeChampion : null,
      },
      platformStats: {
        totalLikes,
        totalComments,
        totalReactions,
        avgEngagementPerUser,
      },
    });

  } catch (error) {
    console.error("Social MVPs error:", error);
    return NextResponse.json({ error: "Failed to load social MVPs" }, { status: 500 });
  }
}
