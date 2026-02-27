import { getAuth } from "@/lib/auth";

export const runtime = "edge";

interface RisingStar {
  user_id: string;
  username: string;
  joined_days_ago: number;
  checkins: number;
  likes_received: number;
  comments_received: number;
  followers: number;
  engagement_score: number;
  latest_checkin?: {
    brand: string;
    rating: number;
    photo_url?: string;
  };
}

export async function GET(request: Request) {
  const { env, session } = await getAuth(request);
  
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = env.DB;
  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60);
  const sevenDaysAgo = now - (7 * 24 * 60 * 60);

  // Find users who signed up in last 30 days with good engagement
  const risingStars = await db.prepare(`
    WITH user_stats AS (
      SELECT 
        u.id as user_id,
        u.username,
        CAST((? - u.created_at) / 86400 AS INTEGER) as joined_days_ago,
        (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) as checkins,
        (SELECT COUNT(*) FROM likes l JOIN checkins c ON l.checkin_id = c.id WHERE c.user_id = u.id) as likes_received,
        (SELECT COUNT(*) FROM comments cm JOIN checkins c ON cm.checkin_id = c.id WHERE c.user_id = u.id AND cm.user_id != u.id) as comments_received,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers
      FROM users u
      WHERE u.created_at > ?
    )
    SELECT 
      user_id,
      username,
      joined_days_ago,
      checkins,
      likes_received,
      comments_received,
      followers,
      (checkins * 10 + likes_received * 3 + comments_received * 5 + followers * 8) as engagement_score
    FROM user_stats
    WHERE checkins >= 1
    ORDER BY engagement_score DESC
    LIMIT 10
  `).bind(now, thirtyDaysAgo).all<RisingStar>();

  // Get latest checkin for each rising star
  const stars: RisingStar[] = [];
  for (const star of risingStars.results) {
    const latestCheckin = await db.prepare(`
      SELECT brand, rating, photo_url
      FROM checkins
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(star.user_id).first<{ brand: string; rating: number; photo_url?: string }>();

    stars.push({
      ...star,
      latest_checkin: latestCheckin || undefined,
    });
  }

  // Check who the current user is following
  const following = await db.prepare(`
    SELECT following_id FROM follows WHERE follower_id = ?
  `).bind(session.userId).all<{ following_id: string }>();
  
  const followingSet = new Set(following.results.map(f => f.following_id));

  // Platform stats for context
  const platformStats = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE created_at > ?) as new_users_week,
      (SELECT COUNT(*) FROM users WHERE created_at > ?) as new_users_month,
      (SELECT COUNT(*) FROM checkins WHERE created_at > ?) as new_checkins_week
  `).bind(sevenDaysAgo, thirtyDaysAgo, sevenDaysAgo).first<{
    new_users_week: number;
    new_users_month: number;
    new_checkins_week: number;
  }>();

  return Response.json({
    risingStars: stars.map(star => ({
      ...star,
      isFollowing: followingSet.has(star.user_id),
      isMe: star.user_id === session.userId,
    })),
    stats: platformStats,
  });
}
