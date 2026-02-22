import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/admin/nudge-engagement - Send engagement nudge notifications
// Targets users who have check-ins but haven't engaged (liked/reacted/followed/commented)
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { env } = getRequestContext();
  const db = env.DB;

  // Simple admin auth via query param
  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get("key");
  if (adminKey !== "puffed-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const todayStart = now - (now % 86400);

    // Find users who:
    // 1. Have at least 1 check-in
    // 2. Have 0 likes given AND 0 reactions given AND 0 follows AND 0 comments
    // 3. Haven't received a nudge notification today
    const eligibleUsers = await db.prepare(`
      SELECT u.id, u.username
      FROM users u
      WHERE 
        (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) > 0
        AND (SELECT COUNT(*) FROM likes WHERE user_id = u.id) = 0
        AND (SELECT COUNT(*) FROM reactions WHERE user_id = u.id) = 0
        AND (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) = 0
        AND (SELECT COUNT(*) FROM comments WHERE user_id = u.id) = 0
        AND NOT EXISTS (
          SELECT 1 FROM notifications 
          WHERE user_id = u.id AND type = 'nudge' AND created_at >= ?
        )
    `).bind(todayStart).all<{ id: string; username: string }>();

    const users = eligibleUsers.results || [];
    
    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No users need engagement nudge",
        sent: 0
      });
    }

    // Get featured check-in of the day for linking
    const featuredCheckin = await db.prepare(`
      SELECT c.id, c.brand, c.rating, c.image_url, c.review,
             u.username as author_username
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.review IS NOT NULL AND c.review != ''
      ORDER BY 
        (c.rating * 0.4 + LENGTH(c.review) * 0.3 + RANDOM() * 0.3)
      LIMIT 1
    `).first<{ 
      id: string; 
      brand: string; 
      rating: number; 
      image_url: string | null;
      review: string;
      author_username: string;
    }>();

    let sent = 0;
    const messages = [
      "🔥 React to a check-in and earn your Socialite badge! Tap to explore →",
      "👋 See what others are smoking! React to show some love →",
      "🚬 Someone just logged a smoke — be the first to react! →",
      "💨 The community is lighting up! Check out what's trending →",
      "⚡ Quick! React to a check-in and start connecting →"
    ];

    for (const user of users) {
      // Pick a random message variation
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      // Create notification with link to discover (or featured check-in if available)
      const notifId = crypto.randomUUID();
      const linkPath = featuredCheckin 
        ? `/checkin/${featuredCheckin.id}`
        : '/discover';
      
      await db.prepare(`
        INSERT INTO notifications (id, user_id, type, from_user_id, checkin_id, message, created_at)
        VALUES (?, ?, 'nudge', ?, ?, ?, ?)
      `).bind(
        notifId, 
        user.id,
        user.id, // from_user_id = self for system notifications
        featuredCheckin?.id || null,
        message,
        now
      ).run();
      
      sent++;
    }

    return NextResponse.json({
      success: true,
      message: `Sent engagement nudge to ${sent} users`,
      sent,
      users: users.map(u => u.username),
      featuredCheckinId: featuredCheckin?.id || null
    });
  } catch (error) {
    console.error("Nudge engagement error:", error);
    return NextResponse.json({ error: "Nudge failed", details: String(error) }, { status: 500 });
  }
}

// GET - Check eligible users without sending
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { env } = getRequestContext();
  const db = env.DB;

  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get("key");
  if (adminKey !== "puffed-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const todayStart = now - (now % 86400);

    const eligibleUsers = await db.prepare(`
      SELECT u.id, u.username,
        (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) as checkin_count
      FROM users u
      WHERE 
        (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) > 0
        AND (SELECT COUNT(*) FROM likes WHERE user_id = u.id) = 0
        AND (SELECT COUNT(*) FROM reactions WHERE user_id = u.id) = 0
        AND (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) = 0
        AND (SELECT COUNT(*) FROM comments WHERE user_id = u.id) = 0
        AND NOT EXISTS (
          SELECT 1 FROM notifications 
          WHERE user_id = u.id AND type = 'nudge' AND created_at >= ?
        )
    `).bind(todayStart).all<{ id: string; username: string; checkin_count: number }>();

    return NextResponse.json({
      eligibleCount: eligibleUsers.results?.length || 0,
      users: eligibleUsers.results || []
    });
  } catch (error) {
    console.error("Check nudge eligibility error:", error);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}
