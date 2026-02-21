import { getRequestContext } from "@cloudflare/next-on-pages";
import type { LeaderboardResponse } from "@/lib/types";

export const runtime = "edge";

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Calculate timestamps
    const now = Math.floor(Date.now() / 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60);
    const oneMonthAgo = now - (30 * 24 * 60 * 60);

    // All-time leaderboard (top 20 users by check-ins)
    const allTimeQuery = `
      SELECT 
        u.username,
        COUNT(c.id) as checkin_count,
        ROUND(AVG(CASE WHEN c.rating IS NOT NULL THEN c.rating END), 1) as avg_rating,
        COUNT(DISTINCT c.brand) as unique_brands,
        COALESCE(SUM(l.like_count), 0) as total_likes_received
      FROM users u
      LEFT JOIN checkins c ON u.id = c.user_id
      LEFT JOIN (
        SELECT checkin_id, COUNT(*) as like_count 
        FROM likes 
        GROUP BY checkin_id
      ) l ON c.id = l.checkin_id
      GROUP BY u.id, u.username
      HAVING checkin_count > 0
      ORDER BY checkin_count DESC, total_likes_received DESC
      LIMIT 20
    `;

    // This week leaderboard
    const weekQuery = `
      SELECT 
        u.username,
        COUNT(c.id) as checkin_count,
        ROUND(AVG(CASE WHEN c.rating IS NOT NULL THEN c.rating END), 1) as avg_rating,
        COUNT(DISTINCT c.brand) as unique_brands,
        COALESCE(SUM(l.like_count), 0) as total_likes_received
      FROM users u
      LEFT JOIN checkins c ON u.id = c.user_id AND c.created_at >= ?
      LEFT JOIN (
        SELECT checkin_id, COUNT(*) as like_count 
        FROM likes 
        GROUP BY checkin_id
      ) l ON c.id = l.checkin_id
      GROUP BY u.id, u.username
      HAVING checkin_count > 0
      ORDER BY checkin_count DESC, total_likes_received DESC
      LIMIT 20
    `;

    // This month leaderboard
    const monthQuery = `
      SELECT 
        u.username,
        COUNT(c.id) as checkin_count,
        ROUND(AVG(CASE WHEN c.rating IS NOT NULL THEN c.rating END), 1) as avg_rating,
        COUNT(DISTINCT c.brand) as unique_brands,
        COALESCE(SUM(l.like_count), 0) as total_likes_received
      FROM users u
      LEFT JOIN checkins c ON u.id = c.user_id AND c.created_at >= ?
      LEFT JOIN (
        SELECT checkin_id, COUNT(*) as like_count 
        FROM likes 
        GROUP BY checkin_id
      ) l ON c.id = l.checkin_id
      GROUP BY u.id, u.username
      HAVING checkin_count > 0
      ORDER BY checkin_count DESC, total_likes_received DESC
      LIMIT 20
    `;

    const [allTimeResult, weekResult, monthResult] = await Promise.all([
      db.prepare(allTimeQuery).all(),
      db.prepare(weekQuery).bind(oneWeekAgo).all(),
      db.prepare(monthQuery).bind(oneMonthAgo).all(),
    ]);

    // Add ranks
    const addRanks = (entries: any[]) => 
      entries.map((entry, index) => ({ ...entry, rank: index + 1 }));

    const response: LeaderboardResponse = {
      allTime: addRanks(allTimeResult.results || []),
      thisWeek: addRanks(weekResult.results || []),
      thisMonth: addRanks(monthResult.results || []),
    };

    return Response.json(response);
  } catch (error) {
    console.error("Leaderboard error:", error);
    return Response.json({ error: "Failed to load leaderboard" }, { status: 500 });
  }
}
