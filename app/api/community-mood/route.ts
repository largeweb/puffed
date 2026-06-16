import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

interface MoodRow {
  mood: string;
  count: number;
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    // Get mood counts from last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    const result = await db
      .prepare(
        `SELECT mood, COUNT(*) as count 
         FROM checkins 
         WHERE mood IS NOT NULL 
         AND mood != '' 
         AND created_at > ?
         GROUP BY mood 
         ORDER BY count DESC`
      )
      .bind(oneDayAgo)
      .all();

    const moods = (result.results || []) as unknown as MoodRow[];
    const totalCheckins = moods.reduce((sum, m) => sum + m.count, 0);

    if (totalCheckins === 0) {
      return NextResponse.json({
        moods: [],
        totalCheckins: 0,
        dominantMood: "relaxed",
        timeframe: "24h",
      });
    }

    const moodsWithPercentage = moods.map((m) => ({
      mood: m.mood,
      count: m.count,
      percentage: Math.round((m.count / totalCheckins) * 100),
    }));

    return NextResponse.json({
      moods: moodsWithPercentage,
      totalCheckins,
      dominantMood: moods[0]?.mood || "relaxed",
      timeframe: "24h",
    });
  } catch (error) {
    console.error("Community mood error:", error);
    return NextResponse.json({
      moods: [],
      totalCheckins: 0,
      dominantMood: "relaxed",
      timeframe: "24h",
    });
  }
}
