import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface MVPAwardsData {
  weekOf: string;
  weekStart: string;
  weekEnd: string;
  
  mvp: { username: string; score: number; checkins: number; likesGiven: number; commentsGiven: number } | null;
  bestCheckin: { username: string; brand: string; rating: number; likes: number; comments: number } | null;
  topEngager: { username: string; likesGiven: number; commentsGiven: number } | null;
  
  weeklyStats: {
    totalCheckins: number;
    totalLikes: number;
    totalComments: number;
    newUsers: number;
  };
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    // Calculate week boundaries (Sunday to Saturday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekStartTs = Math.floor(weekStart.getTime() / 1000);
    const weekEndTs = Math.floor(weekEnd.getTime() / 1000);
    
    // Simple MVP - user with most check-ins this week
    let mvp = null;
    try {
      const mvpResult = await db.prepare(`
        SELECT u.username, COUNT(*) as checkins
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE c.created_at >= ? AND c.created_at <= ?
          AND u.username != 'openclaw_tester'
        GROUP BY u.id
        ORDER BY checkins DESC
        LIMIT 1
      `).bind(weekStartTs, weekEndTs).first<{ username: string; checkins: number }>();
      
      if (mvpResult) {
        // Get additional stats for MVP
        const likesGiven = await db.prepare(`
          SELECT COUNT(*) as count FROM likes l
          JOIN users u ON l.user_id = u.id
          WHERE u.username = ? AND l.created_at >= ? AND l.created_at <= ?
        `).bind(mvpResult.username, weekStartTs, weekEndTs).first<{ count: number }>();
        
        const commentsGiven = await db.prepare(`
          SELECT COUNT(*) as count FROM comments c
          JOIN users u ON c.user_id = u.id
          WHERE u.username = ? AND c.created_at >= ? AND c.created_at <= ?
        `).bind(mvpResult.username, weekStartTs, weekEndTs).first<{ count: number }>();
        
        mvp = {
          username: mvpResult.username,
          checkins: mvpResult.checkins,
          likesGiven: likesGiven?.count || 0,
          commentsGiven: commentsGiven?.count || 0,
          score: mvpResult.checkins * 10 + (likesGiven?.count || 0) * 2 + (commentsGiven?.count || 0) * 5
        };
      }
    } catch (e) {
      console.error("MVP query failed:", e);
    }
    
    // Best check-in - highest rated with most engagement
    let bestCheckin = null;
    try {
      const checkinResult = await db.prepare(`
        SELECT 
          c.id,
          u.username,
          c.brand,
          c.rating
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE c.created_at >= ? AND c.created_at <= ?
          AND c.rating IS NOT NULL
          AND u.username != 'openclaw_tester'
        ORDER BY c.rating DESC, c.created_at DESC
        LIMIT 1
      `).bind(weekStartTs, weekEndTs).first<{ id: string; username: string; brand: string; rating: number }>();
      
      if (checkinResult) {
        const likes = await db.prepare(`
          SELECT COUNT(*) as count FROM likes WHERE checkin_id = ?
        `).bind(checkinResult.id).first<{ count: number }>();
        
        const comments = await db.prepare(`
          SELECT COUNT(*) as count FROM comments WHERE checkin_id = ?
        `).bind(checkinResult.id).first<{ count: number }>();
        
        bestCheckin = {
          username: checkinResult.username,
          brand: checkinResult.brand,
          rating: checkinResult.rating,
          likes: likes?.count || 0,
          comments: comments?.count || 0
        };
      }
    } catch (e) {
      console.error("Best checkin query failed:", e);
    }
    
    // Top engager - most likes + comments given
    let topEngager = null;
    try {
      const engagerResult = await db.prepare(`
        SELECT u.username, COUNT(*) as likesGiven
        FROM likes l
        JOIN users u ON l.user_id = u.id
        WHERE l.created_at >= ? AND l.created_at <= ?
          AND u.username != 'openclaw_tester'
        GROUP BY u.id
        ORDER BY likesGiven DESC
        LIMIT 1
      `).bind(weekStartTs, weekEndTs).first<{ username: string; likesGiven: number }>();
      
      if (engagerResult) {
        const comments = await db.prepare(`
          SELECT COUNT(*) as count FROM comments c
          JOIN users u ON c.user_id = u.id
          WHERE u.username = ? AND c.created_at >= ? AND c.created_at <= ?
        `).bind(engagerResult.username, weekStartTs, weekEndTs).first<{ count: number }>();
        
        topEngager = {
          username: engagerResult.username,
          likesGiven: engagerResult.likesGiven,
          commentsGiven: comments?.count || 0
        };
      }
    } catch (e) {
      console.error("Top engager query failed:", e);
    }
    
    // Weekly stats - simple counts
    let weeklyStats = { totalCheckins: 0, totalLikes: 0, totalComments: 0, newUsers: 0 };
    try {
      const checkins = await db.prepare(`
        SELECT COUNT(*) as count FROM checkins WHERE created_at >= ? AND created_at <= ?
      `).bind(weekStartTs, weekEndTs).first<{ count: number }>();
      
      const likes = await db.prepare(`
        SELECT COUNT(*) as count FROM likes WHERE created_at >= ? AND created_at <= ?
      `).bind(weekStartTs, weekEndTs).first<{ count: number }>();
      
      const comments = await db.prepare(`
        SELECT COUNT(*) as count FROM comments WHERE created_at >= ? AND created_at <= ?
      `).bind(weekStartTs, weekEndTs).first<{ count: number }>();
      
      const users = await db.prepare(`
        SELECT COUNT(*) as count FROM users WHERE created_at >= ? AND created_at <= ?
      `).bind(weekStartTs, weekEndTs).first<{ count: number }>();
      
      weeklyStats = {
        totalCheckins: checkins?.count || 0,
        totalLikes: likes?.count || 0,
        totalComments: comments?.count || 0,
        newUsers: users?.count || 0
      };
    } catch (e) {
      console.error("Weekly stats query failed:", e);
    }
    
    // Format dates
    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const response: MVPAwardsData = {
      weekOf: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      mvp,
      bestCheckin,
      topEngager,
      weeklyStats
    };
    
    return Response.json(response);
  } catch (error) {
    console.error("MVP Awards API error:", error);
    return Response.json({ error: "Failed to fetch MVP awards", details: String(error) }, { status: 500 });
  }
}
