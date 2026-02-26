import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface Champion {
  username: string;
  value: number;
  detail?: string;
}

interface Category {
  id: string;
  title: string;
  emoji: string;
  description: string;
  champion: Champion | null;
  runners: Champion[];
}

interface WeeklyChampionsResponse {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  categories: Category[];
  yourRankings: { category: string; rank: number; value: number }[];
  platformStats: {
    totalCheckins: number;
    activeUsers: number;
    totalEngagement: number;
  };
}

function getWeekBounds(): { start: number; end: number; weekNum: number } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + mondayOffset);
  monday.setUTCHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  
  // Week number calculation
  const startOfYear = new Date(now.getUTCFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getUTCDay() + 1) / 7);
  
  return {
    start: Math.floor(monday.getTime() / 1000),
    end: Math.floor(sunday.getTime() / 1000),
    weekNum,
  };
}

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  
  const { env } = getRequestContext();
  const db = env.DB;
  
  let userId: string | null = null;
  if (session) {
    const user = await db
      .prepare("SELECT id FROM users WHERE id = ?")
      .bind(session)
      .first<{ id: string }>();
    userId = user?.id || null;
  }

  const { start, end, weekNum } = getWeekBounds();
  const weekStart = new Date(start * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekEnd = new Date(end * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Most Check-ins Champion
  const checkinsLeaders = await db.prepare(`
    SELECT u.username, COUNT(*) as count
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.created_at >= ? AND c.created_at <= ?
    GROUP BY c.user_id
    ORDER BY count DESC
    LIMIT 5
  `).bind(start, end).all<{ username: string; count: number }>();

  // Most Likes Given Champion (social butterfly)
  const likesGivenLeaders = await db.prepare(`
    SELECT u.username, COUNT(*) as count
    FROM likes l
    JOIN users u ON l.user_id = u.id
    WHERE l.created_at >= ? AND l.created_at <= ?
    GROUP BY l.user_id
    ORDER BY count DESC
    LIMIT 5
  `).bind(start, end).all<{ username: string; count: number }>();

  // Most Engagement Received (star of the week)
  const engagementLeaders = await db.prepare(`
    SELECT u.username, 
      (SELECT COUNT(*) FROM likes l JOIN checkins c ON l.checkin_id = c.id WHERE c.user_id = u.id AND l.created_at >= ? AND l.created_at <= ?) +
      (SELECT COUNT(*) FROM comments cm JOIN checkins c ON cm.checkin_id = c.id WHERE c.user_id = u.id AND cm.created_at >= ? AND cm.created_at <= ? AND cm.user_id != u.id) +
      (SELECT COUNT(*) FROM reactions r JOIN checkins c ON r.checkin_id = c.id WHERE c.user_id = u.id AND r.created_at >= ? AND r.created_at <= ?) as total
    FROM users u
    HAVING total > 0
    ORDER BY total DESC
    LIMIT 5
  `).bind(start, end, start, end, start, end).all<{ username: string; total: number }>();

  // Most Brands Explored (explorer)
  const explorerLeaders = await db.prepare(`
    SELECT u.username, COUNT(DISTINCT c.brand) as count
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.created_at >= ? AND c.created_at <= ?
    GROUP BY c.user_id
    ORDER BY count DESC
    LIMIT 5
  `).bind(start, end).all<{ username: string; count: number }>();

  // Highest Avg Rating (connoisseur) - min 3 check-ins
  const connoisseurLeaders = await db.prepare(`
    SELECT u.username, ROUND(AVG(c.rating), 2) as avg_rating, COUNT(*) as count
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.created_at >= ? AND c.created_at <= ? AND c.rating IS NOT NULL
    GROUP BY c.user_id
    HAVING count >= 3
    ORDER BY avg_rating DESC
    LIMIT 5
  `).bind(start, end).all<{ username: string; avg_rating: number; count: number }>();

  // Most Photos (photographer)
  const photoLeaders = await db.prepare(`
    SELECT u.username, COUNT(*) as count
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.created_at >= ? AND c.created_at <= ? AND c.image_url IS NOT NULL
    GROUP BY c.user_id
    ORDER BY count DESC
    LIMIT 5
  `).bind(start, end).all<{ username: string; count: number }>();

  // Build categories
  const categories: Category[] = [
    {
      id: "smoker",
      title: "Top Smoker",
      emoji: "🔥",
      description: "Most check-ins this week",
      champion: checkinsLeaders.results?.[0] 
        ? { username: checkinsLeaders.results[0].username, value: checkinsLeaders.results[0].count, detail: `${checkinsLeaders.results[0].count} check-ins` }
        : null,
      runners: (checkinsLeaders.results?.slice(1) || []).map(r => ({ username: r.username, value: r.count })),
    },
    {
      id: "social",
      title: "Social Butterfly",
      emoji: "🦋",
      description: "Most likes given",
      champion: likesGivenLeaders.results?.[0]
        ? { username: likesGivenLeaders.results[0].username, value: likesGivenLeaders.results[0].count, detail: `${likesGivenLeaders.results[0].count} likes` }
        : null,
      runners: (likesGivenLeaders.results?.slice(1) || []).map(r => ({ username: r.username, value: r.count })),
    },
    {
      id: "star",
      title: "Star of the Week",
      emoji: "⭐",
      description: "Most engagement received",
      champion: engagementLeaders.results?.[0]
        ? { username: engagementLeaders.results[0].username, value: engagementLeaders.results[0].total, detail: `${engagementLeaders.results[0].total} interactions` }
        : null,
      runners: (engagementLeaders.results?.slice(1) || []).map(r => ({ username: r.username, value: r.total })),
    },
    {
      id: "explorer",
      title: "Explorer",
      emoji: "🧭",
      description: "Most brands tried",
      champion: explorerLeaders.results?.[0]
        ? { username: explorerLeaders.results[0].username, value: explorerLeaders.results[0].count, detail: `${explorerLeaders.results[0].count} brands` }
        : null,
      runners: (explorerLeaders.results?.slice(1) || []).map(r => ({ username: r.username, value: r.count })),
    },
    {
      id: "connoisseur",
      title: "Connoisseur",
      emoji: "🎩",
      description: "Highest avg rating (min 3)",
      champion: connoisseurLeaders.results?.[0]
        ? { username: connoisseurLeaders.results[0].username, value: connoisseurLeaders.results[0].avg_rating, detail: `${connoisseurLeaders.results[0].avg_rating}★ avg` }
        : null,
      runners: (connoisseurLeaders.results?.slice(1) || []).map(r => ({ username: r.username, value: r.avg_rating })),
    },
    {
      id: "photographer",
      title: "Photographer",
      emoji: "📸",
      description: "Most photos shared",
      champion: photoLeaders.results?.[0]
        ? { username: photoLeaders.results[0].username, value: photoLeaders.results[0].count, detail: `${photoLeaders.results[0].count} photos` }
        : null,
      runners: (photoLeaders.results?.slice(1) || []).map(r => ({ username: r.username, value: r.count })),
    },
  ];

  // User's rankings
  const yourRankings: { category: string; rank: number; value: number }[] = [];
  if (userId) {
    // Check each category for user's rank
    for (const cat of categories) {
      const allInCategory = [cat.champion, ...cat.runners].filter(Boolean) as Champion[];
      const userRank = allInCategory.findIndex(c => {
        // Need to check by querying...
        return false; // Simplified - would need username lookup
      });
    }
  }

  // Platform stats for the week
  const weekStats = await db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM checkins WHERE created_at >= ? AND created_at <= ?) as checkins,
      (SELECT COUNT(DISTINCT user_id) FROM checkins WHERE created_at >= ? AND created_at <= ?) as active_users,
      (SELECT COUNT(*) FROM likes WHERE created_at >= ? AND created_at <= ?) +
      (SELECT COUNT(*) FROM comments WHERE created_at >= ? AND created_at <= ?) +
      (SELECT COUNT(*) FROM reactions WHERE created_at >= ? AND created_at <= ?) as engagement
  `).bind(start, end, start, end, start, end, start, end, start, end).first<{
    checkins: number;
    active_users: number;
    engagement: number;
  }>();

  const response: WeeklyChampionsResponse = {
    weekStart,
    weekEnd,
    weekNumber: weekNum,
    categories,
    yourRankings,
    platformStats: {
      totalCheckins: weekStats?.checkins || 0,
      activeUsers: weekStats?.active_users || 0,
      totalEngagement: weekStats?.engagement || 0,
    },
  };

  return Response.json(response);
}
