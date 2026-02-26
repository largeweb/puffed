import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/humidor/smoke - Decrement humidor item (when you smoke one)
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
    const body = await request.json() as { id: string; quantity?: number };
    const { id, quantity = 1 } = body;

    if (!id) {
      return NextResponse.json({ error: "Item id required" }, { status: 400 });
    }

    // Get current item
    const item = await db.prepare(`
      SELECT id, brand, product, quantity FROM humidor 
      WHERE id = ? AND user_id = ?
    `).bind(id, session.user_id).first<{
      id: string;
      brand: string;
      product: string | null;
      quantity: number;
    }>();

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.quantity < quantity) {
      return NextResponse.json({ error: "Not enough cigars in humidor" }, { status: 400 });
    }

    const newQuantity = item.quantity - quantity;
    const now = Math.floor(Date.now() / 1000);

    await db.prepare(`
      UPDATE humidor SET quantity = ?, updated_at = ? WHERE id = ?
    `).bind(newQuantity, now, id).run();

    return NextResponse.json({
      success: true,
      brand: item.brand,
      product: item.product,
      remainingQuantity: newQuantity,
      message: newQuantity === 0 
        ? `Last ${item.brand}${item.product ? ` ${item.product}` : ''} smoked! Time to restock 🛒`
        : `Enjoy your ${item.brand}! ${newQuantity} left in humidor.`
    });
  } catch (error) {
    console.error("Humidor smoke error:", error);
    return NextResponse.json({ error: "Failed to update humidor" }, { status: 500 });
  }
}
