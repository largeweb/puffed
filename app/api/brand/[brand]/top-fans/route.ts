import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

interface TopFan {
  user_id: string;
  username: string;
  checkin_count: number;
  avg_rating: number | null;
  first_smoke: number;
  latest_smoke: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brand: string }> }
) {
  try {
    const { brand } = await params;
    const decodedBrand = decodeURIComponent(brand);
    
    const { env } = getRequestContext();
    const DB = env.DB;

    // Get top fans for this brand - users with most check-ins
    const result = await DB.prepare(`
      SELECT 
        c.user_id,
        u.username,
        COUNT(*) as checkin_count,
        AVG(CASE WHEN c.rating IS NOT NULL THEN c.rating END) as avg_rating,
        MIN(c.created_at) as first_smoke,
        MAX(c.created_at) as latest_smoke
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE LOWER(c.brand) = LOWER(?)
      GROUP BY c.user_id, u.username
      ORDER BY checkin_count DESC, latest_smoke DESC
      LIMIT 10
    `).bind(decodedBrand).all<TopFan>();

    return NextResponse.json({
      brand: decodedBrand,
      topFans: result.results,
    });
  } catch (error) {
    console.error("Top fans error:", error);
    return NextResponse.json({ error: "Failed to fetch top fans" }, { status: 500 });
  }
}
