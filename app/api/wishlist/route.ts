import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";
import { normalizeBrandName } from "@/lib/normalize";

export const runtime = "edge";

interface WishlistItem {
  id: string;
  brand: string;
  notes: string | null;
  created_at: number;
}

// GET /api/wishlist - Get user's wishlist
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { env } = getRequestContext();
  const db = env.DB;

  // Get session
  const sessionToken = request.cookies.get("session")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = await db.prepare(
    "SELECT user_id FROM sessions WHERE id = ?"
  ).bind(sessionToken).first<{ user_id: string }>();

  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  try {
    // Check if table exists, if not create it
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        brand TEXT NOT NULL,
        notes TEXT,
        created_at INTEGER NOT NULL,
        UNIQUE(user_id, brand)
      )
    `).run();

    const result = await db.prepare(`
      SELECT id, brand, notes, created_at
      FROM wishlist
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(session.user_id).all<WishlistItem>();

    // Also check if any wishlist brands have been smoked
    const smokedBrands = await db.prepare(`
      SELECT DISTINCT LOWER(brand) as brand
      FROM checkins
      WHERE user_id = ?
    `).bind(session.user_id).all<{ brand: string }>();

    const smokedSet = new Set(smokedBrands.results?.map(b => b.brand.toLowerCase()) || []);

    const items = (result.results || []).map(item => ({
      ...item,
      smoked: smokedSet.has(item.brand.toLowerCase())
    }));

    return NextResponse.json({ 
      wishlist: items,
      count: items.length
    });
  } catch (error) {
    console.error("Wishlist fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch wishlist" }, { status: 500 });
  }
}

// POST /api/wishlist - Add to wishlist
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { env } = getRequestContext();
  const db = env.DB;

  const sessionToken = request.cookies.get("session")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = await db.prepare(
    "SELECT user_id FROM sessions WHERE id = ?"
  ).bind(sessionToken).first<{ user_id: string }>();

  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  try {
    const body = await request.json() as { brand?: string; notes?: string };
    const brand = normalizeBrandName(body.brand?.trim() || "");
    const notes = body.notes?.trim() || null;

    if (!brand) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 });
    }

    // Ensure table exists
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        brand TEXT NOT NULL,
        notes TEXT,
        created_at INTEGER NOT NULL,
        UNIQUE(user_id, brand)
      )
    `).run();

    // Check if already in wishlist
    const existing = await db.prepare(`
      SELECT id FROM wishlist WHERE user_id = ? AND LOWER(brand) = LOWER(?)
    `).bind(session.user_id, brand).first();

    if (existing) {
      return NextResponse.json({ error: "Already in wishlist", exists: true }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.prepare(`
      INSERT INTO wishlist (id, user_id, brand, notes, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, session.user_id, brand, notes, now).run();

    return NextResponse.json({ 
      success: true, 
      id,
      brand,
      message: `Added "${brand}" to your wishlist!`
    });
  } catch (error) {
    console.error("Wishlist add error:", error);
    return NextResponse.json({ error: "Failed to add to wishlist" }, { status: 500 });
  }
}

// DELETE /api/wishlist - Remove from wishlist
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const { env } = getRequestContext();
  const db = env.DB;

  const sessionToken = request.cookies.get("session")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = await db.prepare(
    "SELECT user_id FROM sessions WHERE id = ?"
  ).bind(sessionToken).first<{ user_id: string }>();

  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand");
    const id = searchParams.get("id");

    if (!brand && !id) {
      return NextResponse.json({ error: "Brand or id required" }, { status: 400 });
    }

    if (id) {
      await db.prepare(`
        DELETE FROM wishlist WHERE id = ? AND user_id = ?
      `).bind(id, session.user_id).run();
    } else {
      await db.prepare(`
        DELETE FROM wishlist WHERE LOWER(brand) = LOWER(?) AND user_id = ?
      `).bind(brand, session.user_id).run();
    }

    return NextResponse.json({ success: true, removed: brand || id });
  } catch (error) {
    console.error("Wishlist remove error:", error);
    return NextResponse.json({ error: "Failed to remove from wishlist" }, { status: 500 });
  }
}
