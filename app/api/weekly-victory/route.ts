import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

interface VictoryData {
  checkinsThisWeek: number;
  avgRating: number | null;
  topBrand: string | null;
  uniqueBrands: number;
  newBadges: string[];
  likesReceived: number;
  commentsReceived: number;
  reactionsReceived: number;
  currentStreak: number;
  weekdaysSmoked: number;
  firstSmoke: { brand: string; day: string } | null;
  biggestSession: { brand: string; rating: number } | null;
  totalEngagementGiven: number; // likes + comments you gave
  rank: number; // where you rank this week
  totalParticipants: number;
}

export async function GET(request: Request) {
  const { env } = getRequestContext();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    // Get start of this week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const mondayStart = new Date(now);
    mondayStart.setDate(now.getDate() - diffToMonday);
    mondayStart.setHours(0, 0, 0, 0);
    const weekStartTs = Math.floor(mondayStart.getTime() / 1000);

    // Check-ins this week
    const weekCheckins = await env.DB.prepare(`
      SELECT c.*, u.username
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.user_id = ? AND c.created_at >= ?
      ORDER BY c.created_at ASC
    `).bind(userId, weekStartTs).all();

    const checkinsThisWeek = weekCheckins.results?.length || 0;
    
    // Calculate stats
    let avgRating = null;
    let topBrand = null;
    let uniqueBrands = 0;
    let weekdaysSmoked = 0;
    let firstSmoke = null;
    let biggestSession = null;

    if (checkinsThisWeek > 0) {
      const ratings = weekCheckins.results!
        .map((c: any) => c.rating)
        .filter((r: any) => r !== null);
      if (ratings.length > 0) {
        avgRating = Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10;
      }

      // Brand frequency
      const brandCounts: Record<string, number> = {};
      const daysSmoked = new Set<number>();
      
      weekCheckins.results!.forEach((c: any) => {
        if (c.brand) {
          brandCounts[c.brand] = (brandCounts[c.brand] || 0) + 1;
        }
        const day = new Date(c.created_at * 1000).getDay();
        daysSmoked.add(day);
      });

      weekdaysSmoked = daysSmoked.size;
      uniqueBrands = Object.keys(brandCounts).length;
      
      // Top brand
      const sortedBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]);
      if (sortedBrands.length > 0) {
        topBrand = sortedBrands[0][0];
      }

      // First smoke of the week
      const first = weekCheckins.results![0] as any;
      if (first) {
        const day = new Date(first.created_at * 1000).toLocaleDateString('en-US', { weekday: 'long' });
        firstSmoke = { brand: first.brand || 'Unknown', day };
      }

      // Biggest session (highest rated)
      const sorted = [...weekCheckins.results!].sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
      const best = sorted[0] as any;
      if (best && best.rating) {
        biggestSession = { brand: best.brand || 'Unknown', rating: best.rating };
      }
    }

    // Likes received this week on user's check-ins
    const likesReceived = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM likes l
      JOIN checkins c ON l.checkin_id = c.id
      WHERE c.user_id = ? AND l.created_at >= ?
    `).bind(userId, weekStartTs).first() as { count: number };

    // Comments received
    const commentsReceived = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM comments cm
      JOIN checkins c ON cm.checkin_id = c.id
      WHERE c.user_id = ? AND cm.user_id != ? AND cm.created_at >= ?
    `).bind(userId, userId, weekStartTs).first() as { count: number };

    // Reactions received
    const reactionsReceived = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM reactions r
      JOIN checkins c ON r.checkin_id = c.id
      WHERE c.user_id = ? AND r.user_id != ? AND r.created_at >= ?
    `).bind(userId, userId, weekStartTs).first() as { count: number };

    // Engagement given (likes + comments you made)
    const engagementGiven = await env.DB.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM likes WHERE user_id = ? AND created_at >= ?) +
        (SELECT COUNT(*) FROM comments WHERE user_id = ? AND created_at >= ?) as total
    `).bind(userId, weekStartTs, userId, weekStartTs).first() as { total: number };

    // Current streak
    const streak = await env.DB.prepare(`
      SELECT streak FROM users WHERE id = ?
    `).bind(userId).first() as { streak: number } | null;

    // Weekly ranking (by check-ins)
    const weeklyRanking = await env.DB.prepare(`
      SELECT user_id, COUNT(*) as cnt
      FROM checkins
      WHERE created_at >= ?
      GROUP BY user_id
      ORDER BY cnt DESC
    `).bind(weekStartTs).all();

    let rank = 0;
    let totalParticipants = weeklyRanking.results?.length || 0;
    if (weeklyRanking.results) {
      const idx = weeklyRanking.results.findIndex((r: any) => r.user_id === userId);
      rank = idx >= 0 ? idx + 1 : 0;
    }

    // Check for badges earned this week (simplified - check if user has certain achievements)
    // This is a placeholder - in a full system you'd track badge earn dates
    const newBadges: string[] = [];
    if (checkinsThisWeek >= 1 && checkinsThisWeek < 5) newBadges.push('Active Week');
    if (checkinsThisWeek >= 5) newBadges.push('Power Week 💪');
    if (weekdaysSmoked >= 5) newBadges.push('Consistent 🎯');
    if (uniqueBrands >= 3) newBadges.push('Explorer 🧭');
    if (likesReceived.count >= 5) newBadges.push('Popular 🌟');
    if (engagementGiven.total >= 10) newBadges.push('Community Builder 💕');

    const victoryData: VictoryData = {
      checkinsThisWeek,
      avgRating,
      topBrand,
      uniqueBrands,
      newBadges,
      likesReceived: likesReceived.count || 0,
      commentsReceived: commentsReceived.count || 0,
      reactionsReceived: reactionsReceived.count || 0,
      currentStreak: streak?.streak || 0,
      weekdaysSmoked,
      firstSmoke,
      biggestSession,
      totalEngagementGiven: engagementGiven.total || 0,
      rank,
      totalParticipants
    };

    return NextResponse.json(victoryData);
  } catch (error: any) {
    console.error('Weekly victory error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
