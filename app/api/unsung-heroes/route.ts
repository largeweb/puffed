import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface UnsungCheckin {
  id: string;
  username: string;
  userId: string;
  brand: string;
  product?: string;
  category: string;
  rating?: number;
  review?: string;
  imageUrl?: string;
  createdAt: number;
  timeAgo: string;
  hoursOld: number;
}

interface UnsungHeroesResponse {
  checkins: UnsungCheckin[];
  stats: {
    totalUnsung: number;
    oldestUnsungHours: number;
    avgAgeHours: number;
  };
  yourImpact?: {
    likesGivenToday: number;
    heroesHelped: number;
  };
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

export async function GET(request: NextRequest): Promise<NextResponse<UnsungHeroesResponse | { error: string }>> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Get session for user-specific stats
    const sessionId = request.cookies.get("session")?.value;
    let currentUserId: string | null = null;

    if (sessionId) {
      const sessionQuery = await db.prepare(`
        SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?
      `).bind(sessionId, Math.floor(Date.now() / 1000)).first();
      if (sessionQuery) {
        currentUserId = (sessionQuery as { user_id: string }).user_id;
      }
    }

    const now = Math.floor(Date.now() / 1000);

    // Find check-ins with ZERO engagement (no likes, no reactions, no comments)
    // Only from the last 7 days to keep it fresh
    const unsungQuery = await db.prepare(`
      SELECT 
        c.id,
        c.user_id,
        u.username,
        c.brand,
        c.product,
        c.category,
        c.rating,
        c.review,
        c.image_url,
        c.created_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN likes l ON c.id = l.checkin_id
      LEFT JOIN reactions r ON c.id = r.checkin_id
      LEFT JOIN comments cm ON c.id = cm.checkin_id
      WHERE c.created_at > ?
      GROUP BY c.id
      HAVING COUNT(l.id) = 0 AND COUNT(r.id) = 0 AND COUNT(cm.id) = 0
      ORDER BY c.created_at DESC
      LIMIT 20
    `).bind(now - 7 * 86400).all();

    const checkins: UnsungCheckin[] = (unsungQuery.results || []).map((row) => {
      const r = row as {
        id: string;
        user_id: string;
        username: string;
        brand: string;
        product: string | null;
        category: string | null;
        rating: number | null;
        review: string | null;
        image_url: string | null;
        created_at: number;
      };
      const hoursOld = Math.floor((now - r.created_at) / 3600);
      return {
        id: r.id,
        userId: r.user_id,
        username: r.username,
        brand: r.brand,
        product: r.product || undefined,
        category: r.category || "cigar",
        rating: r.rating || undefined,
        review: r.review || undefined,
        imageUrl: r.image_url || undefined,
        createdAt: r.created_at,
        timeAgo: getTimeAgo(r.created_at),
        hoursOld,
      };
    });

    // Calculate stats
    const totalUnsung = checkins.length;
    const oldestUnsungHours = checkins.length > 0 
      ? Math.max(...checkins.map(c => c.hoursOld))
      : 0;
    const avgAgeHours = checkins.length > 0
      ? Math.round(checkins.reduce((sum, c) => sum + c.hoursOld, 0) / checkins.length)
      : 0;

    // Get user's impact stats (if logged in)
    let yourImpact: { likesGivenToday: number; heroesHelped: number } | undefined;
    if (currentUserId) {
      const todayStart = now - (now % 86400); // Start of today UTC
      
      const likesTodayQuery = await db.prepare(`
        SELECT COUNT(*) as count FROM likes
        WHERE user_id = ? AND created_at >= ?
      `).bind(currentUserId, todayStart).first();
      
      const likesGivenToday = (likesTodayQuery as { count: number } | null)?.count || 0;
      
      // Count how many previously-unsung check-ins user has liked
      // (Check-ins where their like was the first engagement)
      const heroesQuery = await db.prepare(`
        SELECT COUNT(DISTINCT l.checkin_id) as count
        FROM likes l
        WHERE l.user_id = ?
        AND l.id = (
          SELECT MIN(l2.id) FROM likes l2 WHERE l2.checkin_id = l.checkin_id
        )
      `).bind(currentUserId).first();
      
      const heroesHelped = (heroesQuery as { count: number } | null)?.count || 0;
      
      yourImpact = {
        likesGivenToday,
        heroesHelped,
      };
    }

    return NextResponse.json({
      checkins,
      stats: {
        totalUnsung,
        oldestUnsungHours,
        avgAgeHours,
      },
      yourImpact,
    });

  } catch (error) {
    console.error("Unsung heroes error:", error);
    return NextResponse.json({ error: "Failed to load unsung heroes" }, { status: 500 });
  }
}
