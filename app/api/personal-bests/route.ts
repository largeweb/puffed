import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface PersonalBest {
  label: string;
  value: string | number;
  detail?: string;
  icon: string;
  date?: string;
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
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = session.user_id;

    // Get all check-ins for this user
    interface CheckinRow {
      id: string;
      user_id: string;
      brand: string;
      product?: string;
      rating?: number;
      review?: string;
      image_url?: string;
      mood?: string;
      created_at: number;
      like_count: number;
      comment_count: number;
    }

    const checkinsResult = await db
      .prepare(
        `SELECT c.*, 
          (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count,
          (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) as comment_count
         FROM checkins c 
         WHERE c.user_id = ? 
         ORDER BY c.created_at ASC`
      )
      .bind(userId)
      .all<CheckinRow>();

    const checkins = checkinsResult.results || [];

    if (checkins.length === 0) {
      return NextResponse.json({
        bests: [],
        message: "Log your first smoke to start tracking your personal bests!"
      });
    }

    const bests: PersonalBest[] = [];

    // 1. Total check-ins
    bests.push({
      label: "Total Smokes",
      value: checkins.length,
      icon: "🚬",
      detail: "Your lifetime smoke count"
    });

    // 2. First check-in date
    const firstCheckin = checkins[0] as { created_at: number; brand: string };
    const firstDate = new Date(firstCheckin.created_at * 1000);
    bests.push({
      label: "First Smoke",
      value: firstCheckin.brand,
      icon: "🎉",
      date: firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      detail: "Your very first logged smoke"
    });

    // 3. Days since first smoke (smoking career)
    const daysSinceFirst = Math.floor((Date.now() - firstCheckin.created_at * 1000) / (1000 * 60 * 60 * 24));
    bests.push({
      label: "Smoking Career",
      value: `${daysSinceFirst} days`,
      icon: "📅",
      detail: "Since your first logged smoke"
    });

    // 4. Unique brands
    const uniqueBrands = new Set(checkins.map((c) => c.brand)).size;
    bests.push({
      label: "Brands Explored",
      value: uniqueBrands,
      icon: "🌍",
      detail: "Different brands you've tried"
    });

    // 5. Average rating
    const ratedCheckins = checkins.filter((c) => c.rating);
    if (ratedCheckins.length > 0) {
      const avgRating = ratedCheckins.reduce((sum, c) => sum + (c.rating || 0), 0) / ratedCheckins.length;
      bests.push({
        label: "Average Rating",
        value: avgRating.toFixed(1),
        icon: "⭐",
        detail: `Based on ${ratedCheckins.length} rated smokes`
      });
    }

    // 6. Five star count
    const fiveStarCount = checkins.filter((c) => c.rating === 5).length;
    if (fiveStarCount > 0) {
      bests.push({
        label: "Perfect Smokes",
        value: fiveStarCount,
        icon: "🌟",
        detail: "5-star rated experiences"
      });
    }

    // 7. Most liked check-in
    const mostLiked = checkins.reduce((max: CheckinRow | null, c) => 
      (!max || c.like_count > max.like_count) ? c : max, null);
    if (mostLiked && mostLiked.like_count > 0) {
      bests.push({
        label: "Most Liked",
        value: `${mostLiked.like_count} likes`,
        icon: "❤️",
        detail: mostLiked.brand
      });
    }

    // 8. Most commented check-in
    const mostCommented = checkins.reduce((max: CheckinRow | null, c) => 
      (!max || c.comment_count > max.comment_count) ? c : max, null);
    if (mostCommented && mostCommented.comment_count > 0) {
      bests.push({
        label: "Most Discussed",
        value: `${mostCommented.comment_count} comments`,
        icon: "💬",
        detail: mostCommented.brand
      });
    }

    // 9. Busiest day (most check-ins)
    const dayGroups: Record<string, number> = {};
    for (const c of checkins) {
      const day = new Date((c).created_at * 1000).toDateString();
      dayGroups[day] = (dayGroups[day] || 0) + 1;
    }
    const busiestDay = Object.entries(dayGroups).reduce((max, [day, count]) => 
      count > (max[1] || 0) ? [day, count] : max, ['', 0]);
    if (busiestDay[1] > 1) {
      const busyDate = new Date(busiestDay[0]);
      bests.push({
        label: "Busiest Day",
        value: `${busiestDay[1]} smokes`,
        icon: "🔥",
        date: busyDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      });
    }

    // 10. Favorite brand (most smoked)
    const brandCounts: Record<string, number> = {};
    for (const c of checkins) {
      const brand = (c).brand;
      brandCounts[brand] = (brandCounts[brand] || 0) + 1;
    }
    const favBrand = Object.entries(brandCounts).reduce((max, [brand, count]) => 
      count > (max[1] || 0) ? [brand, count] : max, ['', 0]);
    if (favBrand[0]) {
      bests.push({
        label: "Favorite Brand",
        value: favBrand[0],
        icon: "👑",
        detail: `Smoked ${favBrand[1]} times`
      });
    }

    // 11. Calculate longest streak
    const uniqueDays = [...new Set(checkins.map((c) => {
      const d = new Date(c.created_at * 1000);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }))].sort();
    
    let maxStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < uniqueDays.length; i++) {
      const [py, pm, pd] = uniqueDays[i - 1].split('-').map(Number);
      const [cy, cm, cd] = uniqueDays[i].split('-').map(Number);
      const prevDate = new Date(py, pm, pd);
      const currDate = new Date(cy, cm, cd);
      const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
        }
      } else {
        currentStreak = 1;
      }
    }

    if (maxStreak > 1) {
      bests.push({
        label: "Longest Streak",
        value: `${maxStreak} days`,
        icon: "🔗",
        detail: "Consecutive days smoking"
      });
    }

    // 12. Favorite hour to smoke
    const hourCounts: Record<number, number> = {};
    for (const c of checkins) {
      const hour = new Date((c).created_at * 1000).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
    const favHour = Object.entries(hourCounts).reduce((max, [hour, count]) => 
      count > (max[1] || 0) ? [Number(hour), count] : max, [0, 0]);
    
    const formatHour = (h: number) => {
      if (h === 0) return "12 AM";
      if (h === 12) return "12 PM";
      return h < 12 ? `${h} AM` : `${h - 12} PM`;
    };
    
    bests.push({
      label: "Peak Hour",
      value: formatHour(favHour[0] as number),
      icon: "🕐",
      detail: `${favHour[1]} smokes at this hour`
    });

    // 13. Night owl vs early bird
    const nightSmokes = checkins.filter((c) => {
      const h = new Date(c.created_at * 1000).getHours();
      return h >= 22 || h < 4;
    }).length;
    const morningSmokes = checkins.filter((c) => {
      const h = new Date(c.created_at * 1000).getHours();
      return h >= 4 && h < 10;
    }).length;

    if (nightSmokes > morningSmokes && nightSmokes >= 2) {
      bests.push({
        label: "Night Owl",
        value: `${nightSmokes} late nights`,
        icon: "🦉",
        detail: "You prefer the midnight smoke"
      });
    } else if (morningSmokes > nightSmokes && morningSmokes >= 2) {
      bests.push({
        label: "Early Bird",
        value: `${morningSmokes} mornings`,
        icon: "🌅",
        detail: "You start your days right"
      });
    }

    // 14. Photos uploaded
    const photosCount = checkins.filter((c) => c.image_url).length;
    if (photosCount > 0) {
      const photoPercentage = Math.round((photosCount / checkins.length) * 100);
      bests.push({
        label: "Photo Logger",
        value: `${photosCount} photos`,
        icon: "📸",
        detail: `${photoPercentage}% of your smokes have photos`
      });
    }

    // 15. Mood variety
    const uniqueMoods = new Set(checkins.filter((c) => c.mood).map((c) => c.mood)).size;
    if (uniqueMoods >= 3) {
      bests.push({
        label: "Mood Range",
        value: `${uniqueMoods} moods`,
        icon: "🎭",
        detail: "You smoke in many moods"
      });
    }

    return NextResponse.json({ bests });
  } catch (error) {
    console.error("Personal bests error:", error);
    return NextResponse.json(
      { error: "Failed to load personal bests" },
      { status: 500 }
    );
  }
}
