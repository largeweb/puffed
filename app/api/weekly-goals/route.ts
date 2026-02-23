import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface WeeklyGoal {
  id: string;
  title: string;
  description: string;
  icon: string;
  current: number;
  target: number;
  completed: boolean;
  category: 'smoke' | 'social' | 'explore';
}

interface WeeklyGoalsResponse {
  goals?: WeeklyGoal[];
  weekStart?: number;
  weekEnd?: number;
  totalCompleted?: number;
  error?: string;
}

// Get Monday midnight of current week (EST)
function getWeekBounds(): { start: number; end: number } {
  const now = new Date();
  // Get current day (0=Sun, 1=Mon, etc)
  const day = now.getUTCDay();
  // Calculate days since Monday (treating Sunday as day 7)
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  
  // Monday midnight UTC
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysSinceMonday);
  monday.setUTCHours(0, 0, 0, 0);
  
  // Sunday 23:59:59 UTC
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  
  return {
    start: Math.floor(monday.getTime() / 1000),
    end: Math.floor(sunday.getTime() / 1000)
  };
}

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;
    
    if (!sessionId) {
      return Response.json({ error: "Not authenticated" } as WeeklyGoalsResponse, { status: 401 });
    }
    
    const { env } = getRequestContext();
    const db = env.DB;
    
    // Validate session
    const session = await db.prepare(`
      SELECT user_id FROM sessions 
      WHERE id = ? AND expires_at > unixepoch()
    `).bind(sessionId).first<{ user_id: string }>();
    
    if (!session) {
      return Response.json({ error: "Invalid session" } as WeeklyGoalsResponse, { status: 401 });
    }
    
    const userId = session.user_id;
    const { start: weekStart, end: weekEnd } = getWeekBounds();
    
    // Get user's historical averages (last 4 weeks before this week)
    const fourWeeksAgo = weekStart - (28 * 24 * 60 * 60);
    
    const historyStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_checkins,
        COUNT(DISTINCT brand) as total_brands
      FROM checkins 
      WHERE user_id = ? AND created_at >= ? AND created_at < ?
    `).bind(userId, fourWeeksAgo, weekStart).first<{ total_checkins: number; total_brands: number }>();
    
    // Get this week's progress
    const weekCheckins = await db.prepare(`
      SELECT COUNT(*) as count, COUNT(DISTINCT brand) as brands
      FROM checkins 
      WHERE user_id = ? AND created_at >= ? AND created_at <= ?
    `).bind(userId, weekStart, weekEnd).first<{ count: number; brands: number }>();
    
    // Count new brands this week (brands user hasn't logged before this week)
    const newBrands = await db.prepare(`
      SELECT COUNT(DISTINCT c.brand) as count
      FROM checkins c
      WHERE c.user_id = ? 
        AND c.created_at >= ? 
        AND c.created_at <= ?
        AND c.brand NOT IN (
          SELECT DISTINCT brand FROM checkins 
          WHERE user_id = ? AND created_at < ?
        )
    `).bind(userId, weekStart, weekEnd, userId, weekStart).first<{ count: number }>();
    
    // Likes/reactions given this week
    const likesGiven = await db.prepare(`
      SELECT COUNT(*) as count FROM likes 
      WHERE user_id = ? AND created_at >= ? AND created_at <= ?
    `).bind(userId, weekStart, weekEnd).first<{ count: number }>();
    
    const reactionsGiven = await db.prepare(`
      SELECT COUNT(*) as count FROM reactions 
      WHERE user_id = ? AND created_at >= ? AND created_at <= ?
    `).bind(userId, weekStart, weekEnd).first<{ count: number }>();
    
    // Engagement received this week
    const engagementReceived = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM likes l 
         JOIN checkins c ON l.checkin_id = c.id 
         WHERE c.user_id = ? AND l.created_at >= ? AND l.created_at <= ?) +
        (SELECT COUNT(*) FROM reactions r 
         JOIN checkins c ON r.checkin_id = c.id 
         WHERE c.user_id = ? AND r.created_at >= ? AND r.created_at <= ?) +
        (SELECT COUNT(*) FROM comments cm 
         JOIN checkins c ON cm.checkin_id = c.id 
         WHERE c.user_id = ? AND cm.user_id != ? AND cm.created_at >= ? AND cm.created_at <= ?)
      as total
    `).bind(userId, weekStart, weekEnd, userId, weekStart, weekEnd, userId, userId, weekStart, weekEnd)
      .first<{ total: number }>();
    
    // New followers this week
    const newFollowers = await db.prepare(`
      SELECT COUNT(*) as count FROM follows 
      WHERE following_id = ? AND created_at >= ? AND created_at <= ?
    `).bind(userId, weekStart, weekEnd).first<{ count: number }>();
    
    // Calculate dynamic targets based on history
    const avgWeeklyCheckins = historyStats?.total_checkins ? Math.ceil(historyStats.total_checkins / 4) : 0;
    const isNewUser = avgWeeklyCheckins === 0;
    
    // Build goals with smart targets
    const goals: WeeklyGoal[] = [];
    
    // Goal 1: Log smokes (always present)
    const smokeTarget = isNewUser ? 3 : Math.max(3, Math.ceil(avgWeeklyCheckins * 1.2)); // 20% above average or min 3
    const smokeProgress = weekCheckins?.count || 0;
    goals.push({
      id: 'weekly-smokes',
      title: `Log ${smokeTarget} smokes`,
      description: isNewUser ? 'Start your journey!' : 'Keep the streak going',
      icon: '🚬',
      current: smokeProgress,
      target: smokeTarget,
      completed: smokeProgress >= smokeTarget,
      category: 'smoke'
    });
    
    // Goal 2: Try new brands (always present)
    const newBrandTarget = isNewUser ? 1 : 2;
    const newBrandProgress = newBrands?.count || 0;
    goals.push({
      id: 'new-brands',
      title: `Try ${newBrandTarget} new brand${newBrandTarget > 1 ? 's' : ''}`,
      description: 'Explore something different',
      icon: '🆕',
      current: newBrandProgress,
      target: newBrandTarget,
      completed: newBrandProgress >= newBrandTarget,
      category: 'explore'
    });
    
    // Goal 3: Social engagement - give likes/reactions
    const engagementGiven = (likesGiven?.count || 0) + (reactionsGiven?.count || 0);
    const engageTarget = 5;
    goals.push({
      id: 'give-love',
      title: 'Give 5 likes or reactions',
      description: 'Support the community',
      icon: '❤️',
      current: engagementGiven,
      target: engageTarget,
      completed: engagementGiven >= engageTarget,
      category: 'social'
    });
    
    // Goal 4: Get engagement on your posts
    const receivedEngagement = engagementReceived?.total || 0;
    const receiveTarget = 3;
    goals.push({
      id: 'get-engagement',
      title: 'Get 3 engagements',
      description: 'Likes, reactions, or comments',
      icon: '🔥',
      current: receivedEngagement,
      target: receiveTarget,
      completed: receivedEngagement >= receiveTarget,
      category: 'social'
    });
    
    // Goal 5: Gain a follower (if user has followers potential)
    const followerTarget = 1;
    const followerProgress = newFollowers?.count || 0;
    goals.push({
      id: 'gain-follower',
      title: 'Gain a new follower',
      description: 'Grow your network',
      icon: '👥',
      current: followerProgress,
      target: followerTarget,
      completed: followerProgress >= followerTarget,
      category: 'social'
    });
    
    const totalCompleted = goals.filter(g => g.completed).length;
    
    return Response.json({
      goals,
      weekStart,
      weekEnd,
      totalCompleted
    } as WeeklyGoalsResponse);
    
  } catch (error) {
    console.error("Weekly goals error:", error);
    return Response.json({ error: "Failed to load goals" } as WeeklyGoalsResponse, { status: 500 });
  }
}
