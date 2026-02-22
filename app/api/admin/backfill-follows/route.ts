import { NextRequest } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

/**
 * Backfill follows for existing users
 * Makes all users follow the top 2 most active users (like auto-follow does for new signups)
 * Also creates bi-directional follows between active users for social proof
 */
export async function POST(request: NextRequest) {
  const { env } = getRequestContext();
  const db = env.DB;
  const now = Math.floor(Date.now() / 1000);

  // Get all users
  const allUsers = await db.prepare(`
    SELECT id, username FROM users ORDER BY created_at ASC
  `).all<{ id: number; username: string }>();

  // Get top 2 most active users (by check-in count)
  const topUsers = await db.prepare(`
    SELECT u.id, u.username, COUNT(c.id) as checkin_count
    FROM users u
    LEFT JOIN checkins c ON u.id = c.user_id
    GROUP BY u.id
    ORDER BY checkin_count DESC
    LIMIT 2
  `).all<{ id: number; username: string; checkin_count: number }>();

  const topUserIds = (topUsers.results || []).map(u => u.id);
  const users = allUsers.results || [];

  let followsCreated = 0;
  let notificationsSent = 0;
  const details: string[] = [];

  // For each user, make them follow the top 2 active users (if not already following)
  for (const user of users) {
    for (const targetId of topUserIds) {
      if (user.id === targetId) continue; // Don't follow yourself

      // Check if already following
      const existing = await db.prepare(`
        SELECT id FROM follows WHERE follower_id = ? AND following_id = ?
      `).bind(user.id, targetId).first();

      if (!existing) {
        // Create follow
        await db.prepare(`
          INSERT INTO follows (follower_id, following_id, created_at)
          VALUES (?, ?, ?)
        `).bind(user.id, targetId, now).run();

        followsCreated++;

        // Send notification to the followed user
        const followerUsername = user.username;
        const message = `@${followerUsername} started following you`;

        await db.prepare(`
          INSERT INTO notifications (user_id, type, message, related_user_id, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(targetId, 'follow', message, user.id, now).run();

        notificationsSent++;

        const targetUser = topUsers.results?.find(u => u.id === targetId);
        details.push(`${user.username} → ${targetUser?.username}`);
      }
    }
  }

  // Also make top users follow each other (bi-directional)
  if (topUserIds.length >= 2) {
    for (let i = 0; i < topUserIds.length; i++) {
      for (let j = 0; j < topUserIds.length; j++) {
        if (i === j) continue;

        const followerId = topUserIds[i];
        const followingId = topUserIds[j];

        const existing = await db.prepare(`
          SELECT id FROM follows WHERE follower_id = ? AND following_id = ?
        `).bind(followerId, followingId).first();

        if (!existing) {
          await db.prepare(`
            INSERT INTO follows (follower_id, following_id, created_at)
            VALUES (?, ?, ?)
          `).bind(followerId, followingId, now).run();

          followsCreated++;

          const followerUser = topUsers.results?.find(u => u.id === followerId);
          const followingUser = topUsers.results?.find(u => u.id === followingId);

          await db.prepare(`
            INSERT INTO notifications (user_id, type, message, related_user_id, created_at)
            VALUES (?, ?, ?, ?, ?)
          `).bind(followingId, 'follow', `@${followerUser?.username} started following you`, followerId, now).run();

          notificationsSent++;
          details.push(`${followerUser?.username} ↔ ${followingUser?.username}`);
        }
      }
    }
  }

  return Response.json({
    success: true,
    followsCreated,
    notificationsSent,
    topUsers: topUsers.results?.map(u => ({ username: u.username, checkins: u.checkin_count })),
    totalUsers: users.length,
    details,
  });
}

// GET to preview what would happen
export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = env.DB;

  // Current follow count
  const followCount = await db.prepare(`
    SELECT COUNT(*) as count FROM follows
  `).first<{ count: number }>();

  // Get all users
  const allUsers = await db.prepare(`
    SELECT id, username FROM users ORDER BY created_at ASC
  `).all<{ id: number; username: string }>();

  // Get top 2 most active users
  const topUsers = await db.prepare(`
    SELECT u.id, u.username, COUNT(c.id) as checkin_count
    FROM users u
    LEFT JOIN checkins c ON u.id = c.user_id
    GROUP BY u.id
    ORDER BY checkin_count DESC
    LIMIT 2
  `).all<{ id: number; username: string; checkin_count: number }>();

  const topUserIds = (topUsers.results || []).map(u => u.id);
  const users = allUsers.results || [];

  // Count how many follows would be created
  let potentialFollows = 0;
  for (const user of users) {
    for (const targetId of topUserIds) {
      if (user.id === targetId) continue;

      const existing = await db.prepare(`
        SELECT id FROM follows WHERE follower_id = ? AND following_id = ?
      `).bind(user.id, targetId).first();

      if (!existing) {
        potentialFollows++;
      }
    }
  }

  // Check top user bi-directional follows
  let topUserFollows = 0;
  if (topUserIds.length >= 2) {
    for (let i = 0; i < topUserIds.length; i++) {
      for (let j = 0; j < topUserIds.length; j++) {
        if (i === j) continue;

        const existing = await db.prepare(`
          SELECT id FROM follows WHERE follower_id = ? AND following_id = ?
        `).bind(topUserIds[i], topUserIds[j]).first();

        if (!existing) {
          topUserFollows++;
        }
      }
    }
  }

  return Response.json({
    currentFollows: followCount?.count || 0,
    totalUsers: users.length,
    topUsers: topUsers.results?.map(u => ({ username: u.username, checkins: u.checkin_count })),
    potentialUserFollows: potentialFollows,
    potentialTopUserFollows: topUserFollows,
    totalPotentialFollows: potentialFollows + topUserFollows,
  });
}
