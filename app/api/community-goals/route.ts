import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface CommunityGoal {
  id: string;
  name: string;
  description: string;
  icon: string;
  target: number;
  current: number;
  category: 'checkins' | 'social' | 'discovery' | 'engagement';
}

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    // Get current week boundaries (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() + mondayOffset);
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekStartMs = weekStart.getTime();
    
    const sundayEnd = new Date(weekStart);
    sundayEnd.setUTCDate(weekStart.getUTCDate() + 6);
    sundayEnd.setUTCHours(23, 59, 59, 999);
    const weekEndMs = sundayEnd.getTime();
    
    // Calculate days remaining in the week
    const daysRemaining = Math.ceil((weekEndMs - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Get total users for scaling goals
    const usersResult = await db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
    const totalUsers = usersResult?.count || 1;
    
    // Calculate dynamic targets based on user count (scale with community size)
    const baseCheckinTarget = Math.max(25, totalUsers * 5);
    const baseLikesTarget = Math.max(30, totalUsers * 6);
    const baseBrandsTarget = Math.max(8, totalUsers * 2);
    const baseCommentsTarget = Math.max(15, totalUsers * 3);
    
    // Get this week's stats
    const [checkinsResult, likesResult, brandsResult, commentsResult, newUsersResult] = await Promise.all([
      // Total check-ins this week
      db.prepare(`
        SELECT COUNT(*) as count FROM checkins 
        WHERE created_at >= ? AND created_at <= ?
      `).bind(weekStartMs, weekEndMs).first<{ count: number }>(),
      
      // Total likes this week
      db.prepare(`
        SELECT COUNT(*) as count FROM likes 
        WHERE created_at >= ? AND created_at <= ?
      `).bind(weekStartMs, weekEndMs).first<{ count: number }>(),
      
      // Unique brands logged this week
      db.prepare(`
        SELECT COUNT(DISTINCT brand) as count FROM checkins 
        WHERE created_at >= ? AND created_at <= ?
      `).bind(weekStartMs, weekEndMs).first<{ count: number }>(),
      
      // Comments this week
      db.prepare(`
        SELECT COUNT(*) as count FROM comments 
        WHERE created_at >= ? AND created_at <= ?
      `).bind(weekStartMs, weekEndMs).first<{ count: number }>(),
      
      // New users this week
      db.prepare(`
        SELECT COUNT(*) as count FROM users 
        WHERE created_at >= ? AND created_at <= ?
      `).bind(weekStartMs, weekEndMs).first<{ count: number }>(),
    ]);
    
    const weekCheckins = checkinsResult?.count || 0;
    const weekLikes = likesResult?.count || 0;
    const weekBrands = brandsResult?.count || 0;
    const weekComments = commentsResult?.count || 0;
    const weekNewUsers = newUsersResult?.count || 0;
    
    // Define this week's community goals
    const goals: CommunityGoal[] = [
      {
        id: 'weekly-checkins',
        name: 'Smoke Together',
        description: `Log ${baseCheckinTarget} check-ins as a community`,
        icon: '🚬',
        target: baseCheckinTarget,
        current: weekCheckins,
        category: 'checkins',
      },
      {
        id: 'weekly-likes',
        name: 'Spread the Love',
        description: `Give ${baseLikesTarget} likes to fellow smokers`,
        icon: '❤️',
        target: baseLikesTarget,
        current: weekLikes,
        category: 'social',
      },
      {
        id: 'weekly-brands',
        name: 'Brand Explorers',
        description: `Try ${baseBrandsTarget} different brands together`,
        icon: '🔍',
        target: baseBrandsTarget,
        current: weekBrands,
        category: 'discovery',
      },
      {
        id: 'weekly-comments',
        name: 'Start Conversations',
        description: `Leave ${baseCommentsTarget} comments on check-ins`,
        icon: '💬',
        target: baseCommentsTarget,
        current: weekComments,
        category: 'engagement',
      },
    ];
    
    // Calculate overall progress
    const totalProgress = goals.reduce((sum, g) => sum + Math.min(g.current / g.target, 1), 0);
    const overallProgress = Math.round((totalProgress / goals.length) * 100);
    
    // Count completed goals
    const completedGoals = goals.filter(g => g.current >= g.target).length;
    
    // Generate encouragement based on progress
    let encouragement = '';
    if (completedGoals === goals.length) {
      encouragement = '🏆 ALL GOALS COMPLETE! The community crushed it this week!';
    } else if (overallProgress >= 75) {
      encouragement = '🔥 Almost there! Push through to the finish line!';
    } else if (overallProgress >= 50) {
      encouragement = '💪 Halfway there! Keep the momentum going!';
    } else if (overallProgress >= 25) {
      encouragement = '🌱 Good start! Every smoke counts toward our goals!';
    } else {
      encouragement = '🚀 New week, new goals! Let\'s do this together!';
    }
    
    return NextResponse.json({
      goals,
      summary: {
        completedGoals,
        totalGoals: goals.length,
        overallProgress,
        daysRemaining,
        encouragement,
        weekStart: weekStart.toISOString(),
        weekEnd: sundayEnd.toISOString(),
      },
      contributors: {
        totalUsers,
        newThisWeek: weekNewUsers,
      },
    });
    
  } catch (error) {
    console.error('Community goals error:', error);
    return NextResponse.json({ error: 'Failed to fetch community goals' }, { status: 500 });
  }
}
