import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { MOOD_TAGS } from "@/lib/moods";

export const runtime = "edge";

interface MoodCount {
  mood: string;
  count: number;
}

interface MoodBrand {
  brand: string;
  count: number;
  avg_rating: number | null;
}

interface MoodInsight {
  mood: string;
  emoji: string;
  label: string;
  count: number;
  percentage: number;
  topBrand: string | null;
  avgRating: number | null;
}

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const now = Math.floor(Date.now() / 1000);
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
      .bind(sessionId, now)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    // Get mood counts for the user
    const moodCounts = await db
      .prepare(`
        SELECT mood, COUNT(*) as count 
        FROM checkins 
        WHERE user_id = ? AND mood IS NOT NULL
        GROUP BY mood
        ORDER BY count DESC
      `)
      .bind(session.user_id)
      .all<MoodCount>();

    // Get total check-ins with mood
    const totalWithMood = moodCounts.results?.reduce((acc, m) => acc + m.count, 0) || 0;

    // Get top brand per mood
    const moodInsights: MoodInsight[] = [];
    
    for (const moodCount of moodCounts.results || []) {
      const moodTag = MOOD_TAGS.find(m => m.id === moodCount.mood);
      if (!moodTag) continue;

      // Get top brand for this mood
      const topBrand = await db
        .prepare(`
          SELECT brand, COUNT(*) as count, AVG(rating) as avg_rating
          FROM checkins
          WHERE user_id = ? AND mood = ?
          GROUP BY brand
          ORDER BY count DESC
          LIMIT 1
        `)
        .bind(session.user_id, moodCount.mood)
        .first<MoodBrand>();

      moodInsights.push({
        mood: moodCount.mood,
        emoji: moodTag.emoji,
        label: moodTag.label,
        count: moodCount.count,
        percentage: totalWithMood > 0 ? Math.round((moodCount.count / totalWithMood) * 100) : 0,
        topBrand: topBrand?.brand || null,
        avgRating: topBrand?.avg_rating ? Math.round(topBrand.avg_rating * 10) / 10 : null,
      });
    }

    // Get recent mood trend (last 7 days vs previous 7 days)
    const weekAgo = now - (7 * 24 * 60 * 60);
    const twoWeeksAgo = now - (14 * 24 * 60 * 60);

    const recentMoods = await db
      .prepare(`
        SELECT mood, COUNT(*) as count
        FROM checkins
        WHERE user_id = ? AND mood IS NOT NULL AND created_at >= ?
        GROUP BY mood
        ORDER BY count DESC
        LIMIT 1
      `)
      .bind(session.user_id, weekAgo)
      .first<MoodCount>();

    const previousMoods = await db
      .prepare(`
        SELECT mood, COUNT(*) as count
        FROM checkins
        WHERE user_id = ? AND mood IS NOT NULL AND created_at >= ? AND created_at < ?
        GROUP BY mood
        ORDER BY count DESC
        LIMIT 1
      `)
      .bind(session.user_id, twoWeeksAgo, weekAgo)
      .first<MoodCount>();

    // Generate a fun insight message
    let insight = "";
    if (moodInsights.length > 0) {
      const topMood = moodInsights[0];
      insight = `You're usually ${topMood.emoji} ${topMood.label.toLowerCase()} when you smoke`;
      if (topMood.topBrand) {
        insight += `, especially when enjoying ${topMood.topBrand}!`;
      } else {
        insight += "!";
      }
    }

    // Track mood shift
    let moodShift = null;
    if (recentMoods && previousMoods && recentMoods.mood !== previousMoods.mood) {
      const recentTag = MOOD_TAGS.find(m => m.id === recentMoods.mood);
      const prevTag = MOOD_TAGS.find(m => m.id === previousMoods.mood);
      if (recentTag && prevTag) {
        moodShift = {
          from: { mood: previousMoods.mood, emoji: prevTag.emoji, label: prevTag.label },
          to: { mood: recentMoods.mood, emoji: recentTag.emoji, label: recentTag.label },
        };
      }
    }

    return NextResponse.json({
      moods: moodInsights,
      totalWithMood,
      insight,
      moodShift,
      topMood: moodInsights[0] || null,
      recentMood: recentMoods?.mood || null,
    });
  } catch (error) {
    console.error("Mood stats error:", error);
    return NextResponse.json({ error: "Failed to get mood stats" }, { status: 500 });
  }
}
