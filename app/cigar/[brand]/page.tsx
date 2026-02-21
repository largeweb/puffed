import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CigarDetailClient from "./CigarDetailClient";

export const runtime = "edge";

interface BrandStats {
  brand: string;
  total_checkins: number;
  avg_rating: number | null;
  unique_smokers: number;
  latest_checkin: number;
}

interface CheckinWithUser {
  id: string;
  user_id: string;
  username: string;
  brand: string;
  product: string | null;
  rating: number | null;
  review: string | null;
  flavor_notes: string | null;
  image_url: string | null;
  created_at: number;
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
}

interface CigarDetailData {
  brand: string;
  stats: BrandStats;
  checkins: CheckinWithUser[];
  products: { product: string; count: number; avg_rating: number | null }[];
}

async function getCigarDetail(brand: string): Promise<CigarDetailData | null> {
  const { env } = getRequestContext();
  const DB = env.DB;

  // Decode the brand name from URL
  const decodedBrand = decodeURIComponent(brand);

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

  // Get brand stats
  const statsRow = await DB.prepare(`
    SELECT 
      brand,
      COUNT(*) as total_checkins,
      AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating,
      COUNT(DISTINCT user_id) as unique_smokers,
      MAX(created_at) as latest_checkin
    FROM checkins
    WHERE LOWER(brand) = LOWER(?)
    GROUP BY brand
  `).bind(decodedBrand).first<BrandStats>();

  if (!statsRow) {
    return null;
  }

  // Get products breakdown
  const productsResult = await DB.prepare(`
    SELECT 
      COALESCE(product, 'Unknown') as product,
      COUNT(*) as count,
      AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating
    FROM checkins
    WHERE LOWER(brand) = LOWER(?)
    GROUP BY product
    ORDER BY count DESC
    LIMIT 10
  `).bind(decodedBrand).all<{ product: string; count: number; avg_rating: number | null }>();

  // Get all check-ins for this brand with user info, like counts, and comment counts
  const checkinsResult = await DB.prepare(`
    SELECT 
      c.id,
      c.user_id,
      u.username,
      c.brand,
      c.product,
      c.rating,
      c.review,
      c.flavor_notes,
      c.image_url,
      c.created_at,
      (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) as comment_count
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE LOWER(c.brand) = LOWER(?)
    ORDER BY c.created_at DESC
    LIMIT 50
  `).bind(decodedBrand).all<{
    id: string;
    user_id: string;
    username: string;
    brand: string;
    product: string | null;
    rating: number | null;
    review: string | null;
    flavor_notes: string | null;
    image_url: string | null;
    created_at: number;
    like_count: number;
    comment_count: number;
  }>();

  // Check which check-ins current user has liked
  const checkins: CheckinWithUser[] = [];
  for (const c of checkinsResult.results) {
    let likedByMe = false;
    if (currentUserId) {
      const likeRow = await DB.prepare(
        "SELECT 1 FROM likes WHERE checkin_id = ? AND user_id = ?"
      ).bind(c.id, currentUserId).first();
      likedByMe = !!likeRow;
    }
    checkins.push({
      ...c,
      liked_by_me: likedByMe,
    });
  }

  return {
    brand: statsRow.brand,
    stats: statsRow,
    checkins,
    products: productsResult.results,
  };
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ brand: string }> 
}): Promise<Metadata> {
  const { brand } = await params;
  const decodedBrand = decodeURIComponent(brand);
  
  try {
    const { env } = getRequestContext();
    const DB = env.DB;
    
    const stats = await DB.prepare(`
      SELECT 
        brand,
        COUNT(*) as total_checkins,
        AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating,
        COUNT(DISTINCT user_id) as unique_smokers
      FROM checkins
      WHERE LOWER(brand) = LOWER(?)
      GROUP BY brand
    `).bind(decodedBrand).first<{
      brand: string;
      total_checkins: number;
      avg_rating: number | null;
      unique_smokers: number;
    }>();

    if (!stats) {
      return {
        title: "Cigar Not Found - Puffed",
      };
    }

    const ratingText = stats.avg_rating ? `${stats.avg_rating.toFixed(1)}/5 avg` : "No ratings yet";
    const description = `${stats.brand} on Puffed: ${stats.total_checkins} check-in${stats.total_checkins !== 1 ? 's' : ''} by ${stats.unique_smokers} smoker${stats.unique_smokers !== 1 ? 's' : ''} • ${ratingText}`;

    return {
      title: `${stats.brand} - Puffed`,
      description,
      openGraph: {
        title: `${stats.brand} 🚬`,
        description,
        type: "article",
        siteName: "Puffed",
      },
      twitter: {
        card: "summary",
        title: `${stats.brand} 🚬`,
        description,
      },
    };
  } catch (error) {
    console.error("generateMetadata error:", error);
    return {
      title: "Puffed - Track Your Smoke",
    };
  }
}

export default async function CigarDetailPage({ 
  params 
}: { 
  params: Promise<{ brand: string }> 
}) {
  const { brand } = await params;
  const data = await getCigarDetail(brand);

  if (!data) {
    notFound();
  }

  return <CigarDetailClient initialData={data} />;
}
