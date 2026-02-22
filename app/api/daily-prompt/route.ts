import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTodaysPrompt } from "@/lib/daily-prompts";

export const runtime = "edge";

interface Env {
  DB: D1Database;
}

interface CheckinRow {
  id: string;
  brand: string;
  product: string | null;
  rating: number | null;
  review: string | null;
  image_url: string | null;
  created_at: number;
  user_id: string;
  username: string;
}

/**
 * GET /api/daily-prompt
 * Returns today's prompt and recent responses
 */
export async function GET(request: Request) {
  try {
    const { DB } = process.env as unknown as Env;

    // Get today's prompt
    const prompt = getTodaysPrompt();
    
    // Get today's date bounds (midnight to midnight)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStartUnix = Math.floor(todayStart.getTime() / 1000);
    const tomorrowStartUnix = todayStartUnix + 86400;

    // Get check-ins from today that have reviews (assumed to be prompt responses)
    // We consider any check-in with a review today as a potential prompt response
    const responses = await DB.prepare(`
      SELECT c.id, c.brand, c.product, c.rating, c.review, c.image_url, c.created_at, c.user_id, u.username
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at < ?
      AND c.review IS NOT NULL AND c.review != ''
      ORDER BY c.created_at DESC
      LIMIT 10
    `).bind(todayStartUnix, tomorrowStartUnix).all<CheckinRow>();

    // Check if current user has responded today
    let hasResponded = false;
    const session = await getSession(request);
    if (session) {
      const userResponse = await DB.prepare(`
        SELECT id FROM checkins
        WHERE user_id = ?
        AND created_at >= ? AND created_at < ?
        AND review IS NOT NULL AND review != ''
        LIMIT 1
      `).bind(session.userId, todayStartUnix, tomorrowStartUnix).first();
      hasResponded = !!userResponse;
    }

    return NextResponse.json({
      prompt,
      responses: responses.results || [],
      responseCount: responses.results?.length || 0,
      hasResponded,
      todayDate: todayStart.toISOString().split('T')[0],
    });
  } catch (error) {
    console.error("Daily prompt error:", error);
    return NextResponse.json(
      { error: "Failed to load daily prompt" },
      { status: 500 }
    );
  }
}
