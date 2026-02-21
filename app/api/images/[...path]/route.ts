import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const imagePath = path.join("/");

    const { env } = getRequestContext();
    const bucket = env.BUCKET;

    const object = await bucket.get(imagePath);

    if (!object) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", object.httpMetadata?.contentType || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(object.body, { headers });
  } catch (error) {
    console.error("Image fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
  }
}
