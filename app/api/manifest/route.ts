import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const manifest = {
    name: "Puffed - Track Your Smoke",
    short_name: "Puffed",
    description: "The social app for cigar and tobacco enthusiasts. Log, rate, discover, and share your smoke journey.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0d0d0d",
    theme_color: "#d97706",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/api/icons/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/api/icons/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ],
    categories: ["lifestyle", "social"],
    prefer_related_applications: false
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=86400"
    }
  });
}
