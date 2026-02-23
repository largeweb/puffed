import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";

export const runtime = "edge";

// Generate a short, memorable referral code
function generateReferralCode(): string {
  return nanoid(8);
}

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = env.DB;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = await db
    .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
    .bind(sessionId, Math.floor(Date.now() / 1000))
    .first<{ user_id: string }>();

  if (!session) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  // Get user with referral code
  const user = await db
    .prepare("SELECT id, username, referral_code FROM users WHERE id = ?")
    .bind(session.user_id)
    .first<{ id: string; username: string; referral_code: string | null }>();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Generate referral code if user doesn't have one
  let referralCode = user.referral_code;
  if (!referralCode) {
    referralCode = generateReferralCode();
    await db
      .prepare("UPDATE users SET referral_code = ? WHERE id = ?")
      .bind(referralCode, user.id)
      .run();
  }

  // Count how many users this person has referred
  const referralStats = await db
    .prepare("SELECT COUNT(*) as count FROM users WHERE referred_by = ?")
    .bind(user.id)
    .first<{ count: number }>();

  // Get referred users with their activity
  const referredUsers = await db
    .prepare(`
      SELECT 
        u.username,
        u.created_at,
        (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) as checkin_count
      FROM users u
      WHERE u.referred_by = ?
      ORDER BY u.created_at DESC
      LIMIT 10
    `)
    .bind(user.id)
    .all<{ username: string; created_at: number; checkin_count: number }>();

  return NextResponse.json({
    referralCode,
    inviteUrl: `https://puffed.pages.dev/join?ref=${referralCode}`,
    stats: {
      totalReferrals: referralStats?.count || 0,
      referredUsers: referredUsers.results || [],
    },
  });
}
