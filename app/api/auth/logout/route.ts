import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie, clearSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (sessionId) {
      const { env } = getRequestContext();
      await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
    }

    const response = NextResponse.json({ success: true });
    response.headers.set("Set-Cookie", clearSessionCookie());

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ success: true });
  }
}
