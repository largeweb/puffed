import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/admin/win-back - Re-engage users who were active but went quiet
// Targets users with check-ins whose last activity was 2+ days ago
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { env } = getRequestContext();
  const db = env.DB;

  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get("key");
  if (adminKey !== "puffed-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const twoDaysAgo = now - (2 * 24 * 60 * 60);
    const fiveDaysAgo = now - (5 * 24 * 60 * 60);

    // Find users who:
    // 1. Have at least 1 check-in
    // 2. Last check-in was more than 2 days ago
    // 3. Haven't received a win-back notification in the last 5 days
    // 4. Not admin accounts
    const eligibleUsers = await db.prepare(`
      SELECT 
        u.id, 
        u.username,
        (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) as checkin_count,
        (SELECT MAX(created_at) FROM checkins WHERE user_id = u.id) as last_checkin,
        (SELECT brand FROM checkins WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as last_brand
      FROM users u
      WHERE 
        u.username NOT LIKE 'puffed%'
        AND (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) > 0
        AND (SELECT MAX(created_at) FROM checkins WHERE user_id = u.id) < ?
        AND NOT EXISTS (
          SELECT 1 FROM notifications 
          WHERE user_id = u.id AND type = 'win-back' AND created_at >= ?
        )
      ORDER BY last_checkin DESC
    `).bind(twoDaysAgo, fiveDaysAgo).all<{ 
      id: string; 
      username: string; 
      checkin_count: number;
      last_checkin: number;
      last_brand: string;
    }>();

    const users = eligibleUsers.results || [];
    
    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No users need win-back notification",
        sent: 0
      });
    }

    // Get recent platform activity to show what they missed
    const recentCheckins = await db.prepare(`
      SELECT COUNT(*) as count FROM checkins WHERE created_at >= ?
    `).bind(twoDaysAgo).first<{ count: number }>();

    const recentCount = recentCheckins?.count || 0;

    // Personalized win-back messages
    const getWinBackMessage = (user: typeof users[0]) => {
      const daysSinceLast = Math.floor((now - user.last_checkin) / 86400);
      const messages = [
        `🚬 Haven't seen you in ${daysSinceLast} days! What are you smoking today?`,
        `👋 We miss your smoke logs! ${recentCount} check-ins happened while you were away →`,
        `🔥 Your last smoke was ${user.last_brand} — time for another? →`,
        `💨 The community is active! Come see what everyone's smoking →`,
        `⚡ ${daysSinceLast} days without a log — let's fix that! →`,
        `🌟 Your smoke journey awaits! Log today's smoke and keep it going →`,
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    };

    let sent = 0;

    for (const user of users) {
      const message = getWinBackMessage(user);
      const notifId = crypto.randomUUID();
      
      await db.prepare(`
        INSERT INTO notifications (id, user_id, type, from_user_id, message, created_at)
        VALUES (?, ?, 'win-back', ?, ?, ?)
      `).bind(
        notifId, 
        user.id,
        user.id,
        message,
        now
      ).run();
      
      sent++;
    }

    return NextResponse.json({
      success: true,
      message: `Sent win-back notifications to ${sent} users`,
      sent,
      recentActivityCount: recentCount,
      users: users.map(u => ({ 
        username: u.username, 
        checkinCount: u.checkin_count,
        lastSmoke: new Date(u.last_checkin * 1000).toISOString(),
        lastBrand: u.last_brand,
        daysSinceLast: Math.floor((now - u.last_checkin) / 86400)
      }))
    });
  } catch (error) {
    console.error("Win-back error:", error);
    return NextResponse.json({ error: "Win-back failed", details: String(error) }, { status: 500 });
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
    const twoDaysAgo = now - (2 * 24 * 60 * 60);
    const fiveDaysAgo = now - (5 * 24 * 60 * 60);

    const eligibleUsers = await db.prepare(`
      SELECT 
        u.id, 
        u.username,
        (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) as checkin_count,
        (SELECT MAX(created_at) FROM checkins WHERE user_id = u.id) as last_checkin,
        (SELECT brand FROM checkins WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as last_brand
      FROM users u
      WHERE 
        u.username NOT LIKE 'puffed%'
        AND (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) > 0
        AND (SELECT MAX(created_at) FROM checkins WHERE user_id = u.id) < ?
        AND NOT EXISTS (
          SELECT 1 FROM notifications 
          WHERE user_id = u.id AND type = 'win-back' AND created_at >= ?
        )
      ORDER BY last_checkin DESC
    `).bind(twoDaysAgo, fiveDaysAgo).all<{ 
      id: string; 
      username: string; 
      checkin_count: number;
      last_checkin: number;
      last_brand: string;
    }>();

    const now2 = Math.floor(Date.now() / 1000);
    return NextResponse.json({
      eligibleCount: eligibleUsers.results?.length || 0,
      users: (eligibleUsers.results || []).map(u => ({
        username: u.username,
        checkinCount: u.checkin_count,
        lastSmoke: new Date(u.last_checkin * 1000).toISOString(),
        lastBrand: u.last_brand,
        daysSinceLast: Math.floor((now2 - u.last_checkin) / 86400)
      }))
    });
  } catch (error) {
    console.error("Check win-back error:", error);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}
