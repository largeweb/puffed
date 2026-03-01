import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface HighScore {
  category: string;
  icon: string;
  score: number;
  rank: number;
  maxRank: number;
  description: string;
}

interface ArcadeChampion {
  username: string;
  totalScore: number;
  topCategory: string;
  badges: number;
}

interface ArcadeData {
  isArcadeOpen: boolean;
  currentHour: number;
  myScores: HighScore[];
  myTotalScore: number;
  myRank: number;
  champions: ArcadeChampion[];
  todaysChallenges: Array<{
    name: string;
    icon: string;
    target: number;
    current: number;
    points: number;
  }>;
  arcadeStats: {
    totalPlayers: number;
    totalGamesPlayed: number;
    highestScore: number;
    topPlayer: string | null;
  };
  username: string | null;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;
    
    const { env } = getRequestContext();
    const db = env.DB;
    
    // Get user from session
    let userId: string | null = null;
    let username: string | null = null;
    if (sessionId) {
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ?")
        .bind(sessionId)
        .first<{ user_id: string }>();
      if (session) {
        userId = session.user_id;
        const user = await db
          .prepare("SELECT username FROM users WHERE id = ?")
          .bind(session.user_id)
          .first<{ username: string }>();
        if (user) username = user.username;
      }
    }
    
    const now = new Date();
    const hour = now.getUTCHours() - 5;
    const adjustedHour = hour < 0 ? hour + 24 : hour;
    
    // Arcade always open, but special vibes at night
    const isArcadeOpen = true;
    
    // Get all users' stats for scoring
    const allUserStats = await db
      .prepare(`
        SELECT 
          u.id,
          u.username,
          COUNT(DISTINCT c.id) as checkin_count,
          COUNT(DISTINCT c.brand) as brands_tried,
          AVG(c.rating) as avg_rating,
          COUNT(DISTINCT CASE WHEN strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) >= '22' 
                            OR strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) < '04' 
                            THEN c.id END) as night_smokes,
          COUNT(DISTINCT CASE WHEN strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) >= '05' 
                            AND strftime('%H', datetime(c.created_at, 'unixepoch', '-5 hours')) < '09' 
                            THEN c.id END) as morning_smokes,
          (SELECT COUNT(*) FROM likes WHERE user_id = u.id) as likes_given,
          (SELECT COUNT(*) FROM likes l JOIN checkins c2 ON l.checkin_id = c2.id WHERE c2.user_id = u.id) as likes_received,
          (SELECT COUNT(*) FROM comments WHERE user_id = u.id) as comments_made,
          (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
          (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
          (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) as badges
        FROM users u
        LEFT JOIN checkins c ON u.id = c.user_id
        GROUP BY u.id
      `)
      .all<{
        id: string;
        username: string;
        checkin_count: number;
        brands_tried: number;
        avg_rating: number;
        night_smokes: number;
        morning_smokes: number;
        likes_given: number;
        likes_received: number;
        comments_made: number;
        following_count: number;
        followers_count: number;
        badges: number;
      }>();
    
    const users = allUserStats.results || [];
    
    // Calculate arcade scores for each user
    const userScores = users.map(u => {
      const scores = {
        smokes: u.checkin_count * 10,
        explorer: u.brands_tried * 25,
        quality: Math.round((u.avg_rating || 0) * 20),
        nightOwl: (u.night_smokes || 0) * 15,
        earlyBird: (u.morning_smokes || 0) * 15,
        social: (u.likes_given + u.comments_made) * 5,
        popular: (u.likes_received + u.followers_count) * 8,
        collector: (u.badges || 0) * 50,
      };
      const total = Object.values(scores).reduce((a, b) => a + b, 0);
      return {
        ...u,
        scores,
        totalScore: total,
      };
    });
    
    // Sort by total score for ranking
    userScores.sort((a, b) => b.totalScore - a.totalScore);
    
    // Get current user's data
    const currentUser = userId ? userScores.find(u => u.id === userId) : null;
    const myRank = currentUser ? userScores.indexOf(currentUser) + 1 : 0;
    
    // Build high scores for current user
    const myScores: HighScore[] = currentUser ? [
      {
        category: "Smoke Master",
        icon: "🚬",
        score: currentUser.scores.smokes,
        rank: userScores.filter(u => u.scores.smokes > currentUser.scores.smokes).length + 1,
        maxRank: users.length,
        description: `${currentUser.checkin_count} total smokes logged`,
      },
      {
        category: "Brand Explorer",
        icon: "🗺️",
        score: currentUser.scores.explorer,
        rank: userScores.filter(u => u.scores.explorer > currentUser.scores.explorer).length + 1,
        maxRank: users.length,
        description: `${currentUser.brands_tried} unique brands tried`,
      },
      {
        category: "Quality Connoisseur",
        icon: "⭐",
        score: currentUser.scores.quality,
        rank: userScores.filter(u => u.scores.quality > currentUser.scores.quality).length + 1,
        maxRank: users.length,
        description: `${(currentUser.avg_rating || 0).toFixed(1)} avg rating`,
      },
      {
        category: "Night Owl",
        icon: "🦉",
        score: currentUser.scores.nightOwl,
        rank: userScores.filter(u => u.scores.nightOwl > currentUser.scores.nightOwl).length + 1,
        maxRank: users.length,
        description: `${currentUser.night_smokes || 0} late night sessions`,
      },
      {
        category: "Early Bird",
        icon: "🌅",
        score: currentUser.scores.earlyBird,
        rank: userScores.filter(u => u.scores.earlyBird > currentUser.scores.earlyBird).length + 1,
        maxRank: users.length,
        description: `${currentUser.morning_smokes || 0} morning smokes`,
      },
      {
        category: "Social Butterfly",
        icon: "💬",
        score: currentUser.scores.social,
        rank: userScores.filter(u => u.scores.social > currentUser.scores.social).length + 1,
        maxRank: users.length,
        description: `${currentUser.likes_given + currentUser.comments_made} interactions`,
      },
      {
        category: "Fan Favorite",
        icon: "❤️",
        score: currentUser.scores.popular,
        rank: userScores.filter(u => u.scores.popular > currentUser.scores.popular).length + 1,
        maxRank: users.length,
        description: `${currentUser.likes_received + currentUser.followers_count} love received`,
      },
      {
        category: "Badge Collector",
        icon: "🏆",
        score: currentUser.scores.collector,
        rank: userScores.filter(u => u.scores.collector > currentUser.scores.collector).length + 1,
        maxRank: users.length,
        description: `${currentUser.badges || 0} badges earned`,
      },
    ] : [];
    
    // Top champions
    const champions: ArcadeChampion[] = userScores.slice(0, 5).map(u => {
      const maxCategory = Object.entries(u.scores).reduce((a, b) => 
        b[1] > a[1] ? b : a
      );
      const categoryNames: Record<string, string> = {
        smokes: "Smoke Master",
        explorer: "Explorer",
        quality: "Connoisseur",
        nightOwl: "Night Owl",
        earlyBird: "Early Bird",
        social: "Social",
        popular: "Popular",
        collector: "Collector",
      };
      return {
        username: u.username,
        totalScore: u.totalScore,
        topCategory: categoryNames[maxCategory[0]] || maxCategory[0],
        badges: u.badges || 0,
      };
    });
    
    // Today's challenges (rotate daily)
    const dayOfYear = Math.floor(Date.now() / 86400000);
    const allChallenges = [
      { name: "Log 3 Smokes", icon: "🚬", target: 3, points: 100 },
      { name: "Try a New Brand", icon: "🆕", target: 1, points: 75 },
      { name: "Give 5 Likes", icon: "❤️", target: 5, points: 50 },
      { name: "Leave a Comment", icon: "💬", target: 1, points: 30 },
      { name: "Night Smoke (10 PM+)", icon: "🌙", target: 1, points: 60 },
      { name: "5-Star Rating", icon: "⭐", target: 1, points: 40 },
    ];
    
    // Pick 3 challenges for today
    const todaysChallenges = [
      allChallenges[dayOfYear % allChallenges.length],
      allChallenges[(dayOfYear + 2) % allChallenges.length],
      allChallenges[(dayOfYear + 4) % allChallenges.length],
    ].map(c => ({ ...c, current: 0 })); // Simplified - could track progress
    
    // Arcade stats
    const totalGames = userScores.reduce((sum, u) => sum + u.checkin_count + u.likes_given + u.comments_made, 0);
    const topPlayer = userScores[0];
    
    return Response.json({
      isArcadeOpen,
      currentHour: adjustedHour,
      myScores,
      myTotalScore: currentUser?.totalScore || 0,
      myRank,
      champions,
      todaysChallenges,
      arcadeStats: {
        totalPlayers: users.length,
        totalGamesPlayed: totalGames,
        highestScore: topPlayer?.totalScore || 0,
        topPlayer: topPlayer?.username || null,
      },
      username,
    } as ArcadeData);
    
  } catch (error) {
    console.error("Arcade API error:", error);
    return Response.json({ error: "Failed to load arcade" }, { status: 500 });
  }
}
