import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface Checkin {
  id: number;
  brand: string;
  product: string | null;
  rating: number | null;
  review: string;
  username: string;
  flavor_notes: string | null;
}

interface GuessResult {
  correct: boolean;
  correctBrand: string;
  streak: number;
  totalCorrect: number;
  totalAttempts: number;
}

interface ChallengeData {
  challengeId: string;
  review: string;
  rating: number | null;
  flavors: string[];
  product: string | null;
  username: string;
  options: string[];
}

// Store active challenges in memory (in production, use KV or D1)
const activeChallenges = new Map<string, { brand: string; checkinId: number }>();

// Get user session
async function getUser(db: D1Database): Promise<{ id: string; username: string } | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  if (!sessionId) return null;

  const row = await db.prepare(`
    SELECT u.id, u.username 
    FROM sessions s 
    JOIN users u ON s.user_id = u.id 
    WHERE s.id = ?
  `).bind(sessionId).first<{ id: string; username: string }>();

  return row || null;
}

// GET - Get a new challenge
export async function GET() {
  const { env } = getRequestContext();
  const db = env.DB;

  const user = await getUser(db);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's game stats
  const stats = await db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN correct = 1 THEN 1 ELSE 0 END), 0) as total_correct,
      COUNT(*) as total_attempts,
      0 as current_streak
    FROM guess_brand_attempts
    WHERE user_id = ?
  `).bind(user.id).first<{ total_correct: number; total_attempts: number; current_streak: number }>();

  // Calculate current streak
  const recentAttempts = await db.prepare(`
    SELECT correct FROM guess_brand_attempts
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).bind(user.id).all<{ correct: number }>();

  let currentStreak = 0;
  for (const attempt of recentAttempts.results || []) {
    if (attempt.correct === 1) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Get a random checkin with a review (not from the current user)
  const checkin = await db.prepare(`
    SELECT c.id, c.brand, c.product, c.rating, c.review, u.username, c.flavor_notes
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.review IS NOT NULL 
    AND LENGTH(c.review) > 20
    AND c.user_id != ?
    ORDER BY RANDOM()
    LIMIT 1
  `).bind(user.id).first<Checkin>();

  if (!checkin) {
    // Fallback: get any checkin with review
    const fallback = await db.prepare(`
      SELECT c.id, c.brand, c.product, c.rating, c.review, u.username, c.flavor_notes
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.review IS NOT NULL 
      AND LENGTH(c.review) > 20
      ORDER BY RANDOM()
      LIMIT 1
    `).first<Checkin>();

    if (!fallback) {
      return Response.json({ 
        error: "Not enough reviews yet", 
        message: "We need more check-ins with reviews to play this game!" 
      }, { status: 404 });
    }
  }

  const targetCheckin = checkin || await db.prepare(`
    SELECT c.id, c.brand, c.product, c.rating, c.review, u.username, c.flavor_notes
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.review IS NOT NULL 
    AND LENGTH(c.review) > 20
    ORDER BY RANDOM()
    LIMIT 1
  `).first<Checkin>();

  if (!targetCheckin) {
    return Response.json({ error: "No reviews available" }, { status: 404 });
  }

  // Get 3 other random brands as distractors
  const otherBrands = await db.prepare(`
    SELECT DISTINCT brand FROM checkins
    WHERE LOWER(brand) != LOWER(?)
    ORDER BY RANDOM()
    LIMIT 3
  `).bind(targetCheckin.brand).all<{ brand: string }>();

  // Create options array and shuffle
  const options = [
    targetCheckin.brand,
    ...(otherBrands.results || []).map(b => b.brand)
  ];
  
  // Fisher-Yates shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  // Generate challenge ID and store correct answer
  const challengeId = crypto.randomUUID();
  activeChallenges.set(challengeId, { 
    brand: targetCheckin.brand, 
    checkinId: targetCheckin.id 
  });

  // Clean up old challenges (keep last 1000)
  if (activeChallenges.size > 1000) {
    const keys = Array.from(activeChallenges.keys());
    for (let i = 0; i < 100; i++) {
      activeChallenges.delete(keys[i]);
    }
  }

  // Parse flavors
  const flavors = targetCheckin.flavor_notes 
    ? targetCheckin.flavor_notes.split(",").map(f => f.trim()).filter(Boolean)
    : [];

  const challenge: ChallengeData = {
    challengeId,
    review: targetCheckin.review,
    rating: targetCheckin.rating,
    flavors,
    product: targetCheckin.product,
    username: targetCheckin.username,
    options
  };

  return Response.json({
    challenge,
    stats: {
      totalCorrect: stats?.total_correct || 0,
      totalAttempts: stats?.total_attempts || 0,
      currentStreak
    }
  });
}

// POST - Submit a guess
export async function POST(request: Request) {
  const { env } = getRequestContext();
  const db = env.DB;

  const user = await getUser(db);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as { challengeId: string; guess: string };
  const { challengeId, guess } = body;

  if (!challengeId || !guess) {
    return Response.json({ error: "Missing challengeId or guess" }, { status: 400 });
  }

  // Get stored challenge
  const challenge = activeChallenges.get(challengeId);
  if (!challenge) {
    return Response.json({ error: "Challenge expired or invalid" }, { status: 400 });
  }

  const correct = guess.toLowerCase() === challenge.brand.toLowerCase();

  // Ensure table exists
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS guess_brand_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      checkin_id INTEGER NOT NULL,
      guessed_brand TEXT NOT NULL,
      correct_brand TEXT NOT NULL,
      correct INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `).run();

  // Record attempt
  await db.prepare(`
    INSERT INTO guess_brand_attempts (user_id, checkin_id, guessed_brand, correct_brand, correct, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    user.id,
    challenge.checkinId,
    guess,
    challenge.brand,
    correct ? 1 : 0,
    Math.floor(Date.now() / 1000)
  ).run();

  // Remove used challenge
  activeChallenges.delete(challengeId);

  // Get updated stats
  const stats = await db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN correct = 1 THEN 1 ELSE 0 END), 0) as total_correct,
      COUNT(*) as total_attempts
    FROM guess_brand_attempts
    WHERE user_id = ?
  `).bind(user.id).first<{ total_correct: number; total_attempts: number }>();

  // Calculate current streak
  const recentAttempts = await db.prepare(`
    SELECT correct FROM guess_brand_attempts
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).bind(user.id).all<{ correct: number }>();

  let currentStreak = 0;
  for (const attempt of recentAttempts.results || []) {
    if (attempt.correct === 1) {
      currentStreak++;
    } else {
      break;
    }
  }

  const result: GuessResult = {
    correct,
    correctBrand: challenge.brand,
    streak: currentStreak,
    totalCorrect: stats?.total_correct || 0,
    totalAttempts: stats?.total_attempts || 0
  };

  return Response.json(result);
}
