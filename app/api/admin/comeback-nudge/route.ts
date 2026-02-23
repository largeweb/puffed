import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/admin/comeback-nudge - Re-engage lapsed users who were active but stopped
// Targets users who had check-ins but haven't logged one in X days
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { env } = getRequestContext();
  const db = env.DB;

  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get("key");
  if (adminKey !== "puffed-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Configurable: minimum days since last check-in (default 3)
  const minDaysInactive = parseInt(searchParams.get("days") || "3");
  // Maximum days to consider (don't nudge super old users)
  const maxDaysInactive = parseInt(searchParams.get("maxDays") || "30");
  
  try {
    const now = Math.floor(Date.now() / 1000);
    const minInactiveTime = now - (minDaysInactive * 24 * 60 * 60);
    const maxInactiveTime = now - (maxDaysInactive * 24 * 60 * 60);
    const cooldownTime = now - (7 * 24 * 60 * 60); // 7-day cooldown between comeback nudges

    // Find users who:
    // 1. Have at least 2 check-ins (were genuinely active, not just trying once)
    // 2. Last check-in was between minDays and maxDays ago
    // 3. Haven't received a comeback-nudge in the last 7 days
    // 4. Not admin accounts
    const eligibleUsers = await db.prepare(`
      SELECT 
        u.id, 
        u.username, 
        COUNT(c.id) as total_checkins,
        MAX(c.created_at) as last_checkin,
        (SELECT COUNT(DISTINCT DATE(c2.created_at, 'unixepoch')) FROM checkins c2 WHERE c2.user_id = u.id) as streak_days,
        (SELECT brand FROM checkins WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as last_brand
      FROM users u
      INNER JOIN checkins c ON c.user_id = u.id
      WHERE 
        u.username NOT LIKE 'puffed%'
      GROUP BY u.id
      HAVING 
        COUNT(c.id) >= 2
        AND MAX(c.created_at) < ?
        AND MAX(c.created_at) > ?
        AND NOT EXISTS (
          SELECT 1 FROM notifications 
          WHERE user_id = u.id AND type = 'comeback-nudge' AND created_at >= ?
        )
      ORDER BY last_checkin DESC
    `).bind(minInactiveTime, maxInactiveTime, cooldownTime).all<{ 
      id: string; 
      username: string; 
      total_checkins: number;
      last_checkin: number;
      streak_days: number;
      last_brand: string;
    }>();

    const users = eligibleUsers.results || [];
    
    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No lapsed users need comeback nudge",
        sent: 0,
        criteria: { minDaysInactive, maxDaysInactive }
      });
    }

    // Personalized comeback messages based on user data
    const getPersonalizedMessage = (user: typeof users[0]) => {
      const daysSinceLastSmoke = Math.floor((now - user.last_checkin) / (24 * 60 * 60));
      
      const templates = [
        `🔥 Hey ${user.username}! It's been ${daysSinceLastSmoke} days — we miss your smoke logs!`,
        `💨 Your streak was going strong! Come back and pick up where you left off.`,
        `👋 ${user.username}, ${user.total_checkins} smokes logged... don't stop now!`,
        `🚬 We noticed you haven't logged in a while. What are you smoking these days?`,
        `⏰ It's been ${daysSinceLastSmoke} days since your last ${user.last_brand}. Time for another?`,
        `🏆 Your smoking journey paused at ${user.total_checkins} check-ins. Let's keep it going!`,
        `💭 Missing your smoke reviews! The community wants to know what you're puffing.`,
        `🔙 Welcome back anytime! Log a quick smoke and get back on track.`
      ];
      
      // Pick message based on user stats
      if (daysSinceLastSmoke > 14) {
        return `👋 Long time no see, ${user.username}! We've added new features while you were away. Check them out! →`;
      }
      if (user.total_checkins >= 10) {
        return `🏆 ${user.username}, you're a seasoned logger with ${user.total_checkins} check-ins! Don't let your streak die.`;
      }
      
      return templates[Math.floor(Math.random() * templates.length)];
    };

    let sent = 0;

    for (const user of users) {
      const message = getPersonalizedMessage(user);
      const notifId = crypto.randomUUID();
      
      await db.prepare(`
        INSERT INTO notifications (id, user_id, type, from_user_id, message, created_at)
        VALUES (?, ?, 'comeback-nudge', ?, ?, ?)
      `).bind(
        notifId, 
        user.id,
        user.id, // from_user_id = self for system notifications
        message,
        now
      ).run();
      
      sent++;
    }

    return NextResponse.json({
      success: true,
      message: `Sent comeback nudge to ${sent} lapsed users`,
      sent,
      criteria: { minDaysInactive, maxDaysInactive },
      users: users.map(u => ({ 
        username: u.username, 
        totalCheckins: u.total_checkins,
        daysSinceLastSmoke: Math.floor((now - u.last_checkin) / (24 * 60 * 60)),
        lastBrand: u.last_brand
      }))
    });
  } catch (error) {
    console.error("Comeback nudge error:", error);
    return NextResponse.json({ error: "Nudge failed", details: String(error) }, { status: 500 });
  }
}

// GET - Preview eligible users without sending
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { env } = getRequestContext();
  const db = env.DB;

  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get("key");
  if (adminKey !== "puffed-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const minDaysInactive = parseInt(searchParams.get("days") || "3");
  const maxDaysInactive = parseInt(searchParams.get("maxDays") || "30");

  try {
    const now = Math.floor(Date.now() / 1000);
    const minInactiveTime = now - (minDaysInactive * 24 * 60 * 60);
    const maxInactiveTime = now - (maxDaysInactive * 24 * 60 * 60);
    const cooldownTime = now - (7 * 24 * 60 * 60);

    const eligibleUsers = await db.prepare(`
      SELECT 
        u.id, 
        u.username, 
        COUNT(c.id) as total_checkins,
        MAX(c.created_at) as last_checkin,
        (SELECT brand FROM checkins WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as last_brand
      FROM users u
      INNER JOIN checkins c ON c.user_id = u.id
      WHERE 
        u.username NOT LIKE 'puffed%'
      GROUP BY u.id
      HAVING 
        COUNT(c.id) >= 2
        AND MAX(c.created_at) < ?
        AND MAX(c.created_at) > ?
        AND NOT EXISTS (
          SELECT 1 FROM notifications 
          WHERE user_id = u.id AND type = 'comeback-nudge' AND created_at >= ?
        )
      ORDER BY last_checkin DESC
    `).bind(minInactiveTime, maxInactiveTime, cooldownTime).all<{ 
      id: string; 
      username: string; 
      total_checkins: number;
      last_checkin: number;
      last_brand: string;
    }>();

    const users = eligibleUsers.results || [];

    return NextResponse.json({
      eligibleCount: users.length,
      criteria: { minDaysInactive, maxDaysInactive, cooldownDays: 7 },
      users: users.map(u => ({
        username: u.username,
        totalCheckins: u.total_checkins,
        daysSinceLastSmoke: Math.floor((now - u.last_checkin) / (24 * 60 * 60)),
        lastBrand: u.last_brand,
        lastCheckinAt: new Date(u.last_checkin * 1000).toISOString()
      }))
    });
  } catch (error) {
    console.error("Check comeback nudge error:", error);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}
