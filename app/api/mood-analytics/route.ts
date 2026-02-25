import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { MOOD_TAGS } from "@/lib/moods";

export const runtime = "edge";

interface MoodTimeRow {
  mood: string;
  hour: number;
  count: number;
}

interface PlatformMoodRow {
  mood: string;
  count: number;
}

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    const { env } = getRequestContext();
    const db = env.DB;

    let userId: string | null = null;

    // Try to get user session (optional - we still return platform data without auth)
    if (sessionId) {
      const now = Math.floor(Date.now() / 1000);
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
        .bind(sessionId, now)
        .first<{ user_id: string }>();
      userId = session?.user_id || null;
    }

    // Get mood by time of day for the user
    const moodByTimeOfDay = [];
    
    if (userId) {
      // Get moods grouped by time period
      const timeData = await db
        .prepare(`
          SELECT 
            mood,
            CAST((created_at % 86400) / 3600 AS INTEGER) as hour,
            COUNT(*) as count
          FROM checkins
          WHERE user_id = ? AND mood IS NOT NULL
          GROUP BY mood, hour
          ORDER BY count DESC
        `)
        .bind(userId)
        .all<MoodTimeRow>();

      // Group into time periods
      const periods = [
        { period: 'Morning', emoji: '🌅', hours: [5, 6, 7, 8, 9, 10, 11] },
        { period: 'Afternoon', emoji: '☀️', hours: [12, 13, 14, 15, 16] },
        { period: 'Evening', emoji: '🌆', hours: [17, 18, 19, 20, 21] },
        { period: 'Night', emoji: '🌙', hours: [22, 23, 0, 1, 2, 3, 4] },
      ];

      for (const period of periods) {
        const periodMoods = new Map<string, number>();
        
        for (const row of timeData.results || []) {
          // Adjust hour for timezone (assume EST = UTC-5)
          const adjustedHour = (row.hour - 5 + 24) % 24;
          if (period.hours.includes(adjustedHour)) {
            const current = periodMoods.get(row.mood) || 0;
            periodMoods.set(row.mood, current + row.count);
          }
        }

        const moodsArray = Array.from(periodMoods.entries())
          .map(([mood, count]) => {
            const moodTag = MOOD_TAGS.find(m => m.id === mood);
            return {
              mood,
              emoji: moodTag?.emoji || '❓',
              label: moodTag?.label || mood,
              count,
            };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        moodByTimeOfDay.push({
          period: period.period,
          emoji: period.emoji,
          moods: moodsArray,
        });
      }
    }

    // Get platform-wide mood distribution
    const platformData = await db
      .prepare(`
        SELECT mood, COUNT(*) as count
        FROM checkins
        WHERE mood IS NOT NULL
        GROUP BY mood
        ORDER BY count DESC
      `)
      .all<PlatformMoodRow>();

    const totalPlatformMoods = platformData.results?.reduce((acc, m) => acc + m.count, 0) || 0;

    const platformMoods = (platformData.results || [])
      .map((row) => {
        const moodTag = MOOD_TAGS.find(m => m.id === row.mood);
        return {
          mood: row.mood,
          emoji: moodTag?.emoji || '❓',
          label: moodTag?.label || row.mood,
          count: row.count,
          percentage: totalPlatformMoods > 0 ? Math.round((row.count / totalPlatformMoods) * 100) : 0,
        };
      })
      .filter(m => MOOD_TAGS.some(t => t.id === m.mood));

    return NextResponse.json({
      moodByTimeOfDay,
      platformMoods,
      totalPlatformMoods,
    });
  } catch (error) {
    console.error("Mood analytics error:", error);
    return NextResponse.json({ error: "Failed to get mood analytics" }, { status: 500 });
  }
}
