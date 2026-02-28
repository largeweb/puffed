import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

interface AwardWinner {
  username: string;
  value: number | string;
  subtitle?: string;
}

interface Award {
  id: string;
  title: string;
  emoji: string;
  description: string;
  winner: AwardWinner | null;
}

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    // Get start of current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartTs = Math.floor(weekStart.getTime() / 1000);

    const awards: Award[] = [];

    // 🏆 MVP - Most check-ins this week
    const mvpResult = await db.prepare(`
      SELECT u.username, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      GROUP BY c.user_id
      ORDER BY count DESC
      LIMIT 1
    `).bind(weekStartTs).first<{ username: string; count: number }>();
    
    awards.push({
      id: 'mvp',
      title: 'MVP of the Week',
      emoji: '🏆',
      description: 'Most check-ins this week',
      winner: mvpResult ? { username: mvpResult.username, value: mvpResult.count, subtitle: `${mvpResult.count} check-ins` } : null
    });

    // ⭐ Quality King - Highest average rating (min 3 check-ins)
    const qualityResult = await db.prepare(`
      SELECT u.username, AVG(c.rating) as avg_rating, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.rating IS NOT NULL
      GROUP BY c.user_id
      HAVING count >= 3
      ORDER BY avg_rating DESC
      LIMIT 1
    `).bind(weekStartTs).first<{ username: string; avg_rating: number; count: number }>();
    
    awards.push({
      id: 'quality',
      title: 'Quality King',
      emoji: '⭐',
      description: 'Highest avg rating (min 3 smokes)',
      winner: qualityResult ? { username: qualityResult.username, value: qualityResult.avg_rating.toFixed(1), subtitle: `${qualityResult.avg_rating.toFixed(1)} avg rating` } : null
    });

    // 💕 Social Butterfly - Most engagement given (likes + comments)
    const socialResult = await db.prepare(`
      SELECT u.username, 
        (SELECT COUNT(*) FROM likes WHERE user_id = u.id AND created_at >= ?) +
        (SELECT COUNT(*) FROM comments WHERE user_id = u.id AND created_at >= ?) as engagement
      FROM users u
      ORDER BY engagement DESC
      LIMIT 1
    `).bind(weekStartTs, weekStartTs).first<{ username: string; engagement: number }>();
    
    awards.push({
      id: 'social',
      title: 'Social Butterfly',
      emoji: '💕',
      description: 'Most likes & comments given',
      winner: socialResult && socialResult.engagement > 0 ? { username: socialResult.username, value: socialResult.engagement, subtitle: `${socialResult.engagement} interactions` } : null
    });

    // 🦉 Night Owl - Most late night smokes (midnight - 4 AM)
    const nightOwlResult = await db.prepare(`
      SELECT u.username, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
        AND ((c.created_at % 86400) >= 18000 AND (c.created_at % 86400) < 32400)
      GROUP BY c.user_id
      ORDER BY count DESC
      LIMIT 1
    `).bind(weekStartTs).first<{ username: string; count: number }>();
    
    awards.push({
      id: 'nightowl',
      title: 'Night Owl',
      emoji: '🦉',
      description: 'Most late night smokes (12-4 AM)',
      winner: nightOwlResult && nightOwlResult.count > 0 ? { username: nightOwlResult.username, value: nightOwlResult.count, subtitle: `${nightOwlResult.count} late nights` } : null
    });

    // 🌅 Early Bird - Most early morning smokes (4-7 AM)
    const earlyBirdResult = await db.prepare(`
      SELECT u.username, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
        AND ((c.created_at % 86400) >= 32400 AND (c.created_at % 86400) < 43200)
      GROUP BY c.user_id
      ORDER BY count DESC
      LIMIT 1
    `).bind(weekStartTs).first<{ username: string; count: number }>();
    
    awards.push({
      id: 'earlybird',
      title: 'Early Bird',
      emoji: '🌅',
      description: 'Most early morning smokes (4-7 AM)',
      winner: earlyBirdResult && earlyBirdResult.count > 0 ? { username: earlyBirdResult.username, value: earlyBirdResult.count, subtitle: `${earlyBirdResult.count} early mornings` } : null
    });

    // 🧭 Explorer - Most unique brands tried
    const explorerResult = await db.prepare(`
      SELECT u.username, COUNT(DISTINCT c.brand) as brands
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      GROUP BY c.user_id
      ORDER BY brands DESC
      LIMIT 1
    `).bind(weekStartTs).first<{ username: string; brands: number }>();
    
    awards.push({
      id: 'explorer',
      title: 'Brand Explorer',
      emoji: '🧭',
      description: 'Most unique brands this week',
      winner: explorerResult ? { username: explorerResult.username, value: explorerResult.brands, subtitle: `${explorerResult.brands} brands` } : null
    });

    // 📸 Photographer - Most photos shared
    const photoResult = await db.prepare(`
      SELECT u.username, COUNT(*) as photos
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.image_url IS NOT NULL
      GROUP BY c.user_id
      ORDER BY photos DESC
      LIMIT 1
    `).bind(weekStartTs).first<{ username: string; photos: number }>();
    
    awards.push({
      id: 'photographer',
      title: 'Photographer',
      emoji: '📸',
      description: 'Most photos shared',
      winner: photoResult && photoResult.photos > 0 ? { username: photoResult.username, value: photoResult.photos, subtitle: `${photoResult.photos} photos` } : null
    });

    // 🔥 Hot Streak - Longest current streak
    const streakResult = await db.prepare(`
      SELECT u.username, us.current_streak
      FROM user_stats us
      JOIN users u ON us.user_id = u.id
      WHERE us.current_streak > 0
      ORDER BY us.current_streak DESC
      LIMIT 1
    `).first<{ username: string; current_streak: number }>();
    
    awards.push({
      id: 'streak',
      title: 'Hot Streak',
      emoji: '🔥',
      description: 'Longest active streak',
      winner: streakResult ? { username: streakResult.username, value: streakResult.current_streak, subtitle: `${streakResult.current_streak} day streak` } : null
    });

    // 👑 Fan Favorite - Most likes received
    const fanFavResult = await db.prepare(`
      SELECT u.username, COUNT(*) as likes
      FROM likes l
      JOIN checkins c ON l.checkin_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE l.created_at >= ?
      GROUP BY c.user_id
      ORDER BY likes DESC
      LIMIT 1
    `).bind(weekStartTs).first<{ username: string; likes: number }>();
    
    awards.push({
      id: 'fanfav',
      title: 'Fan Favorite',
      emoji: '👑',
      description: 'Most likes received',
      winner: fanFavResult && fanFavResult.likes > 0 ? { username: fanFavResult.username, value: fanFavResult.likes, subtitle: `${fanFavResult.likes} likes` } : null
    });

    // 💬 Storyteller - Longest/most reviews written
    const storytellerResult = await db.prepare(`
      SELECT u.username, COUNT(*) as reviews, SUM(LENGTH(c.review)) as total_chars
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.review IS NOT NULL AND LENGTH(c.review) > 10
      GROUP BY c.user_id
      ORDER BY total_chars DESC
      LIMIT 1
    `).bind(weekStartTs).first<{ username: string; reviews: number; total_chars: number }>();
    
    awards.push({
      id: 'storyteller',
      title: 'Storyteller',
      emoji: '💬',
      description: 'Most detailed reviews',
      winner: storytellerResult && storytellerResult.reviews > 0 ? { username: storytellerResult.username, value: storytellerResult.reviews, subtitle: `${storytellerResult.reviews} detailed reviews` } : null
    });

    // Get user's awards if logged in
    let userAwards: string[] = [];
    if (userId) {
      const userResult = await db.prepare(`SELECT username FROM users WHERE id = ?`).bind(userId).first<{ username: string }>();
      if (userResult) {
        userAwards = awards.filter(a => a.winner?.username === userResult.username).map(a => a.id);
      }
    }

    // Week info
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    return NextResponse.json({
      awards,
      userAwards,
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      totalAwards: awards.length,
      claimedAwards: awards.filter(a => a.winner).length
    });
  } catch (error) {
    console.error('Smoke awards error:', error);
    return NextResponse.json({ error: 'Failed to load awards' }, { status: 500 });
  }
}
