import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

interface Activity {
  type: 'checkin' | 'like' | 'reaction' | 'follow' | 'comment';
  username: string;
  user_id: string;
  details: string;
  created_at: number;
  target_user?: string;
  brand?: string;
  checkin_id?: string;
  emoji?: string;
}

export const runtime = "edge";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);

  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Fetch recent check-ins
    const checkins = await db
      .prepare(`
        SELECT c.id, c.brand, c.product, c.created_at, c.user_id, u.username
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        ORDER BY c.created_at DESC
        LIMIT ?
      `)
      .bind(limit)
      .all();

    // Fetch recent likes
    const likes = await db
      .prepare(`
        SELECT l.created_at, l.user_id, u.username, c.brand, c.id as checkin_id, cu.username as target_user
        FROM likes l
        JOIN users u ON l.user_id = u.id
        JOIN checkins c ON l.checkin_id = c.id
        JOIN users cu ON c.user_id = cu.id
        ORDER BY l.created_at DESC
        LIMIT ?
      `)
      .bind(limit)
      .all();

    // Fetch recent reactions
    const reactions = await db
      .prepare(`
        SELECT r.created_at, r.user_id, r.emoji, u.username, c.brand, c.id as checkin_id, cu.username as target_user
        FROM reactions r
        JOIN users u ON r.user_id = u.id
        JOIN checkins c ON r.checkin_id = c.id
        JOIN users cu ON c.user_id = cu.id
        ORDER BY r.created_at DESC
        LIMIT ?
      `)
      .bind(limit)
      .all();

    // Fetch recent follows
    const follows = await db
      .prepare(`
        SELECT f.created_at, f.follower_id, u1.username, u2.username as target_user
        FROM follows f
        JOIN users u1 ON f.follower_id = u1.id
        JOIN users u2 ON f.following_id = u2.id
        ORDER BY f.created_at DESC
        LIMIT ?
      `)
      .bind(limit)
      .all();

    // Fetch recent comments
    const comments = await db
      .prepare(`
        SELECT cm.created_at, cm.user_id, cm.content, u.username, c.brand, c.id as checkin_id, cu.username as target_user
        FROM comments cm
        JOIN users u ON cm.user_id = u.id
        JOIN checkins c ON cm.checkin_id = c.id
        JOIN users cu ON c.user_id = cu.id
        ORDER BY cm.created_at DESC
        LIMIT ?
      `)
      .bind(limit)
      .all();

    // Combine and format activities
    const activities: Activity[] = [];

    for (const row of checkins.results || []) {
      activities.push({
        type: 'checkin',
        username: row.username as string,
        user_id: row.user_id as string,
        brand: row.brand as string,
        checkin_id: row.id as string,
        details: `logged ${row.brand}${row.product ? ` ${row.product}` : ''}`,
        created_at: row.created_at as number,
      });
    }

    for (const row of likes.results || []) {
      activities.push({
        type: 'like',
        username: row.username as string,
        user_id: row.user_id as string,
        target_user: row.target_user as string,
        brand: row.brand as string,
        checkin_id: row.checkin_id as string,
        details: `liked @${row.target_user}'s ${row.brand} check-in`,
        created_at: row.created_at as number,
      });
    }

    for (const row of reactions.results || []) {
      activities.push({
        type: 'reaction',
        username: row.username as string,
        user_id: row.user_id as string,
        target_user: row.target_user as string,
        brand: row.brand as string,
        checkin_id: row.checkin_id as string,
        emoji: row.emoji as string,
        details: `reacted ${row.emoji} to @${row.target_user}'s ${row.brand}`,
        created_at: row.created_at as number,
      });
    }

    for (const row of follows.results || []) {
      activities.push({
        type: 'follow',
        username: row.username as string,
        user_id: row.follower_id as string,
        target_user: row.target_user as string,
        details: `followed @${row.target_user}`,
        created_at: row.created_at as number,
      });
    }

    for (const row of comments.results || []) {
      activities.push({
        type: 'comment',
        username: row.username as string,
        user_id: row.user_id as string,
        target_user: row.target_user as string,
        brand: row.brand as string,
        checkin_id: row.checkin_id as string,
        details: `commented on @${row.target_user}'s ${row.brand}`,
        created_at: row.created_at as number,
      });
    }

    // Sort by created_at descending and limit
    activities.sort((a, b) => b.created_at - a.created_at);
    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json({
      activities: limitedActivities,
      count: limitedActivities.length,
    });
  } catch (error) {
    console.error("Activity error:", error);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
