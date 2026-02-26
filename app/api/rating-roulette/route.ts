import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

// GET /api/rating-roulette - Get a random highly-rated cigar
export async function GET(request: Request) {
  try {
    const { env } = getRequestContext();
    const { searchParams } = new URL(request.url);
    const minRating = parseFloat(searchParams.get('minRating') || '4');
    const excludeBrand = searchParams.get('excludeBrand') || '';
    
    // Get highly-rated check-ins (4+ stars by default)
    // Exclude user's own check-ins if userId provided
    const userId = searchParams.get('userId');
    
    let query = `
      SELECT 
        c.id,
        c.brand,
        c.product,
        c.rating,
        c.review,
        c.image_url,
        c.created_at,
        u.username,
        u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.rating >= ?
    `;
    
    const params: (string | number)[] = [minRating];
    
    if (excludeBrand) {
      query += ` AND LOWER(c.brand) != LOWER(?)`;
      params.push(excludeBrand);
    }
    
    if (userId) {
      query += ` AND c.user_id != ?`;
      params.push(userId);
    }
    
    query += ` ORDER BY RANDOM() LIMIT 1`;
    
    const result = await env.DB.prepare(query).bind(...params).first() as Record<string, unknown> | null;
    
    if (!result) {
      // Fallback: get any random check-in
      const fallback = await env.DB.prepare(`
        SELECT 
          c.id,
          c.brand,
          c.product,
          c.rating,
          c.review,
          c.image_url,
          c.created_at,
          u.username,
          u.avatar_url,
          (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        ORDER BY RANDOM()
        LIMIT 1
      `).first() as Record<string, unknown> | null;
      
      if (!fallback) {
        return NextResponse.json({ 
          recommendation: null,
          message: 'No check-ins found. Be the first to log a smoke!'
        });
      }
      
      return NextResponse.json({
        recommendation: fallback,
        source: 'random',
        message: 'Here\'s a random smoke from the community!'
      });
    }
    
    return NextResponse.json({
      recommendation: result,
      source: 'highly_rated',
      message: `🎰 ${result.rating}★ recommendation from ${result.username}!`
    });
    
  } catch (error) {
    console.error('Rating roulette error:', error);
    return NextResponse.json(
      { error: 'Failed to spin the wheel' },
      { status: 500 }
    );
  }
}
