import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";
import { normalizeBrandName } from "@/lib/normalize";

export const runtime = "edge";

interface HumidorItem {
  id: string;
  brand: string;
  product: string | null;
  quantity: number;
  purchase_date: number | null;
  purchase_price: number | null;
  aging_since: number | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

// GET /api/humidor - Get user's humidor inventory
export async function GET(request: NextRequest): Promise<NextResponse> {
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
    // Create table if not exists
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS humidor (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        brand TEXT NOT NULL,
        product TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        purchase_date INTEGER,
        purchase_price REAL,
        aging_since INTEGER,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `).run();

    const result = await db.prepare(`
      SELECT id, brand, product, quantity, purchase_date, purchase_price, 
             aging_since, notes, created_at, updated_at
      FROM humidor
      WHERE user_id = ? AND quantity > 0
      ORDER BY brand ASC, product ASC
    `).bind(session.user_id).all<HumidorItem>();

    const items = result.results || [];

    // Calculate stats
    const totalCigars = items.reduce((sum, i) => sum + i.quantity, 0);
    const uniqueBrands = new Set(items.map(i => i.brand.toLowerCase())).size;
    const totalValue = items.reduce((sum, i) => {
      if (i.purchase_price) return sum + (i.purchase_price * i.quantity);
      return sum;
    }, 0);
    const agingCigars = items.filter(i => i.aging_since !== null).reduce((sum, i) => sum + i.quantity, 0);

    // Find oldest aging cigar
    const oldestAging = items
      .filter(i => i.aging_since !== null)
      .sort((a, b) => (a.aging_since || 0) - (b.aging_since || 0))[0];

    return NextResponse.json({
      items,
      stats: {
        totalCigars,
        uniqueBrands,
        totalValue: Math.round(totalValue * 100) / 100,
        agingCigars,
        oldestAgingDays: oldestAging 
          ? Math.floor((Date.now() / 1000 - (oldestAging.aging_since || 0)) / 86400)
          : null,
        oldestAgingBrand: oldestAging?.brand || null,
      }
    });
  } catch (error) {
    console.error("Humidor fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch humidor" }, { status: 500 });
  }
}

// POST /api/humidor - Add to humidor
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
    const body = await request.json() as {
      brand?: string;
      product?: string;
      quantity?: number;
      purchaseDate?: number;
      purchasePrice?: number;
      agingSince?: number;
      notes?: string;
    };

    const brand = normalizeBrandName(body.brand?.trim() || "");
    const product = body.product?.trim() || null;
    const quantity = Math.max(1, body.quantity || 1);
    const purchaseDate = body.purchaseDate || null;
    const purchasePrice = body.purchasePrice || null;
    const agingSince = body.agingSince || null;
    const notes = body.notes?.trim() || null;

    if (!brand) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 });
    }

    // Ensure table exists
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS humidor (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        brand TEXT NOT NULL,
        product TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        purchase_date INTEGER,
        purchase_price REAL,
        aging_since INTEGER,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `).run();

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.prepare(`
      INSERT INTO humidor (id, user_id, brand, product, quantity, purchase_date, purchase_price, aging_since, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, session.user_id, brand, product, quantity, purchaseDate, purchasePrice, agingSince, notes, now, now).run();

    return NextResponse.json({
      success: true,
      id,
      message: `Added ${quantity}x ${brand}${product ? ` ${product}` : ''} to your humidor!`
    });
  } catch (error) {
    console.error("Humidor add error:", error);
    return NextResponse.json({ error: "Failed to add to humidor" }, { status: 500 });
  }
}

// PATCH /api/humidor - Update item (quantity, notes, etc)
export async function PATCH(request: NextRequest): Promise<NextResponse> {
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
    const body = await request.json() as {
      id: string;
      quantity?: number;
      notes?: string;
      agingSince?: number | null;
      purchasePrice?: number | null;
    };

    if (!body.id) {
      return NextResponse.json({ error: "Item id required" }, { status: 400 });
    }

    // Verify ownership
    const item = await db.prepare(`
      SELECT id FROM humidor WHERE id = ? AND user_id = ?
    `).bind(body.id, session.user_id).first();

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (body.quantity !== undefined) {
      updates.push("quantity = ?");
      values.push(Math.max(0, body.quantity));
    }
    if (body.notes !== undefined) {
      updates.push("notes = ?");
      values.push(body.notes?.trim() || null);
    }
    if (body.agingSince !== undefined) {
      updates.push("aging_since = ?");
      values.push(body.agingSince);
    }
    if (body.purchasePrice !== undefined) {
      updates.push("purchase_price = ?");
      values.push(body.purchasePrice);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    updates.push("updated_at = ?");
    values.push(Math.floor(Date.now() / 1000));
    values.push(body.id);

    await db.prepare(`
      UPDATE humidor SET ${updates.join(", ")} WHERE id = ?
    `).bind(...values).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Humidor update error:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

// DELETE /api/humidor - Remove from humidor
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Item id required" }, { status: 400 });
    }

    await db.prepare(`
      DELETE FROM humidor WHERE id = ? AND user_id = ?
    `).bind(id, session.user_id).run();

    return NextResponse.json({ success: true, removed: id });
  } catch (error) {
    console.error("Humidor remove error:", error);
    return NextResponse.json({ error: "Failed to remove from humidor" }, { status: 500 });
  }
}
