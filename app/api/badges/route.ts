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
];

interface UserStats {
  checkins: number;
  ratedCheckins: number;
  fiveStarRatings: number;
  photosUploaded: number;
  uniqueBrands: number;
  likesGiven: number;
  following: number;
  commentsGiven: number;
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
    ] = await Promise.all([
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND rating IS NOT NULL").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND rating = 5").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND image_url IS NOT NULL").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(DISTINCT brand) as count FROM checkins WHERE user_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM likes WHERE user_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM follows WHERE follower_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM comments WHERE user_id = ?").bind(userId).first<{ count: number }>(),
    ]);

    const stats: UserStats = {
      checkins: checkinsResult?.count || 0,
      ratedCheckins: ratedResult?.count || 0,
      fiveStarRatings: fiveStarResult?.count || 0,
      photosUploaded: photosResult?.count || 0,
      uniqueBrands: brandsResult?.count || 0,
      likesGiven: likesResult?.count || 0,
      following: followingResult?.count || 0,
      commentsGiven: commentsResult?.count || 0,
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
