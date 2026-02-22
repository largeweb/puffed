import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// GET /api/brands?q=searchterm&category=cigar&limit=10
// Returns unique brand names matching the search term
export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const { searchParams } = new URL(request.url);
  
  const query = searchParams.get("q")?.trim().toLowerCase() || "";
  const category = searchParams.get("category") || null;
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
  
  try {
    // Build the query - get unique brands with check-in counts
    let sql = `
      SELECT 
        brand,
        category,
        COUNT(*) as count,
        AVG(rating) as avg_rating
      FROM checkins
      WHERE 1=1
    `;
    const params: string[] = [];
    
    if (query) {
      sql += ` AND LOWER(brand) LIKE ?`;
      params.push(`%${query}%`);
    }
    
    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }
    
    sql += ` GROUP BY LOWER(brand), category`;
    sql += ` ORDER BY count DESC, brand ASC`;
    sql += ` LIMIT ?`;
    params.push(limit.toString());
    
    const result = await env.DB.prepare(sql)
      .bind(...params)
      .all();
    
    const brands = (result.results || []).map((row: Record<string, unknown>) => ({
      brand: row.brand as string,
      category: row.category as string,
      count: row.count as number,
      avgRating: row.avg_rating ? Math.round((row.avg_rating as number) * 10) / 10 : null,
    }));
    
    return NextResponse.json({ brands });
  } catch (error) {
    console.error("Brands search error:", error);
    return NextResponse.json({ error: "Failed to search brands" }, { status: 500 });
  }
}
