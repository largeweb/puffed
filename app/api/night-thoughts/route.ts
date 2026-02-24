import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

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

function isNightTime(): { isNight: boolean; hour: number } {
  const now = new Date();
  const utcHour = now.getUTCHours();
  // EST/EDT approximation (UTC-5)
  const estHour = (utcHour - 5 + 24) % 24;
  // Night hours: 10 PM (22) to 4 AM
  const isNight = estHour >= 22 || estHour <= 4;
  return { isNight, hour: estHour };
}

// GET - Fetch thoughts from last 12 hours (only during night time)
export async function GET(): Promise<Response> {
  try {
    const { isNight, hour } = isNightTime();
    
    if (!isNight) {
      return Response.json({
        message: "Night Thoughts only available 10 PM - 4 AM EST",
        loungeOpen: false,
        currentHour: hour,
        thoughts: [],
      });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get thoughts from last 12 hours
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
      LIMIT 50
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

    return Response.json({
      loungeOpen: true,
      currentHour: hour,
      thoughts,
    });
  } catch (error) {
    console.error("Night thoughts GET error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

// POST - Create a new thought (only during night time, requires auth)
export async function POST(request: Request): Promise<Response> {
  try {
    const { isNight } = isNightTime();
    
    if (!isNight) {
      return Response.json(
        { error: "Night Thoughts only available 10 PM - 4 AM EST" },
        { status: 403 }
      );
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
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json() as { thought?: string };
    const thought = body.thought?.trim();

    if (!thought) {
      return Response.json({ error: "Thought is required" }, { status: 400 });
    }

    if (thought.length > 280) {
      return Response.json({ error: "Thought too long (max 280 chars)" }, { status: 400 });
    }

    // Rate limit: max 5 thoughts per hour per user
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
    const recentCount = await db.prepare(`
      SELECT COUNT(*) as count FROM night_thoughts
      WHERE user_id = ? AND created_at >= ?
    `).bind(session.user_id, oneHourAgo).first<{ count: number }>();

    if ((recentCount?.count || 0) >= 5) {
      return Response.json(
        { error: "Slow down! Max 5 thoughts per hour" },
        { status: 429 }
      );
    }

    // Create thought
    const thoughtId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.prepare(`
      INSERT INTO night_thoughts (id, user_id, thought, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(thoughtId, session.user_id, thought, now).run();

    // Get username for response
    const user = await db
      .prepare("SELECT username FROM users WHERE id = ?")
      .bind(session.user_id)
      .first<{ username: string }>();

    return Response.json({
      success: true,
      thought: {
        id: thoughtId,
        username: user?.username || "unknown",
        thought,
        createdAt: now,
        timeAgo: "just now",
      },
    });
  } catch (error) {
    console.error("Night thoughts POST error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
