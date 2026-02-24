import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

// Pool of poll questions - add more over time!
const POLL_QUESTIONS = [
  {
    id: "morning-vs-evening",
    question: "When's the best time to smoke?",
    options: ["🌅 Morning", "🌙 Evening", "☀️ Afternoon", "🌃 Late Night"],
  },
  {
    id: "full-vs-mild",
    question: "What strength do you prefer?",
    options: ["💪 Full-bodied", "🌊 Medium", "🍃 Mild", "🔥 I like them all"],
  },
  {
    id: "solo-vs-social",
    question: "Do you prefer smoking alone or with others?",
    options: ["🧘 Solo smoke", "👥 With friends", "🤷 Depends on mood"],
  },
  {
    id: "pair-drink",
    question: "Best drink pairing?",
    options: ["☕ Coffee", "🥃 Whiskey", "🍺 Beer", "💧 Water/Nothing"],
  },
  {
    id: "new-vs-reliable",
    question: "Try something new or stick to favorites?",
    options: ["🆕 Always exploring", "💎 Stick to my faves", "⚖️ Mix of both"],
  },
  {
    id: "weekend-ritual",
    question: "Weekend smoke ritual?",
    options: ["🌅 Lazy morning smoke", "🍖 After a good meal", "🌆 Golden hour patio", "🎉 Party smoke"],
  },
  {
    id: "smoke-length",
    question: "Preferred smoke length?",
    options: ["⚡ Quick 30min", "⏱️ Standard hour", "🕰️ Long 90min+", "🤷 Whatever fits"],
  },
  {
    id: "indoor-outdoor",
    question: "Indoor or outdoor smoking?",
    options: ["🏠 Lounge/indoors", "🌳 Outside always", "☁️ Weather dependent"],
  },
  {
    id: "share-or-hoard",
    question: "Do you share your good sticks?",
    options: ["🎁 Happy to share", "🐉 My precious!", "🤝 Only with close friends"],
  },
  {
    id: "age-cigars",
    question: "Do you age your cigars?",
    options: ["📦 Years of aging", "⏳ A few months", "🔥 Smoke 'em fresh", "❓ What's aging?"],
  },
  {
    id: "first-smoke-memory",
    question: "Remember your first smoke?",
    options: ["😍 Love at first puff", "🤢 Rough start", "🤔 Meh, grew on me", "❓ Too long ago"],
  },
  {
    id: "gifting",
    question: "Cigars as gifts - good idea?",
    options: ["🎁 Best gift ever", "⚠️ Only for smokers", "🤷 Depends on the person"],
  },
  {
    id: "music-or-silence",
    question: "Music while smoking?",
    options: ["🎵 Always music", "🤫 Peaceful silence", "🎙️ Podcast/audiobook", "🎧 Depends on vibe"],
  },
  {
    id: "cutting-method",
    question: "Preferred cutting method?",
    options: ["✂️ Guillotine", "🔪 V-cut", "👊 Punch", "😬 Bite it off"],
  },
];

// Get deterministic poll for today
function getTodaysPoll(): typeof POLL_QUESTIONS[0] {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  const year = now.getFullYear();
  const seed = dayOfYear + year * 366;
  const index = seed % POLL_QUESTIONS.length;
  return POLL_QUESTIONS[index];
}

// Get today's date string for dedup
function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    const poll = getTodaysPoll();
    const todayKey = getTodayKey();
    const pollKey = `${poll.id}-${todayKey}`;

    // Get vote counts for each option
    const voteCounts = await db
      .prepare(
        "SELECT vote, COUNT(*) as count FROM poll_votes WHERE poll_key = ? GROUP BY vote"
      )
      .bind(pollKey)
      .all<{ vote: string; count: number }>();

    const votes: Record<string, number> = {};
    let totalVotes = 0;
    for (const row of voteCounts.results || []) {
      votes[row.vote] = row.count;
      totalVotes += row.count;
    }

    // Check if current user has voted
    let userVote: string | null = null;
    let userId: string | null = null;
    if (sessionId) {
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ?")
        .bind(sessionId)
        .first<{ user_id: string }>();

      if (session) {
        userId = session.user_id;
        const existingVote = await db
          .prepare("SELECT vote FROM poll_votes WHERE poll_key = ? AND user_id = ?")
          .bind(pollKey, userId)
          .first<{ vote: string }>();

        if (existingVote) {
          userVote = existingVote.vote;
        }
      }
    }

    // Calculate percentages
    const results = poll.options.map((option) => ({
      option,
      count: votes[option] || 0,
      percentage: totalVotes > 0 ? Math.round(((votes[option] || 0) / totalVotes) * 100) : 0,
    }));

    // Find winner(s)
    const maxVotes = Math.max(...results.map((r) => r.count), 0);
    const winners = maxVotes > 0 ? results.filter((r) => r.count === maxVotes).map((r) => r.option) : [];

    return NextResponse.json({
      poll: {
        id: poll.id,
        question: poll.question,
        options: poll.options,
      },
      results,
      totalVotes,
      userVote,
      hasVoted: !!userVote,
      winners,
      pollKey,
    });
  } catch (error) {
    console.error("Daily poll GET error:", error);
    return NextResponse.json(
      { error: "Failed to load poll", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json() as { vote?: string };
    const { vote } = body;
    if (!vote) {
      return NextResponse.json({ error: "Vote required" }, { status: 400 });
    }

    const poll = getTodaysPoll();
    const todayKey = getTodayKey();
    const pollKey = `${poll.id}-${todayKey}`;

    // Validate vote is a valid option
    if (!poll.options.includes(vote)) {
      return NextResponse.json({ error: "Invalid vote option" }, { status: 400 });
    }

    // Check for existing vote
    const existingVote = await db
      .prepare("SELECT id FROM poll_votes WHERE poll_key = ? AND user_id = ?")
      .bind(pollKey, session.user_id)
      .first();

    if (existingVote) {
      return NextResponse.json({ error: "Already voted" }, { status: 400 });
    }

    // Record vote
    const now = Math.floor(Date.now() / 1000);
    await db
      .prepare(
        "INSERT INTO poll_votes (id, poll_key, user_id, vote, created_at) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(crypto.randomUUID(), pollKey, session.user_id, vote, now)
      .run();

    return NextResponse.json({ success: true, vote });
  } catch (error) {
    console.error("Daily poll POST error:", error);
    return NextResponse.json(
      { error: "Failed to record vote", details: String(error) },
      { status: 500 }
    );
  }
}
