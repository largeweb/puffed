import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

interface NeedsLoveCheckin {
  id: string;
  user_id: string;
  username: string;
  brand: string;
  product: string | null;
  rating: number;
  review: string | null;
  photo_url: string | null;
  category: string;
  created_at: number;
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Get check-ins from past 3 days with ZERO engagement (no likes, no reactions, no comments)
    const threeDaysAgo = Math.floor(Date.now() / 1000) - (3 * 24 * 60 * 60);

    const result = await db.prepare(`
      SELECT 
        c.id,
        c.user_id,
        u.username,
        c.brand,
        c.product,
        c.rating,
        c.review,
        c.photo_url,
        c.category,
        c.created_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN likes l ON c.id = l.checkin_id
      LEFT JOIN reactions r ON c.id = r.checkin_id
      LEFT JOIN comments cm ON c.id = cm.checkin_id
      WHERE c.created_at > ?
      GROUP BY c.id
      HAVING COUNT(l.id) = 0 AND COUNT(r.id) = 0 AND COUNT(cm.id) = 0
      ORDER BY c.created_at DESC
      LIMIT 5
    `).bind(threeDaysAgo).all<NeedsLoveCheckin>();

    return NextResponse.json({
      checkins: result.results || [],
      count: result.results?.length || 0
    });
  } catch (error) {
    console.error('Needs love error:', error);
    return NextResponse.json({ error: 'Failed to fetch needs love' }, { status: 500 });
  }
}
