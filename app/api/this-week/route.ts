import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Get date range for this week (Sunday to Saturday)
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const startOfWeek = new Date(now);
    startOfWeek.setUTCDate(now.getUTCDate() - dayOfWeek);
    startOfWeek.setUTCHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
    endOfWeek.setUTCHours(23, 59, 59, 999);

    const startTs = Math.floor(startOfWeek.getTime() / 1000);
    const endTs = Math.floor(endOfWeek.getTime() / 1000);

    const weekRange = `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    // Weekly stats
    const statsResult = await db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE created_at >= ? AND created_at <= ?) as new_users,
        (SELECT COUNT(*) FROM checkins WHERE created_at >= ? AND created_at <= ?) as new_checkins,
        (SELECT COUNT(*) FROM likes WHERE created_at >= ? AND created_at <= ?) as new_likes,
        (SELECT COUNT(*) FROM follows WHERE created_at >= ? AND created_at <= ?) as new_follows,
        (SELECT COUNT(*) FROM comments WHERE created_at >= ? AND created_at <= ?) as new_comments,
        (SELECT COUNT(*) FROM reactions WHERE created_at >= ? AND created_at <= ?) as new_reactions
    `).bind(startTs, endTs, startTs, endTs, startTs, endTs, startTs, endTs, startTs, endTs, startTs, endTs).first() as {
      new_users: number;
      new_checkins: number;
      new_likes: number;
      new_follows: number;
      new_comments: number;
      new_reactions: number;
    } | null;

    // Top brands this week
    const topBrandsResult = await db.prepare(`
      SELECT brand, COUNT(*) as count, AVG(rating) as avg_rating
      FROM checkins
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 5
    `).bind(startTs, endTs).all() as { results: Array<{ brand: string; count: number; avg_rating: number }> };

    // Rising stars (new users with most check-ins)
    const risingStarsResult = await db.prepare(`
      SELECT u.username, COUNT(c.id) as checkins, u.created_at
      FROM users u
      LEFT JOIN checkins c ON c.user_id = u.id AND c.created_at >= ? AND c.created_at <= ?
      WHERE u.created_at >= ? AND u.created_at <= ?
      GROUP BY u.id
      HAVING checkins > 0
      ORDER BY checkins DESC
      LIMIT 5
    `).bind(startTs, endTs, startTs, endTs).all() as { results: Array<{ username: string; checkins: number; created_at: number }> };

    // Most engaged (likes + comments + reactions given)
    const mostEngagedResult = await db.prepare(`
      SELECT 
        u.username,
        (SELECT COUNT(*) FROM likes l WHERE l.user_id = u.id AND l.created_at >= ? AND l.created_at <= ?) as likes,
        (SELECT COUNT(*) FROM comments c WHERE c.user_id = u.id AND c.created_at >= ? AND c.created_at <= ?) as comments,
        (SELECT COUNT(*) FROM reactions r WHERE r.user_id = u.id AND r.created_at >= ? AND r.created_at <= ?) as reactions
      FROM users u
      ORDER BY (
        (SELECT COUNT(*) FROM likes l WHERE l.user_id = u.id AND l.created_at >= ? AND l.created_at <= ?) +
        (SELECT COUNT(*) FROM comments c WHERE c.user_id = u.id AND c.created_at >= ? AND c.created_at <= ?) +
        (SELECT COUNT(*) FROM reactions r WHERE r.user_id = u.id AND r.created_at >= ? AND r.created_at <= ?)
      ) DESC
      LIMIT 5
    `).bind(
      startTs, endTs, startTs, endTs, startTs, endTs,
      startTs, endTs, startTs, endTs, startTs, endTs
    ).all() as { results: Array<{ username: string; likes: number; comments: number; reactions: number }> };

    // Generate highlights
    const highlights: Array<{ type: string; text: string; icon: string }> = [];
    
    if (statsResult) {
      if (statsResult.new_users >= 10) {
        highlights.push({ type: 'users', text: `${statsResult.new_users} new members joined! 🎉`, icon: '👥' });
      } else if (statsResult.new_users >= 5) {
        highlights.push({ type: 'users', text: `${statsResult.new_users} new smokers in the club`, icon: '👋' });
      }
      
      if (statsResult.new_follows >= 50) {
        highlights.push({ type: 'follows', text: `${statsResult.new_follows} new connections made`, icon: '🤝' });
      }
      
      if (statsResult.new_checkins >= 20) {
        highlights.push({ type: 'checkins', text: `${statsResult.new_checkins} smokes logged this week`, icon: '🔥' });
      }
    }

    if (topBrandsResult.results.length > 0) {
      const topBrand = topBrandsResult.results[0];
      highlights.push({ 
        type: 'brand', 
        text: `${topBrand.brand} trending with ${topBrand.count} check-ins`, 
        icon: '📈' 
      });
    }

    return NextResponse.json({
      weekRange,
      stats: statsResult ? {
        newUsers: statsResult.new_users,
        newCheckins: statsResult.new_checkins,
        newLikes: statsResult.new_likes,
        newFollows: statsResult.new_follows,
        newComments: statsResult.new_comments,
        newReactions: statsResult.new_reactions,
      } : null,
      topBrands: topBrandsResult.results.map(b => ({
        brand: b.brand,
        count: b.count,
        avgRating: b.avg_rating,
      })),
      risingStars: risingStarsResult.results.map(s => ({
        username: s.username,
        checkins: s.checkins,
        joined: new Date(s.created_at * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
      })),
      mostEngaged: mostEngagedResult.results.filter(u => u.likes > 0 || u.comments > 0 || u.reactions > 0).map(u => ({
        username: u.username,
        likes: u.likes,
        comments: u.comments,
        reactions: u.reactions,
      })),
      highlights,
    });
  } catch (error) {
    console.error('This week API error:', error);
    return NextResponse.json({ error: 'Failed to load weekly data' }, { status: 500 });
  }
}
