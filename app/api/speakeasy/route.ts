import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Get current user
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;
    let currentUserId: number | null = null;

    if (sessionToken) {
      const userResult = await db
        .prepare("SELECT id FROM users WHERE session = ?")
        .bind(sessionToken)
        .first<{ id: number }>();
      if (userResult) currentUserId = userResult.id;
    }

    // Check if user has access (5+ check-ins)
    let hasAccess = false;
    let userCheckins = 0;
    let myMembership: {
      rank: string;
      checkins: number;
      memberSince: string;
      secretName: string;
    } | null = null;

    if (currentUserId) {
      const countResult = await db
        .prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ?")
        .bind(currentUserId)
        .first<{ count: number }>();
      userCheckins = countResult?.count || 0;
      hasAccess = userCheckins >= 5;

      if (hasAccess) {
        const firstCheckin = await db
          .prepare("SELECT created_at FROM checkins WHERE user_id = ? ORDER BY created_at ASC LIMIT 1")
          .bind(currentUserId)
          .first<{ created_at: string }>();

        // Generate secret speakeasy name based on user habits
        const topBrand = await db
          .prepare(`
            SELECT brand, COUNT(*) as count 
            FROM checkins WHERE user_id = ? 
            GROUP BY brand ORDER BY count DESC LIMIT 1
          `)
          .bind(currentUserId)
          .first<{ brand: string }>();

        const secretNames = [
          "The Shadow",
          "Velvet",
          "Whiskey",
          "Midnight",
          "The Duke",
          "Silk",
          "Ember",
          "The Phantom",
          "Ash",
          "Smokescreen",
        ];
        const secretName = secretNames[currentUserId % secretNames.length];

        // Determine rank based on check-ins
        let rank = "Newcomer";
        if (userCheckins >= 50) rank = "Connoisseur";
        else if (userCheckins >= 25) rank = "Regular";
        else if (userCheckins >= 10) rank = "Member";

        myMembership = {
          rank,
          checkins: userCheckins,
          memberSince: firstCheckin?.created_at?.split("T")[0] || "Unknown",
          secretName,
        };
      }
    }

    if (!hasAccess) {
      return NextResponse.json({
        hasAccess: false,
        checkinsNeeded: 5 - userCheckins,
        currentCheckins: userCheckins,
      });
    }

    // Get elite members (top smokers with 5+ check-ins)
    const eliteMembers = await db
      .prepare(`
        SELECT 
          u.username,
          COUNT(c.id) as totalSmokes,
          AVG(c.rating) as avgRating,
          (SELECT brand FROM checkins WHERE user_id = u.id GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1) as signatureBrand
        FROM users u
        JOIN checkins c ON c.user_id = u.id
        GROUP BY u.id
        HAVING COUNT(c.id) >= 5
        ORDER BY COUNT(c.id) DESC
        LIMIT 10
      `)
      .all<{
        username: string;
        totalSmokes: number;
        avgRating: number;
        signatureBrand: string | null;
      }>();

    // Get secret recommendations (highest rated cigars by elite members)
    const secretPicks = await db
      .prepare(`
        SELECT 
          c.brand,
          c.product,
          AVG(c.rating) as avgRating,
          COUNT(*) as eliteCount
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE c.user_id IN (
          SELECT user_id FROM checkins GROUP BY user_id HAVING COUNT(*) >= 5
        )
        AND c.rating >= 4
        GROUP BY c.brand, c.product
        ORDER BY AVG(c.rating) DESC, COUNT(*) DESC
        LIMIT 5
      `)
      .all<{
        brand: string;
        product: string | null;
        avgRating: number;
        eliteCount: number;
      }>();

    // Get recent elite check-ins (from members only)
    const recentElite = await db
      .prepare(`
        SELECT 
          u.username,
          c.brand,
          c.product,
          c.rating,
          c.review,
          c.created_at
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE c.user_id IN (
          SELECT user_id FROM checkins GROUP BY user_id HAVING COUNT(*) >= 5
        )
        ORDER BY c.created_at DESC
        LIMIT 8
      `)
      .all<{
        username: string;
        brand: string;
        product: string | null;
        rating: number;
        review: string | null;
        created_at: string;
      }>();

    // Speakeasy stats
    const stats = await db
      .prepare(`
        SELECT 
          COUNT(DISTINCT user_id) as totalMembers,
          COUNT(*) as memberCheckins,
          AVG(rating) as avgRating
        FROM checkins
        WHERE user_id IN (
          SELECT user_id FROM checkins GROUP BY user_id HAVING COUNT(*) >= 5
        )
      `)
      .first<{
        totalMembers: number;
        memberCheckins: number;
        avgRating: number;
      }>();

    // Tonight's secret password (changes daily)
    const today = new Date();
    const passwords = [
      "Velvet Smoke",
      "Midnight Ember",
      "The Cedar Room",
      "Ash & Oak",
      "Silent Ring",
      "Golden Leaf",
      "The Inner Circle",
    ];
    const todayPassword = passwords[today.getDay()];

    // Secret quote of the day
    const quotes = [
      "A good cigar is like a beautiful woman: she's easy on the eyes, fills a basic need, and leaves you wanting more.",
      "The cigar is a solitary pleasure. The perfect end to a perfect day.",
      "In the speakeasy, every smoke tells a secret.",
      "Some doors only open for those who've earned the key.",
      "The best cigars are shared among those who understand.",
      "Behind closed doors, legends are made.",
      "We don't speak of what happens here. We simply enjoy it.",
    ];
    const todayQuote = quotes[today.getDate() % quotes.length];

    return NextResponse.json({
      hasAccess: true,
      myMembership,
      eliteMembers: eliteMembers.results || [],
      secretPicks: secretPicks.results || [],
      recentElite: recentElite.results || [],
      stats: {
        totalMembers: stats?.totalMembers || 0,
        memberCheckins: stats?.memberCheckins || 0,
        avgRating: stats?.avgRating || 0,
      },
      todayPassword,
      todayQuote,
    });
  } catch (error) {
    console.error("Speakeasy error:", error);
    return NextResponse.json({ error: "Failed to load speakeasy" }, { status: 500 });
  }
}
