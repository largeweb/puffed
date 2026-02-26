import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

export const runtime = "edge";

interface TierListItem {
  brand: string;
  avgRating: number;
  checkinCount: number;
  lastSmoked: number;
  imageUrl: string | null;
}

interface TierListResponse {
  brands: TierListItem[];
  savedTiers: Record<string, string>; // brand -> tier
  stats: {
    totalBrands: number;
    totalCheckins: number;
    tierBreakdown: Record<string, number>;
  };
}

// GET: Fetch user's brands and saved tier list
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);
    
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;
    const now = Math.floor(Date.now() / 1000);

    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
      .bind(sessionId, now)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user_id;

    // Get all brands the user has smoked with stats
    const brandsResult = await db.prepare(`
      SELECT 
        brand,
        AVG(rating) as avg_rating,
        COUNT(*) as checkin_count,
        MAX(created_at) as last_smoked,
        (SELECT image_url FROM checkins c2 WHERE c2.brand = checkins.brand AND c2.user_id = ? AND c2.image_url IS NOT NULL ORDER BY created_at DESC LIMIT 1) as image_url
      FROM checkins 
      WHERE user_id = ?
      GROUP BY brand
      ORDER BY checkin_count DESC
    `).bind(userId, userId).all();

    // Get saved tier assignments
    const tiersResult = await db.prepare(`
      SELECT brand, tier 
      FROM user_tier_list 
      WHERE user_id = ?
    `).bind(userId).all();

    const savedTiers: Record<string, string> = {};
    for (const row of tiersResult.results as { brand: string; tier: string }[]) {
      savedTiers[row.brand] = row.tier;
    }

    // Calculate tier breakdown
    const tierBreakdown: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (const tier of Object.values(savedTiers)) {
      if (tierBreakdown[tier] !== undefined) {
        tierBreakdown[tier]++;
      }
    }

    const brands: TierListItem[] = (brandsResult.results as any[]).map(row => ({
      brand: row.brand,
      avgRating: row.avg_rating ? Number(row.avg_rating.toFixed(1)) : 0,
      checkinCount: row.checkin_count,
      lastSmoked: row.last_smoked,
      imageUrl: row.image_url,
    }));

    const response: TierListResponse = {
      brands,
      savedTiers,
      stats: {
        totalBrands: brands.length,
        totalCheckins: brands.reduce((sum, b) => sum + b.checkinCount, 0),
        tierBreakdown,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Tier list error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST: Save tier assignment
export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);
    
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;
    const now = Math.floor(Date.now() / 1000);

    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
      .bind(sessionId, now)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user_id;

    const body = await request.json() as { brand: string; tier: string | null };
    const { brand, tier } = body;

    if (!brand) {
      return NextResponse.json({ error: "Brand required" }, { status: 400 });
    }

    // Valid tiers
    const validTiers = ['S', 'A', 'B', 'C', 'D', 'F'];

    if (tier === null || tier === '') {
      // Remove tier assignment
      await db.prepare(`
        DELETE FROM user_tier_list 
        WHERE user_id = ? AND brand = ?
      `).bind(userId, brand).run();
    } else if (validTiers.includes(tier)) {
      // Upsert tier assignment
      await db.prepare(`
        INSERT INTO user_tier_list (user_id, brand, tier, updated_at)
        VALUES (?, ?, ?, unixepoch())
        ON CONFLICT(user_id, brand) DO UPDATE SET tier = ?, updated_at = unixepoch()
      `).bind(userId, brand, tier, tier).run();
    } else {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tier save error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
