import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface WeeklyMVP {
  username: string;
  score: number;
  checkins: number;
  likesGiven: number;
  likesReceived: number;
  commentsGiven: number;
  commentsReceived: number;
  followsGiven: number;
}

interface BestCheckin {
  checkinId: number;
  username: string;
  brand: string;
  product: string | null;
  rating: number;
  review: string | null;
  photoUrl: string | null;
  likes: number;
  comments: number;
  engagementScore: number;
}

interface RisingStar {
  username: string;
  thisWeekCheckins: number;
  lastWeekCheckins: number;
  growthPercent: number;
}

interface SocialButterfly {
  username: string;
  likesGiven: number;
  commentsGiven: number;
  followsGiven: number;
  totalGiven: number;
}

interface StreakChampion {
  username: string;
  currentStreak: number;
}

interface MVPAwardsData {
  weekOf: string;
  weekStart: string;
  weekEnd: string;
  
  mvp: WeeklyMVP | null;
  bestCheckin: BestCheckin | null;
  risingStar: RisingStar | null;
  socialButterfly: SocialButterfly | null;
  streakChampion: StreakChampion | null;
  
  honorableMentions: {
    username: string;
    achievement: string;
    icon: string;
  }[];
  
  weeklyStats: {
    totalCheckins: number;
    totalLikes: number;
    totalComments: number;
    newUsers: number;
    avgRating: number;
  };
  
  previousWinners: {
    weekOf: string;
    mvp: string;
  }[];
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    // Calculate week boundaries (Sunday to Saturday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekStartTs = Math.floor(weekStart.getTime() / 1000);
    const weekEndTs = Math.floor(weekEnd.getTime() / 1000);
    
    // Last week boundaries
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekStartTs = Math.floor(lastWeekStart.getTime() / 1000);
    
    // 1. MVP - Most engaged user this week
    const mvpQuery = await db.prepare(`
      WITH user_activity AS (
        SELECT 
          u.id as user_id,
          u.username,
          COALESCE((SELECT COUNT(*) FROM checkins WHERE user_id = u.id AND created_at >= ? AND created_at <= ?), 0) as checkins,
          COALESCE((SELECT COUNT(*) FROM likes WHERE user_id = u.id AND created_at >= ? AND created_at <= ?), 0) as likes_given,
          COALESCE((SELECT COUNT(*) FROM likes l JOIN checkins c ON l.checkin_id = c.id WHERE c.user_id = u.id AND l.created_at >= ? AND l.created_at <= ?), 0) as likes_received,
          COALESCE((SELECT COUNT(*) FROM comments WHERE user_id = u.id AND created_at >= ? AND created_at <= ?), 0) as comments_given,
          COALESCE((SELECT COUNT(*) FROM comments cm JOIN checkins c ON cm.checkin_id = c.id WHERE c.user_id = u.id AND cm.created_at >= ? AND cm.created_at <= ?), 0) as comments_received,
          COALESCE((SELECT COUNT(*) FROM follows WHERE follower_id = u.id AND created_at >= ? AND created_at <= ?), 0) as follows_given
        FROM users u
        WHERE u.username != 'openclaw_tester'
      )
      SELECT 
        username,
        checkins,
        likes_given,
        likes_received,
        comments_given,
        comments_received,
        follows_given,
        (checkins * 10 + likes_given * 2 + likes_received * 3 + comments_given * 5 + comments_received * 5 + follows_given * 3) as score
      FROM user_activity
      WHERE checkins > 0 OR likes_given > 0 OR comments_given > 0
      ORDER BY score DESC
      LIMIT 1
    `).bind(
      weekStartTs, weekEndTs,
      weekStartTs, weekEndTs,
      weekStartTs, weekEndTs,
      weekStartTs, weekEndTs,
      weekStartTs, weekEndTs,
      weekStartTs, weekEndTs
    ).first<WeeklyMVP>();
    
    // 2. Best Check-in - Highest engagement + rating
    const bestCheckinQuery = await db.prepare(`
      SELECT 
        c.id as checkinId,
        u.username,
        c.brand,
        c.product,
        c.rating,
        c.review,
        c.image_url as photoUrl,
        COALESCE((SELECT COUNT(*) FROM likes WHERE checkin_id = c.id), 0) as likes,
        COALESCE((SELECT COUNT(*) FROM comments WHERE checkin_id = c.id), 0) as comments,
        (c.rating * 2 + COALESCE((SELECT COUNT(*) FROM likes WHERE checkin_id = c.id), 0) * 3 + COALESCE((SELECT COUNT(*) FROM comments WHERE checkin_id = c.id), 0) * 5) as engagementScore
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at <= ?
        AND u.username != 'openclaw_tester'
      ORDER BY engagementScore DESC, c.rating DESC
      LIMIT 1
    `).bind(weekStartTs, weekEndTs).first<BestCheckin>();
    
    // 3. Rising Star - Most improved from last week
    const risingStarQuery = await db.prepare(`
      WITH weekly_counts AS (
        SELECT 
          u.username,
          COALESCE((SELECT COUNT(*) FROM checkins WHERE user_id = u.id AND created_at >= ? AND created_at <= ?), 0) as this_week,
          COALESCE((SELECT COUNT(*) FROM checkins WHERE user_id = u.id AND created_at >= ? AND created_at < ?), 0) as last_week
        FROM users u
        WHERE u.username != 'openclaw_tester'
      )
      SELECT 
        username,
        this_week as thisWeekCheckins,
        last_week as lastWeekCheckins,
        CASE 
          WHEN last_week = 0 AND this_week > 0 THEN 100
          WHEN last_week > 0 THEN ROUND(((this_week - last_week) * 100.0 / last_week), 1)
          ELSE 0
        END as growthPercent
      FROM weekly_counts
      WHERE this_week > last_week AND this_week >= 2
      ORDER BY growthPercent DESC, this_week DESC
      LIMIT 1
    `).bind(weekStartTs, weekEndTs, lastWeekStartTs, weekStartTs).first<RisingStar>();
    
    // 4. Social Butterfly - Most social activity given
    const socialButterflyQuery = await db.prepare(`
      SELECT 
        u.username,
        COALESCE((SELECT COUNT(*) FROM likes WHERE user_id = u.id AND created_at >= ? AND created_at <= ?), 0) as likesGiven,
        COALESCE((SELECT COUNT(*) FROM comments WHERE user_id = u.id AND created_at >= ? AND created_at <= ?), 0) as commentsGiven,
        COALESCE((SELECT COUNT(*) FROM follows WHERE follower_id = u.id AND created_at >= ? AND created_at <= ?), 0) as followsGiven,
        (
          COALESCE((SELECT COUNT(*) FROM likes WHERE user_id = u.id AND created_at >= ? AND created_at <= ?), 0) +
          COALESCE((SELECT COUNT(*) FROM comments WHERE user_id = u.id AND created_at >= ? AND created_at <= ?), 0) * 2 +
          COALESCE((SELECT COUNT(*) FROM follows WHERE follower_id = u.id AND created_at >= ? AND created_at <= ?), 0)
        ) as totalGiven
      FROM users u
      WHERE u.username != 'openclaw_tester'
      HAVING totalGiven > 0
      ORDER BY totalGiven DESC
      LIMIT 1
    `).bind(
      weekStartTs, weekEndTs,
      weekStartTs, weekEndTs,
      weekStartTs, weekEndTs,
      weekStartTs, weekEndTs,
      weekStartTs, weekEndTs,
      weekStartTs, weekEndTs
    ).first<SocialButterfly>();
    
    // 5. Streak Champion - Longest active streak
    const streakChampionQuery = await db.prepare(`
      SELECT 
        u.username,
        COALESCE(s.current_streak, 0) as currentStreak
      FROM users u
      LEFT JOIN streaks s ON u.id = s.user_id
      WHERE u.username != 'openclaw_tester'
        AND COALESCE(s.current_streak, 0) > 0
      ORDER BY currentStreak DESC
      LIMIT 1
    `).first<StreakChampion>();
    
    // Weekly stats
    const weeklyStatsQuery = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM checkins WHERE created_at >= ? AND created_at <= ?) as totalCheckins,
        (SELECT COUNT(*) FROM likes WHERE created_at >= ? AND created_at <= ?) as totalLikes,
        (SELECT COUNT(*) FROM comments WHERE created_at >= ? AND created_at <= ?) as totalComments,
        (SELECT COUNT(*) FROM users WHERE created_at >= ? AND created_at <= ?) as newUsers,
        (SELECT AVG(rating) FROM checkins WHERE created_at >= ? AND created_at <= ?) as avgRating
    `).bind(
      weekStartTs, weekEndTs,
      weekStartTs, weekEndTs,
      weekStartTs, weekEndTs,
      weekStartTs, weekEndTs,
      weekStartTs, weekEndTs
    ).first<{
      totalCheckins: number;
      totalLikes: number;
      totalComments: number;
      newUsers: number;
      avgRating: number | null;
    }>();
    
    // Honorable mentions - other achievements
    const honorableMentions: { username: string; achievement: string; icon: string }[] = [];
    
    // Night Owl - most late night smokes
    const nightOwl = await db.prepare(`
      SELECT u.username, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at <= ?
        AND u.username != 'openclaw_tester'
        AND (strftime('%H', c.created_at, 'unixepoch', 'localtime') >= '22' 
             OR strftime('%H', c.created_at, 'unixepoch', 'localtime') < '05')
      GROUP BY u.id
      HAVING count >= 2
      ORDER BY count DESC
      LIMIT 1
    `).bind(weekStartTs, weekEndTs).first<{ username: string; count: number }>();
    
    if (nightOwl) {
      honorableMentions.push({
        username: nightOwl.username,
        achievement: `Night Owl (${nightOwl.count} late night smokes)`,
        icon: "🦉"
      });
    }
    
    // Early Bird - most morning smokes
    const earlyBird = await db.prepare(`
      SELECT u.username, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at <= ?
        AND u.username != 'openclaw_tester'
        AND strftime('%H', c.created_at, 'unixepoch', 'localtime') >= '05'
        AND strftime('%H', c.created_at, 'unixepoch', 'localtime') < '09'
      GROUP BY u.id
      HAVING count >= 2
      ORDER BY count DESC
      LIMIT 1
    `).bind(weekStartTs, weekEndTs).first<{ username: string; count: number }>();
    
    if (earlyBird) {
      honorableMentions.push({
        username: earlyBird.username,
        achievement: `Early Bird (${earlyBird.count} morning smokes)`,
        icon: "🐦"
      });
    }
    
    // Connoisseur - highest average rating
    const connoisseur = await db.prepare(`
      SELECT u.username, AVG(c.rating) as avgRating, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at <= ?
        AND u.username != 'openclaw_tester'
      GROUP BY u.id
      HAVING count >= 3
      ORDER BY avgRating DESC
      LIMIT 1
    `).bind(weekStartTs, weekEndTs).first<{ username: string; avgRating: number; count: number }>();
    
    if (connoisseur && connoisseur.avgRating >= 4.5) {
      honorableMentions.push({
        username: connoisseur.username,
        achievement: `Connoisseur (${connoisseur.avgRating.toFixed(1)}★ avg)`,
        icon: "🎩"
      });
    }
    
    // Format dates
    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const response: MVPAwardsData = {
      weekOf: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      
      mvp: mvpQuery || null,
      bestCheckin: bestCheckinQuery || null,
      risingStar: risingStarQuery || null,
      socialButterfly: socialButterflyQuery || null,
      streakChampion: streakChampionQuery || null,
      
      honorableMentions,
      
      weeklyStats: {
        totalCheckins: weeklyStatsQuery?.totalCheckins || 0,
        totalLikes: weeklyStatsQuery?.totalLikes || 0,
        totalComments: weeklyStatsQuery?.totalComments || 0,
        newUsers: weeklyStatsQuery?.newUsers || 0,
        avgRating: weeklyStatsQuery?.avgRating || 0
      },
      
      previousWinners: [] // Could implement historical tracking later
    };
    
    return Response.json(response);
  } catch (error) {
    console.error("MVP Awards API error:", error);
    return Response.json({ error: "Failed to fetch MVP awards" }, { status: 500 });
  }
}
