import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";
import type { Badge, BadgesResponse } from "@/lib/types";

// Badge definitions
const BADGE_DEFINITIONS = [
  {
    id: "first_smoke",
    name: "First Smoke",
    description: "Log your first check-in",
    emoji: "🌱",
    check: (stats: UserStats) => stats.checkins >= 1,
    progress: (stats: UserStats) => ({ current: stats.checkins, target: 1 }),
  },
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Log a smoke before 6 AM",
    emoji: "🌅",
    check: (stats: UserStats) => stats.earlyMorningSmokes >= 1,
    progress: (stats: UserStats) => ({ current: stats.earlyMorningSmokes, target: 1 }),
  },
  {
    id: "night_owl",
    name: "Night Owl",
    description: "Log a smoke between midnight and 4 AM",
    emoji: "🦉",
    check: (stats: UserStats) => stats.lateNightSmokes >= 1,
    progress: (stats: UserStats) => ({ current: stats.lateNightSmokes, target: 1 }),
  },
  {
    id: "weekend_warrior",
    name: "Weekend Warrior",
    description: "Log smokes on 3 different weekends",
    emoji: "🎉",
    check: (stats: UserStats) => stats.weekendSmokes >= 3,
    progress: (stats: UserStats) => ({ current: stats.weekendSmokes, target: 3 }),
  },
  {
    id: "three_day_streak",
    name: "Hot Streak",
    description: "Achieve a 3-day streak",
    emoji: "🔥",
    check: (stats: UserStats) => stats.bestStreak >= 3,
    progress: (stats: UserStats) => ({ current: stats.bestStreak, target: 3 }),
  },
  {
    id: "week_streak",
    name: "Weekly Warrior",
    description: "Achieve a 7-day streak",
    emoji: "⚡",
    check: (stats: UserStats) => stats.bestStreak >= 7,
    progress: (stats: UserStats) => ({ current: stats.bestStreak, target: 7 }),
  },
  {
    id: "month_streak",
    name: "Monthly Master",
    description: "Achieve a 30-day streak",
    emoji: "🏅",
    check: (stats: UserStats) => stats.bestStreak >= 30,
    progress: (stats: UserStats) => ({ current: stats.bestStreak, target: 30 }),
  },
  {
    id: "getting_started",
    name: "Getting Started",
    description: "Log 5 check-ins",
    emoji: "🔥",
    check: (stats: UserStats) => stats.checkins >= 5,
    progress: (stats: UserStats) => ({ current: stats.checkins, target: 5 }),
  },
  {
    id: "regular",
    name: "Regular",
    description: "Log 10 check-ins",
    emoji: "💨",
    check: (stats: UserStats) => stats.checkins >= 10,
    progress: (stats: UserStats) => ({ current: stats.checkins, target: 10 }),
  },
  {
    id: "aficionado",
    name: "Aficionado",
    description: "Log 25 check-ins",
    emoji: "👑",
    check: (stats: UserStats) => stats.checkins >= 25,
    progress: (stats: UserStats) => ({ current: stats.checkins, target: 25 }),
  },
  {
    id: "legend",
    name: "Legend",
    description: "Log 50 check-ins",
    emoji: "🏆",
    check: (stats: UserStats) => stats.checkins >= 50,
    progress: (stats: UserStats) => ({ current: stats.checkins, target: 50 }),
  },
  {
    id: "five_star",
    name: "Five Star",
    description: "Give a perfect 5-star rating",
    emoji: "⭐",
    check: (stats: UserStats) => stats.fiveStarRatings >= 1,
    progress: (stats: UserStats) => ({ current: stats.fiveStarRatings, target: 1 }),
  },
  {
    id: "critic",
    name: "Critic",
    description: "Rate 5 different cigars",
    emoji: "🎯",
    check: (stats: UserStats) => stats.ratedCheckins >= 5,
    progress: (stats: UserStats) => ({ current: stats.ratedCheckins, target: 5 }),
  },
  {
    id: "photographer",
    name: "Photographer",
    description: "Upload 3 photos",
    emoji: "📸",
    check: (stats: UserStats) => stats.photosUploaded >= 3,
    progress: (stats: UserStats) => ({ current: stats.photosUploaded, target: 3 }),
  },
  {
    id: "first_love",
    name: "First Love",
    description: "Like someone's check-in",
    emoji: "❤️",
    check: (stats: UserStats) => stats.likesGiven >= 1,
    progress: (stats: UserStats) => ({ current: stats.likesGiven, target: 1 }),
  },
  {
    id: "socialite",
    name: "Socialite",
    description: "Follow 3 people",
    emoji: "👥",
    check: (stats: UserStats) => stats.following >= 3,
    progress: (stats: UserStats) => ({ current: stats.following, target: 3 }),
  },
  {
    id: "commentator",
    name: "Commentator",
    description: "Leave 5 comments",
    emoji: "💬",
    check: (stats: UserStats) => stats.commentsGiven >= 5,
    progress: (stats: UserStats) => ({ current: stats.commentsGiven, target: 5 }),
  },
  {
    id: "explorer",
    name: "Explorer",
    description: "Try 5 different brands",
    emoji: "🗺️",
    check: (stats: UserStats) => stats.uniqueBrands >= 5,
    progress: (stats: UserStats) => ({ current: stats.uniqueBrands, target: 5 }),
  },
  // Brand Pioneer badges - reward exploration!
  {
    id: "brand_pioneer",
    name: "Brand Pioneer",
    description: "Be the first to log a brand on Puffed",
    emoji: "🏴‍☠️",
    check: (stats: UserStats) => stats.brandsDiscovered >= 1,
    progress: (stats: UserStats) => ({ current: stats.brandsDiscovered, target: 1 }),
  },
  {
    id: "trailblazer",
    name: "Trailblazer",
    description: "Be the first to log 3 brands",
    emoji: "🧭",
    check: (stats: UserStats) => stats.brandsDiscovered >= 3,
    progress: (stats: UserStats) => ({ current: stats.brandsDiscovered, target: 3 }),
  },
  {
    id: "brand_columbus",
    name: "Brand Columbus",
    description: "Be the first to log 10 brands",
    emoji: "🌎",
    check: (stats: UserStats) => stats.brandsDiscovered >= 10,
    progress: (stats: UserStats) => ({ current: stats.brandsDiscovered, target: 10 }),
  },
  // Comeback badges - celebrate re-engagement!
  {
    id: "comeback_kid",
    name: "Comeback Kid",
    description: "Return and log after 7+ days away",
    emoji: "🔄",
    check: (stats: UserStats) => stats.comebackReturns >= 1,
    progress: (stats: UserStats) => ({ current: stats.comebackReturns, target: 1 }),
  },
  {
    id: "phoenix",
    name: "Phoenix",
    description: "Rise from the ashes 3 times (return after 7+ days, 3 times)",
    emoji: "🔥",
    check: (stats: UserStats) => stats.comebackReturns >= 3,
    progress: (stats: UserStats) => ({ current: stats.comebackReturns, target: 3 }),
  },
  // Midnight Club - exclusive late night recognition
  {
    id: "midnight_club",
    name: "Midnight Club",
    description: "Log a smoke at exactly midnight hour (12-1 AM)",
    emoji: "🌙",
    check: (stats: UserStats) => stats.midnightSmokes >= 1,
    progress: (stats: UserStats) => ({ current: stats.midnightSmokes, target: 1 }),
  },
  // 2 AM Club - the deep late night crew
  {
    id: "2am_club",
    name: "2 AM Club",
    description: "Log a smoke between 2-3 AM",
    emoji: "😴",
    check: (stats: UserStats) => stats.twoAmSmokes >= 1,
    progress: (stats: UserStats) => ({ current: stats.twoAmSmokes, target: 1 }),
  },
  // 3 AM Club - the truly dedicated
  {
    id: "3am_club",
    name: "3 AM Club",
    description: "Log a smoke between 3-4 AM",
    emoji: "🕒",
    check: (stats: UserStats) => stats.threeAmSmokes >= 1,
    progress: (stats: UserStats) => ({ current: stats.threeAmSmokes, target: 1 }),
  },
  // 4 AM Warrior - the last stand before dawn
  {
    id: "4am_warrior",
    name: "4 AM Warrior",
    description: "Log a smoke between 4-5 AM (the hour before dawn)",
    emoji: "🌄",
    check: (stats: UserStats) => stats.fourAmSmokes >= 1,
    progress: (stats: UserStats) => ({ current: stats.fourAmSmokes, target: 1 }),
  },
  // Twilight Seeker - dedicated pre-dawn smoker
  {
    id: "twilight_seeker",
    name: "Twilight Seeker",
    description: "Log 5 smokes in the twilight zone (4-5 AM)",
    emoji: "🌌",
    check: (stats: UserStats) => stats.fourAmSmokes >= 5,
    progress: (stats: UserStats) => ({ current: stats.fourAmSmokes, target: 5 }),
  },
  // Night Owl progression badges
  {
    id: "night_owl_pro",
    name: "Night Owl Pro",
    description: "Log 5 late night smokes (midnight - 4 AM)",
    emoji: "🦇",
    check: (stats: UserStats) => stats.lateNightSmokes >= 5,
    progress: (stats: UserStats) => ({ current: stats.lateNightSmokes, target: 5 }),
  },
  {
    id: "insomniac",
    name: "Insomniac",
    description: "Log 10 late night smokes (midnight - 4 AM)",
    emoji: "👁️",
    check: (stats: UserStats) => stats.lateNightSmokes >= 10,
    progress: (stats: UserStats) => ({ current: stats.lateNightSmokes, target: 10 }),
  },
  // Century milestone
  {
    id: "century_smoker",
    name: "Century Smoker",
    description: "Log 100 check-ins",
    emoji: "💯",
    check: (stats: UserStats) => stats.checkins >= 100,
    progress: (stats: UserStats) => ({ current: stats.checkins, target: 100 }),
  },
  // Social proof badges
  {
    id: "beloved",
    name: "Beloved",
    description: "Receive 10 likes on your check-ins",
    emoji: "💕",
    check: (stats: UserStats) => stats.likesReceived >= 10,
    progress: (stats: UserStats) => ({ current: stats.likesReceived, target: 10 }),
  },
  {
    id: "fan_favorite",
    name: "Fan Favorite",
    description: "Receive 50 likes on your check-ins",
    emoji: "🌟",
    check: (stats: UserStats) => stats.likesReceived >= 50,
    progress: (stats: UserStats) => ({ current: stats.likesReceived, target: 50 }),
  },
  // Referral badges - incentivize growth!
  {
    id: "friend_finder",
    name: "Friend Finder",
    description: "Invite a friend who joins",
    emoji: "👯",
    check: (stats: UserStats) => stats.referrals >= 1,
    progress: (stats: UserStats) => ({ current: stats.referrals, target: 1 }),
  },
  {
    id: "crew_builder",
    name: "Crew Builder",
    description: "Invite 3 friends who join",
    emoji: "🏗️",
    check: (stats: UserStats) => stats.referrals >= 3,
    progress: (stats: UserStats) => ({ current: stats.referrals, target: 3 }),
  },
  {
    id: "ambassador",
    name: "Ambassador",
    description: "Invite 10 friends who join",
    emoji: "🌟",
    check: (stats: UserStats) => stats.referrals >= 10,
    progress: (stats: UserStats) => ({ current: stats.referrals, target: 10 }),
  },
];

interface UserStats {
  checkins: number;
  ratedCheckins: number;
  fiveStarRatings: number;
  photosUploaded: number;
  uniqueBrands: number;
  likesGiven: number;
  likesReceived: number;
  following: number;
  commentsGiven: number;
  bestStreak: number;
  earlyMorningSmokes: number;
  lateNightSmokes: number;
  midnightSmokes: number;
  twoAmSmokes: number;
  threeAmSmokes: number;
  fourAmSmokes: number;
  weekendSmokes: number;
  referrals: number;
  brandsDiscovered: number;
  comebackReturns: number;
}

export const runtime = "edge";

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return Response.json({ error: "Not authenticated" } as BadgesResponse, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Session expired" } as BadgesResponse, { status: 401 });
    }

    const userId = session.user_id;

    // Gather all stats needed for badge calculation
    const [
      checkinsResult,
      ratedResult,
      fiveStarResult,
      photosResult,
      brandsResult,
      likesResult,
      followingResult,
      commentsResult,
      datesResult,
      earlyMorningResult,
      lateNightResult,
      midnightResult,
      twoAmResult,
      threeAmResult,
      fourAmResult,
      weekendResult,
      referralsResult,
      brandsDiscoveredResult,
      likesReceivedResult,
    ] = await Promise.all([
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND rating IS NOT NULL").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND rating = 5").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND image_url IS NOT NULL").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(DISTINCT brand) as count FROM checkins WHERE user_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM likes WHERE user_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM follows WHERE follower_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM comments WHERE user_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare(`
        SELECT DISTINCT date(created_at, 'unixepoch') as checkin_date
        FROM checkins
        WHERE user_id = ?
        ORDER BY checkin_date DESC
      `).bind(userId).all<{ checkin_date: string }>(),
      // Early bird: check-ins between 4 AM and 6 AM (hour 4-5)
      db.prepare(`
        SELECT COUNT(*) as count FROM checkins 
        WHERE user_id = ? AND CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) BETWEEN 4 AND 5
      `).bind(userId).first<{ count: number }>(),
      // Night owl: check-ins between midnight and 4 AM (hour 0-3)
      db.prepare(`
        SELECT COUNT(*) as count FROM checkins 
        WHERE user_id = ? AND CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) BETWEEN 0 AND 3
      `).bind(userId).first<{ count: number }>(),
      // Midnight Club: check-ins exactly at midnight hour (12 AM = hour 0)
      db.prepare(`
        SELECT COUNT(*) as count FROM checkins 
        WHERE user_id = ? AND CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) = 0
      `).bind(userId).first<{ count: number }>(),
      // 2 AM Club: check-ins exactly at 2 AM hour (2-3 AM)
      db.prepare(`
        SELECT COUNT(*) as count FROM checkins 
        WHERE user_id = ? AND CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) = 2
      `).bind(userId).first<{ count: number }>(),
      // 3 AM Club: check-ins exactly at 3 AM hour (3-4 AM)
      db.prepare(`
        SELECT COUNT(*) as count FROM checkins 
        WHERE user_id = ? AND CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) = 3
      `).bind(userId).first<{ count: number }>(),
      // 4 AM Warrior: check-ins exactly at 4 AM hour (4-5 AM)
      db.prepare(`
        SELECT COUNT(*) as count FROM checkins 
        WHERE user_id = ? AND CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) = 4
      `).bind(userId).first<{ count: number }>(),
      // Weekend warrior: count distinct weekends (year-week combo on Sat/Sun)
      db.prepare(`
        SELECT COUNT(DISTINCT strftime('%Y-%W', created_at, 'unixepoch')) as count 
        FROM checkins 
        WHERE user_id = ? AND CAST(strftime('%w', created_at, 'unixepoch') AS INTEGER) IN (0, 6)
      `).bind(userId).first<{ count: number }>(),
      // Referrals: count users who were referred by this user
      db.prepare("SELECT COUNT(*) as count FROM users WHERE referred_by = ?").bind(userId).first<{ count: number }>(),
      // Brand pioneer: count brands where this user was the first to log
      db.prepare(`
        SELECT COUNT(*) as count FROM (
          SELECT brand, user_id, MIN(created_at) as first_checkin
          FROM checkins
          GROUP BY brand
          HAVING user_id = ?
        )
      `).bind(userId).first<{ count: number }>(),
      // Likes received on user's check-ins
      db.prepare(`
        SELECT COUNT(*) as count FROM likes l
        JOIN checkins c ON l.checkin_id = c.id
        WHERE c.user_id = ?
      `).bind(userId).first<{ count: number }>(),
    ]);

    // Calculate best streak and comeback returns from dates
    const dates = datesResult.results?.map(r => r.checkin_date) || [];
    let bestStreak = 0;
    let comebackReturns = 0;
    if (dates.length > 0) {
      let tempStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const currentDate = new Date(dates[i - 1]);
        const prevDate = new Date(dates[i]);
        const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          // Consecutive day - continue streak
          tempStreak++;
        } else {
          // Gap in activity
          bestStreak = Math.max(bestStreak, tempStreak);
          tempStreak = 1;
          
          // Check if this was a 7+ day comeback
          if (daysDiff >= 7) {
            comebackReturns++;
          }
        }
      }
      bestStreak = Math.max(bestStreak, tempStreak);
    }

    const stats: UserStats = {
      checkins: checkinsResult?.count || 0,
      ratedCheckins: ratedResult?.count || 0,
      fiveStarRatings: fiveStarResult?.count || 0,
      photosUploaded: photosResult?.count || 0,
      uniqueBrands: brandsResult?.count || 0,
      likesGiven: likesResult?.count || 0,
      likesReceived: likesReceivedResult?.count || 0,
      following: followingResult?.count || 0,
      commentsGiven: commentsResult?.count || 0,
      bestStreak,
      earlyMorningSmokes: earlyMorningResult?.count || 0,
      lateNightSmokes: lateNightResult?.count || 0,
      midnightSmokes: midnightResult?.count || 0,
      twoAmSmokes: twoAmResult?.count || 0,
      threeAmSmokes: threeAmResult?.count || 0,
      fourAmSmokes: fourAmResult?.count || 0,
      weekendSmokes: weekendResult?.count || 0,
      referrals: referralsResult?.count || 0,
      brandsDiscovered: brandsDiscoveredResult?.count || 0,
      comebackReturns,
    };

    // Calculate badges
    const badges: Badge[] = BADGE_DEFINITIONS.map((def) => {
      const earned = def.check(stats);
      const prog = def.progress(stats);
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        emoji: def.emoji,
        earned,
        progress: earned ? undefined : prog.current,
        target: earned ? undefined : prog.target,
      };
    });

    const earnedCount = badges.filter((b) => b.earned).length;

    return Response.json({
      badges,
      earned_count: earnedCount,
      total_count: badges.length,
    } as BadgesResponse);
  } catch (error) {
    console.error("Badges error:", error);
    return Response.json({ error: "Server error" } as BadgesResponse, { status: 500 });
  }
}
