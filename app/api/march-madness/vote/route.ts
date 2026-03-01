import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

async function getCurrentUserId(request: NextRequest, db: D1Database): Promise<string | null> {
  const sessionId = request.cookies.get("session_id")?.value;
  if (!sessionId) return null;

  const session = await db
    .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > unixepoch()")
    .bind(sessionId)
    .first<{ user_id: string }>();

  return session?.user_id || null;
}

export async function POST(request: NextRequest) {
  const ctx = getRequestContext();
  const db = ctx.env.DB as D1Database;

  const userId = await getCurrentUserId(request, db);
  if (!userId) {
    return NextResponse.json({ error: "Must be logged in to vote" }, { status: 401 });
  }

  const body = await request.json() as { matchupId?: number; brand?: string };
  const { matchupId, brand } = body;

  if (!matchupId || !brand) {
    return NextResponse.json({ error: "Missing matchupId or brand" }, { status: 400 });
  }

  // Check matchup exists and is active
  const matchup = await db
    .prepare("SELECT id, brand1, brand2, active FROM march_matchups WHERE id = ?")
    .bind(matchupId)
    .first<{ id: number; brand1: string; brand2: string; active: number }>();

  if (!matchup) {
    return NextResponse.json({ error: "Matchup not found" }, { status: 404 });
  }

  if (matchup.active !== 1) {
    return NextResponse.json({ error: "Voting has closed for this matchup" }, { status: 400 });
  }

  if (brand !== matchup.brand1 && brand !== matchup.brand2) {
    return NextResponse.json({ error: "Invalid brand selection" }, { status: 400 });
  }

  // Check if user already voted
  const existingVote = await db
    .prepare("SELECT id FROM march_votes WHERE user_id = ? AND matchup_id = ?")
    .bind(userId, matchupId)
    .first();

  if (existingVote) {
    return NextResponse.json({ error: "You already voted on this matchup" }, { status: 400 });
  }

  // Record vote
  const voteId = crypto.randomUUID();
  await db
    .prepare("INSERT INTO march_votes (id, user_id, matchup_id, brand) VALUES (?, ?, ?, ?)")
    .bind(voteId, userId, matchupId, brand)
    .run();

  // Update vote count
  const voteColumn = brand === matchup.brand1 ? "votes1" : "votes2";
  await db
    .prepare(`UPDATE march_matchups SET ${voteColumn} = ${voteColumn} + 1 WHERE id = ?`)
    .bind(matchupId)
    .run();

  return NextResponse.json({ success: true, voteId });
}
