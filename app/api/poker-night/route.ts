import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface CheckIn {
  id: number;
  brand: string;
  product: string | null;
  rating: number;
  created_at: number;
  image_url: string | null;
  username: string;
  review: string | null;
}

interface PokerPlayer {
  username: string;
  chips: number;
  avgRating: number;
  topBrand: string | null;
  biggestWin: number; // highest rated smoke
}

// Card generation based on rating and brand
function generateCard(rating: number, brand: string): { suit: string; value: string; color: string } {
  // Suits based on rating
  const suits: Record<number, { suit: string; color: string }> = {
    5: { suit: "♥", color: "text-red-500" },  // Hearts for 5 stars
    4: { suit: "♦", color: "text-red-400" },  // Diamonds for 4 stars
    3: { suit: "♣", color: "text-gray-300" }, // Clubs for 3 stars
    2: { suit: "♠", color: "text-gray-400" }, // Spades for 2 stars
    1: { suit: "♠", color: "text-gray-500" }, // Spades for 1 star
  };
  
  // Card value from brand name (first letter maps to face cards)
  const firstLetter = brand.charAt(0).toUpperCase();
  let value: string;
  
  if (["A", "B", "C"].includes(firstLetter)) value = "A";
  else if (["K", "L", "M"].includes(firstLetter)) value = "K";
  else if (["Q", "R", "S"].includes(firstLetter)) value = "Q";
  else if (["J", "I", "H"].includes(firstLetter)) value = "J";
  else if (["D", "E", "F", "G"].includes(firstLetter)) value = "10";
  else value = String(Math.floor(Math.random() * 4) + 7); // 7-10
  
  const suitInfo = suits[rating] || suits[3];
  return { suit: suitInfo.suit, value, color: suitInfo.color };
}

export async function GET(): Promise<Response> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;

  const { env } = getRequestContext();
  const db = env.DB;

  // Get user from session
  let userId: string | null = null;
  let currentUsername: string | null = null;
  if (sessionId) {
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();
    if (session) {
      userId = session.user_id;
      const user = await db
        .prepare("SELECT username FROM users WHERE id = ?")
        .bind(userId)
        .first<{ username: string }>();
      if (user) currentUsername = user.username;
    }
  }

  const now = new Date();
  const hour = now.getUTCHours() - 5; // EST adjustment
  const adjustedHour = hour < 0 ? hour + 24 : hour;
  const day = now.getUTCDay();
  const adjustedDay = hour < 0 ? (day === 0 ? 6 : day - 1) : day;

  // Poker Night: Friday (5) + Saturday (6), 7 PM - 2 AM EST
  const isPokerDay = adjustedDay === 5 || adjustedDay === 6;
  const isPokerTime = isPokerDay && (adjustedHour >= 19 || adjustedHour < 2);

  // Time messaging
  let timeMessage = "";
  let tableStatus = "";
  
  if (!isPokerDay) {
    const daysUntilFriday = (5 - adjustedDay + 7) % 7 || 7;
    timeMessage = `Poker Night runs Friday & Saturday. ${daysUntilFriday} day${daysUntilFriday > 1 ? "s" : ""} until next game!`;
    tableStatus = "closed";
  } else if (adjustedHour < 19 && adjustedHour >= 2) {
    const hoursUntil = 19 - adjustedHour;
    timeMessage = `Table opens in ${hoursUntil} hour${hoursUntil > 1 ? "s" : ""}. Ante up at 7 PM!`;
    tableStatus = "waiting";
  } else if (adjustedHour >= 2 && adjustedHour < 19) {
    timeMessage = "Table's been closed for the night. See you at 7 PM!";
    tableStatus = "after-hours";
  } else {
    const hoursLeft = adjustedHour >= 19 ? (24 - adjustedHour + 2) : (2 - adjustedHour);
    timeMessage = `${hoursLeft} hour${hoursLeft > 1 ? "s" : ""} left at the table tonight!`;
    tableStatus = "dealing";
  }

  // Blinds/phases based on time
  const pokerPhases = [
    { hour: 19, phase: "Early Position", emoji: "🪙", desc: "Blinds are low, players taking seats", blind: 10 },
    { hour: 20, phase: "Building Pots", emoji: "💰", desc: "Action heating up", blind: 25 },
    { hour: 21, phase: "Power Hour", emoji: "🔥", desc: "Big hands, big plays", blind: 50 },
    { hour: 22, phase: "Deep Stacks", emoji: "💎", desc: "Serious money on the table", blind: 100 },
    { hour: 23, phase: "Last Call", emoji: "🎰", desc: "Final bets before midnight", blind: 200 },
    { hour: 0, phase: "After Midnight", emoji: "🌙", desc: "The real players stay late", blind: 500 },
    { hour: 1, phase: "High Rollers Only", emoji: "👑", desc: "Winner takes all", blind: 1000 },
  ];
  const currentPhase = pokerPhases.find(p => p.hour === adjustedHour) || pokerPhases[0];

  // Calculate tonight's poker window
  const todayDate = new Date(now);
  todayDate.setUTCHours(0, 0, 0, 0);
  const pokerStartToday = Math.floor(todayDate.getTime() / 1000) + (24 * 3600); // 7 PM EST = midnight UTC
  const pokerEndToday = pokerStartToday + (7 * 3600); // 7 hour window to 2 AM

  // Get current players at the table (tonight)
  let currentPlayers: CheckIn[] = [];
  if (isPokerDay) {
    const playersResult = await db
      .prepare(
        `
        SELECT c.id, c.brand, c.product, c.rating, c.created_at, c.image_url, c.review, u.username
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE c.created_at >= ? AND c.created_at < ?
        ORDER BY c.created_at DESC
        LIMIT 20
      `
      )
      .bind(pokerStartToday - (7 * 3600), pokerStartToday + (7 * 3600))
      .all<CheckIn>();
    currentPlayers = playersResult.results || [];
  }

  // All-time poker night leaderboard
  const leaderboardResult = await db
    .prepare(
      `
      SELECT 
        u.username,
        COUNT(*) as chips,
        AVG(c.rating) as avgRating,
        MAX(c.rating) as biggestWin,
        (
          SELECT brand FROM checkins c2 
          WHERE c2.user_id = u.id 
          AND strftime('%w', datetime(c2.created_at, 'unixepoch', '-5 hours')) IN ('5', '6')
          AND (
            CAST(strftime('%H', datetime(c2.created_at, 'unixepoch', '-5 hours')) as INTEGER) >= 19
            OR CAST(strftime('%H', datetime(c2.created_at, 'unixepoch', '-5 hours')) as INTEGER) < 2
          )
          GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1
        ) as topBrand
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE strftime('%w', datetime(c.created_at, 'unixepoch', '-5 hours')) IN ('5', '6')
      AND (
        CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) as INTEGER) >= 19
        OR CAST(strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) as INTEGER) < 2
      )
      GROUP BY u.id
      ORDER BY chips DESC
      LIMIT 10
    `
    )
    .all<PokerPlayer>();

  // Platform poker stats (the pot)
  const potResult = await db
    .prepare(
      `
      SELECT 
        COUNT(*) as totalHands,
        COUNT(DISTINCT user_id) as uniquePlayers,
        AVG(rating) as avgRating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as royalFlushes
      FROM checkins
      WHERE strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) IN ('5', '6')
      AND (
        CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) as INTEGER) >= 19
        OR CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) as INTEGER) < 2
      )
    `
    )
    .first<{ totalHands: number; uniquePlayers: number; avgRating: number; royalFlushes: number }>();

  // User's poker stats (their chip stack)
  let myChipStack = null;
  let myHand: Array<{ brand: string; rating: number; card: { suit: string; value: string; color: string } }> = [];
  
  if (userId) {
    const myResult = await db
      .prepare(
        `
        SELECT 
          COUNT(*) as chips,
          AVG(rating) as avgRating,
          MAX(rating) as biggestWin
        FROM checkins
        WHERE user_id = ?
        AND strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) IN ('5', '6')
        AND (
          CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) as INTEGER) >= 19
          OR CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) as INTEGER) < 2
        )
      `
      )
      .bind(userId)
      .first<{ chips: number; avgRating: number; biggestWin: number }>();

    // Get user's recent poker night smokes as their "hand"
    const myHandResult = await db
      .prepare(
        `
        SELECT brand, rating FROM checkins
        WHERE user_id = ?
        AND strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) IN ('5', '6')
        AND (
          CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) as INTEGER) >= 19
          OR CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) as INTEGER) < 2
        )
        ORDER BY created_at DESC
        LIMIT 5
      `
      )
      .bind(userId)
      .all<{ brand: string; rating: number }>();

    if (myResult) {
      myChipStack = {
        chips: myResult.chips || 0,
        avgRating: myResult.avgRating ? Math.round(myResult.avgRating * 10) / 10 : 0,
        biggestWin: myResult.biggestWin || 0,
        username: currentUsername,
        rank: 0,
      };
      
      // Calculate rank
      const rankResult = await db
        .prepare(
          `
          SELECT COUNT(*) + 1 as rank FROM (
            SELECT user_id, COUNT(*) as cnt FROM checkins
            WHERE strftime('%w', datetime(created_at, 'unixepoch', '-5 hours')) IN ('5', '6')
            AND (
              CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) as INTEGER) >= 19
              OR CAST(strftime('%H', datetime(created_at, 'unixepoch', '-5 hours')) as INTEGER) < 2
            )
            GROUP BY user_id
            HAVING cnt > ?
          )
        `
        )
        .bind(myResult.chips || 0)
        .first<{ rank: number }>();
      
      if (rankResult) myChipStack.rank = rankResult.rank;
    }

    myHand = (myHandResult.results || []).map((h) => ({
      brand: h.brand,
      rating: h.rating,
      card: generateCard(h.rating, h.brand),
    }));
  }

  // Poker wisdom
  const pokerWisdom = [
    "The cigars you smoke tell others how you play the game",
    "A good smoke is like pocket aces — rare and powerful",
    "Patience at the table, patience with the cigar",
    "Read the room, savor the smoke",
    "Sometimes you fold, sometimes you puff — both require wisdom",
    "The best bluff is confidence in your choice",
    "Every cigar is a new hand to play",
    "Know when to hold your smoke, know when to let it go",
  ];
  const wisdom = pokerWisdom[new Date().getDate() % pokerWisdom.length];

  return Response.json({
    isPokerTime,
    isPokerDay,
    currentHour: adjustedHour,
    dayOfWeek: adjustedDay,
    timeMessage,
    tableStatus,
    currentPhase,
    allPhases: pokerPhases,
    currentPlayers: currentPlayers.map((p) => ({
      id: p.id,
      username: p.username,
      brand: p.brand,
      product: p.product,
      rating: p.rating,
      photoUrl: p.image_url,
      review: p.review,
      time: formatTime(p.created_at),
      card: generateCard(p.rating, p.brand),
    })),
    leaderboard: (leaderboardResult.results || []).map((l) => ({
      username: l.username,
      chips: l.chips,
      avgRating: Math.round((l.avgRating || 0) * 10) / 10,
      biggestWin: l.biggestWin || 0,
      topBrand: l.topBrand,
    })),
    pot: {
      totalHands: potResult?.totalHands || 0,
      uniquePlayers: potResult?.uniquePlayers || 0,
      avgRating: potResult?.avgRating ? Math.round(potResult.avgRating * 10) / 10 : 0,
      royalFlushes: potResult?.royalFlushes || 0,
    },
    myChipStack,
    myHand,
    wisdom,
  });
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });
}
