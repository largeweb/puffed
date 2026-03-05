import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    
    // Today's metrics
    const todayMetrics = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM checkins WHERE created_at >= ?) as checkins,
        (SELECT COUNT(*) FROM likes WHERE created_at >= ?) as likes,
        (SELECT COUNT(*) FROM comments WHERE created_at >= ?) as comments,
        (SELECT COUNT(*) FROM reactions WHERE created_at >= ?) as reactions,
        (SELECT COUNT(DISTINCT user_id) FROM checkins WHERE created_at >= ?) as active_users
    `).bind(
      todayStart.toISOString(),
      todayStart.toISOString(),
      todayStart.toISOString(),
      todayStart.toISOString(),
      todayStart.toISOString()
    ).first();
    
    // Yesterday's metrics (for comparison)
    const yesterdayMetrics = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM checkins WHERE created_at >= ? AND created_at < ?) as checkins,
        (SELECT COUNT(*) FROM likes WHERE created_at >= ? AND created_at < ?) as likes,
        (SELECT COUNT(*) FROM comments WHERE created_at >= ? AND created_at < ?) as comments,
        (SELECT COUNT(*) FROM reactions WHERE created_at >= ? AND created_at < ?) as reactions,
        (SELECT COUNT(DISTINCT user_id) FROM checkins WHERE created_at >= ? AND created_at < ?) as active_users
    `).bind(
      yesterdayStart.toISOString(), todayStart.toISOString(),
      yesterdayStart.toISOString(), todayStart.toISOString(),
      yesterdayStart.toISOString(), todayStart.toISOString(),
      yesterdayStart.toISOString(), todayStart.toISOString(),
      yesterdayStart.toISOString(), todayStart.toISOString()
    ).first();
    
    // Overall totals
    const totals = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM checkins) as checkins,
        (SELECT COUNT(*) FROM likes) as likes,
        (SELECT COUNT(*) FROM follows) as follows,
        (SELECT COUNT(*) FROM comments) as comments,
        (SELECT COUNT(*) FROM reactions) as reactions
    `).first();
    
    // Last activity
    const lastActivity = await db.prepare(`
      SELECT c.created_at, u.username, c.brand
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC
      LIMIT 1
    `).first();
    
    // Platform streak (consecutive days with activity)
    const streakData = await db.prepare(`
      SELECT DISTINCT DATE(created_at) as activity_date
      FROM checkins
      ORDER BY activity_date DESC
      LIMIT 30
    `).all();
    
    let streak = 0;
    if (streakData.results && streakData.results.length > 0) {
      const dates = streakData.results.map(r => r.activity_date as string);
      const today = todayStart.toISOString().split('T')[0];
      const yesterday = yesterdayStart.toISOString().split('T')[0];
      
      // Check if today or yesterday has activity
      if (dates.includes(today) || dates.includes(yesterday)) {
        streak = 1;
        let checkDate = dates.includes(today) ? todayStart : yesterdayStart;
        
        for (let i = 1; i < dates.length; i++) {
          checkDate.setDate(checkDate.getDate() - 1);
          const checkStr = checkDate.toISOString().split('T')[0];
          if (dates.includes(checkStr)) {
            streak++;
          } else {
            break;
          }
        }
      }
    }
    
    // Calculate health score (0-100)
    const todayCheckins = Number(todayMetrics?.checkins || 0);
    const todayLikes = Number(todayMetrics?.likes || 0);
    const todayComments = Number(todayMetrics?.comments || 0);
    const todayActiveUsers = Number(todayMetrics?.active_users || 0);
    
    const hourOfDay = now.getHours();
    const expectedActivity = hourOfDay < 8 ? 0.2 : hourOfDay < 12 ? 0.5 : hourOfDay < 18 ? 0.7 : 1;
    
    let healthScore = 0;
    healthScore += Math.min(todayCheckins * 10, 30); // Up to 30 points for check-ins
    healthScore += Math.min(todayLikes * 5, 20); // Up to 20 points for likes
    healthScore += Math.min(todayComments * 10, 20); // Up to 20 points for comments
    healthScore += Math.min(todayActiveUsers * 10, 20); // Up to 20 points for active users
    healthScore += Math.min(streak, 10); // Up to 10 points for streak
    
    healthScore = Math.round(healthScore * expectedActivity);
    healthScore = Math.min(healthScore, 100);
    
    const getHealthStatus = (score: number) => {
      if (score >= 80) return { label: 'Thriving', color: 'green', emoji: '🔥' };
      if (score >= 60) return { label: 'Healthy', color: 'lime', emoji: '💪' };
      if (score >= 40) return { label: 'Moderate', color: 'yellow', emoji: '👀' };
      if (score >= 20) return { label: 'Quiet', color: 'orange', emoji: '😴' };
      return { label: 'Needs Attention', color: 'red', emoji: '🚨' };
    };
    
    return NextResponse.json({
      healthScore,
      healthStatus: getHealthStatus(healthScore),
      today: todayMetrics,
      yesterday: yesterdayMetrics,
      totals,
      streak,
      lastActivity,
      serverTime: now.toISOString()
    });
  } catch (error) {
    console.error('Platform Pulse API error:', error);
    return NextResponse.json({ error: 'Failed to fetch pulse data' }, { status: 500 });
  }
}
