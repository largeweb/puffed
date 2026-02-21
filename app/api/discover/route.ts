import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// Get public feed of all check-ins (with search)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase() || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const { env } = getRequestContext();
    const db = env.DB;

    let checkins;
    
    if (query) {
      // Search by brand or product
      checkins = await db
        .prepare(`
          SELECT c.*, u.username 
          FROM checkins c
          JOIN users u ON c.user_id = u.id
          WHERE LOWER(c.brand) LIKE ? OR LOWER(c.product) LIKE ? OR LOWER(c.review) LIKE ?
          ORDER BY c.created_at DESC 
          LIMIT ? OFFSET ?
        `)
        .bind(`%${query}%`, `%${query}%`, `%${query}%`, limit, offset)
        .all();
    } else {
      // Get recent public feed
      checkins = await db
        .prepare(`
          SELECT c.*, u.username 
          FROM checkins c
          JOIN users u ON c.user_id = u.id
          ORDER BY c.created_at DESC 
          LIMIT ? OFFSET ?
        `)
        .bind(limit, offset)
        .all();
    }

    return NextResponse.json({ checkins: checkins.results });
  } catch (error) {
    console.error("Discover error:", error);
    return NextResponse.json({ error: "Failed to load feed" }, { status: 500 });
  }
}
