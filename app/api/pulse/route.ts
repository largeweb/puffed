import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface PulseData {
  totalUsers: number;
  totalCheckins: number;
  totalLikes: number;
  totalFollows: number;
  totalComments: number;
  totalReactions: number;
  uniqueBrands: number;
  
  weekUsers: number;
  weekCheckins: number;
  weekLikes: number;
  weekFollows: number;
  
  userGrowthPercent: number;
  checkinGrowthPercent: number;
  
  milestones: {
    type: 'users' | 'checkins' | 'brands' | 'likes';
    value: number;
    reached: boolean;
    label: string;
  }[];
  
  hotBrands: {
    brand: string;
    weekCount: number;
    trend: 'up' | 'same' | 'down' | 'new';
  }[];
  
  newMembers: {
    username: string;
    joinedAgo: string;
    checkinCount: number;
  }[];
  
  activityPulse: {
    type: 'checkin' | 'like' | 'follow' | 'comment' | 'reaction';
    count: number;
    label: string;
  }[];
  
  avgRating: number;
  topFlavor: string | null;
  mostActiveHour: number;
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const now = Math.floor(Date.now() / 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60);
    const twoWeeksAgo = now - (14 * 24 * 60 * 60);
    const oneDayAgo = now - (24 * 60 * 60);

    // Total counts
    const totalsQuery = `
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM checkins) as total_checkins,
        (SELECT COUNT(*) FROM likes) as total_likes,
        (SELECT COUNT(*) FROM follows) as total_follows,
        (SELECT COUNT(*) FROM comments) as total_comments,
        (SELECT COUNT(*) FROM reactions) as total_reactions,
        (SELECT COUNT(DISTINCT brand) FROM checkins) as unique_brands
    `;

    // This week counts
    const weekQuery = `
      SELECT
        (SELECT COUNT(*) FROM users WHERE created_at >= ?) as week_users,
        (SELECT COUNT(*) FROM checkins WHERE created_at >= ?) as week_checkins,
        (SELECT COUNT(*) FROM likes WHERE created_at >= ?) as week_likes,
        (SELECT COUNT(*) FROM follows WHERE created_at >= ?) as week_follows
    `;

    // Last week counts (for growth calculation)
    const lastWeekQuery = `
      SELECT
        (SELECT COUNT(*) FROM users WHERE created_at >= ? AND created_at < ?) as last_week_users,
        (SELECT COUNT(*) FROM checkins WHERE created_at >= ? AND created_at < ?) as last_week_checkins
    `;

    // Hot brands this week (compared to last week)
    const hotBrandsQuery = `
      WITH this_week AS (
        SELECT brand, COUNT(*) as count
        FROM checkins
        WHERE created_at >= ?
        GROUP BY brand
      ),
      last_week AS (
        SELECT brand, COUNT(*) as count
        FROM checkins
        WHERE created_at >= ? AND created_at < ?
        GROUP BY brand
      )
      SELECT 
        tw.brand,
        tw.count as week_count,
        COALESCE(lw.count, 0) as last_week_count
      FROM this_week tw
      LEFT JOIN last_week lw ON tw.brand = lw.brand
      ORDER BY tw.count DESC
      LIMIT 5
    `;

    // New members (last 3 days)
    const newMembersQuery = `
      SELECT 
        u.username,
        u.created_at,
        (SELECT COUNT(*) FROM checkins c WHERE c.user_id = u.id) as checkin_count
      FROM users u
      WHERE u.created_at >= ?
      ORDER BY u.created_at DESC
      LIMIT 5
    `;

    // 24h activity pulse
    const activityQuery = `
      SELECT
        (SELECT COUNT(*) FROM checkins WHERE created_at >= ?) as checkins_24h,
        (SELECT COUNT(*) FROM likes WHERE created_at >= ?) as likes_24h,
        (SELECT COUNT(*) FROM follows WHERE created_at >= ?) as follows_24h,
        (SELECT COUNT(*) FROM comments WHERE created_at >= ?) as comments_24h,
        (SELECT COUNT(*) FROM reactions WHERE created_at >= ?) as reactions_24h
    `;

    // Average rating & top flavor
    const vibeQuery = `
      SELECT 
        ROUND(AVG(CASE WHEN rating IS NOT NULL THEN rating END), 1) as avg_rating,
        (
          SELECT flavor_tags FROM checkins 
          WHERE flavor_tags IS NOT NULL AND flavor_tags != '' AND flavor_tags != '[]'
          GROUP BY flavor_tags 
          ORDER BY COUNT(*) DESC 
          LIMIT 1
        ) as top_flavor_raw
      FROM checkins
    `;

    // Most active hour (all time)
    const hourQuery = `
      SELECT 
        CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) as hour,
        COUNT(*) as count
      FROM checkins
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `;

    const threeDaysAgo = now - (3 * 24 * 60 * 60);

    const [
      totalsResult,
      weekResult,
      lastWeekResult,
      hotBrandsResult,
      newMembersResult,
      activityResult,
      vibeResult,
      hourResult,
    ] = await Promise.all([
      db.prepare(totalsQuery).first(),
      db.prepare(weekQuery).bind(oneWeekAgo, oneWeekAgo, oneWeekAgo, oneWeekAgo).first(),
      db.prepare(lastWeekQuery).bind(twoWeeksAgo, oneWeekAgo, twoWeeksAgo, oneWeekAgo).first(),
      db.prepare(hotBrandsQuery).bind(oneWeekAgo, twoWeeksAgo, oneWeekAgo).all(),
      db.prepare(newMembersQuery).bind(threeDaysAgo).all(),
      db.prepare(activityQuery).bind(oneDayAgo, oneDayAgo, oneDayAgo, oneDayAgo, oneDayAgo).first(),
      db.prepare(vibeQuery).first(),
      db.prepare(hourQuery).first(),
    ]);

    const totals = totalsResult as any || {};
    const week = weekResult as any || {};
    const lastWeek = lastWeekResult as any || {};
    const activity = activityResult as any || {};
    const vibe = vibeResult as any || {};
    const hourData = hourResult as any || {};

    // Calculate growth percentages
    const userGrowth = lastWeek.last_week_users > 0 
      ? Math.round(((week.week_users - lastWeek.last_week_users) / lastWeek.last_week_users) * 100)
      : (week.week_users > 0 ? 100 : 0);
    const checkinGrowth = lastWeek.last_week_checkins > 0
      ? Math.round(((week.week_checkins - lastWeek.last_week_checkins) / lastWeek.last_week_checkins) * 100)
      : (week.week_checkins > 0 ? 100 : 0);

    // Build hot brands with trends
    const hotBrands = (hotBrandsResult.results || []).map((row: any) => {
      let trend: 'up' | 'same' | 'down' | 'new' = 'same';
      if (row.last_week_count === 0) {
        trend = 'new';
      } else if (row.week_count > row.last_week_count) {
        trend = 'up';
      } else if (row.week_count < row.last_week_count) {
        trend = 'down';
      }
      return {
        brand: row.brand,
        weekCount: row.week_count,
        trend,
      };
    });

    // Build new members with relative time
    const newMembers = (newMembersResult.results || []).map((row: any) => {
      const secondsAgo = now - row.created_at;
      let joinedAgo = '';
      if (secondsAgo < 3600) {
        joinedAgo = `${Math.floor(secondsAgo / 60)}m ago`;
      } else if (secondsAgo < 86400) {
        joinedAgo = `${Math.floor(secondsAgo / 3600)}h ago`;
      } else {
        joinedAgo = `${Math.floor(secondsAgo / 86400)}d ago`;
      }
      return {
        username: row.username,
        joinedAgo,
        checkinCount: row.checkin_count || 0,
      };
    });

    // Build milestones
    const milestones = [
      { type: 'users' as const, value: 10, label: '10 Users' },
      { type: 'users' as const, value: 25, label: '25 Users' },
      { type: 'users' as const, value: 50, label: '50 Users' },
      { type: 'users' as const, value: 100, label: '100 Users' },
      { type: 'checkins' as const, value: 50, label: '50 Check-ins' },
      { type: 'checkins' as const, value: 100, label: '100 Check-ins' },
      { type: 'checkins' as const, value: 250, label: '250 Check-ins' },
      { type: 'checkins' as const, value: 500, label: '500 Check-ins' },
      { type: 'brands' as const, value: 25, label: '25 Brands Logged' },
      { type: 'brands' as const, value: 50, label: '50 Brands Logged' },
      { type: 'brands' as const, value: 100, label: '100 Brands Logged' },
      { type: 'likes' as const, value: 50, label: '50 Likes' },
      { type: 'likes' as const, value: 100, label: '100 Likes' },
      { type: 'likes' as const, value: 250, label: '250 Likes' },
    ].map(m => ({
      ...m,
      reached: m.type === 'users' ? totals.total_users >= m.value :
               m.type === 'checkins' ? totals.total_checkins >= m.value :
               m.type === 'brands' ? totals.unique_brands >= m.value :
               totals.total_likes >= m.value,
    }));

    // Parse top flavor from stored JSON
    let topFlavor: string | null = null;
    if (vibe.top_flavor_raw) {
      try {
        const flavors = JSON.parse(vibe.top_flavor_raw);
        if (Array.isArray(flavors) && flavors.length > 0) {
          topFlavor = flavors[0];
        }
      } catch {
        // Not JSON, might be comma-separated or single value
        topFlavor = vibe.top_flavor_raw.split(',')[0]?.trim() || null;
      }
    }

    const response: PulseData = {
      totalUsers: totals.total_users || 0,
      totalCheckins: totals.total_checkins || 0,
      totalLikes: totals.total_likes || 0,
      totalFollows: totals.total_follows || 0,
      totalComments: totals.total_comments || 0,
      totalReactions: totals.total_reactions || 0,
      uniqueBrands: totals.unique_brands || 0,
      
      weekUsers: week.week_users || 0,
      weekCheckins: week.week_checkins || 0,
      weekLikes: week.week_likes || 0,
      weekFollows: week.week_follows || 0,
      
      userGrowthPercent: userGrowth,
      checkinGrowthPercent: checkinGrowth,
      
      milestones,
      hotBrands,
      newMembers,
      
      activityPulse: [
        { type: 'checkin', count: activity.checkins_24h || 0, label: 'Check-ins' },
        { type: 'like', count: activity.likes_24h || 0, label: 'Likes' },
        { type: 'follow', count: activity.follows_24h || 0, label: 'Follows' },
        { type: 'comment', count: activity.comments_24h || 0, label: 'Comments' },
        { type: 'reaction', count: activity.reactions_24h || 0, label: 'Reactions' },
      ],
      
      avgRating: vibe.avg_rating || 0,
      topFlavor,
      mostActiveHour: hourData.hour ?? 12,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Pulse error:", error);
    return Response.json({ error: "Failed to load pulse" }, { status: 500 });
  }
}
