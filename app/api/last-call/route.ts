import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Last Call hours: 11 PM (23:00) - 2 AM (02:00)
    // Get today's date boundaries for last call window
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    // Tonight's last call window
    const lastCallStart = new Date(todayStart);
    lastCallStart.setHours(23, 0, 0, 0);
    
    // If it's before 2 AM, the window started yesterday at 11 PM
    const hour = now.getHours();
    if (hour < 2) {
      lastCallStart.setDate(lastCallStart.getDate() - 1);
    }
    
    const lastCallStartTs = Math.floor(lastCallStart.getTime() / 1000);
    const nowTs = Math.floor(now.getTime() / 1000);

    // Get tonight's last call check-ins
    const tonightQuery = `
      SELECT 
        c.id, c.brand, c.product, c.rating, c.review, c.photo_url, c.created_at,
        u.username,
        (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) as comment_count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at <= ?
      ORDER BY c.created_at DESC
      LIMIT 20
    `;

    const tonightResult = await db.prepare(tonightQuery)
      .bind(lastCallStartTs, nowTs)
      .all();

    // Get all-time last call check-ins (11 PM - 2 AM any day)
    const allTimeQuery = `
      SELECT 
        u.username,
        COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE (
        (strftime('%H', c.created_at, 'unixepoch', 'localtime') >= '23') OR
        (strftime('%H', c.created_at, 'unixepoch', 'localtime') < '02')
      )
      GROUP BY u.id
      ORDER BY count DESC
      LIMIT 10
    `;

    const allTimeResult = await db.prepare(allTimeQuery).all();

    // Get platform stats for last call hours
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        AVG(rating) as avg_rating,
        (
          SELECT brand 
          FROM checkins 
          WHERE (
            (strftime('%H', created_at, 'unixepoch', 'localtime') >= '23') OR
            (strftime('%H', created_at, 'unixepoch', 'localtime') < '02')
          )
          GROUP BY brand 
          ORDER BY COUNT(*) DESC 
          LIMIT 1
        ) as top_brand,
        (
          SELECT strftime('%H', created_at, 'unixepoch', 'localtime') as hour
          FROM checkins
          WHERE (
            (strftime('%H', created_at, 'unixepoch', 'localtime') >= '23') OR
            (strftime('%H', created_at, 'unixepoch', 'localtime') < '02')
          )
          GROUP BY hour
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as peak_hour
      FROM checkins
      WHERE (
        (strftime('%H', created_at, 'unixepoch', 'localtime') >= '23') OR
        (strftime('%H', created_at, 'unixepoch', 'localtime') < '02')
      )
    `;

    const statsResult = await db.prepare(statsQuery).first();

    // Get unique smokers tonight
    const tonightSmokers = [...new Set(
      (tonightResult.results as any[]).map(c => c.username)
    )];

    return NextResponse.json({
      checkins: tonightResult.results,
      stats: {
        tonightCount: tonightResult.results?.length || 0,
        tonightSmokers,
        allTimeLastCallers: allTimeResult.results || [],
        platformLastCalls: (statsResult as any)?.total || 0,
        avgRating: (statsResult as any)?.avg_rating || 0,
        topBrand: (statsResult as any)?.top_brand || null,
        closingTimeHour: parseInt((statsResult as any)?.peak_hour || '0', 10),
      }
    });
  } catch (error) {
    console.error('Last Call API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch last call data' },
      { status: 500 }
    );
  }
}
