import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// Same badge definitions as in /api/badges - we need to know what stats to calculate
const BADGE_IDS = [
  "first_smoke", "early_bird", "night_owl", "weekend_warrior",
  "three_day_streak", "week_streak", "month_streak",
  "getting_started", "regular", "aficionado", "legend", "century_smoker",
  "five_star", "critic", "photographer",
  "first_love", "socialite", "commentator", "explorer",
  "brand_pioneer", "trailblazer", "brand_columbus",
  "comeback_kid", "phoenix",
  "midnight_club", "2am_club", "3am_club", "4am_warrior",
  "night_owl_pro", "insomniac",
  "beloved", "fan_favorite",
  "friend_finder", "crew_builder", "ambassador",
];

export interface BadgeRarity {
  badgeId: string;
  earnedCount: number;
  totalUsers: number;
  rarityPercent: number;
  tier: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

function getRarityTier(percent: number): BadgeRarity["tier"] {
  if (percent > 50) return "common";
  if (percent > 25) return "uncommon";
  if (percent > 10) return "rare";
  if (percent > 5) return "epic";
  return "legendary";
}

export async function GET(): Promise<Response> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Get total user count
    const userCount = await db
      .prepare("SELECT COUNT(*) as count FROM users")
      .first<{ count: number }>();
    
    const totalUsers = userCount?.count || 1; // Avoid division by zero

    // Build rarity data for each badge by counting how many users have earned it
    // We'll run parallel queries for each badge type

    const [
      // Activity badges
      firstSmoke,
      gettingStarted,
      regular,
      aficionado,
      legend,
      centurySmoker,
      // Quality badges
      fiveStar,
      critic,
      photographer,
      // Social badges
      firstLove,
      socialite,
      commentator,
      beloved,
      fanFavorite,
      // Exploration badges
      explorer,
      brandPioneer,
      trailblazer,
      brandColumbus,
      // Time-based badges
      earlyBird,
      nightOwl,
      weekendWarrior,
      midnightClub,
      twoAmClub,
      threeAmClub,
      fourAmWarrior,
      nightOwlPro,
      insomniac,
      // Streak badges
      threeDayStreak,
      weekStreak,
      monthStreak,
      // Comeback badges
      comebackKid,
      phoenix,
      // Referral badges
      friendFinder,
      crewBuilder,
      ambassador,
    ] = await Promise.all([
      // Activity: count users with >= N checkins
      db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM checkins").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM (SELECT user_id FROM checkins GROUP BY user_id HAVING COUNT(*) >= 5)").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM (SELECT user_id FROM checkins GROUP BY user_id HAVING COUNT(*) >= 10)").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM (SELECT user_id FROM checkins GROUP BY user_id HAVING COUNT(*) >= 25)").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM (SELECT user_id FROM checkins GROUP BY user_id HAVING COUNT(*) >= 50)").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM (SELECT user_id FROM checkins GROUP BY user_id HAVING COUNT(*) >= 100)").first<{ count: number }>(),
      
      // Quality badges
      db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM checkins WHERE rating = 5").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM (SELECT user_id FROM checkins WHERE rating IS NOT NULL GROUP BY user_id HAVING COUNT(*) >= 5)").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM (SELECT user_id FROM checkins WHERE image_url IS NOT NULL GROUP BY user_id HAVING COUNT(*) >= 3)").first<{ count: number }>(),
      
      // Social badges
      db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM likes").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM (SELECT follower_id FROM follows GROUP BY follower_id HAVING COUNT(*) >= 3)").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM (SELECT user_id FROM comments GROUP BY user_id HAVING COUNT(*) >= 5)").first<{ count: number }>(),
      db.prepare(`
        SELECT COUNT(*) as count FROM (
          SELECT c.user_id, COUNT(l.id) as likes_received
          FROM checkins c
          LEFT JOIN likes l ON l.checkin_id = c.id
          GROUP BY c.user_id
          HAVING likes_received >= 10
        )
      `).first<{ count: number }>(),
      db.prepare(`
        SELECT COUNT(*) as count FROM (
          SELECT c.user_id, COUNT(l.id) as likes_received
          FROM checkins c
          LEFT JOIN likes l ON l.checkin_id = c.id
          GROUP BY c.user_id
          HAVING likes_received >= 50
        )
      `).first<{ count: number }>(),
      
      // Exploration badges
      db.prepare("SELECT COUNT(*) as count FROM (SELECT user_id FROM checkins GROUP BY user_id HAVING COUNT(DISTINCT brand) >= 5)").first<{ count: number }>(),
      // Brand pioneer - users who were first to log at least 1 brand
      db.prepare(`
        SELECT COUNT(DISTINCT first_user) as count FROM (
          SELECT user_id as first_user, MIN(created_at)
          FROM checkins
          GROUP BY brand
        )
      `).first<{ count: number }>(),
      // Trailblazer - users who were first to log at least 3 brands
      db.prepare(`
        SELECT COUNT(*) as count FROM (
          SELECT first_user, COUNT(*) as brands_discovered
          FROM (
            SELECT user_id as first_user, MIN(created_at)
            FROM checkins
            GROUP BY brand
          )
          GROUP BY first_user
          HAVING brands_discovered >= 3
        )
      `).first<{ count: number }>(),
      // Brand Columbus - users who were first to log at least 10 brands
      db.prepare(`
        SELECT COUNT(*) as count FROM (
          SELECT first_user, COUNT(*) as brands_discovered
          FROM (
            SELECT user_id as first_user, MIN(created_at)
            FROM checkins
            GROUP BY brand
          )
          GROUP BY first_user
          HAVING brands_discovered >= 10
        )
      `).first<{ count: number }>(),
      
      // Time-based badges
      db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM checkins WHERE CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) BETWEEN 4 AND 5").first<{ count: number }>(),
      db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM checkins WHERE CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) BETWEEN 0 AND 3").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM (SELECT user_id FROM checkins WHERE CAST(strftime('%w', created_at, 'unixepoch') AS INTEGER) IN (0, 6) GROUP BY user_id HAVING COUNT(DISTINCT strftime('%Y-%W', created_at, 'unixepoch')) >= 3)").first<{ count: number }>(),
      db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM checkins WHERE CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) = 0").first<{ count: number }>(),
      db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM checkins WHERE CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) = 2").first<{ count: number }>(),
      db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM checkins WHERE CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) = 3").first<{ count: number }>(),
      db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM checkins WHERE CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) = 4").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM (SELECT user_id FROM checkins WHERE CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) BETWEEN 0 AND 3 GROUP BY user_id HAVING COUNT(*) >= 5)").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM (SELECT user_id FROM checkins WHERE CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) BETWEEN 0 AND 3 GROUP BY user_id HAVING COUNT(*) >= 10)").first<{ count: number }>(),
      
      // Streak badges - these are complex because we need to calculate streaks per user
      // For simplicity, we'll estimate based on consecutive check-in days
      // 3-day streak: users who have 3+ checkins on 3 consecutive days
      db.prepare(`
        SELECT COUNT(*) as count FROM (
          SELECT user_id, COUNT(DISTINCT date(created_at, 'unixepoch')) as checkin_days
          FROM checkins
          GROUP BY user_id
          HAVING checkin_days >= 3
        )
      `).first<{ count: number }>(),
      db.prepare(`
        SELECT COUNT(*) as count FROM (
          SELECT user_id, COUNT(DISTINCT date(created_at, 'unixepoch')) as checkin_days
          FROM checkins
          GROUP BY user_id
          HAVING checkin_days >= 7
        )
      `).first<{ count: number }>(),
      db.prepare(`
        SELECT COUNT(*) as count FROM (
          SELECT user_id, COUNT(DISTINCT date(created_at, 'unixepoch')) as checkin_days
          FROM checkins
          GROUP BY user_id
          HAVING checkin_days >= 30
        )
      `).first<{ count: number }>(),
      
      // Comeback badges - harder to calculate accurately, use estimate
      // Users who have a 7+ day gap between checkins
      db.prepare(`
        SELECT COUNT(DISTINCT user_id) as count FROM (
          SELECT 
            c1.user_id,
            c1.created_at as t1,
            MIN(c2.created_at) as t2
          FROM checkins c1
          JOIN checkins c2 ON c1.user_id = c2.user_id AND c2.created_at > c1.created_at
          GROUP BY c1.user_id, c1.id
          HAVING (t2 - t1) >= 604800
        )
      `).first<{ count: number }>(),
      db.prepare(`
        SELECT COUNT(*) as count FROM (
          SELECT user_id, COUNT(*) as comebacks FROM (
            SELECT 
              c1.user_id,
              c1.created_at as t1,
              MIN(c2.created_at) as t2
            FROM checkins c1
            JOIN checkins c2 ON c1.user_id = c2.user_id AND c2.created_at > c1.created_at
            GROUP BY c1.user_id, c1.id
            HAVING (t2 - t1) >= 604800
          )
          GROUP BY user_id
          HAVING comebacks >= 3
        )
      `).first<{ count: number }>(),
      
      // Referral badges
      db.prepare("SELECT COUNT(DISTINCT referred_by) as count FROM users WHERE referred_by IS NOT NULL").first<{ count: number }>(),
      db.prepare(`
        SELECT COUNT(*) as count FROM (
          SELECT referred_by, COUNT(*) as referrals
          FROM users
          WHERE referred_by IS NOT NULL
          GROUP BY referred_by
          HAVING referrals >= 3
        )
      `).first<{ count: number }>(),
      db.prepare(`
        SELECT COUNT(*) as count FROM (
          SELECT referred_by, COUNT(*) as referrals
          FROM users
          WHERE referred_by IS NOT NULL
          GROUP BY referred_by
          HAVING referrals >= 10
        )
      `).first<{ count: number }>(),
    ]);

    // Build the rarity response
    const buildRarity = (badgeId: string, earnedCount: number): BadgeRarity => {
      const rarityPercent = totalUsers > 0 ? Math.round((earnedCount / totalUsers) * 100) : 0;
      return {
        badgeId,
        earnedCount,
        totalUsers,
        rarityPercent,
        tier: getRarityTier(rarityPercent),
      };
    };

    const rarities: BadgeRarity[] = [
      // Activity
      buildRarity("first_smoke", firstSmoke?.count || 0),
      buildRarity("getting_started", gettingStarted?.count || 0),
      buildRarity("regular", regular?.count || 0),
      buildRarity("aficionado", aficionado?.count || 0),
      buildRarity("legend", legend?.count || 0),
      buildRarity("century_smoker", centurySmoker?.count || 0),
      // Quality
      buildRarity("five_star", fiveStar?.count || 0),
      buildRarity("critic", critic?.count || 0),
      buildRarity("photographer", photographer?.count || 0),
      // Social
      buildRarity("first_love", firstLove?.count || 0),
      buildRarity("socialite", socialite?.count || 0),
      buildRarity("commentator", commentator?.count || 0),
      buildRarity("beloved", beloved?.count || 0),
      buildRarity("fan_favorite", fanFavorite?.count || 0),
      // Exploration
      buildRarity("explorer", explorer?.count || 0),
      buildRarity("brand_pioneer", brandPioneer?.count || 0),
      buildRarity("trailblazer", trailblazer?.count || 0),
      buildRarity("brand_columbus", brandColumbus?.count || 0),
      // Time-based
      buildRarity("early_bird", earlyBird?.count || 0),
      buildRarity("night_owl", nightOwl?.count || 0),
      buildRarity("weekend_warrior", weekendWarrior?.count || 0),
      buildRarity("midnight_club", midnightClub?.count || 0),
      buildRarity("2am_club", twoAmClub?.count || 0),
      buildRarity("3am_club", threeAmClub?.count || 0),
      buildRarity("4am_warrior", fourAmWarrior?.count || 0),
      buildRarity("night_owl_pro", nightOwlPro?.count || 0),
      buildRarity("insomniac", insomniac?.count || 0),
      // Streaks
      buildRarity("three_day_streak", threeDayStreak?.count || 0),
      buildRarity("week_streak", weekStreak?.count || 0),
      buildRarity("month_streak", monthStreak?.count || 0),
      // Comebacks
      buildRarity("comeback_kid", comebackKid?.count || 0),
      buildRarity("phoenix", phoenix?.count || 0),
      // Referrals
      buildRarity("friend_finder", friendFinder?.count || 0),
      buildRarity("crew_builder", crewBuilder?.count || 0),
      buildRarity("ambassador", ambassador?.count || 0),
    ];

    // Convert to map for easy lookup
    const rarityMap: Record<string, BadgeRarity> = {};
    for (const r of rarities) {
      rarityMap[r.badgeId] = r;
    }

    return Response.json({
      totalUsers,
      rarities: rarityMap,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Badge rarity error:", error);
    return Response.json(
      { error: "Failed to calculate badge rarity" },
      { status: 500 }
    );
  }
}
