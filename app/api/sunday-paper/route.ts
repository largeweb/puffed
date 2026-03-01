import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { cookies } from 'next/headers';

export const runtime = 'edge';

interface Headline {
  type: 'checkin' | 'follow' | 'streak' | 'milestone';
  title: string;
  subtitle: string;
  time: string;
}

interface SportsScore {
  username: string;
  stat: string;
  value: number;
  rank: number;
}

const cigarJokes = [
  "Why did the cigar break up with the cigarette? It wanted a more sophisticated relationship!",
  "What do you call a cigar that tells jokes? A pun-atela!",
  "I tried to smoke a dictionary once. The words were too harsh.",
  "My cigar told me a secret. It was a smokin' hot tip!",
  "Why do cigars make terrible comedians? Their delivery is always too drawn out!",
  "What's a cigar's favorite dance? The Smoke Waltz!",
  "I asked my cigar for advice. It said 'Take it slow and enjoy the moment.'",
];

const cigarFacts = [
  "The world's largest cigar was 135 feet long and weighed over 1,600 pounds.",
  "Cuba's cigar industry employs over 200,000 people.",
  "A single cigar roller can produce about 100 cigars per day.",
  "The ring gauge of a cigar measures its diameter in 64ths of an inch.",
  "Cigars were originally made in Cuba by the Taíno people.",
  "Winston Churchill smoked about 8-10 cigars per day.",
  "The optimal humidity for storing cigars is 70% at 70°F.",
];

const sundayPuzzles = [
  "🚬 + ☕ + 📰 = The perfect _____?",
  "Unscramble: DMONAC (A country famous for cigars)",
  "What has leaves but isn't a tree, is rolled but isn't paper?",
  "Fill in: A morning smoke with _____ is a Sunday must.",
  "Riddle: I'm lit but I'm not angry. What am I?",
];

const sundayMottos = [
  "All the smoke that's fit to print",
  "Your weekly dose of cigar culture",
  "Rest, relax, and read on",
  "The gentleman's Sunday companion",
];

export async function GET() {
  const { env } = getRequestContext();
  const db = env.DB;
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const currentHour = now.getHours();
  const isSunday = dayOfWeek === 0;
  const isPaperTime = currentHour >= 6 && currentHour < 14; // 6 AM - 2 PM

  // Get user from cookies
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;

  // Format date for masthead
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Weather based on time
  const weatherMsgs = currentHour < 8 ? '☀️ Clear skies' : currentHour < 12 ? '🌤️ Partly cloudy' : '☁️ Overcast';

  // Calculate countdown if not Sunday
  let countdownMessage = '';
  if (!isSunday) {
    const daysUntil = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    countdownMessage = `${daysUntil} day${daysUntil > 1 ? 's' : ''} until next Sunday edition`;
  }

  // Get weekend start/end timestamps (Saturday 00:00 to Sunday 23:59)
  const weekendStart = new Date(now);
  weekendStart.setDate(now.getDate() - (dayOfWeek === 0 ? 1 : dayOfWeek));
  weekendStart.setHours(0, 0, 0, 0);
  
  const weekendEnd = new Date(weekendStart);
  weekendEnd.setDate(weekendStart.getDate() + 2);
  weekendEnd.setHours(23, 59, 59, 999);

  // Get recent activity for headlines (last 24 hours)
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  const [recentCheckins, recentFollows, streaks, topBrands, weekendActivity, userSundays] = await Promise.all([
    // Recent check-ins
    db.prepare(`
      SELECT c.id, c.brand, c.rating, c.created_at, u.username
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at > ?
      ORDER BY c.created_at DESC
      LIMIT 10
    `).bind(dayAgo).all<{ id: number; brand: string; rating: number; created_at: number; username: string }>(),

    // Recent follows
    db.prepare(`
      SELECT f.created_at, u1.username as follower, u2.username as followed
      FROM follows f
      JOIN users u1 ON f.follower_id = u1.id
      JOIN users u2 ON f.following_id = u2.id
      WHERE f.created_at > ?
      ORDER BY f.created_at DESC
      LIMIT 5
    `).bind(dayAgo).all<{ created_at: number; follower: string; followed: string }>(),

    // Active streaks
    db.prepare(`
      SELECT u.username, s.current_streak
      FROM streaks s
      JOIN users u ON s.user_id = u.id
      WHERE s.current_streak >= 3
      ORDER BY s.current_streak DESC
      LIMIT 5
    `).all<{ username: string; current_streak: number }>(),

    // Top rated brands this week
    db.prepare(`
      SELECT brand, AVG(rating) as avg_rating, COUNT(*) as count
      FROM checkins
      WHERE created_at > ?
      GROUP BY brand
      HAVING COUNT(*) >= 2
      ORDER BY avg_rating DESC
      LIMIT 5
    `).bind(weekendStart.getTime()).all<{ brand: string; avg_rating: number; count: number }>(),

    // Weekend activity leaderboard
    db.prepare(`
      SELECT u.username, COUNT(*) as count, AVG(c.rating) as avg_rating
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at <= ?
      GROUP BY u.id
      ORDER BY count DESC
      LIMIT 10
    `).bind(weekendStart.getTime(), weekendEnd.getTime()).all<{ username: string; count: number; avg_rating: number }>(),

    // User's Sunday smokes (all time)
    userId ? db.prepare(`
      SELECT COUNT(*) as count
      FROM checkins
      WHERE user_id = ? AND strftime('%w', datetime(created_at/1000, 'unixepoch')) = '0'
    `).bind(userId).first<{ count: number }>() : null,
  ]);

  // Build headlines
  const headlines: Headline[] = [];

  // Add checkin headlines
  for (const c of (recentCheckins.results || []).slice(0, 3)) {
    headlines.push({
      type: 'checkin',
      title: `${c.username} lights up ${c.brand}`,
      subtitle: `Rated ${c.rating}⭐`,
      time: formatTimeAgo(c.created_at),
    });
  }

  // Add follow headlines
  for (const f of (recentFollows.results || []).slice(0, 2)) {
    headlines.push({
      type: 'follow',
      title: `${f.follower} now follows ${f.followed}`,
      subtitle: 'New connection formed',
      time: formatTimeAgo(f.created_at),
    });
  }

  // Lead story - top activity or streak
  let leadStory: Headline | null = null;
  if (weekendActivity.results && weekendActivity.results.length > 0) {
    const mvp = weekendActivity.results[0];
    leadStory = {
      type: 'milestone',
      title: `${mvp.username} Dominates Weekend!`,
      subtitle: `${mvp.count} check-ins with ${mvp.avg_rating?.toFixed(1) || 'N/A'}⭐ average`,
      time: 'This Weekend',
    };
  }

  // Build sports section
  const sportsLeaderboard: SportsScore[] = (weekendActivity.results || []).map((w, i) => ({
    username: w.username,
    stat: 'smokes',
    value: w.count,
    rank: i + 1,
  }));

  const weekendMVP = weekendActivity.results && weekendActivity.results.length > 0
    ? { username: weekendActivity.results[0].username, stat: 'Weekend Smokes', value: weekendActivity.results[0].count, rank: 1 }
    : null;

  const streakWatch = (streaks.results || []).map(s => ({ username: s.username, streak: s.current_streak }));

  // Lifestyle section
  const topRated = (topBrands.results || []).map(b => ({
    brand: b.brand,
    rating: Math.round(b.avg_rating * 10) / 10,
    checkins: b.count,
  }));

  // Get trending (brands with increased activity)
  const trending = (topBrands.results || []).slice(0, 3).map(b => ({
    brand: b.brand,
    change: b.count,
  }));

  // Get flavor of the week
  const flavorResult = await db.prepare(`
    SELECT flavor_tags
    FROM checkins
    WHERE flavor_tags IS NOT NULL AND created_at > ?
  `).bind(weekendStart.getTime()).all<{ flavor_tags: string }>();

  const flavorCounts: Record<string, number> = {};
  for (const row of flavorResult.results || []) {
    try {
      const tags = JSON.parse(row.flavor_tags) as string[];
      for (const tag of tags) {
        flavorCounts[tag] = (flavorCounts[tag] || 0) + 1;
      }
    } catch {}
  }
  const flavorOfTheWeek = Object.entries(flavorCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Classifieds - active users looking for connections
  const classifieds = await db.prepare(`
    SELECT u.username, c.brand, AVG(c.rating) as avg_rating
    FROM users u
    JOIN checkins c ON u.id = c.user_id
    GROUP BY u.id
    ORDER BY COUNT(*) DESC
    LIMIT 5
  `).all<{ username: string; brand: string; avg_rating: number }>();

  // Platform stats
  const [totalReaders, sundaySmokes, avgSundayRating] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
    db.prepare(`
      SELECT COUNT(*) as count FROM checkins 
      WHERE strftime('%w', datetime(created_at/1000, 'unixepoch')) = '0'
    `).first<{ count: number }>(),
    db.prepare(`
      SELECT AVG(rating) as avg FROM checkins 
      WHERE strftime('%w', datetime(created_at/1000, 'unixepoch')) = '0'
    `).first<{ avg: number }>(),
  ]);

  // Pick random content
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const jokeIdx = dayOfYear % cigarJokes.length;
  const factIdx = dayOfYear % cigarFacts.length;
  const puzzleIdx = dayOfYear % sundayPuzzles.length;
  const mottoIdx = dayOfYear % sundayMottos.length;

  return NextResponse.json({
    isSunday,
    isPaperTime,
    currentHour,
    countdownMessage,
    edition: isSunday ? 'Sunday Edition' : 'Preview Edition',
    masthead: {
      date: dateStr,
      weather: weatherMsgs,
      motto: sundayMottos[mottoIdx],
    },
    frontPage: {
      leadStory,
      headlines: headlines.slice(0, 6),
    },
    sportsSection: {
      weekendMVP,
      leaderboard: sportsLeaderboard,
      streakWatch,
    },
    lifestyleSection: {
      topRated,
      trending,
      flavorOfTheWeek,
    },
    classifieds: (classifieds.results || []).map(c => ({
      username: c.username,
      brand: c.brand,
      rating: Math.round(c.avg_rating),
      seeking: 'Similar taste buddies',
    })),
    comicsSection: {
      dailyJoke: cigarJokes[jokeIdx],
      funFact: cigarFacts[factIdx],
      todaysPuzzle: sundayPuzzles[puzzleIdx],
    },
    stats: {
      totalReaders: totalReaders?.count || 0,
      sundaySmokes: sundaySmokes?.count || 0,
      avgSundayRating: avgSundayRating?.avg ? Math.round(avgSundayRating.avg * 10) / 10 : 0,
      yourSundaySmokes: userSundays?.count || 0,
    },
  });
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
