import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface TrophyStats {
  // Lifetime totals
  totalCheckins: number;
  totalLikesGiven: number;
  totalLikesReceived: number;
  totalComments: number;
  totalFollowers: number;
  totalFollowing: number;
  uniqueBrands: number;
  uniqueFlavors: number;
  avgRating: number;
  photosUploaded: number;
  
  // Records
  bestStreak: number;
  currentStreak: number;
  longestSession: number | null; // minutes
  
  // Time stats
  earlyBirdCount: number;
  nightOwlCount: number;
  weekendCount: number;
  
  // Firsts
  firstCheckin: number | null;
  firstBrandPioneered: string | null;
  
  // Platform comparisons
  platformAvgCheckins: number;
  platformAvgRating: number;
  percentileRank: number;
  
  // Badge summary
  badgesEarned: number;
  badgesTotal: number;
  recentBadges: Array<{
    id: string;
    name: string;
    emoji: string;
    earnedAt: number | null;
  }>;
}

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Session expired" }, { status: 401 });
    }

    const userId = session.user_id;

    // Get user info
    const user = await db
      .prepare("SELECT username, created_at FROM users WHERE id = ?")
      .bind(userId)
      .first<{ username: string; created_at: number }>();

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Gather all trophy stats
    const [
      checkinsResult,
      likesGivenResult,
      likesReceivedResult,
      commentsResult,
      followersResult,
      followingResult,
      brandsResult,
      flavorsResult,
      avgRatingResult,
      photosResult,
      firstCheckinResult,
      datesResult,
      longestSessionResult,
      earlyBirdResult,
      nightOwlResult,
      weekendResult,
      brandPioneeredResult,
      platformStatsResult,
      userRankResult,
    ] = await Promise.all([
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM likes WHERE user_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare(`
        SELECT COUNT(*) as count FROM likes l
        JOIN checkins c ON l.checkin_id = c.id
        WHERE c.user_id = ?
      `).bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM comments WHERE user_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM follows WHERE following_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM follows WHERE follower_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(DISTINCT brand) as count FROM checkins WHERE user_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(DISTINCT flavor) as count FROM checkin_flavors cf JOIN checkins c ON cf.checkin_id = c.id WHERE c.user_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT AVG(rating) as avg FROM checkins WHERE user_id = ? AND rating IS NOT NULL").bind(userId).first<{ avg: number | null }>(),
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND image_url IS NOT NULL").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT MIN(created_at) as first FROM checkins WHERE user_id = ?").bind(userId).first<{ first: number | null }>(),
      db.prepare(`
        SELECT DISTINCT date(created_at, 'unixepoch') as checkin_date
        FROM checkins
        WHERE user_id = ?
        ORDER BY checkin_date DESC
      `).bind(userId).all<{ checkin_date: string }>(),
      db.prepare(`
        SELECT MAX(ended_at - started_at) as longest FROM smoke_timers 
        WHERE user_id = ? AND ended_at IS NOT NULL
      `).bind(userId).first<{ longest: number | null }>(),
      db.prepare(`
        SELECT COUNT(*) as count FROM checkins 
        WHERE user_id = ? AND CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) BETWEEN 4 AND 6
      `).bind(userId).first<{ count: number }>(),
      db.prepare(`
        SELECT COUNT(*) as count FROM checkins 
        WHERE user_id = ? AND CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) BETWEEN 0 AND 3
      `).bind(userId).first<{ count: number }>(),
      db.prepare(`
        SELECT COUNT(*) as count FROM checkins 
        WHERE user_id = ? AND CAST(strftime('%w', created_at, 'unixepoch') AS INTEGER) IN (0, 6)
      `).bind(userId).first<{ count: number }>(),
      db.prepare(`
        SELECT brand FROM (
          SELECT brand, user_id, MIN(created_at) as first_checkin
          FROM checkins
          GROUP BY brand
          HAVING user_id = ?
          ORDER BY first_checkin
          LIMIT 1
        )
      `).bind(userId).first<{ brand: string | null }>(),
      db.prepare(`
        SELECT 
          AVG(user_checkins) as avg_checkins,
          AVG(user_rating) as avg_rating
        FROM (
          SELECT 
            user_id,
            COUNT(*) as user_checkins,
            AVG(rating) as user_rating
          FROM checkins
          GROUP BY user_id
        )
      `).first<{ avg_checkins: number; avg_rating: number | null }>(),
      db.prepare(`
        SELECT COUNT(*) + 1 as rank FROM (
          SELECT user_id, COUNT(*) as checkin_count
          FROM checkins
          GROUP BY user_id
        ) WHERE checkin_count > (
          SELECT COUNT(*) FROM checkins WHERE user_id = ?
        )
      `).bind(userId).first<{ rank: number }>(),
    ]);

    // Calculate streaks
    const dates = datesResult.results?.map(r => r.checkin_date) || [];
    let bestStreak = 0;
    let currentStreak = 0;
    
    if (dates.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      // Check if current streak is active
      if (dates[0] === today || dates[0] === yesterday) {
        currentStreak = 1;
        for (let i = 1; i < dates.length; i++) {
          const currentDate = new Date(dates[i - 1]);
          const prevDate = new Date(dates[i]);
          const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
      
      // Calculate best streak
      let tempStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const currentDate = new Date(dates[i - 1]);
        const prevDate = new Date(dates[i]);
        const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff === 1) {
          tempStreak++;
        } else {
          bestStreak = Math.max(bestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      bestStreak = Math.max(bestStreak, tempStreak);
    }

    // Get total users for percentile
    const totalUsersResult = await db
      .prepare("SELECT COUNT(DISTINCT user_id) as total FROM checkins")
      .first<{ total: number }>();
    const totalUsers = totalUsersResult?.total || 1;
    const percentileRank = Math.round(((totalUsers - (userRankResult?.rank || 1)) / totalUsers) * 100);

    // Badge definitions for recent badges display
    const recentBadges = [
      { id: "aficionado", name: "Aficionado", emoji: "👑", earnedAt: (checkinsResult?.count || 0) >= 25 ? Date.now() : null },
      { id: "regular", name: "Regular", emoji: "💨", earnedAt: (checkinsResult?.count || 0) >= 10 ? Date.now() : null },
      { id: "first_smoke", name: "First Smoke", emoji: "🌱", earnedAt: (checkinsResult?.count || 0) >= 1 ? firstCheckinResult?.first : null },
    ].filter(b => b.earnedAt !== null).slice(0, 3);

    // Count badges (simplified - ideally call badges API)
    let badgesEarned = 0;
    const userCheckins = checkinsResult?.count || 0;
    if (userCheckins >= 1) badgesEarned++;
    if (userCheckins >= 5) badgesEarned++;
    if (userCheckins >= 10) badgesEarned++;
    if (userCheckins >= 25) badgesEarned++;
    if ((brandsResult?.count || 0) >= 5) badgesEarned++;
    if ((photosResult?.count || 0) >= 3) badgesEarned++;
    if ((likesGivenResult?.count || 0) >= 1) badgesEarned++;
    if ((followingResult?.count || 0) >= 3) badgesEarned++;
    if (bestStreak >= 3) badgesEarned++;
    if (bestStreak >= 7) badgesEarned++;
    if ((earlyBirdResult?.count || 0) >= 1) badgesEarned++;
    if ((nightOwlResult?.count || 0) >= 1) badgesEarned++;

    const stats: TrophyStats = {
      totalCheckins: checkinsResult?.count || 0,
      totalLikesGiven: likesGivenResult?.count || 0,
      totalLikesReceived: likesReceivedResult?.count || 0,
      totalComments: commentsResult?.count || 0,
      totalFollowers: followersResult?.count || 0,
      totalFollowing: followingResult?.count || 0,
      uniqueBrands: brandsResult?.count || 0,
      uniqueFlavors: flavorsResult?.count || 0,
      avgRating: avgRatingResult?.avg ? Math.round(avgRatingResult.avg * 10) / 10 : 0,
      photosUploaded: photosResult?.count || 0,
      bestStreak,
      currentStreak,
      longestSession: longestSessionResult?.longest ? Math.round(longestSessionResult.longest / 60) : null,
      earlyBirdCount: earlyBirdResult?.count || 0,
      nightOwlCount: nightOwlResult?.count || 0,
      weekendCount: weekendResult?.count || 0,
      firstCheckin: firstCheckinResult?.first || null,
      firstBrandPioneered: brandPioneeredResult?.brand || null,
      platformAvgCheckins: Math.round(platformStatsResult?.avg_checkins || 0),
      platformAvgRating: platformStatsResult?.avg_rating ? Math.round(platformStatsResult.avg_rating * 10) / 10 : 0,
      percentileRank: Math.max(0, percentileRank),
      badgesEarned,
      badgesTotal: 45,
      recentBadges,
    };

    return Response.json({
      username: user.username,
      memberSince: user.created_at,
      stats,
    });
  } catch (error) {
    console.error("Trophy room error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
