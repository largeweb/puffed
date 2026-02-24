import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface SmokeHourProfile {
  userId: string;
  hours: number[]; // Array of 24 values, each representing checkin count per hour
}

interface SmokeTwin {
  id: string;
  username: string;
  bio: string | null;
  checkin_count: number;
  similarity_score: number; // 0-100 percentage match
  peak_hour: number;
  peak_hour_label: string;
  common_hours: string[];
  is_following: boolean;
}

function getHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

function getTimeCategory(hour: number): string {
  if (hour >= 5 && hour < 10) return "☕ Early Bird";
  if (hour >= 10 && hour < 14) return "☀️ Midday";
  if (hour >= 14 && hour < 18) return "🌤️ Afternoon";
  if (hour >= 18 && hour < 22) return "🌅 Evening";
  return "🌙 Night Owl";
}

function calculateSimilarity(profile1: number[], profile2: number[]): number {
  // Normalize profiles
  const sum1 = profile1.reduce((a, b) => a + b, 0);
  const sum2 = profile2.reduce((a, b) => a + b, 0);
  
  if (sum1 === 0 || sum2 === 0) return 0;
  
  const norm1 = profile1.map(v => v / sum1);
  const norm2 = profile2.map(v => v / sum2);
  
  // Cosine similarity
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  for (let i = 0; i < 24; i++) {
    dotProduct += norm1[i] * norm2[i];
    mag1 += norm1[i] * norm1[i];
    mag2 += norm2[i] * norm2[i];
  }
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  const similarity = dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
  return Math.round(similarity * 100);
}

function getCommonHours(profile1: number[], profile2: number[]): string[] {
  // Find hours where both users have activity
  const common: string[] = [];
  for (let i = 0; i < 24; i++) {
    if (profile1[i] > 0 && profile2[i] > 0) {
      common.push(getHourLabel(i));
    }
  }
  return common.slice(0, 3); // Top 3
}

function getPeakHour(profile: number[]): number {
  let maxHour = 0;
  let maxCount = 0;
  for (let i = 0; i < 24; i++) {
    if (profile[i] > maxCount) {
      maxCount = profile[i];
      maxHour = i;
    }
  }
  return maxHour;
}

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    const now = Math.floor(Date.now() / 1000);
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
      .bind(sessionId, now)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const currentUserId = session.user_id;

    // Get current user's smoking hour profile
    const myCheckins = await db
      .prepare(`
        SELECT created_at
        FROM checkins 
        WHERE user_id = ?
      `)
      .bind(currentUserId)
      .all<{ created_at: number }>();

    const myProfile = new Array(24).fill(0);
    for (const checkin of myCheckins.results || []) {
      const hour = new Date(checkin.created_at * 1000).getHours();
      myProfile[hour]++;
    }

    // Get all other users with their hour profiles
    const allUsers = await db
      .prepare(`
        SELECT 
          u.id,
          u.username,
          u.bio,
          (SELECT COUNT(*) FROM checkins WHERE user_id = u.id) as checkin_count
        FROM users u
        WHERE u.id != ?
        HAVING checkin_count >= 1
        ORDER BY checkin_count DESC
      `)
      .bind(currentUserId)
      .all<{
        id: string;
        username: string;
        bio: string | null;
        checkin_count: number;
      }>();

    if (!allUsers.results || allUsers.results.length === 0) {
      return NextResponse.json({ 
        twins: [], 
        myProfile: {
          peakHour: getPeakHour(myProfile),
          peakHourLabel: getHourLabel(getPeakHour(myProfile)),
          category: getTimeCategory(getPeakHour(myProfile)),
          totalSmokes: myProfile.reduce((a, b) => a + b, 0)
        }
      });
    }

    // Get who current user is following
    const following = await db
      .prepare("SELECT following_id FROM follows WHERE follower_id = ?")
      .bind(currentUserId)
      .all<{ following_id: string }>();
    const followingSet = new Set(following.results?.map(f => f.following_id) || []);

    // Get hour profiles for all users
    const userIds = allUsers.results.map(u => u.id);
    const placeholders = userIds.map(() => '?').join(',');
    
    const allCheckins = await db
      .prepare(`
        SELECT user_id, created_at
        FROM checkins 
        WHERE user_id IN (${placeholders})
      `)
      .bind(...userIds)
      .all<{ user_id: string; created_at: number }>();

    // Build profiles for each user
    const userProfiles = new Map<string, number[]>();
    for (const userId of userIds) {
      userProfiles.set(userId, new Array(24).fill(0));
    }
    
    for (const checkin of allCheckins.results || []) {
      const profile = userProfiles.get(checkin.user_id);
      if (profile) {
        const hour = new Date(checkin.created_at * 1000).getHours();
        profile[hour]++;
      }
    }

    // Calculate similarity scores
    const twins: SmokeTwin[] = [];
    for (const user of allUsers.results) {
      const theirProfile = userProfiles.get(user.id) || new Array(24).fill(0);
      const similarity = calculateSimilarity(myProfile, theirProfile);
      const peakHour = getPeakHour(theirProfile);
      
      if (similarity > 20) { // Only show matches with at least 20% similarity
        twins.push({
          id: user.id,
          username: user.username,
          bio: user.bio,
          checkin_count: user.checkin_count,
          similarity_score: similarity,
          peak_hour: peakHour,
          peak_hour_label: getHourLabel(peakHour),
          common_hours: getCommonHours(myProfile, theirProfile),
          is_following: followingSet.has(user.id)
        });
      }
    }

    // Sort by similarity score
    twins.sort((a, b) => b.similarity_score - a.similarity_score);

    const myPeakHour = getPeakHour(myProfile);

    return NextResponse.json({
      twins: twins.slice(0, 10), // Top 10 matches
      myProfile: {
        peakHour: myPeakHour,
        peakHourLabel: getHourLabel(myPeakHour),
        category: getTimeCategory(myPeakHour),
        totalSmokes: myProfile.reduce((a, b) => a + b, 0),
        hourlyDistribution: myProfile
      }
    });

  } catch (error) {
    console.error("Smoke twins error:", error);
    return NextResponse.json({ error: "Failed to find smoke twins" }, { status: 500 });
  }
}
