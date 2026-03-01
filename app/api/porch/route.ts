import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { verifyAuth } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { env } = getRequestContext();
  const db = env.DB;
  
  const auth = await verifyAuth(request, db);
  const userId = auth?.userId || null;
  
  const now = new Date();
  const hour = now.getUTCHours() - 5; // EST adjustment
  const adjustedHour = hour < 0 ? hour + 24 : hour;
  const dayOfWeek = now.getDay();
  const isSunday = dayOfWeek === 0;
  
  // Time of day descriptions
  const getTimeOfDay = (h: number) => {
    if (h < 8) return 'Early Morning';
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    if (h < 20) return 'Evening';
    return 'Night';
  };
  
  // Porch moods based on time
  const getMood = (h: number) => {
    if (h < 7) return 'Dawn breaks over the neighborhood. Coffee steam rises.';
    if (h < 10) return 'Morning dew on the grass. Birds singing their Sunday songs.';
    if (h < 13) return 'Sun warming the wood. Perfect porch weather.';
    if (h < 16) return 'Lazy afternoon. Time moves slow, just how we like it.';
    if (h < 19) return 'Golden hour light. The neighborhood settling in.';
    if (h < 21) return 'Crickets starting up. Another Sunday well spent.';
    return 'Stars coming out. One more smoke before bed.';
  };
  
  // Neighborhood vibes - ambient sounds/feelings
  const neighborhoodVibes = [
    '🐦 Birds chirping',
    '🍃 Leaves rustling', 
    '🚗 Distant cars',
    '👋 Neighbors waving',
    '🌸 Flowers blooming',
    '☀️ Warm sunshine',
    '💨 Gentle breeze'
  ];
  
  // Peace level based on activity
  const getPeaceLevel = (smokes: number) => {
    if (smokes === 0) return '🧘 Tranquil';
    if (smokes < 3) return '😌 Peaceful';
    if (smokes < 6) return '☺️ Cozy';
    if (smokes < 10) return '🤗 Lively';
    return '🎉 Full House';
  };
  
  // Get today's start (midnight EST)
  const todayStart = new Date(now);
  todayStart.setUTCHours(5, 0, 0, 0); // 5 UTC = midnight EST
  if (now < todayStart) todayStart.setDate(todayStart.getDate() - 1);
  const todayStartTs = Math.floor(todayStart.getTime() / 1000);
  
  // Get current Sunday smokers (today's check-ins if Sunday)
  const currentSitters = isSunday ? await db.prepare(`
    SELECT c.id, u.username, c.brand, c.product, c.rating, c.photo_url as photoUrl, c.created_at
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.created_at >= ?
    ORDER BY c.created_at DESC
    LIMIT 10
  `).bind(todayStartTs).all() : { results: [] };
  
  // Get porch regulars (users with most Sunday check-ins)
  const porchRegulars = await db.prepare(`
    SELECT u.username, COUNT(*) as sundaySmokes, AVG(c.rating) as avgRating
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE strftime('%w', datetime(c.created_at, 'unixepoch', '-5 hours')) = '0'
    GROUP BY u.id
    ORDER BY sundaySmokes DESC
    LIMIT 10
  `).all();
  
  // Today's stats
  const todayStatsQuery = isSunday ? await db.prepare(`
    SELECT COUNT(*) as totalSmokes, AVG(rating) as avgRating
    FROM checkins
    WHERE created_at >= ?
  `).bind(todayStartTs).first() : null;
  
  const todayTopBrand = isSunday ? await db.prepare(`
    SELECT brand, COUNT(*) as cnt
    FROM checkins
    WHERE created_at >= ?
    GROUP BY brand
    ORDER BY cnt DESC
    LIMIT 1
  `).bind(todayStartTs).first() : null;
  
  // All-time Sunday stats
  const allTimeStats = await db.prepare(`
    SELECT COUNT(*) as totalSundaySmokes
    FROM checkins
    WHERE strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) = '0'
  `).first();
  
  const peakHourQuery = await db.prepare(`
    SELECT CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) as hour, COUNT(*) as cnt
    FROM checkins
    WHERE strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) = '0'
    GROUP BY hour
    ORDER BY cnt DESC
    LIMIT 1
  `).first();
  
  const sundayFavBrand = await db.prepare(`
    SELECT brand, COUNT(*) as cnt
    FROM checkins
    WHERE strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) = '0'
    GROUP BY brand
    ORDER BY cnt DESC
    LIMIT 1
  `).first();
  
  // User stats if logged in
  let userStats = null;
  if (userId) {
    const userSundaySmokes = await db.prepare(`
      SELECT COUNT(*) as totalPorchSessions
      FROM checkins
      WHERE user_id = ?
      AND strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) = '0'
    `).bind(userId).first() as { totalPorchSessions: number } | null;
    
    const userFavBrand = await db.prepare(`
      SELECT brand, COUNT(*) as cnt
      FROM checkins
      WHERE user_id = ?
      AND strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) = '0'
      GROUP BY brand
      ORDER BY cnt DESC
      LIMIT 1
    `).bind(userId).first() as { brand: string } | null;
    
    // Calculate rank among Sunday smokers
    const userRank = await db.prepare(`
      SELECT COUNT(*) + 1 as rank
      FROM (
        SELECT user_id, COUNT(*) as cnt
        FROM checkins
        WHERE strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) = '0'
        GROUP BY user_id
        HAVING cnt > (
          SELECT COUNT(*) FROM checkins 
          WHERE user_id = ? 
          AND strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) = '0'
        )
      )
    `).bind(userId).first() as { rank: number } | null;
    
    userStats = {
      totalPorchSessions: userSundaySmokes?.totalPorchSessions || 0,
      favoriteBrand: userFavBrand?.brand || null,
      longestStreak: Math.min(userSundaySmokes?.totalPorchSessions || 0, 10), // Simplified streak
      rank: userRank?.rank || null
    };
  }
  
  return NextResponse.json({
    isSunday,
    currentHour: adjustedHour,
    timeOfDay: getTimeOfDay(adjustedHour),
    porchMood: getMood(adjustedHour),
    currentSitters: (currentSitters.results as Array<{
      id: number;
      username: string;
      brand: string;
      product: string | null;
      rating: number;
      photoUrl: string | null;
      created_at: number;
    }>).map(s => ({
      id: s.id,
      username: s.username,
      brand: s.brand,
      product: s.product,
      rating: s.rating,
      photoUrl: s.photoUrl,
      time: new Date(s.created_at * 1000).toISOString()
    })),
    porchRegulars: (porchRegulars.results as Array<{
      username: string;
      sundaySmokes: number;
      avgRating: number;
    }>).map(r => ({
      username: r.username,
      sundaySmokes: r.sundaySmokes,
      avgRating: r.avgRating || 0,
      favoriteSpot: 'Front Porch'
    })),
    todayStats: {
      totalSmokes: (todayStatsQuery as { totalSmokes: number } | null)?.totalSmokes || 0,
      avgRating: (todayStatsQuery as { avgRating: number } | null)?.avgRating || 0,
      topBrand: (todayTopBrand as { brand: string } | null)?.brand || null,
      peaceLevel: getPeaceLevel((todayStatsQuery as { totalSmokes: number } | null)?.totalSmokes || 0)
    },
    allTimeStats: {
      totalSundaySmokes: (allTimeStats as { totalSundaySmokes: number } | null)?.totalSundaySmokes || 0,
      mostPopularHour: (peakHourQuery as { hour: number } | null)?.hour ?? 12,
      favoriteBrand: (sundayFavBrand as { brand: string } | null)?.brand || null,
      avgSessionLength: 45 // Placeholder
    },
    userStats,
    neighborhoodVibes: neighborhoodVibes.slice(0, 4 + Math.floor(Math.random() * 3))
  });
}
