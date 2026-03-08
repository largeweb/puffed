import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

interface CouncilPosition {
  id: string;
  username: string;
  avatar_url: string | null;
  title: string;
  description: string;
  emoji: string;
  stat: string;
  statValue: number | string;
  color: string;
}

interface UserStat {
  id: string;
  username: string;
  avatar_url: string | null;
  value: number;
}

interface SessionRow {
  user_id: string;
}

export const runtime = "edge";

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    // Allow unauthenticated access - council is public, yourPosition requires auth
    let userId: string | null = null;
    
    if (sessionId) {
      const now = Math.floor(Date.now() / 1000);
      const session = await db
        .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
        .bind(sessionId, now)
        .first<SessionRow>();
      
      if (session) {
        userId = session.user_id;
      }
    }

    // Get start of this week (Monday)
    const currentDate = new Date();
    const dayOfWeek = currentDate.getUTCDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(currentDate);
    monday.setUTCDate(currentDate.getUTCDate() - diff);
    monday.setUTCHours(0, 0, 0, 0);
    const weekStart = Math.floor(monday.getTime() / 1000);

    const council: CouncilPosition[] = [];
    const usedUserIds = new Set<string>();

    // 1. President - Most check-ins this week
    const presidentResult = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, COUNT(*) as checkin_count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      GROUP BY u.id
      ORDER BY checkin_count DESC
      LIMIT 1
    `).bind(weekStart).first<UserStat & { checkin_count: number }>();

    if (presidentResult) {
      council.push({
        id: presidentResult.id,
        username: presidentResult.username,
        avatar_url: presidentResult.avatar_url,
        title: "President",
        description: "Supreme Leader of the Smoke Nation",
        emoji: "🎖️",
        stat: "Check-ins this week",
        statValue: presidentResult.checkin_count,
        color: "from-amber-500 to-yellow-600",
      });
      usedUserIds.add(presidentResult.id);
    }

    // 2. Vice President - Second most active
    const vpResult = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, COUNT(*) as checkin_count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND u.id NOT IN (${[...usedUserIds].map(() => '?').join(',') || "''"})
      GROUP BY u.id
      ORDER BY checkin_count DESC
      LIMIT 1
    `).bind(weekStart, ...[...usedUserIds]).first<UserStat & { checkin_count: number }>();

    if (vpResult) {
      council.push({
        id: vpResult.id,
        username: vpResult.username,
        avatar_url: vpResult.avatar_url,
        title: "Vice President",
        description: "Right Hand of Smoky Affairs",
        emoji: "🥈",
        stat: "Check-ins this week",
        statValue: vpResult.checkin_count,
        color: "from-purple-500 to-indigo-600",
      });
      usedUserIds.add(vpResult.id);
    }

    // 3. Secretary of Flavor - Most unique flavors
    const flavorResult = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, COUNT(DISTINCT cf.flavor_id) as flavor_count
      FROM checkin_flavors cf
      JOIN checkins c ON cf.checkin_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? AND u.id NOT IN (${[...usedUserIds].map(() => '?').join(',') || "''"})
      GROUP BY u.id
      ORDER BY flavor_count DESC
      LIMIT 1
    `).bind(weekStart, ...[...usedUserIds]).first<UserStat & { flavor_count: number }>();

    if (flavorResult && flavorResult.flavor_count > 0) {
      council.push({
        id: flavorResult.id,
        username: flavorResult.username,
        avatar_url: flavorResult.avatar_url,
        title: "Secretary of Flavor",
        description: "Guardian of Taste Profiles",
        emoji: "🎨",
        stat: "Unique flavors logged",
        statValue: flavorResult.flavor_count,
        color: "from-pink-500 to-rose-600",
      });
      usedUserIds.add(flavorResult.id);
    }

    // 4. Night Chancellor - Most late night smokes (12-4 AM)
    const nightResult = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, COUNT(*) as night_count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? 
        AND u.id NOT IN (${[...usedUserIds].map(() => '?').join(',') || "''"})
        AND (c.created_at % 86400) / 3600 BETWEEN 0 AND 4
      GROUP BY u.id
      ORDER BY night_count DESC
      LIMIT 1
    `).bind(weekStart, ...[...usedUserIds]).first<UserStat & { night_count: number }>();

    if (nightResult && nightResult.night_count > 0) {
      council.push({
        id: nightResult.id,
        username: nightResult.username,
        avatar_url: nightResult.avatar_url,
        title: "Night Chancellor",
        description: "Ruler of the Midnight Hour",
        emoji: "🌙",
        stat: "Late night smokes",
        statValue: nightResult.night_count,
        color: "from-indigo-600 to-purple-800",
      });
      usedUserIds.add(nightResult.id);
    }

    // 5. Dawn Commander - Most early morning smokes (4-7 AM)
    const dawnResult = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, COUNT(*) as dawn_count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? 
        AND u.id NOT IN (${[...usedUserIds].map(() => '?').join(',') || "''"})
        AND (c.created_at % 86400) / 3600 BETWEEN 4 AND 7
      GROUP BY u.id
      ORDER BY dawn_count DESC
      LIMIT 1
    `).bind(weekStart, ...[...usedUserIds]).first<UserStat & { dawn_count: number }>();

    if (dawnResult && dawnResult.dawn_count > 0) {
      council.push({
        id: dawnResult.id,
        username: dawnResult.username,
        avatar_url: dawnResult.avatar_url,
        title: "Dawn Commander",
        description: "First Light Enthusiast",
        emoji: "🌅",
        stat: "Early morning smokes",
        statValue: dawnResult.dawn_count,
        color: "from-orange-400 to-amber-500",
      });
      usedUserIds.add(dawnResult.id);
    }

    // 6. Minister of Quality - Highest average rating (min 2 check-ins)
    const qualityResult = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, AVG(c.rating) as avg_rating, COUNT(*) as cnt
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? 
        AND c.rating IS NOT NULL
        AND u.id NOT IN (${[...usedUserIds].map(() => '?').join(',') || "''"})
      GROUP BY u.id
      HAVING cnt >= 2
      ORDER BY avg_rating DESC
      LIMIT 1
    `).bind(weekStart, ...[...usedUserIds]).first<UserStat & { avg_rating: number }>();

    if (qualityResult) {
      council.push({
        id: qualityResult.id,
        username: qualityResult.username,
        avatar_url: qualityResult.avatar_url,
        title: "Minister of Quality",
        description: "Keeper of the Five Stars",
        emoji: "⭐",
        stat: "Average rating",
        statValue: qualityResult.avg_rating.toFixed(1) + "/5",
        color: "from-emerald-500 to-green-600",
      });
      usedUserIds.add(qualityResult.id);
    }

    // 7. Social Ambassador - Most likes & comments given
    const socialResult = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, 
        (SELECT COUNT(*) FROM likes WHERE user_id = u.id AND created_at >= ?) +
        (SELECT COUNT(*) FROM comments WHERE user_id = u.id AND created_at >= ?) as engagement
      FROM users u
      WHERE u.id NOT IN (${[...usedUserIds].map(() => '?').join(',') || "''"})
      ORDER BY engagement DESC
      LIMIT 1
    `).bind(weekStart, weekStart, ...[...usedUserIds]).first<UserStat & { engagement: number }>();

    if (socialResult && socialResult.engagement > 0) {
      council.push({
        id: socialResult.id,
        username: socialResult.username,
        avatar_url: socialResult.avatar_url,
        title: "Social Ambassador",
        description: "Champion of Community Spirit",
        emoji: "💬",
        stat: "Engagements given",
        statValue: socialResult.engagement,
        color: "from-cyan-500 to-blue-500",
      });
      usedUserIds.add(socialResult.id);
    }

    // 8. Chronicler General - Most photos shared
    const photoResult = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, COUNT(*) as photo_count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? 
        AND c.image_url IS NOT NULL
        AND u.id NOT IN (${[...usedUserIds].map(() => '?').join(',') || "''"})
      GROUP BY u.id
      ORDER BY photo_count DESC
      LIMIT 1
    `).bind(weekStart, ...[...usedUserIds]).first<UserStat & { photo_count: number }>();

    if (photoResult && photoResult.photo_count > 0) {
      council.push({
        id: photoResult.id,
        username: photoResult.username,
        avatar_url: photoResult.avatar_url,
        title: "Chronicler General",
        description: "Master of Visual Records",
        emoji: "📸",
        stat: "Photos shared",
        statValue: photoResult.photo_count,
        color: "from-slate-500 to-gray-600",
      });
      usedUserIds.add(photoResult.id);
    }

    // 9. Weekend Warrior - Most weekend check-ins (Sat/Sun)
    const weekendResult = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, COUNT(*) as weekend_count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? 
        AND u.id NOT IN (${[...usedUserIds].map(() => '?').join(',') || "''"})
        AND (((c.created_at / 86400) + 4) % 7) IN (0, 6)
      GROUP BY u.id
      ORDER BY weekend_count DESC
      LIMIT 1
    `).bind(weekStart, ...[...usedUserIds]).first<UserStat & { weekend_count: number }>();

    if (weekendResult && weekendResult.weekend_count > 0) {
      council.push({
        id: weekendResult.id,
        username: weekendResult.username,
        avatar_url: weekendResult.avatar_url,
        title: "Weekend Warrior",
        description: "Lord of Leisure Time",
        emoji: "🎉",
        stat: "Weekend smokes",
        statValue: weekendResult.weekend_count,
        color: "from-fuchsia-500 to-pink-600",
      });
      usedUserIds.add(weekendResult.id);
    }

    // 10. Brand Explorer - Most unique brands tried
    const explorerResult = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, COUNT(DISTINCT LOWER(c.brand)) as brand_count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ? 
        AND u.id NOT IN (${[...usedUserIds].map(() => '?').join(',') || "''"})
      GROUP BY u.id
      ORDER BY brand_count DESC
      LIMIT 1
    `).bind(weekStart, ...[...usedUserIds]).first<UserStat & { brand_count: number }>();

    if (explorerResult && explorerResult.brand_count > 1) {
      council.push({
        id: explorerResult.id,
        username: explorerResult.username,
        avatar_url: explorerResult.avatar_url,
        title: "Brand Explorer",
        description: "Seeker of New Horizons",
        emoji: "🧭",
        stat: "Unique brands tried",
        statValue: explorerResult.brand_count,
        color: "from-teal-500 to-cyan-600",
      });
    }

    // Find current user's position (only if logged in)
    let yourPosition = null;
    
    if (userId) {
      const userInCouncil = council.find(m => m.id === userId);
      if (userInCouncil) {
        yourPosition = {
          title: userInCouncil.title,
          description: userInCouncil.description,
          emoji: userInCouncil.emoji,
          stat: userInCouncil.stat,
          statValue: userInCouncil.statValue,
          color: userInCouncil.color,
        };
      } else {
        // Give them a fun fallback position based on their activity
        const userActivity = await db.prepare(`
          SELECT COUNT(*) as cnt FROM checkins WHERE user_id = ? AND created_at >= ?
        `).bind(userId, weekStart).first<{ cnt: number }>();

        if (userActivity && userActivity.cnt > 0) {
          yourPosition = {
            title: "Rising Delegate",
            description: "Future Council Member",
            emoji: "📜",
            stat: "Check-ins this week",
            statValue: userActivity.cnt,
            color: "from-gray-500 to-gray-600",
          };
        } else {
          yourPosition = {
            title: "Citizen",
            description: "Log smokes to earn your seat",
            emoji: "🗳️",
            stat: "Check-ins this week",
            statValue: 0,
            color: "from-gray-600 to-gray-700",
          };
        }
      }
    }

    // Get total users
    const totalResult = await db.prepare(
      "SELECT COUNT(*) as total FROM users"
    ).first<{ total: number }>();

    return Response.json({
      council,
      yourPosition,
      totalVoters: totalResult?.total || 0,
      lastUpdated: "This week",
    });
  } catch (error) {
    console.error("Smoke council error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
