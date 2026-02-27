import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse, NextRequest } from "next/server";

export const runtime = "edge";

interface Env {
  DB: D1Database;
}

// Get current EST hour
function getESTHour(): number {
  const now = new Date();
  const estOffset = -5;
  const utcHour = now.getUTCHours();
  let estHour = (utcHour + estOffset + 24) % 24;
  return estHour;
}

function isDeadOfNight(hour: number): boolean {
  return hour >= 2 && hour < 5;
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext() as { env: Env };
    const db = env.DB;

    const cookies = request.headers.get("cookie") || "";
    const sessionMatch = cookies.match(/session=([^;]+)/);
    if (!sessionMatch) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionToken = sessionMatch[1];
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?")
      .bind(sessionToken, Date.now())
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user_id;
    const currentHour = getESTHour();
    const isOpen = isDeadOfNight(currentHour);

    // Get user's diary entries
    const myEntries = await db
      .prepare(`
        SELECT 
          d.id, d.thought, d.mood, d.is_public, d.created_at,
          d.brand, d.product,
          u.username
        FROM dead_of_night_diary d
        JOIN users u ON d.user_id = u.id
        WHERE d.user_id = ?
        ORDER BY d.created_at DESC
        LIMIT 20
      `)
      .bind(userId)
      .all<{
        id: string;
        thought: string;
        mood: string | null;
        is_public: number;
        created_at: number;
        brand: string | null;
        product: string | null;
        username: string;
      }>();

    // Get public entries from others (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const publicEntries = await db
      .prepare(`
        SELECT 
          d.id, d.thought, d.mood, d.created_at,
          d.brand, d.product,
          u.username
        FROM dead_of_night_diary d
        JOIN users u ON d.user_id = u.id
        WHERE d.is_public = 1 AND d.created_at > ?
        ORDER BY d.created_at DESC
        LIMIT 30
      `)
      .bind(sevenDaysAgo)
      .all<{
        id: string;
        thought: string;
        mood: string | null;
        created_at: number;
        brand: string | null;
        product: string | null;
        username: string;
      }>();

    // Stats
    const statsResult = await db
      .prepare(`
        SELECT 
          COUNT(*) as total_entries,
          COUNT(DISTINCT user_id) as unique_writers,
          COUNT(DISTINCT DATE(created_at / 1000, 'unixepoch')) as nights_with_entries
        FROM dead_of_night_diary
      `)
      .first<{ total_entries: number; unique_writers: number; nights_with_entries: number }>();

    const myStatsResult = await db
      .prepare(`
        SELECT 
          COUNT(*) as my_entries,
          COUNT(DISTINCT DATE(created_at / 1000, 'unixepoch')) as my_nights
        FROM dead_of_night_diary
        WHERE user_id = ?
      `)
      .bind(userId)
      .first<{ my_entries: number; my_nights: number }>();

    // Check if user already wrote tonight (between 2-5 AM today)
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const deadStart = todayStart + 2 * 60 * 60 * 1000; // 2 AM
    const deadEnd = todayStart + 5 * 60 * 60 * 1000; // 5 AM
    
    const wroteTonight = await db
      .prepare(`
        SELECT 1 FROM dead_of_night_diary 
        WHERE user_id = ? AND created_at >= ? AND created_at < ?
        LIMIT 1
      `)
      .bind(userId, deadStart, deadEnd)
      .first();

    return NextResponse.json({
      myEntries: (myEntries.results || []).map((e) => ({
        id: e.id,
        thought: e.thought,
        mood: e.mood,
        isPublic: e.is_public === 1,
        createdAt: e.created_at,
        timeAgo: formatTimeAgo(e.created_at),
        brand: e.brand,
        product: e.product,
        username: e.username,
      })),
      publicEntries: (publicEntries.results || []).map((e) => ({
        id: e.id,
        thought: e.thought,
        mood: e.mood,
        createdAt: e.created_at,
        timeAgo: formatTimeAgo(e.created_at),
        brand: e.brand,
        product: e.product,
        username: e.username,
      })),
      stats: {
        totalEntries: statsResult?.total_entries || 0,
        uniqueWriters: statsResult?.unique_writers || 0,
        nightsWithEntries: statsResult?.nights_with_entries || 0,
        myEntries: myStatsResult?.my_entries || 0,
        myNights: myStatsResult?.my_nights || 0,
      },
      isOpen,
      currentHour,
      wroteTonight: !!wroteTonight,
    });
  } catch (error) {
    console.error("Dead of Night error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext() as { env: Env };
    const db = env.DB;

    const cookies = request.headers.get("cookie") || "";
    const sessionMatch = cookies.match(/session=([^;]+)/);
    if (!sessionMatch) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionToken = sessionMatch[1];
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?")
      .bind(sessionToken, Date.now())
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentHour = getESTHour();
    if (!isDeadOfNight(currentHour)) {
      return NextResponse.json(
        { error: "Dead of Night Diary is only open 2-5 AM" },
        { status: 400 }
      );
    }

    const body = await request.json() as {
      thought: string;
      mood?: string;
      isPublic?: boolean;
      brand?: string;
      product?: string;
    };

    const { thought, mood, isPublic, brand, product } = body;

    if (!thought || thought.trim().length === 0) {
      return NextResponse.json({ error: "Thought is required" }, { status: 400 });
    }

    if (thought.length > 1000) {
      return NextResponse.json({ error: "Thought too long (max 1000 chars)" }, { status: 400 });
    }

    const entryId = crypto.randomUUID();
    const now = Date.now();

    await db
      .prepare(`
        INSERT INTO dead_of_night_diary (id, user_id, thought, mood, is_public, brand, product, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        entryId,
        session.user_id,
        thought.trim(),
        mood || null,
        isPublic ? 1 : 0,
        brand || null,
        product || null,
        now
      )
      .run();

    return NextResponse.json({ success: true, id: entryId });
  } catch (error) {
    console.error("Dead of Night POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
