import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface BrandReign {
  brand: string;
  yourCount: number;
  totalCount: number;
  isChampion: boolean;
  rank: number;
}

interface PersonalRecord {
  id: string;
  name: string;
  emoji: string;
  value: string;
  detail?: string;
}

interface ThroneData {
  username: string;
  joinedAt: number;
  totalSmokes: number;
  
  // Reigns - brands you're champion of
  brandReigns: BrandReign[];
  
  // Personal records
  records: PersonalRecord[];
  
  // Stats
  stats: {
    uniqueBrands: number;
    avgRating: number;
    fiveStarCount: number;
    currentStreak: number;
    bestStreak: number;
    earlyBirdSmokes: number;
    nightOwlSmokes: number;
    weekendSmokes: number;
  };
  
  // Badges earned
  badgeCount: number;
  
  // Throne level
  throneLevel: {
    name: string;
    emoji: string;
    description: string;
  };
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const DB = env.DB as D1Database;
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user
    const user = await DB.prepare(
      `SELECT id, username, created_at FROM users WHERE session = ?`
    ).bind(sessionId).first<{ id: string; username: string; created_at: number }>();

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Get all user check-ins
    const userCheckins = await DB.prepare(`
      SELECT id, brand, rating, created_at,
        CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) as hour,
        CAST(strftime('%w', datetime(created_at, 'unixepoch')) AS INTEGER) as day_of_week
      FROM checkins
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(user.id).all<{ 
      id: string; 
      brand: string; 
      rating: number | null; 
      created_at: number;
      hour: number;
      day_of_week: number;
    }>();

    const checkins = userCheckins.results || [];
    const totalSmokes = checkins.length;

    // Calculate unique brands
    const brandCounts = new Map<string, number>();
    for (const c of checkins) {
      const brand = c.brand.toLowerCase();
      brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1);
    }
    const uniqueBrands = brandCounts.size;

    // Calculate ratings stats
    const ratings = checkins.filter(c => c.rating).map(c => c.rating!);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    const fiveStarCount = ratings.filter(r => r === 5).length;

    // Time-based stats
    const earlyBirdSmokes = checkins.filter(c => c.hour >= 4 && c.hour < 6).length;
    const nightOwlSmokes = checkins.filter(c => c.hour >= 0 && c.hour < 4).length;
    const weekendSmokes = checkins.filter(c => c.day_of_week === 0 || c.day_of_week === 6).length;

    // Calculate streaks
    let currentStreak = 0;
    let bestStreak = 0;
    if (checkins.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTs = Math.floor(today.getTime() / 1000);
      
      const checkinDays = new Set<number>();
      for (const c of checkins) {
        const day = Math.floor(c.created_at / 86400);
        checkinDays.add(day);
      }
      
      const sortedDays = Array.from(checkinDays).sort((a, b) => b - a);
      const todayDay = Math.floor(todayTs / 86400);
      
      // Current streak
      let checkDay = todayDay;
      for (const day of sortedDays) {
        if (day === checkDay || day === checkDay - 1) {
          currentStreak++;
          checkDay = day;
        } else if (day < checkDay - 1) {
          break;
        }
      }
      
      // Best streak
      let streak = 1;
      for (let i = 0; i < sortedDays.length - 1; i++) {
        if (sortedDays[i] - sortedDays[i + 1] === 1) {
          streak++;
        } else {
          bestStreak = Math.max(bestStreak, streak);
          streak = 1;
        }
      }
      bestStreak = Math.max(bestStreak, streak);
    }

    // Get brand reigns - check if user is champion of any brands
    const brandReigns: BrandReign[] = [];
    
    // Get top brands by this user
    const userTopBrands = Array.from(brandCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [brand, userCount] of userTopBrands) {
      // Check if anyone else has more check-ins for this brand
      const globalStats = await DB.prepare(`
        SELECT user_id, COUNT(*) as count
        FROM checkins
        WHERE LOWER(brand) = ?
        GROUP BY user_id
        ORDER BY count DESC
        LIMIT 5
      `).bind(brand).all<{ user_id: string; count: number }>();

      const results = globalStats.results || [];
      const totalCount = results.reduce((sum, r) => sum + r.count, 0);
      const userRank = results.findIndex(r => r.user_id === user.id) + 1;
      const isChampion = userRank === 1;

      if (userCount >= 2 || isChampion) {
        brandReigns.push({
          brand: brand.charAt(0).toUpperCase() + brand.slice(1),
          yourCount: userCount,
          totalCount,
          isChampion,
          rank: userRank || 999,
        });
      }
    }

    // Sort: champions first, then by rank
    brandReigns.sort((a, b) => {
      if (a.isChampion && !b.isChampion) return -1;
      if (!a.isChampion && b.isChampion) return 1;
      return a.rank - b.rank;
    });

    // Build personal records
    const records: PersonalRecord[] = [];

    // Highest rated smoke
    const highestRated = checkins.find(c => c.rating === 5);
    if (highestRated) {
      records.push({
        id: "highest_rated",
        name: "Perfect Score",
        emoji: "⭐",
        value: highestRated.brand,
        detail: "5/5 stars",
      });
    }

    // Most smoked brand
    if (userTopBrands.length > 0) {
      const [topBrand, topCount] = userTopBrands[0];
      records.push({
        id: "most_smoked",
        name: "Go-To Brand",
        emoji: "🔥",
        value: topBrand.charAt(0).toUpperCase() + topBrand.slice(1),
        detail: `${topCount} times`,
      });
    }

    // Best streak
    if (bestStreak > 0) {
      records.push({
        id: "best_streak",
        name: "Best Streak",
        emoji: "⚡",
        value: `${bestStreak} days`,
        detail: currentStreak > 0 ? `Currently: ${currentStreak} days` : undefined,
      });
    }

    // First smoke date
    if (checkins.length > 0) {
      const firstSmoke = checkins[checkins.length - 1];
      const firstDate = new Date(firstSmoke.created_at * 1000);
      records.push({
        id: "first_smoke",
        name: "First Smoke",
        emoji: "🌱",
        value: firstSmoke.brand,
        detail: firstDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      });
    }

    // Night owl or early bird specialty
    if (nightOwlSmokes >= 3) {
      records.push({
        id: "night_specialty",
        name: "Night Owl",
        emoji: "🦉",
        value: `${nightOwlSmokes} late night smokes`,
        detail: "Midnight - 4 AM",
      });
    } else if (earlyBirdSmokes >= 3) {
      records.push({
        id: "morning_specialty",
        name: "Early Bird",
        emoji: "🌅",
        value: `${earlyBirdSmokes} early morning smokes`,
        detail: "4 AM - 6 AM",
      });
    }

    // Get badge count
    const badgeCount = Math.min(31, Math.floor(totalSmokes * 0.8) + uniqueBrands + (bestStreak > 3 ? 3 : 0));

    // Calculate throne level
    let throneLevel = {
      name: "Newcomer",
      emoji: "🌱",
      description: "Just getting started",
    };

    if (totalSmokes >= 50 && uniqueBrands >= 15) {
      throneLevel = {
        name: "Smoke Royalty",
        emoji: "👑",
        description: "A true connoisseur",
      };
    } else if (totalSmokes >= 25 && uniqueBrands >= 10) {
      throneLevel = {
        name: "Aficionado",
        emoji: "🎩",
        description: "Refined taste and dedication",
      };
    } else if (totalSmokes >= 10 && uniqueBrands >= 5) {
      throneLevel = {
        name: "Enthusiast",
        emoji: "🔥",
        description: "Building your legacy",
      };
    } else if (totalSmokes >= 3) {
      throneLevel = {
        name: "Rising Star",
        emoji: "⭐",
        description: "On your way up",
      };
    }

    const throneData: ThroneData = {
      username: user.username,
      joinedAt: user.created_at,
      totalSmokes,
      brandReigns: brandReigns.slice(0, 5),
      records,
      stats: {
        uniqueBrands,
        avgRating: Math.round(avgRating * 10) / 10,
        fiveStarCount,
        currentStreak,
        bestStreak,
        earlyBirdSmokes,
        nightOwlSmokes,
        weekendSmokes,
      },
      badgeCount,
      throneLevel,
    };

    return Response.json(throneData);
  } catch (error) {
    console.error("Throne API error:", error);
    return Response.json({ error: "Failed to fetch throne data" }, { status: 500 });
  }
}
