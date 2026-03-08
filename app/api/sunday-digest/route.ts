import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface SundayDigest {
  isEnjoySunday: boolean;
  thisWeek: {
    newUsers: number;
    checkins: number;
    likes: number;
    follows: number;
    comments: number;
  };
  lastWeek: {
    newUsers: number;
    checkins: number;
    likes: number;
    follows: number;
    comments: number;
  };
  growth: {
    usersGrowth: number;
    checkinsGrowth: number;
    engagementGrowth: number;
  };
  topBrandThisWeek: string | null;
  mostActiveUser: string | null;
  communityMessage: string;
}

export async function GET(): Promise<Response> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const now = Math.floor(Date.now() / 1000);
    const oneWeekAgo = now - 7 * 24 * 60 * 60;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60;

    // This week's stats
    const thisWeek = await db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE created_at > ?) as new_users,
        (SELECT COUNT(*) FROM checkins WHERE created_at > ?) as checkins,
        (SELECT COUNT(*) FROM likes WHERE created_at > ?) as likes,
        (SELECT COUNT(*) FROM follows WHERE created_at > ?) as follows,
        (SELECT COUNT(*) FROM comments WHERE created_at > ?) as comments
    `).bind(oneWeekAgo, oneWeekAgo, oneWeekAgo, oneWeekAgo, oneWeekAgo).first<{
      new_users: number;
      checkins: number;
      likes: number;
      follows: number;
      comments: number;
    }>();

    // Last week's stats (week before this one)
    const lastWeek = await db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE created_at > ? AND created_at <= ?) as new_users,
        (SELECT COUNT(*) FROM checkins WHERE created_at > ? AND created_at <= ?) as checkins,
        (SELECT COUNT(*) FROM likes WHERE created_at > ? AND created_at <= ?) as likes,
        (SELECT COUNT(*) FROM follows WHERE created_at > ? AND created_at <= ?) as follows,
        (SELECT COUNT(*) FROM comments WHERE created_at > ? AND created_at <= ?) as comments
    `).bind(
      twoWeeksAgo, oneWeekAgo,
      twoWeeksAgo, oneWeekAgo,
      twoWeeksAgo, oneWeekAgo,
      twoWeeksAgo, oneWeekAgo,
      twoWeeksAgo, oneWeekAgo
    ).first<{
      new_users: number;
      checkins: number;
      likes: number;
      follows: number;
      comments: number;
    }>();

    // Top brand this week
    const topBrand = await db.prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins
      WHERE created_at > ?
      GROUP BY LOWER(brand)
      ORDER BY count DESC
      LIMIT 1
    `).bind(oneWeekAgo).first<{ brand: string; count: number }>();

    // Most active user this week
    const mostActive = await db.prepare(`
      SELECT u.username, COUNT(*) as activity
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at > ?
      GROUP BY c.user_id
      ORDER BY activity DESC
      LIMIT 1
    `).bind(oneWeekAgo).first<{ username: string; activity: number }>();

    // Calculate growth percentages
    const tw = thisWeek || { new_users: 0, checkins: 0, likes: 0, follows: 0, comments: 0 };
    const lw = lastWeek || { new_users: 0, checkins: 0, likes: 0, follows: 0, comments: 0 };

    const calcGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const thisWeekEngagement = tw.likes + tw.follows + tw.comments;
    const lastWeekEngagement = lw.likes + lw.follows + lw.comments;

    const growth = {
      usersGrowth: calcGrowth(tw.new_users, lw.new_users),
      checkinsGrowth: calcGrowth(tw.checkins, lw.checkins),
      engagementGrowth: calcGrowth(thisWeekEngagement, lastWeekEngagement),
    };

    // Generate a fun community message based on growth
    let communityMessage = "Happy Sunday! ☕ Take it easy and enjoy your smoke.";
    if (growth.usersGrowth > 50) {
      communityMessage = `Incredible week! ${tw.new_users} new smokers joined! 🎉`;
    } else if (growth.engagementGrowth > 30) {
      communityMessage = "Community vibes are strong! Engagement is way up! 🔥";
    } else if (tw.checkins > 30) {
      communityMessage = `${tw.checkins} smokes logged this week. We're on fire! 💨`;
    } else if (growth.usersGrowth > 0) {
      communityMessage = `Welcome to our ${tw.new_users} new members this week! 👋`;
    }

    const digest: SundayDigest = {
      isEnjoySunday: true,
      thisWeek: {
        newUsers: tw.new_users,
        checkins: tw.checkins,
        likes: tw.likes,
        follows: tw.follows,
        comments: tw.comments,
      },
      lastWeek: {
        newUsers: lw.new_users,
        checkins: lw.checkins,
        likes: lw.likes,
        follows: lw.follows,
        comments: lw.comments,
      },
      growth,
      topBrandThisWeek: topBrand?.brand || null,
      mostActiveUser: mostActive?.username || null,
      communityMessage,
    };

    return Response.json(digest);
  } catch (error) {
    console.error("Sunday digest error:", error);
    return Response.json({ error: "Failed to load digest" }, { status: 500 });
  }
}
