import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie, generateId } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// Valid emoji reactions
const VALID_EMOJIS = ['🔥', '💨', '👌', '🤤', '😍'];

// Get reactions for a check-in
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkinId = searchParams.get("checkinId");

    if (!checkinId) {
      return NextResponse.json({ error: "checkinId required" }, { status: 400 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get reaction counts by emoji
    const counts = await db.prepare(`
      SELECT emoji, COUNT(*) as count
      FROM reactions
      WHERE checkin_id = ?
      GROUP BY emoji
    `).bind(checkinId).all();

    // Get current user's reactions if logged in
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);
    let myReactions: string[] = [];

    if (sessionId) {
      const session = await db.prepare(
        "SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?"
      ).bind(sessionId, Math.floor(Date.now() / 1000)).first();

      if (session) {
        const userReactions = await db.prepare(`
          SELECT emoji FROM reactions 
          WHERE checkin_id = ? AND user_id = ?
        `).bind(checkinId, session.user_id).all();
        myReactions = userReactions.results.map(r => r.emoji as string);
      }
    }

    // Build emoji -> count map
    const reactionCounts: Record<string, number> = {};
    for (const row of counts.results) {
      reactionCounts[row.emoji as string] = row.count as number;
    }

    return NextResponse.json({ 
      reactions: reactionCounts,
      myReactions 
    });
  } catch (error) {
    console.error("Get reactions error:", error);
    return NextResponse.json({ error: "Failed to get reactions" }, { status: 500 });
  }
}

// Add/remove a reaction
export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const session = await db.prepare(
      "SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?"
    ).bind(sessionId, Math.floor(Date.now() / 1000)).first();

    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const userId = session.user_id as string;
    const body = await request.json() as { checkinId?: string; emoji?: string };
    const { checkinId, emoji } = body;

    if (!checkinId || !emoji) {
      return NextResponse.json({ error: "checkinId and emoji required" }, { status: 400 });
    }

    if (!VALID_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
    }

    // Check if reaction exists
    const existing = await db.prepare(
      "SELECT id FROM reactions WHERE user_id = ? AND checkin_id = ? AND emoji = ?"
    ).bind(userId, checkinId, emoji).first();

    if (existing) {
      // Remove reaction
      await db.prepare(
        "DELETE FROM reactions WHERE id = ?"
      ).bind(existing.id).run();
      return NextResponse.json({ reacted: false, emoji });
    } else {
      // Add reaction
      const id = generateId();
      await db.prepare(
        "INSERT INTO reactions (id, user_id, checkin_id, emoji) VALUES (?, ?, ?, ?)"
      ).bind(id, userId, checkinId, emoji).run();

      // Get checkin owner for notification
      const checkin = await db.prepare(
        "SELECT user_id FROM checkins WHERE id = ?"
      ).bind(checkinId).first();

      // Create notification if reacting to someone else's checkin
      if (checkin && checkin.user_id !== userId) {
        const checkinOwnerId = checkin.user_id as string;
        
        // Check if this is the owner's first-ever engagement (reaction or like)
        const existingEngagement = await db.prepare(`
          SELECT 1 FROM (
            SELECT 1 FROM reactions r 
            JOIN checkins c ON r.checkin_id = c.id 
            WHERE c.user_id = ? AND r.id != ?
            LIMIT 1
          )
          UNION ALL
          SELECT 1 FROM (
            SELECT 1 FROM likes l 
            JOIN checkins c ON l.checkin_id = c.id 
            WHERE c.user_id = ?
            LIMIT 1
          )
          LIMIT 1
        `).bind(checkinOwnerId, id, checkinOwnerId).first();
        
        const isFirstEngagement = !existingEngagement;
        
        // Create the reaction notification
        const notifId = generateId();
        await db.prepare(`
          INSERT INTO notifications (id, user_id, type, from_user_id, checkin_id)
          VALUES (?, ?, 'reaction', ?, ?)
        `).bind(notifId, checkinOwnerId, userId, checkinId).run();
        
        // If this is their first engagement ever, send a celebration notification!
        if (isFirstEngagement) {
          const celebrationId = generateId();
          await db.prepare(`
            INSERT INTO notifications (id, user_id, type, from_user_id, checkin_id, message)
            VALUES (?, ?, 'milestone', ?, ?, ?)
          `).bind(
            celebrationId, 
            checkinOwnerId, 
            userId, 
            checkinId,
            '🎉 Your first reaction! The community is noticing your smokes!'
          ).run();
        }
      }

      return NextResponse.json({ reacted: true, emoji });
    }
  } catch (error) {
    console.error("React error:", error);
    return NextResponse.json({ error: "Failed to react" }, { status: 500 });
  }
}
