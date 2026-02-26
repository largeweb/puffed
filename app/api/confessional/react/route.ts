import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const session = await db.prepare(`
      SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?
    `).bind(sessionId, Date.now()).first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = session.user_id;
    const body = await request.json();
    const { confessionId } = body;

    if (!confessionId) {
      return NextResponse.json({ error: "Confession ID required" }, { status: 400 });
    }

    // Check confession exists
    const confession = await db.prepare(`
      SELECT id FROM confessions WHERE id = ?
    `).bind(confessionId).first();

    if (!confession) {
      return NextResponse.json({ error: "Confession not found" }, { status: 404 });
    }

    // Check if already reacted
    const existing = await db.prepare(`
      SELECT id FROM confession_reactions 
      WHERE confession_id = ? AND user_id = ?
    `).bind(confessionId, userId).first();

    if (existing) {
      // Remove reaction (toggle off)
      await db.prepare(`
        DELETE FROM confession_reactions 
        WHERE confession_id = ? AND user_id = ?
      `).bind(confessionId, userId).run();
      
      return NextResponse.json({ success: true, reacted: false });
    }

    // Add reaction
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO confession_reactions (id, confession_id, user_id, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(id, confessionId, userId, Date.now()).run();

    return NextResponse.json({ success: true, reacted: true });
  } catch (error) {
    console.error("Reaction error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
