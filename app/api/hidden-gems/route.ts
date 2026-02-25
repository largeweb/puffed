import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Find brands with high avg rating (4+) but low check-in count (1-3)
    // These are "hidden gems" - quality cigars that haven't been discovered yet
    const hiddenGemsResult = await db.prepare(`
      SELECT 
        brand,
        COUNT(*) as checkin_count,
        AVG(rating) as avg_rating,
        COUNT(DISTINCT user_id) as unique_smokers,
        MAX(created_at) as last_smoked,
        (SELECT username FROM users WHERE id = c.user_id LIMIT 1) as discoverer
      FROM checkins c
      WHERE rating IS NOT NULL AND rating >= 4
      GROUP BY LOWER(brand)
      HAVING checkin_count <= 3 AND checkin_count >= 1
      ORDER BY avg_rating DESC, checkin_count ASC
      LIMIT 10
    `).all();

    // Find "abandoned gems" - high-rated but not smoked in 7+ days
    const abandonedGemsResult = await db.prepare(`
      SELECT 
        brand,
        COUNT(*) as checkin_count,
        AVG(rating) as avg_rating,
        MAX(created_at) as last_smoked,
        (strftime('%s', 'now') * 1000 - MAX(created_at)) / 86400000 as days_ago
      FROM checkins
      WHERE rating IS NOT NULL AND rating >= 4
      GROUP BY LOWER(brand)
      HAVING days_ago >= 7
      ORDER BY avg_rating DESC
      LIMIT 5
    `).all();

    // Find "solo discoveries" - brands only 1 person has tried
    const soloDiscoveriesResult = await db.prepare(`
      SELECT 
        c.brand,
        u.username as discoverer,
        c.rating,
        c.created_at,
        c.id as checkin_id
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.brand IN (
        SELECT brand FROM checkins GROUP BY LOWER(brand) HAVING COUNT(DISTINCT user_id) = 1
      )
      AND c.rating >= 4
      ORDER BY c.rating DESC, c.created_at DESC
      LIMIT 8
    `).all();

    return NextResponse.json({
      hiddenGems: hiddenGemsResult.results || [],
      abandonedGems: abandonedGemsResult.results || [],
      soloDiscoveries: soloDiscoveriesResult.results || [],
      generatedAt: Date.now()
    });
  } catch (error) {
    console.error('Hidden gems error:', error);
    return NextResponse.json({ error: 'Failed to fetch hidden gems' }, { status: 500 });
  }
}
