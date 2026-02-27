import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface CheckinRow {
  id: string;
  brand: string;
  product: string | null;
  rating: number;
  created_at: number;
  dow: string;
  hour: string;
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await db.prepare(
      "SELECT user_id FROM sessions WHERE id = ?"
    ).bind(sessionToken).first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = session.user_id;
    const now = Math.floor(Date.now() / 1000);
    
    // Calculate day boundaries (UTC)
    const todayStart = now - (now % 86400);
    const dayOfWeek = new Date(todayStart * 1000).getUTCDay(); // 0=Sun, 5=Fri, 6=Sat
    
    // Get user's historical weekend data (Saturday & Sunday)
    const weekendCheckins = await db.prepare(`
      SELECT id, brand, product, rating, created_at
      FROM checkins
      WHERE user_id = ?
      AND (
        strftime('%w', datetime(created_at, 'unixepoch')) = '0' OR
        strftime('%w', datetime(created_at, 'unixepoch')) = '6'
      )
      ORDER BY created_at DESC
      LIMIT 50
    `).bind(userId).all();

    // Get user's overall stats
    const totalCheckins = await db.prepare(`
      SELECT COUNT(*) as count FROM checkins WHERE user_id = ?
    `).bind(userId).first<{ count: number }>();

    const weekendCount = weekendCheckins.results?.length || 0;
    const totalCount = totalCheckins?.count || 0;

    // Calculate weekend smoking rate
    const weekendRate = totalCount > 0 ? weekendCount / totalCount : 0;

    // Get last 4 weeks of data for better predictions
    const fourWeeksAgo = now - (28 * 86400);
    const recentWeekendCheckins = await db.prepare(`
      SELECT brand, rating, created_at,
             strftime('%w', datetime(created_at, 'unixepoch')) as dow,
             strftime('%H', datetime(created_at, 'unixepoch')) as hour
      FROM checkins
      WHERE user_id = ? AND created_at >= ?
      AND (
        strftime('%w', datetime(created_at, 'unixepoch')) = '0' OR
        strftime('%w', datetime(created_at, 'unixepoch')) = '6'
      )
    `).bind(userId, fourWeeksAgo).all<CheckinRow>();

    // Count weekends in the last 4 weeks
    const recentWeekends = new Set<string>();
    (recentWeekendCheckins.results || []).forEach(c => {
      const date = new Date(c.created_at * 1000).toISOString().split('T')[0];
      recentWeekends.add(date);
    });

    // Average smokes per weekend
    const avgWeekendSmokes = recentWeekends.size > 0 
      ? (recentWeekendCheckins.results?.length || 0) / Math.max(1, recentWeekends.size / 2)
      : 0;

    // Peak hour analysis
    const hourCounts: Record<string, number> = {};
    (recentWeekendCheckins.results || []).forEach(c => {
      hourCounts[c.hour] = (hourCounts[c.hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Top weekend brands
    const brandCounts: Record<string, { count: number; totalRating: number }> = {};
    (recentWeekendCheckins.results || []).forEach(c => {
      if (!brandCounts[c.brand]) {
        brandCounts[c.brand] = { count: 0, totalRating: 0 };
      }
      brandCounts[c.brand].count++;
      brandCounts[c.brand].totalRating += c.rating;
    });

    const topWeekendBrands = Object.entries(brandCounts)
      .map(([brand, data]) => ({
        brand,
        count: data.count,
        avgRating: data.totalRating / data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Get a brand the user hasn't tried but others love
    const suggestedBrand = await db.prepare(`
      SELECT brand, AVG(rating) as avg_rating, COUNT(*) as count
      FROM checkins
      WHERE brand NOT IN (SELECT DISTINCT brand FROM checkins WHERE user_id = ?)
      GROUP BY brand
      HAVING count >= 2 AND avg_rating >= 4
      ORDER BY avg_rating DESC, count DESC
      LIMIT 1
    `).bind(userId).first<{ brand: string; avg_rating: number; count: number }>();

    // Saturday vs Sunday preference
    const saturdayCount = (recentWeekendCheckins.results || []).filter(c => c.dow === '6').length;
    const sundayCount = (recentWeekendCheckins.results || []).filter(c => c.dow === '0').length;
    const preferredDay = saturdayCount > sundayCount ? 'Saturday' : sundayCount > saturdayCount ? 'Sunday' : 'Both';

    // Generate predictions
    const predictions = [];

    // Smoke count prediction
    const predictedSmokes = Math.round(avgWeekendSmokes * (0.8 + Math.random() * 0.4));
    predictions.push({
      type: 'smoke_count',
      emoji: '🔢',
      title: 'Weekend Smoke Forecast',
      value: Math.max(1, predictedSmokes),
      description: predictedSmokes === 0 
        ? "Looking like a light weekend" 
        : predictedSmokes >= 5 
          ? "Big weekend energy!" 
          : "A solid weekend ahead"
    });

    // Peak hour prediction
    if (peakHour) {
      const hour = parseInt(peakHour);
      const timeStr = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
      predictions.push({
        type: 'peak_hour',
        emoji: '⏰',
        title: 'Prime Smoking Hour',
        value: timeStr,
        description: hour >= 20 ? "Night owl vibes" : hour >= 17 ? "Evening relaxation" : hour >= 12 ? "Afternoon chill" : "Early bird"
      });
    }

    // Brand prediction
    if (topWeekendBrands.length > 0) {
      predictions.push({
        type: 'likely_brand',
        emoji: '🏷️',
        title: "You'll Probably Smoke",
        value: topWeekendBrands[0].brand,
        description: `Your weekend go-to (${topWeekendBrands[0].count}× recently)`
      });
    }

    // Day preference
    if (saturdayCount + sundayCount > 0) {
      predictions.push({
        type: 'best_day',
        emoji: '📅',
        title: 'Your Day',
        value: preferredDay,
        description: preferredDay === 'Saturday' 
          ? "Saturday is your smoke day!" 
          : preferredDay === 'Sunday' 
            ? "Sunday funday vibes" 
            : "You're an equal opportunity smoker"
      });
    }

    // Try something new suggestion
    if (suggestedBrand) {
      predictions.push({
        type: 'try_new',
        emoji: '✨',
        title: 'Weekend Adventure',
        value: `Try ${suggestedBrand.brand}`,
        description: `${suggestedBrand.avg_rating.toFixed(1)}★ avg from ${suggestedBrand.count} check-ins`
      });
    }

    // Vibe prediction based on patterns
    const vibes = [
      { name: 'Chill Vibes', emoji: '😌', condition: avgWeekendSmokes <= 2 },
      { name: 'Social Mode', emoji: '🎉', condition: avgWeekendSmokes >= 4 },
      { name: 'Explorer', emoji: '🧭', condition: topWeekendBrands.length >= 3 },
      { name: 'Quality Time', emoji: '👑', condition: topWeekendBrands[0]?.avgRating >= 4.5 },
      { name: 'Weekend Warrior', emoji: '⚔️', condition: avgWeekendSmokes >= 6 },
    ];
    const vibe = vibes.find(v => v.condition) || { name: 'Ready to Roll', emoji: '🚬' };

    predictions.push({
      type: 'vibe',
      emoji: vibe.emoji,
      title: 'Weekend Vibe',
      value: vibe.name,
      description: "Based on your patterns"
    });

    // Lucky number (just for fun)
    const luckyNumber = Math.floor(Math.random() * 99) + 1;
    predictions.push({
      type: 'lucky',
      emoji: '🎲',
      title: 'Lucky Number',
      value: luckyNumber.toString(),
      description: "For premium cigar picks"
    });

    // Get who's planning to smoke this weekend (active users)
    const activeThisWeek = await db.prepare(`
      SELECT DISTINCT u.username
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND u.id != ?
      ORDER BY c.created_at DESC
      LIMIT 5
    `).bind(now - (7 * 86400), userId).all<{ username: string }>();

    return NextResponse.json({
      predictions,
      topWeekendBrands,
      weekendStats: {
        avgSmokesPerWeekend: Math.round(avgWeekendSmokes * 10) / 10,
        weekendRate: Math.round(weekendRate * 100),
        totalWeekendSmokes: weekendCount,
        saturdaySmokes: saturdayCount,
        sundaySmokes: sundayCount,
      },
      activeSmokers: activeThisWeek.results || [],
      isFriday: dayOfWeek === 5,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  } catch (error) {
    console.error("Weekend forecast error:", error);
    return NextResponse.json({ error: "Failed to generate forecast" }, { status: 500 });
  }
}
