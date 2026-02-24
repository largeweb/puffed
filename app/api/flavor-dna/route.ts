import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { FLAVOR_TAGS } from "@/lib/flavors";

export const runtime = "edge";

// Flavor personality types based on dominant flavors
const FLAVOR_PERSONALITIES = [
  {
    id: "bold_earthy",
    name: "Bold & Earthy",
    emoji: "🌋",
    description: "You love deep, grounding flavors that command attention",
    triggers: ["earth", "leather", "pepper", "smoke"],
  },
  {
    id: "sweet_smooth",
    name: "Sweet & Smooth",
    emoji: "🍯",
    description: "You gravitate toward mellow, comforting sweetness",
    triggers: ["honey", "vanilla", "cream", "chocolate"],
  },
  {
    id: "complex_spicy",
    name: "Complex & Spicy",
    emoji: "🔥",
    description: "You crave layers of intensity and bold spice",
    triggers: ["pepper", "spice", "cedar", "coffee"],
  },
  {
    id: "classic_woody",
    name: "Classic & Woody",
    emoji: "🪵",
    description: "You appreciate traditional, refined wood notes",
    triggers: ["cedar", "wood", "toast", "nuts"],
  },
  {
    id: "rich_indulgent",
    name: "Rich & Indulgent",
    emoji: "🍫",
    description: "You savor luxurious, dessert-like profiles",
    triggers: ["chocolate", "cocoa", "coffee", "cream"],
  },
  {
    id: "fresh_bright",
    name: "Fresh & Bright",
    emoji: "🍊",
    description: "You enjoy lighter, zesty, refreshing notes",
    triggers: ["citrus", "cream", "honey", "vanilla"],
  },
  {
    id: "adventurous",
    name: "The Adventurer",
    emoji: "🗺️",
    description: "You explore the full spectrum - no flavor is off limits",
    triggers: [], // fallback for diverse profiles
  },
];

function determinePersonality(topFlavors: string[]): typeof FLAVOR_PERSONALITIES[number] {
  if (topFlavors.length === 0) {
    return FLAVOR_PERSONALITIES[FLAVOR_PERSONALITIES.length - 1]; // Adventurer
  }

  // Score each personality based on trigger matches
  let bestMatch = FLAVOR_PERSONALITIES[FLAVOR_PERSONALITIES.length - 1];
  let bestScore = 0;

  for (const personality of FLAVOR_PERSONALITIES) {
    if (personality.triggers.length === 0) continue;
    
    const matches = topFlavors.filter(f => personality.triggers.includes(f));
    const score = matches.length / Math.min(personality.triggers.length, topFlavors.length);
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = personality;
    }
  }

  return bestMatch;
}

interface FlavorDNAResponse {
  username: string;
  totalSmokes: number;
  smokesWithFlavors: number;
  topFlavors: Array<{
    id: string;
    label: string;
    emoji: string;
    count: number;
    percentage: number;
  }>;
  personality: {
    id: string;
    name: string;
    emoji: string;
    description: string;
  };
  flavorDiversity: number; // 0-100, how many different flavors used
  radarData: Array<{ flavor: string; value: number }>; // For visualization
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<FlavorDNAResponse>> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    const { searchParams } = new URL(request.url);
    let username = searchParams.get("username");

    // If no username provided, get current user
    if (!username) {
      const sessionId = request.cookies.get("session")?.value;
      if (!sessionId) {
        return NextResponse.json({ error: "Not authenticated" } as FlavorDNAResponse, { status: 401 });
      }

      const session = await db.prepare(
        "SELECT user_id FROM sessions WHERE id = ? AND expires_at > unixepoch()"
      ).bind(sessionId).first<{ user_id: string }>();

      if (!session) {
        return NextResponse.json({ error: "Invalid session" } as FlavorDNAResponse, { status: 401 });
      }

      const user = await db.prepare("SELECT username FROM users WHERE id = ?")
        .bind(session.user_id).first<{ username: string }>();
      
      if (!user) {
        return NextResponse.json({ error: "User not found" } as FlavorDNAResponse, { status: 404 });
      }
      
      username = user.username;
    }

    // Get user
    const user = await db.prepare("SELECT id, username FROM users WHERE LOWER(username) = LOWER(?)")
      .bind(username).first<{ id: string; username: string }>();

    if (!user) {
      return NextResponse.json({ error: "User not found" } as FlavorDNAResponse, { status: 404 });
    }

    // Get all check-ins with flavors
    const checkins = await db.prepare(`
      SELECT flavors FROM checkins 
      WHERE user_id = ?
    `).bind(user.id).all<{ flavors: string | null }>();

    const totalSmokes = checkins.results?.length || 0;
    const checkinsWithFlavors = checkins.results?.filter(c => c.flavors && c.flavors.trim()) || [];
    const smokesWithFlavors = checkinsWithFlavors.length;

    // Count flavor occurrences
    const flavorCounts: Record<string, number> = {};
    
    for (const checkin of checkinsWithFlavors) {
      const flavors = checkin.flavors!.split(",").map(f => f.trim().toLowerCase());
      for (const flavor of flavors) {
        if (flavor) {
          flavorCounts[flavor] = (flavorCounts[flavor] || 0) + 1;
        }
      }
    }

    // Sort by count and get top flavors
    const sortedFlavors = Object.entries(flavorCounts)
      .sort((a, b) => b[1] - a[1]);

    const totalFlavorTags = sortedFlavors.reduce((sum, [, count]) => sum + count, 0);
    
    const topFlavors = sortedFlavors.slice(0, 6).map(([id, count]) => {
      const tag = FLAVOR_TAGS.find(t => t.id === id);
      return {
        id,
        label: tag?.label || id,
        emoji: tag?.emoji || "🏷️",
        count,
        percentage: totalFlavorTags > 0 ? Math.round((count / totalFlavorTags) * 100) : 0,
      };
    });

    // Calculate flavor diversity (how many unique flavors out of 16 possible)
    const uniqueFlavors = Object.keys(flavorCounts).length;
    const flavorDiversity = Math.round((uniqueFlavors / FLAVOR_TAGS.length) * 100);

    // Determine personality
    const personality = determinePersonality(topFlavors.slice(0, 4).map(f => f.id));

    // Build radar data for all flavors
    const maxCount = Math.max(...Object.values(flavorCounts), 1);
    const radarData = FLAVOR_TAGS.map(tag => ({
      flavor: tag.label,
      value: Math.round(((flavorCounts[tag.id] || 0) / maxCount) * 100),
    }));

    return NextResponse.json({
      username: user.username,
      totalSmokes,
      smokesWithFlavors,
      topFlavors,
      personality: {
        id: personality.id,
        name: personality.name,
        emoji: personality.emoji,
        description: personality.description,
      },
      flavorDiversity,
      radarData,
    });
  } catch (error) {
    console.error("Flavor DNA error:", error);
    return NextResponse.json({ error: "Failed to generate flavor DNA" } as FlavorDNAResponse, { status: 500 });
  }
}
