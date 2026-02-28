import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

// Movie/show recommendations by category and time
const CINEMA_PICKS = {
  lateNight: [
    { title: "Heat", year: 1995, genre: "Crime/Drama", runtime: "2h 50m", vibe: "Epic heist energy", pairingNote: "Full-bodied cigar for the patient buildup" },
    { title: "Zodiac", year: 2007, genre: "Mystery/Thriller", runtime: "2h 37m", vibe: "Obsessive investigation", pairingNote: "Dark roast coffee + medium smoke" },
    { title: "The Lighthouse", year: 2019, genre: "Horror/Drama", runtime: "1h 49m", vibe: "Descent into madness", pairingNote: "Something bold and smoky" },
    { title: "Mulholland Drive", year: 2001, genre: "Mystery/Neo-noir", runtime: "2h 27m", vibe: "Dream logic", pairingNote: "Let the smoke enhance the mystery" },
    { title: "Sicario", year: 2015, genre: "Action/Thriller", runtime: "2h 1m", vibe: "Tense cartel drama", pairingNote: "Mexican or Nicaraguan cigar" },
    { title: "Prisoners", year: 2013, genre: "Thriller/Drama", runtime: "2h 33m", vibe: "Dark and gripping", pairingNote: "Heavy maduro for the tension" },
  ],
  chill: [
    { title: "The Grand Budapest Hotel", year: 2014, genre: "Comedy/Drama", runtime: "1h 39m", vibe: "Whimsical perfection", pairingNote: "Something light and aromatic" },
    { title: "Chef", year: 2014, genre: "Comedy/Drama", runtime: "1h 54m", vibe: "Feel-good foodie joy", pairingNote: "Pair with actual good food" },
    { title: "The Big Lebowski", year: 1998, genre: "Comedy/Crime", runtime: "1h 57m", vibe: "The Dude abides", pairingNote: "Whatever, man. Anything works." },
    { title: "Midnight in Paris", year: 2011, genre: "Romance/Fantasy", runtime: "1h 34m", vibe: "Romantic nostalgia", pairingNote: "French coffee + mild cigar" },
    { title: "Hunt for the Wilderpeople", year: 2016, genre: "Adventure/Comedy", runtime: "1h 41m", vibe: "Heartwarming adventure", pairingNote: "Something woodsy and natural" },
  ],
  classic: [
    { title: "Casablanca", year: 1942, genre: "Romance/Drama", runtime: "1h 42m", vibe: "Timeless elegance", pairingNote: "Classic Cuban-style smoke" },
    { title: "The Godfather", year: 1972, genre: "Crime/Drama", runtime: "2h 55m", vibe: "An offer you can't refuse", pairingNote: "The finest cigar you own" },
    { title: "Chinatown", year: 1974, genre: "Mystery/Neo-noir", runtime: "2h 10m", vibe: "Noir perfection", pairingNote: "Something from the old world" },
    { title: "12 Angry Men", year: 1957, genre: "Drama", runtime: "1h 36m", vibe: "Dialogue masterclass", pairingNote: "Classic room note" },
    { title: "Cool Hand Luke", year: 1967, genre: "Drama/Crime", runtime: "2h 7m", vibe: "Rebellious spirit", pairingNote: "Something bold and defiant" },
  ],
  action: [
    { title: "John Wick", year: 2014, genre: "Action/Thriller", runtime: "1h 41m", vibe: "Stylish vengeance", pairingNote: "Quick, punchy smoke" },
    { title: "Mad Max: Fury Road", year: 2015, genre: "Action/Sci-Fi", runtime: "2h", vibe: "Adrenaline overdose", pairingNote: "Something with kick" },
    { title: "The Raid", year: 2011, genre: "Action/Thriller", runtime: "1h 41m", vibe: "Non-stop intensity", pairingNote: "No time to think, just smoke" },
    { title: "Collateral", year: 2004, genre: "Action/Thriller", runtime: "2h", vibe: "LA night energy", pairingNote: "Cool, collected smoke" },
    { title: "Top Gun: Maverick", year: 2022, genre: "Action/Drama", runtime: "2h 11m", vibe: "Feel-good action", pairingNote: "American classic" },
  ],
  documentaries: [
    { title: "Jiro Dreams of Sushi", year: 2011, genre: "Documentary", runtime: "1h 21m", vibe: "Pursuit of perfection", pairingNote: "Appreciate the craft in your smoke too" },
    { title: "Free Solo", year: 2018, genre: "Documentary", runtime: "1h 40m", vibe: "Heart-stopping dedication", pairingNote: "Steady hands smoke" },
    { title: "The Last Dance", year: 2020, genre: "Documentary/Sport", runtime: "10 eps", vibe: "Championship mentality", pairingNote: "Victory cigar energy" },
    { title: "My Octopus Teacher", year: 2020, genre: "Documentary/Nature", runtime: "1h 25m", vibe: "Meditative beauty", pairingNote: "Slow, contemplative smoke" },
    { title: "Senna", year: 2010, genre: "Documentary/Sport", runtime: "1h 46m", vibe: "Legend's legacy", pairingNote: "Brazilian style" },
  ],
  tvBinge: [
    { title: "True Detective S1", year: 2014, genre: "Crime/Drama", runtime: "8 eps", vibe: "Philosophical noir", pairingNote: "One smoke per episode" },
    { title: "Breaking Bad", year: 2008, genre: "Crime/Drama", runtime: "62 eps", vibe: "Empire building", pairingNote: "Match Walt's intensity progression" },
    { title: "Peaky Blinders", year: 2013, genre: "Crime/Drama", runtime: "36 eps", vibe: "Stylish gangster", pairingNote: "British smoke, whiskey" },
    { title: "Mad Men", year: 2007, genre: "Drama", runtime: "92 eps", vibe: "60s advertising glamour", pairingNote: "Old Fashioned + classic smoke" },
    { title: "Fargo", year: 2014, genre: "Crime/Drama", runtime: "51 eps", vibe: "Dark comedy crime", pairingNote: "Cold weather comfort smoke" },
  ],
};

// Time-based category suggestions
function getTimeBasedCategory(hour: number): { primary: string; secondary: string; vibe: string } {
  if (hour >= 22 || hour < 2) {
    return { primary: "lateNight", secondary: "classic", vibe: "🌙 Late Night Cinema Mode" };
  } else if (hour >= 2 && hour < 6) {
    return { primary: "lateNight", secondary: "documentaries", vibe: "🦉 Insomniac Theater" };
  } else if (hour >= 6 && hour < 10) {
    return { primary: "documentaries", secondary: "chill", vibe: "☀️ Morning Watch" };
  } else if (hour >= 10 && hour < 14) {
    return { primary: "chill", secondary: "action", vibe: "🌤️ Midday Matinee" };
  } else if (hour >= 14 && hour < 17) {
    return { primary: "action", secondary: "classic", vibe: "🎬 Afternoon Feature" };
  } else if (hour >= 17 && hour < 20) {
    return { primary: "tvBinge", secondary: "chill", vibe: "🌆 Evening Session" };
  } else {
    return { primary: "classic", secondary: "lateNight", vibe: "🌃 Prime Time" };
  }
}

// What's the community watching (simulated based on recent check-ins)
function getCommunityPick(hour: number, dayOfWeek: number): { title: string; watchers: number; category: string } {
  const picks = [
    { title: "True Detective S1", watchers: 3, category: "TV Binge" },
    { title: "The Godfather", watchers: 2, category: "Classic" },
    { title: "Heat", watchers: 2, category: "Late Night" },
    { title: "John Wick", watchers: 2, category: "Action" },
    { title: "Jiro Dreams of Sushi", watchers: 1, category: "Documentary" },
  ];
  // Pick based on time to simulate variety
  const index = (hour + dayOfWeek) % picks.length;
  return picks[index];
}

export async function GET(req: NextRequest) {
  const { env } = getRequestContext();
  const db = env.DB;
  
  if (!db) {
    return NextResponse.json({ error: "DB not available" }, { status: 500 });
  }

  try {
    // Get current user from session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;
    let currentUser: string | null = null;

    if (sessionId) {
      const session = await db.prepare(
        "SELECT u.username FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > ?"
      ).bind(sessionId, Math.floor(Date.now() / 1000)).first();
      if (session) {
        currentUser = session.username as string;
      }
    }

    // Get current time info
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
    const isFridayNight = dayOfWeek === 5 && hour >= 17;
    const isSaturdayNight = dayOfWeek === 6 && hour >= 17;

    // Get time-based recommendations
    const timeBasedRec = getTimeBasedCategory(hour);
    const primaryPicks = CINEMA_PICKS[timeBasedRec.primary as keyof typeof CINEMA_PICKS] || CINEMA_PICKS.chill;
    const secondaryPicks = CINEMA_PICKS[timeBasedRec.secondary as keyof typeof CINEMA_PICKS] || CINEMA_PICKS.classic;

    // Pick 3 random from primary, 2 from secondary
    const shuffledPrimary = [...primaryPicks].sort(() => Math.random() - 0.5);
    const shuffledSecondary = [...secondaryPicks].sort(() => Math.random() - 0.5);
    
    const recommendations = [
      ...shuffledPrimary.slice(0, 3).map(p => ({ ...p, category: timeBasedRec.primary })),
      ...shuffledSecondary.slice(0, 2).map(p => ({ ...p, category: timeBasedRec.secondary })),
    ];

    // Community pick
    const communityPick = getCommunityPick(hour, dayOfWeek);

    // Get recent check-ins to show "smoking while watching" section
    const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;
    const recentSmokers = await db.prepare(`
      SELECT DISTINCT c.id, u.username, c.brand, c.rating, c.image_url, c.created_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at > ?
      ORDER BY c.created_at DESC
      LIMIT 5
    `).bind(twoHoursAgo).all();

    // Get user's stats if logged in
    let userStats = null;
    if (currentUser) {
      const activity = await db.prepare(`
        SELECT COUNT(*) as totalSmokes, 
               AVG(rating) as avgRating,
               MAX(created_at) as lastSmoke
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE u.username = ?
      `).bind(currentUser).first();
      
      userStats = {
        username: currentUser,
        totalSmokes: activity?.totalSmokes || 0,
        avgRating: activity?.avgRating ? Number(activity.avgRating).toFixed(1) : null,
        suggestedGenre: (Number(activity?.totalSmokes) || 0) > 10 ? "classic" : "chill",
      };
    }

    // Special Friday/Saturday night features
    const specialEvent = isFridayNight 
      ? { active: true, name: "Friday Night Cinema", emoji: "🍿", message: "Weekend starts now!" }
      : isSaturdayNight
      ? { active: true, name: "Saturday Night Movies", emoji: "🎬", message: "Prime binge time!" }
      : { active: false, name: null, emoji: null, message: null };

    return NextResponse.json({
      currentTime: {
        hour,
        dayOfWeek,
        isWeekend,
        vibe: timeBasedRec.vibe,
      },
      recommendations,
      communityPick,
      allCategories: Object.keys(CINEMA_PICKS),
      categorizedPicks: CINEMA_PICKS,
      activeNow: recentSmokers.results || [],
      userStats,
      specialEvent,
    });
  } catch (error) {
    console.error("Smoke Cinema error:", error);
    return NextResponse.json({ error: "Failed to load cinema" }, { status: 500 });
  }
}
