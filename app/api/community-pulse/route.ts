import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

interface CommunityPulseResponse {
  checkinsThisWeek: number;
  activeUsers: number;
  recentUsernames: string[];
}

// GET /api/community-pulse
// Returns community activity stats for the current week (no auth required)
export async function GET() {
  const { env } = getRequestContext();

  try {
    // Get start of current week (Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    const weekStartTimestamp = Math.floor(startOfWeek.getTime() / 1000);

    // Count check-ins this week
    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM checkins WHERE created_at >= ?`
    ).bind(weekStartTimestamp).first<{ count: number }>();

    const checkinsThisWeek = countResult?.count || 0;

    // Count unique active users this week
    const activeResult = await env.DB.prepare(
      `SELECT COUNT(DISTINCT user_id) as count FROM checkins WHERE created_at >= ?`
    ).bind(weekStartTimestamp).first<{ count: number }>();

    const activeUsers = activeResult?.count || 0;

    // Get recent usernames (most recent check-ins this week)
    const recentResult = await env.DB.prepare(`
      SELECT DISTINCT u.username 
      FROM checkins c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.created_at >= ? 
      ORDER BY c.created_at DESC 
      LIMIT 5
    `).bind(weekStartTimestamp).all<{ username: string }>();

    const recentUsernames = recentResult?.results?.map((r: { username: string }) => r.username) || [];

    const response: CommunityPulseResponse = {
      checkinsThisWeek,
      activeUsers,
      recentUsernames
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Community pulse error:", error);
    return NextResponse.json(
      { checkinsThisWeek: 0, activeUsers: 0, recentUsernames: [] } as CommunityPulseResponse,
      { status: 200 }
    );
  }
}
