import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// 50 unique smoke fortunes
const FORTUNES = [
  { fortune: "A rare find awaits you at the tobacconist.", emoji: "🎁", category: "discovery" },
  { fortune: "Your next smoke will bring unexpected clarity.", emoji: "💡", category: "wisdom" },
  { fortune: "Share a cigar with a stranger — they have stories to tell.", emoji: "🤝", category: "social" },
  { fortune: "The perfect pairing is closer than you think.", emoji: "🥃", category: "pairing" },
  { fortune: "Patience today leads to flavor tomorrow.", emoji: "⏳", category: "wisdom" },
  { fortune: "A gift of tobacco will strengthen a friendship.", emoji: "💝", category: "social" },
  { fortune: "Your humidor holds a forgotten treasure.", emoji: "📦", category: "discovery" },
  { fortune: "Tonight's smoke will be your best this week.", emoji: "🌟", category: "fortune" },
  { fortune: "The ash tells all — trust your instincts.", emoji: "🔮", category: "wisdom" },
  { fortune: "A fellow enthusiast seeks your recommendation.", emoji: "💬", category: "social" },
  { fortune: "Rest your cigars; rushed pleasures fade quickly.", emoji: "🛏️", category: "wisdom" },
  { fortune: "Your palate is evolving — try something bold.", emoji: "🌶️", category: "discovery" },
  { fortune: "The best conversations happen over slow burns.", emoji: "🔥", category: "social" },
  { fortune: "A morning smoke will set the tone for greatness.", emoji: "🌅", category: "time" },
  { fortune: "Cedar whispers secrets to those who listen.", emoji: "🌲", category: "wisdom" },
  { fortune: "Your next five-star smoke is already in your collection.", emoji: "⭐", category: "fortune" },
  { fortune: "A road trip calls for something special.", emoji: "🚗", category: "discovery" },
  { fortune: "The wrapper tells the truth before the light.", emoji: "👀", category: "wisdom" },
  { fortune: "Good company makes any cigar better.", emoji: "👥", category: "social" },
  { fortune: "A new brand will surprise you pleasantly.", emoji: "🎊", category: "discovery" },
  { fortune: "Smoke at midnight — the universe is listening.", emoji: "🌙", category: "time" },
  { fortune: "Your streak brings good fortune this week.", emoji: "📈", category: "fortune" },
  { fortune: "A vintage year holds unexpected depth.", emoji: "📅", category: "discovery" },
  { fortune: "Take photos — these memories are worth keeping.", emoji: "📸", category: "social" },
  { fortune: "The ring gauge of destiny chooses you.", emoji: "💫", category: "fortune" },
  { fortune: "Coffee pairing reveals hidden notes.", emoji: "☕", category: "pairing" },
  { fortune: "A robusto today keeps the stress away.", emoji: "😌", category: "wisdom" },
  { fortune: "Your flavor notes inspire another smoker.", emoji: "✍️", category: "social" },
  { fortune: "Retrohale to unlock the full experience.", emoji: "👃", category: "wisdom" },
  { fortune: "The lounge awaits your presence.", emoji: "🛋️", category: "social" },
  { fortune: "Box-pressed fortunes are in your future.", emoji: "📦", category: "discovery" },
  { fortune: "A sunset smoke brings peace to the soul.", emoji: "🌇", category: "time" },
  { fortune: "Your collection will grow in unexpected ways.", emoji: "📚", category: "fortune" },
  { fortune: "Bourbon and tobacco — the stars align.", emoji: "🌟", category: "pairing" },
  { fortune: "A fellow night owl shares your passion.", emoji: "🦉", category: "social" },
  { fortune: "The perfect cut is an art worth mastering.", emoji: "✂️", category: "wisdom" },
  { fortune: "Maduro magic awaits the patient.", emoji: "🪄", category: "discovery" },
  { fortune: "Your next review will resonate with many.", emoji: "❤️", category: "social" },
  { fortune: "The torch reveals what matches cannot.", emoji: "🔦", category: "wisdom" },
  { fortune: "A celebratory smoke approaches on the horizon.", emoji: "🎉", category: "fortune" },
  { fortune: "Connecticut shade hides smooth surprises.", emoji: "🌫️", category: "discovery" },
  { fortune: "Rain and cigars make perfect partners.", emoji: "🌧️", category: "pairing" },
  { fortune: "Your humidor humidity is just right.", emoji: "💧", category: "fortune" },
  { fortune: "A Churchill for contemplation, a Corona for haste.", emoji: "🤔", category: "wisdom" },
  { fortune: "The blend you seek is one recommendation away.", emoji: "🔍", category: "discovery" },
  { fortune: "Early risers find the freshest smoke.", emoji: "🌄", category: "time" },
  { fortune: "A porch smoke solves more than you know.", emoji: "🏠", category: "wisdom" },
  { fortune: "Nicaragua calls to your palate.", emoji: "🇳🇮", category: "discovery" },
  { fortune: "Tonight's ash is long — a sign of quality.", emoji: "🎯", category: "fortune" },
  { fortune: "Share your journey — others want to follow.", emoji: "🗺️", category: "social" },
];

// Get deterministic fortune for user + day
function getFortuneForUserDay(userId: string, dayTimestamp: number): typeof FORTUNES[0] {
  // Combine user ID and day to create a seed
  const seed = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + dayTimestamp;
  const index = seed % FORTUNES.length;
  return FORTUNES[index];
}

// Lucky numbers based on user seed
function getLuckyNumbers(userId: string, dayTimestamp: number): number[] {
  const seed = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + dayTimestamp;
  const numbers: number[] = [];
  let current = seed;
  for (let i = 0; i < 3; i++) {
    current = (current * 1103515245 + 12345) % (1 << 31);
    numbers.push((current % 99) + 1);
  }
  return numbers;
}

export interface SmokeFortune {
  fortune: string;
  emoji: string;
  category: string;
  luckyNumbers: number[];
  luckyBrand: string;
  todayDate: string;
  nextFortuneIn: number; // hours until next fortune
  streak: number;
  fortuneNumber: number; // which fortune they got (1-50)
}

const LUCKY_BRANDS = [
  "Arturo Fuente", "Padron", "Oliva", "My Father", "Davidoff",
  "Ashton", "Rocky Patel", "Perdomo", "Montecristo", "Romeo y Julieta",
  "Cohiba", "Liga Privada", "Crowned Heads", "Foundation", "Tatuaje",
  "Warped", "Illusione", "Aganorsa Leaf", "Dunbarton Tobacco", "RoMa Craft"
];

export async function GET(request: Request) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Get auth from cookie
    const cookieHeader = request.headers.get("cookie") || "";
    const authMatch = cookieHeader.match(/puffed_auth=([^;]+)/);
    if (!authMatch) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = authMatch[1];
    
    // Verify user exists
    const userResult = await db.prepare(
      "SELECT id, username FROM users WHERE id = ?"
    ).bind(userId).first<{ id: string; username: string }>();

    if (!userResult) {
      return Response.json({ error: "User not found" }, { status: 401 });
    }

    // Get current day (midnight UTC)
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayTimestamp = Math.floor(todayMidnight / 1000 / 86400); // Day number since epoch

    // Get user's streak
    const streakResult = await db.prepare(
      "SELECT current_streak FROM user_stats WHERE user_id = ?"
    ).bind(userId).first<{ current_streak: number }>();
    const streak = streakResult?.current_streak || 0;

    // Get deterministic fortune
    const fortune = getFortuneForUserDay(userId, dayTimestamp);
    const fortuneIndex = FORTUNES.indexOf(fortune) + 1;

    // Get lucky numbers
    const luckyNumbers = getLuckyNumbers(userId, dayTimestamp);

    // Get lucky brand (deterministic for the day)
    const brandSeed = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + dayTimestamp;
    const luckyBrand = LUCKY_BRANDS[brandSeed % LUCKY_BRANDS.length];

    // Calculate hours until next fortune (midnight)
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const hoursUntilNext = Math.ceil((nextMidnight.getTime() - now.getTime()) / (1000 * 60 * 60));

    const response: SmokeFortune = {
      fortune: fortune.fortune,
      emoji: fortune.emoji,
      category: fortune.category,
      luckyNumbers,
      luckyBrand,
      todayDate: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      nextFortuneIn: hoursUntilNext,
      streak,
      fortuneNumber: fortuneIndex,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Fortune error:", error);
    return Response.json({ error: "Failed to read fortune" }, { status: 500 });
  }
}
