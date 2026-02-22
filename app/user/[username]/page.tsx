import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import UserProfileClient from "./UserProfileClient";

export const runtime = "edge";

interface UserProfileData {
  user: {
    id: string;
    username: string;
    bio: string | null;
    joinedAt: number;
  };
  stats: {
    totalCheckins: number;
    avgRating: number;
    uniqueBrands: number;
    following: number;
    followers: number;
  };
  checkins: Array<{
    id: string;
    user_id: string;
    brand: string;
    product?: string;
    rating?: number;
    review?: string;
    flavor_notes?: string;
    image_url?: string;
    created_at: number;
    like_count: number;
  }>;
  badges: Array<{
    id: string;
    name: string;
    emoji: string;
    description: string;
    earned: boolean;
  }>;
  isFollowing: boolean;
  isOwnProfile: boolean;
  topBrand?: string;
}

async function getUserProfile(username: string): Promise<UserProfileData | null> {
  const { env } = getRequestContext();
  const DB = env.DB;

  // Get user
  const userRow = await DB.prepare(`
    SELECT id, username, bio, created_at as joined_at
    FROM users
    WHERE LOWER(username) = LOWER(?)
  `).bind(username).first<{
    id: string;
    username: string;
    bio: string | null;
    joined_at: number;
  }>();

  if (!userRow) return null;

  // Get current user if logged in
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  let currentUserId: string | null = null;
  let isOwnProfile = false;
  let isFollowing = false;

  if (session) {
    const sessionRow = await DB.prepare(
      "SELECT user_id FROM sessions WHERE id = ?"
    ).bind(session).first<{ user_id: string }>();
    currentUserId = sessionRow?.user_id || null;
    isOwnProfile = currentUserId === userRow.id;

    if (currentUserId && !isOwnProfile) {
      const followRow = await DB.prepare(
        "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?"
      ).bind(currentUserId, userRow.id).first();
      isFollowing = !!followRow;
    }
  }

  // Get stats
  const statsRow = await DB.prepare(`
    SELECT 
      COUNT(*) as total_checkins,
      AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating,
      COUNT(DISTINCT brand) as unique_brands
    FROM checkins
    WHERE user_id = ?
  `).bind(userRow.id).first<{
    total_checkins: number;
    avg_rating: number | null;
    unique_brands: number;
  }>();

  const followingCount = await DB.prepare(
    "SELECT COUNT(*) as count FROM follows WHERE follower_id = ?"
  ).bind(userRow.id).first<{ count: number }>();

  const followerCount = await DB.prepare(
    "SELECT COUNT(*) as count FROM follows WHERE following_id = ?"
  ).bind(userRow.id).first<{ count: number }>();

  // Get top brand
  const topBrandRow = await DB.prepare(`
    SELECT brand, COUNT(*) as count
    FROM checkins
    WHERE user_id = ?
    GROUP BY brand
    ORDER BY count DESC
    LIMIT 1
  `).bind(userRow.id).first<{ brand: string; count: number }>();

  // Get check-ins
  const checkinsResult = await DB.prepare(`
    SELECT 
      c.id,
      c.user_id,
      c.brand,
      c.product,
      c.rating,
      c.review,
      c.flavor_notes,
      c.image_url,
      c.created_at,
      (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count
    FROM checkins c
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
    LIMIT 20
  `).bind(userRow.id).all<{
    id: string;
    user_id: string;
    brand: string;
    product: string | null;
    rating: number | null;
    review: string | null;
    flavor_notes: string | null;
    image_url: string | null;
    created_at: number;
    like_count: number;
  }>();

  // Get earned badges
  const badgesResult = await DB.prepare(`
    SELECT badge_id as id
    FROM user_badges
    WHERE user_id = ?
  `).bind(userRow.id).all<{ id: string }>();

  const earnedBadgeIds = new Set((badgesResult.results || []).map(b => b.id));

  // Badge definitions
  const allBadges = [
    { id: 'first_smoke', name: 'First Smoke', emoji: '🚬', description: 'Log your first smoke' },
    { id: 'getting_started', name: 'Getting Started', emoji: '🌟', description: 'Log 5 smokes' },
    { id: 'regular', name: 'Regular', emoji: '🔥', description: 'Log 10 smokes' },
    { id: 'aficionado', name: 'Aficionado', emoji: '👑', description: 'Log 25 smokes' },
    { id: 'legend', name: 'Legend', emoji: '🏆', description: 'Log 50 smokes' },
    { id: 'five_star', name: 'Five Star', emoji: '⭐', description: 'Give a perfect 5-star rating' },
    { id: 'critic', name: 'Critic', emoji: '📝', description: 'Write 5 reviews' },
    { id: 'photographer', name: 'Photographer', emoji: '📸', description: 'Upload 5 photos' },
    { id: 'first_love', name: 'First Love', emoji: '❤️', description: 'Like your first check-in' },
    { id: 'socialite', name: 'Socialite', emoji: '🤝', description: 'Follow 5 people' },
    { id: 'commentator', name: 'Commentator', emoji: '💬', description: 'Leave 5 comments' },
    { id: 'explorer', name: 'Explorer', emoji: '🗺️', description: 'Try 10 different brands' },
  ];

  const badges = allBadges
    .filter(b => earnedBadgeIds.has(b.id))
    .map(b => ({ ...b, earned: true }));

  return {
    user: {
      id: userRow.id,
      username: userRow.username,
      bio: userRow.bio,
      joinedAt: userRow.joined_at,
    },
    stats: {
      totalCheckins: statsRow?.total_checkins || 0,
      avgRating: statsRow?.avg_rating ? Math.round(statsRow.avg_rating * 10) / 10 : 0,
      uniqueBrands: statsRow?.unique_brands || 0,
      following: followingCount?.count || 0,
      followers: followerCount?.count || 0,
    },
    checkins: (checkinsResult.results || []).map(c => ({
      id: c.id,
      user_id: c.user_id,
      brand: c.brand,
      product: c.product || undefined,
      rating: c.rating || undefined,
      review: c.review || undefined,
      flavor_notes: c.flavor_notes || undefined,
      image_url: c.image_url || undefined,
      created_at: c.created_at,
      like_count: c.like_count,
    })),
    badges,
    isFollowing,
    isOwnProfile,
    topBrand: topBrandRow?.brand,
  };
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ username: string }> 
}): Promise<Metadata> {
  const { username } = await params;
  
  try {
    const { env } = getRequestContext();
    const DB = env.DB;
    
    // Get basic user info for OG tags
    const userRow = await DB.prepare(`
      SELECT id, username, bio
      FROM users
      WHERE LOWER(username) = LOWER(?)
    `).bind(username).first<{
      id: string;
      username: string;
      bio: string | null;
    }>();

    if (!userRow) {
      return {
        title: "User Not Found - Puffed",
      };
    }

    // Get stats
    const statsRow = await DB.prepare(`
      SELECT 
        COUNT(*) as total_checkins,
        AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating,
        COUNT(DISTINCT brand) as unique_brands
      FROM checkins
      WHERE user_id = ?
    `).bind(userRow.id).first<{
      total_checkins: number;
      avg_rating: number | null;
      unique_brands: number;
    }>();

    const followerCount = await DB.prepare(
      "SELECT COUNT(*) as count FROM follows WHERE following_id = ?"
    ).bind(userRow.id).first<{ count: number }>();

    const topBrand = await DB.prepare(`
      SELECT brand FROM checkins WHERE user_id = ? GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1
    `).bind(userRow.id).first<{ brand: string }>();

    // Build description
    const checkins = statsRow?.total_checkins || 0;
    const avgRating = statsRow?.avg_rating ? `${statsRow.avg_rating.toFixed(1)}/5 avg` : "";
    const brands = statsRow?.unique_brands || 0;
    const followers = followerCount?.count || 0;

    let description = `@${userRow.username} on Puffed`;
    if (checkins > 0) {
      description += ` • ${checkins} smoke${checkins !== 1 ? 's' : ''} logged`;
      if (brands > 1) description += ` • ${brands} brands explored`;
      if (avgRating) description += ` • ${avgRating}`;
    }
    if (followers > 0) {
      description += ` • ${followers} follower${followers !== 1 ? 's' : ''}`;
    }
    if (topBrand?.brand) {
      description += ` • Favorite: ${topBrand.brand}`;
    }
    if (userRow.bio) {
      description = `${userRow.bio.slice(0, 100)}${userRow.bio.length > 100 ? '...' : ''} — ${description}`;
    }

    // Get recent check-in image for OG if available
    const recentImage = await DB.prepare(`
      SELECT image_url FROM checkins WHERE user_id = ? AND image_url IS NOT NULL ORDER BY created_at DESC LIMIT 1
    `).bind(userRow.id).first<{ image_url: string }>();

    const title = `@${userRow.username} 🚬 Puffed`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "profile",
        siteName: "Puffed",
        images: recentImage?.image_url ? [{ url: recentImage.image_url }] : undefined,
      },
      twitter: {
        card: recentImage?.image_url ? "summary_large_image" : "summary",
        title,
        description,
        images: recentImage?.image_url ? [recentImage.image_url] : undefined,
      },
    };
  } catch (error) {
    console.error("generateMetadata error:", error);
    return {
      title: "Puffed - Track Your Smoke",
    };
  }
}

export default async function UserProfilePage({ 
  params 
}: { 
  params: Promise<{ username: string }> 
}) {
  const { username } = await params;
  const data = await getUserProfile(username);

  if (!data) {
    notFound();
  }

  return <UserProfileClient initialData={data} />;
}
