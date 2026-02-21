import { NextRequest, NextResponse } from "next/server";
import { generateId, verifyPassword, createSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";
import type { LoginRequest } from "@/lib/types";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = (await request.json()) as LoginRequest;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400 }
      );
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Find user
    const user = await db
      .prepare("SELECT id, username, password_hash FROM users WHERE username = ?")
      .bind(username.toLowerCase())
      .first<{ id: string; username: string; password_hash: string }>();

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Verify password
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Create session
    const sessionId = generateId();
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

    await db
      .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
      .bind(sessionId, user.id, expiresAt)
      .run();

    const response = NextResponse.json({ success: true, username: user.username });
    response.headers.set("Set-Cookie", createSessionCookie(sessionId));

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Failed to login" },
      { status: 500 }
    );
  }
}
