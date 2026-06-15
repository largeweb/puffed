import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

interface RandomCheckin {
  id: string;
  user_id: string;
  username: string;
  brand: string;
  product: string | null;
  rating: number | null;
  review: string | null;
  photo_url: string | null;
  category: string;
  created_at: number;
  like_count: number;
  comment_count: number;
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Get a random check-in with engagement data
    // Using RANDOM() for SQLite - selects from entire history
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
        c.created_at,
        (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) as comment_count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      ORDER BY RANDOM()
      LIMIT 1
    `).first<RandomCheckin>();

    if (!result) {
      return NextResponse.json({ checkin: null, message: 'No check-ins found' });
    }

    return NextResponse.json({
      checkin: result
    });
  } catch (error) {
    console.error('Random checkin error:', error);
    return NextResponse.json({ error: 'Failed to fetch random checkin' }, { status: 500 });
  }
}
