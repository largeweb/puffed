import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CheckinClient, { type CheckinWithMeta } from "./CheckinClient";

interface CheckinRow {
  id: string;
  user_id: string;
  brand: string;
  product: string | null;
  rating: number | null;
  review: string | null;
  flavor_notes: string | null;
  draw_rating: number | null;
  burn_rating: number | null;
  aroma_rating: number | null;
  smoke_time_mins: number | null;
  image_url: string | null;
  created_at: number;
  username: string;
}

export const runtime = "edge";

async function getCheckin(id: string): Promise<CheckinWithMeta | null> {
  const { env } = getRequestContext();
  const DB = env.DB;

  // Get current user if logged in
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  let currentUserId: string | null = null;

  if (session) {
    const sessionRow = await DB.prepare(
      "SELECT user_id FROM sessions WHERE id = ?"
    ).bind(session).first<{ user_id: string }>();
    currentUserId = sessionRow?.user_id || null;
  }

  // Get check-in with user info
  const checkin = await DB.prepare(`
    SELECT c.*, u.username
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).bind(id).first<CheckinRow>();

  if (!checkin) {
    return null;
  }

  // Get like count and whether current user liked it
  const likeCountResult = await DB.prepare(
    "SELECT COUNT(*) as count FROM likes WHERE checkin_id = ?"
  ).bind(id).first<{ count: number }>();
  const likeCount = likeCountResult?.count || 0;

  let likedByMe = false;
  if (currentUserId) {
    const likeRow = await DB.prepare(
      "SELECT 1 FROM likes WHERE checkin_id = ? AND user_id = ?"
    ).bind(id, currentUserId).first();
    likedByMe = !!likeRow;
  }

  // Get comment count
  const commentCountResult = await DB.prepare(
    "SELECT COUNT(*) as count FROM comments WHERE checkin_id = ?"
  ).bind(id).first<{ count: number }>();
  const commentCount = commentCountResult?.count || 0;

  // Transform null values to undefined to match Checkin type
  return {
    id: checkin.id,
    user_id: checkin.user_id,
    username: checkin.username,
    brand: checkin.brand,
    product: checkin.product ?? undefined,
    rating: checkin.rating ?? undefined,
    review: checkin.review ?? undefined,
    flavor_notes: checkin.flavor_notes ?? undefined,
    draw_rating: checkin.draw_rating ?? undefined,
    burn_rating: checkin.burn_rating ?? undefined,
    aroma_rating: checkin.aroma_rating ?? undefined,
    smoke_time_mins: checkin.smoke_time_mins ?? undefined,
    image_url: checkin.image_url ?? undefined,
    created_at: checkin.created_at,
    like_count: likeCount,
    liked_by_me: likedByMe,
    comment_count: commentCount,
  };
}

// Generate dynamic OG meta tags for social sharing
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const { env } = getRequestContext();
    const DB = env.DB;
    
    const checkin = await DB.prepare(`
      SELECT c.brand, c.product, c.rating, c.review, c.image_url, u.username
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).bind(id).first<{
      brand: string;
      product: string | null;
      rating: number | null;
      review: string | null;
      image_url: string | null;
      username: string;
    }>();

    if (!checkin) {
      return {
        title: "Check-in Not Found - Puffed",
      };
    }

    const title = checkin.product 
      ? `${checkin.brand} ${checkin.product}` 
      : checkin.brand;
    
    const ratingText = checkin.rating ? ` • Rated ${checkin.rating}/5` : "";
    const description = checkin.review 
      ? `"${checkin.review.slice(0, 150)}${checkin.review.length > 150 ? '...' : ''}"${ratingText} - @${checkin.username} on Puffed`
      : `${title}${ratingText} - Logged by @${checkin.username} on Puffed`;

    const metadata: Metadata = {
      title: `${title} - Puffed`,
      description,
      openGraph: {
        title: `${title} 🚬`,
        description,
        type: "article",
        siteName: "Puffed",
      },
      twitter: {
        card: checkin.image_url ? "summary_large_image" : "summary",
        title: `${title} 🚬`,
        description,
      },
    };

    // Add image if available
    if (checkin.image_url) {
      metadata.openGraph!.images = [
        {
          url: checkin.image_url,
          width: 1200,
          height: 630,
          alt: title,
        },
      ];
      metadata.twitter!.images = [checkin.image_url];
    }

    return metadata;
  } catch (error) {
    console.error("generateMetadata error:", error);
    return {
      title: "Puffed - Track Your Smoke",
    };
  }
}

export default async function CheckinDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const checkin = await getCheckin(id);

  if (!checkin) {
    notFound();
  }

  return <CheckinClient initialCheckin={checkin} />;
}
