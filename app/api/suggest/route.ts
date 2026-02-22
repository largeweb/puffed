import { NextRequest, NextResponse } from 'next/server';
import { parseSessionCookie } from '@/lib/auth';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

interface BrandSuggestion {
  brand: string;
  smoker_count?: number;
  avg_rating?: number;
  checkin_count?: number;
  sample_image?: string;
  rating?: number;
  image_url?: string;
}

// "What Should I Smoke?" suggestion engine
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Check session validity
    const sessionRow = await db.prepare(
      "SELECT user_id FROM sessions WHERE id = ? AND expires_at > unixepoch()"
    ).bind(sessionId).first<{ user_id: string }>();

    if (!sessionRow) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const userId = sessionRow.user_id;

    // Get brands the user has already smoked
    const myBrands = await db.prepare(`
      SELECT DISTINCT LOWER(brand) as brand FROM checkins WHERE user_id = ?
    `).bind(userId).all<{ brand: string }>();
    const myBrandSet = new Set((myBrands.results || []).map(r => r.brand));

    // Strategy 1: Brands your follows love that you haven't tried
    const followSuggestions = await db.prepare(`
      SELECT 
        c.brand,
        COUNT(DISTINCT c.user_id) as smoker_count,
        ROUND(AVG(c.rating), 1) as avg_rating,
        COUNT(*) as checkin_count,
        MAX(c.image_url) as sample_image
      FROM checkins c
      JOIN follows f ON c.user_id = f.following_id
      WHERE f.follower_id = ?
        AND c.rating >= 4
      GROUP BY LOWER(c.brand)
      HAVING checkin_count >= 1
      ORDER BY avg_rating DESC, smoker_count DESC
      LIMIT 20
    `).bind(userId).all<BrandSuggestion>();

    const followRecs = (followSuggestions.results || [])
      .filter(r => !myBrandSet.has(r.brand.toLowerCase()))
      .slice(0, 3);

    // Strategy 2: Top rated brands on the platform you haven't tried
    const topRated = await db.prepare(`
      SELECT 
        brand,
        COUNT(*) as checkin_count,
        ROUND(AVG(rating), 1) as avg_rating,
        COUNT(DISTINCT user_id) as smoker_count,
        MAX(image_url) as sample_image
      FROM checkins
      WHERE rating >= 4
      GROUP BY LOWER(brand)
      HAVING checkin_count >= 1
      ORDER BY avg_rating DESC, checkin_count DESC
      LIMIT 20
    `).bind().all<BrandSuggestion>();

    const topRatedRecs = (topRated.results || [])
      .filter(r => !myBrandSet.has(r.brand.toLowerCase()))
      .slice(0, 3);

    // Strategy 3: Something from user's wishlist (if exists)
    let wishlistRec: BrandSuggestion | null = null;
    try {
      const wishlistItem = await db.prepare(`
        SELECT brand FROM wishlists 
        WHERE user_id = ? AND completed = 0 
        ORDER BY RANDOM() 
        LIMIT 1
      `).bind(userId).first<{ brand: string }>();
      wishlistRec = wishlistItem || null;
    } catch {
      // Wishlist table might not exist
    }

    // Strategy 4: Random favorite (high-rated smoke from user's history)
    const myFavorite = await db.prepare(`
      SELECT brand, rating, image_url
      FROM checkins
      WHERE user_id = ? AND rating >= 4
      ORDER BY RANDOM()
      LIMIT 1
    `).bind(userId).first<BrandSuggestion>();

    const favoriteRec = myFavorite || null;

    // Pick the main suggestion
    let mainSuggestion: BrandSuggestion | null = null;
    let suggestionType = '';

    if (followRecs.length > 0) {
      // Random from follows' favorites
      mainSuggestion = followRecs[Math.floor(Math.random() * followRecs.length)];
      suggestionType = 'follows';
    } else if (topRatedRecs.length > 0) {
      // Random from top rated
      mainSuggestion = topRatedRecs[Math.floor(Math.random() * topRatedRecs.length)];
      suggestionType = 'top_rated';
    } else if (wishlistRec) {
      mainSuggestion = wishlistRec;
      suggestionType = 'wishlist';
    } else if (favoriteRec) {
      mainSuggestion = favoriteRec;
      suggestionType = 'revisit';
    }

    // Get total stats
    const userStats = await db.prepare(`
      SELECT COUNT(DISTINCT brand) as brands_tried FROM checkins WHERE user_id = ?
    `).bind(userId).first<{ brands_tried: number }>();

    return NextResponse.json({
      suggestion: mainSuggestion,
      suggestionType,
      alternatives: {
        fromFollows: followRecs,
        topRated: topRatedRecs,
        wishlist: wishlistRec,
        revisitFavorite: favoriteRec
      },
      stats: {
        brandsTried: userStats?.brands_tried || 0,
        totalBrands: myBrandSet.size
      }
    });
  } catch (error) {
    console.error('Suggest error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
