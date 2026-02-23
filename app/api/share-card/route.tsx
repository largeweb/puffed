import { ImageResponse } from "@vercel/og";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// OG Image dimensions
const WIDTH = 1200;
const HEIGHT = 630;

interface UserStats {
  username: string;
  avatar_url: string | null;
  bio: string | null;
  weekSmokes: number;
  totalSmokes: number;
  favoriteBrand: string | null;
  avgRating: number;
  streak: number;
  badges: number;
  followers: number;
  following: number;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("u");

    if (!username) {
      return new Response("Missing username parameter", { status: 400 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user
    const user = await db
      .prepare("SELECT id, username, avatar_url, bio FROM users WHERE username = ?")
      .bind(username)
      .first<{ id: string; username: string; avatar_url: string | null; bio: string | null }>();

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    // Get stats
    const weekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;

    const [weekSmokes, totalSmokes, avgRating, favoriteBrand, streak, badges, social] = await Promise.all([
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND created_at > ?")
        .bind(user.id, weekAgo)
        .first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ?")
        .bind(user.id)
        .first<{ count: number }>(),
      db.prepare("SELECT AVG(rating) as avg FROM checkins WHERE user_id = ? AND rating IS NOT NULL")
        .bind(user.id)
        .first<{ avg: number | null }>(),
      db.prepare(`
        SELECT brand, COUNT(*) as cnt 
        FROM checkins 
        WHERE user_id = ? 
        GROUP BY brand 
        ORDER BY cnt DESC 
        LIMIT 1
      `).bind(user.id).first<{ brand: string; cnt: number }>(),
      db.prepare(`
        SELECT current_streak as streak FROM (
          SELECT user_id,
            CASE 
              WHEN MAX(date(created_at, 'unixepoch')) = date('now') OR 
                   MAX(date(created_at, 'unixepoch')) = date('now', '-1 day')
              THEN (
                SELECT COUNT(DISTINCT date(created_at, 'unixepoch'))
                FROM checkins c2
                WHERE c2.user_id = checkins.user_id
                  AND date(c2.created_at, 'unixepoch') >= date('now', '-' || (
                    SELECT COUNT(DISTINCT date(created_at, 'unixepoch'))
                    FROM checkins c3
                    WHERE c3.user_id = checkins.user_id
                  ) || ' days')
              )
              ELSE 0
            END as current_streak
          FROM checkins
          WHERE user_id = ?
          GROUP BY user_id
        )
      `).bind(user.id).first<{ streak: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM user_badges WHERE user_id = ?")
        .bind(user.id)
        .first<{ count: number }>(),
      db.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followers,
          (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following
      `).bind(user.id, user.id).first<{ followers: number; following: number }>(),
    ]);

    const stats: UserStats = {
      username: user.username,
      avatar_url: user.avatar_url,
      bio: user.bio,
      weekSmokes: weekSmokes?.count || 0,
      totalSmokes: totalSmokes?.count || 0,
      favoriteBrand: favoriteBrand?.brand || null,
      avgRating: avgRating?.avg ? Math.round(avgRating.avg * 10) / 10 : 0,
      streak: streak?.streak || 0,
      badges: badges?.count || 0,
      followers: social?.followers || 0,
      following: social?.following || 0,
    };

    // Generate the image
    return new ImageResponse(
      (
        <div
          style={{
            width: WIDTH,
            height: HEIGHT,
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 50%, #1a1a1a 100%)",
            fontFamily: "system-ui, sans-serif",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background pattern */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: "radial-gradient(circle at 25% 25%, rgba(245, 158, 11, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(245, 158, 11, 0.05) 0%, transparent 50%)",
              display: "flex",
            }}
          />

          {/* Main content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "48px",
              flex: 1,
              position: "relative",
            }}
          >
            {/* Header with avatar and username */}
            <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "40px" }}>
              {/* Avatar */}
              <div
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "60px",
                  background: stats.avatar_url 
                    ? `url(${stats.avatar_url})` 
                    : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "4px solid #f59e0b",
                  fontSize: "48px",
                  color: "white",
                }}
              >
                {!stats.avatar_url && stats.username[0].toUpperCase()}
              </div>
              
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: "48px", fontWeight: "bold", color: "white", marginBottom: "4px" }}>
                  @{stats.username}
                </div>
                <div style={{ fontSize: "24px", color: "#9ca3af", display: "flex", gap: "16px" }}>
                  <span>{stats.followers} followers</span>
                  <span>•</span>
                  <span>{stats.following} following</span>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div style={{ display: "flex", gap: "24px", marginBottom: "40px" }}>
              {/* This Week */}
              <div
                style={{
                  flex: 1,
                  background: "rgba(245, 158, 11, 0.1)",
                  borderRadius: "24px",
                  padding: "32px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  border: "2px solid rgba(245, 158, 11, 0.3)",
                }}
              >
                <div style={{ fontSize: "64px", fontWeight: "bold", color: "#f59e0b" }}>
                  {stats.weekSmokes}
                </div>
                <div style={{ fontSize: "20px", color: "#9ca3af", marginTop: "8px" }}>
                  smokes this week
                </div>
              </div>

              {/* Total */}
              <div
                style={{
                  flex: 1,
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "24px",
                  padding: "32px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  border: "2px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <div style={{ fontSize: "64px", fontWeight: "bold", color: "white" }}>
                  {stats.totalSmokes}
                </div>
                <div style={{ fontSize: "20px", color: "#9ca3af", marginTop: "8px" }}>
                  total smokes
                </div>
              </div>

              {/* Streak */}
              <div
                style={{
                  flex: 1,
                  background: "rgba(239, 68, 68, 0.1)",
                  borderRadius: "24px",
                  padding: "32px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  border: "2px solid rgba(239, 68, 68, 0.3)",
                }}
              >
                <div style={{ fontSize: "64px", fontWeight: "bold", color: "#ef4444", display: "flex", alignItems: "center", gap: "8px" }}>
                  🔥 {stats.streak}
                </div>
                <div style={{ fontSize: "20px", color: "#9ca3af", marginTop: "8px" }}>
                  day streak
                </div>
              </div>

              {/* Rating */}
              <div
                style={{
                  flex: 1,
                  background: "rgba(234, 179, 8, 0.1)",
                  borderRadius: "24px",
                  padding: "32px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  border: "2px solid rgba(234, 179, 8, 0.3)",
                }}
              >
                <div style={{ fontSize: "64px", fontWeight: "bold", color: "#eab308", display: "flex", alignItems: "center", gap: "8px" }}>
                  ⭐ {stats.avgRating}
                </div>
                <div style={{ fontSize: "20px", color: "#9ca3af", marginTop: "8px" }}>
                  avg rating
                </div>
              </div>
            </div>

            {/* Bottom row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {/* Favorite brand */}
              {stats.favoriteBrand && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: "16px", color: "#6b7280", marginBottom: "8px" }}>
                    FAVORITE BRAND
                  </div>
                  <div style={{ fontSize: "32px", fontWeight: "bold", color: "white" }}>
                    🚬 {stats.favoriteBrand}
                  </div>
                </div>
              )}

              {/* Badges */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div style={{ fontSize: "16px", color: "#6b7280", marginBottom: "8px" }}>
                  BADGES EARNED
                </div>
                <div style={{ fontSize: "32px", fontWeight: "bold", color: "#f59e0b" }}>
                  🏅 {stats.badges}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "24px 48px",
              background: "rgba(0, 0, 0, 0.3)",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ fontSize: "32px" }}>🚬</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: "#f59e0b" }}>
                Puffed
              </div>
            </div>
            <div style={{ fontSize: "20px", color: "#6b7280" }}>
              puffed.pages.dev
            </div>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
      }
    );
  } catch (error) {
    console.error("Share card error:", error);
    return new Response(`Error generating share card: ${error}`, { status: 500 });
  }
}
