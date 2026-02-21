import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// Get public feed of all check-ins (with search and category filter)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase() || "";
    const category = searchParams.get("category") || ""; // filter by category
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const { env } = getRequestContext();
    const db = env.DB;

    // Get current user if logged in
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);
    let currentUserId: string | null = null;

    if (sessionId) {
      const now = Math.floor(Date.now() / 1000);
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
        .bind(sessionId, now)
        .first<{ user_id: string }>();
      if (session) {
        currentUserId = session.user_id;
      }
    }

    let checkins;
    
    // Build WHERE clause parts
    const whereParts: string[] = [];
    const params: (string | number)[] = [currentUserId || ""];

    if (category && category !== "all") {
      whereParts.push("c.category = ?");
      params.push(category);
    }

    if (query) {
      whereParts.push("(LOWER(c.brand) LIKE ? OR LOWER(c.product) LIKE ? OR LOWER(c.review) LIKE ?)");
      params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
    params.push(limit, offset);

    checkins = await db
      .prepare(`
        SELECT c.*, u.username,
          (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count,
          (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) as comment_count,
          EXISTS(SELECT 1 FROM likes WHERE checkin_id = c.id AND user_id = ?) as liked_by_me
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        ${whereClause}
        ORDER BY c.created_at DESC 
        LIMIT ? OFFSET ?
      `)
      .bind(...params)
      .all();

    return NextResponse.json({ checkins: checkins.results });
  } catch (error) {
    console.error("Discover error:", error);
    return NextResponse.json({ error: "Failed to load feed" }, { status: 500 });
  }
}
