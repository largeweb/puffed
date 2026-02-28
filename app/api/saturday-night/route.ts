import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const now = new Date();
    const hour = now.getUTCHours() - 5; // EST offset (approximation)
    const adjustedHour = hour < 0 ? hour + 24 : hour;
    const dayOfWeek = now.getDay();
    
    // Party time: Saturday 8 PM - Sunday 4 AM (or any Saturday)
    const isSaturday = dayOfWeek === 6;
    const isPartyHours = adjustedHour >= 20 || adjustedHour < 4;
    const isPartyTime = isSaturday && isPartyHours;

    // Calculate hours left in party (until 4 AM)
    let partyHoursLeft = 0;
    if (isPartyTime) {
      if (adjustedHour >= 20) {
        partyHoursLeft = (24 - adjustedHour) + 4; // hours until midnight + 4
      } else {
        partyHoursLeft = 4 - adjustedHour;
      }
    }

    // Get today's timestamp for "tonight"
    const todayStart = new Date(now);
    todayStart.setHours(18, 0, 0, 0); // Start from 6 PM
    const tonightStartMs = Math.floor(todayStart.getTime() / 1000);

    // Current smokers (last 2 hours)
    const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;
    const currentSmokersResult = await db.prepare(`
      SELECT u.username, c.brand, c.rating, c.created_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at > ?
      ORDER BY c.created_at DESC
      LIMIT 10
    `).bind(twoHoursAgo).all();

    const currentSmokers = (currentSmokersResult.results || []).map((row: Record<string, unknown>) => ({
      username: row.username as string,
      brand: row.brand as string,
      rating: row.rating as number,
      time: getTimeAgo(row.created_at as number),
    }));

    // Tonight's stats (since 6 PM)
    const tonightStatsResult = await db.prepare(`
      SELECT 
        COUNT(*) as totalSmokes,
        COUNT(DISTINCT user_id) as activeSmokers,
        AVG(rating) as avgRating
      FROM checkins
      WHERE created_at > ?
    `).bind(tonightStartMs).first();

    const topBrandResult = await db.prepare(`
      SELECT brand, COUNT(*) as cnt
      FROM checkins
      WHERE created_at > ?
      GROUP BY brand
      ORDER BY cnt DESC
      LIMIT 1
    `).bind(tonightStartMs).first();

    const tonightStats = {
      totalSmokes: (tonightStatsResult?.totalSmokes as number) || 0,
      activeSmokers: (tonightStatsResult?.activeSmokers as number) || 0,
      avgRating: (tonightStatsResult?.avgRating as number) || 0,
      topBrand: (topBrandResult?.brand as string) || null,
    };

    // Saturday legends (all Saturdays)
    // We need to check if checkin was on a Saturday
    const saturdayLegendsResult = await db.prepare(`
      SELECT 
        u.username,
        COUNT(*) as saturdaySmokes,
        AVG(c.rating) as avgRating
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE strftime('%w', datetime(c.created_at, 'unixepoch')) = '6'
      GROUP BY u.id
      ORDER BY saturdaySmokes DESC
      LIMIT 5
    `).all();

    const saturdayLegends = (saturdayLegendsResult.results || []).map((row: Record<string, unknown>) => ({
      username: row.username as string,
      saturdaySmokes: row.saturdaySmokes as number,
      avgRating: row.avgRating as number,
    }));

    // All-time Saturday stats
    const allTimeSaturdayResult = await db.prepare(`
      SELECT 
        COUNT(*) as totalSmokes
      FROM checkins
      WHERE strftime('%w', datetime(created_at, 'unixepoch')) = '6'
    `).first();

    const peakHourResult = await db.prepare(`
      SELECT 
        CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) as hour,
        COUNT(*) as cnt
      FROM checkins
      WHERE strftime('%w', datetime(created_at, 'unixepoch')) = '6'
      GROUP BY hour
      ORDER BY cnt DESC
      LIMIT 1
    `).first();

    const allTimeSaturday = {
      totalSmokes: (allTimeSaturdayResult?.totalSmokes as number) || 0,
      peakHour: (peakHourResult?.hour as number) || 21,
      recordSmokes: 0,
      recordDate: '',
    };

    return NextResponse.json({
      isPartyTime,
      partyHoursLeft,
      currentSmokers,
      saturdayLegends,
      tonightStats,
      allTimeSaturday,
    });
  } catch (error) {
    console.error('Saturday night error:', error);
    return NextResponse.json({ error: 'Failed to load party data' }, { status: 500 });
  }
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
