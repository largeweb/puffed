import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";
import { normalizeBrandName, normalizeProductName } from "@/lib/normalize";

export const runtime = "edge";

// GET: Preview what would be normalized (dry run)
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { env } = getRequestContext();
  const db = env.DB;

  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get("key");
  if (adminKey !== "puffed-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all distinct brands
    const brands = await db.prepare(`
      SELECT DISTINCT brand, COUNT(*) as count 
      FROM checkins 
      GROUP BY brand 
      ORDER BY count DESC
    `).all<{ brand: string; count: number }>();

    const changes: Array<{
      original: string;
      normalized: string;
      count: number;
    }> = [];

    for (const row of brands.results || []) {
      const normalized = normalizeBrandName(row.brand);
      if (normalized !== row.brand) {
        changes.push({
          original: row.brand,
          normalized,
          count: row.count,
        });
      }
    }

    // Also check for potential merges (same normalized name)
    const mergeGroups: Record<string, Array<{ original: string; count: number }>> = {};
    for (const row of brands.results || []) {
      const normalized = normalizeBrandName(row.brand).toLowerCase();
      if (!mergeGroups[normalized]) {
        mergeGroups[normalized] = [];
      }
      mergeGroups[normalized].push({ original: row.brand, count: row.count });
    }

    const potentialMerges = Object.entries(mergeGroups)
      .filter(([_, group]) => group.length > 1)
      .map(([normalized, group]) => ({
        normalizedKey: normalized,
        variants: group,
        totalCheckins: group.reduce((sum, g) => sum + g.count, 0),
      }));

    return NextResponse.json({
      totalBrands: brands.results?.length || 0,
      changesNeeded: changes.length,
      changes,
      potentialMerges,
    });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}

// POST: Actually normalize all brands
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { env } = getRequestContext();
  const db = env.DB;

  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get("key");
  if (adminKey !== "puffed-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all check-ins
    const checkins = await db.prepare(`
      SELECT id, brand, product FROM checkins
    `).all<{ id: string; brand: string; product: string | null }>();

    let updatedBrands = 0;
    let updatedProducts = 0;

    for (const checkin of checkins.results || []) {
      const normalizedBrand = normalizeBrandName(checkin.brand);
      const normalizedProduct = normalizeProductName(checkin.product);

      const brandChanged = normalizedBrand !== checkin.brand;
      const productChanged = normalizedProduct !== checkin.product;

      if (brandChanged || productChanged) {
        await db.prepare(`
          UPDATE checkins SET brand = ?, product = ? WHERE id = ?
        `).bind(normalizedBrand, normalizedProduct, checkin.id).run();

        if (brandChanged) updatedBrands++;
        if (productChanged) updatedProducts++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Normalized ${updatedBrands} brands and ${updatedProducts} products`,
      updatedBrands,
      updatedProducts,
      totalProcessed: checkins.results?.length || 0,
    });
  } catch (error) {
    console.error("Normalize error:", error);
    return NextResponse.json({ error: "Normalization failed" }, { status: 500 });
  }
}
