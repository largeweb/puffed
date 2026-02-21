import { Metadata } from "next";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import CheckinDetailClient, { type CheckinWithMeta } from "./CheckinDetailClient";

export const runtime = "edge";

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

async function getCheckin(id: string): Promise<CheckinWithMeta | null> {
  try {
    const { env } = getRequestContext();
    const DB = env.DB;

    const checkin = await DB.prepare(`
      SELECT c.*, u.username
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).bind(id).first<CheckinRow>();

    if (!checkin) return null;

    // Get like count
    const likeCountResult = await DB.prepare(
      "SELECT COUNT(*) as count FROM likes WHERE checkin_id = ?"
    ).bind(id).first<{ count: number }>();
    const likeCount = likeCountResult?.count || 0;

    // Get comment count
    const commentCountResult = await DB.prepare(
      "SELECT COUNT(*) as count FROM comments WHERE checkin_id = ?"
    ).bind(id).first<{ count: number }>();
    const commentCount = commentCountResult?.count || 0;

    // Check if current user liked it
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    let likedByMe = false;

    if (session) {
      const sessionRow = await DB.prepare(
        "SELECT user_id FROM sessions WHERE id = ?"
      ).bind(session).first<{ user_id: string }>();
      if (sessionRow) {
        const likeRow = await DB.prepare(
          "SELECT 1 FROM likes WHERE checkin_id = ? AND user_id = ?"
        ).bind(id, sessionRow.user_id).first();
        likedByMe = !!likeRow;
      }
    }

    return {
      ...checkin,
      like_count: likeCount,
      liked_by_me: likedByMe,
      comment_count: commentCount,
    };
  } catch (error) {
    console.error("getCheckin error:", error);
    return null;
  }
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const checkin = await getCheckin(id);
    
    if (!checkin) {
      return {
        title: "Check-in Not Found | Puffed",
        description: "This check-in could not be found.",
      };
    }

    // Build a nice title
    const ratingStars = checkin.rating ? "★".repeat(checkin.rating) + "☆".repeat(5 - checkin.rating) : "";
    const title = checkin.rating 
      ? `${checkin.brand}${checkin.product ? ` ${checkin.product}` : ""} ${ratingStars} | @${checkin.username}`
      : `${checkin.brand}${checkin.product ? ` ${checkin.product}` : ""} | @${checkin.username}`;

    // Build description from review or flavor notes
    let description = `Check-in by @${checkin.username} on Puffed`;
    if (checkin.review) {
      description = checkin.review.length > 150 
        ? checkin.review.substring(0, 147) + "..." 
        : checkin.review;
    } else if (checkin.flavor_notes) {
      description = `"${checkin.flavor_notes}"`;
    }

    const ogImage = checkin.image_url || undefined;

    return {
      title: `${title} | Puffed`,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: checkin.brand }] : undefined,
        siteName: "Puffed",
      },
      twitter: {
        card: ogImage ? "summary_large_image" : "summary",
        title,
        description,
        images: ogImage ? [ogImage] : undefined,
      },
    };
  } catch {
    return {
      title: "Check-in | Puffed",
      description: "View this cigar check-in on Puffed",
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

  return <CheckinDetailClient initialCheckin={checkin} />;
}
