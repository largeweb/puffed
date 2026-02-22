import { getRequestContext } from "@cloudflare/next-on-pages";

export interface FeaturedCheckin {
  id: string;
  user_id: string;
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  review?: string;
  image_url?: string;
  category: string;
  created_at: number;
  like_count: number;
  comment_count: number;
  flavor_notes?: string;
}

export interface FeaturedResponse {
  featured: FeaturedCheckin | null;
  date: string;
  error?: string;
}

export const runtime = "edge";

// Get a deterministic "random" checkin based on today's date
// This ensures everyone sees the same featured checkin for the day
function getDailyHash(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export async function GET(): Promise<Response> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    // Get today's date string for consistent daily selection
    const today = new Date().toISOString().split('T')[0];
    
    // Get all checkins with images or reviews (quality content)
    // that were created in the last 30 days
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    
    const result = await db
      .prepare(`
        SELECT 
          c.id,
          c.user_id,
          u.username,
          c.brand,
          c.product,
          c.rating,
          c.review,
          c.image_url,
          c.category,
          c.created_at,
          c.flavor_notes,
          (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count,
          (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) as comment_count
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE c.created_at > ?
          AND (c.image_url IS NOT NULL OR c.review IS NOT NULL OR c.rating >= 4)
        ORDER BY c.created_at DESC
        LIMIT 100
      `)
      .bind(thirtyDaysAgo)
      .all<FeaturedCheckin>();
    
    const checkins = result.results || [];
    
    if (checkins.length === 0) {
      // Fallback: get any checkin if no quality ones exist
      const fallbackResult = await db
        .prepare(`
          SELECT 
            c.id,
            c.user_id,
            u.username,
            c.brand,
            c.product,
            c.rating,
            c.review,
            c.image_url,
            c.category,
            c.created_at,
            c.flavor_notes,
            (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count,
            (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) as comment_count
          FROM checkins c
          JOIN users u ON c.user_id = u.id
          ORDER BY c.created_at DESC
          LIMIT 20
        `)
        .all<FeaturedCheckin>();
      
      const fallbackCheckins = fallbackResult.results || [];
      
      if (fallbackCheckins.length === 0) {
        return Response.json({
          featured: null,
          date: today,
        } as FeaturedResponse);
      }
      
      // Use daily hash to pick one
      const hash = getDailyHash(today);
      const index = hash % fallbackCheckins.length;
      
      return Response.json({
        featured: fallbackCheckins[index],
        date: today,
      } as FeaturedResponse);
    }
    
    // Use daily hash to pick one deterministically
    const hash = getDailyHash(today);
    const index = hash % checkins.length;
    
    return Response.json({
      featured: checkins[index],
      date: today,
    } as FeaturedResponse);
  } catch (error) {
    console.error("Featured error:", error);
    return Response.json({ error: "Server error", featured: null, date: "" } as FeaturedResponse, { status: 500 });
  }
}
