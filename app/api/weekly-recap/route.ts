import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

export interface WeeklyRecap {
  weekStats: {
    checkins: number;
    uniqueBrands: number;
    avgRating: number | null;
    totalSmokeTime: number; // minutes
    topBrand: string | null;
    topBrandCount: number;
    newBrands: string[];
  };
  engagement: {
    likesReceived: number;
    reactionsReceived: number;
    commentsReceived: number;
    newFollowers: number;
  };
  topCheckin: {
    id: string;
    brand: string;
    rating: number | null;
    imageUrl: string | null;
    likes: number;
    reactions: number;
    comments: number;
  } | null;
  highlights: string[];
  shareText: string;
  isSunday: boolean;
}

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Session expired" }, { status: 401 });
    }

    const userId = session.user_id;
    
    // Get username for share text
    const userData = await db
      .prepare("SELECT username FROM users WHERE id = ?")
      .bind(userId)
      .first<{ username: string }>();
    
    const username = userData?.username || "User";

    // Check if it's Sunday (0 = Sunday in getDay())
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    // Show recap on Saturday night (after 6pm) and all day Sunday
    // Also show on Friday night and Monday for testing/flexibility
    const isSunday = dayOfWeek === 0 || dayOfWeek === 6;

    const nowTs = Math.floor(Date.now() / 1000);
    const todayStart = nowTs - (nowTs % 86400);
    const weekStart = todayStart - (7 * 86400);

    // Week's check-ins
    const weekCheckins = await db
      .prepare(`
        SELECT 
          COUNT(*) as count, 
          AVG(rating) as avg_rating,
          SUM(smoke_time_mins) as total_smoke_time
        FROM checkins 
        WHERE user_id = ? AND created_at >= ?
      `)
      .bind(userId, weekStart)
      .first<{ count: number; avg_rating: number | null; total_smoke_time: number | null }>();

    // Unique brands this week
    const uniqueBrands = await db
      .prepare(`
        SELECT COUNT(DISTINCT brand) as count
        FROM checkins 
        WHERE user_id = ? AND created_at >= ?
      `)
      .bind(userId, weekStart)
      .first<{ count: number }>();

    // Top brand this week
    const topBrand = await db
      .prepare(`
        SELECT brand, COUNT(*) as count
        FROM checkins 
        WHERE user_id = ? AND created_at >= ?
        GROUP BY brand
        ORDER BY count DESC
        LIMIT 1
      `)
      .bind(userId, weekStart)
      .first<{ brand: string; count: number }>();

    // New brands tried this week (first time ever)
    const newBrandsResult = await db
      .prepare(`
        SELECT DISTINCT c1.brand
        FROM checkins c1
        WHERE c1.user_id = ? 
          AND c1.created_at >= ?
          AND NOT EXISTS (
            SELECT 1 FROM checkins c2 
            WHERE c2.user_id = c1.user_id 
              AND c2.brand = c1.brand 
              AND c2.created_at < ?
          )
        LIMIT 5
      `)
      .bind(userId, weekStart, weekStart)
      .all<{ brand: string }>();

    const newBrands = newBrandsResult.results?.map(r => r.brand) || [];

    // Engagement received this week
    const likesReceived = await db
      .prepare(`
        SELECT COUNT(*) as count
        FROM likes l
        JOIN checkins c ON l.checkin_id = c.id
        WHERE c.user_id = ? AND l.created_at >= ?
      `)
      .bind(userId, weekStart)
      .first<{ count: number }>();

    const reactionsReceived = await db
      .prepare(`
        SELECT COUNT(*) as count
        FROM reactions r
        JOIN checkins c ON r.checkin_id = c.id
        WHERE c.user_id = ? AND r.created_at >= ?
      `)
      .bind(userId, weekStart)
      .first<{ count: number }>();

    const commentsReceived = await db
      .prepare(`
        SELECT COUNT(*) as count
        FROM comments cm
        JOIN checkins c ON cm.checkin_id = c.id
        WHERE c.user_id = ? AND cm.created_at >= ? AND cm.user_id != ?
      `)
      .bind(userId, weekStart, userId)
      .first<{ count: number }>();

    const newFollowers = await db
      .prepare(`
        SELECT COUNT(*) as count
        FROM follows
        WHERE following_id = ? AND created_at >= ?
      `)
      .bind(userId, weekStart)
      .first<{ count: number }>();

    // Top check-in this week (most engagement)
    const topCheckinResult = await db
      .prepare(`
        SELECT 
          c.id,
          c.brand,
          c.rating,
          c.image_url,
          (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as likes,
          (SELECT COUNT(*) FROM reactions WHERE checkin_id = c.id) as reactions,
          (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) as comments
        FROM checkins c
        WHERE c.user_id = ? AND c.created_at >= ?
        ORDER BY (
          (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) +
          (SELECT COUNT(*) FROM reactions WHERE checkin_id = c.id) +
          (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id)
        ) DESC
        LIMIT 1
      `)
      .bind(userId, weekStart)
      .first<{ 
        id: string; 
        brand: string; 
        rating: number | null; 
        image_url: string | null;
        likes: number;
        reactions: number;
        comments: number;
      }>();

    // Generate highlights
    const highlights: string[] = [];
    const checkinCount = weekCheckins?.count || 0;
    const totalEngagement = (likesReceived?.count || 0) + (reactionsReceived?.count || 0) + (commentsReceived?.count || 0);

    if (checkinCount > 0) {
      highlights.push(`🚬 ${checkinCount} smoke session${checkinCount !== 1 ? 's' : ''} logged`);
    }
    if (newBrands.length > 0) {
      highlights.push(`✨ ${newBrands.length} new brand${newBrands.length !== 1 ? 's' : ''} tried`);
    }
    if (totalEngagement > 0) {
      highlights.push(`💬 ${totalEngagement} interaction${totalEngagement !== 1 ? 's' : ''} on your posts`);
    }
    if ((newFollowers?.count || 0) > 0) {
      highlights.push(`👥 ${newFollowers!.count} new follower${newFollowers!.count !== 1 ? 's' : ''}`);
    }
    if ((weekCheckins?.avg_rating ?? 0) >= 4) {
      highlights.push(`⭐ Avg rating: ${weekCheckins?.avg_rating?.toFixed(1)}/5`);
    }

    // Generate share text
    let shareText = `📊 My Week on Puffed\n\n`;
    if (checkinCount > 0) {
      shareText += `🚬 ${checkinCount} smoke${checkinCount !== 1 ? 's' : ''}\n`;
    }
    if ((uniqueBrands?.count || 0) > 0) {
      shareText += `🏷️ ${uniqueBrands?.count} brand${(uniqueBrands?.count || 0) !== 1 ? 's' : ''}\n`;
    }
    if (topBrand?.brand) {
      shareText += `👑 Fave: ${topBrand.brand}\n`;
    }
    if (newBrands.length > 0) {
      shareText += `✨ New: ${newBrands.slice(0, 2).join(', ')}\n`;
    }
    shareText += `\n🔥 Track your smokes on puffed.pages.dev`;

    const recap: WeeklyRecap = {
      weekStats: {
        checkins: checkinCount,
        uniqueBrands: uniqueBrands?.count || 0,
        avgRating: weekCheckins?.avg_rating ?? null,
        totalSmokeTime: weekCheckins?.total_smoke_time || 0,
        topBrand: topBrand?.brand || null,
        topBrandCount: topBrand?.count || 0,
        newBrands,
      },
      engagement: {
        likesReceived: likesReceived?.count || 0,
        reactionsReceived: reactionsReceived?.count || 0,
        commentsReceived: commentsReceived?.count || 0,
        newFollowers: newFollowers?.count || 0,
      },
      topCheckin: topCheckinResult ? {
        id: topCheckinResult.id,
        brand: topCheckinResult.brand,
        rating: topCheckinResult.rating,
        imageUrl: topCheckinResult.image_url,
        likes: topCheckinResult.likes,
        reactions: topCheckinResult.reactions,
        comments: topCheckinResult.comments,
      } : null,
      highlights,
      shareText,
      isSunday,
    };

    return Response.json(recap);
  } catch (error) {
    console.error("Weekly recap error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
