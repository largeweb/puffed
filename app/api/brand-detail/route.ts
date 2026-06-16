import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

interface CheckinRow {
  id: string;
  user_id: string;
  username: string;
  brand: string;
  product: string | null;
  rating: number | null;
  review: string | null;
  image_url: string | null;
  flavor_notes: string | null;
  category: string | null;
  created_at: number;
}

interface FlavorCountRow {
  flavor: string;
  count: number;
}

interface FanRow {
  user_id: string;
  username: string;
  checkin_count: number;
  avg_rating: number | null;
}

interface StatsRow {
  total_checkins: number;
  unique_smokers: number;
  avg_rating: number | null;
  first_checkin: number | null;
}

// GET /api/brand-detail?brand=BrandName&limit=20
export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const { searchParams } = new URL(request.url);
  
  const brand = searchParams.get("brand")?.trim();
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  
  if (!brand) {
    return NextResponse.json({ error: "Brand parameter required" }, { status: 400 });
  }
  
  try {
    // Get brand stats
    const statsResult = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total_checkins,
        COUNT(DISTINCT user_id) as unique_smokers,
        AVG(rating) as avg_rating,
        MIN(created_at) as first_checkin
      FROM checkins
      WHERE LOWER(brand) = LOWER(?)
    `).bind(brand).first() as StatsRow | null;
    
    const stats = {
      totalCheckins: statsResult?.total_checkins || 0,
      uniqueSmokers: statsResult?.unique_smokers || 0,
      avgRating: statsResult?.avg_rating ? Math.round(statsResult.avg_rating * 10) / 10 : null,
      firstCheckin: statsResult?.first_checkin || null,
    };
    
    // Get recent check-ins
    const checkinsResult = await env.DB.prepare(`
      SELECT 
        c.id, c.user_id, u.username, c.brand, c.product, 
        c.rating, c.review, c.image_url, c.flavor_notes,
        c.category, c.created_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE LOWER(c.brand) = LOWER(?)
      ORDER BY c.created_at DESC
      LIMIT ?
    `).bind(brand, limit).all();
    
    const checkins = (checkinsResult.results || []).map((row: unknown) => {
      const r = row as CheckinRow;
      return {
        id: r.id,
        userId: r.user_id,
        username: r.username,
        brand: r.brand,
        product: r.product,
        rating: r.rating,
        review: r.review,
        imageUrl: r.image_url,
        flavorNotes: r.flavor_notes,
        category: r.category,
        createdAt: r.created_at,
      };
    });
    
    // Get top flavors for this brand
    const allFlavors: string[] = [];
    for (const c of checkins) {
      if (c.flavorNotes) {
        try {
          const parsed = JSON.parse(c.flavorNotes) as string[];
          allFlavors.push(...parsed);
        } catch {
          // ignore
        }
      }
    }
    
    const flavorCounts: Record<string, number> = {};
    for (const f of allFlavors) {
      flavorCounts[f] = (flavorCounts[f] || 0) + 1;
    }
    
    const topFlavors = Object.entries(flavorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([flavor, count]) => ({ flavor, count }));
    
    // Get top fans (users who smoke this brand most)
    const fansResult = await env.DB.prepare(`
      SELECT 
        c.user_id,
        u.username,
        COUNT(*) as checkin_count,
        AVG(c.rating) as avg_rating
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE LOWER(c.brand) = LOWER(?)
      GROUP BY c.user_id, u.username
      ORDER BY checkin_count DESC
      LIMIT 5
    `).bind(brand).all();
    
    const topFans = (fansResult.results || []).map((row: unknown) => {
      const r = row as FanRow;
      return {
        userId: r.user_id,
        username: r.username,
        checkinCount: r.checkin_count,
        avgRating: r.avg_rating ? Math.round(r.avg_rating * 10) / 10 : null,
      };
    });
    
    return NextResponse.json({
      brand,
      stats,
      checkins,
      topFlavors,
      topFans,
    });
  } catch (error) {
    console.error("Brand detail error:", error);
    return NextResponse.json({ error: "Failed to fetch brand details" }, { status: 500 });
  }
}
