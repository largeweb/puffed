import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({ user: null });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    const now = Math.floor(Date.now() / 1000);
    const session = await db
      .prepare(`
        SELECT s.user_id, u.username 
        FROM sessions s 
        JOIN users u ON s.user_id = u.id 
        WHERE s.id = ? AND s.expires_at > ?
      `)
      .bind(sessionId, now)
      .first<{ user_id: string; username: string }>();

    if (!session) {
      return NextResponse.json({ user: null });
    }

    // Get the user's last smoke time
    const lastSmoke = await db
      .prepare(`
        SELECT created_at 
        FROM checkins 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `)
      .bind(session.user_id)
      .first<{ created_at: number }>();

    return NextResponse.json({
      user: {
        id: session.user_id,
        username: session.username,
        last_smoke_at: lastSmoke?.created_at || null,
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ user: null });
  }
}
