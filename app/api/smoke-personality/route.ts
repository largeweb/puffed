import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

// Personality dimensions
type TimingType = 'early_bird' | 'night_owl' | 'all_day';
type SocialType = 'solo' | 'social' | 'balanced';
type CriticType = 'generous' | 'balanced' | 'critical';
type ExplorerType = 'loyalist' | 'explorer' | 'balanced';
type MoodType = 'chill' | 'celebrator' | 'stress_relief' | 'creative' | 'focused' | 'adventurous' | 'balanced';

interface PersonalityTraits {
  timing: TimingType;
  social: SocialType;
  critic: CriticType;
  explorer: ExplorerType;
  primaryMood: MoodType;
}

interface PersonalityResult {
  title: string;
  emoji: string;
  description: string;
  traits: PersonalityTraits;
  stats: {
    totalSmokes: number;
    avgRating: number;
    uniqueBrands: number;
    favoriteHour: number;
    topMood: string | null;
    topBrand: string | null;
  };
  funFacts: string[];
  color: string; // gradient class
}

// Personality titles based on trait combinations
const PERSONALITY_TITLES: Record<string, { title: string; emoji: string; description: string; color: string }> = {
  // Night + Social combinations
  'night_owl_social_explorer': { 
    title: 'The Midnight Maven', 
    emoji: '🦉✨', 
    description: 'A nocturnal social butterfly who loves discovering new brands with friends under the stars.',
    color: 'from-purple-600 to-indigo-800'
  },
  'night_owl_social_loyalist': { 
    title: 'The Late Night Legend', 
    emoji: '🌙🎉', 
    description: 'The life of the late-night party, always bringing their favorite go-to smoke to share.',
    color: 'from-violet-600 to-purple-800'
  },
  'night_owl_solo_explorer': { 
    title: 'The Midnight Connoisseur', 
    emoji: '🦉🔍', 
    description: 'A sophisticated night owl who savors solo sessions exploring rare and unique finds.',
    color: 'from-slate-700 to-purple-900'
  },
  'night_owl_solo_loyalist': { 
    title: 'The Night Philosopher', 
    emoji: '🌌🤔', 
    description: 'Deep thinker who enjoys quiet nights with their trusted favorite, contemplating life.',
    color: 'from-indigo-800 to-slate-900'
  },
  
  // Early Bird combinations
  'early_bird_social_explorer': { 
    title: 'The Dawn Adventurer', 
    emoji: '🌅🧭', 
    description: 'An early riser who kicks off the day exploring new brands with the morning crew.',
    color: 'from-amber-500 to-orange-600'
  },
  'early_bird_social_loyalist': { 
    title: 'The Sunrise Social', 
    emoji: '☀️👥', 
    description: 'Morning person who loves starting the day with friends and their tried-and-true favorite.',
    color: 'from-yellow-500 to-amber-600'
  },
  'early_bird_solo_explorer': { 
    title: 'The Morning Maverick', 
    emoji: '🌄🚀', 
    description: 'An adventurous early bird who treats each morning as a chance to try something new.',
    color: 'from-orange-500 to-red-600'
  },
  'early_bird_solo_loyalist': { 
    title: 'The Ritual Keeper', 
    emoji: '🌅☕', 
    description: 'A creature of habit who finds peace in the morning ritual with their beloved go-to.',
    color: 'from-amber-600 to-yellow-700'
  },
  
  // All Day combinations
  'all_day_social_explorer': { 
    title: 'The Social Explorer', 
    emoji: '🦋🗺️', 
    description: 'Always ready for a smoke session, bringing new discoveries to share with the crew.',
    color: 'from-pink-500 to-rose-600'
  },
  'all_day_social_loyalist': { 
    title: 'The Crew Captain', 
    emoji: '👑🤝', 
    description: 'The reliable friend who\'s always down to smoke, always bringing the good stuff.',
    color: 'from-rose-500 to-pink-600'
  },
  'all_day_solo_explorer': { 
    title: 'The Curious Soul', 
    emoji: '🔮🌟', 
    description: 'A free spirit who smokes whenever inspiration strikes, always seeking new experiences.',
    color: 'from-cyan-500 to-teal-600'
  },
  'all_day_solo_loyalist': { 
    title: 'The Steady Flame', 
    emoji: '🔥💎', 
    description: 'Consistent and dependable, finding comfort in their favorite smoke any time of day.',
    color: 'from-emerald-600 to-teal-700'
  },
};

// Mood-specific title modifiers
const MOOD_MODIFIERS: Record<string, string> = {
  'chill': 'with a zen vibe',
  'celebrator': 'who knows how to party',
  'stress_relief': 'who smokes to unwind',
  'creative': 'channeling creative energy',
  'focused': 'with laser focus',
  'adventurous': 'always seeking thrills',
};

function analyzePersonality(checkins: any[]): PersonalityResult | null {
  if (checkins.length < 3) {
    return null; // Need at least 3 check-ins for meaningful analysis
  }

  // Analyze timing patterns
  const hours = checkins.map(c => new Date(c.created_at * 1000).getHours());
  const earlyCount = hours.filter(h => h >= 5 && h < 12).length;
  const nightCount = hours.filter(h => h >= 20 || h < 5).length;
  const totalCount = hours.length;
  
  let timing: TimingType = 'all_day';
  if (earlyCount / totalCount > 0.5) timing = 'early_bird';
  else if (nightCount / totalCount > 0.5) timing = 'night_owl';

  // Find favorite hour
  const hourCounts: Record<number, number> = {};
  hours.forEach(h => { hourCounts[h] = (hourCounts[h] || 0) + 1; });
  const favoriteHour = parseInt(Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '12');

  // Analyze social patterns (based on moods)
  const moods = checkins.map(c => c.mood).filter(Boolean);
  const socialMoods = moods.filter(m => ['social', 'celebratory'].includes(m)).length;
  const soloMoods = moods.filter(m => ['relaxed', 'thoughtful', 'focused', 'creative'].includes(m)).length;
  
  let social: SocialType = 'balanced';
  if (moods.length > 0) {
    const socialRatio = socialMoods / moods.length;
    if (socialRatio > 0.5) social = 'social';
    else if (socialRatio < 0.2) social = 'solo';
  }

  // Analyze critic level (rating patterns)
  const ratings = checkins.map(c => c.rating).filter(Boolean);
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 3;
  
  let critic: CriticType = 'balanced';
  if (avgRating >= 4.2) critic = 'generous';
  else if (avgRating <= 2.8) critic = 'critical';

  // Analyze explorer level (brand variety)
  const brands = [...new Set(checkins.map(c => c.brand))];
  const brandVariety = brands.length / checkins.length;
  
  let explorer: ExplorerType = 'balanced';
  if (brandVariety > 0.7) explorer = 'explorer';
  else if (brandVariety < 0.3) explorer = 'loyalist';

  // Find primary mood
  const moodCounts: Record<string, number> = {};
  moods.forEach(m => { moodCounts[m] = (moodCounts[m] || 0) + 1; });
  const topMoodEntry = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
  const topMood = topMoodEntry?.[0] || null;
  
  let primaryMood: MoodType = 'balanced';
  if (topMood) {
    const moodMap: Record<string, MoodType> = {
      'relaxed': 'chill',
      'social': 'celebrator',
      'celebratory': 'celebrator',
      'stressed': 'stress_relief',
      'creative': 'creative',
      'focused': 'focused',
      'adventurous': 'adventurous',
    };
    primaryMood = moodMap[topMood] || 'balanced';
  }

  // Find top brand
  const brandCounts: Record<string, number> = {};
  checkins.forEach(c => { brandCounts[c.brand] = (brandCounts[c.brand] || 0) + 1; });
  const topBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Build personality key
  const personalityKey = `${timing}_${social}_${explorer}`;
  const personality = PERSONALITY_TITLES[personalityKey] || PERSONALITY_TITLES['all_day_solo_explorer'];

  // Modify description with mood if applicable
  let description = personality.description;
  if (primaryMood !== 'balanced' && MOOD_MODIFIERS[primaryMood]) {
    description = description.replace('.', `, ${MOOD_MODIFIERS[primaryMood]}.`);
  }

  // Generate fun facts
  const funFacts: string[] = [];
  
  if (favoriteHour < 6) funFacts.push(`🦉 You\'re a true night owl - most active around ${favoriteHour}AM!`);
  else if (favoriteHour < 10) funFacts.push(`🌅 Early bird gets the smoke - you peak around ${favoriteHour}AM!`);
  else if (favoriteHour >= 20) funFacts.push(`🌙 Evening is your time - you light up most around ${favoriteHour > 12 ? favoriteHour - 12 : favoriteHour}PM!`);
  
  if (avgRating >= 4.5) funFacts.push(`⭐ You\'re an optimist - averaging ${avgRating.toFixed(1)} stars!`);
  else if (avgRating <= 2.5) funFacts.push(`🧐 You have high standards - averaging ${avgRating.toFixed(1)} stars!`);
  
  if (brands.length === 1) funFacts.push(`💎 Ultimate loyalist - 100% devoted to ${brands[0]}!`);
  else if (brandVariety > 0.8) funFacts.push(`🗺️ True explorer - you\'ve tried ${brands.length} different brands!`);
  
  if (topMood === 'relaxed') funFacts.push(`😌 Chill vibes only - relaxation is your main smoking mood!`);
  else if (topMood === 'social') funFacts.push(`🎉 Social smoker - you love sharing the experience!`);
  else if (topMood === 'creative') funFacts.push(`✨ Creative spark - smoking fuels your imagination!`);

  // Add rating style fact
  if (critic === 'generous') funFacts.push(`😊 Generous reviewer - you see the good in every smoke!`);
  else if (critic === 'critical') funFacts.push(`🔬 Discerning palate - you know exactly what you like!`);

  return {
    title: personality.title,
    emoji: personality.emoji,
    description,
    traits: {
      timing,
      social,
      critic,
      explorer,
      primaryMood,
    },
    stats: {
      totalSmokes: checkins.length,
      avgRating: Math.round(avgRating * 10) / 10,
      uniqueBrands: brands.length,
      favoriteHour,
      topMood,
      topBrand,
    },
    funFacts: funFacts.slice(0, 4), // Max 4 fun facts
    color: personality.color,
  };
}

export const runtime = "edge";

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

    // Get current user
    const currentUser = await db.prepare(
      "SELECT id, username FROM users WHERE id = ?"
    ).bind(session.user_id).first<{ id: string; username: string }>();

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Check for username param (viewing someone else's personality)
    const { searchParams } = new URL(request.url);
    const targetUsername = searchParams.get('username');

    let targetUserId = currentUser.id;
    let targetUser = currentUser;

    if (targetUsername && targetUsername !== currentUser.username) {
      const userRow = await db.prepare(
        "SELECT id, username FROM users WHERE username = ?"
      ).bind(targetUsername).first<{ id: string; username: string }>();
      
      if (!userRow) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      targetUserId = userRow.id;
      targetUser = userRow;
    }

    // Get user's check-ins
    const checkinsResult = await db.prepare(`
      SELECT brand, rating, mood, created_at
      FROM checkins
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(targetUserId).all();

    const checkins = checkinsResult.results || [];

    const personality = analyzePersonality(checkins);

    if (!personality) {
      return NextResponse.json({
        error: "not_enough_data",
        message: "Need at least 3 check-ins to analyze personality",
        currentCount: checkins.length,
        needed: 3,
      }, { status: 200 });
    }

    return NextResponse.json({
      username: targetUser.username,
      ...personality,
    });

  } catch (error) {
    console.error("Smoke personality error:", error);
    return NextResponse.json({ error: "Failed to analyze personality" }, { status: 500 });
  }
}
