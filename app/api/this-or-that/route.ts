import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

// Fun "This or That" matchups for smokers
const MATCHUPS = [
  { id: "morning-night", a: "☀️ Morning Smoke", b: "🌙 Night Smoke" },
  { id: "indoor-outdoor", a: "🏠 Indoor", b: "🌳 Outdoor" },
  { id: "coffee-whiskey", a: "☕ Coffee Pairing", b: "🥃 Whiskey Pairing" },
  { id: "solo-social", a: "🧘 Solo Session", b: "👥 Social Smoke" },
  { id: "mild-full", a: "🌬️ Mild & Smooth", b: "💨 Full & Bold" },
  { id: "quick-long", a: "⚡ Quick Smoke", b: "🕰️ Long Session" },
  { id: "classic-new", a: "📜 Classic Brands", b: "🆕 New Discoveries" },
  { id: "silence-music", a: "🤫 Peaceful Silence", b: "🎵 Music Playing" },
  { id: "work-leisure", a: "💼 After Work", b: "🎮 Pure Leisure" },
  { id: "sun-rain", a: "☀️ Sunny Day", b: "🌧️ Rainy Day" },
  { id: "beach-mountain", a: "🏖️ Beach Vibes", b: "⛰️ Mountain Air" },
  { id: "plain-flavored", a: "🚬 Plain/Natural", b: "🍬 Flavored" },
  { id: "quantity-quality", a: "📊 More Smokes", b: "⭐ Premium Quality" },
  { id: "tradition-experiment", a: "🏛️ Stick to Favorites", b: "🔬 Try Everything" },
  { id: "photos-private", a: "📸 Share Every Smoke", b: "🤐 Keep It Private" },
];

// Get today's matchup based on date
function getTodaysMatchup() {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return MATCHUPS[dayOfYear % MATCHUPS.length];
}

async function getUserId(db: D1Database): Promise<number | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;
  
  if (!sessionToken) return null;
  
  const session = await db.prepare(
    "SELECT user_id FROM sessions WHERE id = ?"
  ).bind(sessionToken).first<{ user_id: number }>();
  
  return session?.user_id || null;
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const userId = await getUserId(db);

    const matchup = getTodaysMatchup();
    const today = new Date().toISOString().split("T")[0];
    
    let votesA = 0;
    let votesB = 0;
    let userVote: string | null = null;
    let recentVoters: Array<{ username: string; choice: string; voted_at: number }> = [];

    try {
      const countsA = await db.prepare(
        `SELECT COUNT(*) as count FROM this_or_that_votes 
         WHERE matchup_id = ? AND vote_date = ? AND choice = 'a'`
      ).bind(matchup.id, today).first<{ count: number }>();
      
      const countsB = await db.prepare(
        `SELECT COUNT(*) as count FROM this_or_that_votes 
         WHERE matchup_id = ? AND vote_date = ? AND choice = 'b'`
      ).bind(matchup.id, today).first<{ count: number }>();
      
      votesA = countsA?.count || 0;
      votesB = countsB?.count || 0;

      if (userId) {
        const existing = await db.prepare(
          `SELECT choice FROM this_or_that_votes 
           WHERE matchup_id = ? AND vote_date = ? AND user_id = ?`
        ).bind(matchup.id, today, userId).first<{ choice: string }>();
        userVote = existing?.choice || null;
      }

      // Get recent voters
      const recent = await db.prepare(
        `SELECT u.username, v.choice, v.voted_at
         FROM this_or_that_votes v
         JOIN users u ON v.user_id = u.id
         WHERE v.matchup_id = ? AND v.vote_date = ?
         ORDER BY v.voted_at DESC
         LIMIT 10`
      ).bind(matchup.id, today).all<{ username: string; choice: string; voted_at: number }>();
      recentVoters = recent.results || [];

    } catch {
      // Table might not exist yet - will be created on first vote
    }

    const totalVotes = votesA + votesB;
    const percentA = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 50;
    const percentB = totalVotes > 0 ? Math.round((votesB / totalVotes) * 100) : 50;

    return NextResponse.json({
      matchup,
      votesA,
      votesB,
      percentA,
      percentB,
      totalVotes,
      userVote,
      recentVoters,
      allMatchups: MATCHUPS.length,
    });
  } catch (error) {
    console.error("This or that GET error:", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const userId = await getUserId(db);
    
    if (!userId) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const { choice } = await request.json() as { choice: string };
    
    if (choice !== "a" && choice !== "b") {
      return NextResponse.json({ error: "Invalid choice" }, { status: 400 });
    }

    const matchup = getTodaysMatchup();
    const today = new Date().toISOString().split("T")[0];
    const now = Math.floor(Date.now() / 1000);

    // Create table if not exists
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS this_or_that_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        matchup_id TEXT NOT NULL,
        vote_date TEXT NOT NULL,
        choice TEXT NOT NULL,
        voted_at INTEGER NOT NULL,
        UNIQUE(user_id, matchup_id, vote_date)
      )
    `).run();

    // Check for existing vote
    const existing = await db.prepare(
      `SELECT id FROM this_or_that_votes WHERE user_id = ? AND matchup_id = ? AND vote_date = ?`
    ).bind(userId, matchup.id, today).first();

    if (existing) {
      // Update existing vote
      await db.prepare(
        `UPDATE this_or_that_votes SET choice = ?, voted_at = ? WHERE user_id = ? AND matchup_id = ? AND vote_date = ?`
      ).bind(choice, now, userId, matchup.id, today).run();
    } else {
      // Insert new vote
      await db.prepare(
        `INSERT INTO this_or_that_votes (user_id, matchup_id, vote_date, choice, voted_at) VALUES (?, ?, ?, ?, ?)`
      ).bind(userId, matchup.id, today, choice, now).run();
    }

    // Return updated counts
    const countsA = await db.prepare(
      `SELECT COUNT(*) as count FROM this_or_that_votes WHERE matchup_id = ? AND vote_date = ? AND choice = 'a'`
    ).bind(matchup.id, today).first<{ count: number }>();
    
    const countsB = await db.prepare(
      `SELECT COUNT(*) as count FROM this_or_that_votes WHERE matchup_id = ? AND vote_date = ? AND choice = 'b'`
    ).bind(matchup.id, today).first<{ count: number }>();

    const votesA = countsA?.count || 0;
    const votesB = countsB?.count || 0;
    const totalVotes = votesA + votesB;

    return NextResponse.json({
      success: true,
      votesA,
      votesB,
      percentA: Math.round((votesA / totalVotes) * 100),
      percentB: Math.round((votesB / totalVotes) * 100),
      totalVotes,
      userVote: choice,
    });
  } catch (error) {
    console.error("This or that POST error:", error);
    return NextResponse.json({ error: "Vote failed" }, { status: 500 });
  }
}
