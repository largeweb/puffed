import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// Platform milestones to celebrate
const MILESTONES = [
  { count: 10, emoji: "🎯", title: "First Ten!", message: "The community hit 10 check-ins!" },
  { count: 25, emoji: "🌟", title: "Quarter Century!", message: "25 smokes logged together!" },
  { count: 50, emoji: "🔥", title: "Fifty Strong!", message: "50 check-ins and growing!" },
  { count: 100, emoji: "💯", title: "Century Club!", message: "100 check-ins! We're on fire!" },
  { count: 250, emoji: "🚀", title: "Lift Off!", message: "250 check-ins - going places!" },
  { count: 500, emoji: "👑", title: "Royal Status!", message: "500 smokes logged. Legendary!" },
  { count: 1000, emoji: "🏆", title: "Grand Milestone!", message: "1000 check-ins! Incredible community!" },
];

const USER_MILESTONES = [
  { count: 5, emoji: "🌱", title: "Getting Started", message: "Welcome to the club!" },
  { count: 10, emoji: "⭐", title: "Rising Star", message: "10 check-ins - you're hooked!" },
  { count: 25, emoji: "🔥", title: "On Fire", message: "25 check-ins and counting!" },
  { count: 50, emoji: "🎖️", title: "Veteran", message: "Half century of smokes!" },
  { count: 100, emoji: "👑", title: "Legend", message: "100 check-ins. Bow down!" },
];

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Validate session and get user
    const now = Math.floor(Date.now() / 1000);
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
      .bind(sessionId, now)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    // Get platform stats
    const platformStats = await db
      .prepare(`
        SELECT 
          COUNT(*) as total_checkins,
          COUNT(DISTINCT user_id) as total_users,
          COUNT(DISTINCT brand) as total_brands
        FROM checkins
      `)
      .first<{ total_checkins: number; total_users: number; total_brands: number }>();

    // Get user's check-in count
    const userStats = await db
      .prepare(`SELECT COUNT(*) as count FROM checkins WHERE user_id = ?`)
      .bind(session.user_id)
      .first<{ count: number }>();

    const totalCheckins = platformStats?.total_checkins || 0;
    const userCheckins = userStats?.count || 0;

    // Find current platform milestone (highest one achieved)
    const currentPlatformMilestone = [...MILESTONES]
      .reverse()
      .find(m => totalCheckins >= m.count) || null;
    
    // Find next platform milestone
    const nextPlatformMilestone = MILESTONES.find(m => totalCheckins < m.count) || null;

    // Find current user milestone
    const currentUserMilestone = [...USER_MILESTONES]
      .reverse()
      .find(m => userCheckins >= m.count) || null;
    
    // Find next user milestone
    const nextUserMilestone = USER_MILESTONES.find(m => userCheckins < m.count) || null;

    // Check if "just achieved" - within 20% buffer of milestone
    const justAchievedPlatform = currentPlatformMilestone !== null && 
      totalCheckins >= currentPlatformMilestone.count && 
      totalCheckins < currentPlatformMilestone.count * 1.2;

    const justAchievedUser = currentUserMilestone !== null && 
      userCheckins >= currentUserMilestone.count && 
      userCheckins < currentUserMilestone.count + 3;

    // Calculate progress to next milestone
    const platformProgress = nextPlatformMilestone 
      ? Math.round((totalCheckins / nextPlatformMilestone.count) * 100)
      : 100;

    const userProgress = nextUserMilestone
      ? Math.round((userCheckins / nextUserMilestone.count) * 100)
      : 100;

    // Get contributors to platform milestone (top 3 users by check-ins)
    const topContributors = await db
      .prepare(`
        SELECT u.username, COUNT(c.id) as count
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE u.username NOT LIKE 'puffed%'
        GROUP BY c.user_id
        ORDER BY count DESC
        LIMIT 3
      `)
      .all<{ username: string; count: number }>();

    return NextResponse.json({
      platform: {
        totalCheckins,
        totalUsers: platformStats?.total_users || 0,
        totalBrands: platformStats?.total_brands || 0,
        currentMilestone: currentPlatformMilestone,
        nextMilestone: nextPlatformMilestone,
        progress: platformProgress,
        justAchieved: justAchievedPlatform,
        topContributors: topContributors.results || [],
      },
      user: {
        totalCheckins: userCheckins,
        currentMilestone: currentUserMilestone,
        nextMilestone: nextUserMilestone,
        progress: userProgress,
        justAchieved: justAchievedUser,
      },
    });
  } catch (error) {
    console.error("Community milestones error:", error);
    return NextResponse.json({ error: "Failed to load milestones" }, { status: 500 });
  }
}
