import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// Category config
const CATEGORY_CONFIG: Record<string, { emoji: string; color: string; gradient: string }> = {
  cigar: { emoji: "🚬", color: "#f59e0b", gradient: "from-amber-900 to-orange-950" },
  cannabis: { emoji: "🌿", color: "#22c55e", gradient: "from-green-900 to-emerald-950" },
  hookah: { emoji: "💨", color: "#8b5cf6", gradient: "from-purple-900 to-violet-950" },
  vape: { emoji: "🌫️", color: "#06b6d4", gradient: "from-cyan-900 to-blue-950" },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { env } = getRequestContext();
  const db = env.DB;

  // Fetch check-in with user info
  const checkin = await db
    .prepare(`
      SELECT c.*, u.username 
      FROM checkins c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.id = ?
    `)
    .bind(id)
    .first<{
      id: string;
      brand: string;
      product: string | null;
      rating: number;
      review: string | null;
      image_url: string | null;
      category: string;
      username: string;
      created_at: number;
    }>();

  if (!checkin) {
    return new Response("Check-in not found", { status: 404 });
  }

  const category = checkin.category || "cigar";
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.cigar;
  const reviewText = checkin.review 
    ? (checkin.review.length > 100 ? checkin.review.slice(0, 100) + "..." : checkin.review)
    : "";

  // Generate star rating display
  const stars = "★".repeat(checkin.rating) + "☆".repeat(5 - checkin.rating);

  // Build the image URL for background
  const baseUrl = request.nextUrl.origin;
  const imageUrl = checkin.image_url 
    ? (checkin.image_url.startsWith("http") ? checkin.image_url : `${baseUrl}${checkin.image_url}`)
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px",
          fontFamily: "system-ui, sans-serif",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background */}
        {imageUrl ? (
          <img
            src={imageUrl}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "1200px",
              height: "630px",
              objectFit: "cover",
            }}
          />
        ) : null}
        
        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: imageUrl 
              ? "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.9) 100%)"
              : `linear-gradient(135deg, ${category === 'cannabis' ? '#14532d' : category === 'hookah' ? '#4c1d95' : category === 'vape' ? '#164e63' : '#78350f'} 0%, ${category === 'cannabis' ? '#052e16' : category === 'hookah' ? '#2e1065' : category === 'vape' ? '#083344' : '#451a03'} 100%)`,
          }}
        />

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", zIndex: 10, flex: 1 }}>
          {/* Top: Category badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(10px)",
                padding: "8px 16px",
                borderRadius: "24px",
                fontSize: "20px",
              }}
            >
              <span>{config.emoji}</span>
              <span style={{ textTransform: "capitalize" }}>{category}</span>
            </div>
          </div>

          {/* Middle: Brand & Rating */}
          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", marginBottom: "24px" }}>
            {/* Brand name */}
            <div
              style={{
                fontSize: "72px",
                fontWeight: "bold",
                lineHeight: 1.1,
                textShadow: "0 4px 12px rgba(0,0,0,0.5)",
                marginBottom: "8px",
              }}
            >
              {checkin.brand}
            </div>
            
            {/* Product */}
            {checkin.product && (
              <div
                style={{
                  fontSize: "36px",
                  color: "rgba(255,255,255,0.8)",
                  textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                  marginBottom: "16px",
                }}
              >
                {checkin.product}
              </div>
            )}

            {/* Stars */}
            <div
              style={{
                fontSize: "48px",
                color: config.color,
                letterSpacing: "4px",
                textShadow: "0 2px 8px rgba(0,0,0,0.5)",
              }}
            >
              {stars}
            </div>
          </div>

          {/* Review excerpt */}
          {reviewText && (
            <div
              style={{
                fontSize: "24px",
                color: "rgba(255,255,255,0.9)",
                lineHeight: 1.4,
                maxWidth: "800px",
                backgroundColor: "rgba(0,0,0,0.3)",
                padding: "16px 24px",
                borderRadius: "12px",
                borderLeft: `4px solid ${config.color}`,
                marginBottom: "24px",
              }}
            >
              "{reviewText}"
            </div>
          )}
        </div>

        {/* Bottom: Username & Branding */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: config.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              {checkin.username[0].toUpperCase()}
            </div>
            <div style={{ fontSize: "24px", fontWeight: "600" }}>
              @{checkin.username}
            </div>
          </div>

          {/* Puffed branding */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              🚬 Puffed
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    }
  );
}
