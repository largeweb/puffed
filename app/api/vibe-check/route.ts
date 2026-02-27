import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const now = Math.floor(Date.now() / 1000);
    const today = now - (now % 86400); // Start of UTC day
    const last24h = now - 86400;
    const last1h = now - 3600;
    const lastWeek = now - 604800;

    // Get mood breakdown for last 24h
    const moodBreakdown = await db.prepare(`
      SELECT mood, COUNT(*) as count
      FROM checkins
      WHERE created_at > ? AND mood IS NOT NULL AND mood != ''
      GROUP BY mood
      ORDER BY count DESC
      LIMIT 10
    `).bind(last24h).all();

    // Get smoke spot breakdown
    const spotBreakdown = await db.prepare(`
      SELECT smoke_spot, COUNT(*) as count
      FROM checkins
      WHERE created_at > ? AND smoke_spot IS NOT NULL AND smoke_spot != ''
      GROUP BY smoke_spot
      ORDER BY count DESC
      LIMIT 8
    `).bind(last24h).all();

    // Get drink pairing breakdown
    const drinkBreakdown = await db.prepare(`
      SELECT drink_pairing, COUNT(*) as count
      FROM checkins
      WHERE created_at > ? AND drink_pairing IS NOT NULL AND drink_pairing != '' AND drink_pairing != 'nothing'
      GROUP BY drink_pairing
      ORDER BY count DESC
      LIMIT 8
    `).bind(last24h).all();

    // Who's smoking right now (last hour)
    const recentSmokers = await db.prepare(`
      SELECT DISTINCT c.user_id, u.username, c.brand, c.mood, c.created_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at > ?
      ORDER BY c.created_at DESC
      LIMIT 5
    `).bind(last1h).all();

    // Calculate vibe score (based on ratings and moods)
    const vibeScoreData = await db.prepare(`
      SELECT 
        AVG(rating) as avg_rating,
        COUNT(*) as total_checkins
      FROM checkins
      WHERE created_at > ?
    `).bind(last24h).first();

    // Most common mood emoji mapping
    const moodEmoji: Record<string, string> = {
      'relaxed': '😌',
      'happy': '😊',
      'celebratory': '🎉',
      'tired': '😴',
      'contemplative': '🤔',
      'stressed': '😰',
      'excited': '🤩',
      'peaceful': '☮️',
      'social': '🥳',
      'focused': '🎯'
    };

    // Spot emoji mapping
    const spotEmoji: Record<string, string> = {
      'porch': '🏠',
      'backyard': '🌳',
      'balcony': '🌆',
      'garage': '🚗',
      'lounge': '🛋️',
      'rooftop': '🏙️',
      'park': '🌲',
      'beach': '🏖️',
      'home': '🏡',
      'car': '🚙'
    };

    // Drink emoji mapping
    const drinkEmoji: Record<string, string> = {
      'coffee': '☕',
      'whiskey': '🥃',
      'beer': '🍺',
      'wine': '🍷',
      'water': '💧',
      'tea': '🍵',
      'bourbon': '🥃',
      'scotch': '🥃',
      'rum': '🍹',
      'nothing': '❌',
      'cocktail': '🍸',
      'soda': '🥤',
      'lemonade': '🍋'
    };

    // Calculate collective vibe
    const avgRating = vibeScoreData?.avg_rating || 0;
    const totalToday = vibeScoreData?.total_checkins || 0;
    
    let collectiveVibe = 'Chill';
    let vibeEmoji = '😌';
    if (avgRating >= 4.5) { collectiveVibe = 'Excellent'; vibeEmoji = '🔥'; }
    else if (avgRating >= 4) { collectiveVibe = 'Good Vibes'; vibeEmoji = '✨'; }
    else if (avgRating >= 3) { collectiveVibe = 'Mellow'; vibeEmoji = '🌊'; }
    else if (avgRating >= 2) { collectiveVibe = 'Mixed'; vibeEmoji = '🤷'; }
    else { collectiveVibe = 'Rough Day'; vibeEmoji = '😔'; }

    // Get today's most popular brand
    const topBrand = await db.prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins
      WHERE created_at > ?
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 1
    `).bind(last24h).first();

    return NextResponse.json({
      moods: (moodBreakdown.results || []).map((m: any) => ({
        mood: m.mood,
        count: m.count,
        emoji: moodEmoji[m.mood] || '💭'
      })),
      spots: (spotBreakdown.results || []).map((s: any) => ({
        spot: s.smoke_spot,
        count: s.count,
        emoji: spotEmoji[s.smoke_spot] || '📍'
      })),
      drinks: (drinkBreakdown.results || []).map((d: any) => ({
        drink: d.drink_pairing,
        count: d.count,
        emoji: drinkEmoji[d.drink_pairing] || '🥤'
      })),
      recentSmokers: (recentSmokers.results || []).map((s: any) => ({
        username: s.username,
        brand: s.brand,
        mood: s.mood,
        moodEmoji: moodEmoji[s.mood] || '💭',
        minutesAgo: Math.floor((now - s.created_at) / 60)
      })),
      collectiveVibe: {
        label: collectiveVibe,
        emoji: vibeEmoji,
        avgRating: Number(avgRating).toFixed(1),
        totalToday: totalToday
      },
      topBrand: topBrand ? { brand: topBrand.brand, count: topBrand.count } : null,
      timestamp: now
    });
  } catch (error) {
    console.error('Vibe check error:', error);
    return NextResponse.json({ error: 'Failed to load vibe check' }, { status: 500 });
  }
}
