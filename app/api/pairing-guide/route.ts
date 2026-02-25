import { NextResponse } from "next/server";
import { getD1 } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";

export const runtime = "edge";

interface BrandPairing {
  brand: string;
  total_pairings: number;
  top_drink: string;
  top_drink_count: number;
  drinks: Array<{
    drink_id: string;
    count: number;
    percentage: number;
  }>;
  avg_rating: number;
}

interface DrinkBrandMatch {
  brand: string;
  count: number;
  avg_rating: number;
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const user = await verifyAuth(cookieStore);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const brandFilter = url.searchParams.get("brand");
  const drinkFilter = url.searchParams.get("drink");

  try {
    const db = getD1();

    // If filtering by a specific brand, get detailed pairing data for it
    if (brandFilter) {
      const pairings = await db
        .prepare(`
          SELECT 
            drink_pairing,
            COUNT(*) as count,
            AVG(rating) as avg_rating
          FROM checkins
          WHERE LOWER(brand) = LOWER(?)
            AND drink_pairing IS NOT NULL
            AND drink_pairing != ''
          GROUP BY drink_pairing
          ORDER BY count DESC
          LIMIT 10
        `)
        .bind(brandFilter)
        .all() as { results: Array<{ drink_pairing: string; count: number; avg_rating: number | null }> };

      const totalPairings = pairings.results.reduce((sum, p) => sum + p.count, 0);

      return NextResponse.json({
        brand: brandFilter,
        total_pairings: totalPairings,
        pairings: pairings.results.map(p => ({
          drink_id: p.drink_pairing,
          count: p.count,
          percentage: totalPairings > 0 ? Math.round((p.count / totalPairings) * 100) : 0,
          avg_rating: p.avg_rating ? Math.round(p.avg_rating * 10) / 10 : null,
        })),
      });
    }

    // If filtering by a specific drink, show brands that pair well with it
    if (drinkFilter) {
      const brands = await db
        .prepare(`
          SELECT 
            brand,
            COUNT(*) as count,
            AVG(rating) as avg_rating
          FROM checkins
          WHERE drink_pairing = ?
          GROUP BY LOWER(brand)
          ORDER BY count DESC
          LIMIT 20
        `)
        .bind(drinkFilter)
        .all() as { results: DrinkBrandMatch[] };

      const totalSmokes = brands.results.reduce((sum, b) => sum + b.count, 0);

      return NextResponse.json({
        drink: drinkFilter,
        total_smokes: totalSmokes,
        unique_brands: brands.results.length,
        brands: brands.results.map(b => ({
          brand: b.brand,
          count: b.count,
          avg_rating: b.avg_rating ? Math.round(b.avg_rating * 10) / 10 : null,
        })),
      });
    }

    // Default: Show overview of popular pairings
    // Top drinks overall
    const topDrinks = await db
      .prepare(`
        SELECT 
          drink_pairing,
          COUNT(*) as count,
          COUNT(DISTINCT LOWER(brand)) as unique_brands,
          AVG(rating) as avg_rating
        FROM checkins
        WHERE drink_pairing IS NOT NULL
          AND drink_pairing != ''
        GROUP BY drink_pairing
        ORDER BY count DESC
        LIMIT 10
      `)
      .all() as { results: Array<{ drink_pairing: string; count: number; unique_brands: number; avg_rating: number | null }> };

    // Brands with most pairing data
    const brandsWithPairings = await db
      .prepare(`
        SELECT 
          brand,
          COUNT(*) as pairing_count,
          COUNT(DISTINCT drink_pairing) as unique_drinks,
          AVG(rating) as avg_rating
        FROM checkins
        WHERE drink_pairing IS NOT NULL
          AND drink_pairing != ''
        GROUP BY LOWER(brand)
        HAVING pairing_count >= 2
        ORDER BY pairing_count DESC
        LIMIT 15
      `)
      .all() as { results: Array<{ brand: string; pairing_count: number; unique_drinks: number; avg_rating: number | null }> };

    // Perfect pairings: high-rated check-ins with drink pairings
    const perfectPairings = await db
      .prepare(`
        SELECT 
          brand,
          drink_pairing,
          COUNT(*) as count,
          AVG(rating) as avg_rating
        FROM checkins
        WHERE drink_pairing IS NOT NULL
          AND drink_pairing != ''
          AND rating >= 4
        GROUP BY LOWER(brand), drink_pairing
        HAVING count >= 1
        ORDER BY avg_rating DESC, count DESC
        LIMIT 10
      `)
      .all() as { results: Array<{ brand: string; drink_pairing: string; count: number; avg_rating: number }> };

    // User's personal pairing stats
    const userPairings = await db
      .prepare(`
        SELECT 
          drink_pairing,
          COUNT(*) as count,
          AVG(rating) as avg_rating
        FROM checkins
        WHERE user_id = ?
          AND drink_pairing IS NOT NULL
          AND drink_pairing != ''
        GROUP BY drink_pairing
        ORDER BY count DESC
        LIMIT 5
      `)
      .bind(user.id)
      .all() as { results: Array<{ drink_pairing: string; count: number; avg_rating: number | null }> };

    // Platform stats
    const stats = await db
      .prepare(`
        SELECT 
          COUNT(*) as total_with_pairings,
          COUNT(DISTINCT drink_pairing) as unique_drinks,
          COUNT(DISTINCT LOWER(brand)) as unique_brands
        FROM checkins
        WHERE drink_pairing IS NOT NULL
          AND drink_pairing != ''
      `)
      .first() as { total_with_pairings: number; unique_drinks: number; unique_brands: number } | null;

    return NextResponse.json({
      stats: {
        total_pairings: stats?.total_with_pairings || 0,
        unique_drinks: stats?.unique_drinks || 0,
        unique_brands: stats?.unique_brands || 0,
      },
      top_drinks: topDrinks.results.map(d => ({
        drink_id: d.drink_pairing,
        count: d.count,
        unique_brands: d.unique_brands,
        avg_rating: d.avg_rating ? Math.round(d.avg_rating * 10) / 10 : null,
      })),
      brands_with_data: brandsWithPairings.results.map(b => ({
        brand: b.brand,
        pairing_count: b.pairing_count,
        unique_drinks: b.unique_drinks,
        avg_rating: b.avg_rating ? Math.round(b.avg_rating * 10) / 10 : null,
      })),
      perfect_pairings: perfectPairings.results.map(p => ({
        brand: p.brand,
        drink_id: p.drink_pairing,
        count: p.count,
        avg_rating: Math.round(p.avg_rating * 10) / 10,
      })),
      your_favorites: userPairings.results.map(p => ({
        drink_id: p.drink_pairing,
        count: p.count,
        avg_rating: p.avg_rating ? Math.round(p.avg_rating * 10) / 10 : null,
      })),
    });
  } catch (error) {
    console.error("Pairing guide error:", error);
    return NextResponse.json({ error: "Failed to load pairing guide" }, { status: 500 });
  }
}
