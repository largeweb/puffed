import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

// Challenge definitions
interface Challenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: "social" | "activity" | "explore" | "quality" | "timing";
  check: (stats: DailyStats) => boolean;
  target: number;
  getCurrent: (stats: DailyStats) => number;
  // Optional: only show to users meeting criteria
  minCheckins?: number;
  flavor?: string;
}

interface DailyStats {
  checkinsToday: number;
  likesToday: number;
  commentsToday: number;
  photosToday: number;
  uniqueBrandsToday: number;
  fiveStarsToday: number;
  reactionsToday: number;
  newBrandsToday: number;
  // All-time
  totalCheckins: number;
  uniqueBrands: number;
  following: number;
  // Flavor specific
  flavorCheckinsToday: Record<string, number>;
}

const CHALLENGES: Challenge[] = [
  // Social Challenges
  {
    id: "give_love",
    title: "Spread the Love",
    description: "Give 3 likes to other smokers",
    emoji: "❤️",
    category: "social",
    check: (s) => s.likesToday >= 3,
    target: 3,
    getCurrent: (s) => s.likesToday,
  },
  {
    id: "start_convo",
    title: "Start a Conversation",
    description: "Leave a comment on someone's check-in",
    emoji: "💬",
    category: "social",
    check: (s) => s.commentsToday >= 1,
    target: 1,
    getCurrent: (s) => s.commentsToday,
  },
  {
    id: "react_king",
    title: "Reaction King",
    description: "React to 5 check-ins today",
    emoji: "🎭",
    category: "social",
    check: (s) => s.reactionsToday >= 5,
    target: 5,
    getCurrent: (s) => s.reactionsToday,
  },
  // Activity Challenges
  {
    id: "log_one",
    title: "Light One Up",
    description: "Log a smoke today",
    emoji: "🔥",
    category: "activity",
    check: (s) => s.checkinsToday >= 1,
    target: 1,
    getCurrent: (s) => s.checkinsToday,
  },
  {
    id: "double_trouble",
    title: "Double Trouble",
    description: "Log 2 smokes today",
    emoji: "💨",
    category: "activity",
    check: (s) => s.checkinsToday >= 2,
    target: 2,
    getCurrent: (s) => s.checkinsToday,
  },
  {
    id: "snap_it",
    title: "Picture Perfect",
    description: "Share a photo with your check-in",
    emoji: "📸",
    category: "activity",
    check: (s) => s.photosToday >= 1,
    target: 1,
    getCurrent: (s) => s.photosToday,
  },
  // Quality Challenges
  {
    id: "five_star",
    title: "Five Star Find",
    description: "Give a cigar a perfect 5-star rating",
    emoji: "⭐",
    category: "quality",
    check: (s) => s.fiveStarsToday >= 1,
    target: 1,
    getCurrent: (s) => s.fiveStarsToday,
  },
  // Exploration Challenges
  {
    id: "try_new",
    title: "The Explorer",
    description: "Try a brand you've never logged before",
    emoji: "🗺️",
    category: "explore",
    check: (s) => s.newBrandsToday >= 1,
    target: 1,
    getCurrent: (s) => s.newBrandsToday,
    minCheckins: 3, // Need some history first
  },
  {
    id: "variety",
    title: "Variety Show",
    description: "Log 2 different brands today",
    emoji: "🎨",
    category: "explore",
    check: (s) => s.uniqueBrandsToday >= 2,
    target: 2,
    getCurrent: (s) => s.uniqueBrandsToday,
  },
  // Flavor-based Challenges (dynamic)
  {
    id: "flavor_pepper",
    title: "Spice It Up",
    description: "Log a cigar with Pepper notes",
    emoji: "🌶️",
    category: "explore",
    check: (s) => (s.flavorCheckinsToday["pepper"] || 0) >= 1,
    target: 1,
    getCurrent: (s) => s.flavorCheckinsToday["pepper"] || 0,
    flavor: "pepper",
  },
  {
    id: "flavor_coffee",
    title: "Coffee Break",
    description: "Log a cigar with Coffee notes",
    emoji: "☕",
    category: "explore",
    check: (s) => (s.flavorCheckinsToday["coffee"] || 0) >= 1,
    target: 1,
    getCurrent: (s) => s.flavorCheckinsToday["coffee"] || 0,
    flavor: "coffee",
  },
  {
    id: "flavor_chocolate",
    title: "Sweet Tooth",
    description: "Log a cigar with Chocolate notes",
    emoji: "🍫",
    category: "explore",
    check: (s) => (s.flavorCheckinsToday["chocolate"] || 0) >= 1,
    target: 1,
    getCurrent: (s) => s.flavorCheckinsToday["chocolate"] || 0,
    flavor: "chocolate",
  },
  {
    id: "flavor_leather",
    title: "Classic Taste",
    description: "Log a cigar with Leather notes",
    emoji: "🪶",
    category: "explore",
    check: (s) => (s.flavorCheckinsToday["leather"] || 0) >= 1,
    target: 1,
    getCurrent: (s) => s.flavorCheckinsToday["leather"] || 0,
    flavor: "leather",
  },
  {
    id: "flavor_cedar",
    title: "Into the Woods",
    description: "Log a cigar with Cedar notes",
    emoji: "🌲",
    category: "explore",
    check: (s) => (s.flavorCheckinsToday["cedar"] || 0) >= 1,
    target: 1,
    getCurrent: (s) => s.flavorCheckinsToday["cedar"] || 0,
    flavor: "cedar",
  },
];

// Get deterministic daily challenge for user
function getDailyChallengeId(userId: string): string {
  const today = new Date().toISOString().split("T")[0];
  const combined = `${userId}-${today}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `${Math.abs(hash)}`;
}

// Pick challenge appropriate for user
function pickChallenge(challenges: Challenge[], seed: string, stats: DailyStats): Challenge {
  // Filter to eligible challenges
  const eligible = challenges.filter((c) => {
    if (c.minCheckins && stats.totalCheckins < c.minCheckins) return false;
    return true;
  });

  // Use seed to pick deterministically
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return eligible[Math.abs(hash) % eligible.length];
}

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

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
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const userId = session.user_id;
    
    // Get today's start (UTC)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;

    // Gather today's stats
    const [
      checkinsToday,
      photosToday,
      uniqueBrandsToday,
      fiveStarsToday,
      newBrandsToday,
      likesToday,
      commentsToday,
      reactionsToday,
      totalCheckins,
      uniqueBrands,
      following,
      flavorsToday,
    ] = await Promise.all([
      db.prepare(`SELECT COUNT(*) as c FROM checkins WHERE user_id = ? AND created_at >= ?`)
        .bind(userId, todayStart).first<{ c: number }>(),
      db.prepare(`SELECT COUNT(*) as c FROM checkins WHERE user_id = ? AND created_at >= ? AND image_url IS NOT NULL`)
        .bind(userId, todayStart).first<{ c: number }>(),
      db.prepare(`SELECT COUNT(DISTINCT brand) as c FROM checkins WHERE user_id = ? AND created_at >= ?`)
        .bind(userId, todayStart).first<{ c: number }>(),
      db.prepare(`SELECT COUNT(*) as c FROM checkins WHERE user_id = ? AND created_at >= ? AND rating = 5`)
        .bind(userId, todayStart).first<{ c: number }>(),
      db.prepare(`
        SELECT COUNT(*) as c FROM checkins WHERE user_id = ? AND created_at >= ?
        AND brand NOT IN (SELECT DISTINCT brand FROM checkins WHERE user_id = ? AND created_at < ?)
      `).bind(userId, todayStart, userId, todayStart).first<{ c: number }>(),
      db.prepare(`SELECT COUNT(*) as c FROM likes WHERE user_id = ? AND created_at >= ?`)
        .bind(userId, todayStart).first<{ c: number }>(),
      db.prepare(`SELECT COUNT(*) as c FROM comments WHERE user_id = ? AND created_at >= ?`)
        .bind(userId, todayStart).first<{ c: number }>(),
      db.prepare(`SELECT COUNT(*) as c FROM reactions WHERE user_id = ? AND created_at >= ?`)
        .bind(userId, todayStart).first<{ c: number }>(),
      db.prepare(`SELECT COUNT(*) as c FROM checkins WHERE user_id = ?`)
        .bind(userId).first<{ c: number }>(),
      db.prepare(`SELECT COUNT(DISTINCT brand) as c FROM checkins WHERE user_id = ?`)
        .bind(userId).first<{ c: number }>(),
      db.prepare(`SELECT COUNT(*) as c FROM follows WHERE follower_id = ?`)
        .bind(userId).first<{ c: number }>(),
      db.prepare(`SELECT flavors FROM checkins WHERE user_id = ? AND created_at >= ? AND flavors IS NOT NULL`)
        .bind(userId, todayStart).all<{ flavors: string }>(),
    ]);

    // Parse flavor checkins
    const flavorCheckinsToday: Record<string, number> = {};
    for (const row of flavorsToday.results || []) {
      if (row.flavors) {
        for (const f of row.flavors.split(",")) {
          const key = f.trim().toLowerCase();
          if (key) flavorCheckinsToday[key] = (flavorCheckinsToday[key] || 0) + 1;
        }
      }
    }

    const stats: DailyStats = {
      checkinsToday: checkinsToday?.c || 0,
      likesToday: likesToday?.c || 0,
      commentsToday: commentsToday?.c || 0,
      photosToday: photosToday?.c || 0,
      uniqueBrandsToday: uniqueBrandsToday?.c || 0,
      fiveStarsToday: fiveStarsToday?.c || 0,
      reactionsToday: reactionsToday?.c || 0,
      newBrandsToday: newBrandsToday?.c || 0,
      totalCheckins: totalCheckins?.c || 0,
      uniqueBrands: uniqueBrands?.c || 0,
      following: following?.c || 0,
      flavorCheckinsToday,
    };

    // Get today's challenge
    const seed = getDailyChallengeId(userId);
    const challenge = pickChallenge(CHALLENGES, seed, stats);
    
    const completed = challenge.check(stats);
    const current = challenge.getCurrent(stats);

    // Check if already completed today (for streak tracking)
    const completionKey = `challenge_${new Date().toISOString().split("T")[0]}`;

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        emoji: challenge.emoji,
        category: challenge.category,
      },
      progress: {
        current,
        target: challenge.target,
        completed,
        percent: Math.min(100, Math.round((current / challenge.target) * 100)),
      },
      refreshesAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString(),
      stats: {
        checkinsToday: stats.checkinsToday,
        likesToday: stats.likesToday,
        photosToday: stats.photosToday,
      },
    });
  } catch (error) {
    console.error("Daily challenge error:", error);
    return NextResponse.json({ error: "Failed to load challenge" }, { status: 500 });
  }
}
