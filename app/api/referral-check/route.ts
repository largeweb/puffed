import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  const { env } = getRequestContext();
  const db = env.DB;

  // Look up user by referral code
  const user = await db
    .prepare("SELECT username FROM users WHERE referral_code = ?")
    .bind(code)
    .first<{ username: string }>();

  if (!user) {
    return NextResponse.json({ username: null });
  }

  return NextResponse.json({ username: user.username });
}
