import { NextRequest, NextResponse } from "next/server";
import { generateId, hashPassword, createSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";
import type { SignupRequest } from "@/lib/types";
import { nanoid } from "nanoid";

export const runtime = "edge";

interface SignupRequestWithRef extends SignupRequest {
  referralCode?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, referralCode } = (await request.json()) as SignupRequestWithRef;

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
    const newReferralCode = nanoid(8);

    // Look up referrer if code provided
    let referredBy: string | null = null;
    if (referralCode) {
      const referrer = await db
        .prepare("SELECT id FROM users WHERE referral_code = ?")
        .bind(referralCode)
        .first<{ id: string }>();
      if (referrer) {
        referredBy = referrer.id;
      }
    }

    await db
      .prepare("INSERT INTO users (id, username, password_hash, referral_code, referred_by) VALUES (?, ?, ?, ?, ?)")
      .bind(userId, username.toLowerCase(), passwordHash, newReferralCode, referredBy)
      .run();

    // If referred, notify the referrer
    if (referredBy) {
      const referralNotifId = generateId();
      await db
        .prepare("INSERT INTO notifications (id, user_id, type, from_user_id, message) VALUES (?, ?, 'referral', ?, ?)")
        .bind(referralNotifId, referredBy, userId, `🎉 @${username.toLowerCase()} joined using your invite link!`)
        .run();
    }

    // Create welcome notification
    const notificationId = generateId();
    await db
      .prepare("INSERT INTO notifications (id, user_id, type, from_user_id) VALUES (?, ?, 'welcome', ?)")
      .bind(notificationId, userId, userId)
      .run();

    // Auto-follow the top 2 most active users (to seed their feed)
    try {
      const activeUsers = await db.prepare(`
        SELECT u.id, u.username, COUNT(c.id) as checkin_count
        FROM users u
        LEFT JOIN checkins c ON u.id = c.user_id
        WHERE u.id != ?
        GROUP BY u.id
        HAVING checkin_count > 0
        ORDER BY checkin_count DESC
        LIMIT 2
      `).bind(userId).all<{ id: string; username: string; checkin_count: number }>();

      for (const activeUser of activeUsers.results || []) {
        // Create the follow
        const followId = generateId();
        await db.prepare(`
          INSERT INTO follows (id, follower_id, following_id)
          VALUES (?, ?, ?)
        `).bind(followId, userId, activeUser.id).run();

        // Notify the followed user
        const followNotifId = generateId();
        await db.prepare(`
          INSERT INTO notifications (id, user_id, type, from_user_id)
          VALUES (?, ?, 'follow', ?)
        `).bind(followNotifId, activeUser.id, userId).run();
      }
    } catch (autoFollowError) {
      // Non-critical, don't fail signup if auto-follow fails
      console.error("Auto-follow error:", autoFollowError);
    }

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
