import { getRequestContext } from '@cloudflare/next-on-pages';
import { parseSessionCookie } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { env } = getRequestContext();
  const db = env.DB;
  
  // Get user from session
  const cookieHeader = request.headers.get('cookie');
  const sessionId = parseSessionCookie(cookieHeader);
  let userId: number | null = null;
  
  if (sessionId) {
    const nowTs = Math.floor(Date.now() / 1000);
    const session = await db
      .prepare('SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?')
      .bind(sessionId, nowTs)
      .first<{ user_id: number }>();
    userId = session?.user_id || null;
  }

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  
  // Sunday Morning Zen: 6 AM - 10 AM on Sunday only
  const isActive = dayOfWeek === 0 && hour >= 6 && hour < 10;
  
  // Get today's zen window boundaries
  const zenStart = new Date(now);
  zenStart.setHours(6, 0, 0, 0);
  const zenStartTs = Math.floor(zenStart.getTime() / 1000);
  
  const zenEnd = new Date(now);
  zenEnd.setHours(10, 0, 0, 0);
  const zenEndTs = Math.floor(zenEnd.getTime() / 1000);

  // Peaceful smokers who logged during Sunday zen hours today
  const zenSmokers = await db.prepare(`
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
  `).bind(zenStartTs, zenEndTs).all();

  // All-time Sunday zen masters (most check-ins during 6-10 AM Sundays)
  const zenMasters = await db.prepare(`
    SELECT 
      u.username,
      COUNT(*) as count,
      AVG(c.rating) as avg_rating
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE strftime('%w', datetime(c.created_at, 'unixepoch')) = '0'
      AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch')) AS INTEGER) >= 6
      AND CAST(strftime('%H', datetime(c.created_at, 'unixepoch')) AS INTEGER) < 10
    GROUP BY u.id
    ORDER BY count DESC
    LIMIT 10
  `).all();

  // User's personal zen stats
  const userStats = await db.prepare(`
    SELECT 
      COUNT(*) as zen_count,
      AVG(rating) as avg_rating
    FROM checkins
    WHERE user_id = ?
      AND strftime('%w', datetime(created_at, 'unixepoch')) = '0'
      AND CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) >= 6
      AND CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) < 10
  `).bind(userId).first<{ zen_count: number; avg_rating: number | null }>();

  // Platform-wide zen stats
  const platformStats = await db.prepare(`
    SELECT 
      COUNT(*) as total_zen_smokes,
      COUNT(DISTINCT user_id) as practitioners,
      AVG(rating) as avg_rating
    FROM checkins
    WHERE strftime('%w', datetime(created_at, 'unixepoch')) = '0'
      AND CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) >= 6
      AND CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) < 10
  `).first<{ total_zen_smokes: number; practitioners: number; avg_rating: number | null }>();

  // Zen wisdoms (rotating daily)
  const wisdoms = [
    "The smoke rises, thoughts settle.",
    "In the quiet morning, clarity blooms.",
    "Let go of the week. Embrace the stillness.",
    "Be present. Be peaceful. Be here now.",
    "The mind, like smoke, needs space to drift.",
    "Sunday mornings remind us to slow down.",
    "Find peace in the ritual, not the rush.",
    "Breathe deeply. The world can wait.",
    "This moment is enough.",
    "Inner peace begins with a quiet morning.",
    "Let the first light guide your thoughts.",
    "Simplicity is the ultimate sophistication.",
    "The art of rest is as important as motion.",
    "Sunday: a day to refuel the soul.",
    "In stillness, we find our truest selves."
  ];
  
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const wisdom = wisdoms[dayOfYear % wisdoms.length];

  // Get current zen phase
  let timeInfo;
  if (isActive) {
    const zenEndTime = new Date(now);
    zenEndTime.setHours(10, 0, 0, 0);
    const msRemaining = zenEndTime.getTime() - now.getTime();
    const minutesRemaining = Math.floor(msRemaining / (1000 * 60));
    
    let phase = 'Morning Zen';
    if (hour < 7) phase = 'Dawn Meditation';
    else if (hour < 8) phase = 'Mindful Hour';
    else if (hour < 9) phase = 'Inner Peace';
    else phase = 'Zen Closing';
    
    timeInfo = {
      isActive: true,
      minutesRemaining,
      phase
    };
  } else {
    // Calculate time until next Sunday 6 AM
    const nextSunday = new Date(now);
    const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
    nextSunday.setDate(now.getDate() + (dayOfWeek === 0 && hour >= 10 ? 7 : daysUntilSunday));
    nextSunday.setHours(6, 0, 0, 0);
    const hoursUntil = Math.ceil((nextSunday.getTime() - now.getTime()) / (1000 * 60 * 60));
    timeInfo = {
      isActive: false,
      hoursUntil
    };
  }

  // Breathing exercise timings (4-7-8 technique)
  const breathingExercise = {
    name: '4-7-8 Breath',
    inhale: 4,
    hold: 7,
    exhale: 8,
    cycles: 4
  };

  return Response.json({
    isActive,
    timeInfo,
    wisdom,
    breathingExercise,
    zenSmokers: zenSmokers.results.map(r => ({
      username: r.username as string,
      brand: r.brand as string,
      rating: r.rating as number,
      review: r.review as string | null,
      createdAt: r.created_at as number
    })),
    zenMasters: zenMasters.results.map((r, i) => ({
      username: r.username as string,
      count: r.count as number,
      avgRating: r.avg_rating as number,
      rank: i + 1
    })),
    userStats: {
      zenCount: userStats?.zen_count || 0,
      avgRating: userStats?.avg_rating || null
    },
    platformStats: {
      totalZenSmokes: platformStats?.total_zen_smokes || 0,
      practitioners: platformStats?.practitioners || 0,
      avgRating: platformStats?.avg_rating || null
    }
  });
}
