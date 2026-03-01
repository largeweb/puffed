import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface OracleData {
  isAuthenticated: boolean;
  username: string | null;
  
  // Predictions
  predictedNextSmoke: {
    brand: string;
    confidence: number;
    reasoning: string;
  } | null;
  
  // Fortune
  smokeFortune: {
    title: string;
    message: string;
    luckyBrand: string | null;
    luckyNumber: number;
    luckyTime: string;
    aura: string;
  };
  
  // Insights
  smokerProfile: {
    archetype: string;
    emoji: string;
    description: string;
    traits: string[];
  } | null;
  
  // Compatibility
  brandCompatibility: {
    brand: string;
    compatibility: number;
    reason: string;
  }[];
  
  // Mystical stats
  mysticalStats: {
    totalSmokes: number;
    favoriteHour: number | null;
    dominantMood: string | null;
    smokingAura: string;
    spiritualLevel: number;
  };
  
  // Community oracle
  communityPrediction: {
    trendingBrand: string | null;
    communityMood: string;
    activeEnergy: string;
    moonPhase: string;
  };
  
  // Daily card
  dailyCard: {
    name: string;
    emoji: string;
    meaning: string;
    advice: string;
  };
}

const ARCHETYPES = [
  { archetype: "The Connoisseur", emoji: "🎩", description: "You appreciate the finer things. Each smoke is a deliberate choice.", traits: ["Discerning", "Patient", "Quality-focused"] },
  { archetype: "The Explorer", emoji: "🧭", description: "Always seeking new experiences. Variety is your spice of life.", traits: ["Adventurous", "Curious", "Open-minded"] },
  { archetype: "The Loyalist", emoji: "🛡️", description: "When you find what you love, you stick with it. Consistency is key.", traits: ["Reliable", "Committed", "Traditional"] },
  { archetype: "The Night Owl", emoji: "🦉", description: "The darkness is your domain. Late nights bring out your best smokes.", traits: ["Mysterious", "Contemplative", "Nocturnal"] },
  { archetype: "The Early Bird", emoji: "🌅", description: "Nothing beats that first morning smoke. Dawn is your sacred time.", traits: ["Disciplined", "Fresh", "Optimistic"] },
  { archetype: "The Social Smoker", emoji: "🤝", description: "Smoking is a communal experience. You thrive with company.", traits: ["Friendly", "Engaged", "Connected"] },
  { archetype: "The Perfectionist", emoji: "⭐", description: "Only 5-star experiences for you. Excellence or nothing.", traits: ["Critical", "High standards", "Passionate"] },
  { archetype: "The Free Spirit", emoji: "🌊", description: "You go with the flow. Spontaneity guides your choices.", traits: ["Relaxed", "Flexible", "Easygoing"] },
];

const FORTUNES = [
  { title: "The Golden Smoke", message: "A legendary smoking experience awaits you this week. Keep your senses sharp.", aura: "golden" },
  { title: "The Social Hour", message: "Connection is in the air. Share a smoke with someone new and magic will happen.", aura: "pink" },
  { title: "The Discovery", message: "A brand you've never tried will become a new favorite. Stay open to surprises.", aura: "green" },
  { title: "The Perfect Moment", message: "Timing is everything. Your ideal smoke awaits at an unexpected hour.", aura: "blue" },
  { title: "The Reflection", message: "This week calls for introspection. Solo sessions will bring clarity.", aura: "purple" },
  { title: "The Celebration", message: "Victory smoke incoming! Something worth celebrating is on the horizon.", aura: "orange" },
  { title: "The Return", message: "An old favorite will call to you. Sometimes classics are classic for a reason.", aura: "amber" },
  { title: "The Adventure", message: "Break your routine. The universe rewards those who explore.", aura: "cyan" },
];

const DAILY_CARDS = [
  { name: "The Smoker", emoji: "🚬", meaning: "New beginnings and fresh starts", advice: "Try something you've never smoked before" },
  { name: "The Ember", emoji: "🔥", meaning: "Passion and intensity", advice: "Go for bold flavors today" },
  { name: "The Cloud", emoji: "☁️", meaning: "Relaxation and peace", advice: "Take your time with each puff" },
  { name: "The Moon", emoji: "🌙", meaning: "Intuition and mystery", advice: "Trust your gut on tonight's pick" },
  { name: "The Sun", emoji: "☀️", meaning: "Joy and celebration", advice: "Share your smoke with others" },
  { name: "The Star", emoji: "⭐", meaning: "Hope and inspiration", advice: "Rate honestly - your feedback matters" },
  { name: "The Wheel", emoji: "🎡", meaning: "Change and cycles", advice: "Break your usual pattern" },
  { name: "The Tower", emoji: "🗼", meaning: "Transformation", advice: "Try a completely different category" },
  { name: "The Hermit", emoji: "🧙", meaning: "Wisdom and solitude", advice: "A solo session will bring insight" },
  { name: "The Lovers", emoji: "💕", meaning: "Connection and harmony", advice: "Pair your smoke with something special" },
];

const MOON_PHASES = ["🌑 New Moon", "🌒 Waxing Crescent", "🌓 First Quarter", "🌔 Waxing Gibbous", "🌕 Full Moon", "🌖 Waning Gibbous", "🌗 Last Quarter", "🌘 Waning Crescent"];

const LUCKY_TIMES = ["Golden Hour", "Midnight", "Dawn", "Dusk", "High Noon", "3:33 AM", "The Blue Hour", "First Light"];

function getMoonPhase(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  
  // Simple moon phase calculation
  const c = Math.floor(365.25 * year);
  const e = Math.floor(30.6 * month);
  const jd = c + e + day - 694039.09;
  const phase = jd / 29.53;
  const phaseIndex = Math.floor((phase - Math.floor(phase)) * 8);
  
  return MOON_PHASES[phaseIndex % 8];
}

function getArchetype(totalCheckins: number, avgRating: number, uniqueBrands: number, nightSmokes: number, morningSmokes: number): typeof ARCHETYPES[0] {
  // Determine archetype based on smoking patterns
  if (avgRating >= 4.5 && totalCheckins > 5) return ARCHETYPES[6]; // Perfectionist
  if (uniqueBrands > totalCheckins * 0.7) return ARCHETYPES[1]; // Explorer
  if (uniqueBrands < totalCheckins * 0.3 && totalCheckins > 3) return ARCHETYPES[2]; // Loyalist
  if (nightSmokes > totalCheckins * 0.5) return ARCHETYPES[3]; // Night Owl
  if (morningSmokes > totalCheckins * 0.4) return ARCHETYPES[4]; // Early Bird
  if (totalCheckins > 10) return ARCHETYPES[0]; // Connoisseur
  return ARCHETYPES[7]; // Free Spirit
}

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);
    const { env } = getRequestContext();
    const db = env.DB;

    let userId: string | null = null;
    let username: string | null = null;

    if (sessionId) {
      const now = Math.floor(Date.now() / 1000);
      const session = await db
        .prepare(`
          SELECT s.user_id, u.username 
          FROM sessions s 
          JOIN users u ON s.user_id = u.id 
          WHERE s.id = ? AND s.expires_at > ?
        `)
        .bind(sessionId, now)
        .first<{ user_id: string; username: string }>();
      
      if (session) {
        userId = session.user_id;
        username = session.username;
      }
    }

    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    
    // Get community trending brand
    const trendingBrand = await db
      .prepare(`
        SELECT brand, COUNT(*) as count 
        FROM checkins 
        WHERE created_at > ?
        GROUP BY LOWER(brand)
        ORDER BY count DESC
        LIMIT 1
      `)
      .bind(Math.floor(Date.now() / 1000) - 604800) // Last week
      .first<{ brand: string; count: number }>();

    // Get community stats
    const communityStats = await db
      .prepare(`
        SELECT 
          COUNT(*) as total_checkins,
          AVG(rating) as avg_rating
        FROM checkins
        WHERE created_at > ?
      `)
      .bind(Math.floor(Date.now() / 1000) - 86400)
      .first<{ total_checkins: number; avg_rating: number }>();

    // Determine community mood based on activity
    let communityMood = "Chill";
    if ((communityStats?.total_checkins || 0) > 10) communityMood = "Buzzing";
    if ((communityStats?.avg_rating || 0) > 4.5) communityMood = "Vibing High";
    if ((communityStats?.total_checkins || 0) < 3) communityMood = "Peaceful";

    // Active energy based on time
    const hour = today.getHours();
    let activeEnergy = "Neutral";
    if (hour >= 6 && hour < 10) activeEnergy = "Rising Sun Energy";
    if (hour >= 10 && hour < 14) activeEnergy = "Peak Fire Energy";
    if (hour >= 14 && hour < 17) activeEnergy = "Mellow Afternoon";
    if (hour >= 17 && hour < 20) activeEnergy = "Golden Hour Magic";
    if (hour >= 20 && hour < 23) activeEnergy = "Night Owl Power";
    if (hour >= 23 || hour < 2) activeEnergy = "Midnight Mystique";
    if (hour >= 2 && hour < 6) activeEnergy = "Void Walker Energy";

    // Daily card (same for everyone each day)
    const dailyCardIndex = dayOfYear % DAILY_CARDS.length;
    const dailyCard = DAILY_CARDS[dailyCardIndex];

    // Fortune (seeded by day)
    const fortuneIndex = dayOfYear % FORTUNES.length;
    const baseFortune = FORTUNES[fortuneIndex];

    // Get random lucky brand from platform
    const luckyBrandResult = await db
      .prepare(`
        SELECT brand 
        FROM checkins 
        GROUP BY LOWER(brand)
        ORDER BY RANDOM()
        LIMIT 1
      `)
      .first<{ brand: string }>();

    let predictedNextSmoke = null;
    let smokerProfile = null;
    let mysticalStats = {
      totalSmokes: 0,
      favoriteHour: null as number | null,
      dominantMood: null as string | null,
      smokingAura: "Undefined",
      spiritualLevel: 1,
    };
    let brandCompatibility: { brand: string; compatibility: number; reason: string }[] = [];

    if (userId) {
      // Get user's smoking history
      const userStats = await db
        .prepare(`
          SELECT 
            COUNT(*) as total_checkins,
            AVG(rating) as avg_rating,
            COUNT(DISTINCT LOWER(brand)) as unique_brands
          FROM checkins
          WHERE user_id = ?
        `)
        .bind(userId)
        .first<{ total_checkins: number; avg_rating: number; unique_brands: number }>();

      // Get most common smoking hour
      const hourStats = await db
        .prepare(`
          SELECT 
            CAST(strftime('%H', datetime(created_at, 'unixepoch', 'localtime')) AS INTEGER) as hour,
            COUNT(*) as count
          FROM checkins
          WHERE user_id = ?
          GROUP BY hour
          ORDER BY count DESC
          LIMIT 1
        `)
        .bind(userId)
        .first<{ hour: number; count: number }>();

      // Night smokes (10 PM - 4 AM)
      const nightSmokes = await db
        .prepare(`
          SELECT COUNT(*) as count
          FROM checkins
          WHERE user_id = ?
          AND (CAST(strftime('%H', datetime(created_at, 'unixepoch', 'localtime')) AS INTEGER) >= 22
               OR CAST(strftime('%H', datetime(created_at, 'unixepoch', 'localtime')) AS INTEGER) < 4)
        `)
        .bind(userId)
        .first<{ count: number }>();

      // Morning smokes (5 AM - 10 AM)
      const morningSmokes = await db
        .prepare(`
          SELECT COUNT(*) as count
          FROM checkins
          WHERE user_id = ?
          AND CAST(strftime('%H', datetime(created_at, 'unixepoch', 'localtime')) AS INTEGER) BETWEEN 5 AND 10
        `)
        .bind(userId)
        .first<{ count: number }>();

      // Get most smoked brand for prediction
      const topBrand = await db
        .prepare(`
          SELECT brand, COUNT(*) as count
          FROM checkins
          WHERE user_id = ?
          GROUP BY LOWER(brand)
          ORDER BY count DESC
          LIMIT 1
        `)
        .bind(userId)
        .first<{ brand: string; count: number }>();

      if (topBrand && (userStats?.total_checkins || 0) > 0) {
        const confidence = Math.min(95, Math.floor((topBrand.count / (userStats?.total_checkins || 1)) * 100 + 20));
        predictedNextSmoke = {
          brand: topBrand.brand,
          confidence,
          reasoning: topBrand.count > 3 
            ? `Based on your ${topBrand.count} sessions with ${topBrand.brand}, it's your clear favorite.`
            : "Early patterns suggest this brand resonates with you."
        };
      }

      // Get smoker profile
      if ((userStats?.total_checkins || 0) > 0) {
        smokerProfile = getArchetype(
          userStats?.total_checkins || 0,
          userStats?.avg_rating || 0,
          userStats?.unique_brands || 0,
          nightSmokes?.count || 0,
          morningSmokes?.count || 0
        );
      }

      // Mystical stats
      const totalSmokes = userStats?.total_checkins || 0;
      let smokingAura = "Beginner's Glow";
      let spiritualLevel = 1;
      
      if (totalSmokes >= 50) { smokingAura = "Master's Radiance"; spiritualLevel = 10; }
      else if (totalSmokes >= 30) { smokingAura = "Expert's Shimmer"; spiritualLevel = 8; }
      else if (totalSmokes >= 20) { smokingAura = "Adept's Light"; spiritualLevel = 6; }
      else if (totalSmokes >= 10) { smokingAura = "Journeyman's Gleam"; spiritualLevel = 4; }
      else if (totalSmokes >= 5) { smokingAura = "Apprentice's Spark"; spiritualLevel = 2; }

      mysticalStats = {
        totalSmokes,
        favoriteHour: hourStats?.hour || null,
        dominantMood: smokerProfile?.archetype || null,
        smokingAura,
        spiritualLevel,
      };

      // Brand compatibility - get trending brands user hasn't tried
      const untried = await db
        .prepare(`
          SELECT brand, AVG(rating) as avg_rating, COUNT(*) as count
          FROM checkins
          WHERE LOWER(brand) NOT IN (
            SELECT LOWER(brand) FROM checkins WHERE user_id = ?
          )
          GROUP BY LOWER(brand)
          HAVING count >= 2
          ORDER BY avg_rating DESC, count DESC
          LIMIT 3
        `)
        .bind(userId)
        .all<{ brand: string; avg_rating: number; count: number }>();

      if (untried.results) {
        brandCompatibility = untried.results.map((b, i) => ({
          brand: b.brand,
          compatibility: Math.floor(70 + Math.random() * 25),
          reason: i === 0 ? "Highly rated by similar smokers" : 
                  i === 1 ? "Matches your flavor profile" : 
                  "Popular choice you haven't explored"
        }));
      }
    }

    const smokeFortune = {
      ...baseFortune,
      luckyBrand: luckyBrandResult?.brand || null,
      luckyNumber: (dayOfYear * 7 + (userId ? userId.charCodeAt(0) : 42)) % 100,
      luckyTime: LUCKY_TIMES[dayOfYear % LUCKY_TIMES.length],
    };

    const oracleData: OracleData = {
      isAuthenticated: !!userId,
      username,
      predictedNextSmoke,
      smokeFortune,
      smokerProfile,
      brandCompatibility,
      mysticalStats,
      communityPrediction: {
        trendingBrand: trendingBrand?.brand || null,
        communityMood,
        activeEnergy,
        moonPhase: getMoonPhase(),
      },
      dailyCard,
    };

    return NextResponse.json(oracleData);
  } catch (error) {
    console.error("Oracle error:", error);
    return NextResponse.json(
      { error: "The spirits are unclear" },
      { status: 500 }
    );
  }
}
