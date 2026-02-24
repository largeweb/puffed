import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// Same brand list as main route
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

function getWeeklyMatchup(weekNumber: number): { brandA: string; brandB: string } {
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
  };
}

function getWeekDateRange(weekNumber: number): { start: Date; end: Date } {
  const start = new Date(2026, 0, 1);
  start.setDate(start.getDate() + weekNumber * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

export interface PastBattle {
  weekNumber: number;
  brandA: string;
  brandB: string;
  votesA: number;
  votesB: number;
  totalVotes: number;
  winner: string | null; // null if tie
  winMargin: number;
  dateRange: string;
}

export interface BattleHistoryResponse {
  pastBattles: PastBattle[];
  stats: {
    totalBattles: number;
    totalVotes: number;
    mostVotedBattle: PastBattle | null;
    biggestLandslide: PastBattle | null;
  };
}

// GET /api/brand-battle/history - Get past battle results
export async function GET(request: NextRequest): Promise<NextResponse<BattleHistoryResponse>> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const currentWeek = getWeekNumber();
    
    // Get all past votes grouped by week
    const votesQuery = await db.prepare(`
      SELECT 
        week_number,
        brand,
        COUNT(*) as vote_count
      FROM brand_battle_votes
      WHERE week_number < ?
      GROUP BY week_number, brand
      ORDER BY week_number DESC
    `).bind(currentWeek).all<{ week_number: number; brand: string; vote_count: number }>();

    // Group votes by week
    const weekVotes = new Map<number, Map<string, number>>();
    for (const row of votesQuery.results || []) {
      if (!weekVotes.has(row.week_number)) {
        weekVotes.set(row.week_number, new Map());
      }
      weekVotes.get(row.week_number)!.set(row.brand, row.vote_count);
    }

    // Build past battles array
    const pastBattles: PastBattle[] = [];
    
    // Go back up to 10 weeks
    const weeksToCheck = Math.min(currentWeek, 10);
    for (let i = 1; i <= weeksToCheck; i++) {
      const weekNum = currentWeek - i;
      if (weekNum < 0) continue;
      
      const matchup = getWeeklyMatchup(weekNum);
      const votes = weekVotes.get(weekNum);
      
      const votesA = votes?.get(matchup.brandA) || 0;
      const votesB = votes?.get(matchup.brandB) || 0;
      const totalVotes = votesA + votesB;
      
      // Only include weeks that had votes
      if (totalVotes === 0) continue;
      
      let winner: string | null = null;
      if (votesA > votesB) winner = matchup.brandA;
      else if (votesB > votesA) winner = matchup.brandB;
      
      const dateRange = getWeekDateRange(weekNum);
      const dateStr = `${dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      
      pastBattles.push({
        weekNumber: weekNum,
        brandA: matchup.brandA,
        brandB: matchup.brandB,
        votesA,
        votesB,
        totalVotes,
        winner,
        winMargin: Math.abs(votesA - votesB),
        dateRange: dateStr,
      });
    }

    // Calculate stats
    let totalVotes = 0;
    let mostVotedBattle: PastBattle | null = null;
    let biggestLandslide: PastBattle | null = null;

    for (const battle of pastBattles) {
      totalVotes += battle.totalVotes;
      
      if (!mostVotedBattle || battle.totalVotes > mostVotedBattle.totalVotes) {
        mostVotedBattle = battle;
      }
      
      if (battle.winner && (!biggestLandslide || battle.winMargin > biggestLandslide.winMargin)) {
        biggestLandslide = battle;
      }
    }

    return NextResponse.json({
      pastBattles,
      stats: {
        totalBattles: pastBattles.length,
        totalVotes,
        mostVotedBattle,
        biggestLandslide,
      }
    });
  } catch (error) {
    console.error("Battle history error:", error);
    return NextResponse.json({
      pastBattles: [],
      stats: {
        totalBattles: 0,
        totalVotes: 0,
        mostVotedBattle: null,
        biggestLandslide: null,
      }
    });
  }
}
