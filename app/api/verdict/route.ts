import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface RatingDistribution {
  rating: number;
  count: number;
}

interface BrandVerdict {
  brand: string;
  yourRating: number;
  communityAvg: number;
  diff: number;
  totalRatings: number;
}

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const now = Math.floor(Date.now() / 1000);
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
      .bind(sessionId, now)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const userId = session.user_id;

    // Get user's rating distribution
    const userDistribution = await db.prepare(`
      SELECT rating, COUNT(*) as count
      FROM checkins
      WHERE user_id = ? AND rating IS NOT NULL
      GROUP BY rating
      ORDER BY rating DESC
    `).bind(userId).all<RatingDistribution>();

    // Get user's average rating
    const userAvgResult = await db.prepare(`
      SELECT AVG(rating) as avg, COUNT(*) as total
      FROM checkins
      WHERE user_id = ? AND rating IS NOT NULL
    `).bind(userId).first<{ avg: number | null; total: number }>();

    // Get community average rating
    const communityAvgResult = await db.prepare(`
      SELECT AVG(rating) as avg, COUNT(*) as total
      FROM checkins
      WHERE rating IS NOT NULL
    `).first<{ avg: number | null; total: number }>();

    // Get brands where user rating differs most from community
    const brandVerdicts = await db.prepare(`
      SELECT 
        c.brand,
        c.rating as yourRating,
        community.avg as communityAvg,
        (c.rating - community.avg) as diff,
        community.total as totalRatings
      FROM checkins c
      JOIN (
        SELECT brand, AVG(rating) as avg, COUNT(*) as total
        FROM checkins
        WHERE rating IS NOT NULL
        GROUP BY brand
        HAVING COUNT(*) >= 2
      ) community ON c.brand = community.brand
      WHERE c.user_id = ? AND c.rating IS NOT NULL
      ORDER BY ABS(c.rating - community.avg) DESC
      LIMIT 5
    `).bind(userId).all<BrandVerdict>();

    // Get user's highest and lowest rated brands
    const extremes = await db.prepare(`
      SELECT brand, rating, product
      FROM checkins
      WHERE user_id = ? AND rating IS NOT NULL
      ORDER BY rating DESC, created_at DESC
    `).bind(userId).all<{ brand: string; rating: number; product: string | null }>();

    const userAvg = userAvgResult?.avg || 0;
    const communityAvg = communityAvgResult?.avg || 0;
    const totalUserRatings = userAvgResult?.total || 0;
    const totalCommunityRatings = communityAvgResult?.total || 0;

    // Determine rater type
    let raterType: string;
    let raterEmoji: string;
    let raterDesc: string;
    
    const diff = userAvg - communityAvg;
    
    if (totalUserRatings < 3) {
      raterType = "Newcomer";
      raterEmoji = "🌱";
      raterDesc = "Log a few more smokes to see your rating style!";
    } else if (diff > 0.5) {
      raterType = "Generous Rater";
      raterEmoji = "😊";
      raterDesc = "You tend to see the good in every smoke. Keep spreading the love!";
    } else if (diff > 0.2) {
      raterType = "Optimist";
      raterEmoji = "👍";
      raterDesc = "You're slightly more generous than average. Glass half full!";
    } else if (diff < -0.5) {
      raterType = "Harsh Critic";
      raterEmoji = "🧐";
      raterDesc = "You have high standards. Only the best cigars impress you!";
    } else if (diff < -0.2) {
      raterType = "Discerning Palate";
      raterEmoji = "🎯";
      raterDesc = "You're a bit more critical than average. You know what you like!";
    } else {
      raterType = "Balanced Judge";
      raterEmoji = "⚖️";
      raterDesc = "Your ratings align closely with the community. Great taste!";
    }

    // Get 5-star percentage
    const fiveStarCount = userDistribution.results?.find(d => d.rating === 5)?.count || 0;
    const fiveStarPercent = totalUserRatings > 0 ? Math.round((fiveStarCount / totalUserRatings) * 100) : 0;

    // Most generous and harshest compared to community
    const agreements = brandVerdicts.results?.filter(v => Math.abs(v.diff) < 0.5) || [];
    const disagreements = brandVerdicts.results?.filter(v => Math.abs(v.diff) >= 0.5) || [];

    return NextResponse.json({
      userAvg: Math.round(userAvg * 10) / 10,
      communityAvg: Math.round(communityAvg * 10) / 10,
      totalUserRatings,
      totalCommunityRatings,
      distribution: userDistribution.results || [],
      raterType,
      raterEmoji,
      raterDesc,
      fiveStarPercent,
      highestRated: extremes.results?.[0] || null,
      lowestRated: extremes.results?.[extremes.results.length - 1] || null,
      brandVerdicts: brandVerdicts.results || [],
      agreements,
      disagreements,
    });
  } catch (error) {
    console.error("Verdict error:", error);
    return NextResponse.json({ error: "Failed to get verdict" }, { status: 500 });
  }
}
