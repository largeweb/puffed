import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    // Get today's date in EST
    const now = new Date();
    const estOffset = -5 * 60;
    const estTime = new Date(now.getTime() + (now.getTimezoneOffset() + estOffset) * 60000);
    const todayStart = new Date(estTime);
    todayStart.setHours(0, 0, 0, 0);
    const todayStartISO = todayStart.toISOString();
    
    // Get first check-in of today
    const firstToday = await db.prepare(`
      SELECT c.*, u.username, u.avatar_url
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      ORDER BY c.created_at ASC
      LIMIT 1
    `).bind(todayStartISO).first();
    
    // Get spark leaders (most first-of-day check-ins all time)
    // We'll count how many times each user was first to check in on a given day
    const sparkLeaders = await db.prepare(`
      WITH daily_firsts AS (
        SELECT 
          user_id,
          DATE(created_at) as check_date,
          ROW_NUMBER() OVER (PARTITION BY DATE(created_at) ORDER BY created_at ASC) as rn
        FROM checkins
      )
      SELECT 
        u.username,
        u.avatar_url,
        COUNT(*) as spark_count
      FROM daily_firsts df
      JOIN users u ON df.user_id = u.id
      WHERE df.rn = 1
      GROUP BY df.user_id
      ORDER BY spark_count DESC
      LIMIT 10
    `).all();
    
    // Get recent sparks (first check-ins from last 7 days)
    const recentSparks = await db.prepare(`
      WITH daily_firsts AS (
        SELECT 
          c.*,
          u.username,
          u.avatar_url,
          DATE(c.created_at) as check_date,
          ROW_NUMBER() OVER (PARTITION BY DATE(c.created_at) ORDER BY c.created_at ASC) as rn
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE c.created_at >= datetime('now', '-7 days')
      )
      SELECT *
      FROM daily_firsts
      WHERE rn = 1
      ORDER BY created_at DESC
      LIMIT 7
    `).all();
    
    // Check if spot is still open today
    const spotOpen = !firstToday;
    
    return NextResponse.json({
      spotOpen,
      firstToday,
      sparkLeaders: sparkLeaders.results || [],
      recentSparks: recentSparks.results || [],
      serverTime: estTime.toISOString()
    });
  } catch (error) {
    console.error('The Spark API error:', error);
    return NextResponse.json({ error: 'Failed to fetch spark data' }, { status: 500 });
  }
}
