import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface VersionEnv {
  BUILD_VERSION?: string;
  ENVIRONMENT?: string;
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const versionEnv = env as VersionEnv;
    
    return NextResponse.json({
      version: versionEnv.BUILD_VERSION || "unknown",
      environment: versionEnv.ENVIRONMENT || "unknown",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      version: "unknown",
      environment: "unknown",
      timestamp: new Date().toISOString(),
    });
  }
}
