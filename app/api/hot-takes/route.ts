import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface HotTake {
  id: string;
  user_id: string;
  username: string;
  take: string;
  upvotes: number;
  downvotes: number;
  created_at: number;
  user_vote?: number; // 1 = upvote, -1 = downvote, 0 = none
}

// Ensure tables exist
async function ensureTables(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS hot_takes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      take TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS hot_take_votes (
      id TEXT PRIMARY KEY,
      take_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      vote INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(take_id, user_id)
    )
  `).run();
}

// GET /api/hot-takes - Get this week's hot takes
export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = env.DB;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;

  await ensureTables(db);

  // Get current user if logged in
  let currentUserId: string | null = null;
  if (sessionId) {
    const session = await db.prepare(
      "SELECT user_id FROM sessions WHERE id = ?"
    ).bind(sessionId).first<{ user_id: string }>();
    currentUserId = session?.user_id || null;
  }

  // Get this week's start (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const weekStart = Math.floor(monday.getTime() / 1000);

  try {
    // Get all hot takes this week with vote counts
    const takes = await db.prepare(`
      SELECT 
        ht.id,
        ht.user_id,
        u.username,
        ht.take,
        ht.created_at,
        COALESCE(SUM(CASE WHEN htv.vote = 1 THEN 1 ELSE 0 END), 0) as upvotes,
        COALESCE(SUM(CASE WHEN htv.vote = -1 THEN 1 ELSE 0 END), 0) as downvotes
      FROM hot_takes ht
      LEFT JOIN users u ON ht.user_id = u.id
      LEFT JOIN hot_take_votes htv ON ht.id = htv.take_id
      WHERE ht.created_at >= ?
      GROUP BY ht.id
      ORDER BY (COALESCE(SUM(CASE WHEN htv.vote = 1 THEN 1 ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN htv.vote = -1 THEN 1 ELSE 0 END), 0)) DESC, ht.created_at DESC
    `).bind(weekStart).all();

    const results = takes.results || [];

    // If user is logged in, get their votes
    let userVotes: Record<string, number> = {};
    if (currentUserId && results.length > 0) {
      const takeIds = results.map(t => (t as HotTake).id);
      const votes = await db.prepare(`
        SELECT take_id, vote FROM hot_take_votes 
        WHERE user_id = ? AND take_id IN (${takeIds.map(() => '?').join(',')})
      `).bind(currentUserId, ...takeIds).all<{ take_id: string; vote: number }>();
      
      for (const v of (votes.results || [])) {
        userVotes[v.take_id] = v.vote;
      }
    }

    // Add user's vote to each take
    const takesWithVotes = results.map(t => ({
      ...t,
      user_vote: userVotes[(t as HotTake).id] || 0
    }));

    // Stats
    const totalTakes = results.length;
    const totalVotes = await db.prepare(`
      SELECT COUNT(*) as count FROM hot_take_votes 
      WHERE take_id IN (SELECT id FROM hot_takes WHERE created_at >= ?)
    `).bind(weekStart).first<{ count: number }>();

    // Check if user already posted this week
    let userPostedThisWeek = false;
    if (currentUserId) {
      const userTake = await db.prepare(`
        SELECT id FROM hot_takes WHERE user_id = ? AND created_at >= ?
      `).bind(currentUserId, weekStart).first();
      userPostedThisWeek = !!userTake;
    }

    return NextResponse.json({
      takes: takesWithVotes,
      stats: {
        totalTakes,
        totalVotes: totalVotes?.count || 0,
        weekStart,
      },
      userPostedThisWeek,
      isThursday: now.getDay() === 4,
    });
  } catch (error) {
    console.error("Hot takes fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch hot takes" }, { status: 500 });
  }
}

// POST /api/hot-takes - Submit a hot take
export async function POST(request: NextRequest) {
  const { env } = getRequestContext();
  const db = env.DB;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = await db.prepare(
    "SELECT user_id FROM sessions WHERE id = ?"
  ).bind(sessionId).first<{ user_id: string }>();

  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  await ensureTables(db);

  try {
    const body = await request.json() as { take?: string };
    const take = body.take?.trim();

    if (!take || take.length < 10) {
      return NextResponse.json({ error: "Hot take must be at least 10 characters" }, { status: 400 });
    }

    if (take.length > 280) {
      return NextResponse.json({ error: "Hot take must be 280 characters or less" }, { status: 400 });
    }

    // Check if user already posted this week
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const weekStart = Math.floor(monday.getTime() / 1000);

    const existing = await db.prepare(`
      SELECT id FROM hot_takes WHERE user_id = ? AND created_at >= ?
    `).bind(session.user_id, weekStart).first();

    if (existing) {
      return NextResponse.json({ error: "You've already shared a hot take this week!" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const createdAt = Math.floor(Date.now() / 1000);

    await db.prepare(`
      INSERT INTO hot_takes (id, user_id, take, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(id, session.user_id, take, createdAt).run();

    return NextResponse.json({ 
      success: true, 
      id,
      message: "🔥 Hot take submitted!"
    });
  } catch (error) {
    console.error("Hot take submit error:", error);
    return NextResponse.json({ error: "Failed to submit hot take" }, { status: 500 });
  }
}
