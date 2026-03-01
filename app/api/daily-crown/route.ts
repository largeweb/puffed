import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface CrownCandidate {
  userId: number;
  username: string;
  avatarUrl: string | null;
  checkins: number;
  totalRating: number;
  avgRating: number;
  likesReceived: number;
  commentsReceived: number;
  photosPosted: number;
  score: number;
}

interface PastChampion {
  date: string;
  userId: number;
  username: string;
  avatarUrl: string | null;
  score: number;
  checkins: number;
  crownType: string;
}

export async function GET(request: Request) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from cookie
    const cookieHeader = request.headers.get("cookie") || "";
    const sessionMatch = cookieHeader.match(/session=([^;]+)/);
    const sessionToken = sessionMatch ? sessionMatch[1] : null;

    let userId: number | null = null;
    if (sessionToken) {
      const sessionResult = await db.prepare(
        "SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?"
      ).bind(sessionToken, Math.floor(Date.now() / 1000)).first<{ user_id: number }>();
      if (sessionResult) {
        userId = sessionResult.user_id;
      }
    }

    // Get yesterday's date boundaries (in user's timezone context - default to ET)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayStart = Math.floor(yesterday.getTime() / 1000);
    const yesterdayEnd = yesterdayStart + 86400;

    // Today's boundaries
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const todayStart = Math.floor(today.getTime() / 1000);
    const todayEnd = todayStart + 86400;

    // Get candidates for yesterday's crown (who smoked yesterday)
    const candidatesQuery = `
      SELECT 
        u.id as user_id,
        u.username,
        u.avatar_url,
        COUNT(DISTINCT c.id) as checkins,
        COALESCE(SUM(c.rating), 0) as total_rating,
        COALESCE(AVG(c.rating), 0) as avg_rating,
        (SELECT COUNT(*) FROM likes l 
         JOIN checkins lc ON l.checkin_id = lc.id 
         WHERE lc.user_id = u.id AND l.created_at >= ? AND l.created_at < ?) as likes_received,
        (SELECT COUNT(*) FROM comments cm 
         JOIN checkins cc ON cm.checkin_id = cc.id 
         WHERE cc.user_id = u.id AND cm.created_at >= ? AND cm.created_at < ?) as comments_received,
        (SELECT COUNT(*) FROM checkins pc 
         WHERE pc.user_id = u.id AND pc.image_url IS NOT NULL 
         AND pc.created_at >= ? AND pc.created_at < ?) as photos_posted
      FROM users u
      JOIN checkins c ON c.user_id = u.id
      WHERE c.created_at >= ? AND c.created_at < ?
      GROUP BY u.id
      HAVING checkins > 0
      ORDER BY checkins DESC
    `;

    const candidates = await db.prepare(candidatesQuery)
      .bind(
        yesterdayStart, yesterdayEnd,  // for likes
        yesterdayStart, yesterdayEnd,  // for comments
        yesterdayStart, yesterdayEnd,  // for photos
        yesterdayStart, yesterdayEnd   // for main query
      )
      .all<{
        user_id: number;
        username: string;
        avatar_url: string | null;
        checkins: number;
        total_rating: number;
        avg_rating: number;
        likes_received: number;
        comments_received: number;
        photos_posted: number;
      }>();

    // Calculate scores for each candidate
    const scoredCandidates: CrownCandidate[] = (candidates.results || []).map(c => {
      // Score formula: checkins*10 + avgRating*5 + likes*3 + comments*5 + photos*2
      const score = 
        c.checkins * 10 + 
        (c.avg_rating || 0) * 5 + 
        c.likes_received * 3 + 
        c.comments_received * 5 + 
        c.photos_posted * 2;
      
      return {
        userId: c.user_id,
        username: c.username,
        avatarUrl: c.avatar_url,
        checkins: c.checkins,
        totalRating: c.total_rating,
        avgRating: c.avg_rating,
        likesReceived: c.likes_received,
        commentsReceived: c.comments_received,
        photosPosted: c.photos_posted,
        score: Math.round(score * 10) / 10
      };
    }).sort((a, b) => b.score - a.score);

    // Determine crown type based on how they won
    const getCrownType = (champion: CrownCandidate | null): string => {
      if (!champion) return "empty";
      
      // Analyze what made them win
      const { checkins, avgRating, likesReceived, commentsReceived, photosPosted } = champion;
      
      if (likesReceived >= 5) return "popular"; // 👑 Popular Crown
      if (avgRating >= 4.5 && checkins >= 2) return "connoisseur"; // 🎖️ Connoisseur Crown
      if (photosPosted >= 3) return "chronicler"; // 📸 Chronicler Crown
      if (checkins >= 4) return "dedicated"; // 🔥 Dedication Crown
      if (commentsReceived >= 3) return "social"; // 💬 Social Crown
      return "champion"; // 🏆 Champion Crown
    };

    const champion = scoredCandidates[0] || null;
    const crownType = getCrownType(champion);
    const runnerUp = scoredCandidates[1] || null;
    const honorable = scoredCandidates.slice(2, 5);

    // Get today's activity (potential for today's crown)
    const todayCandidates = await db.prepare(candidatesQuery)
      .bind(
        todayStart, todayEnd,
        todayStart, todayEnd,
        todayStart, todayEnd,
        todayStart, todayEnd
      )
      .all<{
        user_id: number;
        username: string;
        avatar_url: string | null;
        checkins: number;
        total_rating: number;
        avg_rating: number;
        likes_received: number;
        comments_received: number;
        photos_posted: number;
      }>();

    const todayLeaders = (todayCandidates.results || []).map(c => ({
      userId: c.user_id,
      username: c.username,
      avatarUrl: c.avatar_url,
      checkins: c.checkins,
      score: Math.round((c.checkins * 10 + (c.avg_rating || 0) * 5 + c.likes_received * 3 + c.comments_received * 5 + c.photos_posted * 2) * 10) / 10
    })).sort((a, b) => b.score - a.score).slice(0, 3);

    // Get past week's champions (last 7 days before yesterday)
    const weekAgo = yesterdayStart - (7 * 86400);
    const pastChampions: PastChampion[] = [];
    
    for (let i = 1; i <= 7; i++) {
      const dayStart = yesterdayStart - (i * 86400);
      const dayEnd = dayStart + 86400;
      
      const dayChampion = await db.prepare(`
        SELECT 
          u.id as user_id,
          u.username,
          u.avatar_url,
          COUNT(DISTINCT c.id) as checkins,
          COALESCE(AVG(c.rating), 0) as avg_rating,
          (SELECT COUNT(*) FROM likes l JOIN checkins lc ON l.checkin_id = lc.id 
           WHERE lc.user_id = u.id AND l.created_at >= ? AND l.created_at < ?) as likes_received,
          (SELECT COUNT(*) FROM comments cm JOIN checkins cc ON cm.checkin_id = cc.id 
           WHERE cc.user_id = u.id AND cm.created_at >= ? AND cm.created_at < ?) as comments_received,
          (SELECT COUNT(*) FROM checkins pc WHERE pc.user_id = u.id AND pc.image_url IS NOT NULL 
           AND pc.created_at >= ? AND pc.created_at < ?) as photos_posted
        FROM users u
        JOIN checkins c ON c.user_id = u.id
        WHERE c.created_at >= ? AND c.created_at < ?
        GROUP BY u.id
        HAVING checkins > 0
        ORDER BY (checkins * 10 + avg_rating * 5 + likes_received * 3 + comments_received * 5 + photos_posted * 2) DESC
        LIMIT 1
      `).bind(dayStart, dayEnd, dayStart, dayEnd, dayStart, dayEnd, dayStart, dayEnd)
        .first<{
          user_id: number;
          username: string;
          avatar_url: string | null;
          checkins: number;
          avg_rating: number;
          likes_received: number;
          comments_received: number;
          photos_posted: number;
        }>();

      if (dayChampion) {
        const score = dayChampion.checkins * 10 + dayChampion.avg_rating * 5 + 
                      dayChampion.likes_received * 3 + dayChampion.comments_received * 5 + 
                      dayChampion.photos_posted * 2;
        
        const date = new Date(dayStart * 1000);
        pastChampions.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          userId: dayChampion.user_id,
          username: dayChampion.username,
          avatarUrl: dayChampion.avatar_url,
          score: Math.round(score * 10) / 10,
          checkins: dayChampion.checkins,
          crownType: dayChampion.likes_received >= 5 ? "popular" : 
                     dayChampion.avg_rating >= 4.5 ? "connoisseur" : 
                     dayChampion.checkins >= 4 ? "dedicated" : "champion"
        });
      }
    }

    // Check if current user has ever held the crown
    const userCrownCount = userId ? pastChampions.filter(p => p.userId === userId).length + 
                           (champion?.userId === userId ? 1 : 0) : 0;
    const isCurrentChampion = champion?.userId === userId;

    // Crown stats
    const crownStats = {
      totalCrownings: pastChampions.length + (champion ? 1 : 0),
      mostCrowned: getMostCrowned(pastChampions, champion),
      avgWinningScore: getAvgWinningScore(pastChampions, champion)
    };

    return Response.json({
      champion,
      crownType,
      runnerUp,
      honorable,
      todayLeaders,
      pastChampions,
      userCrownCount,
      isCurrentChampion,
      crownStats,
      yesterdayDate: yesterday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    });

  } catch (error) {
    console.error("Daily crown error:", error);
    return Response.json({ error: "Failed to load crown data" }, { status: 500 });
  }
}

function getMostCrowned(past: PastChampion[], current: CrownCandidate | null): { username: string; count: number } | null {
  const counts: Record<string, { username: string; count: number }> = {};
  
  past.forEach(p => {
    if (!counts[p.username]) counts[p.username] = { username: p.username, count: 0 };
    counts[p.username].count++;
  });
  
  if (current) {
    if (!counts[current.username]) counts[current.username] = { username: current.username, count: 0 };
    counts[current.username].count++;
  }
  
  const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
  return sorted[0] || null;
}

function getAvgWinningScore(past: PastChampion[], current: CrownCandidate | null): number {
  const scores = [...past.map(p => p.score)];
  if (current) scores.push(current.score);
  if (scores.length === 0) return 0;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}
