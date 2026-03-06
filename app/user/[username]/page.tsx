import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import UserProfileClient from "./UserProfileClient";

export const runtime = "edge";

// Calculate taste match between two users
async function calculateTasteMatch(
  DB: D1Database,
  currentUserId: string,
  targetUserId: string
): Promise<TasteMatch | undefined> {
  try {
    // Get all check-ins for both users
    const [currentUserCheckins, targetUserCheckins] = await Promise.all([
      DB.prepare(`
        SELECT brand, rating, flavor_notes
        FROM checkins
        WHERE user_id = ?
      `).bind(currentUserId).all<{ brand: string; rating: number | null; flavor_notes: string | null }>(),
      
      DB.prepare(`
        SELECT brand, rating, flavor_notes
        FROM checkins
        WHERE user_id = ?
      `).bind(targetUserId).all<{ brand: string; rating: number | null; flavor_notes: string | null }>(),
    ]);

    const currentCheckins = currentUserCheckins.results || [];
    const targetCheckins = targetUserCheckins.results || [];

    // If either user has no check-ins, return undefined
    if (currentCheckins.length === 0 || targetCheckins.length === 0) {
      return undefined;
    }

    // Build brand sets and rating maps
    const currentBrands = new Set(currentCheckins.map(c => c.brand.toLowerCase()));
    const targetBrands = new Set(targetCheckins.map(c => c.brand.toLowerCase()));
    
    // Get average ratings per brand for each user
    const currentRatings = new Map<string, number[]>();
    const targetRatings = new Map<string, number[]>();
    
    for (const c of currentCheckins) {
      const brand = c.brand.toLowerCase();
      if (c.rating) {
        if (!currentRatings.has(brand)) currentRatings.set(brand, []);
        currentRatings.get(brand)!.push(c.rating);
      }
    }
    
    for (const c of targetCheckins) {
      const brand = c.brand.toLowerCase();
      if (c.rating) {
        if (!targetRatings.has(brand)) targetRatings.set(brand, []);
        targetRatings.get(brand)!.push(c.rating);
      }
    }

    // Calculate average rating per brand
    const avgRating = (ratings: number[]) => ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const currentAvgRatings = new Map<string, number>();
    const targetAvgRatings = new Map<string, number>();
    
    for (const [brand, ratings] of currentRatings) {
      currentAvgRatings.set(brand, avgRating(ratings));
    }
    for (const [brand, ratings] of targetRatings) {
      targetAvgRatings.set(brand, avgRating(ratings));
    }

    // Find common brands
    const commonBrandsList = [...currentBrands].filter(b => targetBrands.has(b));
    const totalUniqueBrands = new Set([...currentBrands, ...targetBrands]).size;

    // 1. Brand overlap score (0-40 points)
    const overlapRatio = commonBrandsList.length / Math.max(Math.min(currentBrands.size, targetBrands.size), 1);
    const brandScore = Math.round(overlapRatio * 40);

    // 2. Rating similarity score (0-40 points)
    let ratingScore = 0;
    let ratingCorrelation = 0;
    const ratingDiffs: number[] = [];
    
    for (const brand of commonBrandsList) {
      const currentRating = currentAvgRatings.get(brand);
      const targetRating = targetAvgRatings.get(brand);
      
      if (currentRating !== undefined && targetRating !== undefined) {
        const diff = Math.abs(currentRating - targetRating);
        ratingDiffs.push(diff);
      }
    }

    if (ratingDiffs.length > 0) {
      const avgDiff = ratingDiffs.reduce((a, b) => a + b, 0) / ratingDiffs.length;
      ratingScore = Math.round(Math.max(0, (4 - avgDiff) / 4 * 40));
      ratingCorrelation = Math.round(((4 - avgDiff) / 4 * 2 - 1) * 100) / 100;
    } else if (commonBrandsList.length > 0) {
      ratingScore = 20;
      ratingCorrelation = 0;
    }

    // 3. Flavor overlap score (0-20 points)
    const currentFlavors = new Set<string>();
    const targetFlavors = new Set<string>();
    
    for (const c of currentCheckins) {
      if (c.flavor_notes) {
        try {
          const flavors = JSON.parse(c.flavor_notes) as string[];
          flavors.forEach(f => currentFlavors.add(f));
        } catch {}
      }
    }
    
    for (const c of targetCheckins) {
      if (c.flavor_notes) {
        try {
          const flavors = JSON.parse(c.flavor_notes) as string[];
          flavors.forEach(f => targetFlavors.add(f));
        } catch {}
      }
    }

    const sharedFlavors = [...currentFlavors].filter(f => targetFlavors.has(f));
    const totalFlavors = new Set([...currentFlavors, ...targetFlavors]).size;
    
    let flavorScore = 0;
    if (totalFlavors > 0) {
      const flavorOverlapRatio = sharedFlavors.length / Math.max(Math.min(currentFlavors.size, targetFlavors.size), 1);
      flavorScore = Math.round(flavorOverlapRatio * 20);
    } else {
      flavorScore = 10;
    }

    // Total score
    const totalScore = brandScore + ratingScore + flavorScore;

    // Match level
    let matchLevel: TasteMatch['matchLevel'];
    if (totalScore >= 85) matchLevel = 'soulmate';
    else if (totalScore >= 65) matchLevel = 'great';
    else if (totalScore >= 40) matchLevel = 'good';
    else if (totalScore >= 20) matchLevel = 'different';
    else matchLevel = 'opposite';

    return {
      score: totalScore,
      commonBrands: commonBrandsList.length,
      totalBrands: totalUniqueBrands,
      ratingCorrelation,
      sharedFlavors,
      matchLevel,
      details: {
        brandScore,
        ratingScore,
        flavorScore,
      },
    };
  } catch (error) {
    console.error("Taste match calculation error:", error);
    return undefined;
  }
}

interface TasteMatch {
  score: number;
  commonBrands: number;
  totalBrands: number;
  ratingCorrelation: number;
  sharedFlavors: string[];
  matchLevel: 'soulmate' | 'great' | 'good' | 'different' | 'opposite';
  details: {
    brandScore: number;
    ratingScore: number;
    flavorScore: number;
  };
  noData?: boolean;
}

interface WishlistItem {
  id: string;
  brand: string;
  created_at: number;
}

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
  wishlist: WishlistItem[];
  isFollowing: boolean;
  isOwnProfile: boolean;
  topBrand?: string;
  commonBrands?: string[];
  tasteMatch?: TasteMatch;
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

  // Calculate badges dynamically based on user stats (no user_badges table needed)
  const [
    fiveStarResult,
    reviewsResult,
    photosResult,
    likesGivenResult,
    commentsGivenResult,
  ] = await Promise.all([
    DB.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND rating = 5").bind(userRow.id).first<{ count: number }>(),
    DB.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND review IS NOT NULL AND review != ''").bind(userRow.id).first<{ count: number }>(),
    DB.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND image_url IS NOT NULL").bind(userRow.id).first<{ count: number }>(),
    DB.prepare("SELECT COUNT(*) as count FROM likes WHERE user_id = ?").bind(userRow.id).first<{ count: number }>(),
    DB.prepare("SELECT COUNT(*) as count FROM comments WHERE user_id = ?").bind(userRow.id).first<{ count: number }>(),
  ]);

  const totalCheckins = statsRow?.total_checkins || 0;
  const uniqueBrands = statsRow?.unique_brands || 0;
  const followingCountNum = followingCount?.count || 0;

  // Badge definitions with dynamic checks
  const allBadges = [
    { id: 'first_smoke', name: 'First Smoke', emoji: '🚬', description: 'Log your first smoke', earned: totalCheckins >= 1 },
    { id: 'getting_started', name: 'Getting Started', emoji: '🌟', description: 'Log 5 smokes', earned: totalCheckins >= 5 },
    { id: 'regular', name: 'Regular', emoji: '🔥', description: 'Log 10 smokes', earned: totalCheckins >= 10 },
    { id: 'aficionado', name: 'Aficionado', emoji: '👑', description: 'Log 25 smokes', earned: totalCheckins >= 25 },
    { id: 'legend', name: 'Legend', emoji: '🏆', description: 'Log 50 smokes', earned: totalCheckins >= 50 },
    { id: 'five_star', name: 'Five Star', emoji: '⭐', description: 'Give a perfect 5-star rating', earned: (fiveStarResult?.count || 0) >= 1 },
    { id: 'critic', name: 'Critic', emoji: '📝', description: 'Write 5 reviews', earned: (reviewsResult?.count || 0) >= 5 },
    { id: 'photographer', name: 'Photographer', emoji: '📸', description: 'Upload 5 photos', earned: (photosResult?.count || 0) >= 5 },
    { id: 'first_love', name: 'First Love', emoji: '❤️', description: 'Like your first check-in', earned: (likesGivenResult?.count || 0) >= 1 },
    { id: 'socialite', name: 'Socialite', emoji: '🤝', description: 'Follow 5 people', earned: followingCountNum >= 5 },
    { id: 'commentator', name: 'Commentator', emoji: '💬', description: 'Leave 5 comments', earned: (commentsGivenResult?.count || 0) >= 5 },
    { id: 'explorer', name: 'Explorer', emoji: '🗺️', description: 'Try 10 different brands', earned: uniqueBrands >= 10 },
  ];

  const badges = allBadges.filter(b => b.earned);

  // Wishlist feature not implemented yet - return empty array
  const wishlist: WishlistItem[] = [];

  // Get common brands if viewing another user's profile
  let commonBrands: string[] = [];
  let tasteMatch: TasteMatch | undefined;
  
  if (currentUserId && !isOwnProfile) {
    const commonResult = await DB.prepare(`
      SELECT DISTINCT c1.brand
      FROM checkins c1
      WHERE c1.user_id = ?
        AND c1.brand IN (SELECT DISTINCT brand FROM checkins WHERE user_id = ?)
      ORDER BY c1.brand
      LIMIT 10
    `).bind(userRow.id, currentUserId).all<{ brand: string }>();
    commonBrands = (commonResult.results || []).map(r => r.brand);

    // Calculate taste match score
    tasteMatch = await calculateTasteMatch(DB, currentUserId, userRow.id);
  }

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
    wishlist,
    isFollowing,
    isOwnProfile,
    topBrand: topBrandRow?.brand,
    commonBrands: commonBrands.length > 0 ? commonBrands : undefined,
    tasteMatch,
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
