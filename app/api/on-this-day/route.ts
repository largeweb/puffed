import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { cookies } from 'next/headers';

export const runtime = 'edge';

interface MemoryCheckin {
  id: string;
  brand: string;
  product: string | null;
  rating: number | null;
  image_url: string | null;
  created_at: number;
  review: string | null;
}

interface OnThisDayMemory {
  period: 'last_week' | 'last_month' | 'last_year';
  label: string;
  emoji: string;
  checkins: MemoryCheckin[];
  daysAgo: number;
}

export interface OnThisDayResponse {
  memories: OnThisDayMemory[];
  hasMemories: boolean;
  message?: string;
}

export async function GET(): Promise<NextResponse<OnThisDayResponse | { error: string }>> {
  try {
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
    const now = Math.floor(Date.now() / 1000);
    const memories: OnThisDayMemory[] = [];

    // Define time periods to check
    const periods: { 
      period: OnThisDayMemory['period']; 
      label: string; 
      emoji: string; 
      daysAgo: number;
      windowHours: number;
    }[] = [
      { period: 'last_week', label: 'This time last week', emoji: '📅', daysAgo: 7, windowHours: 12 },
      { period: 'last_month', label: 'This time last month', emoji: '🗓️', daysAgo: 30, windowHours: 24 },
      { period: 'last_year', label: 'This time last year', emoji: '📆', daysAgo: 365, windowHours: 48 },
    ];

    for (const p of periods) {
      // Calculate time window for this period
      const targetTime = now - (p.daysAgo * 24 * 60 * 60);
      const windowSeconds = p.windowHours * 60 * 60;
      const startTime = targetTime - windowSeconds;
      const endTime = targetTime + windowSeconds;

      // Find check-ins in this window
      const checkins = await db.prepare(`
        SELECT id, brand, product, rating, image_url, created_at, review
        FROM checkins
        WHERE user_id = ? 
          AND created_at >= ? 
          AND created_at <= ?
        ORDER BY created_at DESC
        LIMIT 3
      `).bind(userId, startTime, endTime).all<MemoryCheckin>();

      if (checkins.results && checkins.results.length > 0) {
        memories.push({
          period: p.period,
          label: p.label,
          emoji: p.emoji,
          checkins: checkins.results,
          daysAgo: p.daysAgo,
        });
      }
    }

    // Generate a nice message based on memories found
    let message: string | undefined;
    if (memories.length === 0) {
      message = "Keep smoking and creating memories! 🚬";
    } else if (memories.length === 1) {
      const m = memories[0];
      message = `${m.emoji} ${m.label}, you were enjoying ${m.checkins[0].brand}`;
    }

    return NextResponse.json({
      memories,
      hasMemories: memories.length > 0,
      message,
    });

  } catch (error) {
    console.error('On this day error:', error);
    return NextResponse.json(
      { error: 'Failed to load memories' },
      { status: 500 }
    );
  }
}
