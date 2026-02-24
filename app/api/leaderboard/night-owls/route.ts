import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// Night owl hours: 10 PM - 4 AM (22, 23, 0, 1, 2, 3)
const NIGHT_HOURS = [22, 23, 0, 1, 2, 3];

export interface NightOwlEntry {
  username: string;
  nightSmokes: number;
  totalSmokes: number;
  nightPercentage: number;
  latestNightHour: number; // Most common night hour
  rank: number;
}

export interface NightOwlResponse {
  leaders: NightOwlEntry[];
  platformStats: {
    totalNightSmokes: number;
    mostActiveNightHour: number;
    nightOwlCount: number; // Users with 50%+ night smokes
  };
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    // Get all users with their night smoking stats
    // Using strftime to extract hour from unix timestamp
    const query = `
      WITH user_stats AS (
        SELECT 
          u.username,
          COUNT(c.id) as total_smokes,
          SUM(CASE 
            WHEN CAST(strftime('%H', c.created_at, 'unixepoch', 'localtime') AS INTEGER) IN (22, 23, 0, 1, 2, 3) 
            THEN 1 ELSE 0 
          END) as night_smokes,
          -- Find most common night hour for this user
          (
            SELECT CAST(strftime('%H', c2.created_at, 'unixepoch', 'localtime') AS INTEGER)
            FROM checkins c2 
            WHERE c2.user_id = u.id 
              AND CAST(strftime('%H', c2.created_at, 'unixepoch', 'localtime') AS INTEGER) IN (22, 23, 0, 1, 2, 3)
            GROUP BY CAST(strftime('%H', c2.created_at, 'unixepoch', 'localtime') AS INTEGER)
            ORDER BY COUNT(*) DESC
            LIMIT 1
          ) as favorite_night_hour
        FROM users u
        LEFT JOIN checkins c ON u.id = c.user_id
        GROUP BY u.id, u.username
        HAVING night_smokes > 0
      )
      SELECT 
        username,
        night_smokes as nightSmokes,
        total_smokes as totalSmokes,
        ROUND(CAST(night_smokes AS FLOAT) / total_smokes * 100, 1) as nightPercentage,
        COALESCE(favorite_night_hour, 0) as latestNightHour
      FROM user_stats
      ORDER BY night_smokes DESC, nightPercentage DESC
      LIMIT 20
    `;

    // Platform-wide night stats
    const platformQuery = `
      SELECT 
        COUNT(*) as totalNightSmokes,
        (
          SELECT CAST(strftime('%H', c.created_at, 'unixepoch', 'localtime') AS INTEGER) as hour
          FROM checkins c
          WHERE CAST(strftime('%H', c.created_at, 'unixepoch', 'localtime') AS INTEGER) IN (22, 23, 0, 1, 2, 3)
          GROUP BY hour
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as mostActiveNightHour,
        (
          SELECT COUNT(DISTINCT user_id)
          FROM (
            SELECT 
              user_id,
              SUM(CASE WHEN CAST(strftime('%H', created_at, 'unixepoch', 'localtime') AS INTEGER) IN (22, 23, 0, 1, 2, 3) THEN 1 ELSE 0 END) as night,
              COUNT(*) as total
            FROM checkins
            GROUP BY user_id
            HAVING CAST(night AS FLOAT) / total >= 0.5
          )
        ) as nightOwlCount
      FROM checkins
      WHERE CAST(strftime('%H', created_at, 'unixepoch', 'localtime') AS INTEGER) IN (22, 23, 0, 1, 2, 3)
    `;

    const [leadersResult, platformResult] = await Promise.all([
      db.prepare(query).all(),
      db.prepare(platformQuery).first(),
    ]);

    const leaders: NightOwlEntry[] = (leadersResult.results || []).map((row: any, index: number) => ({
      username: row.username,
      nightSmokes: row.nightSmokes,
      totalSmokes: row.totalSmokes,
      nightPercentage: row.nightPercentage,
      latestNightHour: row.latestNightHour || 0,
      rank: index + 1,
    }));

    const response: NightOwlResponse = {
      leaders,
      platformStats: {
        totalNightSmokes: (platformResult as any)?.totalNightSmokes || 0,
        mostActiveNightHour: (platformResult as any)?.mostActiveNightHour || 1,
        nightOwlCount: (platformResult as any)?.nightOwlCount || 0,
      },
    };

    return Response.json(response);
  } catch (error) {
    console.error("Night owl leaderboard error:", error);
    return Response.json({ error: "Failed to load night owl leaderboard" }, { status: 500 });
  }
}
