import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface WeekendWarrior {
  username: string;
  checkins: number;
  likes: number;
  totalActivity: number;
}

interface StreakChampion {
  username: string;
  currentStreak: number;
  bestStreak: number;
}

interface NewMember {
  username: string;
  joinedAt: number;
  checkins: number;
  followers: number;
}

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
  weekendWarriors: WeekendWarrior[];
  weekendStats: {
    totalCheckins: number;
    totalLikes: number;
    activeUsers: number;
  };
  newMembers: NewMember[];
  streakChampions: StreakChampion[];
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

    // Weekend warriors - most active this Sat/Sun
    // Calculate Saturday and Sunday timestamps
    const nowDate = new Date();
    const dayOfWeek = nowDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const todayMidnight = Math.floor(now / 86400) * 86400;
    
    // If it's Sunday (0), Saturday was yesterday. If it's Saturday (6), it's today.
    const saturdayStart = dayOfWeek === 0 
      ? todayMidnight - 86400 // Yesterday
      : dayOfWeek === 6 
        ? todayMidnight // Today
        : todayMidnight - (dayOfWeek + 1) * 86400; // Previous Saturday
    const sundayEnd = saturdayStart + 2 * 86400; // End of Sunday

    // Get weekend warriors with checkins and likes
    const weekendWarriorsResult = await db.prepare(`
      SELECT 
        u.username,
        COALESCE(c.checkin_count, 0) as checkins,
        COALESCE(l.like_count, 0) as likes,
        (COALESCE(c.checkin_count, 0) * 3 + COALESCE(l.like_count, 0)) as total_activity
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) as checkin_count
        FROM checkins
        WHERE created_at >= ? AND created_at < ?
        GROUP BY user_id
      ) c ON u.id = c.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as like_count
        FROM likes
        WHERE created_at >= ? AND created_at < ?
        GROUP BY user_id
      ) l ON u.id = l.user_id
      WHERE c.checkin_count > 0 OR l.like_count > 0
      ORDER BY total_activity DESC
      LIMIT 5
    `).bind(saturdayStart, sundayEnd, saturdayStart, sundayEnd).all<{
      username: string;
      checkins: number;
      likes: number;
      total_activity: number;
    }>();

    // Weekend totals
    const weekendTotals = await db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM checkins WHERE created_at >= ? AND created_at < ?) as checkins,
        (SELECT COUNT(*) FROM likes WHERE created_at >= ? AND created_at < ?) as likes,
        (SELECT COUNT(DISTINCT user_id) FROM checkins WHERE created_at >= ? AND created_at < ?) as active_users
    `).bind(saturdayStart, sundayEnd, saturdayStart, sundayEnd, saturdayStart, sundayEnd).first<{
      checkins: number;
      likes: number;
      active_users: number;
    }>();

    const weekendWarriors: WeekendWarrior[] = (weekendWarriorsResult.results || []).map(w => ({
      username: w.username,
      checkins: w.checkins,
      likes: w.likes,
      totalActivity: w.total_activity,
    }));

    // New members this week - spotlight the newest joiners
    const newMembersResult = await db.prepare(`
      SELECT 
        u.username,
        u.created_at as joined_at,
        COALESCE(c.checkin_count, 0) as checkins,
        COALESCE(f.follower_count, 0) as followers
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) as checkin_count
        FROM checkins
        GROUP BY user_id
      ) c ON u.id = c.user_id
      LEFT JOIN (
        SELECT following_id, COUNT(*) as follower_count
        FROM follows
        GROUP BY following_id
      ) f ON u.id = f.following_id
      WHERE u.created_at > ?
      ORDER BY u.created_at DESC
      LIMIT 5
    `).bind(oneWeekAgo).all<{
      username: string;
      joined_at: number;
      checkins: number;
      followers: number;
    }>();

    const newMembers: NewMember[] = (newMembersResult.results || []).map(m => ({
      username: m.username,
      joinedAt: m.joined_at,
      checkins: m.checkins,
      followers: m.followers,
    }));

    // Streak Champions - users with longest active streaks
    // Get all users with recent check-ins and calculate their streaks
    const streakUsersResult = await db.prepare(`
      SELECT 
        u.id as user_id,
        u.username,
        GROUP_CONCAT(DISTINCT date(c.created_at, 'unixepoch')) as checkin_dates
      FROM users u
      JOIN checkins c ON u.id = c.user_id
      WHERE u.username != 'openclaw_tester'
      GROUP BY u.id
      HAVING COUNT(c.id) > 0
    `).all<{
      user_id: string;
      username: string;
      checkin_dates: string;
    }>();

    // Calculate streaks for each user
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    function calculateUserStreak(datesStr: string): { current: number; best: number; active: boolean } {
      if (!datesStr) return { current: 0, best: 0, active: false };
      const dates = datesStr.split(',').sort((a, b) => b.localeCompare(a)); // desc
      
      // Check if active (last checkin today or yesterday)
      const lastDate = dates[0];
      const active = lastDate === today || lastDate === yesterday;
      
      if (!active) return { current: 0, best: 1, active: false };
      
      // Calculate current streak
      let currentStreak = 0;
      let expectedDate = lastDate;
      
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
      
      // Calculate best streak
      let bestStreak = 1;
      let tempStreak = 1;
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
      bestStreak = Math.max(bestStreak, currentStreak);
      
      return { current: currentStreak, best: bestStreak, active };
    }

    const streakChampions: StreakChampion[] = (streakUsersResult.results || [])
      .map(u => {
        const streak = calculateUserStreak(u.checkin_dates);
        return {
          username: u.username,
          currentStreak: streak.current,
          bestStreak: streak.best,
          active: streak.active,
        };
      })
      .filter(s => s.active && s.currentStreak >= 2) // Only active streaks of 2+ days
      .sort((a, b) => b.currentStreak - a.currentStreak)
      .slice(0, 3)
      .map(({ username, currentStreak, bestStreak }) => ({ username, currentStreak, bestStreak }));

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
      weekendWarriors,
      weekendStats: {
        totalCheckins: weekendTotals?.checkins || 0,
        totalLikes: weekendTotals?.likes || 0,
        activeUsers: weekendTotals?.active_users || 0,
      },
      newMembers,
      streakChampions,
    };

    return Response.json(digest);
  } catch (error) {
    console.error("Sunday digest error:", error);
    return Response.json({ error: "Failed to load digest" }, { status: 500 });
  }
}
