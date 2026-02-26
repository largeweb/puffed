import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

interface Env {
  DB: D1Database;
}

interface DbUser {
  id: number;
  username: string;
}

interface CheckinRow {
  brand: string;
  count: number;
}

interface WeekendSmoker {
  user_id: number;
  username: string;
  checkins: number;
  top_brand: string | null;
}

interface HourCount {
  hour: number;
  count: number;
}

export async function GET(req: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    const db = (env as Env).DB;

    // Get user from cookie
    const userId = req.cookies.get("user_id")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const now = Math.floor(Date.now() / 1000);
    const dayOfWeek = new Date().getDay(); // 0 = Sunday, 6 = Saturday
    
    // Calculate start of this weekend (Saturday 00:00)
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    const saturdayStart = now + (daysUntilSaturday - (dayOfWeek >= 4 ? 0 : 0)) * 86400;
    
    // For simplicity, let's just look at recent weekend patterns (last 4 weekends)
    const fourWeeksAgo = now - (28 * 86400);

    // Get user's weekend smoking patterns (Saturday=6, Sunday=0)
    const userWeekendPattern = await db.prepare(`
      SELECT 
        strftime('%H', datetime(created_at, 'unixepoch', 'localtime')) as hour,
        COUNT(*) as count
      FROM checkins
      WHERE user_id = ?
        AND created_at > ?
        AND (strftime('%w', datetime(created_at, 'unixepoch', 'localtime')) = '0' 
             OR strftime('%w', datetime(created_at, 'unixepoch', 'localtime')) = '6')
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 5
    `).bind(parseInt(userId), fourWeeksAgo).all<HourCount>();

    // Get user's favorite weekend brands
    const favoriteWeekendBrands = await db.prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins
      WHERE user_id = ?
        AND created_at > ?
        AND (strftime('%w', datetime(created_at, 'unixepoch', 'localtime')) = '0' 
             OR strftime('%w', datetime(created_at, 'unixepoch', 'localtime')) = '6')
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 3
    `).bind(parseInt(userId), fourWeeksAgo).all<CheckinRow>();

    // Get community weekend warriors (most weekend check-ins)
    const weekendWarriors = await db.prepare(`
      SELECT 
        c.user_id,
        u.username,
        COUNT(*) as checkins,
        (SELECT brand FROM checkins c2 WHERE c2.user_id = c.user_id GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1) as top_brand
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at > ?
        AND (strftime('%w', datetime(c.created_at, 'unixepoch', 'localtime')) = '0' 
             OR strftime('%w', datetime(c.created_at, 'unixepoch', 'localtime')) = '6')
      GROUP BY c.user_id
      ORDER BY checkins DESC
      LIMIT 5
    `).bind(fourWeeksAgo).all<WeekendSmoker>();

    // Get last weekend's top brand
    const oneWeekAgo = now - (7 * 86400);
    const lastWeekendTopBrand = await db.prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins
      WHERE created_at > ?
        AND (strftime('%w', datetime(created_at, 'unixepoch', 'localtime')) = '0' 
             OR strftime('%w', datetime(created_at, 'unixepoch', 'localtime')) = '6')
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 1
    `).bind(oneWeekAgo).first<CheckinRow>();

    // Get user's weekend streak (consecutive weekends with check-ins)
    const userWeekendStreak = await db.prepare(`
      SELECT COUNT(DISTINCT strftime('%W-%Y', datetime(created_at, 'unixepoch', 'localtime'))) as weeks
      FROM checkins
      WHERE user_id = ?
        AND created_at > ?
        AND (strftime('%w', datetime(created_at, 'unixepoch', 'localtime')) = '0' 
             OR strftime('%w', datetime(created_at, 'unixepoch', 'localtime')) = '6')
    `).bind(parseInt(userId), fourWeeksAgo).first<{ weeks: number }>();

    // Calculate days until weekend
    let daysUntil = 0;
    if (dayOfWeek === 0) {
      daysUntil = 0; // It's Sunday - weekend is now!
    } else if (dayOfWeek === 6) {
      daysUntil = 0; // It's Saturday - weekend is now!
    } else if (dayOfWeek === 5) {
      daysUntil = 1; // Friday - tomorrow!
    } else if (dayOfWeek === 4) {
      daysUntil = 2; // Thursday - 2 days
    } else {
      daysUntil = 6 - dayOfWeek;
    }

    // Generate a fun weekend prediction message
    const predictions = [
      "Your vibe this weekend: Premium relaxation with a smooth smoke 🌟",
      "Stars align for a perfect patio session this weekend ✨",
      "Weekend forecast: 100% chance of exceptional cigars 🚬",
      "Ideal conditions for a sunset smoke detected 🌅",
      "Your weekend spirit animal: The contemplative cigar connoisseur 🎩",
    ];

    const peakHour = userWeekendPattern.results?.[0]?.hour;
    const peakHourFormatted = peakHour 
      ? `${parseInt(String(peakHour)) > 12 ? parseInt(String(peakHour)) - 12 : peakHour || 12}${parseInt(String(peakHour)) >= 12 ? 'PM' : 'AM'}`
      : null;

    return NextResponse.json({
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      daysUntilWeekend: daysUntil,
      dayOfWeek,
      prediction: predictions[Math.floor(Math.random() * predictions.length)],
      userPattern: {
        peakHour: peakHourFormatted,
        peakHourRaw: peakHour ? parseInt(String(peakHour)) : null,
        favoriteWeekendBrands: favoriteWeekendBrands.results || [],
        weekendStreak: userWeekendStreak?.weeks || 0,
      },
      community: {
        weekendWarriors: (weekendWarriors.results || []).map(w => ({
          username: w.username,
          checkins: w.checkins,
          topBrand: w.top_brand,
        })),
        lastWeekendTopBrand: lastWeekendTopBrand?.brand || null,
        lastWeekendCount: lastWeekendTopBrand?.count || 0,
      },
      tips: [
        peakHour ? `You usually smoke around ${peakHourFormatted} on weekends` : "Start building your weekend smoking ritual!",
        favoriteWeekendBrands.results?.[0] ? `${favoriteWeekendBrands.results[0].brand} is your weekend go-to` : "Try something special this weekend",
        "Pro tip: Save your premium sticks for Saturday evening",
      ],
    });
  } catch (error) {
    console.error("Weekend preview error:", error);
    return NextResponse.json({ error: "Failed to load weekend preview" }, { status: 500 });
  }
}
