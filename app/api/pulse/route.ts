import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface PulseData {
  // Real-time counts
  totalUsers: number;
  totalCheckins: number;
  totalLikes: number;
  totalFollows: number;
  totalComments: number;
  totalReactions: number;
  uniqueBrands: number;
  
  // This week stats
  weekUsers: number;
  weekCheckins: number;
  weekLikes: number;
  weekFollows: number;
  
  // Growth metrics
  userGrowthPercent: number;
  checkinGrowthPercent: number;
  
  // Milestones reached
  milestones: {
    type: 'users' | 'checkins' | 'brands' | 'likes';
    value: number;
    reached: boolean;
    label: string;
  }[];
  
  // Hot right now
  hotBrands: {
    brand: string;
    weekCount: number;
    trend: 'up' | 'same' | 'down' | 'new';
  }[];
  
  // New members
  newMembers: {
    username: string;
    joinedAgo: string;
    checkinCount: number;
  }[];
  
  // Recent activity pulse
  activityPulse: {
    type: 'checkin' | 'like' | 'follow' | 'comment' | 'reaction';
    count: number;
    label: string;
  }[];
  
  // Platform vibe
  avgRating: number;
  topFlavor: string | null;
  mostActiveHour: number;
}

function getGrowthPercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function getTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

export async function GET(): Promise<Response> {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    const now = Math.floor(Date.now() / 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60);
    const twoWeeksAgo = now - (14 * 24 * 60 * 60);
    const oneDayAgo = now - (24 * 60 * 60);
    
    // Total counts
    const totalUsers = await db.prepare(`SELECT COUNT(*) as c FROM users`).first<{ c: number }>();
    const totalCheckins = await db.prepare(`SELECT COUNT(*) as c FROM checkins`).first<{ c: number }>();
    const totalLikes = await db.prepare(`SELECT COUNT(*) as c FROM likes`).first<{ c: number }>();
    const totalFollows = await db.prepare(`SELECT COUNT(*) as c FROM follows`).first<{ c: number }>();
    const totalComments = await db.prepare(`SELECT COUNT(*) as c FROM comments`).first<{ c: number }>();
    const totalReactions = await db.prepare(`SELECT COUNT(*) as c FROM reactions`).first<{ c: number }>();
    const uniqueBrands = await db.prepare(`SELECT COUNT(DISTINCT brand) as c FROM checkins`).first<{ c: number }>();
    
    // This week counts
    const weekUsers = await db.prepare(`SELECT COUNT(*) as c FROM users WHERE created_at >= ?`).bind(oneWeekAgo).first<{ c: number }>();
    const weekCheckins = await db.prepare(`SELECT COUNT(*) as c FROM checkins WHERE created_at >= ?`).bind(oneWeekAgo).first<{ c: number }>();
    const weekLikes = await db.prepare(`SELECT COUNT(*) as c FROM likes WHERE created_at >= ?`).bind(oneWeekAgo).first<{ c: number }>();
    const weekFollows = await db.prepare(`SELECT COUNT(*) as c FROM follows WHERE created_at >= ?`).bind(oneWeekAgo).first<{ c: number }>();
    
    // Last week counts (for growth comparison)
    const lastWeekUsers = await db.prepare(`SELECT COUNT(*) as c FROM users WHERE created_at >= ? AND created_at < ?`).bind(twoWeeksAgo, oneWeekAgo).first<{ c: number }>();
    const lastWeekCheckins = await db.prepare(`SELECT COUNT(*) as c FROM checkins WHERE created_at >= ? AND created_at < ?`).bind(twoWeeksAgo, oneWeekAgo).first<{ c: number }>();
    
    // Hot brands this week
    const hotBrandsResults = await db.prepare(`
      SELECT 
        brand,
        COUNT(*) as week_count
      FROM checkins 
      WHERE created_at >= ?
      GROUP BY brand
      ORDER BY week_count DESC
      LIMIT 5
    `).bind(oneWeekAgo).all<{ brand: string; week_count: number }>();
    
    // Get last week brand counts for trend comparison
    const lastWeekBrands = await db.prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins 
      WHERE created_at >= ? AND created_at < ?
      GROUP BY brand
    `).bind(twoWeeksAgo, oneWeekAgo).all<{ brand: string; count: number }>();
    
    const lastWeekBrandMap = new Map(lastWeekBrands.results?.map(b => [b.brand, b.count]) || []);
    
    const hotBrands = (hotBrandsResults.results || []).map(b => {
      const lastWeek = lastWeekBrandMap.get(b.brand) || 0;
      let trend: 'up' | 'same' | 'down' | 'new' = 'same';
      if (lastWeek === 0) trend = 'new';
      else if (b.week_count > lastWeek) trend = 'up';
      else if (b.week_count < lastWeek) trend = 'down';
      
      return {
        brand: b.brand,
        weekCount: b.week_count,
        trend
      };
    });
    
    // New members this week
    const newMembersResults = await db.prepare(`
      SELECT u.username, u.created_at, 
        (SELECT COUNT(*) FROM checkins c WHERE c.user_id = u.id) as checkin_count
      FROM users u
      WHERE u.created_at >= ?
      ORDER BY u.created_at DESC
      LIMIT 5
    `).bind(oneWeekAgo).all<{ username: string; created_at: number; checkin_count: number }>();
    
    const newMembers = (newMembersResults.results || []).map(m => ({
      username: m.username,
      joinedAgo: getTimeAgo(m.created_at),
      checkinCount: m.checkin_count
    }));
    
    // Activity pulse (last 24h)
    const dayCheckins = await db.prepare(`SELECT COUNT(*) as c FROM checkins WHERE created_at >= ?`).bind(oneDayAgo).first<{ c: number }>();
    const dayLikes = await db.prepare(`SELECT COUNT(*) as c FROM likes WHERE created_at >= ?`).bind(oneDayAgo).first<{ c: number }>();
    const dayFollows = await db.prepare(`SELECT COUNT(*) as c FROM follows WHERE created_at >= ?`).bind(oneDayAgo).first<{ c: number }>();
    const dayComments = await db.prepare(`SELECT COUNT(*) as c FROM comments WHERE created_at >= ?`).bind(oneDayAgo).first<{ c: number }>();
    const dayReactions = await db.prepare(`SELECT COUNT(*) as c FROM reactions WHERE created_at >= ?`).bind(oneDayAgo).first<{ c: number }>();
    
    const activityPulse = [
      { type: 'checkin' as const, count: dayCheckins?.c || 0, label: 'smokes logged' },
      { type: 'like' as const, count: dayLikes?.c || 0, label: 'likes given' },
      { type: 'follow' as const, count: dayFollows?.c || 0, label: 'new follows' },
      { type: 'comment' as const, count: dayComments?.c || 0, label: 'comments' },
      { type: 'reaction' as const, count: dayReactions?.c || 0, label: 'reactions' },
    ].filter(a => a.count > 0);
    
    // Platform vibe
    const avgRatingResult = await db.prepare(`SELECT AVG(rating) as avg FROM checkins WHERE rating IS NOT NULL`).first<{ avg: number }>();
    
    // Top flavor
    const topFlavorResult = await db.prepare(`
      SELECT flavor_id, COUNT(*) as c 
      FROM checkin_flavors 
      GROUP BY flavor_id 
      ORDER BY c DESC 
      LIMIT 1
    `).first<{ flavor_id: string; c: number }>();
    
    // Most active hour
    const mostActiveHourResult = await db.prepare(`
      SELECT (created_at % 86400) / 3600 as hour, COUNT(*) as c
      FROM checkins
      GROUP BY hour
      ORDER BY c DESC
      LIMIT 1
    `).first<{ hour: number; c: number }>();
    
    // Calculate milestones
    const userCount = totalUsers?.c || 0;
    const checkinCount = totalCheckins?.c || 0;
    const brandCount = uniqueBrands?.c || 0;
    const likeCount = totalLikes?.c || 0;
    
    const milestones = [
      { type: 'users' as const, value: 10, reached: userCount >= 10, label: '10 smokers' },
      { type: 'users' as const, value: 25, reached: userCount >= 25, label: '25 smokers' },
      { type: 'users' as const, value: 50, reached: userCount >= 50, label: '50 smokers' },
      { type: 'checkins' as const, value: 25, reached: checkinCount >= 25, label: '25 smokes logged' },
      { type: 'checkins' as const, value: 50, reached: checkinCount >= 50, label: '50 smokes logged' },
      { type: 'checkins' as const, value: 100, reached: checkinCount >= 100, label: '100 smokes logged' },
      { type: 'brands' as const, value: 10, reached: brandCount >= 10, label: '10 unique brands' },
      { type: 'brands' as const, value: 25, reached: brandCount >= 25, label: '25 unique brands' },
      { type: 'likes' as const, value: 25, reached: likeCount >= 25, label: '25 likes shared' },
      { type: 'likes' as const, value: 50, reached: likeCount >= 50, label: '50 likes shared' },
    ];
    
    const data: PulseData = {
      totalUsers: userCount,
      totalCheckins: checkinCount,
      totalLikes: likeCount,
      totalFollows: totalFollows?.c || 0,
      totalComments: totalComments?.c || 0,
      totalReactions: totalReactions?.c || 0,
      uniqueBrands: brandCount,
      
      weekUsers: weekUsers?.c || 0,
      weekCheckins: weekCheckins?.c || 0,
      weekLikes: weekLikes?.c || 0,
      weekFollows: weekFollows?.c || 0,
      
      userGrowthPercent: getGrowthPercent(weekUsers?.c || 0, lastWeekUsers?.c || 0),
      checkinGrowthPercent: getGrowthPercent(weekCheckins?.c || 0, lastWeekCheckins?.c || 0),
      
      milestones,
      hotBrands,
      newMembers,
      activityPulse,
      
      avgRating: avgRatingResult?.avg ? Math.round(avgRatingResult.avg * 10) / 10 : 0,
      topFlavor: topFlavorResult?.flavor_id || null,
      mostActiveHour: mostActiveHourResult?.hour || 12,
    };
    
    return Response.json(data);
  } catch (error) {
    console.error("Pulse error:", error);
    return Response.json({ error: "Failed to fetch pulse data" }, { status: 500 });
  }
}
