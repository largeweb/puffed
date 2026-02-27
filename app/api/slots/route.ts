import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// Slot symbols with weights (higher = more common)
const SYMBOLS = [
  { emoji: "🚬", name: "cigar", weight: 20, value: 1 },
  { emoji: "☕", name: "coffee", weight: 15, value: 2 },
  { emoji: "🥃", name: "whiskey", weight: 12, value: 3 },
  { emoji: "🌙", name: "moon", weight: 10, value: 4 },
  { emoji: "⭐", name: "star", weight: 8, value: 5 },
  { emoji: "🔥", name: "fire", weight: 6, value: 8 },
  { emoji: "💎", name: "diamond", weight: 4, value: 15 },
  { emoji: "🏆", name: "trophy", weight: 2, value: 25 },
];

// Calculate total weight for weighted random selection
const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

function getRandomSymbol() {
  let random = Math.random() * TOTAL_WEIGHT;
  for (const symbol of SYMBOLS) {
    random -= symbol.weight;
    if (random <= 0) return symbol;
  }
  return SYMBOLS[0];
}

// Prize messages
const JACKPOT_MESSAGES = [
  "🎰 JACKPOT! You hit the trifecta!",
  "🎉 WINNER! Triple match!",
  "💰 BIG WIN! Same symbol on all reels!",
  "🏆 LEGENDARY SPIN! You're on fire!",
];

const DOUBLE_MESSAGES = [
  "✨ Nice! Two matching symbols!",
  "👀 Close one! Two out of three!",
  "🎯 Almost there! Double match!",
];

const MISS_MESSAGES = [
  "💨 No match, but the next spin awaits!",
  "🎲 Keep spinning, luck is coming!",
  "🌪️ So close! Try again!",
  "🎭 The slots are warming up...",
];

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    const { env } = getRequestContext();
    const db = env.DB;

    let username: string | null = null;

    // Get user if authenticated
    if (sessionId) {
      const now = Math.floor(Date.now() / 1000);
      const session = await db
        .prepare(`
          SELECT u.username FROM sessions s 
          JOIN users u ON s.user_id = u.id 
          WHERE s.id = ? AND s.expires_at > ?
        `)
        .bind(sessionId, now)
        .first<{ username: string }>();
      
      if (session) {
        username = session.username;
      }
    }

    // Spin the reels!
    const reel1 = getRandomSymbol();
    const reel2 = getRandomSymbol();
    const reel3 = getRandomSymbol();

    // Check for matches
    const allMatch = reel1.name === reel2.name && reel2.name === reel3.name;
    const twoMatch = 
      (reel1.name === reel2.name) || 
      (reel2.name === reel3.name) || 
      (reel1.name === reel3.name);

    let result: "jackpot" | "double" | "miss";
    let message: string;
    let points = 0;

    if (allMatch) {
      result = "jackpot";
      message = JACKPOT_MESSAGES[Math.floor(Math.random() * JACKPOT_MESSAGES.length)];
      points = reel1.value * 10; // Jackpot multiplier
    } else if (twoMatch) {
      result = "double";
      message = DOUBLE_MESSAGES[Math.floor(Math.random() * DOUBLE_MESSAGES.length)];
      points = Math.max(reel1.value, reel2.value, reel3.value) * 2;
    } else {
      result = "miss";
      message = MISS_MESSAGES[Math.floor(Math.random() * MISS_MESSAGES.length)];
      points = 0;
    }

    // Get a brand suggestion based on the result
    let brandSuggestion: string | null = null;
    if (result === "jackpot" || result === "double") {
      const brands = await db
        .prepare(`
          SELECT brand, AVG(rating) as avg_rating
          FROM checkins
          WHERE rating IS NOT NULL
          GROUP BY LOWER(brand)
          HAVING COUNT(*) >= 1
          ORDER BY avg_rating DESC
          LIMIT 10
        `)
        .all<{ brand: string; avg_rating: number }>();
      
      if (brands.results && brands.results.length > 0) {
        const randomBrand = brands.results[Math.floor(Math.random() * brands.results.length)];
        brandSuggestion = randomBrand.brand;
      }
    }

    return NextResponse.json({
      reels: [
        { position: 1, symbol: reel1 },
        { position: 2, symbol: reel2 },
        { position: 3, symbol: reel3 },
      ],
      result,
      message,
      points,
      brandSuggestion,
      player: username,
    });
  } catch (error) {
    console.error("Slots error:", error);
    return NextResponse.json({ error: "Failed to spin slots" }, { status: 500 });
  }
}

// GET for leaderboard / stats (future)
export async function GET() {
  return NextResponse.json({
    symbols: SYMBOLS.map(s => ({ emoji: s.emoji, name: s.name, value: s.value })),
    payouts: {
      jackpot: "10x symbol value",
      double: "2x symbol value",
      miss: "0 points",
    },
  });
}
