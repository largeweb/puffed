import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface FlavorCount {
  id: string;
  count: number;
}

interface FlavorJourneyResponse {
  topFlavors: FlavorCount[];
  totalCheckins: number;
  checkinsWithFlavors: number;
  unexploredFlavors: string[];
  recentFlavors: string[];
  flavorDiversity: number;
}

// All available flavors
const ALL_FLAVORS = [
  "cedar", "leather", "pepper", "coffee", "chocolate", "earth",
  "cream", "nuts", "spice", "wood", "honey", "cocoa",
  "vanilla", "citrus", "toast", "smoke"
];

export async function GET(): Promise<NextResponse<FlavorJourneyResponse | { error: string }>> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const ctx = getRequestContext();
    const db = ctx.env.DB;

    // Get user from session
    const sessionRow = await db.prepare(
      "SELECT user_id FROM sessions WHERE id = ?"
    ).bind(session).first<{ user_id: string }>();

    if (!sessionRow) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = sessionRow.user_id;

    // Get all check-ins with flavor notes
    const checkinsResult = await db.prepare(`
      SELECT flavor_notes, created_at
      FROM checkins
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all<{ flavor_notes: string | null; created_at: number }>();

    const checkins = checkinsResult.results || [];
    const totalCheckins = checkins.length;

    // Count flavors
    const flavorCounts: Record<string, number> = {};
    let checkinsWithFlavors = 0;
    const recentFlavorSet = new Set<string>();
    const exploredFlavors = new Set<string>();

    // Process recent check-ins (last 5) for recent flavors
    const recentCheckins = checkins.slice(0, 5);
    
    for (const checkin of checkins) {
      if (!checkin.flavor_notes) continue;
      
      try {
        const tags = JSON.parse(checkin.flavor_notes) as string[];
        if (tags.length > 0) {
          checkinsWithFlavors++;
          
          for (const tag of tags) {
            flavorCounts[tag] = (flavorCounts[tag] || 0) + 1;
            exploredFlavors.add(tag);
            
            // Track recent flavors (from last 5 check-ins)
            if (recentCheckins.includes(checkin)) {
              recentFlavorSet.add(tag);
            }
          }
        }
      } catch {
        // Invalid JSON, skip
      }
    }

    // Sort by count and get top flavors
    const topFlavors: FlavorCount[] = Object.entries(flavorCounts)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Find unexplored flavors
    const unexploredFlavors = ALL_FLAVORS.filter(f => !exploredFlavors.has(f));

    // Calculate flavor diversity (percentage of flavors explored)
    const flavorDiversity = Math.round((exploredFlavors.size / ALL_FLAVORS.length) * 100);

    return NextResponse.json({
      topFlavors,
      totalCheckins,
      checkinsWithFlavors,
      unexploredFlavors,
      recentFlavors: Array.from(recentFlavorSet),
      flavorDiversity
    });
  } catch (error) {
    console.error("Flavor journey error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
