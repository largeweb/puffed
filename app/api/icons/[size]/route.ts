import { NextRequest, NextResponse } from "next/server";
import { icon192, icon512 } from "@/lib/icons";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params;
  
  let iconBase64: string;
  
  if (size === "192") {
    iconBase64 = icon192;
  } else if (size === "512") {
    iconBase64 = icon512;
  } else {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }
  
  // Decode base64 to binary
  const binaryString = atob(iconBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
