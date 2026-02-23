import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export interface OnboardingTask {
  id: string;
  label: string;
  emoji: string;
  completed: boolean;
  action?: string; // URL or action to take
}

export interface OnboardingResponse {
  tasks: OnboardingTask[];
  completedCount: number;
  totalCount: number;
  allComplete: boolean;
  showOnboarding: boolean; // false if user is past onboarding phase
  error?: string;
}

export const runtime = "edge";

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return Response.json({ error: "Not authenticated" } as OnboardingResponse, { status: 401 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user from session
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string }>();

    if (!session) {
      return Response.json({ error: "Session expired" } as OnboardingResponse, { status: 401 });
    }

    const userId = session.user_id;

    // Gather all stats needed for onboarding tasks
    const [
      userResult,
      checkinsResult,
      followingResult,
      likesResult,
    ] = await Promise.all([
      db.prepare("SELECT bio, avatar_url, created_at FROM users WHERE id = ?").bind(userId).first<{ bio: string | null; avatar_url: string | null; created_at: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM checkins WHERE user_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM follows WHERE follower_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM likes WHERE user_id = ?").bind(userId).first<{ count: number }>(),
    ]);

    const checkinCount = checkinsResult?.count || 0;
    const followingCount = followingResult?.count || 0;
    const likesCount = likesResult?.count || 0;
    const hasBio = !!(userResult?.bio && userResult.bio.trim().length > 0);

    // Determine if user should still see onboarding
    // Hide onboarding if they've completed 4+ tasks OR have 10+ check-ins (established user)
    const tasks: OnboardingTask[] = [
      {
        id: "create_account",
        label: "Create your account",
        emoji: "✅",
        completed: true, // Always complete if they're logged in
      },
      {
        id: "first_smoke",
        label: "Log your first smoke",
        emoji: "🚬",
        completed: checkinCount >= 1,
        action: "log_smoke", // Special action
      },
      {
        id: "add_bio",
        label: "Add a profile bio",
        emoji: "✍️",
        completed: hasBio,
        action: "/settings",
      },
      {
        id: "follow_someone",
        label: "Follow another smoker",
        emoji: "👥",
        completed: followingCount >= 1,
        action: "/people",
      },
      {
        id: "like_checkin",
        label: "Like a check-in",
        emoji: "❤️",
        completed: likesCount >= 1,
        action: "/discover",
      },
    ];

    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;
    const allComplete = completedCount === totalCount;
    
    // Show onboarding for new users who haven't finished tasks
    // Hide for established users (10+ check-ins) or those who completed all tasks
    const showOnboarding = !allComplete && checkinCount < 10;

    return Response.json({
      tasks,
      completedCount,
      totalCount,
      allComplete,
      showOnboarding,
    } as OnboardingResponse);
  } catch (error) {
    console.error("Onboarding error:", error);
    return Response.json({ error: "Server error" } as OnboardingResponse, { status: 500 });
  }
}
