import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";
import type { Badge } from "@/lib/types";

export const runtime = "edge";

// Badge definitions (shared with /api/badges)
interface UserBadgeStats {
  checkins: number;
  ratedCheckins: number;
  fiveStarRatings: number;
  photosUploaded: number;
  uniqueBrands: number;
  likesGiven: number;
  following: number;
  commentsGiven: number;
}

const BADGE_DEFINITIONS = [
  { id: "first_smoke", name: "First Smoke", emoji: "🌱", check: (s: UserBadgeStats) => s.checkins >= 1 },
  { id: "getting_started", name: "Getting Started", emoji: "🔥", check: (s: UserBadgeStats) => s.checkins >= 5 },
  { id: "regular", name: "Regular", emoji: "💨", check: (s: UserBadgeStats) => s.checkins >= 10 },
  { id: "aficionado", name: "Aficionado", emoji: "👑", check: (s: UserBadgeStats) => s.checkins >= 25 },
  { id: "legend", name: "Legend", emoji: "🏆", check: (s: UserBadgeStats) => s.checkins >= 50 },
  { id: "five_star", name: "Five Star", emoji: "⭐", check: (s: UserBadgeStats) => s.fiveStarRatings >= 1 },
  { id: "critic", name: "Critic", emoji: "🎯", check: (s: UserBadgeStats) => s.ratedCheckins >= 5 },
  { id: "photographer", name: "Photographer", emoji: "📸", check: (s: UserBadgeStats) => s.photosUploaded >= 3 },
  { id: "first_love", name: "First Love", emoji: "❤️", check: (s: UserBadgeStats) => s.likesGiven >= 1 },
  { id: "socialite", name: "Socialite", emoji: "👥", check: (s: UserBadgeStats) => s.following >= 3 },
  { id: "commentator", name: "Commentator", emoji: "💬", check: (s: UserBadgeStats) => s.commentsGiven >= 5 },
  { id: "explorer", name: "Explorer", emoji: "🗺️", check: (s: UserBadgeStats) => s.uniqueBrands >= 5 },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const { env } = getRequestContext();
    const db = env.DB;

    // Get current user if logged in
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);
    let currentUserId: string | null = null;

    if (sessionId) {
      const now = Math.floor(Date.now() / 1000);
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
        .bind(sessionId, now)
        .first<{ user_id: string }>();
      if (session) {
        currentUserId = session.user_id;
      }
    }

    // Get user
    const user = await db
      .prepare("SELECT id, username, bio, created_at FROM users WHERE username = ?")
      .bind(username.toLowerCase())
      .first<{ id: string; username: string; bio: string | null; created_at: number }>();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's check-ins with like counts
    const checkins = await db
      .prepare(`
        SELECT c.*, 
          (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count
        FROM checkins c
        WHERE c.user_id = ?
        ORDER BY c.created_at DESC
        LIMIT 50
      `)
      .bind(user.id)
      .all();

    // Get stats
    const stats = await db
      .prepare(`
        SELECT 
          COUNT(*) as total_checkins,
          AVG(rating) as avg_rating,
          COUNT(DISTINCT brand) as unique_brands
        FROM checkins 
        WHERE user_id = ?
      `)
      .bind(user.id)
      .first<{ total_checkins: number; avg_rating: number; unique_brands: number }>();

    // Get follow counts
    const followCounts = await db
      .prepare(`
        SELECT 
          (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following,
          (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followers
      `)
      .bind(user.id, user.id)
      .first<{ following: number; followers: number }>();

    // Check if current user is following this user
    let isFollowing = false;
    let isOwnProfile = false;
    if (currentUserId) {
      isOwnProfile = currentUserId === user.id;
      if (!isOwnProfile) {
        const follow = await db
          .prepare("SELECT id FROM follows WHERE follower_id = ? AND following_id = ?")
          .bind(currentUserId, user.id)
          .first();
        isFollowing = !!follow;
      }
    }

    // Calculate badges for this user
    const [
      ratedResult,
      fiveStarResult,
      photosResult,
      likesResult,
      commentsResult,
    ] = await Promise.all([
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND rating IS NOT NULL").bind(user.id).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND rating = 5").bind(user.id).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND image_url IS NOT NULL").bind(user.id).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM likes WHERE user_id = ?").bind(user.id).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM comments WHERE user_id = ?").bind(user.id).first<{ count: number }>(),
    ]);

    const badgeStats: UserBadgeStats = {
      checkins: stats?.total_checkins || 0,
      ratedCheckins: ratedResult?.count || 0,
      fiveStarRatings: fiveStarResult?.count || 0,
      photosUploaded: photosResult?.count || 0,
      uniqueBrands: stats?.unique_brands || 0,
      likesGiven: likesResult?.count || 0,
      following: followCounts?.following || 0,
      commentsGiven: commentsResult?.count || 0,
    };

    const earnedBadges: Badge[] = BADGE_DEFINITIONS
      .filter(def => def.check(badgeStats))
      .map(def => ({
        id: def.id,
        name: def.name,
        emoji: def.emoji,
        description: "",
        earned: true,
      }));

    return NextResponse.json({
      user: {
        username: user.username,
        bio: user.bio,
        joinedAt: user.created_at,
      },
      stats: {
        totalCheckins: stats?.total_checkins || 0,
        avgRating: stats?.avg_rating ? Number(stats.avg_rating.toFixed(1)) : 0,
        uniqueBrands: stats?.unique_brands || 0,
        following: followCounts?.following || 0,
        followers: followCounts?.followers || 0,
      },
      isFollowing,
      isOwnProfile,
      checkins: checkins.results,
      badges: earnedBadges,
    });
  } catch (error) {
    console.error("User profile error:", error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
