import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

export const runtime = "edge";

// Confessional hours: 11 PM - 5 AM EST
function isConfessionalTime(): { isOpen: boolean; hour: number } {
  const now = new Date();
  const utcHour = now.getUTCHours();
  // EST/EDT approximation (UTC-5)
  const estHour = (utcHour - 5 + 24) % 24;
  // Open hours: 11 PM (23) to 5 AM
  const isOpen = estHour >= 23 || estHour < 5;
  return { isOpen, hour: estHour };
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return "yesterday";
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
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const { isOpen, hour } = isConfessionalTime();

    // Get recent confessions (last 24h)
    const confessions = await db.prepare(`
      SELECT 
        c.id,
        c.confession,
        c.mood,
        c.created_at,
        c.hour_posted,
        (SELECT COUNT(*) FROM confession_reactions WHERE confession_id = c.id) as reaction_count,
        (SELECT COUNT(*) FROM confession_reactions WHERE confession_id = c.id AND user_id = ?) as user_reacted
      FROM confessions c
      WHERE c.created_at > ?
      ORDER BY c.created_at DESC
      LIMIT 50
    `).bind(userId, oneDayAgo).all();

    // Get user's confession today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const userConfessionToday = await db.prepare(`
      SELECT id FROM confessions 
      WHERE user_id = ? AND created_at > ?
      LIMIT 1
    `).bind(userId, todayStart.getTime()).first();

    // Get total confessions and unique confessors
    const stats = await db.prepare(`
      SELECT 
        COUNT(*) as total_confessions,
        COUNT(DISTINCT user_id) as unique_confessors
      FROM confessions
    `).first() as { total_confessions: number; unique_confessors: number } | null;

    // Get mood breakdown
    const moodBreakdown = await db.prepare(`
      SELECT mood, COUNT(*) as count
      FROM confessions
      WHERE mood IS NOT NULL
      GROUP BY mood
      ORDER BY count DESC
    `).all();

    return NextResponse.json({
      confessions: (confessions.results || []).map((c: Record<string, unknown>) => ({
        id: c.id,
        confession: c.confession,
        mood: c.mood,
        createdAt: c.created_at,
        hourPosted: c.hour_posted,
        reactionCount: c.reaction_count,
        userReacted: (c.user_reacted as number) > 0,
        timeAgo: formatTimeAgo(c.created_at as number),
      })),
      stats: {
        totalConfessions: stats?.total_confessions || 0,
        uniqueConfessors: stats?.unique_confessors || 0,
        moodBreakdown: moodBreakdown.results || [],
      },
      hasConfessedToday: !!userConfessionToday,
      isConfessionalTime: isOpen,
      currentHour: hour,
    });
  } catch (error) {
    console.error("Confessional GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const { isOpen } = isConfessionalTime();

    if (!isOpen) {
      return NextResponse.json({ 
        error: "Confessional only open 11 PM - 5 AM" 
      }, { status: 400 });
    }

    const body = await request.json() as { confession?: string; mood?: string };
    const { confession, mood } = body;

    if (!confession || confession.trim().length === 0) {
      return NextResponse.json({ error: "Confession required" }, { status: 400 });
    }

    if (confession.length > 500) {
      return NextResponse.json({ error: "Confession too long (max 500 chars)" }, { status: 400 });
    }

    const validMoods = ["contemplative", "grateful", "restless", "peaceful", "melancholy", "hopeful"];
    if (mood && !validMoods.includes(mood)) {
      return NextResponse.json({ error: "Invalid mood" }, { status: 400 });
    }

    const now = Date.now();
    const currentHour = new Date().getHours();

    // Check if user already confessed today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const existing = await db.prepare(`
      SELECT id FROM confessions 
      WHERE user_id = ? AND created_at > ?
    `).bind(userId, todayStart.getTime()).first();

    if (existing) {
      return NextResponse.json({ 
        error: "One confession per night - make it count" 
      }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO confessions (id, user_id, confession, mood, hour_posted, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, userId, confession.trim(), mood || null, currentHour, now).run();

    return NextResponse.json({ 
      success: true, 
      id,
      message: "Your confession is safe with the night" 
    });
  } catch (error) {
    console.error("Confessional POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
