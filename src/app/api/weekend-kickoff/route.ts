import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    const db = env.DB;
    
    // Get current user from auth header
    const authHeader = request.headers.get("authorization");
    const userId = authHeader?.replace("Bearer ", "");

    const now = Date.now();
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 5=Fri, 6=Sat
    
    // Calculate weekend window (Friday 4pm to Sunday midnight)
    const isFriday = dayOfWeek === 5;
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    const currentHour = today.getHours();
    const isWeekendTime = isSaturday || isSunday || (isFriday && currentHour >= 16);
    
    // Calculate time until weekend (or if it's weekend now)
    let countdownText = "";
    let isWeekend = false;
    
    if (isWeekendTime) {
      isWeekend = true;
      if (isFriday) countdownText = "🎉 It's Friday Night!";
      else if (isSaturday) countdownText = "🔥 Saturday Vibes!";
      else countdownText = "😎 Sunday Funday!";
    } else {
      // Calculate hours until Friday 4pm
      const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
      const hoursUntilFriday4pm = (daysUntilFriday - 1) * 24 + (16 - currentHour);
      if (hoursUntilFriday4pm <= 24) {
        countdownText = `⏰ ${hoursUntilFriday4pm} hours until weekend!`;
      } else {
        const days = Math.floor(hoursUntilFriday4pm / 24);
        countdownText = `⏰ ${days} day${days > 1 ? 's' : ''} until weekend!`;
      }
    }
    
    // Get this weekend's check-ins (Friday 4pm onwards)
    const fridayStart = new Date(today);
    fridayStart.setDate(today.getDate() - ((dayOfWeek + 2) % 7)); // Go back to Friday
    fridayStart.setHours(16, 0, 0, 0);
    const fridayStartMs = fridayStart.getTime();
    
    // Weekend check-ins
    const weekendCheckins = await db.prepare(`
      SELECT c.*, u.username, u.avatar_url
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      ORDER BY c.created_at DESC
      LIMIT 10
    `).bind(fridayStartMs).all();
    
    // Weekend leaderboard (most check-ins this weekend)
    const weekendLeaders = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, 
        COUNT(*) as weekend_count,
        AVG(c.rating) as avg_rating
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      GROUP BY u.id
      ORDER BY weekend_count DESC, avg_rating DESC
      LIMIT 5
    `).bind(fridayStartMs).all();
    
    // All-time weekend stats
    const allTimeWeekendStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_weekend_smokes,
        COUNT(DISTINCT user_id) as weekend_smokers,
        AVG(rating) as avg_weekend_rating
      FROM checkins
      WHERE strftime('%w', created_at/1000, 'unixepoch') IN ('0', '5', '6')
        AND (strftime('%w', created_at/1000, 'unixepoch') != '5' 
             OR CAST(strftime('%H', created_at/1000, 'unixepoch') AS INTEGER) >= 16)
    `).all();
    
    // Top weekend brand
    const topWeekendBrand = await db.prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins
      WHERE strftime('%w', created_at/1000, 'unixepoch') IN ('0', '5', '6')
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 1
    `).all();
    
    // User's personal weekend stats
    let personalStats = null;
    if (userId) {
      const userWeekendStats = await db.prepare(`
        SELECT 
          COUNT(*) as my_weekend_smokes,
          AVG(rating) as my_avg_rating
        FROM checkins
        WHERE user_id = ?
          AND strftime('%w', created_at/1000, 'unixepoch') IN ('0', '5', '6')
      `).bind(userId).all();
      
      const thisWeekendCount = await db.prepare(`
        SELECT COUNT(*) as count FROM checkins 
        WHERE user_id = ? AND created_at >= ?
      `).bind(userId, fridayStartMs).all();
      
      personalStats = {
        totalWeekendSmokes: userWeekendStats.results[0]?.my_weekend_smokes || 0,
        avgRating: userWeekendStats.results[0]?.my_avg_rating || 0,
        thisWeekendCount: thisWeekendCount.results[0]?.count || 0
      };
    }
    
    // Suggested weekend smoke (highly rated, not tried by user)
    let suggestion = null;
    if (userId) {
      const suggestResult = await db.prepare(`
        SELECT brand, product, AVG(rating) as avg_rating, COUNT(*) as count
        FROM checkins
        WHERE brand NOT IN (SELECT DISTINCT brand FROM checkins WHERE user_id = ?)
        GROUP BY brand
        HAVING count >= 2
        ORDER BY avg_rating DESC
        LIMIT 1
      `).bind(userId).all();
      
      if (suggestResult.results[0]) {
        suggestion = {
          brand: suggestResult.results[0].brand,
          product: suggestResult.results[0].product,
          avgRating: suggestResult.results[0].avg_rating,
          reason: "Highly rated, you haven't tried it yet!"
        };
      }
    }
    
    // Fun weekend quote
    const quotes = [
      "The weekend is here. Time to unwind with a good stick. 🔥",
      "Friday feeling: Nothing but time and a great cigar. 💨",
      "Weekend mode: ON. Stress mode: OFF. 😎",
      "The best cigars are enjoyed with no rush. Happy weekend!",
      "Friday nights are made for slow burns and good company.",
      "Weekend ritual: coffee, cigar, repeat. ☕💨",
      "Take it slow this weekend. You've earned it."
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    
    return NextResponse.json({
      countdown: countdownText,
      isWeekend,
      weekendCheckins: weekendCheckins.results || [],
      weekendLeaders: weekendLeaders.results || [],
      platformStats: {
        totalWeekendSmokes: allTimeWeekendStats.results[0]?.total_weekend_smokes || 0,
        weekendSmokers: allTimeWeekendStats.results[0]?.weekend_smokers || 0,
        avgWeekendRating: allTimeWeekendStats.results[0]?.avg_weekend_rating || 0,
        topBrand: topWeekendBrand.results[0]?.brand || null
      },
      personalStats,
      suggestion,
      quote: randomQuote
    });
  } catch (error) {
    console.error("Weekend kickoff error:", error);
    return NextResponse.json({ error: "Failed to load weekend data" }, { status: 500 });
  }
}
