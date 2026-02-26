import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface RoastData {
  username: string;
  roasts: string[];
  stats: {
    totalSmokes: number;
    favoriteBrand: string | null;
    avgRating: number | null;
    peakHour: number | null;
    uniqueBrands: number;
    lateNightSmokes: number;
    earlyMorningSmokes: number;
    fiveStarCount: number;
    oneStarCount: number;
    photoCount: number;
    longestBrandStreak: { brand: string; count: number } | null;
    daysActive: number;
  };
  roastLevel: "mild" | "medium" | "spicy";
  generatedAt: number;
  error?: string;
}

// Roast templates based on different smoking behaviors
function generateRoasts(stats: RoastData["stats"], username: string): string[] {
  const roasts: string[] = [];

  // Brand loyalty roasts
  if (stats.longestBrandStreak && stats.longestBrandStreak.count >= 5) {
    roasts.push(`${stats.longestBrandStreak.count} ${stats.longestBrandStreak.brand}s in a row? We get it, you found your soulmate. Maybe try a second date with something else? 💔`);
  }

  if (stats.uniqueBrands === 1 && stats.totalSmokes >= 5) {
    roasts.push(`Only one brand ever? That's not loyalty, that's a hostage situation. Free yourself! 🔓`);
  }

  if (stats.uniqueBrands >= 10) {
    roasts.push(`${stats.uniqueBrands} different brands? Can't commit to anything, huh? We've seen your type before. 🦋`);
  }

  // Rating roasts
  if (stats.avgRating && stats.avgRating >= 4.8) {
    roasts.push(`Average rating: ${stats.avgRating.toFixed(1)} stars. Either you have impeccable taste or you're just afraid of commitment to honest reviews. 🌟`);
  }

  if (stats.avgRating && stats.avgRating <= 2.5) {
    roasts.push(`${stats.avgRating.toFixed(1)} average rating? Why do you keep smoking things you hate? This is concerning behavior. 😬`);
  }

  if (stats.fiveStarCount === stats.totalSmokes && stats.totalSmokes >= 3) {
    roasts.push(`Every smoke is 5 stars? You're either living your best life or completely delusional. No in-between. ⭐`);
  }

  if (stats.oneStarCount >= 3) {
    roasts.push(`${stats.oneStarCount} one-star smokes? At this point you're paying to be disappointed. Therapy might be cheaper. 💸`);
  }

  // Time-based roasts
  if (stats.lateNightSmokes >= 5) {
    roasts.push(`${stats.lateNightSmokes} late night smokes? The 3 AM smoke isn't a vibe, it's a cry for help. Go to bed. 🌙`);
  }

  if (stats.earlyMorningSmokes >= 3) {
    roasts.push(`Smoking before 6 AM? That's not an "early bird" thing, that's "never went to sleep" energy. ☀️`);
  }

  if (stats.peakHour !== null) {
    const hour = stats.peakHour;
    if (hour >= 0 && hour < 5) {
      roasts.push(`Peak smoking hour: ${hour}:00 AM. The insomnia is strong with this one. 👁️`);
    } else if (hour >= 12 && hour < 14) {
      roasts.push(`Peak smoking hour: lunch time. You're the coworker everyone avoids after break. Just saying. 🥪`);
    }
  }

  // Volume roasts
  if (stats.totalSmokes >= 50) {
    roasts.push(`${stats.totalSmokes} smokes logged? At this point you should be getting a bulk discount. 📦`);
  }

  if (stats.totalSmokes >= 100) {
    roasts.push(`Century smoker status achieved. Your lungs are sending a formal complaint to HR. 📝`);
  }

  if (stats.totalSmokes <= 3 && stats.daysActive >= 7) {
    roasts.push(`${stats.totalSmokes} smokes in ${stats.daysActive} days? This app was free to download, you know. Use it! 📱`);
  }

  // Photo roasts
  if (stats.photoCount === 0 && stats.totalSmokes >= 5) {
    roasts.push(`${stats.totalSmokes} smokes and zero photos? We know you're not actually smoking anything fancy. The evidence speaks. 📷`);
  }

  if (stats.photoCount >= 20) {
    roasts.push(`${stats.photoCount} smoke pics? This isn't Instagram, but go off, influencer. ✨`);
  }

  // Favorite brand roasts
  if (stats.favoriteBrand) {
    const brand = stats.favoriteBrand.toLowerCase();
    if (brand.includes("american spirit")) {
      roasts.push(`American Spirit devotee? We can smell the "I only shop at Whole Foods" energy from here. 🌿`);
    }
    if (brand.includes("newport")) {
      roasts.push(`Newport fan? Respectable. Classic. A person of culture. (No roast, just facts.) 💯`);
    }
    if (brand.includes("marlboro")) {
      roasts.push(`Marlboro? Going for that classic cowboy aesthetic? Yeehaw, partner. 🤠`);
    }
  }

  // Fallback roasts if we don't have enough
  if (roasts.length < 3) {
    roasts.push(`${username}'s smoking journey is... unique. Let's leave it at that. 😅`);
    roasts.push(`We analyzed your smoke data. The algorithm is concerned. 🤖`);
    roasts.push(`Keep logging! The more data, the better the roasts. We're just warming up. 🔥`);
  }

  // Shuffle and return top 3-5 roasts
  const shuffled = roasts.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(5, Math.max(3, roasts.length)));
}

export async function GET(request: NextRequest): Promise<NextResponse<RoastData>> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const { searchParams } = new URL(request.url);
    let username = searchParams.get("username");

    // Get current user if no username
    if (!username) {
      const sessionId = request.cookies.get("session")?.value;
      if (!sessionId) {
        return NextResponse.json({ error: "Not authenticated" } as RoastData, { status: 401 });
      }

      const session = await db.prepare(
        "SELECT user_id FROM sessions WHERE id = ? AND expires_at > unixepoch()"
      ).bind(sessionId).first<{ user_id: string }>();

      if (!session) {
        return NextResponse.json({ error: "Invalid session" } as RoastData, { status: 401 });
      }

      const user = await db.prepare("SELECT username FROM users WHERE id = ?")
        .bind(session.user_id).first<{ username: string }>();

      if (!user) {
        return NextResponse.json({ error: "User not found" } as RoastData, { status: 404 });
      }

      username = user.username;
    }

    // Get user
    const user = await db.prepare("SELECT id, username, created_at FROM users WHERE LOWER(username) = LOWER(?)")
      .bind(username).first<{ id: string; username: string; created_at: number }>();

    if (!user) {
      return NextResponse.json({ error: "User not found" } as RoastData, { status: 404 });
    }

    // Gather all stats needed for roasting
    const basicStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_smokes,
        AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating,
        COUNT(DISTINCT brand) as unique_brands,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star_count,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star_count,
        SUM(CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END) as photo_count
      FROM checkins
      WHERE user_id = ?
    `).bind(user.id).first<{
      total_smokes: number;
      avg_rating: number | null;
      unique_brands: number;
      five_star_count: number;
      one_star_count: number;
      photo_count: number;
    }>();

    // Favorite brand
    const favBrand = await db.prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins
      WHERE user_id = ?
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 1
    `).bind(user.id).first<{ brand: string; count: number }>();

    // Longest brand streak (consecutive same-brand checkins)
    const allCheckins = await db.prepare(`
      SELECT brand FROM checkins WHERE user_id = ? ORDER BY created_at ASC
    `).bind(user.id).all<{ brand: string }>();

    let longestStreak: { brand: string; count: number } | null = null;
    if (allCheckins.results && allCheckins.results.length > 0) {
      let currentBrand = allCheckins.results[0].brand;
      let currentCount = 1;
      let maxBrand = currentBrand;
      let maxCount = 1;

      for (let i = 1; i < allCheckins.results.length; i++) {
        if (allCheckins.results[i].brand === currentBrand) {
          currentCount++;
          if (currentCount > maxCount) {
            maxCount = currentCount;
            maxBrand = currentBrand;
          }
        } else {
          currentBrand = allCheckins.results[i].brand;
          currentCount = 1;
        }
      }
      if (maxCount >= 3) {
        longestStreak = { brand: maxBrand, count: maxCount };
      }
    }

    // Time-based stats
    const timeStats = await db.prepare(`
      SELECT 
        SUM(CASE WHEN CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) >= 0 
          AND CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) < 4 THEN 1 ELSE 0 END) as late_night,
        SUM(CASE WHEN CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) >= 4 
          AND CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) < 6 THEN 1 ELSE 0 END) as early_morning
      FROM checkins
      WHERE user_id = ?
    `).bind(user.id).first<{ late_night: number; early_morning: number }>();

    // Peak hour
    const peakHourResult = await db.prepare(`
      SELECT CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) as hour, COUNT(*) as count
      FROM checkins
      WHERE user_id = ?
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `).bind(user.id).first<{ hour: number; count: number }>();

    // Days active
    const daysActive = Math.max(1, Math.floor((Date.now() / 1000 - user.created_at) / 86400));

    const stats: RoastData["stats"] = {
      totalSmokes: basicStats?.total_smokes || 0,
      favoriteBrand: favBrand?.brand || null,
      avgRating: basicStats?.avg_rating || null,
      peakHour: peakHourResult?.hour ?? null,
      uniqueBrands: basicStats?.unique_brands || 0,
      lateNightSmokes: timeStats?.late_night || 0,
      earlyMorningSmokes: timeStats?.early_morning || 0,
      fiveStarCount: basicStats?.five_star_count || 0,
      oneStarCount: basicStats?.one_star_count || 0,
      photoCount: basicStats?.photo_count || 0,
      longestBrandStreak: longestStreak,
      daysActive,
    };

    const roasts = generateRoasts(stats, user.username);

    // Determine roast level based on how harsh the roasts are
    const roastLevel = roasts.length >= 4 ? "spicy" : roasts.length >= 3 ? "medium" : "mild";

    return NextResponse.json({
      username: user.username,
      roasts,
      stats,
      roastLevel,
      generatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Smoke roast error:", error);
    return NextResponse.json({ error: "Failed to generate roasts" } as RoastData, { status: 500 });
  }
}
