import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function GET() {
  const ctx = getRequestContext();
  const db = ctx.env.DB;
  
  // Get current user if logged in
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  let user: { id: number } | null = null;
  
  if (sessionToken) {
    const session = await db.prepare(
      'SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now")'
    ).bind(sessionToken).first<{ user_id: number }>();
    if (session) {
      user = { id: session.user_id };
    }
  }
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Get first day of current month
  const firstOfCurrentMonth = new Date(currentYear, currentMonth, 1);
  const currentMonthStart = Math.floor(firstOfCurrentMonth.getTime() / 1000);
  
  // Get first day of last month
  const firstOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
  const lastMonthStart = Math.floor(firstOfLastMonth.getTime() / 1000);
  
  // Get days in current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Month names
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const lastMonthName = firstOfLastMonth.toLocaleDateString('en-US', { month: 'long' });
  
  try {
    // Get user's last month stats
    let lastMonthSmokes = 0;
    let lastMonthAvgRating = 0;
    let lastMonthTopBrand: string | null = null;
    let lastMonthLikes = 0;
    let lastMonthComments = 0;
    let lastMonthBadges = 0;
    
    if (user) {
      // User's last month check-ins
      const userLastMonth = await db.prepare(`
        SELECT COUNT(*) as count, AVG(rating) as avg_rating
        FROM checkins
        WHERE user_id = ? AND created_at >= ? AND created_at < ?
      `).bind(user.id, lastMonthStart, currentMonthStart).first() as { count: number; avg_rating: number | null } | null;
      
      if (userLastMonth) {
        lastMonthSmokes = userLastMonth.count || 0;
        lastMonthAvgRating = userLastMonth.avg_rating || 0;
      }
      
      // User's top brand last month
      const topBrand = await db.prepare(`
        SELECT brand, COUNT(*) as count
        FROM checkins
        WHERE user_id = ? AND created_at >= ? AND created_at < ?
        GROUP BY brand
        ORDER BY count DESC
        LIMIT 1
      `).bind(user.id, lastMonthStart, currentMonthStart).first() as { brand: string } | null;
      
      if (topBrand) {
        lastMonthTopBrand = topBrand.brand;
      }
      
      // Likes received last month
      const likesResult = await db.prepare(`
        SELECT COUNT(*) as count
        FROM likes l
        JOIN checkins c ON l.checkin_id = c.id
        WHERE c.user_id = ? AND l.created_at >= ? AND l.created_at < ?
      `).bind(user.id, lastMonthStart, currentMonthStart).first() as { count: number } | null;
      
      lastMonthLikes = likesResult?.count || 0;
      
      // Comments received last month
      const commentsResult = await db.prepare(`
        SELECT COUNT(*) as count
        FROM comments cm
        JOIN checkins c ON cm.checkin_id = c.id
        WHERE c.user_id = ? AND cm.user_id != ? AND cm.created_at >= ? AND cm.created_at < ?
      `).bind(user.id, user.id, lastMonthStart, currentMonthStart).first() as { count: number } | null;
      
      lastMonthComments = commentsResult?.count || 0;
    }
    
    // This month's smokes so far
    const thisMonthResult = await db.prepare(`
      SELECT COUNT(*) as count FROM checkins WHERE created_at >= ?
    `).bind(currentMonthStart).first() as { count: number } | null;
    
    const thisMonthSmokes = thisMonthResult?.count || 0;
    
    // First smokers this month
    const firstSmokers = await db.prepare(`
      SELECT u.username, c.brand, c.created_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      ORDER BY c.created_at ASC
      LIMIT 10
    `).bind(currentMonthStart).all() as { results: Array<{ username: string; brand: string; created_at: number }> };
    
    // Monthly leaders from last month
    const monthlyLeaders = await db.prepare(`
      SELECT u.username, COUNT(*) as last_month_count,
        (SELECT COUNT(*) FROM checkins c2 
         WHERE c2.user_id = u.id 
         AND c2.created_at >= ? - 86400 * 7
         AND c2.created_at < ?) as recent_count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at < ?
      GROUP BY u.id, u.username
      ORDER BY last_month_count DESC
      LIMIT 10
    `).bind(currentMonthStart, currentMonthStart, lastMonthStart, currentMonthStart).all() as { 
      results: Array<{ username: string; last_month_count: number; recent_count: number }> 
    };
    
    // Platform total last month
    const platformResult = await db.prepare(`
      SELECT COUNT(*) as count FROM checkins 
      WHERE created_at >= ? AND created_at < ?
    `).bind(lastMonthStart, currentMonthStart).first() as { count: number } | null;
    
    const platformMonthlySmokes = platformResult?.count || 0;
    
    return NextResponse.json({
      lastMonthSmokes,
      lastMonthAvgRating,
      lastMonthTopBrand,
      lastMonthLikes,
      lastMonthComments,
      lastMonthBadges,
      thisMonthSmokes,
      monthlyLeaders: monthlyLeaders.results.map(l => ({
        username: l.username,
        lastMonthCount: l.last_month_count,
        streak: l.recent_count >= 7 ? Math.floor(l.recent_count / 7) : 0
      })),
      firstSmokersThisMonth: firstSmokers.results,
      platformMonthlySmokes,
      daysInMonth,
      monthName,
      lastMonthName
    });
  } catch (error) {
    console.error('New month API error:', error);
    return NextResponse.json({
      lastMonthSmokes: 0,
      lastMonthAvgRating: 0,
      lastMonthTopBrand: null,
      lastMonthLikes: 0,
      lastMonthComments: 0,
      lastMonthBadges: 0,
      thisMonthSmokes: 0,
      monthlyLeaders: [],
      firstSmokersThisMonth: [],
      platformMonthlySmokes: 0,
      daysInMonth: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(),
      monthName: new Date().toLocaleDateString('en-US', { month: 'long' }),
      lastMonthName: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString('en-US', { month: 'long' })
    });
  }
}
