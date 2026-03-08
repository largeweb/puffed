import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

interface WishRow {
  id: number;
  user_id: number;
  wish_text: string;
  stars: number;
  created_at: number;
  username: string;
}

interface StarCheck {
  count: number;
}

interface WishCount {
  count: number;
}

export const runtime = "edge";

export async function GET() {
  try {
    const { env } = getRequestContext();
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = env.DB;

    // Get user from token
    const userResult = await db
      .prepare(
        "SELECT u.* FROM users u JOIN sessions s ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?"
      )
      .bind(token, Math.floor(Date.now() / 1000))
      .first<{ id: number; username: string }>();

    if (!userResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check current hour (EST)
    const now = new Date();
    const estHour = new Date(
      now.toLocaleString("en-US", { timeZone: "America/New_York" })
    ).getHours();
    
    // Magic hours: 1 AM - 4 AM
    const isWishingHour = estHour >= 1 && estHour < 4;

    // Get tonight's wishes (created in last 12 hours)
    const twelveHoursAgo = Math.floor(Date.now() / 1000) - 12 * 60 * 60;
    const wishes = await db
      .prepare(
        `SELECT w.id, w.user_id, w.wish_text, w.stars, w.created_at, u.username
         FROM wishes w
         JOIN users u ON w.user_id = u.id
         WHERE w.created_at > ?
         ORDER BY w.created_at DESC
         LIMIT 50`
      )
      .bind(twelveHoursAgo)
      .all<WishRow>();

    // Get user's starred wishes
    const userStars = await db
      .prepare(
        `SELECT wish_id FROM wish_stars WHERE user_id = ?`
      )
      .bind(userResult.id)
      .all<{ wish_id: number }>();
    
    const starredWishIds = new Set(userStars.results?.map((s) => s.wish_id) || []);

    // Get all-time stats
    const totalWishes = await db
      .prepare(`SELECT COUNT(*) as count FROM wishes`)
      .first<WishCount>();

    const totalStars = await db
      .prepare(`SELECT COALESCE(SUM(stars), 0) as count FROM wishes`)
      .first<WishCount>();

    const yourWishCount = await db
      .prepare(`SELECT COUNT(*) as count FROM wishes WHERE user_id = ?`)
      .bind(userResult.id)
      .first<WishCount>();

    const yourStarsReceived = await db
      .prepare(`SELECT COALESCE(SUM(stars), 0) as count FROM wishes WHERE user_id = ?`)
      .bind(userResult.id)
      .first<WishCount>();

    // Format wishes
    const formattedWishes = (wishes.results || []).map((w) => ({
      id: w.id,
      username: w.username,
      wishText: w.wish_text,
      stars: w.stars,
      createdAt: w.created_at,
      isYours: w.user_id === userResult.id,
      youStarred: starredWishIds.has(w.id),
      timeAgo: getTimeAgo(w.created_at),
    }));

    // Magic messages for different hours
    const magicMessages = [
      "The veil is thin. Your wishes have power.",
      "Stars are listening. Speak your heart.",
      "In the stillness, dreams take form.",
      "Between midnight and dawn, magic stirs.",
      "Write your wish. The universe remembers.",
    ];

    return NextResponse.json({
      wishes: formattedWishes,
      isWishingHour,
      currentHour: estHour,
      stats: {
        totalWishes: totalWishes?.count || 0,
        totalStars: totalStars?.count || 0,
        yourWishes: yourWishCount?.count || 0,
        yourStarsReceived: yourStarsReceived?.count || 0,
      },
      magicMessage: magicMessages[Math.floor(Math.random() * magicMessages.length)],
      username: userResult.username,
    });
  } catch (error) {
    console.error("Wishes GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { env } = getRequestContext();
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = env.DB;

    const userResult = await db
      .prepare(
        "SELECT u.* FROM users u JOIN sessions s ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?"
      )
      .bind(token, Math.floor(Date.now() / 1000))
      .first<{ id: number; username: string }>();

    if (!userResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { wishText?: string; action?: string; wishId?: number };
    const { wishText, action, wishId } = body;

    // Check hour
    const now = new Date();
    const estHour = new Date(
      now.toLocaleString("en-US", { timeZone: "America/New_York" })
    ).getHours();
    const isWishingHour = estHour >= 1 && estHour < 4;

    if (action === "star") {
      // Star a wish
      if (!wishId) {
        return NextResponse.json({ error: "Missing wishId" }, { status: 400 });
      }

      // Check if already starred
      const existing = await db
        .prepare(
          `SELECT COUNT(*) as count FROM wish_stars WHERE wish_id = ? AND user_id = ?`
        )
        .bind(wishId, userResult.id)
        .first<StarCheck>();

      if (existing && existing.count > 0) {
        // Unstar
        await db
          .prepare(`DELETE FROM wish_stars WHERE wish_id = ? AND user_id = ?`)
          .bind(wishId, userResult.id)
          .run();
        await db
          .prepare(`UPDATE wishes SET stars = stars - 1 WHERE id = ?`)
          .bind(wishId)
          .run();
        return NextResponse.json({ success: true, action: "unstarred" });
      } else {
        // Star
        await db
          .prepare(
            `INSERT INTO wish_stars (wish_id, user_id, created_at) VALUES (?, ?, ?)`
          )
          .bind(wishId, userResult.id, Math.floor(Date.now() / 1000))
          .run();
        await db
          .prepare(`UPDATE wishes SET stars = stars + 1 WHERE id = ?`)
          .bind(wishId)
          .run();
        return NextResponse.json({ success: true, action: "starred" });
      }
    }

    // Create new wish
    if (!isWishingHour) {
      return NextResponse.json(
        { error: "Wishes can only be made between 1-4 AM" },
        { status: 400 }
      );
    }

    if (!wishText || wishText.trim().length < 3) {
      return NextResponse.json(
        { error: "Wish too short" },
        { status: 400 }
      );
    }

    if (wishText.length > 280) {
      return NextResponse.json(
        { error: "Wish too long (max 280 chars)" },
        { status: 400 }
      );
    }

    await db
      .prepare(
        `INSERT INTO wishes (user_id, wish_text, stars, created_at) VALUES (?, ?, 0, ?)`
      )
      .bind(userResult.id, wishText.trim(), Math.floor(Date.now() / 1000))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Wishes POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
