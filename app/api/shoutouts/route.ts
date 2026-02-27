import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

interface Shoutout {
  id: number;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  toUsername: string;
  category: string;
  message?: string;
  createdAt: number;
}

interface ShoutoutStats {
  received: number;
  given: number;
  topCategory?: string;
}

const CATEGORIES = [
  { id: "photos", emoji: "📸", label: "Best Photos" },
  { id: "helpful", emoji: "💬", label: "Most Helpful" },
  { id: "taste", emoji: "🎨", label: "Great Taste" },
  { id: "active", emoji: "🔥", label: "Most Active" },
  { id: "vibes", emoji: "✨", label: "Good Vibes" },
  { id: "reviews", emoji: "📝", label: "Best Reviews" },
];

const MAX_WEEKLY_SHOUTOUTS = 3;

function getWeekStart(): number {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

export async function GET(request: Request) {
  try {
    const db = getRequestContext().env.DB;
    const cookieHeader = request.headers.get("cookie") || "";
    const sessionMatch = cookieHeader.match(/session=([^;]+)/);
    if (!sessionMatch) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const sessionToken = sessionMatch[1];
    
    const session = await db.prepare(
      "SELECT user_id FROM sessions WHERE token = ?"
    ).bind(sessionToken).first<{ user_id: string }>();
    
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    
    const userId = session.user_id;
    const weekStart = getWeekStart();
    
    // Get user info
    const user = await db.prepare(
      "SELECT username FROM users WHERE id = ?"
    ).bind(userId).first<{ username: string }>();
    
    // Get shoutouts this user has given this week
    const givenResult = await db.prepare(`
      SELECT s.*, u.username as to_username 
      FROM shoutouts s
      JOIN users u ON s.to_user_id = u.id
      WHERE s.from_user_id = ? AND s.created_at >= ?
      ORDER BY s.created_at DESC
    `).bind(userId, weekStart).all();
    
    const givenThisWeek = givenResult.results || [];
    
    // Get shoutouts this user has received this week
    const receivedResult = await db.prepare(`
      SELECT s.*, u.username as from_username 
      FROM shoutouts s
      JOIN users u ON s.from_user_id = u.id
      WHERE s.to_user_id = ? AND s.created_at >= ?
      ORDER BY s.created_at DESC
    `).bind(userId, weekStart).all();
    
    const receivedThisWeek = receivedResult.results || [];
    
    // Get all shoutouts this week for the feed
    const allResult = await db.prepare(`
      SELECT s.*, 
        fu.username as from_username,
        tu.username as to_username
      FROM shoutouts s
      JOIN users u fu ON s.from_user_id = fu.id
      JOIN users u tu ON s.to_user_id = tu.id
      WHERE s.created_at >= ?
      ORDER BY s.created_at DESC
      LIMIT 50
    `).bind(weekStart).all();
    
    // Fallback query if the join syntax doesn't work
    let allShoutouts: Shoutout[] = [];
    try {
      const feedResult = await db.prepare(`
        SELECT s.id, s.from_user_id, s.to_user_id, s.category, s.message, s.created_at
        FROM shoutouts s
        WHERE s.created_at >= ?
        ORDER BY s.created_at DESC
        LIMIT 50
      `).bind(weekStart).all();
      
      // Get usernames separately
      const shoutoutRows = feedResult.results || [];
      for (const row of shoutoutRows) {
        const r = row as { id: number; from_user_id: string; to_user_id: string; category: string; message?: string; created_at: number };
        const fromUser = await db.prepare("SELECT username FROM users WHERE id = ?").bind(r.from_user_id).first<{ username: string }>();
        const toUser = await db.prepare("SELECT username FROM users WHERE id = ?").bind(r.to_user_id).first<{ username: string }>();
        allShoutouts.push({
          id: r.id,
          fromUserId: r.from_user_id,
          fromUsername: fromUser?.username || "Unknown",
          toUserId: r.to_user_id,
          toUsername: toUser?.username || "Unknown",
          category: r.category,
          message: r.message,
          createdAt: r.created_at,
        });
      }
    } catch {
      allShoutouts = [];
    }
    
    // Get leaderboard - most shoutouts received this week
    const leaderResult = await db.prepare(`
      SELECT to_user_id, COUNT(*) as count
      FROM shoutouts
      WHERE created_at >= ?
      GROUP BY to_user_id
      ORDER BY count DESC
      LIMIT 10
    `).bind(weekStart).all();
    
    const leaderRows = leaderResult.results || [];
    const leaders: { username: string; count: number; categories: string[] }[] = [];
    
    for (const row of leaderRows) {
      const r = row as { to_user_id: string; count: number };
      const u = await db.prepare("SELECT username FROM users WHERE id = ?").bind(r.to_user_id).first<{ username: string }>();
      
      // Get categories they were shouted out for
      const catResult = await db.prepare(`
        SELECT DISTINCT category FROM shoutouts
        WHERE to_user_id = ? AND created_at >= ?
      `).bind(r.to_user_id, weekStart).all();
      
      const cats = (catResult.results || []).map((c: { category?: string }) => c.category || "");
      
      leaders.push({
        username: u?.username || "Unknown",
        count: r.count,
        categories: cats.filter(c => c),
      });
    }
    
    // Get eligible users to shout out (anyone except self)
    const usersResult = await db.prepare(`
      SELECT id, username FROM users WHERE id != ?
      ORDER BY username
    `).bind(userId).all();
    
    const eligibleUsers = (usersResult.results || []).map((u: { id?: string; username?: string }) => ({
      id: u.id || "",
      username: u.username || "",
    }));
    
    return NextResponse.json({
      currentUser: user?.username,
      remainingShoutouts: MAX_WEEKLY_SHOUTOUTS - givenThisWeek.length,
      givenThisWeek: givenThisWeek.map((s: Record<string, unknown>) => ({
        id: s.id,
        toUsername: s.to_username,
        category: s.category,
        message: s.message,
        createdAt: s.created_at,
      })),
      receivedThisWeek: receivedThisWeek.map((s: Record<string, unknown>) => ({
        id: s.id,
        fromUsername: s.from_username,
        category: s.category,
        message: s.message,
        createdAt: s.created_at,
      })),
      feed: allShoutouts,
      leaders,
      eligibleUsers,
      categories: CATEGORIES,
    });
  } catch (error) {
    console.error("Shoutouts GET error:", error);
    return NextResponse.json({ error: "Failed to load shoutouts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getRequestContext().env.DB;
    const cookieHeader = request.headers.get("cookie") || "";
    const sessionMatch = cookieHeader.match(/session=([^;]+)/);
    if (!sessionMatch) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const sessionToken = sessionMatch[1];
    
    const session = await db.prepare(
      "SELECT user_id FROM sessions WHERE token = ?"
    ).bind(sessionToken).first<{ user_id: string }>();
    
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    
    const userId = session.user_id;
    const body = await request.json() as { toUserId: string; category: string; message?: string };
    const { toUserId, category, message } = body;
    
    if (!toUserId || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Validate category
    if (!CATEGORIES.find(c => c.id === category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    
    // Can't shout out yourself
    if (toUserId === userId) {
      return NextResponse.json({ error: "Can't shout out yourself!" }, { status: 400 });
    }
    
    // Check weekly limit
    const weekStart = getWeekStart();
    const countResult = await db.prepare(`
      SELECT COUNT(*) as count FROM shoutouts
      WHERE from_user_id = ? AND created_at >= ?
    `).bind(userId, weekStart).first<{ count: number }>();
    
    if ((countResult?.count || 0) >= MAX_WEEKLY_SHOUTOUTS) {
      return NextResponse.json({ error: "You've used all your shoutouts this week!" }, { status: 400 });
    }
    
    // Check if already shouted out this person this week
    const existingResult = await db.prepare(`
      SELECT id FROM shoutouts
      WHERE from_user_id = ? AND to_user_id = ? AND created_at >= ?
    `).bind(userId, toUserId, weekStart).first();
    
    if (existingResult) {
      return NextResponse.json({ error: "You already shouted out this person this week!" }, { status: 400 });
    }
    
    // Create the shoutout
    const now = Date.now();
    await db.prepare(`
      INSERT INTO shoutouts (from_user_id, to_user_id, category, message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(userId, toUserId, category, message || null, now).run();
    
    // Get the recipient's username for the response
    const toUser = await db.prepare("SELECT username FROM users WHERE id = ?").bind(toUserId).first<{ username: string }>();
    
    return NextResponse.json({
      success: true,
      message: `Shoutout sent to ${toUser?.username}!`,
      remainingShoutouts: MAX_WEEKLY_SHOUTOUTS - (countResult?.count || 0) - 1,
    });
  } catch (error) {
    console.error("Shoutouts POST error:", error);
    return NextResponse.json({ error: "Failed to send shoutout" }, { status: 500 });
  }
}
