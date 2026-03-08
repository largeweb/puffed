import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

interface MostLovedCheckin {
  id: string;
  user_id: string;
  username: string;
  brand: string;
  rating: number;
  review: string | null;
  photo_url: string | null;
  like_count: number;
  reaction_count: number;
  comment_count: number;
  total_engagement: number;
  created_at: number;
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Get check-ins from past 7 days with highest engagement (likes + reactions + comments)
    const oneWeekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);

    const result = await db.prepare(`
      SELECT 
        c.id,
        c.user_id,
        u.username,
        c.brand,
        c.rating,
        c.review,
        c.photo_url,
        c.created_at,
        COALESCE(l.like_count, 0) as like_count,
        COALESCE(r.reaction_count, 0) as reaction_count,
        COALESCE(cm.comment_count, 0) as comment_count,
        (COALESCE(l.like_count, 0) + COALESCE(r.reaction_count, 0) + COALESCE(cm.comment_count, 0)) as total_engagement
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN (
        SELECT checkin_id, COUNT(*) as like_count
        FROM likes
        GROUP BY checkin_id
      ) l ON c.id = l.checkin_id
      LEFT JOIN (
        SELECT checkin_id, COUNT(*) as reaction_count
        FROM reactions
        GROUP BY checkin_id
      ) r ON c.id = r.checkin_id
      LEFT JOIN (
        SELECT checkin_id, COUNT(*) as comment_count
        FROM comments
        GROUP BY checkin_id
      ) cm ON c.id = cm.checkin_id
      WHERE c.created_at > ?
      ORDER BY total_engagement DESC, c.created_at DESC
      LIMIT 5
    `).bind(oneWeekAgo).all<MostLovedCheckin>();

    return NextResponse.json({
      checkins: result.results || [],
      count: result.results?.length || 0
    });
  } catch (error) {
    console.error('Most loved error:', error);
    return NextResponse.json({ error: 'Failed to fetch most loved' }, { status: 500 });
  }
}
