import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface SpreadLoveResponse {
  success: boolean;
  lovedCheckin?: {
    id: string;
    username: string;
    brand: string;
    product: string | null;
    rating: number;
    image_url: string | null;
  };
  message: string;
  lovesSpreadToday: number;
  error?: string;
}

// GET: Find a random check-in to love
// POST: Actually love it (like it)
export async function GET(request: NextRequest): Promise<NextResponse<SpreadLoveResponse | { error: string }>> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get current user
    const userRow = await db
      .prepare("SELECT id, username FROM users WHERE session_token = ?")
      .bind(sessionToken)
      .first<{ id: string; username: string }>();

    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Count loves spread today by this user
    const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
    const lovesTodayResult = await db
      .prepare(`
        SELECT COUNT(*) as count FROM likes 
        WHERE user_id = ? AND created_at >= ?
      `)
      .bind(userRow.id, todayStart)
      .first<{ count: number }>();
    
    const lovesSpreadToday = lovesTodayResult?.count || 0;

    // Find a random check-in the user hasn't liked yet (not their own)
    const randomCheckin = await db
      .prepare(`
        SELECT c.id, u.username, c.brand, c.product, c.rating, c.image_url
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE c.user_id != ?
          AND c.id NOT IN (SELECT checkin_id FROM likes WHERE user_id = ?)
        ORDER BY RANDOM()
        LIMIT 1
      `)
      .bind(userRow.id, userRow.id)
      .first<{
        id: string;
        username: string;
        brand: string;
        product: string | null;
        rating: number;
        image_url: string | null;
      }>();

    if (!randomCheckin) {
      return NextResponse.json({
        success: false,
        message: "You've already loved every check-in! 🎉 What a legend!",
        lovesSpreadToday,
      });
    }

    return NextResponse.json({
      success: true,
      lovedCheckin: randomCheckin,
      message: "Found someone to love!",
      lovesSpreadToday,
    });
  } catch (error) {
    console.error("Spread love GET error:", error);
    return NextResponse.json({ error: "Failed to find check-in" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<SpreadLoveResponse | { error: string }>> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get current user
    const userRow = await db
      .prepare("SELECT id, username FROM users WHERE session_token = ?")
      .bind(sessionToken)
      .first<{ id: string; username: string }>();

    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const body = await request.json() as { checkinId?: string };
    const { checkinId } = body;

    if (!checkinId) {
      return NextResponse.json({ error: "Missing checkinId" }, { status: 400 });
    }

    // Verify check-in exists and get details
    const checkin = await db
      .prepare(`
        SELECT c.id, c.user_id, u.username, c.brand, c.product, c.rating, c.image_url
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `)
      .bind(checkinId)
      .first<{
        id: string;
        user_id: string;
        username: string;
        brand: string;
        product: string | null;
        rating: number;
        image_url: string | null;
      }>();

    if (!checkin) {
      return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
    }

    // Can't like your own check-in
    if (checkin.user_id === userRow.id) {
      return NextResponse.json({ error: "Can't love your own check-in" }, { status: 400 });
    }

    // Check if already liked
    const existingLike = await db
      .prepare("SELECT id FROM likes WHERE checkin_id = ? AND user_id = ?")
      .bind(checkinId, userRow.id)
      .first();

    if (existingLike) {
      return NextResponse.json({ error: "Already loved this check-in" }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    const likeId = crypto.randomUUID();

    // Create the like
    await db
      .prepare("INSERT INTO likes (id, checkin_id, user_id, created_at) VALUES (?, ?, ?, ?)")
      .bind(likeId, checkinId, userRow.id, now)
      .run();

    // Create notification for the check-in owner
    const notifId = crypto.randomUUID();
    await db
      .prepare(`
        INSERT INTO notifications (id, user_id, type, from_user_id, from_username, checkin_id, checkin_brand, read, created_at)
        VALUES (?, ?, 'like', ?, ?, ?, ?, 0, ?)
      `)
      .bind(notifId, checkin.user_id, userRow.id, userRow.username, checkinId, checkin.brand, now)
      .run();

    // Count loves spread today
    const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
    const lovesTodayResult = await db
      .prepare(`
        SELECT COUNT(*) as count FROM likes 
        WHERE user_id = ? AND created_at >= ?
      `)
      .bind(userRow.id, todayStart)
      .first<{ count: number }>();
    
    const lovesSpreadToday = lovesTodayResult?.count || 0;

    return NextResponse.json({
      success: true,
      lovedCheckin: {
        id: checkin.id,
        username: checkin.username,
        brand: checkin.brand,
        product: checkin.product,
        rating: checkin.rating,
        image_url: checkin.image_url,
      },
      message: `You spread love to ${checkin.username}! 💕`,
      lovesSpreadToday,
    });
  } catch (error) {
    console.error("Spread love POST error:", error);
    return NextResponse.json({ error: "Failed to spread love" }, { status: 500 });
  }
}
