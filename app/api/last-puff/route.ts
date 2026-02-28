import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface LastPuffWinner {
  date: string;
  username: string;
  avatarUrl: string | null;
  brand: string;
  product: string | null;
  rating: number | null;
  checkedAt: number;
  timeString: string;
}

interface LastPuffLeader {
  username: string;
  avatarUrl: string | null;
  wins: number;
  latestWin: string | null;
  avgTime: string | null;
}

interface TonightContender {
  username: string;
  avatarUrl: string | null;
  brand: string;
  checkedAt: number;
  timeString: string;
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    // Get current date info (Eastern Time)
    const now = new Date();
    const estOffset = -5 * 60; // EST is UTC-5
    const estNow = new Date(now.getTime() + (estOffset + now.getTimezoneOffset()) * 60000);
    const todayStr = estNow.toISOString().split('T')[0];
    const yesterdayDate = new Date(estNow);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
    
    const currentHour = estNow.getHours();
    const currentMinute = estNow.getMinutes();
    
    // Get today's contenders (people who've checked in today, ordered by time DESC)
    // The leader is whoever checked in most recently
    const tonightContendersResult = await db.prepare(`
      SELECT 
        u.username,
        u.avatar_url,
        c.brand,
        c.created_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE date(datetime(c.created_at, 'unixepoch', '-5 hours')) = ?
      ORDER BY c.created_at DESC
      LIMIT 10
    `).bind(todayStr).all();
    
    const tonightContenders: TonightContender[] = (tonightContendersResult.results || []).map((row: Record<string, unknown>) => {
      const ts = row.created_at as number;
      const d = new Date(ts * 1000);
      const estTime = new Date(d.getTime() + (estOffset + d.getTimezoneOffset()) * 60000);
      const hours = estTime.getHours();
      const mins = estTime.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return {
        username: row.username as string,
        avatarUrl: row.avatar_url as string | null,
        brand: row.brand as string,
        checkedAt: ts,
        timeString: `${h12}:${mins.toString().padStart(2, '0')} ${ampm}`
      };
    });
    
    // Get yesterday's winner (last check-in of the day)
    const yesterdayWinnerResult = await db.prepare(`
      SELECT 
        u.username,
        u.avatar_url,
        c.brand,
        c.product,
        c.rating,
        c.created_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE date(datetime(c.created_at, 'unixepoch', '-5 hours')) = ?
      ORDER BY c.created_at DESC
      LIMIT 1
    `).bind(yesterdayStr).first();
    
    let yesterdayWinner: LastPuffWinner | null = null;
    if (yesterdayWinnerResult) {
      const ts = yesterdayWinnerResult.created_at as number;
      const d = new Date(ts * 1000);
      const estTime = new Date(d.getTime() + (estOffset + d.getTimezoneOffset()) * 60000);
      const hours = estTime.getHours();
      const mins = estTime.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      
      yesterdayWinner = {
        date: yesterdayStr,
        username: yesterdayWinnerResult.username as string,
        avatarUrl: yesterdayWinnerResult.avatar_url as string | null,
        brand: yesterdayWinnerResult.brand as string,
        product: yesterdayWinnerResult.product as string | null,
        rating: yesterdayWinnerResult.rating as number | null,
        checkedAt: ts,
        timeString: `${h12}:${mins.toString().padStart(2, '0')} ${ampm}`
      };
    }
    
    // Get recent winners (last puff of each day for past 7 days)
    const recentWinnersResult = await db.prepare(`
      WITH daily_last AS (
        SELECT 
          date(datetime(c.created_at, 'unixepoch', '-5 hours')) as smoke_date,
          c.user_id,
          c.brand,
          c.product,
          c.rating,
          c.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY date(datetime(c.created_at, 'unixepoch', '-5 hours'))
            ORDER BY c.created_at DESC
          ) as rn
        FROM checkins c
        WHERE date(datetime(c.created_at, 'unixepoch', '-5 hours')) < ?
      )
      SELECT 
        dl.smoke_date,
        u.username,
        u.avatar_url,
        dl.brand,
        dl.product,
        dl.rating,
        dl.created_at
      FROM daily_last dl
      JOIN users u ON dl.user_id = u.id
      WHERE dl.rn = 1
      ORDER BY dl.smoke_date DESC
      LIMIT 7
    `).bind(todayStr).all();
    
    const recentWinners: LastPuffWinner[] = (recentWinnersResult.results || []).map((row: Record<string, unknown>) => {
      const ts = row.created_at as number;
      const d = new Date(ts * 1000);
      const estTime = new Date(d.getTime() + (estOffset + d.getTimezoneOffset()) * 60000);
      const hours = estTime.getHours();
      const mins = estTime.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      
      return {
        date: row.smoke_date as string,
        username: row.username as string,
        avatarUrl: row.avatar_url as string | null,
        brand: row.brand as string,
        product: row.product as string | null,
        rating: row.rating as number | null,
        checkedAt: ts,
        timeString: `${h12}:${mins.toString().padStart(2, '0')} ${ampm}`
      };
    });
    
    // Get all-time leaderboard (most last-puff wins)
    const leadersResult = await db.prepare(`
      WITH daily_last AS (
        SELECT 
          date(datetime(c.created_at, 'unixepoch', '-5 hours')) as smoke_date,
          c.user_id,
          c.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY date(datetime(c.created_at, 'unixepoch', '-5 hours'))
            ORDER BY c.created_at DESC
          ) as rn
        FROM checkins c
      ),
      winners AS (
        SELECT user_id, smoke_date, created_at
        FROM daily_last
        WHERE rn = 1
      )
      SELECT 
        u.username,
        u.avatar_url,
        COUNT(*) as wins,
        MAX(w.smoke_date) as latest_win,
        AVG(
          (w.created_at - strftime('%s', w.smoke_date || ' 00:00:00', '-5 hours')) / 3600.0
        ) as avg_hour
      FROM winners w
      JOIN users u ON w.user_id = u.id
      GROUP BY w.user_id
      ORDER BY wins DESC
      LIMIT 10
    `).all();
    
    const leaders: LastPuffLeader[] = (leadersResult.results || []).map((row: Record<string, unknown>) => {
      const avgHour = row.avg_hour as number | null;
      let avgTimeStr: string | null = null;
      if (avgHour !== null) {
        const h = Math.floor(avgHour);
        const m = Math.round((avgHour - h) * 60);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        avgTimeStr = `~${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
      }
      
      return {
        username: row.username as string,
        avatarUrl: row.avatar_url as string | null,
        wins: row.wins as number,
        latestWin: row.latest_win as string | null,
        avgTime: avgTimeStr
      };
    });
    
    // Platform stats
    const statsResult = await db.prepare(`
      WITH daily_last AS (
        SELECT 
          date(datetime(c.created_at, 'unixepoch', '-5 hours')) as smoke_date,
          c.user_id,
          c.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY date(datetime(c.created_at, 'unixepoch', '-5 hours'))
            ORDER BY c.created_at DESC
          ) as rn
        FROM checkins c
      )
      SELECT 
        COUNT(DISTINCT smoke_date) as total_days,
        COUNT(DISTINCT user_id) as unique_winners
      FROM daily_last
      WHERE rn = 1
    `).first();
    
    const stats = {
      totalDaysTracked: (statsResult?.total_days as number) || 0,
      uniqueWinners: (statsResult?.unique_winners as number) || 0,
      currentHour,
      currentMinute,
      isLateNight: currentHour >= 22 || currentHour < 2
    };
    
    return Response.json({
      tonightContenders,
      currentLeader: tonightContenders[0] || null,
      yesterdayWinner,
      recentWinners,
      leaders,
      stats,
      todayStr,
      message: stats.isLateNight 
        ? "🌙 Prime time for Last Puff! Log now to take the lead!" 
        : currentHour < 18 
          ? "⏳ The race heats up after sunset..." 
          : "🌆 Evening smokes are rolling in!"
    });
    
  } catch (error) {
    console.error('Last Puff API error:', error);
    return Response.json({ error: 'Failed to fetch last puff data' }, { status: 500 });
  }
}
