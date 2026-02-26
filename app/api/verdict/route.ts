import { getSession } from "@/lib/auth";
import type { NextRequest } from "next/server";

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
  const { user, DB } = await getSession(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's rating distribution
  const userDistribution = await DB.prepare(`
    SELECT rating, COUNT(*) as count
    FROM checkins
    WHERE user_id = ? AND rating IS NOT NULL
    GROUP BY rating
    ORDER BY rating DESC
  `).bind(user.id).all<RatingDistribution>();

  // Get user's average rating
  const userAvgResult = await DB.prepare(`
    SELECT AVG(rating) as avg, COUNT(*) as total
    FROM checkins
    WHERE user_id = ? AND rating IS NOT NULL
  `).bind(user.id).first<{ avg: number | null; total: number }>();

  // Get community average rating
  const communityAvgResult = await DB.prepare(`
    SELECT AVG(rating) as avg, COUNT(*) as total
    FROM checkins
    WHERE rating IS NOT NULL
  `).first<{ avg: number | null; total: number }>();

  // Get brands where user rating differs most from community
  const brandVerdicts = await DB.prepare(`
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
  `).bind(user.id).all<BrandVerdict>();

  // Get user's highest and lowest rated brands
  const extremes = await DB.prepare(`
    SELECT brand, rating, product
    FROM checkins
    WHERE user_id = ? AND rating IS NOT NULL
    ORDER BY rating DESC, created_at DESC
  `).bind(user.id).all<{ brand: string; rating: number; product: string | null }>();

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

  return Response.json({
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
}
