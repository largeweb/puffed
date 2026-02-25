import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

// Fortune categories with themed predictions
const FORTUNE_TEMPLATES = {
  flavor: [
    { fortune: "The smoke gods favor bold flavors today. Seek out pepper and spice.", lucky: "Pepper", emoji: "🌶️" },
    { fortune: "A creamy, smooth smoke will bring unexpected good fortune.", lucky: "Cream", emoji: "🍦" },
    { fortune: "Woody notes will ground you and bring clarity to a difficult decision.", lucky: "Cedar", emoji: "🌲" },
    { fortune: "Today calls for something sweet. Let honey and vanilla guide your choice.", lucky: "Honey", emoji: "🍯" },
    { fortune: "Earth tones will connect you to ancient wisdom. Choose something rustic.", lucky: "Earth", emoji: "🌍" },
    { fortune: "A chocolatey smoke will sweeten your evening and attract positive energy.", lucky: "Chocolate", emoji: "🍫" },
    { fortune: "Coffee notes will sharpen your mind. Great ideas await after your smoke.", lucky: "Coffee", emoji: "☕" },
    { fortune: "Leather and tobacco promise a classic, refined experience today.", lucky: "Leather", emoji: "🪶" },
  ],
  timing: [
    { fortune: "The morning smoke brings fresh perspectives. Rise early tomorrow.", emoji: "🌅" },
    { fortune: "Your peak smoking hour approaches. The stars align for a perfect session.", emoji: "✨" },
    { fortune: "A late night smoke will reveal secrets hidden in the shadows.", emoji: "🌙" },
    { fortune: "The afternoon holds promise. Take a break and light up.", emoji: "☀️" },
    { fortune: "Weekend energies are strong. A celebratory smoke is destined.", emoji: "🎉" },
  ],
  social: [
    { fortune: "Share a smoke with a friend this week. Good conversations await.", emoji: "👥" },
    { fortune: "Your smoke photos will attract admirers. Post that check-in!", emoji: "📸" },
    { fortune: "A fellow smoker will seek your wisdom. Be generous with recommendations.", emoji: "🎓" },
    { fortune: "The community needs your voice. Leave a thoughtful comment today.", emoji: "💬" },
    { fortune: "Your taste influences others. Your next review matters.", emoji: "⭐" },
  ],
  brand: [
    { fortune: "Return to an old favorite. Nostalgia holds hidden treasures.", emoji: "💝" },
    { fortune: "Venture into unexplored territory. A new brand calls to you.", emoji: "🗺️" },
    { fortune: "Your go-to brand has more to teach you. Look deeper.", emoji: "🔍" },
    { fortune: "A premium smoke is in your future. Treat yourself.", emoji: "👑" },
    { fortune: "Simple pleasures await. Don't overlook the everyday favorites.", emoji: "🌟" },
  ],
  mystical: [
    { fortune: "The smoke will clear, and with it, your doubts.", emoji: "💭" },
    { fortune: "Every puff carries possibility. Inhale with intention.", emoji: "🌬️" },
    { fortune: "Your palate evolves. What was bitter will become beautiful.", emoji: "🦋" },
    { fortune: "The perfect smoke finds you when you stop searching.", emoji: "🎯" },
    { fortune: "Trust the ash. It knows how long to hold on.", emoji: "⚪" },
    { fortune: "Between the first light and final draw lies your answer.", emoji: "🔥" },
    { fortune: "The ring you blow carries wishes to the universe.", emoji: "💫" },
    { fortune: "In stillness and smoke, transformation happens.", emoji: "🧘" },
  ],
};

// Lucky numbers based on smoking patterns
function generateLuckyNumbers(seed: number): number[] {
  const numbers: number[] = [];
  let current = seed;
  for (let i = 0; i < 3; i++) {
    current = (current * 9301 + 49297) % 233280;
    numbers.push((current % 99) + 1);
  }
  return [...new Set(numbers)].slice(0, 3);
}

// Get deterministic daily seed
function getDailySeed(userId: string): number {
  const today = new Date().toISOString().split('T')[0];
  const combined = `${userId}-${today}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Pick item from array using seed
function seededPick<T>(arr: T[], seed: number, offset: number = 0): T {
  return arr[(seed + offset) % arr.length];
}

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      // Return generic fortune for non-logged-in users
      const genericSeed = Date.now();
      return NextResponse.json({
        fortune: seededPick(FORTUNE_TEMPLATES.mystical, genericSeed).fortune,
        emoji: "🔮",
        luckyNumbers: generateLuckyNumbers(genericSeed),
        category: "mystical",
        personalized: false,
      });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const userId = session.user_id;
    const seed = getDailySeed(userId);

    // Get user's smoking stats for personalization
    const [userStats, recentSmokes, topFlavor] = await Promise.all([
      db.prepare(`
        SELECT 
          COUNT(*) as total_smokes,
          COUNT(DISTINCT brand) as unique_brands,
          AVG(rating) as avg_rating
        FROM checkins WHERE user_id = ?
      `).bind(userId).first<{ total_smokes: number; unique_brands: number; avg_rating: number | null }>(),
      
      db.prepare(`
        SELECT brand, flavors FROM checkins 
        WHERE user_id = ? 
        ORDER BY created_at DESC LIMIT 5
      `).bind(userId).all(),
      
      db.prepare(`
        SELECT flavors FROM checkins 
        WHERE user_id = ? AND flavors IS NOT NULL AND flavors != ''
        ORDER BY created_at DESC LIMIT 10
      `).bind(userId).all(),
    ]);

    // Determine fortune category based on user behavior
    const categories: (keyof typeof FORTUNE_TEMPLATES)[] = ['mystical'];
    
    if (userStats && userStats.total_smokes > 0) {
      categories.push('flavor', 'timing', 'brand');
      if (userStats.total_smokes >= 5) {
        categories.push('social');
      }
    }

    const category = seededPick(categories, seed);
    const fortuneData = seededPick(FORTUNE_TEMPLATES[category], seed, 1);

    // Build personalized response
    const response: Record<string, unknown> = {
      fortune: fortuneData.fortune,
      emoji: fortuneData.emoji,
      luckyNumbers: generateLuckyNumbers(seed),
      category,
      personalized: true,
    };

    // Add lucky flavor if flavor fortune
    if ('lucky' in fortuneData) {
      response.luckyFlavor = fortuneData.lucky;
    }

    // Add stats-based insights
    if (userStats && userStats.total_smokes > 0) {
      response.stats = {
        totalSmokes: userStats.total_smokes,
        uniqueBrands: userStats.unique_brands,
        avgRating: userStats.avg_rating ? Number(userStats.avg_rating.toFixed(1)) : null,
      };

      // Add personalized twist based on user data
      if (userStats.unique_brands === 1) {
        response.insight = "🎯 Loyalty is your strength. But adventure beckons...";
      } else if (userStats.unique_brands > 10) {
        response.insight = "🗺️ A true explorer! Your palate knows no bounds.";
      } else if (userStats.avg_rating && userStats.avg_rating >= 4.5) {
        response.insight = "⭐ You have exquisite taste. Trust your instincts.";
      }
    }

    // Get most common recent flavor for personalized tip
    if (topFlavor.results && topFlavor.results.length > 0) {
      const flavorCounts: Record<string, number> = {};
      for (const row of topFlavor.results) {
        const flavors = (row as { flavors: string }).flavors;
        if (flavors) {
          for (const f of flavors.split(',')) {
            const trimmed = f.trim().toLowerCase();
            if (trimmed) {
              flavorCounts[trimmed] = (flavorCounts[trimmed] || 0) + 1;
            }
          }
        }
      }
      const topFlavorName = Object.entries(flavorCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0];
      
      if (topFlavorName) {
        response.dominantFlavor = topFlavorName;
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error("Smoke fortune error:", error);
    return NextResponse.json({ error: "The smoke has clouded the vision..." }, { status: 500 });
  }
}
