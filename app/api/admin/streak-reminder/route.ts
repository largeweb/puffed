import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { generateId } from "@/lib/auth";

export const runtime = "edge";

// Admin endpoint: Send streak protection reminders
// Notifies users who have an active streak but haven't logged today
// Run this in the evening (e.g., 6-8 PM) to remind users before day ends

export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Get today's date boundaries (UTC)
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayStartTs = Math.floor(todayStart.getTime() / 1000);
    const nowTs = Math.floor(now.getTime() / 1000);

    // Get yesterday's boundaries for streak check
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
    const yesterdayStartTs = Math.floor(yesterdayStart.getTime() / 1000);

    // Get puffed_team admin account
    const adminUser = await db
      .prepare("SELECT id FROM users WHERE username = ?")
      .bind("puffed_team")
      .first<{ id: string }>();

    if (!adminUser) {
      return NextResponse.json({ error: "Admin account not found" }, { status: 500 });
    }

    // Find users who:
    // 1. Logged a smoke yesterday (have an active streak)
    // 2. Have NOT logged a smoke today
    // 3. Haven't received a streak reminder today
    const atRiskUsers = await db.prepare(`
      SELECT u.id, u.username,
             (SELECT COUNT(DISTINCT DATE(created_at, 'unixepoch')) 
              FROM checkins 
              WHERE user_id = u.id 
                AND created_at >= (? - 7 * 86400)
             ) as recent_days
      FROM users u
      WHERE 
        -- Logged yesterday
        EXISTS (
          SELECT 1 FROM checkins 
          WHERE user_id = u.id 
            AND created_at >= ? AND created_at < ?
        )
        -- Has NOT logged today
        AND NOT EXISTS (
          SELECT 1 FROM checkins 
          WHERE user_id = u.id 
            AND created_at >= ?
        )
        -- No streak reminder today
        AND NOT EXISTS (
          SELECT 1 FROM notifications 
          WHERE user_id = u.id 
            AND type = 'streak_reminder' 
            AND created_at >= ?
        )
        -- Not admin accounts
        AND u.username NOT LIKE 'puffed%'
    `).bind(
      todayStartTs,
      yesterdayStartTs, 
      todayStartTs, 
      todayStartTs, 
      todayStartTs
    ).all<{ id: string; username: string; recent_days: number }>();

    const sent: Array<{ username: string; streak_days: number; message: string }> = [];
    const skipped: string[] = [];

    for (const user of atRiskUsers.results || []) {
      // Calculate actual streak (consecutive days)
      const streakResult = await db.prepare(`
        WITH daily AS (
          SELECT DISTINCT DATE(created_at, 'unixepoch') as smoke_date
          FROM checkins 
          WHERE user_id = ?
          ORDER BY smoke_date DESC
        ),
        numbered AS (
          SELECT smoke_date, ROW_NUMBER() OVER (ORDER BY smoke_date DESC) as rn
          FROM daily
        ),
        gaps AS (
          SELECT smoke_date, rn, 
                 DATE(smoke_date, '+' || rn || ' days') as adjusted
          FROM numbered
        )
        SELECT COUNT(*) as streak
        FROM gaps
        WHERE adjusted = (SELECT MAX(adjusted) FROM gaps)
      `).bind(user.id).first<{ streak: number }>();

      const currentStreak = streakResult?.streak || 0;

      // Only remind users with at least 2-day streaks (worth protecting)
      if (currentStreak < 2) {
        skipped.push(user.username);
        continue;
      }

      // Personalized messages based on streak length
      const messages = currentStreak >= 7 ? [
        `🔥 ${currentStreak}-day streak at risk! You're on fire — don't let it die tonight! Log a smoke →`,
        `⚡ ${currentStreak} DAYS! That's impressive, ${user.username}! One quick log keeps it alive →`,
        `🏆 ${currentStreak}-day legend status at risk! Quick, log a smoke before midnight! →`,
      ] : currentStreak >= 4 ? [
        `🔥 ${currentStreak}-day streak in danger! Log a smoke to keep it alive →`,
        `⏰ Hey ${user.username}, your ${currentStreak}-day streak needs you! Quick log? →`,
        `💪 ${currentStreak} days strong! Don't break the chain — log one now →`,
      ] : [
        `🔥 Your ${currentStreak}-day streak is at risk! Log a smoke before midnight →`,
        `⚡ Don't lose your ${currentStreak}-day streak! Quick smoke log? →`,
        `💨 ${currentStreak} days and counting... keep it going! Log a smoke →`,
      ];

      const message = messages[Math.floor(Math.random() * messages.length)];

      // Insert notification
      const notifId = generateId();
      await db.prepare(`
        INSERT INTO notifications (id, user_id, from_user_id, type, message, created_at, read)
        VALUES (?, ?, ?, 'streak_reminder', ?, ?, 0)
      `).bind(notifId, user.id, adminUser.id, message, nowTs).run();

      sent.push({ 
        username: user.username, 
        streak_days: currentStreak,
        message 
      });
    }

    return NextResponse.json({
      success: true,
      sent_count: sent.length,
      skipped_count: skipped.length,
      sent,
      skipped_reason: "Streak < 2 days"
    });

  } catch (error) {
    console.error("Streak reminder error:", error);
    return NextResponse.json({ 
      error: "Failed to send streak reminders",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// GET endpoint to preview who would receive reminders (dry run)
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayStartTs = Math.floor(todayStart.getTime() / 1000);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
    const yesterdayStartTs = Math.floor(yesterdayStart.getTime() / 1000);

    // Find at-risk users
    const atRiskUsers = await db.prepare(`
      SELECT u.id, u.username
      FROM users u
      WHERE 
        EXISTS (
          SELECT 1 FROM checkins 
          WHERE user_id = u.id 
            AND created_at >= ? AND created_at < ?
        )
        AND NOT EXISTS (
          SELECT 1 FROM checkins 
          WHERE user_id = u.id 
            AND created_at >= ?
        )
        AND u.username NOT LIKE 'puffed%'
    `).bind(yesterdayStartTs, todayStartTs, todayStartTs)
      .all<{ id: string; username: string }>();

    const atRisk: Array<{ username: string; streak: number }> = [];

    for (const user of atRiskUsers.results || []) {
      // Get streak
      const streakResult = await db.prepare(`
        WITH daily AS (
          SELECT DISTINCT DATE(created_at, 'unixepoch') as smoke_date
          FROM checkins 
          WHERE user_id = ?
          ORDER BY smoke_date DESC
        ),
        numbered AS (
          SELECT smoke_date, ROW_NUMBER() OVER (ORDER BY smoke_date DESC) as rn
          FROM daily
        ),
        gaps AS (
          SELECT smoke_date, rn, 
                 DATE(smoke_date, '+' || rn || ' days') as adjusted
          FROM numbered
        )
        SELECT COUNT(*) as streak
        FROM gaps
        WHERE adjusted = (SELECT MAX(adjusted) FROM gaps)
      `).bind(user.id).first<{ streak: number }>();

      const streak = streakResult?.streak || 0;
      if (streak >= 2) {
        atRisk.push({ username: user.username, streak });
      }
    }

    return NextResponse.json({
      preview: true,
      at_risk_users: atRisk,
      count: atRisk.length,
      note: "These users have active streaks but haven't logged today. POST to send reminders."
    });

  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}
