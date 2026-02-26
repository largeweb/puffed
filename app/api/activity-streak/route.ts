import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface DayActivity {
  date: string;
  smokes: number;
  likes: number;
  comments: number;
  reactions: number;
  total: number;
}

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Session expired" }, { status: 401 });
    }

    const userId = session.user_id;

    // Get all activity dates for this user
    // Smokes
    const smokeDates = await db
      .prepare(`
        SELECT DATE(created_at, 'unixepoch') as activity_date, COUNT(*) as count
        FROM checkins 
        WHERE user_id = ?
        GROUP BY activity_date
      `)
      .bind(userId)
      .all<{ activity_date: string; count: number }>();

    // Likes given
    const likeDates = await db
      .prepare(`
        SELECT DATE(created_at, 'unixepoch') as activity_date, COUNT(*) as count
        FROM likes 
        WHERE user_id = ?
        GROUP BY activity_date
      `)
      .bind(userId)
      .all<{ activity_date: string; count: number }>();

    // Comments
    const commentDates = await db
      .prepare(`
        SELECT DATE(created_at, 'unixepoch') as activity_date, COUNT(*) as count
        FROM comments 
        WHERE user_id = ?
        GROUP BY activity_date
      `)
      .bind(userId)
      .all<{ activity_date: string; count: number }>();

    // Reactions
    const reactionDates = await db
      .prepare(`
        SELECT DATE(created_at, 'unixepoch') as activity_date, COUNT(*) as count
        FROM reactions 
        WHERE user_id = ?
        GROUP BY activity_date
      `)
      .bind(userId)
      .all<{ activity_date: string; count: number }>();

    // Merge all activity into a single map by date
    const activityMap = new Map<string, DayActivity>();

    for (const row of smokeDates.results || []) {
      const existing = activityMap.get(row.activity_date) || { date: row.activity_date, smokes: 0, likes: 0, comments: 0, reactions: 0, total: 0 };
      existing.smokes = row.count;
      existing.total += row.count;
      activityMap.set(row.activity_date, existing);
    }

    for (const row of likeDates.results || []) {
      const existing = activityMap.get(row.activity_date) || { date: row.activity_date, smokes: 0, likes: 0, comments: 0, reactions: 0, total: 0 };
      existing.likes = row.count;
      existing.total += row.count;
      activityMap.set(row.activity_date, existing);
    }

    for (const row of commentDates.results || []) {
      const existing = activityMap.get(row.activity_date) || { date: row.activity_date, smokes: 0, likes: 0, comments: 0, reactions: 0, total: 0 };
      existing.comments = row.count;
      existing.total += row.count;
      activityMap.set(row.activity_date, existing);
    }

    for (const row of reactionDates.results || []) {
      const existing = activityMap.get(row.activity_date) || { date: row.activity_date, smokes: 0, likes: 0, comments: 0, reactions: 0, total: 0 };
      existing.reactions = row.count;
      existing.total += row.count;
      activityMap.set(row.activity_date, existing);
    }

    // Sort dates and calculate streak
    const activeDates = Array.from(activityMap.keys()).sort().reverse();
    
    if (activeDates.length === 0) {
      return Response.json({
        currentStreak: 0,
        longestStreak: 0,
        totalActiveDays: 0,
        recentActivity: [],
        streakStartDate: null,
        lastActiveDate: null,
        todayActive: false,
        activityBreakdown: {
          smokes: 0,
          likes: 0,
          comments: 0,
          reactions: 0
        }
      });
    }

    // Calculate current streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let currentStreak = 0;
    let streakStartDate: string | null = null;
    const todayActive = activityMap.has(todayStr);
    
    // Streak counts from today or yesterday
    let checkDate = todayActive ? new Date(today) : (activityMap.has(yesterdayStr) ? new Date(yesterday) : null);
    
    if (checkDate) {
      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (activityMap.has(dateStr)) {
          currentStreak++;
          streakStartDate = dateStr;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedDates = Array.from(activityMap.keys()).sort();
    
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Get recent 7 days activity
    const recentActivity: DayActivity[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const activity = activityMap.get(dateStr);
      recentActivity.push(activity || { date: dateStr, smokes: 0, likes: 0, comments: 0, reactions: 0, total: 0 });
    }

    // Calculate totals
    let totalSmokes = 0, totalLikes = 0, totalComments = 0, totalReactions = 0;
    for (const activity of activityMap.values()) {
      totalSmokes += activity.smokes;
      totalLikes += activity.likes;
      totalComments += activity.comments;
      totalReactions += activity.reactions;
    }

    return Response.json({
      currentStreak,
      longestStreak,
      totalActiveDays: activityMap.size,
      recentActivity,
      streakStartDate,
      lastActiveDate: activeDates[0],
      todayActive,
      activityBreakdown: {
        smokes: totalSmokes,
        likes: totalLikes,
        comments: totalComments,
        reactions: totalReactions
      }
    });
  } catch (error) {
    console.error("Activity streak error:", error);
    return Response.json({ error: "Failed to load activity streak" }, { status: 500 });
  }
}
