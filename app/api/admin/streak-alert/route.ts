import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { generateId } from "@/lib/auth";

export const runtime = "edge";

// Get today's date string (YYYY-MM-DD)
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Get yesterday's date string
function getYesterdayString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

// Calculate streak from dates (sorted descending)
function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  
  const today = getTodayString();
  const yesterday = getYesterdayString();
  
  const lastDate = dates[0];
  if (lastDate !== today && lastDate !== yesterday) {
    return 0; // Streak already broken
  }
  
  let streak = 0;
  let expectedDate = lastDate;
  
  for (const date of dates) {
    if (date === expectedDate) {
      streak++;
      const dateObj = new Date(expectedDate + 'T12:00:00Z');
      dateObj.setUTCDate(dateObj.getUTCDate() - 1);
      expectedDate = dateObj.toISOString().split('T')[0];
    } else if (date < expectedDate) {
      break;
    }
  }
  
  return streak;
}

// Admin endpoint to send streak-at-risk notifications
// Finds users who logged yesterday but not today (streak about to break)
export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const today = getTodayString();
    const yesterday = getYesterdayString();

    // Get puffed_team admin account for sending notifications
    const adminUser = await db
      .prepare("SELECT id FROM users WHERE username = ?")
      .bind("puffed_team")
      .first<{ id: string }>();

    if (!adminUser) {
      return NextResponse.json({ error: "Admin account not found" }, { status: 500 });
    }

    // Find users who:
    // 1. Have logged yesterday (active streak)
    // 2. Have NOT logged today (streak at risk)
    // 3. Haven't received a streak alert today already
    const atRiskUsers = await db.prepare(`
      SELECT DISTINCT u.id, u.username
      FROM users u
      JOIN checkins c ON c.user_id = u.id
      WHERE date(c.created_at, 'unixepoch') = ?
        AND u.id NOT IN (
          SELECT user_id FROM checkins WHERE date(created_at, 'unixepoch') = ?
        )
        AND u.id NOT IN (
          SELECT user_id FROM notifications 
          WHERE type = 'streak_alert' 
            AND date(created_at, 'unixepoch') = ?
        )
    `).bind(yesterday, today, today).all<{ id: string; username: string }>();

    const alerts: Array<{ username: string; streak: number }> = [];

    for (const user of atRiskUsers.results || []) {
      // Calculate their current streak
      const dates = await db.prepare(`
        SELECT DISTINCT date(created_at, 'unixepoch') as checkin_date
        FROM checkins
        WHERE user_id = ?
        ORDER BY checkin_date DESC
      `).bind(user.id).all<{ checkin_date: string }>();

      const streak = calculateStreak(dates.results?.map(r => r.checkin_date) || []);
      
      // Only alert if they have a streak worth preserving (2+ days)
      if (streak >= 2) {
        const notifId = generateId();
        const message = `🔥 Your ${streak}-day streak ends tonight! Log a smoke to keep it going →`;
        
        await db.prepare(`
          INSERT INTO notifications (id, user_id, type, from_user_id, message)
          VALUES (?, ?, 'streak_alert', ?, ?)
        `).bind(notifId, user.id, adminUser.id, message).run();

        alerts.push({ username: user.username, streak });
      }
    }

    return NextResponse.json({
      success: true,
      today,
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error("Streak alert error:", error);
    return NextResponse.json({ error: "Failed to send streak alerts" }, { status: 500 });
  }
}

// GET: Preview who would receive streak alerts
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const today = getTodayString();
    const yesterday = getYesterdayString();

    // Find users who logged yesterday but not today
    const atRiskUsers = await db.prepare(`
      SELECT DISTINCT u.id, u.username
      FROM users u
      JOIN checkins c ON c.user_id = u.id
      WHERE date(c.created_at, 'unixepoch') = ?
        AND u.id NOT IN (
          SELECT user_id FROM checkins WHERE date(created_at, 'unixepoch') = ?
        )
    `).bind(yesterday, today).all<{ id: string; username: string }>();

    const preview: Array<{ username: string; streak: number; alreadyAlerted: boolean }> = [];

    for (const user of atRiskUsers.results || []) {
      // Calculate their current streak
      const dates = await db.prepare(`
        SELECT DISTINCT date(created_at, 'unixepoch') as checkin_date
        FROM checkins
        WHERE user_id = ?
        ORDER BY checkin_date DESC
      `).bind(user.id).all<{ checkin_date: string }>();

      const streak = calculateStreak(dates.results?.map(r => r.checkin_date) || []);
      
      // Check if already alerted today
      const alerted = await db.prepare(`
        SELECT 1 FROM notifications 
        WHERE user_id = ? AND type = 'streak_alert' AND date(created_at, 'unixepoch') = ?
      `).bind(user.id, today).first();

      if (streak >= 2) {
        preview.push({ 
          username: user.username, 
          streak,
          alreadyAlerted: !!alerted
        });
      }
    }

    return NextResponse.json({
      today,
      yesterday,
      atRiskUsers: preview,
      eligible: preview.filter(u => !u.alreadyAlerted).length,
    });
  } catch (error) {
    console.error("Streak alert preview error:", error);
    return NextResponse.json({ error: "Failed to preview" }, { status: 500 });
  }
}
