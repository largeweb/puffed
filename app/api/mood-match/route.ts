import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mood = searchParams.get('mood');

    if (!mood) {
      return NextResponse.json({ error: 'Mood parameter required' }, { status: 400 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get cigars that people smoke when in this mood
    // Returns brands with avg rating, check-in count, and sample reviews
    const result = await db.prepare(`
      SELECT 
        c.brand,
        COUNT(*) as mood_count,
        AVG(c.rating) as avg_rating,
        COUNT(DISTINCT c.user_id) as unique_smokers,
        MAX(c.review) as sample_review,
        MAX(c.image_url) as sample_image,
        GROUP_CONCAT(DISTINCT c.product) as products,
        GROUP_CONCAT(DISTINCT c.flavors) as all_flavors
      FROM checkins c
      WHERE c.mood = ?
        AND c.rating >= 3
      GROUP BY c.brand
      ORDER BY mood_count DESC, avg_rating DESC
      LIMIT 10
    `).bind(mood).all();

    // Get mood-specific stats
    const statsResult = await db.prepare(`
      SELECT 
        COUNT(*) as total_mood_checkins,
        AVG(rating) as avg_mood_rating,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT brand) as unique_brands
      FROM checkins
      WHERE mood = ?
    `).bind(mood).first();

    // Get recent check-ins with this mood for social proof
    const recentResult = await db.prepare(`
      SELECT 
        c.brand,
        c.rating,
        c.review,
        c.image_url,
        u.username,
        c.created_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.mood = ?
      ORDER BY c.created_at DESC
      LIMIT 5
    `).bind(mood).all();

    // Get top-rated 5-star experiences for this mood
    const topRatedResult = await db.prepare(`
      SELECT 
        c.brand,
        c.product,
        c.rating,
        c.review,
        c.image_url,
        u.username,
        c.created_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.mood = ? AND c.rating = 5
      ORDER BY c.created_at DESC
      LIMIT 3
    `).bind(mood).all();

    const matches = (result.results as Record<string, unknown>[]).map((row) => ({
      brand: row.brand as string,
      moodCount: row.mood_count as number,
      avgRating: row.avg_rating ? Number((row.avg_rating as number).toFixed(1)) : null,
      uniqueSmokers: row.unique_smokers as number,
      sampleReview: row.sample_review as string | null,
      sampleImage: row.sample_image as string | null,
      products: row.products ? (row.products as string).split(',').filter(Boolean).slice(0, 3) : [],
      flavors: row.all_flavors ? [...new Set((row.all_flavors as string).split(',').filter(Boolean))].slice(0, 5) : [],
    }));

    const stats = statsResult ? {
      totalCheckins: statsResult.total_mood_checkins as number,
      avgRating: statsResult.avg_mood_rating ? Number((statsResult.avg_mood_rating as number).toFixed(1)) : null,
      uniqueUsers: statsResult.unique_users as number,
      uniqueBrands: statsResult.unique_brands as number,
    } : null;

    const recent = (recentResult.results as Record<string, unknown>[]).map((row) => ({
      brand: row.brand as string,
      rating: row.rating as number,
      review: row.review as string | null,
      imageUrl: row.image_url as string | null,
      username: row.username as string,
      createdAt: row.created_at as number,
    }));

    const topRated = (topRatedResult.results as Record<string, unknown>[]).map((row) => ({
      brand: row.brand as string,
      product: row.product as string | null,
      rating: row.rating as number,
      review: row.review as string | null,
      imageUrl: row.image_url as string | null,
      username: row.username as string,
      createdAt: row.created_at as number,
    }));

    return NextResponse.json({
      mood,
      matches,
      stats,
      recent,
      topRated,
    });
  } catch (error) {
    console.error('Mood match error:', error);
    return NextResponse.json({ error: 'Failed to get mood matches' }, { status: 500 });
  }
}
