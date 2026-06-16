import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

export const runtime = "edge";

interface FlavorMatchUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  shared_flavors: string[];
  match_score: number;
  total_checkins: number;
}

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
    const sessionResult = await db.prepare(
      "SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?"
    ).bind(sessionId, Date.now()).first<{ user_id: string }>();

    if (!sessionResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = sessionResult.user_id;

    // Get the current user's flavor preferences from their check-ins
    const userFlavorsResult = await db.prepare(`
      SELECT DISTINCT json_each.value as flavor
      FROM checkins, json_each(checkins.flavor_tags)
      WHERE checkins.user_id = ?
        AND checkins.flavor_tags IS NOT NULL
        AND checkins.flavor_tags != '[]'
    `).bind(userId).all();

    const userFlavors = (userFlavorsResult.results as Array<{ flavor: string }>).map(r => r.flavor);

    if (userFlavors.length === 0) {
      return NextResponse.json({
        matches: [],
        userFlavors: [],
        message: "Log some check-ins with flavor tags to find your flavor matches!"
      });
    }

    // Find users with similar flavor preferences (excluding current user)
    // We'll get all users' flavor profiles and calculate overlap
    const otherUsersFlavors = await db.prepare(`
      SELECT 
        u.id,
        u.username,
        u.display_name,
        u.avatar_url,
        COUNT(DISTINCT c.id) as total_checkins,
        GROUP_CONCAT(DISTINCT json_each.value) as flavors
      FROM users u
      JOIN checkins c ON c.user_id = u.id
      JOIN json_each(c.flavor_tags) ON c.flavor_tags IS NOT NULL AND c.flavor_tags != '[]'
      WHERE u.id != ?
      GROUP BY u.id
      HAVING total_checkins >= 1
    `).bind(userId).all();

    // Calculate match scores
    const userFlavorSet = new Set(userFlavors);
    const matches: FlavorMatchUser[] = [];

    for (const row of otherUsersFlavors.results as Array<{
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      total_checkins: number;
      flavors: string;
    }>) {
      const otherFlavors = row.flavors ? row.flavors.split(",") : [];
      const sharedFlavors = otherFlavors.filter(f => userFlavorSet.has(f));
      
      if (sharedFlavors.length >= 2) { // At least 2 shared flavors
        const matchScore = Math.round((sharedFlavors.length / Math.max(userFlavors.length, otherFlavors.length)) * 100);
        
        matches.push({
          id: row.id,
          username: row.username,
          display_name: row.display_name,
          avatar_url: row.avatar_url,
          shared_flavors: sharedFlavors,
          match_score: matchScore,
          total_checkins: row.total_checkins,
        });
      }
    }

    // Sort by match score descending, then by total check-ins
    matches.sort((a, b) => {
      if (b.match_score !== a.match_score) return b.match_score - a.match_score;
      return b.total_checkins - a.total_checkins;
    });

    // Return top 10 matches
    return NextResponse.json({
      matches: matches.slice(0, 10),
      userFlavors,
      totalMatches: matches.length,
    });

  } catch (error) {
    console.error("Error fetching flavor matches:", error);
    return NextResponse.json(
      { error: "Failed to fetch flavor matches" },
      { status: 500 }
    );
  }
}
