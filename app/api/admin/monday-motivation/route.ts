import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { generateId } from "@/lib/auth";

export const runtime = "edge";

// Get Monday midnight of current week
function getWeekBounds(): { start: number; end: number } {
  const now = new Date();
  const day = now.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysSinceMonday);
  monday.setUTCHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  
  return {
    start: Math.floor(monday.getTime() / 1000),
    end: Math.floor(sunday.getTime() / 1000)
  };
}

// Get today's date string (YYYY-MM-DD)
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Get week number for deduplication
function getWeekKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getUTCDay() + 1) / 7);
  return `${year}-W${week}`;
}

// Admin endpoint to send Monday Motivation notifications
// Sends personalized weekly goals overview to all users
export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const today = getTodayString();
    const weekKey = getWeekKey();
    const { start: weekStart, end: weekEnd } = getWeekBounds();
    const fourWeeksAgo = weekStart - (28 * 24 * 60 * 60);

    // Get puffed_team admin account
    const adminUser = await db
      .prepare("SELECT id FROM users WHERE username = ?")
      .bind("puffed_team")
      .first<{ id: string }>();

    if (!adminUser) {
      return NextResponse.json({ error: "Admin account not found" }, { status: 500 });
    }

    // Get all users who haven't received Monday motivation this week
    const users = await db.prepare(`
      SELECT u.id, u.username
      FROM users u
      WHERE u.id NOT IN (
        SELECT user_id FROM notifications 
        WHERE type = 'monday_motivation' 
          AND message LIKE ?
      )
    `).bind(`%${weekKey}%`).all<{ id: string; username: string }>();

    const sent: Array<{ username: string; message: string }> = [];

    for (const user of users.results || []) {
      // Get user's historical stats (last 4 weeks)
      const historyStats = await db.prepare(`
        SELECT 
          COUNT(*) as total_checkins,
          COUNT(DISTINCT brand) as total_brands
        FROM checkins 
        WHERE user_id = ? AND created_at >= ? AND created_at < ?
      `).bind(user.id, fourWeeksAgo, weekStart).first<{ total_checkins: number; total_brands: number }>();

      const avgWeeklyCheckins = historyStats?.total_checkins ? Math.ceil(historyStats.total_checkins / 4) : 0;
      const isNewUser = avgWeeklyCheckins === 0;

      // Get current week progress
      const weekProgress = await db.prepare(`
        SELECT COUNT(*) as smokes, COUNT(DISTINCT brand) as brands
        FROM checkins 
        WHERE user_id = ? AND created_at >= ? AND created_at <= ?
      `).bind(user.id, weekStart, weekEnd).first<{ smokes: number; brands: number }>();

      // Build personalized message
      const smokeTarget = isNewUser ? 3 : Math.max(3, Math.ceil(avgWeeklyCheckins * 1.2));
      const currentSmokes = weekProgress?.smokes || 0;
      const currentBrands = weekProgress?.brands || 0;

      let message: string;
      let cta: string;

      if (isNewUser) {
        // New user - welcome message
        message = `🎯 Happy Monday! Your first weekly goals are ready. Log 3 smokes, try a new brand, and connect with the community. Let's make this week count!`;
        cta = "Check out your goals →";
      } else if (currentSmokes > 0) {
        // Already active this week
        message = `🎯 Happy Monday! You're already ${currentSmokes} smoke${currentSmokes > 1 ? 's' : ''} into the week. Target: ${smokeTarget}. Keep the momentum going!`;
        cta = "See your goals →";
      } else {
        // Returning user, fresh week
        const encouragement = avgWeeklyCheckins >= 5 
          ? "You crushed it last week!" 
          : "Fresh week, fresh start.";
        message = `🎯 Happy Monday! ${encouragement} This week's target: ${smokeTarget} smokes. What are you lighting up first?`;
        cta = "View your goals →";
      }

      // Add week key to message for dedup (hidden at end)
      const fullMessage = `${message} [${weekKey}]`;

      const notifId = generateId();
      await db.prepare(`
        INSERT INTO notifications (id, user_id, type, from_user_id, message, link)
        VALUES (?, ?, 'monday_motivation', ?, ?, '/dashboard')
      `).bind(notifId, user.id, adminUser.id, fullMessage).run();

      sent.push({ username: user.username, message });
    }

    return NextResponse.json({
      success: true,
      weekKey,
      sent,
      count: sent.length,
    });
  } catch (error) {
    console.error("Monday motivation error:", error);
    return NextResponse.json({ error: "Failed to send Monday motivation" }, { status: 500 });
  }
}

// GET: Preview who would receive Monday motivation
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const weekKey = getWeekKey();

    // Get users who haven't received it this week
    const eligibleUsers = await db.prepare(`
      SELECT u.id, u.username
      FROM users u
      WHERE u.id NOT IN (
        SELECT user_id FROM notifications 
        WHERE type = 'monday_motivation' 
          AND message LIKE ?
      )
    `).bind(`%${weekKey}%`).all<{ id: string; username: string }>();

    // Get users who already received it
    const alreadySent = await db.prepare(`
      SELECT u.username
      FROM users u
      JOIN notifications n ON n.user_id = u.id
      WHERE n.type = 'monday_motivation' 
        AND n.message LIKE ?
    `).bind(`%${weekKey}%`).all<{ username: string }>();

    return NextResponse.json({
      weekKey,
      eligible: eligibleUsers.results?.map(u => u.username) || [],
      eligibleCount: eligibleUsers.results?.length || 0,
      alreadySent: alreadySent.results?.map(u => u.username) || [],
    });
  } catch (error) {
    console.error("Monday motivation preview error:", error);
    return NextResponse.json({ error: "Failed to preview" }, { status: 500 });
  }
}
