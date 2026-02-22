import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

interface WishlistItem {
  id: string;
  brand: string;
  notes: string | null;
  created_at: number;
}

// GET /api/user/[username]/wishlist - Get a user's public wishlist
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
): Promise<NextResponse> {
  const { env } = getRequestContext();
  const db = env.DB;
  const { username } = await params;

  try {
    // Get the user
    const user = await db.prepare(
      "SELECT id FROM users WHERE LOWER(username) = LOWER(?)"
    ).bind(username).first<{ id: string }>();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get wishlist items (excluding notes for privacy - just show brands)
    const result = await db.prepare(`
      SELECT id, brand, created_at
      FROM wishlist
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).bind(user.id).all<Omit<WishlistItem, 'notes'>>();

    // Check which brands they've already smoked
    const smokedBrands = await db.prepare(`
      SELECT DISTINCT LOWER(brand) as brand
      FROM checkins
      WHERE user_id = ?
    `).bind(user.id).all<{ brand: string }>();

    const smokedSet = new Set(smokedBrands.results?.map(b => b.brand.toLowerCase()) || []);

    const items = (result.results || []).map(item => ({
      ...item,
      smoked: smokedSet.has(item.brand.toLowerCase())
    }));

    // Only return items they haven't smoked yet (the actual "want to try" items)
    const pendingItems = items.filter(item => !item.smoked);

    return NextResponse.json({ 
      wishlist: pendingItems,
      count: pendingItems.length
    });
  } catch (error) {
    console.error("User wishlist fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch wishlist" }, { status: 500 });
  }
}
