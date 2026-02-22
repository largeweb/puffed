import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { generateId, hashPassword } from "@/lib/auth";

export const runtime = "edge";

// Admin endpoint to "warm up" the app by adding reactions to check-ins with 0 engagement
// This breaks the psychological barrier of being the first to engage
export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Get or create the puffed_team admin account
    let adminUser = await db
      .prepare("SELECT id, username FROM users WHERE username = ?")
      .bind("puffed_team")
      .first<{ id: string; username: string }>();

    if (!adminUser) {
      // Create the puffed_team account
      const adminId = generateId();
      const passwordHash = await hashPassword("puffed_team_2026_internal");
      await db
        .prepare("INSERT INTO users (id, username, password_hash, bio) VALUES (?, ?, ?, ?)")
        .bind(adminId, "puffed_team", passwordHash, "The official Puffed team account 🚬✨")
        .run();
      adminUser = { id: adminId, username: "puffed_team" };
    }

    // Find all check-ins with 0 reactions AND 0 likes
    const coldCheckins = await db.prepare(`
      SELECT c.id, c.user_id, c.brand, u.username
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.id NOT IN (SELECT DISTINCT checkin_id FROM reactions)
        AND c.id NOT IN (SELECT DISTINCT checkin_id FROM likes)
    `).all<{ id: string; user_id: string; brand: string; username: string }>();

    const warmedUp: string[] = [];
    const emojis = ["🔥", "💨", "👌"]; // Positive reaction emojis

    for (const checkin of coldCheckins.results || []) {
      // Don't react to our own check-ins (if puffed_team ever has any)
      if (checkin.user_id === adminUser.id) continue;

      // Pick a reaction emoji (rotate through them)
      const emoji = emojis[warmedUp.length % emojis.length];

      // Add the reaction
      const reactionId = generateId();
      try {
        await db
          .prepare("INSERT INTO reactions (id, user_id, checkin_id, emoji) VALUES (?, ?, ?, ?)")
          .bind(reactionId, adminUser.id, checkin.id, emoji)
          .run();

        // Create notification for the checkin owner
        const notifId = generateId();
        await db
          .prepare("INSERT INTO notifications (id, user_id, type, from_user_id, checkin_id, message) VALUES (?, ?, 'reaction', ?, ?, ?)")
          .bind(notifId, checkin.user_id, adminUser.id, checkin.id, `${emoji}`)
          .run();

        // Check if this is the owner's first-ever engagement
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
        `).bind(checkin.user_id, reactionId, checkin.user_id).first();

        const isFirstEngagement = !existingEngagement;

        // If this is their first engagement ever, send a celebration notification!
        if (isFirstEngagement) {
          const celebrationId = generateId();
          await db.prepare(`
            INSERT INTO notifications (id, user_id, type, from_user_id, checkin_id, message)
            VALUES (?, ?, 'milestone', ?, ?, ?)
          `).bind(
            celebrationId,
            checkin.user_id,
            adminUser.id,
            checkin.id,
            '🎉 Your first reaction! The community is noticing your smokes!'
          ).run();
        }

        warmedUp.push(`${checkin.username}/${checkin.brand} → ${emoji}`);
      } catch (e) {
        // Skip if somehow already exists
        console.error("Reaction error:", e);
      }
    }

    return NextResponse.json({
      success: true,
      adminUserId: adminUser.id,
      warmedUp,
      count: warmedUp.length,
    });
  } catch (error) {
    console.error("Warm-up error:", error);
    return NextResponse.json({ error: "Failed to warm up" }, { status: 500 });
  }
}

// GET: Preview what would be warmed up
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Find all check-ins with 0 reactions AND 0 likes
    const coldCheckins = await db.prepare(`
      SELECT c.id, c.user_id, c.brand, u.username, c.created_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.id NOT IN (SELECT DISTINCT checkin_id FROM reactions)
        AND c.id NOT IN (SELECT DISTINCT checkin_id FROM likes)
      ORDER BY c.created_at DESC
    `).all<{ id: string; user_id: string; brand: string; username: string; created_at: number }>();

    return NextResponse.json({
      coldCheckins: coldCheckins.results || [],
      count: (coldCheckins.results || []).length,
    });
  } catch (error) {
    console.error("Warm-up preview error:", error);
    return NextResponse.json({ error: "Failed to preview" }, { status: 500 });
  }
}
