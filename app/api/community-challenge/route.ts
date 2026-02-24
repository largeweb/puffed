import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

// Challenge types that rotate weekly
const CHALLENGE_TYPES = [
  { type: "checkins", name: "Check-In Blitz", description: "Log smokes together", icon: "🚬", baseTarget: 30 },
  { type: "brands", name: "Brand Discovery", description: "Try different brands", icon: "🔍", baseTarget: 10 },
  { type: "photos", name: "Photo Frenzy", description: "Share smoke photos", icon: "📸", baseTarget: 15 },
  { type: "ratings", name: "Rate & Review", description: "Rate your smokes", icon: "⭐", baseTarget: 20 },
  { type: "social", name: "Social Week", description: "Engage with others", icon: "💬", baseTarget: 25 },
];

// Get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Get week boundaries
function getWeekBoundaries(): { start: number; end: number; daysRemaining: number } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  const daysRemaining = Math.ceil((weekEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  return {
    start: Math.floor(weekStart.getTime() / 1000),
    end: Math.floor(weekEnd.getTime() / 1000),
    daysRemaining,
  };
}

// Get deterministic challenge for this week
function getChallengeOfWeek(): { challenge: typeof CHALLENGE_TYPES[0]; weekNumber: number; year: number } {
  const now = new Date();
  const weekNumber = getWeekNumber(now);
  const year = now.getFullYear();
  
  // Use week + year to deterministically pick a challenge
  const seed = weekNumber + (year * 53);
  const challengeIndex = seed % CHALLENGE_TYPES.length;
  
  return {
    challenge: CHALLENGE_TYPES[challengeIndex],
    weekNumber,
    year,
  };
}

// Calculate dynamic target based on active users
function calculateTarget(baseTarget: number, activeUsers: number): number {
  // Scale target based on community size, minimum of baseTarget
  const scaleFactor = Math.max(1, Math.ceil(activeUsers / 3));
  return baseTarget * scaleFactor;
}

export async function GET(request: NextRequest) {
  try {
  const { env } = getRequestContext();
  const db = env.DB;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  const { challenge, weekNumber, year } = getChallengeOfWeek();
  const { start: weekStart, end: weekEnd, daysRemaining } = getWeekBoundaries();

  // Get active user count for scaling
  const activeUsers = await db
    .prepare("SELECT COUNT(DISTINCT user_id) as count FROM checkins WHERE created_at >= ?")
    .bind(weekStart)
    .first<{ count: number }>();

  const target = calculateTarget(challenge.baseTarget, activeUsers?.count || 1);

  // Get current progress based on challenge type
  let current = 0;
  let contributors: { username: string; contribution: number }[] = [];

  switch (challenge.type) {
    case "checkins": {
      const result = await db
        .prepare("SELECT COUNT(*) as count FROM checkins WHERE created_at >= ? AND created_at < ?")
        .bind(weekStart, weekEnd)
        .first<{ count: number }>();
      current = result?.count || 0;

      const contribResult = await db
        .prepare(`
          SELECT u.username, COUNT(*) as contribution
          FROM checkins c
          JOIN users u ON c.user_id = u.id
          WHERE c.created_at >= ? AND c.created_at < ?
          GROUP BY c.user_id
          ORDER BY contribution DESC
          LIMIT 5
        `)
        .bind(weekStart, weekEnd)
        .all<{ username: string; contribution: number }>();
      contributors = contribResult.results || [];
      break;
    }
    case "brands": {
      const result = await db
        .prepare("SELECT COUNT(DISTINCT LOWER(brand)) as count FROM checkins WHERE created_at >= ? AND created_at < ?")
        .bind(weekStart, weekEnd)
        .first<{ count: number }>();
      current = result?.count || 0;

      // For brands, show who discovered unique brands
      const contribResult = await db
        .prepare(`
          SELECT u.username, COUNT(DISTINCT LOWER(c.brand)) as contribution
          FROM checkins c
          JOIN users u ON c.user_id = u.id
          WHERE c.created_at >= ? AND c.created_at < ?
          GROUP BY c.user_id
          ORDER BY contribution DESC
          LIMIT 5
        `)
        .bind(weekStart, weekEnd)
        .all<{ username: string; contribution: number }>();
      contributors = contribResult.results || [];
      break;
    }
    case "photos": {
      const result = await db
        .prepare("SELECT COUNT(*) as count FROM checkins WHERE created_at >= ? AND created_at < ? AND image_key IS NOT NULL")
        .bind(weekStart, weekEnd)
        .first<{ count: number }>();
      current = result?.count || 0;

      const contribResult = await db
        .prepare(`
          SELECT u.username, COUNT(*) as contribution
          FROM checkins c
          JOIN users u ON c.user_id = u.id
          WHERE c.created_at >= ? AND c.created_at < ? AND c.image_key IS NOT NULL
          GROUP BY c.user_id
          ORDER BY contribution DESC
          LIMIT 5
        `)
        .bind(weekStart, weekEnd)
        .all<{ username: string; contribution: number }>();
      contributors = contribResult.results || [];
      break;
    }
    case "ratings": {
      const result = await db
        .prepare("SELECT COUNT(*) as count FROM checkins WHERE created_at >= ? AND created_at < ? AND rating IS NOT NULL")
        .bind(weekStart, weekEnd)
        .first<{ count: number }>();
      current = result?.count || 0;

      const contribResult = await db
        .prepare(`
          SELECT u.username, COUNT(*) as contribution
          FROM checkins c
          JOIN users u ON c.user_id = u.id
          WHERE c.created_at >= ? AND c.created_at < ? AND c.rating IS NOT NULL
          GROUP BY c.user_id
          ORDER BY contribution DESC
          LIMIT 5
        `)
        .bind(weekStart, weekEnd)
        .all<{ username: string; contribution: number }>();
      contributors = contribResult.results || [];
      break;
    }
    case "social": {
      // Social = likes + comments + reactions
      const likesResult = await db
        .prepare("SELECT COUNT(*) as count FROM likes WHERE created_at >= ? AND created_at < ?")
        .bind(weekStart, weekEnd)
        .first<{ count: number }>();
      const commentsResult = await db
        .prepare("SELECT COUNT(*) as count FROM comments WHERE created_at >= ? AND created_at < ?")
        .bind(weekStart, weekEnd)
        .first<{ count: number }>();
      const reactionsResult = await db
        .prepare("SELECT COUNT(*) as count FROM reactions WHERE created_at >= ? AND created_at < ?")
        .bind(weekStart, weekEnd)
        .first<{ count: number }>();
      
      current = (likesResult?.count || 0) + (commentsResult?.count || 0) + (reactionsResult?.count || 0);

      // Get top engagers (this is approximate, just likes for simplicity)
      const contribResult = await db
        .prepare(`
          SELECT u.username, COUNT(*) as contribution
          FROM likes l
          JOIN users u ON l.user_id = u.id
          WHERE l.created_at >= ? AND l.created_at < ?
          GROUP BY l.user_id
          ORDER BY contribution DESC
          LIMIT 5
        `)
        .bind(weekStart, weekEnd)
        .all<{ username: string; contribution: number }>();
      contributors = contribResult.results || [];
      break;
    }
  }

  // Calculate progress percentage
  const progress = Math.min(100, Math.round((current / target) * 100));
  const completed = current >= target;

  // Milestones (25%, 50%, 75%, 100%)
  const milestones = [
    { percent: 25, reached: progress >= 25, label: "Getting Started" },
    { percent: 50, reached: progress >= 50, label: "Halfway There" },
    { percent: 75, reached: progress >= 75, label: "Almost There" },
    { percent: 100, reached: progress >= 100, label: "Challenge Complete!" },
  ];

  // Check if current user has contributed
  let userContribution = 0;
  if (sessionId) {
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (session) {
      switch (challenge.type) {
        case "checkins":
        case "ratings": {
          const result = await db
            .prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND created_at >= ? AND created_at < ?")
            .bind(session.user_id, weekStart, weekEnd)
            .first<{ count: number }>();
          userContribution = result?.count || 0;
          break;
        }
        case "brands": {
          const result = await db
            .prepare("SELECT COUNT(DISTINCT LOWER(brand)) as count FROM checkins WHERE user_id = ? AND created_at >= ? AND created_at < ?")
            .bind(session.user_id, weekStart, weekEnd)
            .first<{ count: number }>();
          userContribution = result?.count || 0;
          break;
        }
        case "photos": {
          const result = await db
            .prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND created_at >= ? AND created_at < ? AND image_key IS NOT NULL")
            .bind(session.user_id, weekStart, weekEnd)
            .first<{ count: number }>();
          userContribution = result?.count || 0;
          break;
        }
        case "social": {
          const likes = await db
            .prepare("SELECT COUNT(*) as count FROM likes WHERE user_id = ? AND created_at >= ? AND created_at < ?")
            .bind(session.user_id, weekStart, weekEnd)
            .first<{ count: number }>();
          userContribution = likes?.count || 0;
          break;
        }
      }
    }
  }

  // Motivational message based on progress
  let message = "";
  if (completed) {
    message = "🎉 We did it! Challenge complete!";
  } else if (progress >= 75) {
    message = "🔥 So close! Final push!";
  } else if (progress >= 50) {
    message = "💪 Over halfway! Keep it up!";
  } else if (progress >= 25) {
    message = "🚀 Great momentum building!";
  } else {
    message = "🌟 Every contribution counts!";
  }

  return NextResponse.json({
    challenge: {
      type: challenge.type,
      name: challenge.name,
      description: challenge.description,
      icon: challenge.icon,
    },
    weekNumber,
    year,
    target,
    current,
    progress,
    completed,
    milestones,
    contributors,
    userContribution,
    daysRemaining,
    message,
    totalParticipants: activeUsers?.count || 0,
  });
  } catch (error) {
    console.error("Community challenge error:", error);
    return NextResponse.json({ error: "Failed to load community challenge", details: String(error) }, { status: 500 });
  }
}
