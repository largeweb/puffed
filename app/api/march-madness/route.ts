import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";

// 16 brands for March Madness bracket - seeded by platform popularity/quality
const BRACKET_BRANDS = [
  // Region 1 (1-4 seeds)
  "American Spirit", "Marlboro", "Camel", "Newport",
  // Region 2 (5-8 seeds)
  "Parliament", "Lucky Strike", "Pall Mall", "Winston",
  // Region 3 (9-12 seeds)
  "Kanna", "Muha Meds", "Peak", "Zyn",
  // Region 4 (13-16 seeds)
  "Padron", "My Father", "Arturo Fuente", "Montecristo"
];

// March 2026 tournament schedule (in EDT/EST)
const TOURNAMENT_START = new Date("2026-03-01T00:00:00-05:00").getTime() / 1000;
const ROUND_DURATION = 7 * 24 * 60 * 60; // 7 days per round

interface MatchupResult {
  matchId: string;
  round: number;
  position: number;
  brandA: string;
  brandB: string | null;
  votesA: number;
  votesB: number;
  winner: string | null;
  isActive: boolean;
  startsAt: number;
  endsAt: number;
}

export interface MarchMadnessResponse {
  year: number;
  currentRound: number;
  roundNames: string[];
  bracket: MatchupResult[];
  userVotes: Record<string, string>;
  champion: string | null;
  stats: {
    totalVotes: number;
    totalVoters: number;
    mostVotedMatchup: string | null;
  };
}

function getRoundName(round: number): string {
  const names = ["Sweet 16", "Elite 8", "Final Four", "Championship"];
  return names[round - 1] || `Round ${round}`;
}

function getMatchId(round: number, position: number): string {
  return `2026_R${round}_M${position}`;
}

function getRoundTiming(round: number): { startsAt: number; endsAt: number } {
  const startsAt = TOURNAMENT_START + (round - 1) * ROUND_DURATION;
  const endsAt = startsAt + ROUND_DURATION;
  return { startsAt, endsAt };
}

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = env.DB;
  const now = Math.floor(Date.now() / 1000);

  // Get current user
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  let currentUserId: number | null = null;

  if (sessionToken) {
    const userRow = await db
      .prepare("SELECT id FROM users WHERE session_token = ?")
      .bind(sessionToken)
      .first<{ id: number }>();
    if (userRow) currentUserId = userRow.id;
  }

  // Initialize bracket table if needed
  await db.exec(`
    CREATE TABLE IF NOT EXISTS march_madness_bracket (
      match_id TEXT PRIMARY KEY,
      year INTEGER NOT NULL,
      round INTEGER NOT NULL,
      position INTEGER NOT NULL,
      brand_a TEXT NOT NULL,
      brand_b TEXT,
      votes_a INTEGER DEFAULT 0,
      votes_b INTEGER DEFAULT 0,
      winner TEXT,
      starts_at INTEGER NOT NULL,
      ends_at INTEGER NOT NULL
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS march_madness_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      brand TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(match_id, user_id)
    )
  `);

  // Check if 2026 bracket exists, if not initialize it
  const existingBracket = await db
    .prepare("SELECT COUNT(*) as count FROM march_madness_bracket WHERE year = 2026")
    .first<{ count: number }>();

  if (!existingBracket || existingBracket.count === 0) {
    // Initialize Round 1 (Sweet 16) - 8 matchups
    const round1Timing = getRoundTiming(1);
    const insertStmt = db.prepare(`
      INSERT INTO march_madness_bracket (match_id, year, round, position, brand_a, brand_b, starts_at, ends_at)
      VALUES (?, 2026, 1, ?, ?, ?, ?, ?)
    `);

    const matchups = [
      [BRACKET_BRANDS[0], BRACKET_BRANDS[15]],  // 1 vs 16
      [BRACKET_BRANDS[7], BRACKET_BRANDS[8]],   // 8 vs 9
      [BRACKET_BRANDS[4], BRACKET_BRANDS[11]],  // 5 vs 12
      [BRACKET_BRANDS[3], BRACKET_BRANDS[12]],  // 4 vs 13
      [BRACKET_BRANDS[2], BRACKET_BRANDS[13]],  // 3 vs 14
      [BRACKET_BRANDS[5], BRACKET_BRANDS[10]],  // 6 vs 11
      [BRACKET_BRANDS[6], BRACKET_BRANDS[9]],   // 7 vs 10
      [BRACKET_BRANDS[1], BRACKET_BRANDS[14]],  // 2 vs 15
    ];

    for (let i = 0; i < matchups.length; i++) {
      await insertStmt
        .bind(
          getMatchId(1, i + 1),
          i + 1,
          matchups[i][0],
          matchups[i][1],
          round1Timing.startsAt,
          round1Timing.endsAt
        )
        .run();
    }

    // Initialize placeholder rounds 2-4
    for (let round = 2; round <= 4; round++) {
      const timing = getRoundTiming(round);
      const matchCount = Math.pow(2, 4 - round); // 4, 2, 1
      for (let pos = 1; pos <= matchCount; pos++) {
        await db
          .prepare(`
            INSERT INTO march_madness_bracket (match_id, year, round, position, brand_a, brand_b, starts_at, ends_at)
            VALUES (?, 2026, ?, ?, 'TBD', NULL, ?, ?)
          `)
          .bind(getMatchId(round, pos), round, pos, timing.startsAt, timing.endsAt)
          .run();
      }
    }
  }

  // Process round endings - advance winners
  const completedMatches = await db
    .prepare(`
      SELECT * FROM march_madness_bracket 
      WHERE year = 2026 AND ends_at < ? AND winner IS NULL AND brand_b IS NOT NULL
    `)
    .bind(now)
    .all<{
      match_id: string;
      round: number;
      position: number;
      brand_a: string;
      brand_b: string;
      votes_a: number;
      votes_b: number;
    }>();

  for (const match of completedMatches.results || []) {
    // Determine winner (higher votes wins, tie goes to brand_a as higher seed)
    const winner = match.votes_a >= match.votes_b ? match.brand_a : match.brand_b;
    
    // Update winner
    await db
      .prepare("UPDATE march_madness_bracket SET winner = ? WHERE match_id = ?")
      .bind(winner, match.match_id)
      .run();

    // Advance to next round
    const nextRound = match.round + 1;
    const nextPosition = Math.ceil(match.position / 2);
    const nextMatchId = getMatchId(nextRound, nextPosition);
    const isFirstOfPair = match.position % 2 === 1;

    if (nextRound <= 4) {
      if (isFirstOfPair) {
        await db
          .prepare("UPDATE march_madness_bracket SET brand_a = ? WHERE match_id = ?")
          .bind(winner, nextMatchId)
          .run();
      } else {
        await db
          .prepare("UPDATE march_madness_bracket SET brand_b = ? WHERE match_id = ?")
          .bind(winner, nextMatchId)
          .run();
      }
    }
  }

  // Fetch full bracket
  const bracketRows = await db
    .prepare(`
      SELECT * FROM march_madness_bracket WHERE year = 2026 ORDER BY round, position
    `)
    .all<{
      match_id: string;
      round: number;
      position: number;
      brand_a: string;
      brand_b: string | null;
      votes_a: number;
      votes_b: number;
      winner: string | null;
      starts_at: number;
      ends_at: number;
    }>();

  // Get user's votes
  let userVotes: Record<string, string> = {};
  if (currentUserId) {
    const voteRows = await db
      .prepare("SELECT match_id, brand FROM march_madness_votes WHERE user_id = ?")
      .bind(currentUserId)
      .all<{ match_id: string; brand: string }>();
    
    for (const vote of voteRows.results || []) {
      userVotes[vote.match_id] = vote.brand;
    }
  }

  // Build response
  const bracket: MatchupResult[] = (bracketRows.results || []).map(row => ({
    matchId: row.match_id,
    round: row.round,
    position: row.position,
    brandA: row.brand_a,
    brandB: row.brand_b,
    votesA: row.votes_a,
    votesB: row.votes_b,
    winner: row.winner,
    isActive: now >= row.starts_at && now < row.ends_at && !row.winner && row.brand_b !== null && row.brand_a !== "TBD",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }));

  // Determine current round
  let currentRound = 1;
  for (let r = 1; r <= 4; r++) {
    const timing = getRoundTiming(r);
    if (now >= timing.startsAt && now < timing.endsAt) {
      currentRound = r;
      break;
    } else if (now >= timing.endsAt) {
      currentRound = Math.min(r + 1, 4);
    }
  }

  // Stats
  const statsRow = await db
    .prepare(`
      SELECT 
        COALESCE(SUM(votes_a + votes_b), 0) as total_votes,
        COUNT(DISTINCT user_id) as total_voters
      FROM march_madness_bracket b
      LEFT JOIN march_madness_votes v ON b.match_id = v.match_id
      WHERE b.year = 2026
    `)
    .first<{ total_votes: number; total_voters: number }>();

  // Check for champion
  const championRow = await db
    .prepare("SELECT winner FROM march_madness_bracket WHERE year = 2026 AND round = 4")
    .first<{ winner: string | null }>();

  const response: MarchMadnessResponse = {
    year: 2026,
    currentRound,
    roundNames: ["Sweet 16", "Elite 8", "Final Four", "Championship"],
    bracket,
    userVotes,
    champion: championRow?.winner || null,
    stats: {
      totalVotes: statsRow?.total_votes || 0,
      totalVoters: statsRow?.total_voters || 0,
      mostVotedMatchup: null,
    },
  };

  return NextResponse.json(response);
}

export async function POST(request: NextRequest) {
  const { env } = getRequestContext();
  const db = env.DB;
  const now = Math.floor(Date.now() / 1000);

  // Auth required
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  
  if (!sessionToken) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const userRow = await db
    .prepare("SELECT id FROM users WHERE session_token = ?")
    .bind(sessionToken)
    .first<{ id: number }>();

  if (!userRow) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { matchId, brand } = await request.json() as { matchId: string; brand: string };

  if (!matchId || !brand) {
    return NextResponse.json({ error: "Missing matchId or brand" }, { status: 400 });
  }

  // Verify match exists and is active
  const match = await db
    .prepare(`
      SELECT * FROM march_madness_bracket 
      WHERE match_id = ? AND brand_b IS NOT NULL AND winner IS NULL
    `)
    .bind(matchId)
    .first<{
      match_id: string;
      brand_a: string;
      brand_b: string;
      starts_at: number;
      ends_at: number;
    }>();

  if (!match) {
    return NextResponse.json({ error: "Match not found or not active" }, { status: 404 });
  }

  if (now < match.starts_at || now >= match.ends_at) {
    return NextResponse.json({ error: "Voting not open for this match" }, { status: 400 });
  }

  if (brand !== match.brand_a && brand !== match.brand_b) {
    return NextResponse.json({ error: "Invalid brand for this match" }, { status: 400 });
  }

  // Check for existing vote
  const existingVote = await db
    .prepare("SELECT brand FROM march_madness_votes WHERE match_id = ? AND user_id = ?")
    .bind(matchId, userRow.id)
    .first<{ brand: string }>();

  if (existingVote) {
    // Update vote
    const oldBrand = existingVote.brand;
    if (oldBrand === brand) {
      return NextResponse.json({ success: true, message: "Vote unchanged" });
    }

    await db
      .prepare("UPDATE march_madness_votes SET brand = ? WHERE match_id = ? AND user_id = ?")
      .bind(brand, matchId, userRow.id)
      .run();

    // Update vote counts
    const voteColumn = brand === match.brand_a ? "votes_a" : "votes_b";
    const oldColumn = oldBrand === match.brand_a ? "votes_a" : "votes_b";

    await db
      .prepare(`UPDATE march_madness_bracket SET ${voteColumn} = ${voteColumn} + 1, ${oldColumn} = ${oldColumn} - 1 WHERE match_id = ?`)
      .bind(matchId)
      .run();
  } else {
    // New vote
    await db
      .prepare("INSERT INTO march_madness_votes (match_id, user_id, brand, created_at) VALUES (?, ?, ?, ?)")
      .bind(matchId, userRow.id, brand, now)
      .run();

    const voteColumn = brand === match.brand_a ? "votes_a" : "votes_b";
    await db
      .prepare(`UPDATE march_madness_bracket SET ${voteColumn} = ${voteColumn} + 1 WHERE match_id = ?`)
      .bind(matchId)
      .run();
  }

  return NextResponse.json({ success: true });
}
