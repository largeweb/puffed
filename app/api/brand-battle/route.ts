import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// Premium cigar brands for matchups
const BATTLE_BRANDS = [
  "Padron",
  "Arturo Fuente",
  "Oliva",
  "My Father",
  "Davidoff",
  "Ashton",
  "Liga Privada",
  "Rocky Patel",
  "Perdomo",
  "CAO",
  "Romeo y Julieta",
  "Montecristo",
  "Cohiba",
  "Partagas",
  "H. Upmann",
  "Tatuaje",
  "Crowned Heads",
  "Alec Bradley",
  "La Flor Dominicana",
  "Drew Estate"
];

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(2026, 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

function getWeeklyMatchup(): { brandA: string; brandB: string; weekNumber: number } {
  const weekNumber = getWeekNumber();
  // Deterministic pairing based on week number
  const seed = weekNumber * 1337;
  const shuffled = [...BATTLE_BRANDS].sort((a, b) => {
    const hashA = (a.charCodeAt(0) * seed) % 1000;
    const hashB = (b.charCodeAt(0) * seed) % 1000;
    return hashA - hashB;
  });
  
  const pairIndex = weekNumber % Math.floor(BATTLE_BRANDS.length / 2);
  return {
    brandA: shuffled[pairIndex * 2],
    brandB: shuffled[pairIndex * 2 + 1],
    weekNumber
  };
}

export interface BrandBattleResponse {
  brandA: string;
  brandB: string;
  weekNumber: number;
  votesA: number;
  votesB: number;
  totalVotes: number;
  userVote: string | null;
  votersA: string[];
  votersB: string[];
  endsAt: number;
  error?: string;
}

// GET /api/brand-battle - Get current matchup and votes
export async function GET(request: NextRequest): Promise<NextResponse<BrandBattleResponse>> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const matchup = getWeeklyMatchup();
    
    // Get user from cookie
    const sessionCookie = request.cookies.get("puffed_session")?.value;
    let userId: string | null = null;
    
    if (sessionCookie) {
      const session = await db.prepare(
        "SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?"
      ).bind(sessionCookie, Math.floor(Date.now() / 1000)).first<{ user_id: string }>();
      userId = session?.user_id || null;
    }

    // Get votes for this week
    const votes = await db.prepare(`
      SELECT 
        brand,
        COUNT(*) as vote_count,
        GROUP_CONCAT(u.username) as voters
      FROM brand_battle_votes v
      JOIN users u ON v.user_id = u.id
      WHERE week_number = ?
      GROUP BY brand
    `).bind(matchup.weekNumber).all<{ brand: string; vote_count: number; voters: string }>();

    let votesA = 0;
    let votesB = 0;
    let votersA: string[] = [];
    let votersB: string[] = [];

    for (const row of votes.results || []) {
      if (row.brand === matchup.brandA) {
        votesA = row.vote_count;
        votersA = row.voters?.split(",").slice(0, 10) || [];
      } else if (row.brand === matchup.brandB) {
        votesB = row.vote_count;
        votersB = row.voters?.split(",").slice(0, 10) || [];
      }
    }

    // Get user's vote
    let userVote: string | null = null;
    if (userId) {
      const existingVote = await db.prepare(
        "SELECT brand FROM brand_battle_votes WHERE user_id = ? AND week_number = ?"
      ).bind(userId, matchup.weekNumber).first<{ brand: string }>();
      userVote = existingVote?.brand || null;
    }

    // Calculate when this week ends (next Sunday midnight)
    const now = new Date();
    const daysUntilSunday = 7 - now.getDay();
    const endsAt = new Date(now);
    endsAt.setDate(now.getDate() + daysUntilSunday);
    endsAt.setHours(23, 59, 59, 999);

    return NextResponse.json({
      ...matchup,
      votesA,
      votesB,
      totalVotes: votesA + votesB,
      userVote,
      votersA,
      votersB,
      endsAt: Math.floor(endsAt.getTime() / 1000)
    });
  } catch (error) {
    console.error("Brand battle error:", error);
    return NextResponse.json({
      brandA: "",
      brandB: "",
      weekNumber: 0,
      votesA: 0,
      votesB: 0,
      totalVotes: 0,
      userVote: null,
      votersA: [],
      votersB: [],
      endsAt: 0,
      error: "Failed to load battle"
    });
  }
}

// POST /api/brand-battle - Cast a vote
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const sessionCookie = request.cookies.get("puffed_session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await db.prepare(
      "SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?"
    ).bind(sessionCookie, Math.floor(Date.now() / 1000)).first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json() as { brand: string };
    const { brand } = body;
    const matchup = getWeeklyMatchup();

    if (brand !== matchup.brandA && brand !== matchup.brandB) {
      return NextResponse.json({ error: "Invalid brand for this battle" }, { status: 400 });
    }

    // Check for existing vote
    const existingVote = await db.prepare(
      "SELECT id FROM brand_battle_votes WHERE user_id = ? AND week_number = ?"
    ).bind(session.user_id, matchup.weekNumber).first();

    if (existingVote) {
      // Update vote
      await db.prepare(
        "UPDATE brand_battle_votes SET brand = ?, voted_at = ? WHERE user_id = ? AND week_number = ?"
      ).bind(brand, Math.floor(Date.now() / 1000), session.user_id, matchup.weekNumber).run();
    } else {
      // Insert new vote
      const id = crypto.randomUUID();
      await db.prepare(
        "INSERT INTO brand_battle_votes (id, user_id, week_number, brand, voted_at) VALUES (?, ?, ?, ?, ?)"
      ).bind(id, session.user_id, matchup.weekNumber, brand, Math.floor(Date.now() / 1000)).run();
    }

    return NextResponse.json({ success: true, voted: brand });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
