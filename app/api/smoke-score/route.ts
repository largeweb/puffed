import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface ScoreBreakdown {
  category: string;
  emoji: string;
  points: number;
  maxPoints: number;
  description: string;
  detail: string;
}

interface LeaderEntry {
  username: string;
  totalScore: number;
  rank: number;
  tier: string;
  tierEmoji: string;
}

interface SmokeScoreResponse {
  totalScore: number;
  maxPossible: number;
  breakdown: ScoreBreakdown[];
  rank: number;
  totalUsers: number;
  percentile: number;
  tier: string;
  tierEmoji: string;
  nextTier: { name: string; pointsNeeded: number } | null;
  leaderboard: LeaderEntry[];
  tips: string[];
}

function getTier(score: number): { name: string; emoji: string; minScore: number } {
  if (score >= 1000) return { name: "Legendary", emoji: "👑", minScore: 1000 };
  if (score >= 750) return { name: "Master", emoji: "🏆", minScore: 750 };
  if (score >= 500) return { name: "Expert", emoji: "⭐", minScore: 500 };
  if (score >= 300) return { name: "Enthusiast", emoji: "🔥", minScore: 300 };
  if (score >= 150) return { name: "Regular", emoji: "💨", minScore: 150 };
  if (score >= 50) return { name: "Newcomer", emoji: "🌱", minScore: 50 };
  return { name: "Rookie", emoji: "🚬", minScore: 0 };
}

function getNextTier(score: number): { name: string; pointsNeeded: number } | null {
  const tiers = [
    { name: "Newcomer", minScore: 50 },
    { name: "Regular", minScore: 150 },
    { name: "Enthusiast", minScore: 300 },
    { name: "Expert", minScore: 500 },
    { name: "Master", minScore: 750 },
    { name: "Legendary", minScore: 1000 },
  ];
  
  for (const tier of tiers) {
    if (score < tier.minScore) {
      return { name: tier.name, pointsNeeded: tier.minScore - score };
    }
  }
  return null; // Already at max tier
}

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { env } = getRequestContext();
  const db = env.DB;

  // Verify session
  const user = await db
    .prepare("SELECT id, username FROM users WHERE id = ?")
    .bind(session)
    .first<{ id: string; username: string }>();

  if (!user) {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }

  // Get user stats for scoring
  const stats = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM checkins WHERE user_id = ?) as checkins,
      (SELECT COUNT(DISTINCT brand) FROM checkins WHERE user_id = ?) as unique_brands,
      (SELECT COUNT(*) FROM checkins WHERE user_id = ? AND image_url IS NOT NULL) as photos,
      (SELECT COUNT(*) FROM checkins WHERE user_id = ? AND review IS NOT NULL AND review != '') as reviews,
      (SELECT COUNT(*) FROM likes WHERE user_id = ?) as likes_given,
      (SELECT COUNT(*) FROM likes l JOIN checkins c ON l.checkin_id = c.id WHERE c.user_id = ?) as likes_received,
      (SELECT COUNT(*) FROM comments WHERE user_id = ?) as comments_given,
      (SELECT COUNT(*) FROM comments cm JOIN checkins c ON cm.checkin_id = c.id WHERE c.user_id = ? AND cm.user_id != ?) as comments_received,
      (SELECT COUNT(*) FROM reactions WHERE user_id = ?) as reactions_given,
      (SELECT COUNT(*) FROM reactions r JOIN checkins c ON r.checkin_id = c.id WHERE c.user_id = ?) as reactions_received,
      (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following,
      (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followers,
      (SELECT MAX(rating) FROM checkins WHERE user_id = ?) as max_rating
  `).bind(
    user.id, user.id, user.id, user.id, user.id, user.id,
    user.id, user.id, user.id, user.id, user.id, user.id, user.id, user.id
  ).first<{
    checkins: number;
    unique_brands: number;
    photos: number;
    reviews: number;
    likes_given: number;
    likes_received: number;
    comments_given: number;
    comments_received: number;
    reactions_given: number;
    reactions_received: number;
    following: number;
    followers: number;
    max_rating: number | null;
  }>();

  if (!stats) {
    return Response.json({ error: "Failed to get stats" }, { status: 500 });
  }

  // Get streak info
  const streakData = await db.prepare(`
    SELECT date(created_at, 'unixepoch') as date
    FROM checkins 
    WHERE user_id = ? 
    GROUP BY date(created_at, 'unixepoch')
    ORDER BY date DESC
    LIMIT 100
  `).bind(user.id).all<{ date: string }>();

  const dates = streakData.results.map(r => r.date);
  let currentStreak = 0;
  let bestStreak = 0;

  if (dates.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = (() => {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return y.toISOString().split('T')[0];
    })();

    if (dates[0] === today || dates[0] === yesterday) {
      let expectedDate = dates[0];
      for (const date of dates) {
        if (date === expectedDate) {
          currentStreak++;
          const dateObj = new Date(expectedDate + 'T12:00:00Z');
          dateObj.setUTCDate(dateObj.getUTCDate() - 1);
          expectedDate = dateObj.toISOString().split('T')[0];
        } else if (date < expectedDate) {
          break;
        }
      }
    }

    let tempStreak = 1;
    bestStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prevDateObj = new Date(dates[i - 1] + 'T12:00:00Z');
      prevDateObj.setUTCDate(prevDateObj.getUTCDate() - 1);
      const expectedPrev = prevDateObj.toISOString().split('T')[0];
      if (expectedPrev === dates[i]) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
  }

  // Get badge count
  const badgeCount = await db.prepare(`
    SELECT COUNT(*) as count FROM user_badges WHERE user_id = ?
  `).bind(user.id).first<{ count: number }>();

  const badges = badgeCount?.count || 0;

  // Calculate score breakdown
  const breakdown: ScoreBreakdown[] = [
    {
      category: "Check-ins",
      emoji: "🚬",
      points: Math.min(stats.checkins * 5, 200),
      maxPoints: 200,
      description: "Log your smokes",
      detail: `${stats.checkins} check-ins × 5 pts`
    },
    {
      category: "Brand Explorer",
      emoji: "🗺️",
      points: Math.min(stats.unique_brands * 10, 150),
      maxPoints: 150,
      description: "Try different brands",
      detail: `${stats.unique_brands} unique brands × 10 pts`
    },
    {
      category: "Photographer",
      emoji: "📸",
      points: Math.min(stats.photos * 3, 100),
      maxPoints: 100,
      description: "Share photos",
      detail: `${stats.photos} photos × 3 pts`
    },
    {
      category: "Reviewer",
      emoji: "✍️",
      points: Math.min(stats.reviews * 5, 100),
      maxPoints: 100,
      description: "Write reviews",
      detail: `${stats.reviews} reviews × 5 pts`
    },
    {
      category: "Streak Power",
      emoji: "🔥",
      points: Math.min(currentStreak * 10 + bestStreak * 5, 150),
      maxPoints: 150,
      description: "Maintain streaks",
      detail: `Current: ${currentStreak}d, Best: ${bestStreak}d`
    },
    {
      category: "Social Butterfly",
      emoji: "🦋",
      points: Math.min((stats.likes_given + stats.comments_given + stats.reactions_given) * 2, 100),
      maxPoints: 100,
      description: "Engage with others",
      detail: `${stats.likes_given + stats.comments_given + stats.reactions_given} engagements × 2 pts`
    },
    {
      category: "Community Star",
      emoji: "⭐",
      points: Math.min((stats.likes_received + stats.comments_received + stats.reactions_received) * 3, 150),
      maxPoints: 150,
      description: "Get engagement",
      detail: `${stats.likes_received + stats.comments_received + stats.reactions_received} received × 3 pts`
    },
    {
      category: "Network",
      emoji: "🤝",
      points: Math.min(stats.followers * 5 + stats.following * 2, 100),
      maxPoints: 100,
      description: "Build connections",
      detail: `${stats.followers} followers, ${stats.following} following`
    },
    {
      category: "Badge Collector",
      emoji: "🏅",
      points: Math.min(badges * 10, 150),
      maxPoints: 150,
      description: "Earn badges",
      detail: `${badges} badges × 10 pts`
    },
  ];

  const totalScore = breakdown.reduce((sum, b) => sum + b.points, 0);
  const maxPossible = breakdown.reduce((sum, b) => sum + b.maxPoints, 0);

  // Get leaderboard (all users ranked by score)
  const allUsersData = await db.prepare(`
    SELECT 
      u.id,
      u.username,
      (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) as checkins,
      (SELECT COUNT(DISTINCT brand) FROM checkins WHERE user_id = u.id) as brands,
      (SELECT COUNT(*) FROM checkins WHERE user_id = u.id AND image_url IS NOT NULL) as photos,
      (SELECT COUNT(*) FROM checkins WHERE user_id = u.id AND review IS NOT NULL AND review != '') as reviews,
      (SELECT COUNT(*) FROM likes WHERE user_id = u.id) as likes_given,
      (SELECT COUNT(*) FROM likes l JOIN checkins c ON l.checkin_id = c.id WHERE c.user_id = u.id) as likes_received,
      (SELECT COUNT(*) FROM comments WHERE user_id = u.id) as comments_given,
      (SELECT COUNT(*) FROM comments cm JOIN checkins c ON cm.checkin_id = c.id WHERE c.user_id = u.id AND cm.user_id != u.id) as comments_received,
      (SELECT COUNT(*) FROM reactions WHERE user_id = u.id) as reactions_given,
      (SELECT COUNT(*) FROM reactions r JOIN checkins c ON r.checkin_id = c.id WHERE c.user_id = u.id) as reactions_received,
      (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers,
      (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following,
      (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) as badges
    FROM users u
  `).all<{
    id: string;
    username: string;
    checkins: number;
    brands: number;
    photos: number;
    reviews: number;
    likes_given: number;
    likes_received: number;
    comments_given: number;
    comments_received: number;
    reactions_given: number;
    reactions_received: number;
    followers: number;
    following: number;
    badges: number;
  }>();

  // Calculate scores for all users (using same streak logic would be complex, so simplify)
  const userScores = allUsersData.results.map(u => {
    const score = 
      Math.min(u.checkins * 5, 200) +
      Math.min(u.brands * 10, 150) +
      Math.min(u.photos * 3, 100) +
      Math.min(u.reviews * 5, 100) +
      Math.min((u.likes_given + u.comments_given + u.reactions_given) * 2, 100) +
      Math.min((u.likes_received + u.comments_received + u.reactions_received) * 3, 150) +
      Math.min(u.followers * 5 + u.following * 2, 100) +
      Math.min(u.badges * 10, 150);
    // Note: streak not included in leaderboard calc for simplicity
    const tier = getTier(score);
    return {
      id: u.id,
      username: u.username,
      totalScore: score,
      tier: tier.name,
      tierEmoji: tier.emoji,
    };
  }).sort((a, b) => b.totalScore - a.totalScore);

  const leaderboard = userScores.slice(0, 10).map((u, i) => ({
    ...u,
    rank: i + 1,
  }));

  const userRank = userScores.findIndex(u => u.id === user.id) + 1;
  const percentile = Math.round((1 - userRank / userScores.length) * 100);

  const tier = getTier(totalScore);
  const nextTier = getNextTier(totalScore);

  // Generate improvement tips
  const tips: string[] = [];
  const sortedBreakdown = [...breakdown].sort((a, b) => (a.points / a.maxPoints) - (b.points / b.maxPoints));
  
  for (let i = 0; i < Math.min(2, sortedBreakdown.length); i++) {
    const b = sortedBreakdown[i];
    if (b.points < b.maxPoints) {
      if (b.category === "Check-ins") tips.push("Log more smokes to boost your score!");
      else if (b.category === "Brand Explorer") tips.push("Try new brands to earn explorer points!");
      else if (b.category === "Photographer") tips.push("Add photos to your check-ins!");
      else if (b.category === "Reviewer") tips.push("Write reviews to share your thoughts!");
      else if (b.category === "Streak Power") tips.push("Keep your streak going for bonus points!");
      else if (b.category === "Social Butterfly") tips.push("Like and comment on others' smokes!");
      else if (b.category === "Community Star") tips.push("Share great content to get more engagement!");
      else if (b.category === "Network") tips.push("Follow more users and grow your network!");
      else if (b.category === "Badge Collector") tips.push("Check your achievements page for new badges!");
    }
  }

  const response: SmokeScoreResponse = {
    totalScore,
    maxPossible,
    breakdown,
    rank: userRank,
    totalUsers: userScores.length,
    percentile,
    tier: tier.name,
    tierEmoji: tier.emoji,
    nextTier,
    leaderboard,
    tips,
  };

  return Response.json(response);
}
