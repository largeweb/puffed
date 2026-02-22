import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// Friendly comment templates - varied to feel natural
const COMMENT_TEMPLATES = [
  "Great choice! How was the overall experience? 🔥",
  "Nice smoke! What occasion was this for?",
  "Solid pick! Would you grab this again? 💨",
  "Love seeing what people are enjoying! How long did it last?",
  "Good stuff! What did you pair it with?",
  "Classic! What stood out most about this one?",
  "Nice! How would you compare it to others you've tried?",
  "Great log! What's next on your list? 📝",
];

// GET: Preview what would be commented
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { env } = getRequestContext();
  const db = env.DB;

  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get("key");
  if (adminKey !== "puffed-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find check-ins with 0 comments
    const noComments = await db.prepare(`
      SELECT c.id, c.brand, c.product, u.username,
        (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) as comment_count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) = 0
      ORDER BY c.created_at DESC
    `).all<{ id: string; brand: string; product: string | null; username: string; comment_count: number }>();

    return NextResponse.json({
      checkinsWithoutComments: noComments.results?.length || 0,
      checkins: noComments.results?.map((c) => ({
        id: c.id,
        brand: c.brand,
        product: c.product,
        username: c.username,
      })),
    });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}

// POST: Actually add comments from puffed_team
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { env } = getRequestContext();
  const db = env.DB;

  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get("key");
  if (adminKey !== "puffed-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get puffed_team user
    const teamUser = await db.prepare(`
      SELECT id FROM users WHERE username = 'puffed_team'
    `).first<{ id: string }>();

    if (!teamUser) {
      return NextResponse.json({ error: "puffed_team account not found" }, { status: 404 });
    }

    // Find check-ins with 0 comments (excluding puffed_team's own)
    const noComments = await db.prepare(`
      SELECT c.id, c.brand, c.user_id
      FROM checkins c
      WHERE c.user_id != ?
        AND (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) = 0
      ORDER BY c.created_at DESC
    `).bind(teamUser.id).all<{ id: string; brand: string; user_id: string }>();

    let commentsAdded = 0;
    const commented: Array<{ checkinId: string; brand: string; comment: string }> = [];

    for (const checkin of noComments.results || []) {
      // Pick a semi-random comment (based on checkin id for consistency)
      const idx = checkin.id.charCodeAt(0) % COMMENT_TEMPLATES.length;
      const commentText = COMMENT_TEMPLATES[idx];

      const commentId = crypto.randomUUID();

      // Insert comment
      await db.prepare(`
        INSERT INTO comments (id, checkin_id, user_id, text)
        VALUES (?, ?, ?, ?)
      `).bind(commentId, checkin.id, teamUser.id, commentText).run();

      // Create notification for checkin owner
      const notifId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO notifications (id, user_id, type, from_user_id, checkin_id, comment_id)
        VALUES (?, ?, 'comment', ?, ?, ?)
      `).bind(notifId, checkin.user_id, teamUser.id, checkin.id, commentId).run();

      commentsAdded++;
      commented.push({
        checkinId: checkin.id,
        brand: checkin.brand,
        comment: commentText,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Added ${commentsAdded} comments from puffed_team`,
      commentsAdded,
      commented,
    });
  } catch (error) {
    console.error("Comment warmup error:", error);
    return NextResponse.json({ error: "Warmup failed" }, { status: 500 });
  }
}
