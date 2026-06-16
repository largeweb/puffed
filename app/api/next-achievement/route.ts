import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

type AchievementCategory = "checkins" | "brands" | "social" | "flavors";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  target: number;
  current: number;
  category: AchievementCategory;
}

interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  target: number;
  cat: AchievementCategory;
}

const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_smoke", name: "First Light", desc: "Log your first smoke", icon: "🔥", target: 1, cat: "checkins" },
  { id: "week_warrior", name: "Week Warrior", desc: "Log 7 smokes", icon: "⚔️", target: 7, cat: "checkins" },
  { id: "connoisseur", name: "Connoisseur", desc: "Log 25 smokes", icon: "🎩", target: 25, cat: "checkins" },
  { id: "aficionado", name: "Aficionado", desc: "Log 50 smokes", icon: "👑", target: 50, cat: "checkins" },
  { id: "legend", name: "Legend", desc: "Log 100 smokes", icon: "🏆", target: 100, cat: "checkins" },
  { id: "brand_explorer", name: "Brand Explorer", desc: "Try 5 different brands", icon: "🧭", target: 5, cat: "brands" },
  { id: "brand_master", name: "Brand Master", desc: "Try 15 different brands", icon: "🗺️", target: 15, cat: "brands" },
  { id: "social_butterfly", name: "Social Butterfly", desc: "Follow 10 people", icon: "🦋", target: 10, cat: "social" },
  { id: "influencer", name: "Influencer", desc: "Get 25 followers", icon: "⭐", target: 25, cat: "social" },
  { id: "flavor_hunter", name: "Flavor Hunter", desc: "Tag 10 different flavors", icon: "🎯", target: 10, cat: "flavors" },
];

interface Stats {
  checkins: number;
  brands: number;
  following: number;
  followers: number;
  flavors: number;
}

export async function GET(): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const ctx = getRequestContext();
    const db = ctx.env.DB;

    // Get user from session
    const sessionRow = await db.prepare(
      "SELECT user_id FROM sessions WHERE id = ?"
    ).bind(session).first<{ user_id: string }>();

    if (!sessionRow) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = sessionRow.user_id;

    // Get user stats
    const [checkinsRes, brandsRes, followingRes, followersRes, flavorsRes] = await Promise.all([
      db.prepare(`SELECT COUNT(*) as count FROM checkins WHERE user_id = ?`).bind(userId).first<{ count: number }>(),
      db.prepare(`SELECT COUNT(DISTINCT brand_id) as count FROM checkins WHERE user_id = ? AND brand_id IS NOT NULL`).bind(userId).first<{ count: number }>(),
      db.prepare(`SELECT COUNT(*) as count FROM follows WHERE follower_id = ?`).bind(userId).first<{ count: number }>(),
      db.prepare(`SELECT COUNT(*) as count FROM follows WHERE following_id = ?`).bind(userId).first<{ count: number }>(),
      db.prepare(`SELECT COUNT(DISTINCT flavor_tag) as count FROM checkin_flavors cf JOIN checkins c ON cf.checkin_id = c.id WHERE c.user_id = ?`).bind(userId).first<{ count: number }>(),
    ]);

    const stats: Stats = {
      checkins: checkinsRes?.count || 0,
      brands: brandsRes?.count || 0,
      following: followingRes?.count || 0,
      followers: followersRes?.count || 0,
      flavors: flavorsRes?.count || 0,
    };

    // Find next unlockable achievement
    let nextAchievement: Achievement | null = null;
    let closestProgress = 0;

    for (const ach of ACHIEVEMENTS) {
      let current = 0;
      switch (ach.cat) {
        case "checkins": current = stats.checkins; break;
        case "brands": current = stats.brands; break;
        case "social": current = ach.id === "influencer" ? stats.followers : stats.following; break;
        case "flavors": current = stats.flavors; break;
      }

      // Skip completed achievements
      if (current >= ach.target) continue;

      const progress = current / ach.target;
      if (!nextAchievement || progress > closestProgress) {
        nextAchievement = {
          id: ach.id,
          name: ach.name,
          description: ach.desc,
          icon: ach.icon,
          target: ach.target,
          current,
          category: ach.cat,
        };
        closestProgress = progress;
      }
    }

    return NextResponse.json({
      achievement: nextAchievement,
      stats,
      message: nextAchievement 
        ? `${nextAchievement.current}/${nextAchievement.target} to unlock ${nextAchievement.name}!`
        : "🏆 You've unlocked all achievements!"
    });

  } catch (error) {
    console.error("Achievement error:", error);
    return NextResponse.json({ error: "Failed to load achievements" }, { status: 500 });
  }
}
