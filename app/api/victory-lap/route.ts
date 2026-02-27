import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface WeeklyWin {
  type: "checkin" | "social" | "streak" | "badge" | "discovery" | "engagement";
  title: string;
  description: string;
  emoji: string;
  value?: number;
  highlight?: string;
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    const session = await db.prepare(
      "SELECT user_id FROM sessions WHERE id = ?"
    ).bind(sessionToken).first<{ user_id: string }>();
    
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    
    const userId = session.user_id;
    
    // Get user info
    const user = await db.prepare(
      "SELECT username, current_streak, longest_streak FROM users WHERE id = ?"
    ).bind(userId).first<{ username: string; current_streak: number; longest_streak: number }>();
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get start of current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - daysToMonday);
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekStartTs = Math.floor(weekStart.getTime() / 1000);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);
    
    // Format dates for display
    const formatDate = (d: Date) => {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    // Get weekly stats
    const statsResult = await db.prepare(`
      SELECT 
        COUNT(*) as total_smokes,
        COUNT(DISTINCT brand) as unique_brands,
        AVG(rating) as avg_rating
      FROM checkins 
      WHERE user_id = ? AND created_at >= ?
    `).bind(userId, weekStartTs).first<{ total_smokes: number; unique_brands: number; avg_rating: number | null }>();

    // Get likes received this week
    const likesResult = await db.prepare(`
      SELECT COUNT(*) as cnt FROM likes l
      JOIN checkins c ON l.checkin_id = c.id
      WHERE c.user_id = ? AND l.created_at >= ?
    `).bind(userId, weekStartTs).first<{ cnt: number }>();

    // Get comments received this week
    const commentsResult = await db.prepare(`
      SELECT COUNT(*) as cnt FROM comments c
      JOIN checkins ch ON c.checkin_id = ch.id
      WHERE ch.user_id = ? AND c.user_id != ? AND c.created_at >= ?
    `).bind(userId, userId, weekStartTs).first<{ cnt: number }>();

    // Get reactions received this week
    const reactionsResult = await db.prepare(`
      SELECT COUNT(*) as cnt FROM reactions r
      JOIN checkins c ON r.checkin_id = c.id
      WHERE c.user_id = ? AND r.created_at >= ?
    `).bind(userId, weekStartTs).first<{ cnt: number }>();

    // Get new followers this week
    const followersResult = await db.prepare(`
      SELECT COUNT(*) as cnt FROM follows
      WHERE following_id = ? AND created_at >= ?
    `).bind(userId, weekStartTs).first<{ cnt: number }>();

    // Get best smoke of the week (most engagement)
    const bestSmokeResult = await db.prepare(`
      SELECT 
        c.id,
        c.brand,
        c.product,
        c.rating,
        c.review,
        c.image_url,
        c.created_at,
        (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as likes,
        (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) as comments,
        (SELECT COUNT(*) FROM reactions WHERE checkin_id = c.id) as reactions
      FROM checkins c
      WHERE c.user_id = ? AND c.created_at >= ?
      ORDER BY (
        (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) * 2 +
        (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) * 3 +
        (SELECT COUNT(*) FROM reactions WHERE checkin_id = c.id)
      ) DESC
      LIMIT 1
    `).bind(userId, weekStartTs).first<{
      id: number;
      brand: string;
      product: string | null;
      rating: number | null;
      review: string | null;
      image_url: string | null;
      created_at: number;
      likes: number;
      comments: number;
      reactions: number;
    }>();

    // Get user's weekly rank
    const rankResult = await db.prepare(`
      SELECT COUNT(*) + 1 as rank FROM (
        SELECT user_id, COUNT(*) as cnt 
        FROM checkins 
        WHERE created_at >= ?
        GROUP BY user_id
        HAVING cnt > (
          SELECT COUNT(*) FROM checkins WHERE user_id = ? AND created_at >= ?
        )
      )
    `).bind(weekStartTs, userId, weekStartTs).first<{ rank: number }>();

    const totalUsersResult = await db.prepare(`
      SELECT COUNT(DISTINCT user_id) as cnt FROM checkins WHERE created_at >= ?
    `).bind(weekStartTs).first<{ cnt: number }>();

    // Build wins array
    const wins: WeeklyWin[] = [];
    const totalSmokes = statsResult?.total_smokes || 0;
    const totalLikes = likesResult?.cnt || 0;
    const totalComments = commentsResult?.cnt || 0;
    const totalReactions = reactionsResult?.cnt || 0;
    const uniqueBrands = statsResult?.unique_brands || 0;
    const newFollowers = followersResult?.cnt || 0;

    // Smoking wins
    if (totalSmokes >= 7) {
      wins.push({
        type: "checkin",
        title: "Daily Smoker",
        description: "Logged a smoke every day this week!",
        emoji: "🔥",
        value: totalSmokes,
      });
    } else if (totalSmokes >= 5) {
      wins.push({
        type: "checkin",
        title: "Active Week",
        description: "Logged 5+ smokes this week",
        emoji: "💨",
        value: totalSmokes,
      });
    } else if (totalSmokes >= 3) {
      wins.push({
        type: "checkin",
        title: "Getting Started",
        description: "Logged 3+ smokes this week",
        emoji: "✨",
        value: totalSmokes,
      });
    }

    // Social wins
    if (totalLikes >= 10) {
      wins.push({
        type: "social",
        title: "Popular Smoker",
        description: "Your smokes got 10+ likes!",
        emoji: "❤️",
        value: totalLikes,
      });
    } else if (totalLikes >= 5) {
      wins.push({
        type: "social",
        title: "Liked",
        description: "People are loving your smokes",
        emoji: "👍",
        value: totalLikes,
      });
    }

    if (totalComments >= 5) {
      wins.push({
        type: "social",
        title: "Conversation Starter",
        description: "Your smokes sparked conversations!",
        emoji: "💬",
        value: totalComments,
      });
    }

    if (newFollowers >= 3) {
      wins.push({
        type: "social",
        title: "Rising Star",
        description: "Gained 3+ new followers!",
        emoji: "⭐",
        value: newFollowers,
      });
    } else if (newFollowers >= 1) {
      wins.push({
        type: "social",
        title: "New Fan",
        description: "Someone new is following you!",
        emoji: "👋",
        value: newFollowers,
      });
    }

    // Discovery wins
    if (uniqueBrands >= 5) {
      wins.push({
        type: "discovery",
        title: "Explorer",
        description: "Tried 5+ different brands",
        emoji: "🧭",
        value: uniqueBrands,
      });
    } else if (uniqueBrands >= 3) {
      wins.push({
        type: "discovery",
        title: "Variety Seeker",
        description: "Tried 3+ different brands",
        emoji: "🌈",
        value: uniqueBrands,
      });
    }

    // Streak wins
    const currentStreak = user.current_streak || 0;
    const longestStreak = user.longest_streak || 0;
    const streakImproved = currentStreak === longestStreak && currentStreak > 1;

    if (currentStreak >= 7) {
      wins.push({
        type: "streak",
        title: "Week Warrior",
        description: "7+ day streak!",
        emoji: "🔥",
        value: currentStreak,
      });
    } else if (currentStreak >= 3) {
      wins.push({
        type: "streak",
        title: "On a Roll",
        description: "3+ day streak going",
        emoji: "🌟",
        value: currentStreak,
      });
    }

    // Engagement wins
    if (totalReactions >= 10) {
      wins.push({
        type: "engagement",
        title: "Fire Content",
        description: "10+ reactions on your smokes!",
        emoji: "⚡",
        value: totalReactions,
      });
    }

    // Quality wins
    const avgRating = statsResult?.avg_rating;
    if (avgRating && avgRating >= 4.5 && totalSmokes >= 3) {
      wins.push({
        type: "checkin",
        title: "Quality Picks",
        description: "Avg rating of 4.5+ stars",
        emoji: "⭐",
        value: Math.round(avgRating * 10) / 10,
      });
    }

    // Encouragement messages
    const encouragements = [
      "You crushed it this week!",
      "Amazing progress! Keep going!",
      "You're on fire! 🔥",
      "What a week! Time to celebrate.",
      "Your smoke game is strong!",
      "The community loves your vibes!",
      "Keep setting the bar high!",
      "Legend in the making!",
    ];

    const lowActivityEncouragements = [
      "Every journey starts somewhere!",
      "Ready to make next week epic?",
      "Small steps lead to big wins!",
      "The community is waiting for you!",
    ];

    const encouragement = wins.length > 0 
      ? encouragements[Math.floor(Math.random() * encouragements.length)]
      : lowActivityEncouragements[Math.floor(Math.random() * lowActivityEncouragements.length)];

    return NextResponse.json({
      username: user.username,
      weekSummary: {
        totalSmokes,
        totalLikes,
        totalComments,
        totalReactions,
        newFollowers,
        uniqueBrands,
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      },
      wins,
      bestSmoke: bestSmokeResult && bestSmokeResult.id ? {
        id: bestSmokeResult.id,
        brand: bestSmokeResult.brand,
        product: bestSmokeResult.product || undefined,
        rating: bestSmokeResult.rating || undefined,
        review: bestSmokeResult.review || undefined,
        imageUrl: bestSmokeResult.image_url || undefined,
        likes: bestSmokeResult.likes,
        comments: bestSmokeResult.comments,
        reactions: bestSmokeResult.reactions,
        createdAt: bestSmokeResult.created_at,
      } : null,
      streakStatus: {
        current: currentStreak,
        improved: streakImproved,
        previousBest: longestStreak,
      },
      rank: {
        position: rankResult?.rank || 0,
        change: 0, // Would need previous week data to calculate
        totalUsers: totalUsersResult?.cnt || 0,
      },
      encouragement,
      weekStart: formatDate(weekStart),
      weekEnd: formatDate(weekEnd),
    });
  } catch (error) {
    console.error("Victory lap error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
