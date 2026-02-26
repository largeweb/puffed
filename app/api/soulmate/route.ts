import { D1Database } from '@cloudflare/workers-types';
import { getSession } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface Env {
  DB: D1Database;
}

interface UserRating {
  brand: string;
  rating: number;
}

interface SoulmateMatch {
  id: string;
  username: string;
  avatar_url: string | null;
  checkin_count: number;
  compatibility: number;
  sharedBrands: string[];
  ratingDiff: number;
  isFollowing: boolean;
}

interface SoulmateData {
  soulmates: SoulmateMatch[];
  yourTopBrands: string[];
  totalUsersCompared: number;
  personalStats: {
    uniqueBrands: number;
    avgRating: number;
    totalCheckins: number;
  } | null;
}

export async function GET(request: NextRequest) {
  const env = (process.env as unknown) as Env;
  const session = await getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get current user's brand ratings
    const userRatings = await env.DB.prepare(`
      SELECT brand, AVG(rating) as avg_rating, COUNT(*) as count
      FROM checkins
      WHERE user_id = ?
      GROUP BY brand
      ORDER BY count DESC
    `).bind(userId).all<{ brand: string; avg_rating: number; count: number }>();

    if (!userRatings.results || userRatings.results.length === 0) {
      return NextResponse.json({
        soulmates: [],
        yourTopBrands: [],
        totalUsersCompared: 0,
        personalStats: null,
        message: 'Log some smokes to find your cigar soulmates!'
      });
    }

    const userBrandMap = new Map<string, number>();
    userRatings.results.forEach(r => userBrandMap.set(r.brand.toLowerCase(), r.avg_rating));
    const topBrands = userRatings.results.slice(0, 5).map(r => r.brand);

    // Get user's personal stats
    const personalStatsResult = await env.DB.prepare(`
      SELECT 
        COUNT(DISTINCT brand) as unique_brands,
        AVG(rating) as avg_rating,
        COUNT(*) as total_checkins
      FROM checkins
      WHERE user_id = ?
    `).bind(userId).first<{ unique_brands: number; avg_rating: number; total_checkins: number }>();

    // Get all other users with their ratings
    const otherUsers = await env.DB.prepare(`
      SELECT 
        u.id,
        u.username,
        u.avatar_url,
        COUNT(c.id) as checkin_count,
        GROUP_CONCAT(c.brand || ':' || c.rating) as ratings_data
      FROM users u
      JOIN checkins c ON u.id = c.user_id
      WHERE u.id != ?
      GROUP BY u.id
      HAVING checkin_count >= 1
    `).bind(userId).all<{
      id: string;
      username: string;
      avatar_url: string | null;
      checkin_count: number;
      ratings_data: string;
    }>();

    // Check who the user is following
    const followingResult = await env.DB.prepare(`
      SELECT following_id FROM follows WHERE follower_id = ?
    `).bind(userId).all<{ following_id: string }>();

    const followingSet = new Set((followingResult.results || []).map(f => f.following_id));

    // Calculate compatibility scores
    const soulmates: SoulmateMatch[] = [];

    for (const user of otherUsers.results || []) {
      if (!user.ratings_data) continue;

      // Parse their ratings
      const theirBrandMap = new Map<string, { sum: number; count: number }>();
      user.ratings_data.split(',').forEach(entry => {
        const [brand, rating] = entry.split(':');
        if (brand && rating) {
          const key = brand.toLowerCase();
          const existing = theirBrandMap.get(key) || { sum: 0, count: 0 };
          theirBrandMap.set(key, {
            sum: existing.sum + parseFloat(rating),
            count: existing.count + 1
          });
        }
      });

      // Find shared brands and calculate compatibility
      const sharedBrands: string[] = [];
      let totalDiff = 0;
      let comparisons = 0;

      for (const [brand, myRating] of userBrandMap.entries()) {
        const theirData = theirBrandMap.get(brand);
        if (theirData) {
          const theirAvg = theirData.sum / theirData.count;
          const diff = Math.abs(myRating - theirAvg);
          totalDiff += diff;
          comparisons++;
          // Capitalize brand name for display
          sharedBrands.push(brand.charAt(0).toUpperCase() + brand.slice(1));
        }
      }

      if (comparisons === 0) continue;

      // Compatibility: higher is better (inverse of rating difference)
      // Max difference per brand is 5 (5-star scale), so normalize
      const avgDiff = totalDiff / comparisons;
      const compatibility = Math.round((1 - avgDiff / 5) * 100);

      if (compatibility >= 50) { // Only show matches >= 50%
        soulmates.push({
          id: user.id,
          username: user.username,
          avatar_url: user.avatar_url,
          checkin_count: user.checkin_count,
          compatibility,
          sharedBrands: sharedBrands.slice(0, 5),
          ratingDiff: Math.round(avgDiff * 10) / 10,
          isFollowing: followingSet.has(user.id)
        });
      }
    }

    // Sort by compatibility (highest first)
    soulmates.sort((a, b) => b.compatibility - a.compatibility);

    return NextResponse.json({
      soulmates: soulmates.slice(0, 10),
      yourTopBrands: topBrands,
      totalUsersCompared: (otherUsers.results || []).length,
      personalStats: personalStatsResult ? {
        uniqueBrands: personalStatsResult.unique_brands,
        avgRating: Math.round(personalStatsResult.avg_rating * 10) / 10,
        totalCheckins: personalStatsResult.total_checkins
      } : null
    } as SoulmateData);
  } catch (error) {
    console.error('Soulmate error:', error);
    return NextResponse.json({ error: 'Failed to find soulmates' }, { status: 500 });
  }
}
