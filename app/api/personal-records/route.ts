import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { cookies } from 'next/headers';

export const runtime = 'edge';

interface PersonalRecord {
  id: string;
  title: string;
  emoji: string;
  value: string;
  details?: string;
  date?: string;
  checkinId?: string;
}

interface RecordsResponse {
  records: PersonalRecord[];
  username: string;
  totalCheckins: number;
}

export async function GET(): Promise<NextResponse<RecordsResponse | { error: string }>> {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');
  
  if (!session?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { env } = getRequestContext();
  const db = env.DB;

  // Get user from session
  const sessionData = await db.prepare(
    'SELECT user_id FROM sessions WHERE id = ?'
  ).bind(session.value).first<{ user_id: string }>();

  if (!sessionData) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const userId = sessionData.user_id;

  // Get username
  const user = await db.prepare(
    'SELECT username FROM users WHERE id = ?'
  ).bind(userId).first<{ username: string }>();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const records: PersonalRecord[] = [];

  // 1. Total check-ins
  const totalResult = await db.prepare(
    'SELECT COUNT(*) as count FROM checkins WHERE user_id = ?'
  ).bind(userId).first<{ count: number }>();
  const totalCheckins = totalResult?.count || 0;

  // 2. Longest streak ever (calculated from check-in history)
  const allDates = await db.prepare(`
    SELECT DISTINCT date(datetime(created_at, 'unixepoch')) as smoke_date
    FROM checkins 
    WHERE user_id = ?
    ORDER BY smoke_date ASC
  `).bind(userId).all<{ smoke_date: string }>();

  let longestStreak = 0;
  let currentStreak = 1;
  const dates = allDates.results || [];
  
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1].smoke_date);
    const curr = new Date(dates[i].smoke_date);
    const diffDays = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      currentStreak++;
    } else {
      longestStreak = Math.max(longestStreak, currentStreak);
      currentStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  if (longestStreak > 0) {
    records.push({
      id: 'longest-streak',
      title: 'Longest Streak',
      emoji: '🔥',
      value: `${longestStreak} days`,
      details: longestStreak >= 7 ? 'Impressive consistency!' : 'Keep it up!'
    });
  }

  // 3. Most liked check-in
  const mostLiked = await db.prepare(`
    SELECT c.id, c.brand, c.product, c.created_at, COUNT(l.id) as likes
    FROM checkins c
    LEFT JOIN likes l ON l.checkin_id = c.id
    WHERE c.user_id = ?
    GROUP BY c.id
    ORDER BY likes DESC
    LIMIT 1
  `).bind(userId).first<{ id: string; brand: string; product: string | null; created_at: number; likes: number }>();

  if (mostLiked && mostLiked.likes > 0) {
    records.push({
      id: 'most-liked',
      title: 'Most Loved Smoke',
      emoji: '❤️',
      value: `${mostLiked.likes} likes`,
      details: mostLiked.product ? `${mostLiked.brand} ${mostLiked.product}` : mostLiked.brand,
      date: new Date(mostLiked.created_at * 1000).toLocaleDateString(),
      checkinId: mostLiked.id
    });
  }

  // 4. Most commented check-in
  const mostCommented = await db.prepare(`
    SELECT c.id, c.brand, c.product, c.created_at, COUNT(cm.id) as comments
    FROM checkins c
    LEFT JOIN comments cm ON cm.checkin_id = c.id
    WHERE c.user_id = ?
    GROUP BY c.id
    ORDER BY comments DESC
    LIMIT 1
  `).bind(userId).first<{ id: string; brand: string; product: string | null; created_at: number; comments: number }>();

  if (mostCommented && mostCommented.comments > 0) {
    records.push({
      id: 'most-commented',
      title: 'Most Discussed',
      emoji: '💬',
      value: `${mostCommented.comments} comments`,
      details: mostCommented.product ? `${mostCommented.brand} ${mostCommented.product}` : mostCommented.brand,
      date: new Date(mostCommented.created_at * 1000).toLocaleDateString(),
      checkinId: mostCommented.id
    });
  }

  // 5. Most active day (most smokes in one day)
  const mostActiveDay = await db.prepare(`
    SELECT date(datetime(created_at, 'unixepoch')) as smoke_date, COUNT(*) as count
    FROM checkins
    WHERE user_id = ?
    GROUP BY smoke_date
    ORDER BY count DESC
    LIMIT 1
  `).bind(userId).first<{ smoke_date: string; count: number }>();

  if (mostActiveDay && mostActiveDay.count > 1) {
    records.push({
      id: 'most-active-day',
      title: 'Most Active Day',
      emoji: '📈',
      value: `${mostActiveDay.count} smokes`,
      details: 'Your biggest smoking day',
      date: mostActiveDay.smoke_date
    });
  }

  // 6. Highest rated smoke (5-star)
  const fiveStarCount = await db.prepare(
    'SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND rating = 5'
  ).bind(userId).first<{ count: number }>();

  if (fiveStarCount && fiveStarCount.count > 0) {
    records.push({
      id: 'five-star-count',
      title: 'Perfect Smokes',
      emoji: '⭐',
      value: `${fiveStarCount.count} five-stars`,
      details: 'Your elite experiences'
    });
  }

  // 7. Earliest morning smoke
  const earliestSmoke = await db.prepare(`
    SELECT id, brand, product, created_at,
           cast(strftime('%H', datetime(created_at, 'unixepoch', 'localtime')) as integer) as hour
    FROM checkins
    WHERE user_id = ?
    ORDER BY hour ASC, created_at DESC
    LIMIT 1
  `).bind(userId).first<{ id: string; brand: string; product: string | null; created_at: number; hour: number }>();

  if (earliestSmoke && earliestSmoke.hour < 8) {
    const hourLabel = earliestSmoke.hour === 0 ? '12 AM' : 
                      earliestSmoke.hour < 12 ? `${earliestSmoke.hour} AM` : 
                      earliestSmoke.hour === 12 ? '12 PM' : `${earliestSmoke.hour - 12} PM`;
    records.push({
      id: 'earliest-smoke',
      title: 'Earliest Smoke',
      emoji: '🌅',
      value: hourLabel,
      details: earliestSmoke.product ? `${earliestSmoke.brand} ${earliestSmoke.product}` : earliestSmoke.brand,
      checkinId: earliestSmoke.id
    });
  }

  // 8. Latest night smoke
  const latestSmoke = await db.prepare(`
    SELECT id, brand, product, created_at,
           cast(strftime('%H', datetime(created_at, 'unixepoch', 'localtime')) as integer) as hour
    FROM checkins
    WHERE user_id = ?
    ORDER BY hour DESC, created_at DESC
    LIMIT 1
  `).bind(userId).first<{ id: string; brand: string; product: string | null; created_at: number; hour: number }>();

  if (latestSmoke && latestSmoke.hour >= 22) {
    const hourLabel = latestSmoke.hour === 0 ? '12 AM' : 
                      latestSmoke.hour < 12 ? `${latestSmoke.hour} AM` : 
                      latestSmoke.hour === 12 ? '12 PM' : `${latestSmoke.hour - 12} PM`;
    records.push({
      id: 'latest-smoke',
      title: 'Latest Night Smoke',
      emoji: '🌙',
      value: hourLabel,
      details: latestSmoke.product ? `${latestSmoke.brand} ${latestSmoke.product}` : latestSmoke.brand,
      checkinId: latestSmoke.id
    });
  }

  // 9. Unique brands explored
  const brandsCount = await db.prepare(
    'SELECT COUNT(DISTINCT brand) as count FROM checkins WHERE user_id = ?'
  ).bind(userId).first<{ count: number }>();

  if (brandsCount && brandsCount.count > 0) {
    records.push({
      id: 'brands-explored',
      title: 'Brands Explored',
      emoji: '🧭',
      value: `${brandsCount.count} brands`,
      details: brandsCount.count >= 10 ? 'True explorer!' : 'Keep discovering!'
    });
  }

  // 10. Most smoked brand (loyalty record)
  const mostSmoked = await db.prepare(`
    SELECT brand, COUNT(*) as count
    FROM checkins
    WHERE user_id = ?
    GROUP BY brand
    ORDER BY count DESC
    LIMIT 1
  `).bind(userId).first<{ brand: string; count: number }>();

  if (mostSmoked && mostSmoked.count > 1) {
    records.push({
      id: 'most-loyal',
      title: 'Go-To Brand',
      emoji: '💎',
      value: mostSmoked.brand,
      details: `${mostSmoked.count} times - your favorite!`
    });
  }

  // 11. Photos uploaded
  const photosCount = await db.prepare(
    'SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND image_url IS NOT NULL'
  ).bind(userId).first<{ count: number }>();

  if (photosCount && photosCount.count > 0) {
    records.push({
      id: 'photos-uploaded',
      title: 'Smoke Shots',
      emoji: '📸',
      value: `${photosCount.count} photos`,
      details: 'Capturing the moments'
    });
  }

  // 12. Average rating
  const avgRating = await db.prepare(
    'SELECT AVG(rating) as avg FROM checkins WHERE user_id = ? AND rating IS NOT NULL'
  ).bind(userId).first<{ avg: number }>();

  if (avgRating && avgRating.avg) {
    records.push({
      id: 'avg-rating',
      title: 'Average Rating',
      emoji: '⚖️',
      value: `${avgRating.avg.toFixed(1)}/5`,
      details: avgRating.avg >= 4 ? 'High standards!' : avgRating.avg >= 3 ? 'Fair judge' : 'Tough critic!'
    });
  }

  return NextResponse.json({
    records,
    username: user.username,
    totalCheckins
  });
}
