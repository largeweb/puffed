import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface SpiritAnimal {
  animal: string;
  emoji: string;
  title: string;
  description: string;
  traits: string[];
  smokingStyle: string;
  powerMove: string;
  weakness: string;
  compatibility: string[];
  rarity: "common" | "uncommon" | "rare" | "legendary";
}

const SPIRIT_ANIMALS: SpiritAnimal[] = [
  {
    animal: "owl",
    emoji: "🦉",
    title: "The Night Owl",
    description: "You thrive in the darkness, finding wisdom in the quiet hours when others sleep.",
    traits: ["Nocturnal", "Wise", "Patient", "Mysterious"],
    smokingStyle: "Late-night contemplation sessions with thoughtful reviews",
    powerMove: "The 3 AM philosophical smoke",
    weakness: "Morning check-ins",
    compatibility: ["Wolf", "Bat", "Cat"],
    rarity: "uncommon"
  },
  {
    animal: "lion",
    emoji: "🦁",
    title: "The Bold Lion",
    description: "You smoke with confidence and authority, preferring the finest and boldest flavors.",
    traits: ["Bold", "Confident", "Leader", "Discerning"],
    smokingStyle: "Premium cigars with strong, assertive profiles",
    powerMove: "The commanding 5-star review",
    weakness: "Mild, subtle blends",
    compatibility: ["Eagle", "Bear", "Dragon"],
    rarity: "rare"
  },
  {
    animal: "fox",
    emoji: "🦊",
    title: "The Clever Fox",
    description: "You're always discovering new brands and flavors, outsmarting the ordinary.",
    traits: ["Curious", "Adventurous", "Clever", "Social"],
    smokingStyle: "Constantly exploring new brands and hidden gems",
    powerMove: "Finding the unknown masterpiece",
    weakness: "Sticking to one brand",
    compatibility: ["Raccoon", "Cat", "Crow"],
    rarity: "common"
  },
  {
    animal: "bear",
    emoji: "🐻",
    title: "The Cozy Bear",
    description: "You appreciate the comfort of familiar favorites, savoring each moment slowly.",
    traits: ["Loyal", "Relaxed", "Appreciative", "Grounded"],
    smokingStyle: "Long, leisurely sessions with tried-and-true brands",
    powerMove: "The marathon 90-minute smoke",
    weakness: "Rushed smokes",
    compatibility: ["Sloth", "Wolf", "Turtle"],
    rarity: "common"
  },
  {
    animal: "eagle",
    emoji: "🦅",
    title: "The Soaring Eagle",
    description: "You rise above the ordinary, seeking elevated experiences and premium quality.",
    traits: ["Ambitious", "Precise", "Focused", "Elite"],
    smokingStyle: "Only the finest, with meticulous attention to detail",
    powerMove: "The perfectly timed sunrise smoke",
    weakness: "Budget cigars",
    compatibility: ["Lion", "Dragon", "Hawk"],
    rarity: "rare"
  },
  {
    animal: "wolf",
    emoji: "🐺",
    title: "The Pack Wolf",
    description: "You love smoking with others, building community and sharing experiences.",
    traits: ["Social", "Loyal", "Connected", "Generous"],
    smokingStyle: "Group sessions, sharing recommendations, building the pack",
    powerMove: "The legendary group smoke",
    weakness: "Solo smokes",
    compatibility: ["Bear", "Owl", "Dog"],
    rarity: "uncommon"
  },
  {
    animal: "dragon",
    emoji: "🐉",
    title: "The Legendary Dragon",
    description: "You're a true connoisseur, breathing fire with your bold opinions and massive presence.",
    traits: ["Powerful", "Legendary", "Passionate", "Intense"],
    smokingStyle: "Full-bodied, intense experiences with dramatic flair",
    powerMove: "The smoke-filled entrance",
    weakness: "Light, airy smokes",
    compatibility: ["Phoenix", "Lion", "Eagle"],
    rarity: "legendary"
  },
  {
    animal: "phoenix",
    emoji: "🔥",
    title: "The Rising Phoenix",
    description: "You keep coming back, stronger each time, with renewed passion for the leaf.",
    traits: ["Resilient", "Passionate", "Transformative", "Eternal"],
    smokingStyle: "Evolving tastes, always reinventing your palate",
    powerMove: "The comeback smoke after a break",
    weakness: "Getting stuck in routines",
    compatibility: ["Dragon", "Butterfly", "Crow"],
    rarity: "legendary"
  },
  {
    animal: "cat",
    emoji: "🐱",
    title: "The Mysterious Cat",
    description: "You smoke on your own terms, independent and selective about when and what.",
    traits: ["Independent", "Selective", "Graceful", "Unpredictable"],
    smokingStyle: "Quality over quantity, perfectly timed indulgences",
    powerMove: "The unexpected midnight appearance",
    weakness: "Forced schedules",
    compatibility: ["Owl", "Fox", "Panther"],
    rarity: "uncommon"
  },
  {
    animal: "turtle",
    emoji: "🐢",
    title: "The Wise Turtle",
    description: "You take your time, savoring every moment with patience and wisdom.",
    traits: ["Patient", "Wise", "Steady", "Thoughtful"],
    smokingStyle: "Slow, mindful sessions with detailed tasting notes",
    powerMove: "The three-hour slow burn",
    weakness: "Quick smokes",
    compatibility: ["Bear", "Sloth", "Elephant"],
    rarity: "common"
  },
  {
    animal: "crow",
    emoji: "🐦‍⬛",
    title: "The Cunning Crow",
    description: "You collect experiences like treasures, always watching, always learning.",
    traits: ["Observant", "Collector", "Intelligent", "Resourceful"],
    smokingStyle: "Building an impressive smoking resume across all brands",
    powerMove: "The encyclopedic brand knowledge",
    weakness: "Missing trends",
    compatibility: ["Fox", "Phoenix", "Owl"],
    rarity: "uncommon"
  },
  {
    animal: "butterfly",
    emoji: "🦋",
    title: "The Social Butterfly",
    description: "You float from experience to experience, spreading joy and engagement everywhere.",
    traits: ["Social", "Joyful", "Light", "Engaging"],
    smokingStyle: "Liking, commenting, reacting—you're everywhere!",
    powerMove: "The triple-notification combo",
    weakness: "Going dark",
    compatibility: ["Phoenix", "Hummingbird", "Bee"],
    rarity: "rare"
  }
];

function calculateSpiritAnimal(stats: {
  totalSmokes: number;
  avgRating: number | null;
  uniqueBrands: number;
  nightSmokes: number;
  morningSmokes: number;
  totalLikesGiven: number;
  totalFollowing: number;
  avgSmokeTime: number | null;
  hasLongReviews: boolean;
  recentActivity: boolean;
  comebackAfterBreak: boolean;
  totalEngagement: number;
}): SpiritAnimal {
  // Calculate scores for each spirit animal
  const scores: { [key: string]: number } = {
    owl: 0,
    lion: 0,
    fox: 0,
    bear: 0,
    eagle: 0,
    wolf: 0,
    dragon: 0,
    phoenix: 0,
    cat: 0,
    turtle: 0,
    crow: 0,
    butterfly: 0
  };
  
  // Night owl scoring
  if (stats.nightSmokes > 3) scores.owl += 5;
  if (stats.nightSmokes > stats.morningSmokes * 2) scores.owl += 3;
  
  // Lion - high ratings, premium taste
  if (stats.avgRating && stats.avgRating >= 4.5) scores.lion += 4;
  if (stats.totalSmokes >= 10 && stats.avgRating && stats.avgRating >= 4) scores.lion += 3;
  
  // Fox - brand explorer
  if (stats.uniqueBrands >= 5) scores.fox += 4;
  if (stats.uniqueBrands > stats.totalSmokes * 0.5) scores.fox += 3;
  
  // Bear - loyal, relaxed
  if (stats.uniqueBrands <= 3 && stats.totalSmokes >= 5) scores.bear += 5;
  if (stats.avgSmokeTime && stats.avgSmokeTime >= 45) scores.bear += 3;
  
  // Eagle - premium, precise
  if (stats.avgRating && stats.avgRating >= 4.8) scores.eagle += 5;
  if (stats.morningSmokes >= 3) scores.eagle += 3;
  
  // Wolf - social
  if (stats.totalFollowing >= 3) scores.wolf += 4;
  if (stats.totalLikesGiven >= 5) scores.wolf += 3;
  if (stats.totalEngagement >= 10) scores.wolf += 2;
  
  // Dragon - legendary status
  if (stats.totalSmokes >= 20) scores.dragon += 4;
  if (stats.avgRating && stats.avgRating >= 4.5 && stats.totalSmokes >= 15) scores.dragon += 4;
  
  // Phoenix - comeback
  if (stats.comebackAfterBreak) scores.phoenix += 6;
  if (stats.recentActivity && stats.totalSmokes >= 5) scores.phoenix += 2;
  
  // Cat - selective
  if (stats.totalSmokes <= 5 && stats.avgRating && stats.avgRating >= 4) scores.cat += 4;
  if (stats.nightSmokes >= 2 && stats.totalSmokes <= 8) scores.cat += 3;
  
  // Turtle - patient, detailed
  if (stats.hasLongReviews) scores.turtle += 5;
  if (stats.avgSmokeTime && stats.avgSmokeTime >= 60) scores.turtle += 3;
  
  // Crow - collector
  if (stats.uniqueBrands >= 8) scores.crow += 5;
  if (stats.totalSmokes >= 15 && stats.uniqueBrands >= 6) scores.crow += 3;
  
  // Butterfly - social engagement
  if (stats.totalEngagement >= 15) scores.butterfly += 5;
  if (stats.totalLikesGiven >= 10) scores.butterfly += 3;
  
  // Find highest score
  let maxScore = 0;
  let spiritAnimal = "fox"; // default
  
  for (const [animal, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      spiritAnimal = animal;
    }
  }
  
  // If very low scores (new user), default to fox (explorer)
  if (maxScore < 3) {
    spiritAnimal = "fox";
  }
  
  return SPIRIT_ANIMALS.find(a => a.animal === spiritAnimal) || SPIRIT_ANIMALS[2];
}

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);
    
    if (!sessionId) {
      // Return a generic spirit for non-logged in users
      return NextResponse.json({
        spiritAnimal: SPIRIT_ANIMALS[2], // Fox - the explorer
        personalized: false,
        message: "Log in to discover your true Spirit Smoker!"
      });
    }
    
    // Get user from session
    const session = await db.prepare(`
      SELECT user_id FROM sessions 
      WHERE id = ? AND expires_at > unixepoch()
    `).bind(sessionId).first<{ user_id: string }>();
    
    if (!session) {
      return NextResponse.json({
        spiritAnimal: SPIRIT_ANIMALS[2],
        personalized: false,
        message: "Log in to discover your true Spirit Smoker!"
      });
    }
    
    const userId = session.user_id;
    
    // Gather all the stats we need
    const [
      basicStats,
      timeStats,
      engagementStats,
      reviewStats
    ] = await Promise.all([
      // Basic smoking stats
      db.prepare(`
        SELECT 
          COUNT(*) as total_smokes,
          AVG(rating) as avg_rating,
          COUNT(DISTINCT brand) as unique_brands
        FROM checkins WHERE user_id = ?
      `).bind(userId).first<{ total_smokes: number; avg_rating: number | null; unique_brands: number }>(),
      
      // Time-based stats (night = 22-04, morning = 05-09)
      db.prepare(`
        SELECT 
          SUM(CASE WHEN (created_at % 86400) / 3600 BETWEEN 22 AND 23 
               OR (created_at % 86400) / 3600 BETWEEN 0 AND 4 THEN 1 ELSE 0 END) as night_smokes,
          SUM(CASE WHEN (created_at % 86400) / 3600 BETWEEN 5 AND 9 THEN 1 ELSE 0 END) as morning_smokes,
          AVG(smoke_time_mins) as avg_smoke_time
        FROM checkins WHERE user_id = ?
      `).bind(userId).first<{ night_smokes: number; morning_smokes: number; avg_smoke_time: number | null }>(),
      
      // Engagement stats
      db.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM likes WHERE user_id = ?) as likes_given,
          (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following,
          (SELECT COUNT(*) FROM reactions WHERE user_id = ?) as reactions_given,
          (SELECT COUNT(*) FROM comments WHERE user_id = ?) as comments_given
      `).bind(userId, userId, userId, userId).first<{ likes_given: number; following: number; reactions_given: number; comments_given: number }>(),
      
      // Review depth
      db.prepare(`
        SELECT 
          MAX(CASE WHEN LENGTH(review) > 100 THEN 1 ELSE 0 END) as has_long_reviews,
          MAX(CASE WHEN created_at > unixepoch() - 604800 THEN 1 ELSE 0 END) as recent_activity,
          MAX(CASE WHEN created_at < unixepoch() - 1209600 AND 
            (SELECT COUNT(*) FROM checkins c2 WHERE c2.user_id = checkins.user_id AND c2.created_at > unixepoch() - 604800) > 0 
            THEN 1 ELSE 0 END) as comeback_after_break
        FROM checkins WHERE user_id = ?
      `).bind(userId).first<{ has_long_reviews: number; recent_activity: number; comeback_after_break: number }>()
    ]);
    
    const stats = {
      totalSmokes: basicStats?.total_smokes || 0,
      avgRating: basicStats?.avg_rating || null,
      uniqueBrands: basicStats?.unique_brands || 0,
      nightSmokes: timeStats?.night_smokes || 0,
      morningSmokes: timeStats?.morning_smokes || 0,
      avgSmokeTime: timeStats?.avg_smoke_time || null,
      totalLikesGiven: engagementStats?.likes_given || 0,
      totalFollowing: engagementStats?.following || 0,
      totalEngagement: (engagementStats?.likes_given || 0) + 
                       (engagementStats?.reactions_given || 0) + 
                       (engagementStats?.comments_given || 0),
      hasLongReviews: (reviewStats?.has_long_reviews || 0) > 0,
      recentActivity: (reviewStats?.recent_activity || 0) > 0,
      comebackAfterBreak: (reviewStats?.comeback_after_break || 0) > 0
    };
    
    const spiritAnimal = calculateSpiritAnimal(stats);
    
    return NextResponse.json({
      spiritAnimal,
      personalized: true,
      stats: {
        totalSmokes: stats.totalSmokes,
        uniqueBrands: stats.uniqueBrands,
        nightSmokes: stats.nightSmokes,
        engagementScore: stats.totalEngagement
      },
      insight: generateInsight(spiritAnimal, stats)
    });
    
  } catch (error) {
    console.error("Spirit smoker error:", error);
    return NextResponse.json({ error: "Failed to divine your spirit" }, { status: 500 });
  }
}

function generateInsight(animal: SpiritAnimal, stats: { totalSmokes: number; nightSmokes: number; uniqueBrands: number; totalEngagement: number }): string {
  const insights = [
    `With ${stats.totalSmokes} smokes logged, your inner ${animal.animal} grows stronger.`,
    `Your ${stats.uniqueBrands} brand explorations reveal a true ${animal.title.toLowerCase()}.`,
    stats.nightSmokes > 3 ? `${stats.nightSmokes} night sessions show your ${animal.animal} spirit thrives in darkness.` : null,
    stats.totalEngagement > 5 ? `${stats.totalEngagement} engagements prove your ${animal.animal} connection to the pack.` : null,
    `Embrace your ${animal.traits[0].toLowerCase()} nature, ${animal.title}!`
  ].filter(Boolean);
  
  return insights[Math.floor(Math.random() * insights.length)] || `You embody the ${animal.title}!`;
}
