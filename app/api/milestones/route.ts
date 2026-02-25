import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface Milestone {
  id: string;
  title: string;
  description: string;
  emoji: string;
  achieved: boolean;
  achievedAt?: string;
  progress?: number;
  target?: number;
  shareText?: string;
  category: "checkins" | "brands" | "social" | "streaks" | "time" | "special";
}

interface MilestonesResponse {
  achieved: Milestone[];
  upcoming: Milestone[];
  recentMilestone: Milestone | null;
  stats: {
    totalAchieved: number;
    totalMilestones: number;
    nextUp: Milestone | null;
  };
  error?: string;
}

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return Response.json({ error: "Unauthorized" } as MilestonesResponse, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Session expired" } as MilestonesResponse, { status: 401 });
    }

    const userId = session.user_id;

    // Get user stats in parallel
    const [
      userResult,
      checkinsResult,
      brandsResult,
      followersResult,
      followingResult,
      likesGivenResult,
      commentsGivenResult,
      fiveStarsResult,
      photosResult,
      streakResult,
    ] = await Promise.all([
      db.prepare("SELECT created_at FROM users WHERE id = ?").bind(userId).first<{ created_at: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(DISTINCT brand) as count FROM checkins WHERE user_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM follows WHERE following_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM follows WHERE follower_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM likes WHERE user_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM comments WHERE user_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND rating = 5").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND image_url IS NOT NULL").bind(userId).first<{ count: number }>(),
      // Get current streak (simplified)
      db.prepare(`
        SELECT COUNT(DISTINCT date(created_at, 'unixepoch')) as streak_days
        FROM checkins
        WHERE user_id = ?
          AND created_at >= unixepoch() - (7 * 86400)
      `).bind(userId).first<{ streak_days: number }>(),
    ]);

    const stats = {
      checkins: checkinsResult?.count || 0,
      brands: brandsResult?.count || 0,
      followers: followersResult?.count || 0,
      following: followingResult?.count || 0,
      likesGiven: likesGivenResult?.count || 0,
      commentsGiven: commentsGivenResult?.count || 0,
      fiveStars: fiveStarsResult?.count || 0,
      photos: photosResult?.count || 0,
      streak: streakResult?.streak_days || 0,
      joinedAt: userResult?.created_at || 0,
    };

    const now = Math.floor(Date.now() / 1000);
    const daysSinceJoin = Math.floor((now - stats.joinedAt) / 86400);

    const milestones: Milestone[] = [];

    // Check-in milestones
    const checkinMilestones = [
      { count: 1, title: "First Smoke", emoji: "🚬", desc: "Logged your first smoke!" },
      { count: 10, title: "Getting Started", emoji: "🔥", desc: "10 check-ins logged" },
      { count: 25, title: "Regular", emoji: "💨", desc: "25 check-ins - you're a regular!" },
      { count: 50, title: "Half Century", emoji: "🎯", desc: "50 smokes logged" },
      { count: 100, title: "Century Club", emoji: "💯", desc: "100 check-ins achieved!" },
      { count: 250, title: "Dedicated", emoji: "🏆", desc: "250 smokes - seriously dedicated" },
      { count: 500, title: "Legend", emoji: "👑", desc: "500 check-ins - legendary status" },
      { count: 1000, title: "The Thousand", emoji: "🌟", desc: "1000 smokes! Incredible!" },
    ];

    for (const m of checkinMilestones) {
      const achieved = stats.checkins >= m.count;
      milestones.push({
        id: `checkins-${m.count}`,
        title: m.title,
        description: m.desc,
        emoji: m.emoji,
        achieved,
        progress: achieved ? m.count : stats.checkins,
        target: m.count,
        category: "checkins",
        shareText: achieved ? `Just hit ${m.count} smoke${m.count > 1 ? "s" : ""} on Puffed! ${m.emoji}` : undefined,
      });
    }

    // Brand explorer milestones
    const brandMilestones = [
      { count: 5, title: "Explorer", emoji: "🗺️", desc: "Tried 5 different brands" },
      { count: 10, title: "Adventurer", emoji: "🧭", desc: "10 brands explored" },
      { count: 25, title: "Connoisseur", emoji: "🎩", desc: "25 unique brands - refined taste!" },
      { count: 50, title: "World Traveler", emoji: "🌍", desc: "50 brands - truly well-traveled" },
      { count: 100, title: "Brand Master", emoji: "🏅", desc: "100 brands - nothing left to discover!" },
    ];

    for (const m of brandMilestones) {
      const achieved = stats.brands >= m.count;
      milestones.push({
        id: `brands-${m.count}`,
        title: m.title,
        description: m.desc,
        emoji: m.emoji,
        achieved,
        progress: achieved ? m.count : stats.brands,
        target: m.count,
        category: "brands",
        shareText: achieved ? `Explored ${m.count} different brands on Puffed! ${m.emoji}` : undefined,
      });
    }

    // Social milestones
    const socialMilestones = [
      { count: 1, title: "First Fan", emoji: "👋", desc: "Got your first follower!", type: "followers" as const },
      { count: 5, title: "Rising Star", emoji: "⭐", desc: "5 followers - people notice you!", type: "followers" as const },
      { count: 10, title: "Influencer", emoji: "📣", desc: "10 followers - your opinions matter", type: "followers" as const },
      { count: 25, title: "Popular", emoji: "🌟", desc: "25 followers!", type: "followers" as const },
      { count: 10, title: "Supporter", emoji: "❤️", desc: "Gave 10 likes - spreading love", type: "likes" as const },
      { count: 25, title: "Cheerleader", emoji: "💕", desc: "25 likes given", type: "likes" as const },
      { count: 5, title: "Conversationalist", emoji: "💬", desc: "Left 5 comments", type: "comments" as const },
      { count: 25, title: "Critic", emoji: "📝", desc: "25 comments - your voice is heard", type: "comments" as const },
    ];

    for (const m of socialMilestones) {
      const value = m.type === "followers" ? stats.followers : m.type === "likes" ? stats.likesGiven : stats.commentsGiven;
      const achieved = value >= m.count;
      milestones.push({
        id: `social-${m.type}-${m.count}`,
        title: m.title,
        description: m.desc,
        emoji: m.emoji,
        achieved,
        progress: achieved ? m.count : value,
        target: m.count,
        category: "social",
        shareText: achieved ? `${m.desc} on Puffed! ${m.emoji}` : undefined,
      });
    }

    // Streak milestones
    const streakMilestones = [
      { count: 3, title: "Consistent", emoji: "🔥", desc: "3-day streak!" },
      { count: 7, title: "Week Warrior", emoji: "📅", desc: "7-day streak - a full week!" },
    ];

    for (const m of streakMilestones) {
      const achieved = stats.streak >= m.count;
      milestones.push({
        id: `streak-${m.count}`,
        title: m.title,
        description: m.desc,
        emoji: m.emoji,
        achieved,
        progress: achieved ? m.count : stats.streak,
        target: m.count,
        category: "streaks",
        shareText: achieved ? `${m.count}-day smoking streak on Puffed! ${m.emoji}` : undefined,
      });
    }

    // Time-based milestones (membership anniversaries)
    const timeMilestones = [
      { days: 7, title: "One Week", emoji: "🎉", desc: "1 week on Puffed!" },
      { days: 30, title: "One Month", emoji: "🌙", desc: "1 month member!" },
      { days: 90, title: "Three Months", emoji: "🌿", desc: "3 months - you're a veteran" },
      { days: 180, title: "Half Year", emoji: "🌞", desc: "6 months on the platform!" },
      { days: 365, title: "One Year", emoji: "🎂", desc: "1 year anniversary!" },
    ];

    for (const m of timeMilestones) {
      const achieved = daysSinceJoin >= m.days;
      milestones.push({
        id: `time-${m.days}`,
        title: m.title,
        description: m.desc,
        emoji: m.emoji,
        achieved,
        progress: achieved ? m.days : daysSinceJoin,
        target: m.days,
        category: "time",
        shareText: achieved ? `${m.desc} 🎊` : undefined,
      });
    }

    // Special milestones
    if (stats.fiveStars >= 1) {
      milestones.push({
        id: "special-first-five-star",
        title: "Perfect Find",
        description: "Gave your first 5-star rating!",
        emoji: "⭐",
        achieved: true,
        category: "special",
        shareText: "Found a perfect 5-star smoke on Puffed! ⭐",
      });
    }

    if (stats.photos >= 10) {
      milestones.push({
        id: "special-photographer",
        title: "Smoke Photographer",
        description: "Uploaded 10+ photos",
        emoji: "📸",
        achieved: true,
        category: "special",
        shareText: "Captured 10+ smoke moments on Puffed! 📸",
      });
    }

    // Sort: achieved first, then by category
    const categoryOrder = ["checkins", "brands", "social", "streaks", "time", "special"];
    milestones.sort((a, b) => {
      // Achieved first
      if (a.achieved && !b.achieved) return -1;
      if (!a.achieved && b.achieved) return 1;
      // Then by category
      return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    });

    const achieved = milestones.filter((m) => m.achieved);
    const upcoming = milestones.filter((m) => !m.achieved).slice(0, 6);

    // Find newest achievement (for celebration prompt)
    const recentMilestone = achieved.length > 0 ? achieved[0] : null;

    return Response.json({
      achieved,
      upcoming,
      recentMilestone,
      stats: {
        totalAchieved: achieved.length,
        totalMilestones: milestones.length,
        nextUp: upcoming[0] || null,
      },
    } as MilestonesResponse);
  } catch (error) {
    console.error("Milestones error:", error);
    return Response.json({ error: "Internal error" } as MilestonesResponse, { status: 500 });
  }
}
