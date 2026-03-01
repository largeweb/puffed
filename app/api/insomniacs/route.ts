import { getRequestContext } from '@cloudflare/next-on-pages';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    // Get current user from session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    let currentUserId: number | null = null;
    
    if (sessionToken) {
      const session = await db.prepare(
        'SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now")'
      ).bind(sessionToken).first<{ user_id: number }>();
      if (session) {
        currentUserId = session.user_id;
      }
    }

    // Count total insomniac smokes (2-5 AM)
    const totalResult = await db.prepare(`
      SELECT COUNT(*) as count FROM checkins
      WHERE CAST(strftime('%H', created_at) AS INTEGER) >= 2
        AND CAST(strftime('%H', created_at) AS INTEGER) < 5
    `).first<{ count: number }>();
    const totalInsomniacSmokes = totalResult?.count || 0;

    // Unique insomniacs
    const uniqueResult = await db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count FROM checkins
      WHERE CAST(strftime('%H', created_at) AS INTEGER) >= 2
        AND CAST(strftime('%H', created_at) AS INTEGER) < 5
    `).first<{ count: number }>();
    const uniqueInsomniacs = uniqueResult?.count || 0;

    // Average rating for insomniac smokes
    const avgResult = await db.prepare(`
      SELECT AVG(rating) as avg FROM checkins
      WHERE CAST(strftime('%H', created_at) AS INTEGER) >= 2
        AND CAST(strftime('%H', created_at) AS INTEGER) < 5
    `).first<{ avg: number }>();
    const averageRating = avgResult?.avg || 0;

    // Most popular brand during insomniac hours
    const brandResult = await db.prepare(`
      SELECT brand, COUNT(*) as count FROM checkins
      WHERE CAST(strftime('%H', created_at) AS INTEGER) >= 2
        AND CAST(strftime('%H', created_at) AS INTEGER) < 5
      GROUP BY brand ORDER BY count DESC LIMIT 1
    `).first<{ brand: string; count: number }>();
    const favoriteBrand = brandResult?.brand || null;

    // Most popular hour (2, 3, or 4)
    const hourResult = await db.prepare(`
      SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count
      FROM checkins
      WHERE CAST(strftime('%H', created_at) AS INTEGER) >= 2
        AND CAST(strftime('%H', created_at) AS INTEGER) < 5
      GROUP BY hour ORDER BY count DESC LIMIT 1
    `).first<{ hour: number; count: number }>();
    const deepestHour = hourResult?.hour || 3;

    // Current smokers (today during 2-5 AM)
    const currentSmokers = await db.prepare(`
      SELECT c.id, u.username, c.brand, c.product, c.rating, c.created_at, c.review
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE date(c.created_at) = date('now')
        AND CAST(strftime('%H', c.created_at) AS INTEGER) >= 2
        AND CAST(strftime('%H', c.created_at) AS INTEGER) < 5
      ORDER BY c.created_at DESC
      LIMIT 10
    `).all();

    // Insomniac legends (leaderboard)
    const legends = await db.prepare(`
      SELECT u.username, 
        COUNT(*) as count,
        AVG(CAST(strftime('%H', c.created_at) AS INTEGER)) as avgHour
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE CAST(strftime('%H', c.created_at) AS INTEGER) >= 2
        AND CAST(strftime('%H', c.created_at) AS INTEGER) < 5
      GROUP BY c.user_id
      ORDER BY count DESC
      LIMIT 10
    `).all();

    // Personal stats for current user
    let personalStats = null;
    if (currentUserId) {
      const userInsomniac = await db.prepare(`
        SELECT COUNT(*) as count,
          AVG(CAST(strftime('%H', created_at) AS INTEGER)) as avgHour
        FROM checkins
        WHERE user_id = ?
          AND CAST(strftime('%H', created_at) AS INTEGER) >= 2
          AND CAST(strftime('%H', created_at) AS INTEGER) < 5
      `).bind(currentUserId).first<{ count: number; avgHour: number }>();

      // Calculate percentile
      const betterThan = await db.prepare(`
        SELECT COUNT(*) as count FROM (
          SELECT user_id, COUNT(*) as smokeCount FROM checkins
          WHERE CAST(strftime('%H', created_at) AS INTEGER) >= 2
            AND CAST(strftime('%H', created_at) AS INTEGER) < 5
          GROUP BY user_id
          HAVING smokeCount < ?
        )
      `).bind(userInsomniac?.count || 0).first<{ count: number }>();

      const totalUsers = await db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM checkins').first<{ count: number }>();
      const percentile = totalUsers?.count ? Math.round((1 - (betterThan?.count || 0) / totalUsers.count) * 100) : 100;

      personalStats = {
        insomniacSmokes: userInsomniac?.count || 0,
        percentile: Math.max(1, percentile),
        favoriteHour: Math.round(userInsomniac?.avgHour || 3),
        latestEver: null
      };
    }

    return Response.json({
      totalInsomniacSmokes,
      uniqueInsomniacs,
      averageRating,
      favoriteBrand,
      deepestHour,
      currentSmokers: currentSmokers.results || [],
      legends: legends.results || [],
      personalStats
    });
  } catch (error) {
    console.error('Insomniacs API error:', error);
    return Response.json({ error: 'Failed to fetch insomniac stats' }, { status: 500 });
  }
}
