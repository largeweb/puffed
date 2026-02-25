import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

export const runtime = "edge";

interface HourCount {
  hour: number;
  count: number;
}

interface DayCount {
  day: number;
  count: number;
}

interface SmokeOClockData {
  // User's smoking patterns
  hourlyDistribution: { hour: number; count: number; percentage: number }[];
  peakHour: number | null;
  peakHourCount: number;
  
  // AM vs PM breakdown
  amCount: number;
  pmCount: number;
  amPercent: number;
  
  // Personality based on patterns
  smokerType: 'early_bird' | 'night_owl' | 'afternoon_enthusiast' | 'evening_relaxer' | 'all_day' | 'unknown';
  smokerTypeEmoji: string;
  smokerTypeLabel: string;
  smokerTypeDescription: string;
  
  // Day of week patterns
  weekdayCount: number;
  weekendCount: number;
  favoriteDay: string | null;
  favoriteDayCount: number;
  
  // Fun stats
  earliestEver: { hour: number; minute: number; brand: string } | null;
  latestEver: { hour: number; minute: number; brand: string } | null;
  mostConsistentHour: number | null;
  
  // Platform comparison
  platformPeakHour: number | null;
  youVsPlatform: 'earlier' | 'later' | 'same' | 'unknown';
  
  totalCheckins: number;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getSmokerType(hourlyDist: { hour: number; count: number }[], total: number): { type: SmokeOClockData['smokerType']; emoji: string; label: string; description: string } {
  if (total < 3) {
    return { type: 'unknown', emoji: '❓', label: 'Mystery Smoker', description: 'Log more smokes to discover your pattern!' };
  }
  
  // Calculate distribution by time periods
  const earlyMorning = hourlyDist.filter(h => h.hour >= 5 && h.hour < 9).reduce((acc, h) => acc + h.count, 0);
  const morning = hourlyDist.filter(h => h.hour >= 9 && h.hour < 12).reduce((acc, h) => acc + h.count, 0);
  const afternoon = hourlyDist.filter(h => h.hour >= 12 && h.hour < 17).reduce((acc, h) => acc + h.count, 0);
  const evening = hourlyDist.filter(h => h.hour >= 17 && h.hour < 21).reduce((acc, h) => acc + h.count, 0);
  const night = hourlyDist.filter(h => h.hour >= 21 || h.hour < 5).reduce((acc, h) => acc + h.count, 0);
  
  const periods = [
    { name: 'early_morning', count: earlyMorning, type: 'early_bird' as const, emoji: '🌅', label: 'Early Bird', description: 'You love starting your day with a smoke before the world wakes up!' },
    { name: 'morning', count: morning, type: 'early_bird' as const, emoji: '☀️', label: 'Morning Person', description: 'You prefer your smokes with your morning coffee.' },
    { name: 'afternoon', count: afternoon, type: 'afternoon_enthusiast' as const, emoji: '🌤️', label: 'Afternoon Enthusiast', description: 'Midday is your prime smoking time!' },
    { name: 'evening', count: evening, type: 'evening_relaxer' as const, emoji: '🌆', label: 'Evening Relaxer', description: 'You unwind with a smoke as the sun sets.' },
    { name: 'night', count: night, type: 'night_owl' as const, emoji: '🦉', label: 'Night Owl', description: 'The night is young when you light up!' },
  ];
  
  // Check if spread evenly (all-day smoker)
  const maxPeriod = Math.max(...periods.map(p => p.count));
  const minPeriod = Math.min(...periods.filter(p => p.count > 0).map(p => p.count));
  
  if (maxPeriod > 0 && minPeriod > 0 && maxPeriod / minPeriod < 2 && periods.filter(p => p.count > 0).length >= 3) {
    return { type: 'all_day', emoji: '🌈', label: 'All-Day Smoker', description: 'You enjoy smokes throughout the day - no time is off limits!' };
  }
  
  // Return the dominant period
  const dominant = periods.sort((a, b) => b.count - a.count)[0];
  return { type: dominant.type, emoji: dominant.emoji, label: dominant.label, description: dominant.description };
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const sessionId = parseSessionCookie(cookieHeader);
  
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { env } = getRequestContext();
  const db = env.DB;
  
  // Verify session
  const nowTs = Math.floor(Date.now() / 1000);
  const session = await db
    .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
    .bind(sessionId, nowTs)
    .first<{ user_id: string }>();
    
  if (!session) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }
  const userId = session.user_id;

  try {
    // Get hourly distribution (adjusted for EST = UTC-5)
    const hourlyResult = await db
      .prepare(`
        SELECT 
          CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) as hour,
          COUNT(*) as count
        FROM checkins
        WHERE user_id = ?
        GROUP BY hour
        ORDER BY hour
      `)
      .bind(userId)
      .all<HourCount>();

    // Get day of week distribution
    const dayResult = await db
      .prepare(`
        SELECT 
          CAST(strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) as day,
          COUNT(*) as count
        FROM checkins
        WHERE user_id = ?
        GROUP BY day
        ORDER BY count DESC
      `)
      .bind(userId)
      .all<DayCount>();

    // Get total check-ins
    const totalResult = await db
      .prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ?")
      .bind(userId)
      .first<{ count: number }>();
    const totalCheckins = totalResult?.count || 0;

    // Get earliest and latest check-ins ever
    const earliestResult = await db
      .prepare(`
        SELECT 
          CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) as hour,
          CAST(strftime('%M', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) as minute,
          brand
        FROM checkins
        WHERE user_id = ?
        ORDER BY (CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) * 60 + 
                  CAST(strftime('%M', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER)) ASC
        LIMIT 1
      `)
      .bind(userId)
      .first<{ hour: number; minute: number; brand: string }>();

    const latestResult = await db
      .prepare(`
        SELECT 
          CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) as hour,
          CAST(strftime('%M', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) as minute,
          brand
        FROM checkins
        WHERE user_id = ?
        ORDER BY (CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) * 60 + 
                  CAST(strftime('%M', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER)) DESC
        LIMIT 1
      `)
      .bind(userId)
      .first<{ hour: number; minute: number; brand: string }>();

    // Get platform-wide peak hour for comparison
    const platformPeakResult = await db
      .prepare(`
        SELECT 
          CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) as hour,
          COUNT(*) as count
        FROM checkins
        GROUP BY hour
        ORDER BY count DESC
        LIMIT 1
      `)
      .first<HourCount>();

    // Build hourly distribution array (0-23)
    const hourlyMap = new Map<number, number>();
    for (const row of hourlyResult.results || []) {
      hourlyMap.set(row.hour, row.count);
    }
    
    const hourlyDistribution = [];
    let amCount = 0;
    let pmCount = 0;
    let peakHour: number | null = null;
    let peakHourCount = 0;
    
    for (let h = 0; h < 24; h++) {
      const count = hourlyMap.get(h) || 0;
      const percentage = totalCheckins > 0 ? Math.round((count / totalCheckins) * 100) : 0;
      hourlyDistribution.push({ hour: h, count, percentage });
      
      if (h < 12) {
        amCount += count;
      } else {
        pmCount += count;
      }
      
      if (count > peakHourCount) {
        peakHourCount = count;
        peakHour = h;
      }
    }

    // Find most consistent hour (appears in most days)
    const consistencyResult = await db
      .prepare(`
        SELECT 
          CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) AS INTEGER) as hour,
          COUNT(DISTINCT date(datetime(created_at, 'unixepoch', '-5 hours'))) as days
        FROM checkins
        WHERE user_id = ?
        GROUP BY hour
        ORDER BY days DESC
        LIMIT 1
      `)
      .bind(userId)
      .first<{ hour: number; days: number }>();

    // Day of week stats
    const dayData = dayResult.results || [];
    const weekendDays = dayData.filter(d => d.day === 0 || d.day === 6);
    const weekdayDays = dayData.filter(d => d.day >= 1 && d.day <= 5);
    const weekendCount = weekendDays.reduce((acc, d) => acc + d.count, 0);
    const weekdayCount = weekdayDays.reduce((acc, d) => acc + d.count, 0);
    const favoriteDay = dayData[0] ? DAY_NAMES[dayData[0].day] : null;
    const favoriteDayCount = dayData[0]?.count || 0;

    // Get smoker type
    const smokerTypeInfo = getSmokerType(hourlyDistribution, totalCheckins);

    // Compare to platform
    const platformPeakHour = platformPeakResult?.hour ?? null;
    let youVsPlatform: SmokeOClockData['youVsPlatform'] = 'unknown';
    if (peakHour !== null && platformPeakHour !== null) {
      if (peakHour < platformPeakHour) {
        youVsPlatform = 'earlier';
      } else if (peakHour > platformPeakHour) {
        youVsPlatform = 'later';
      } else {
        youVsPlatform = 'same';
      }
    }

    const response: SmokeOClockData = {
      hourlyDistribution,
      peakHour,
      peakHourCount,
      
      amCount,
      pmCount,
      amPercent: totalCheckins > 0 ? Math.round((amCount / totalCheckins) * 100) : 0,
      
      smokerType: smokerTypeInfo.type,
      smokerTypeEmoji: smokerTypeInfo.emoji,
      smokerTypeLabel: smokerTypeInfo.label,
      smokerTypeDescription: smokerTypeInfo.description,
      
      weekdayCount,
      weekendCount,
      favoriteDay,
      favoriteDayCount,
      
      earliestEver: earliestResult ? { hour: earliestResult.hour, minute: earliestResult.minute, brand: earliestResult.brand } : null,
      latestEver: latestResult ? { hour: latestResult.hour, minute: latestResult.minute, brand: latestResult.brand } : null,
      mostConsistentHour: consistencyResult?.hour ?? null,
      
      platformPeakHour,
      youVsPlatform,
      
      totalCheckins,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Smoke o'clock error:", error);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}
