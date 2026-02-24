import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";

export const runtime = "edge";

interface NightThought {
  id: string;
  username: string;
  thought: string;
  createdAt: number;
  timeAgo: string;
}

function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function isNightHours(): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  // Approximate EST/EDT (UTC-5 or UTC-4)
  const estHour = (utcHour - 5 + 24) % 24;
  // Night hours: 10 PM (22) to 4 AM
  return estHour >= 22 || estHour <= 4;
}

// GET - Fetch recent night thoughts
export async function GET(): Promise<Response> {
  try {
    if (!isNightHours()) {
      return Response.json({
        thoughts: [],
        message: "Night thoughts are only visible during lounge hours (10 PM - 4 AM)",
      });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get thoughts from the last 12 hours
    const twelveHoursAgo = Math.floor(Date.now() / 1000) - (12 * 60 * 60);

    const result = await db.prepare(`
      SELECT 
        nt.id,
        u.username,
        nt.thought,
        nt.created_at
      FROM night_thoughts nt
      JOIN users u ON nt.user_id = u.id
      WHERE nt.created_at >= ?
      ORDER BY nt.created_at DESC
      LIMIT 20
    `).bind(twelveHoursAgo).all<{
      id: string;
      username: string;
      thought: string;
      created_at: number;
    }>();

    const thoughts: NightThought[] = (result.results || []).map(row => ({
      id: row.id,
      username: row.username,
      thought: row.thought,
      createdAt: row.created_at,
      timeAgo: formatTimeAgo(row.created_at),
    }));

    return Response.json({ thoughts });
  } catch (error) {
    console.error("Error fetching night thoughts:", error);
    return Response.json({ thoughts: [], error: "Failed to load thoughts" }, { status: 500 });
  }
}

// POST - Submit a night thought
export async function POST(request: Request): Promise<Response> {
  try {
    if (!isNightHours()) {
      return Response.json({
        error: "Night thoughts can only be shared during lounge hours (10 PM - 4 AM)",
      }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
      .bind(sessionId, Math.floor(Date.now() / 1000))
      .first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json() as { thought?: string };
    const thought = (body.thought || "").trim();

    if (!thought) {
      return Response.json({ error: "Thought cannot be empty" }, { status: 400 });
    }

    if (thought.length > 140) {
      return Response.json({ error: "Thought must be 140 characters or less" }, { status: 400 });
    }

    // Check if user already posted a thought in the last 30 minutes
    const thirtyMinsAgo = Math.floor(Date.now() / 1000) - (30 * 60);
    const recentThought = await db.prepare(`
      SELECT id FROM night_thoughts
      WHERE user_id = ? AND created_at >= ?
      LIMIT 1
    `).bind(session.user_id, thirtyMinsAgo).first();

    if (recentThought) {
      return Response.json({ 
        error: "You can share a new thought every 30 minutes" 
      }, { status: 429 });
    }

    // Insert the thought
    const thoughtId = nanoid();
    await db.prepare(`
      INSERT INTO night_thoughts (id, user_id, thought, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(thoughtId, session.user_id, thought, Math.floor(Date.now() / 1000)).run();

    // Get username for response
    const user = await db.prepare("SELECT username FROM users WHERE id = ?")
      .bind(session.user_id)
      .first<{ username: string }>();

    return Response.json({
      success: true,
      thought: {
        id: thoughtId,
        username: user?.username || "unknown",
        thought,
        createdAt: Math.floor(Date.now() / 1000),
        timeAgo: "just now",
      },
    });
  } catch (error) {
    console.error("Error posting night thought:", error);
    return Response.json({ error: "Failed to share thought" }, { status: 500 });
  }
}
