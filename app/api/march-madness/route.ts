import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// 16 brands for the tournament bracket
const TOURNAMENT_BRANDS = [
  "American Spirit",
  "Marlboro",
  "Camel",
  "Newport",
  "Lucky Strike",
  "Parliament",
  "Winston",
  "Pall Mall",
  "Kool",
  "Salem",
  "Virginia Slims",
  "Nat Sherman",
  "Davidoff",
  "Dunhill",
  "Gitanes",
  "Gauloises"
];

async function getCurrentUserId(request: NextRequest, db: D1Database): Promise<string | null> {
  const sessionId = request.cookies.get("session_id")?.value;
  if (!sessionId) return null;

  const session = await db
    .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > unixepoch()")
    .bind(sessionId)
    .first<{ user_id: string }>();

  return session?.user_id || null;
}

async function initializeBracket(db: D1Database, year: number) {
  // Check if bracket exists for this year
  const existing = await db
    .prepare("SELECT COUNT(*) as count FROM march_matchups WHERE year = ?")
    .bind(year)
    .first<{ count: number }>();

  if (existing && existing.count > 0) {
    return; // Already initialized
  }

  // Shuffle brands for seeding
  const shuffled = [...TOURNAMENT_BRANDS].sort(() => Math.random() - 0.5);

  // Create Round of 16 matchups (8 games)
  const now = Math.floor(Date.now() / 1000);
  const dayInSeconds = 24 * 60 * 60;

  for (let i = 0; i < 8; i++) {
    const endTime = now + (dayInSeconds * 2); // Each matchup lasts 2 days initially
    await db
      .prepare(`
        INSERT INTO march_matchups (year, round, position, brand1, brand2, active, end_time)
        VALUES (?, 1, ?, ?, ?, 1, ?)
      `)
      .bind(year, i + 1, shuffled[i * 2], shuffled[i * 2 + 1], endTime)
      .run();
  }
}

async function advanceRound(db: D1Database, year: number) {
  // Check for matchups that should be closed
  const now = Math.floor(Date.now() / 1000);
  
  // Get all active matchups that have ended
  const endedMatchups = await db
    .prepare(`
      SELECT id, votes1, votes2, brand1, brand2 
      FROM march_matchups 
      WHERE year = ? AND active = 1 AND end_time < ? AND winner IS NULL
    `)
    .bind(year, now)
    .all<{ id: number; votes1: number; votes2: number; brand1: string; brand2: string }>();

  for (const matchup of endedMatchups.results || []) {
    // Determine winner (tie goes to brand1)
    const winner = matchup.votes1 >= matchup.votes2 ? matchup.brand1 : matchup.brand2;
    await db
      .prepare("UPDATE march_matchups SET winner = ?, active = 0 WHERE id = ?")
      .bind(winner, matchup.id)
      .run();
  }

  // Check if we need to create next round matchups
  const currentRound = await db
    .prepare(`
      SELECT round, COUNT(*) as total, SUM(CASE WHEN winner IS NOT NULL THEN 1 ELSE 0 END) as completed
      FROM march_matchups
      WHERE year = ?
      GROUP BY round
      ORDER BY round DESC
      LIMIT 1
    `)
    .bind(year)
    .first<{ round: number; total: number; completed: number }>();

  if (currentRound && currentRound.completed === currentRound.total && currentRound.round < 4) {
    // All matchups in current round are done, create next round
    const winners = await db
      .prepare(`
        SELECT winner FROM march_matchups 
        WHERE year = ? AND round = ? 
        ORDER BY position
      `)
      .bind(year, currentRound.round)
      .all<{ winner: string }>();

    const winnerList = (winners.results || []).map(w => w.winner);
    const nextRound = currentRound.round + 1;
    const matchupsInNextRound = winnerList.length / 2;
    const dayInSeconds = 24 * 60 * 60;

    for (let i = 0; i < matchupsInNextRound; i++) {
      const endTime = now + (dayInSeconds * 2);
      await db
        .prepare(`
          INSERT INTO march_matchups (year, round, position, brand1, brand2, active, end_time)
          VALUES (?, ?, ?, ?, ?, 1, ?)
        `)
        .bind(year, nextRound, i + 1, winnerList[i * 2], winnerList[i * 2 + 1], endTime)
        .run();
    }
  }
}

export async function GET(request: NextRequest) {
  const ctx = getRequestContext();
  const db = ctx.env.DB as D1Database;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Jan, 2 = March

  // Only active in March
  if (month !== 2) {
    return NextResponse.json({
      currentRound: 0,
      totalVotes: 0,
      activeMatchups: [],
      completedMatchups: [],
      upcomingMatchups: [],
      champion: null,
      topVoters: [],
      personalStats: null,
    });
  }

  // Initialize bracket if needed
  await initializeBracket(db, year);
  
  // Advance rounds if any matchups ended
  await advanceRound(db, year);

  const userId = await getCurrentUserId(request, db);

  // Get all matchups
  const matchups = await db
    .prepare(`
      SELECT id, round, position, brand1, brand2, votes1, votes2, winner, active, end_time
      FROM march_matchups
      WHERE year = ?
      ORDER BY round, position
    `)
    .bind(year)
    .all<{
      id: number;
      round: number;
      position: number;
      brand1: string;
      brand2: string;
      votes1: number;
      votes2: number;
      winner: string | null;
      active: number;
      end_time: number;
    }>();

  // Get user's votes
  let userVotes: Record<number, string> = {};
  if (userId) {
    const votes = await db
      .prepare("SELECT matchup_id, brand FROM march_votes WHERE user_id = ?")
      .bind(userId)
      .all<{ matchup_id: number; brand: string }>();
    
    for (const vote of votes.results || []) {
      userVotes[vote.matchup_id] = vote.brand;
    }
  }

  const allMatchups = matchups.results || [];
  
  const activeMatchups = allMatchups
    .filter(m => m.active === 1)
    .map(m => ({
      id: m.id,
      round: m.round,
      position: m.position,
      brand1: m.brand1,
      brand2: m.brand2,
      votes1: m.votes1,
      votes2: m.votes2,
      winner: m.winner,
      endTime: m.end_time,
      userVote: userVotes[m.id] || null,
    }));

  const completedMatchups = allMatchups
    .filter(m => m.winner !== null)
    .map(m => ({
      id: m.id,
      round: m.round,
      position: m.position,
      brand1: m.brand1,
      brand2: m.brand2,
      votes1: m.votes1,
      votes2: m.votes2,
      winner: m.winner,
      endTime: m.end_time,
      userVote: userVotes[m.id] || null,
    }));

  // Check for champion (round 4 winner)
  const championMatchup = allMatchups.find(m => m.round === 4 && m.winner);
  const champion = championMatchup?.winner || null;

  // Get current round
  const currentRound = Math.max(...allMatchups.filter(m => m.active === 1 || m.winner).map(m => m.round), 0);

  // Total votes
  const totalVotes = allMatchups.reduce((sum, m) => sum + m.votes1 + m.votes2, 0);

  // Top voters leaderboard
  const topVoters = await db
    .prepare(`
      SELECT 
        u.username,
        COUNT(v.id) as votes,
        SUM(CASE WHEN v.brand = m.winner THEN 1 ELSE 0 END) as correct
      FROM march_votes v
      JOIN users u ON v.user_id = u.id
      JOIN march_matchups m ON v.matchup_id = m.id
      WHERE m.year = ?
      GROUP BY v.user_id
      ORDER BY correct DESC, votes DESC
      LIMIT 10
    `)
    .bind(year)
    .all<{ username: string; votes: number; correct: number }>();

  // Personal stats
  let personalStats = null;
  if (userId) {
    const stats = await db
      .prepare(`
        SELECT 
          COUNT(v.id) as totalVotes,
          SUM(CASE WHEN v.brand = m.winner THEN 1 ELSE 0 END) as correctPicks
        FROM march_votes v
        JOIN march_matchups m ON v.matchup_id = m.id
        WHERE v.user_id = ? AND m.year = ?
      `)
      .bind(userId, year)
      .first<{ totalVotes: number; correctPicks: number }>();

    if (stats && stats.totalVotes > 0) {
      personalStats = {
        totalVotes: stats.totalVotes,
        correctPicks: stats.correctPicks || 0,
        accuracy: Math.round(((stats.correctPicks || 0) / stats.totalVotes) * 100),
      };
    }
  }

  return NextResponse.json({
    currentRound,
    totalVotes,
    activeMatchups,
    completedMatchups,
    upcomingMatchups: [],
    champion,
    topVoters: topVoters.results || [],
    personalStats,
  });
}
