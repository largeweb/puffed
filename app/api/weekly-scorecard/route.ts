import { getRequestContext } from "@cloudflare/next-on-pages";
import { headers } from "next/headers";

export const runtime = "edge";

function getWeekBounds(): { thisWeekStart: number; lastWeekStart: number; lastWeekEnd: number } {
  const now = new Date();
  // EST offset
  const estOffset = -5 * 60;
  const estTime = new Date(now.getTime() + (now.getTimezoneOffset() + estOffset) * 60000);
  
  // Get start of this week (Sunday)
  const thisWeekStart = new Date(estTime);
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);
  
  // Last week start and end
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  
  // Convert back to UTC for DB
  const thisWeekStartUtc = thisWeekStart.getTime() - (thisWeekStart.getTimezoneOffset() + estOffset) * 60000;
  const lastWeekStartUtc = lastWeekStart.getTime() - (lastWeekStart.getTimezoneOffset() + estOffset) * 60000;
  const lastWeekEndUtc = lastWeekEnd.getTime() - (lastWeekEnd.getTimezoneOffset() + estOffset) * 60000;
  
  return { 
    thisWeekStart: thisWeekStartUtc, 
    lastWeekStart: lastWeekStartUtc, 
    lastWeekEnd: lastWeekEndUtc 
  };
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function getGrade(smokesThisWeek: number, avgRating: number | null, likesReceived: number, streak: number): { emoji: string; name: string; message: string } {
  // Calculate a score based on activity, quality, and engagement
  let score = 0;
  
  // Activity points (up to 30)
  score += Math.min(smokesThisWeek * 5, 30);
  
  // Quality points (up to 25)
  if (avgRating) score += avgRating * 5;
  
  // Engagement points (up to 20)
  score += Math.min(likesReceived * 4, 20);
  
  // Streak bonus (up to 25)
  score += Math.min(streak * 5, 25);
  
  if (score >= 90) return { emoji: "🏆", name: "Legendary Week", message: "You're on fire! Absolute cigar royalty." };
  if (score >= 75) return { emoji: "⭐", name: "Outstanding", message: "Exceptional performance this week!" };
  if (score >= 60) return { emoji: "🔥", name: "Crushing It", message: "Great week! Keep the momentum going." };
  if (score >= 45) return { emoji: "💪", name: "Solid Week", message: "Making good progress, nice work!" };
  if (score >= 30) return { emoji: "👍", name: "Good Start", message: "Building up steam, keep going!" };
  if (score >= 15) return { emoji: "🌱", name: "Getting There", message: "Every smoke counts, you're on your way!" };
  if (score > 0) return { emoji: "👋", name: "Just Warming Up", message: "A quiet week - more puffs await!" };
  return { emoji: "💤", name: "Rest Week", message: "No smokes logged yet - time to light up?" };
}

export async function GET() {
  const headersList = await headers();
  const sessionId = headersList.get("x-session-id");
  if (!sessionId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getRequestContext().env.DB;

  // Get current user
  const session = await db
    .prepare("SELECT user_id FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }

  const userId = session.user_id;
  const { thisWeekStart, lastWeekStart, lastWeekEnd } = getWeekBounds();

  // This week's smokes
  const thisWeekSmokes = await db.prepare(`
    SELECT COUNT(*) as count, AVG(rating) as avgRating
    FROM checkins
    WHERE user_id = ? AND created_at >= ?
  `).bind(userId, thisWeekStart).first<{ count: number; avgRating: number | null }>();

  // Last week's smokes  
  const lastWeekSmokes = await db.prepare(`
    SELECT COUNT(*) as count, AVG(rating) as avgRating
    FROM checkins
    WHERE user_id = ? AND created_at >= ? AND created_at < ?
  `).bind(userId, lastWeekStart, lastWeekEnd).first<{ count: number; avgRating: number | null }>();

  // Unique brands this week
  const brandsThisWeek = await db.prepare(`
    SELECT COUNT(DISTINCT brand) as count
    FROM checkins
    WHERE user_id = ? AND created_at >= ?
  `).bind(userId, thisWeekStart).first<{ count: number }>();

  // Total all-time smokes
  const totalAllTime = await db.prepare(`
    SELECT COUNT(*) as count
    FROM checkins
    WHERE user_id = ?
  `).bind(userId).first<{ count: number }>();

  // Likes received this week (on your check-ins)
  const likesReceived = await db.prepare(`
    SELECT COUNT(*) as count
    FROM likes l
    JOIN checkins c ON c.id = l.checkin_id
    WHERE c.user_id = ? AND l.created_at >= ?
  `).bind(userId, thisWeekStart).first<{ count: number }>();

  // Likes given this week
  const likesGiven = await db.prepare(`
    SELECT COUNT(*) as count
    FROM likes
    WHERE user_id = ? AND created_at >= ?
  `).bind(userId, thisWeekStart).first<{ count: number }>();

  // Comments received this week
  const commentsReceived = await db.prepare(`
    SELECT COUNT(*) as count
    FROM comments cm
    JOIN checkins c ON c.id = cm.checkin_id
    WHERE c.user_id = ? AND cm.user_id != ? AND cm.created_at >= ?
  `).bind(userId, userId, thisWeekStart).first<{ count: number }>();

  // Comments given this week
  const commentsGiven = await db.prepare(`
    SELECT COUNT(*) as count
    FROM comments
    WHERE user_id = ? AND created_at >= ?
  `).bind(userId, thisWeekStart).first<{ count: number }>();

  // New followers this week
  const newFollowers = await db.prepare(`
    SELECT COUNT(*) as count
    FROM follows
    WHERE following_id = ? AND created_at >= ?
  `).bind(userId, thisWeekStart).first<{ count: number }>();

  // New following this week
  const newFollowing = await db.prepare(`
    SELECT COUNT(*) as count
    FROM follows
    WHERE follower_id = ? AND created_at >= ?
  `).bind(userId, thisWeekStart).first<{ count: number }>();

  // Reactions received this week
  const reactionsReceived = await db.prepare(`
    SELECT COUNT(*) as count
    FROM reactions r
    JOIN checkins c ON c.id = r.checkin_id
    WHERE c.user_id = ? AND r.created_at >= ?
  `).bind(userId, thisWeekStart).first<{ count: number }>();

  // Current streak
  const user = await db.prepare(`
    SELECT current_streak FROM users WHERE id = ?
  `).bind(userId).first<{ current_streak: number }>();

  // Best smoke this week (highest rated)
  const bestSmoke = await db.prepare(`
    SELECT id, brand, product, rating
    FROM checkins
    WHERE user_id = ? AND created_at >= ? AND rating IS NOT NULL
    ORDER BY rating DESC, created_at DESC
    LIMIT 1
  `).bind(userId, thisWeekStart).first<{ id: number; brand: string; product: string | null; rating: number }>();

  // Most engaged check-in this week
  const mostEngaged = await db.prepare(`
    SELECT 
      c.id,
      c.brand,
      (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as likes,
      (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) as comments
    FROM checkins c
    WHERE c.user_id = ? AND c.created_at >= ?
    ORDER BY likes + comments DESC
    LIMIT 1
  `).bind(userId, thisWeekStart).first<{ id: number; brand: string; likes: number; comments: number }>();

  // Community average smokes this week (for comparison)
  const communityAvg = await db.prepare(`
    SELECT 
      CAST(COUNT(*) AS REAL) / NULLIF(COUNT(DISTINCT user_id), 0) as avg
    FROM checkins
    WHERE created_at >= ?
  `).bind(thisWeekStart).first<{ avg: number | null }>();

  // Percentile rank (what % of users you're ahead of)
  const usersWithMoreSmokes = await db.prepare(`
    SELECT COUNT(DISTINCT user_id) as count
    FROM checkins
    WHERE created_at >= ?
    GROUP BY user_id
    HAVING COUNT(*) > ?
  `).bind(thisWeekStart, thisWeekSmokes?.count || 0).all();
  
  const totalActiveUsers = await db.prepare(`
    SELECT COUNT(DISTINCT user_id) as count
    FROM checkins
    WHERE created_at >= ?
  `).bind(thisWeekStart).first<{ count: number }>();

  const percentileRank = totalActiveUsers?.count 
    ? Math.round(((totalActiveUsers.count - (usersWithMoreSmokes.results?.length || 0)) / totalActiveUsers.count) * 100)
    : 0;

  // Get badges earned this week (simplified - check common badge types)
  // In a real app, you'd have a badges table with earned_at timestamps
  const badgesEarnedThisWeek: string[] = [];
  
  // Check for first smoke badge
  if (thisWeekSmokes?.count === 1 && (totalAllTime?.count || 0) === 1) {
    badgesEarnedThisWeek.push("🎉"); // First Smoke
  }
  
  // Check for streak badges
  const streak = user?.current_streak || 0;
  if (streak === 3) badgesEarnedThisWeek.push("🔥");
  if (streak === 7) badgesEarnedThisWeek.push("🔥🔥");
  if (streak === 30) badgesEarnedThisWeek.push("🔥🏆");

  // Grade the week
  const grade = getGrade(
    thisWeekSmokes?.count || 0,
    thisWeekSmokes?.avgRating || null,
    likesReceived?.count || 0,
    streak
  );

  // Format dates for display
  const now = new Date();
  const weekEndDate = new Date(now);
  const weekStartDate = new Date(thisWeekStart);

  return Response.json({
    stats: {
      smokesThisWeek: thisWeekSmokes?.count || 0,
      smokesLastWeek: lastWeekSmokes?.count || 0,
      avgRatingThisWeek: thisWeekSmokes?.avgRating || null,
      avgRatingLastWeek: lastWeekSmokes?.avgRating || null,
      likesReceived: likesReceived?.count || 0,
      likesGiven: likesGiven?.count || 0,
      commentsReceived: commentsReceived?.count || 0,
      commentsGiven: commentsGiven?.count || 0,
      newFollowers: newFollowers?.count || 0,
      newFollowing: newFollowing?.count || 0,
      reactionsReceived: reactionsReceived?.count || 0,
      badgesEarnedThisWeek,
      currentStreak: streak,
      bestSmokeThisWeek: bestSmoke ? {
        brand: bestSmoke.brand,
        product: bestSmoke.product || undefined,
        rating: bestSmoke.rating,
        checkinId: bestSmoke.id,
      } : null,
      mostEngagedCheckin: mostEngaged ? {
        brand: mostEngaged.brand,
        likes: mostEngaged.likes,
        comments: mostEngaged.comments,
        checkinId: mostEngaged.id,
      } : null,
      weekStartDate: formatDate(weekStartDate.getTime()),
      weekEndDate: formatDate(weekEndDate.getTime()),
      uniqueBrandsThisWeek: brandsThisWeek?.count || 0,
      totalSmokesAllTime: totalAllTime?.count || 0,
      percentileRank,
    },
    weeklyGoal: null, // Could be user-configurable later
    communityAvgSmokes: communityAvg?.avg || 0,
    gradeEmoji: grade.emoji,
    gradeName: grade.name,
    gradeMessage: grade.message,
  });
}
