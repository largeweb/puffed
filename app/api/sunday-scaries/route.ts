import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

export async function GET(): Promise<Response> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Get current user if logged in
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;
    let currentUserId: number | null = null;

    if (sessionId) {
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ?")
        .bind(sessionId)
        .first() as { user_id: number } | null;
      currentUserId = session?.user_id || null;
    }

    // Calculate countdown to Monday 9 AM
    const now = new Date();
    const monday9am = new Date(now);
    const day = now.getDay();

    // Calculate days until Monday
    let daysUntilMonday = (1 - day + 7) % 7;
    if (daysUntilMonday === 0 && now.getHours() >= 9) {
      daysUntilMonday = 7; // It's already past Monday 9 AM
    }

    monday9am.setDate(now.getDate() + daysUntilMonday);
    monday9am.setHours(9, 0, 0, 0);

    const msToMonday = monday9am.getTime() - now.getTime();
    const hoursToMonday = Math.floor(msToMonday / (1000 * 60 * 60));
    const minutesToMonday = Math.floor(
      (msToMonday % (1000 * 60 * 60)) / (1000 * 60)
    );

    // Calculate weekend progress (Friday 5 PM to Monday 9 AM = 64 hours)
    const friday5pm = new Date(now);
    const daysSinceFriday = (day - 5 + 7) % 7;
    friday5pm.setDate(now.getDate() - daysSinceFriday);
    friday5pm.setHours(17, 0, 0, 0);

    if (now < friday5pm) {
      friday5pm.setDate(friday5pm.getDate() - 7);
    }

    const totalWeekendMs = 64 * 60 * 60 * 1000; // 64 hours
    const elapsedMs = now.getTime() - friday5pm.getTime();
    const weekendProgress = Math.min(
      100,
      Math.round((elapsedMs / totalWeekendMs) * 100)
    );

    // Get user's weekend stats (Saturday + Sunday)
    let yourWeekend = {
      totalSmokes: 0,
      avgRating: 0,
      bestSmoke: null as { brand: string; product: string; rating: number } | null,
      socialStats: { likesGiven: 0, likesReceived: 0, commentsLeft: 0 },
    };

    if (currentUserId) {
      // Weekend check-ins (last 2 days or weekend days)
      const weekendCheckins = await db
        .prepare(
          `SELECT brand, product, rating, created_at
          FROM check_ins
          WHERE user_id = ?
            AND created_at >= unixepoch('now', '-2 days')
            AND (strftime('%w', datetime(created_at, 'unixepoch')) = '6' 
                 OR strftime('%w', datetime(created_at, 'unixepoch')) = '0')
          ORDER BY rating DESC, created_at DESC`
        )
        .bind(currentUserId)
        .all() as { results: Array<{ brand: string; product: string; rating: number }> };

      if (weekendCheckins.results && weekendCheckins.results.length > 0) {
        yourWeekend.totalSmokes = weekendCheckins.results.length;
        const totalRating = weekendCheckins.results.reduce(
          (sum, c) => sum + (c.rating || 0),
          0
        );
        yourWeekend.avgRating = totalRating / weekendCheckins.results.length;
        yourWeekend.bestSmoke = {
          brand: weekendCheckins.results[0].brand,
          product: weekendCheckins.results[0].product || "",
          rating: weekendCheckins.results[0].rating,
        };
      }

      // Social stats for weekend
      const likesGiven = await db
        .prepare(
          `SELECT COUNT(*) as count FROM likes 
          WHERE user_id = ? AND created_at >= unixepoch('now', '-2 days')`
        )
        .bind(currentUserId)
        .first() as { count: number } | null;

      const likesReceived = await db
        .prepare(
          `SELECT COUNT(*) as count FROM likes l
          JOIN check_ins c ON l.checkin_id = c.id
          WHERE c.user_id = ? AND l.created_at >= unixepoch('now', '-2 days')`
        )
        .bind(currentUserId)
        .first() as { count: number } | null;

      const commentsLeft = await db
        .prepare(
          `SELECT COUNT(*) as count FROM comments 
          WHERE user_id = ? AND created_at >= unixepoch('now', '-2 days')`
        )
        .bind(currentUserId)
        .first() as { count: number } | null;

      yourWeekend.socialStats = {
        likesGiven: likesGiven?.count || 0,
        likesReceived: likesReceived?.count || 0,
        commentsLeft: commentsLeft?.count || 0,
      };
    }

    // Get people who checked in today (Sunday) - the "support group"
    const todayCheckins = await db
      .prepare(
        `SELECT DISTINCT u.username, c.created_at as lastCheckIn, c.brand
        FROM check_ins c
        JOIN users u ON c.user_id = u.id
        WHERE c.created_at >= unixepoch('now', 'start of day')
        ORDER BY c.created_at DESC
        LIMIT 10`
      )
      .all() as { results: Array<{ username: string; lastCheckIn: number; brand: string }> };

    const copingMethods = [
      "Having one more smoke",
      "Pretending it's still Saturday",
      "Watching 'just one more' episode",
      "Stress-smoking",
      "Planning next weekend",
      "Making to-do lists",
      "Scrolling endlessly",
      "Denial mode activated",
    ];

    const supportGroup = (todayCheckins.results || []).map((member, i) => ({
      username: member.username,
      lastCheckIn: new Date(member.lastCheckIn * 1000).toISOString(),
      copingMethod: copingMethods[i % copingMethods.length],
    }));

    // Coping tips / wisdom
    const copingTips = [
      "Monday is just Friday's distant cousin",
      "You've never lost to a Monday yet",
      "The best revenge on Sunday Scaries is a great Sunday smoke",
      "Tomorrow's problems are for tomorrow's you",
      "Every pro was once a scared amateur at Mondays",
      "This too shall pass... into Tuesday",
      "Focus on the smoke, not the stress",
      "Your weekend achievements don't disappear at midnight",
      "Monday can't hurt you if you're vibing with friends",
      "Next weekend is only 5 days away!",
    ];

    // Community mood (based on time and activity)
    const activeUsers = await db
      .prepare(
        `SELECT COUNT(DISTINCT user_id) as count FROM check_ins 
        WHERE created_at >= unixepoch('now', '-4 hours')`
      )
      .first() as { count: number } | null;

    const totalMood = activeUsers?.count || 5;
    const communityMood = {
      total: totalMood,
      anxious: Math.floor(totalMood * 0.5),
      relaxed: Math.floor(totalMood * 0.3),
      denial: Math.floor(totalMood * 0.2),
    };

    // Survival badge based on weekend activity
    let survivalBadge: string | null = null;
    if (yourWeekend.totalSmokes >= 10) {
      survivalBadge = "Weekend Warrior";
    } else if (yourWeekend.totalSmokes >= 5) {
      survivalBadge = "Scaries Survivor";
    } else if (yourWeekend.socialStats.likesGiven >= 5) {
      survivalBadge = "Community Comforter";
    } else if (yourWeekend.avgRating >= 4.5 && yourWeekend.totalSmokes > 0) {
      survivalBadge = "Quality Over Quantity";
    }

    return Response.json({
      countdown: {
        hoursToMonday,
        minutesToMonday,
        weekendProgress,
      },
      yourWeekend,
      supportGroup,
      copingTips,
      communityMood,
      survivalBadge,
    });
  } catch (error) {
    console.error("Sunday Scaries API error:", error);
    return Response.json(
      { error: "Failed to load scaries data" },
      { status: 500 }
    );
  }
}
