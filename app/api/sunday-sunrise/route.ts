import { getRequestContext } from '@cloudflare/next-on-pages';
import { getAuth } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(request: Request) {
  const auth = await getAuth(request);
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { env } = getRequestContext();
  const db = env.DB;

  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  
  // Sunday sunrise service: 5 AM - 9 AM on Sunday only
  const isActive = dayOfWeek === 0 && hour >= 5 && hour < 9;
  
  // Get today's date boundaries
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartTs = Math.floor(todayStart.getTime() / 1000);
  
  const sunriseStart = new Date(now);
  sunriseStart.setHours(5, 0, 0, 0);
  const sunriseStartTs = Math.floor(sunriseStart.getTime() / 1000);
  
  const sunriseEnd = new Date(now);
  sunriseEnd.setHours(9, 0, 0, 0);
  const sunriseEndTs = Math.floor(sunriseEnd.getTime() / 1000);

  // Early risers who logged during Sunday sunrise hours (5-9 AM on Sundays)
  const earlyRisers = await db.prepare(`
    SELECT 
      u.username,
      c.brand,
      c.rating,
      c.created_at,
      c.review
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.created_at >= ? AND c.created_at < ?
    ORDER BY c.created_at ASC
    LIMIT 20
  `).bind(sunriseStartTs, sunriseEndTs).all();

  // All-time Sunday sunrise leaders
  const sunriseLeaders = await db.prepare(`
    SELECT 
      u.username,
      COUNT(*) as count,
      AVG(c.rating) as avg_rating
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE strftime('%w', datetime(c.created_at, 'unixepoch')) = '0'
      AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch')) AS INTEGER) >= 5
      AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch')) AS INTEGER) < 9
    GROUP BY u.id
    ORDER BY count DESC
    LIMIT 10
  `).all();

  // User's personal Sunday sunrise stats
  const userStats = await db.prepare(`
    SELECT 
      COUNT(*) as sunrise_count,
      AVG(rating) as avg_rating
    FROM checkins
    WHERE user_id = ?
      AND strftime('%w', datetime(created_at, 'unixepoch')) = '0'
      AND CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) >= 5
      AND CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) < 9
  `).bind(auth.userId).first() as { sunrise_count: number; avg_rating: number | null };

  // Platform-wide Sunday sunrise stats
  const platformStats = await db.prepare(`
    SELECT 
      COUNT(*) as total_sunrise_smokes,
      COUNT(DISTINCT user_id) as unique_risers,
      AVG(rating) as avg_rating
    FROM checkins
    WHERE strftime('%w', datetime(created_at, 'unixepoch')) = '0'
      AND CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) >= 5
      AND CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) < 9
  `).first() as { total_sunrise_smokes: number; unique_risers: number; avg_rating: number | null };

  // Sunday morning blessings (rotating inspirational messages)
  const blessings = [
    "The early smoke catches the peace.",
    "Sunday mornings are made for reflection.",
    "In the quiet dawn, we find clarity.",
    "Rise with the sun, smoke with intention.",
    "Every Sunday sunrise is a fresh chapter.",
    "The world is still. Your thoughts are your own.",
    "Morning light brings morning insights.",
    "Sunday dawn: where the week's wisdom settles.",
    "In silence, we hear what matters most.",
    "The first light reveals the path forward."
  ];
  
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const blessing = blessings[dayOfYear % blessings.length];

  // Calculate time until service ends (or starts if not active)
  let timeInfo;
  if (isActive) {
    const serviceEnd = new Date(now);
    serviceEnd.setHours(9, 0, 0, 0);
    const msRemaining = serviceEnd.getTime() - now.getTime();
    const minutesRemaining = Math.floor(msRemaining / (1000 * 60));
    timeInfo = {
      isActive: true,
      minutesRemaining,
      phase: hour < 6 ? 'First Light' : hour < 7 ? 'Golden Hour' : hour < 8 ? 'Morning Glory' : 'Service Closing'
    };
  } else {
    // Calculate time until next Sunday 5 AM
    const nextSunday = new Date(now);
    const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
    nextSunday.setDate(now.getDate() + (dayOfWeek === 0 && hour >= 9 ? 7 : daysUntilSunday));
    nextSunday.setHours(5, 0, 0, 0);
    const hoursUntil = Math.ceil((nextSunday.getTime() - now.getTime()) / (1000 * 60 * 60));
    timeInfo = {
      isActive: false,
      hoursUntil
    };
  }

  return Response.json({
    isActive,
    timeInfo,
    blessing,
    earlyRisers: earlyRisers.results.map(r => ({
      username: r.username as string,
      brand: r.brand as string,
      rating: r.rating as number,
      review: r.review as string | null,
      createdAt: r.created_at as number
    })),
    sunriseLeaders: sunriseLeaders.results.map((r, i) => ({
      username: r.username as string,
      count: r.count as number,
      avgRating: r.avg_rating as number,
      rank: i + 1
    })),
    userStats: {
      sunriseCount: userStats?.sunrise_count || 0,
      avgRating: userStats?.avg_rating || null
    },
    platformStats: {
      totalSunriseSmokes: platformStats?.total_sunrise_smokes || 0,
      uniqueRisers: platformStats?.unique_risers || 0,
      avgRating: platformStats?.avg_rating || null
    }
  });
}
