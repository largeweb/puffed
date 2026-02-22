import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/admin/backfill-welcome - Create welcome notifications for users who don't have them
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { env } = getRequestContext();
  const db = env.DB;

  // Simple admin auth via query param (in production, use proper auth)
  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get("key");
  if (adminKey !== "puffed-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find users who don't have a welcome notification
    const usersWithoutWelcome = await db.prepare(`
      SELECT u.id 
      FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM notifications n 
        WHERE n.user_id = u.id AND n.type = 'welcome'
      )
    `).all<{ id: string }>();

    const users = usersWithoutWelcome.results || [];
    let created = 0;

    for (const user of users) {
      const notifId = crypto.randomUUID();
      await db.prepare(
        "INSERT INTO notifications (id, user_id, type, from_user_id) VALUES (?, ?, 'welcome', ?)"
      ).bind(notifId, user.id, user.id).run();
      created++;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Created ${created} welcome notifications`,
      usersProcessed: users.length
    });
  } catch (error) {
    console.error("Backfill error:", error);
    return NextResponse.json({ error: "Backfill failed" }, { status: 500 });
  }
}
