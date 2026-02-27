import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface TimeCapsule {
  id: string;
  message: string;
  brand: string | null;
  product: string | null;
  mood: string | null;
  createdAt: number;
  unlocksAt: number;
  isUnlocked: boolean;
  timeUntilUnlock: string;
  timeSinceCreated: string;
}

interface TimeCapsuleResponse {
  myCapsules: {
    locked: TimeCapsule[];
    unlocked: TimeCapsule[];
  };
  stats: {
    totalCapsules: number;
    lockedCount: number;
    unlockedCount: number;
    nextUnlock: string | null;
    oldestCapsule: string | null;
  };
  canCreate: boolean;
  maxCapsulesReached: boolean;
}

function formatTimeUntil(targetMs: number): string {
  const now = Date.now();
  const diff = targetMs - now;
  
  if (diff <= 0) return "Ready to unlock!";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 365) {
    const years = Math.floor(days / 365);
    return `${years} year${years > 1 ? 's' : ''} away`;
  }
  if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''} away`;
  }
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} away`;
  }
  return `${hours} hour${hours > 1 ? 's' : ''} away`;
}

function formatTimeSince(createdMs: number): string {
  const now = Date.now();
  const diff = now - createdMs;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 365) {
    const years = Math.floor(days / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
  if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  return "just now";
}

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user_id;
    const now = Date.now();

    // Get all user's capsules
    const capsules = await db
      .prepare(`
        SELECT id, message, brand, product, mood, created_at, unlocks_at
        FROM time_capsules
        WHERE user_id = ?
        ORDER BY unlocks_at ASC
      `)
      .bind(userId)
      .all<{
        id: string;
        message: string;
        brand: string | null;
        product: string | null;
        mood: string | null;
        created_at: number;
        unlocks_at: number;
      }>();

    const allCapsules = capsules.results || [];
    
    const locked: TimeCapsule[] = [];
    const unlocked: TimeCapsule[] = [];

    for (const c of allCapsules) {
      const unlocksAtMs = c.unlocks_at * 1000;
      const createdAtMs = c.created_at * 1000;
      const isUnlocked = now >= unlocksAtMs;

      const capsule: TimeCapsule = {
        id: c.id,
        message: isUnlocked ? c.message : "🔒 Locked until " + new Date(unlocksAtMs).toLocaleDateString(),
        brand: isUnlocked ? c.brand : null,
        product: isUnlocked ? c.product : null,
        mood: c.mood,
        createdAt: c.created_at,
        unlocksAt: c.unlocks_at,
        isUnlocked,
        timeUntilUnlock: formatTimeUntil(unlocksAtMs),
        timeSinceCreated: formatTimeSince(createdAtMs),
      };

      if (isUnlocked) {
        unlocked.push(capsule);
      } else {
        locked.push(capsule);
      }
    }

    // Sort unlocked by most recently unlocked first
    unlocked.sort((a, b) => b.unlocksAt - a.unlocksAt);

    const MAX_CAPSULES = 10;
    const canCreate = allCapsules.length < MAX_CAPSULES;

    const nextUnlockCapsule = locked.length > 0 ? locked[0] : null;
    const oldestCapsule = unlocked.length > 0 ? unlocked[unlocked.length - 1] : null;

    const response: TimeCapsuleResponse = {
      myCapsules: { locked, unlocked },
      stats: {
        totalCapsules: allCapsules.length,
        lockedCount: locked.length,
        unlockedCount: unlocked.length,
        nextUnlock: nextUnlockCapsule ? formatTimeUntil(nextUnlockCapsule.unlocksAt * 1000) : null,
        oldestCapsule: oldestCapsule ? formatTimeSince(oldestCapsule.createdAt * 1000) : null,
      },
      canCreate,
      maxCapsulesReached: !canCreate,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Time capsule GET error:", error);
    return Response.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user_id;

    // Check capsule count
    const countResult = await db
      .prepare("SELECT COUNT(*) as count FROM time_capsules WHERE user_id = ?")
      .bind(userId)
      .first<{ count: number }>();

    if ((countResult?.count || 0) >= 10) {
      return Response.json({ error: "Maximum 10 capsules reached" }, { status: 400 });
    }

    const body = await request.json() as {
      message: string;
      unlockDays: number;
      brand?: string;
      product?: string;
      mood?: string;
    };

    if (!body.message?.trim()) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    if (body.message.length > 2000) {
      return Response.json({ error: "Message too long (max 2000 chars)" }, { status: 400 });
    }

    const validDays = [7, 30, 90, 180, 365];
    if (!validDays.includes(body.unlockDays)) {
      return Response.json({ error: "Invalid unlock duration" }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    const unlocksAt = now + (body.unlockDays * 24 * 60 * 60);
    const capsuleId = crypto.randomUUID();

    await db
      .prepare(`
        INSERT INTO time_capsules (id, user_id, message, brand, product, mood, created_at, unlocks_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        capsuleId,
        userId,
        body.message.trim(),
        body.brand?.trim() || null,
        body.product?.trim() || null,
        body.mood || null,
        now,
        unlocksAt
      )
      .run();

    const unlockDate = new Date(unlocksAt * 1000).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    return Response.json({
      success: true,
      capsuleId,
      unlockDate,
      message: `Your time capsule will unlock on ${unlockDate}`,
    });
  } catch (error) {
    console.error("Time capsule POST error:", error);
    return Response.json({ error: "Failed to create" }, { status: 500 });
  }
}
