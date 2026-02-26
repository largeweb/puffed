import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

function getWeekBounds(date: Date): { start: number; end: number } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return { start: Math.floor(weekStart.getTime() / 1000), end: Math.floor(weekEnd.getTime() / 1000) };
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
    const now = new Date();
    const currentWeek = getWeekBounds(now);
    const lastWeek = {
      start: currentWeek.start - 7 * 24 * 60 * 60,
      end: currentWeek.start
    };
    
    // Get user info
    const user = await db.prepare(
      "SELECT username FROM users WHERE id = ?"
    ).bind(userId).first<{ username: string }>();
    
    // This week's check-ins
    const thisWeekCheckins = await db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count
      FROM checkins c 
      WHERE c.user_id = ? AND c.created_at >= ? AND c.created_at < ?
      ORDER BY c.created_at DESC
    `).bind(userId, currentWeek.start, currentWeek.end).all();
    
    // Last week's check-ins count
    const lastWeekStats = await db.prepare(`
      SELECT COUNT(*) as count FROM checkins 
      WHERE user_id = ? AND created_at >= ? AND created_at < ?
    `).bind(userId, lastWeek.start, lastWeek.end).first<{ count: number }>();
    
    // Top brands this week
    const topBrands = await db.prepare(`
      SELECT brand, COUNT(*) as count, AVG(rating) as avg_rating
      FROM checkins 
      WHERE user_id = ? AND created_at >= ? AND created_at < ?
      GROUP BY brand
      ORDER BY count DESC, avg_rating DESC
      LIMIT 3
    `).bind(userId, currentWeek.start, currentWeek.end).all();
    
    // Engagement given this week
    const likesGiven = await db.prepare(`
      SELECT COUNT(*) as count FROM likes 
      WHERE user_id = ? AND created_at >= ? AND created_at < ?
    `).bind(userId, currentWeek.start, currentWeek.end).first<{ count: number }>();
    
    const commentsGiven = await db.prepare(`
      SELECT COUNT(*) as count FROM comments 
      WHERE user_id = ? AND created_at >= ? AND created_at < ?
    `).bind(userId, currentWeek.start, currentWeek.end).first<{ count: number }>();
    
    // Engagement received this week
    const likesReceived = await db.prepare(`
      SELECT COUNT(*) as count FROM likes l
      JOIN checkins c ON l.checkin_id = c.id
      WHERE c.user_id = ? AND l.created_at >= ? AND l.created_at < ?
    `).bind(userId, currentWeek.start, currentWeek.end).first<{ count: number }>();
    
    const commentsReceived = await db.prepare(`
      SELECT COUNT(*) as count FROM comments cm
      JOIN checkins c ON cm.checkin_id = c.id
      WHERE c.user_id = ? AND cm.user_id != ? AND cm.created_at >= ? AND cm.created_at < ?
    `).bind(userId, userId, currentWeek.start, currentWeek.end).first<{ count: number }>();
    
    // New followers this week
    const newFollowers = await db.prepare(`
      SELECT COUNT(*) as count FROM follows 
      WHERE following_id = ? AND created_at >= ? AND created_at < ?
    `).bind(userId, currentWeek.start, currentWeek.end).first<{ count: number }>();
    
    // Flavor breakdown
    const flavors = await db.prepare(`
      SELECT flavors FROM checkins 
      WHERE user_id = ? AND created_at >= ? AND created_at < ? AND flavors IS NOT NULL
    `).bind(userId, currentWeek.start, currentWeek.end).all();
    
    const flavorCounts: Record<string, number> = {};
    for (const row of (flavors.results || [])) {
      const f = row as { flavors: string };
      if (f.flavors) {
        const tags = f.flavors.split(",");
        for (const tag of tags) {
          const t = tag.trim();
          if (t) flavorCounts[t] = (flavorCounts[t] || 0) + 1;
        }
      }
    }
    const topFlavors = Object.entries(flavorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    
    // Calculate avg rating
    const checkins = thisWeekCheckins.results || [];
    const avgRating = checkins.length > 0 
      ? checkins.reduce((sum, c) => sum + ((c as { rating: number }).rating || 0), 0) / checkins.length
      : 0;
    
    // Calculate total likes received on this week's checkins
    const totalLikesOnCheckins = checkins.reduce((sum, c) => sum + ((c as { like_count: number }).like_count || 0), 0);
    
    // Determine "vibe" for the week
    const vibes = [
      { name: "Zen Master", emoji: "🧘", condition: checkins.length >= 7 },
      { name: "Weekend Warrior", emoji: "🎉", condition: checkins.length >= 3 && checkins.length < 7 },
      { name: "Quality Over Quantity", emoji: "💎", condition: checkins.length > 0 && avgRating >= 4.5 },
      { name: "Explorer", emoji: "🗺️", condition: (topBrands.results?.length || 0) >= 3 },
      { name: "Social Butterfly", emoji: "🦋", condition: (likesGiven?.count || 0) >= 5 },
      { name: "Rising Star", emoji: "⭐", condition: (newFollowers?.count || 0) >= 2 },
      { name: "Ghost Mode", emoji: "👻", condition: checkins.length === 0 },
      { name: "Getting Started", emoji: "🌱", condition: true }
    ];
    const weekVibe = vibes.find(v => v.condition) || vibes[vibes.length - 1];
    
    // Week comparison
    const lastWeekCount = lastWeekStats?.count || 0;
    const thisWeekCount = checkins.length;
    const weekChange = lastWeekCount > 0 
      ? Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100)
      : thisWeekCount > 0 ? 100 : 0;
    
    return NextResponse.json({
      username: user?.username || "Unknown",
      weekStart: currentWeek.start,
      weekEnd: currentWeek.end,
      stats: {
        smokesThisWeek: thisWeekCount,
        smokesLastWeek: lastWeekCount,
        weekChange,
        avgRating: Math.round(avgRating * 10) / 10,
        totalLikesReceived: totalLikesOnCheckins,
        likesGiven: likesGiven?.count || 0,
        commentsGiven: commentsGiven?.count || 0,
        likesReceived: likesReceived?.count || 0,
        commentsReceived: commentsReceived?.count || 0,
        newFollowers: newFollowers?.count || 0
      },
      topBrands: (topBrands.results || []).map((b) => ({
        name: (b as { brand: string }).brand,
        count: (b as { count: number }).count,
        avgRating: Math.round(((b as { avg_rating: number }).avg_rating || 0) * 10) / 10
      })),
      topFlavors,
      vibe: weekVibe,
      checkins: checkins.slice(0, 5).map((c) => ({
        id: (c as { id: string }).id,
        brand: (c as { brand: string }).brand,
        product: (c as { product: string }).product,
        rating: (c as { rating: number }).rating,
        likes: (c as { like_count: number }).like_count,
        image_url: (c as { image_url: string }).image_url
      }))
    });
  } catch (error) {
    console.error("Weekly wrap error:", error);
    return NextResponse.json({ error: "Failed to generate weekly wrap" }, { status: 500 });
  }
}
