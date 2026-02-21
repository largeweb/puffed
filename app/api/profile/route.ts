import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// Get current user's profile
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    const now = Math.floor(Date.now() / 1000);
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
      .bind(sessionId, now)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const user = await db
      .prepare("SELECT username, bio, created_at FROM users WHERE id = ?")
      .bind(session.user_id)
      .first<{ username: string; bio: string | null; created_at: number }>();

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json({ error: "Failed to get profile" }, { status: 500 });
  }
}

// Update current user's profile
export async function PUT(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    const now = Math.floor(Date.now() / 1000);
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
      .bind(sessionId, now)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const { bio } = (await request.json()) as { bio?: string };

    // Validate bio length
    if (bio && bio.length > 150) {
      return NextResponse.json({ error: "Bio must be 150 characters or less" }, { status: 400 });
    }

    await db
      .prepare("UPDATE users SET bio = ? WHERE id = ?")
      .bind(bio || null, session.user_id)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
