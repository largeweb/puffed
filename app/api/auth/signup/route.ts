import { NextRequest, NextResponse } from "next/server";
import { generateId, hashPassword, createSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";
import type { SignupRequest } from "@/lib/types";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = (await request.json()) as SignupRequest;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Check if username exists
    const existing = await db
      .prepare("SELECT id FROM users WHERE username = ?")
      .bind(username.toLowerCase())
      .first();

    if (existing) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 400 }
      );
    }

    // Create user
    const userId = generateId();
    const passwordHash = await hashPassword(password);

    await db
      .prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)")
      .bind(userId, username.toLowerCase(), passwordHash)
      .run();

    // Create welcome notification
    const notificationId = generateId();
    await db
      .prepare("INSERT INTO notifications (id, user_id, type, from_user_id) VALUES (?, ?, 'welcome', ?)")
      .bind(notificationId, userId, userId)
      .run();

    // Create session
    const sessionId = generateId();
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days

    await db
      .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
      .bind(sessionId, userId, expiresAt)
      .run();

    const response = NextResponse.json({ success: true, username });
    response.headers.set("Set-Cookie", createSessionCookie(sessionId));

    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
