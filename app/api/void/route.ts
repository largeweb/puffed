import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cookies } from "next/headers";

export const runtime = "edge";

interface VoidSoul {
  username: string;
  brand?: string;
  enteredAt: number;
  minutesAgo: number;
}

interface VoidData {
  souls: VoidSoul[];
  totalSoulsEver: number;
  yourVoidVisits: number;
  deepestHour: number;
  isVoidTime: boolean;
  currentHour: number;
  zenMessage: string;
}

const zenMessages = [
  "In the void, there is only now.",
  "Silence has its own kind of warmth.",
  "The smoke rises. You watch. Nothing more is needed.",
  "Between thoughts, peace.",
  "The void asks nothing. The void judges nothing.",
  "You are here. That is enough.",
  "In stillness, everything.",
  "The night breathes with you.",
  "No past. No future. Just this.",
  "The void welcomes those who seek nothing.",
  "Presence is its own reward.",
  "Let the silence hold you.",
  "The darkest hour holds the quietest truths.",
  "You found your way here. Rest now.",
  "In the void, all is forgiven.",
  "The smoke knows no hurry.",
  "Just you and the night.",
  "Nothing to prove. Nothing to become.",
  "The void sees you. And approves.",
  "Between midnight and dawn, we are all the same.",
];

export async function GET() {
  try {
    const { env } = await getCloudflareContext();
    const db = env.DB;

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE token = ?")
      .bind(sessionToken)
      .first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }

    const user = await db
      .prepare("SELECT id, username FROM users WHERE id = ?")
      .bind(session.user_id)
      .first<{ id: string; username: string }>();

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Get current hour (EST)
    const now = new Date();
    const estTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const currentHour = estTime.getHours();
    
    // Void time: 12 AM - 4 AM
    const isVoidTime = currentHour >= 0 && currentHour < 4;

    // Get souls currently in the void (checkins from 12 AM - 4 AM in the last 4 hours)
    const fourHoursAgo = Math.floor(Date.now() / 1000) - (4 * 60 * 60);
    
    const soulsResult = await db
      .prepare(`
        SELECT DISTINCT 
          u.username,
          c.brand,
          c.created_at as enteredAt
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE c.created_at > ?
          AND (
            (c.created_at % 86400) / 3600 >= 5 OR 
            (c.created_at % 86400) / 3600 < 9
          )
        ORDER BY c.created_at DESC
        LIMIT 10
      `)
      .bind(fourHoursAgo)
      .all<{ username: string; brand: string; enteredAt: number }>();

    const nowSeconds = Math.floor(Date.now() / 1000);
    const souls: VoidSoul[] = (soulsResult.results || []).map((s) => ({
      username: s.username,
      brand: s.brand,
      enteredAt: s.enteredAt,
      minutesAgo: Math.floor((nowSeconds - s.enteredAt) / 60),
    }));

    // Total souls who have ever entered the void (12 AM - 4 AM checkins)
    const totalResult = await db
      .prepare(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM checkins
        WHERE (created_at % 86400) / 3600 >= 5 
          AND (created_at % 86400) / 3600 < 9
      `)
      .first<{ count: number }>();

    // Your void visits
    const yourVisits = await db
      .prepare(`
        SELECT COUNT(*) as count
        FROM checkins
        WHERE user_id = ?
          AND (created_at % 86400) / 3600 >= 5 
          AND (created_at % 86400) / 3600 < 9
      `)
      .bind(user.id)
      .first<{ count: number }>();

    // Deepest hour (most common hour for void checkins)
    const deepestResult = await db
      .prepare(`
        SELECT ((created_at % 86400) / 3600) as hour, COUNT(*) as count
        FROM checkins
        WHERE (created_at % 86400) / 3600 >= 5 
          AND (created_at % 86400) / 3600 < 9
        GROUP BY hour
        ORDER BY count DESC
        LIMIT 1
      `)
      .first<{ hour: number; count: number }>();

    // Convert UTC hour to EST (UTC-5)
    let deepestHour = deepestResult ? deepestResult.hour - 5 : 2;
    if (deepestHour < 0) deepestHour += 24;

    // Pick a zen message based on current time (changes every 10 minutes)
    const messageIndex = Math.floor(Date.now() / (10 * 60 * 1000)) % zenMessages.length;
    const zenMessage = zenMessages[messageIndex];

    const data: VoidData = {
      souls,
      totalSoulsEver: totalResult?.count || 0,
      yourVoidVisits: yourVisits?.count || 0,
      deepestHour,
      isVoidTime,
      currentHour,
      zenMessage,
    };

    return Response.json(data);
  } catch (error) {
    console.error("Void API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
