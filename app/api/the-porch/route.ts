import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    
    // Get check-ins from last hour (currently on the porch)
    const onPorch = await db.prepare(`
      SELECT c.*, u.username, u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) as comment_count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      ORDER BY c.created_at DESC
    `).bind(oneHourAgo.toISOString()).all();
    
    // Get check-ins from 1-2 hours ago (recently left)
    const recentlyLeft = await db.prepare(`
      SELECT c.*, u.username, u.avatar_url
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at < ?
      ORDER BY c.created_at DESC
      LIMIT 5
    `).bind(twoHoursAgo.toISOString(), oneHourAgo.toISOString()).all();
    
    // Get today's stats
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const todayStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_visits,
        COUNT(DISTINCT user_id) as unique_smokers
      FROM checkins
      WHERE created_at >= ?
    `).bind(todayStart.toISOString()).first();
    
    // Calculate peak time (busiest hour today)
    const peakHour = await db.prepare(`
      SELECT 
        strftime('%H', created_at) as hour,
        COUNT(*) as count
      FROM checkins
      WHERE created_at >= ?
      GROUP BY strftime('%H', created_at)
      ORDER BY count DESC
      LIMIT 1
    `).bind(todayStart.toISOString()).first();
    
    return NextResponse.json({
      onPorch: onPorch.results || [],
      recentlyLeft: recentlyLeft.results || [],
      stats: {
        currentCount: (onPorch.results || []).length,
        todayVisits: todayStats?.total_visits || 0,
        uniqueSmokersToday: todayStats?.unique_smokers || 0,
        peakHour: peakHour?.hour ? `${parseInt(peakHour.hour as string)}:00` : null,
        peakCount: peakHour?.count || 0
      },
      serverTime: now.toISOString()
    });
  } catch (error) {
    console.error('The Porch API error:', error);
    return NextResponse.json({ error: 'Failed to fetch porch data' }, { status: 500 });
  }
}
