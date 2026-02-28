import { NextRequest, NextResponse } from "next/server";
import { getD1 } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

// Pledge types with emojis and descriptions
const PLEDGE_TYPES = [
  { id: "new_brand", emoji: "🆕", label: "Try a new brand", desc: "Log a brand you've never tried before" },
  { id: "five_star", emoji: "⭐", label: "Rate a 5-star", desc: "Find a smoke worthy of perfection" },
  { id: "photo", emoji: "📸", label: "Take a photo", desc: "Capture the moment" },
  { id: "three_smokes", emoji: "🔥", label: "Log 3 smokes", desc: "Stay active this weekend" },
  { id: "five_smokes", emoji: "💨", label: "Log 5 smokes", desc: "Weekend warrior mode" },
  { id: "morning_smoke", emoji: "🌅", label: "Morning smoke", desc: "Log before 10 AM" },
  { id: "night_smoke", emoji: "🌙", label: "Night smoke", desc: "Log after 10 PM" },
  { id: "new_flavor", emoji: "🎨", label: "Try new flavor", desc: "Explore a flavor you haven't tried" },
  { id: "comment", emoji: "💬", label: "Leave a comment", desc: "Engage with the community" },
  { id: "follow", emoji: "👥", label: "Follow someone", desc: "Connect with another smoker" },
];

// Get current weekend date range (Saturday 00:00 to Sunday 23:59)
function getWeekendRange(): { start: number; end: number; isoStart: string; isoEnd: string } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  
  let saturday: Date;
  if (day === 6) {
    // It's Saturday
    saturday = new Date(now);
  } else if (day === 0) {
    // It's Sunday, go back to Saturday
    saturday = new Date(now);
    saturday.setDate(saturday.getDate() - 1);
  } else {
    // Weekday - get next Saturday
    saturday = new Date(now);
    saturday.setDate(saturday.getDate() + (6 - day));
  }
  
  saturday.setHours(0, 0, 0, 0);
  const sunday = new Date(saturday);
  sunday.setDate(sunday.getDate() + 1);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    start: Math.floor(saturday.getTime() / 1000),
    end: Math.floor(sunday.getTime() / 1000),
    isoStart: saturday.toISOString().split("T")[0],
    isoEnd: sunday.toISOString().split("T")[0],
  };
}

// Check if a pledge is completed
async function checkPledgeCompletion(
  db: D1Database,
  userId: number,
  pledgeType: string,
  weekendStart: number,
  weekendEnd: number
): Promise<boolean> {
  switch (pledgeType) {
    case "new_brand": {
      // Check if user logged a brand this weekend they haven't logged before
      const result = await db.prepare(`
        SELECT c.brand FROM checkins c
        WHERE c.user_id = ? AND c.created_at >= ? AND c.created_at <= ?
        AND c.brand NOT IN (
          SELECT DISTINCT brand FROM checkins WHERE user_id = ? AND created_at < ?
        )
        LIMIT 1
      `).bind(userId, weekendStart, weekendEnd, userId, weekendStart).first();
      return !!result;
    }
    case "five_star": {
      const result = await db.prepare(`
        SELECT id FROM checkins 
        WHERE user_id = ? AND created_at >= ? AND created_at <= ? AND rating = 5
        LIMIT 1
      `).bind(userId, weekendStart, weekendEnd).first();
      return !!result;
    }
    case "photo": {
      const result = await db.prepare(`
        SELECT id FROM checkins 
        WHERE user_id = ? AND created_at >= ? AND created_at <= ? AND photo_url IS NOT NULL
        LIMIT 1
      `).bind(userId, weekendStart, weekendEnd).first();
      return !!result;
    }
    case "three_smokes": {
      const result = await db.prepare(`
        SELECT COUNT(*) as count FROM checkins 
        WHERE user_id = ? AND created_at >= ? AND created_at <= ?
      `).bind(userId, weekendStart, weekendEnd).first<{ count: number }>();
      return (result?.count || 0) >= 3;
    }
    case "five_smokes": {
      const result = await db.prepare(`
        SELECT COUNT(*) as count FROM checkins 
        WHERE user_id = ? AND created_at >= ? AND created_at <= ?
      `).bind(userId, weekendStart, weekendEnd).first<{ count: number }>();
      return (result?.count || 0) >= 5;
    }
    case "morning_smoke": {
      // Check for check-in before 10 AM on weekend
      const result = await db.prepare(`
        SELECT id FROM checkins 
        WHERE user_id = ? AND created_at >= ? AND created_at <= ?
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) < 10
        LIMIT 1
      `).bind(userId, weekendStart, weekendEnd).first();
      return !!result;
    }
    case "night_smoke": {
      // Check for check-in after 10 PM on weekend
      const result = await db.prepare(`
        SELECT id FROM checkins 
        WHERE user_id = ? AND created_at >= ? AND created_at <= ?
        AND CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) >= 22
        LIMIT 1
      `).bind(userId, weekendStart, weekendEnd).first();
      return !!result;
    }
    case "new_flavor": {
      // Check if user logged a flavor tag this weekend they haven't used before
      const result = await db.prepare(`
        SELECT c.flavor_tags FROM checkins c
        WHERE c.user_id = ? AND c.created_at >= ? AND c.created_at <= ?
        AND c.flavor_tags IS NOT NULL AND c.flavor_tags != ''
      `).bind(userId, weekendStart, weekendEnd).all();
      
      if (!result.results?.length) return false;
      
      // Get previous flavors
      const prevResult = await db.prepare(`
        SELECT flavor_tags FROM checkins
        WHERE user_id = ? AND created_at < ? AND flavor_tags IS NOT NULL AND flavor_tags != ''
      `).bind(userId, weekendStart).all();
      
      const prevFlavors = new Set<string>();
      for (const row of prevResult.results || []) {
        const tags = (row as { flavor_tags: string }).flavor_tags?.split(",") || [];
        tags.forEach((t: string) => prevFlavors.add(t.trim()));
      }
      
      // Check if any weekend flavor is new
      for (const row of result.results) {
        const tags = (row as { flavor_tags: string }).flavor_tags?.split(",") || [];
        for (const tag of tags) {
          if (!prevFlavors.has(tag.trim())) return true;
        }
      }
      return false;
    }
    case "comment": {
      const result = await db.prepare(`
        SELECT id FROM comments 
        WHERE user_id = ? AND created_at >= ? AND created_at <= ?
        LIMIT 1
      `).bind(userId, weekendStart, weekendEnd).first();
      return !!result;
    }
    case "follow": {
      const result = await db.prepare(`
        SELECT id FROM follows 
        WHERE follower_id = ? AND created_at >= ? AND created_at <= ?
        LIMIT 1
      `).bind(userId, weekendStart, weekendEnd).first();
      return !!result;
    }
    default:
      return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = getD1();
    const auth = await verifyAuth(request);
    const weekend = getWeekendRange();
    const now = Math.floor(Date.now() / 1000);
    const isWeekend = now >= weekend.start && now <= weekend.end;

    // Get all pledges for this weekend
    const pledges = await db.prepare(`
      SELECT wp.*, u.username
      FROM weekend_pledges wp
      JOIN users u ON wp.user_id = u.id
      WHERE wp.weekend_start = ?
      ORDER BY wp.created_at DESC
    `).bind(weekend.start).all();

    // Check completion status for each pledge
    const pledgesWithStatus = await Promise.all(
      (pledges.results || []).map(async (p: Record<string, unknown>) => {
        const completed = await checkPledgeCompletion(
          db,
          p.user_id as number,
          p.pledge_type as string,
          weekend.start,
          weekend.end
        );
        const pledgeInfo = PLEDGE_TYPES.find((pt) => pt.id === p.pledge_type);
        return {
          ...p,
          completed,
          emoji: pledgeInfo?.emoji || "📝",
          label: pledgeInfo?.label || p.pledge_type,
        };
      })
    );

    // Get user's pledges if authenticated
    let myPledges: typeof pledgesWithStatus = [];
    if (auth) {
      myPledges = pledgesWithStatus.filter((p) => p.user_id === auth.userId);
    }

    // Community stats
    const totalPledges = pledgesWithStatus.length;
    const completedPledges = pledgesWithStatus.filter((p) => p.completed).length;
    const uniqueUsers = new Set(pledgesWithStatus.map((p) => p.user_id)).size;

    // Leaderboard: users with most completed pledges
    const userCompletions: Record<string, { username: string; completed: number; total: number }> = {};
    for (const p of pledgesWithStatus) {
      const username = p.username as string;
      if (!userCompletions[username]) {
        userCompletions[username] = { username, completed: 0, total: 0 };
      }
      userCompletions[username].total++;
      if (p.completed) userCompletions[username].completed++;
    }
    const leaderboard = Object.values(userCompletions)
      .sort((a, b) => b.completed - a.completed || a.total - b.total)
      .slice(0, 10);

    return NextResponse.json({
      isWeekend,
      weekendStart: weekend.isoStart,
      weekendEnd: weekend.isoEnd,
      pledgeTypes: PLEDGE_TYPES,
      pledges: pledgesWithStatus,
      myPledges,
      stats: {
        totalPledges,
        completedPledges,
        completionRate: totalPledges > 0 ? Math.round((completedPledges / totalPledges) * 100) : 0,
        uniqueUsers,
      },
      leaderboard,
    });
  } catch (error) {
    console.error("Weekend pledges error:", error);
    return NextResponse.json({ error: "Failed to fetch pledges" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getD1();
    const auth = await verifyAuth(request);
    
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pledgeType } = body;

    if (!pledgeType || !PLEDGE_TYPES.find((pt) => pt.id === pledgeType)) {
      return NextResponse.json({ error: "Invalid pledge type" }, { status: 400 });
    }

    const weekend = getWeekendRange();
    const now = Math.floor(Date.now() / 1000);

    // Check if user already has this pledge for this weekend
    const existing = await db.prepare(`
      SELECT id FROM weekend_pledges 
      WHERE user_id = ? AND weekend_start = ? AND pledge_type = ?
    `).bind(auth.userId, weekend.start, pledgeType).first();

    if (existing) {
      return NextResponse.json({ error: "You already made this pledge!" }, { status: 400 });
    }

    // Create the pledge
    await db.prepare(`
      INSERT INTO weekend_pledges (user_id, pledge_type, weekend_start, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(auth.userId, pledgeType, weekend.start, now).run();

    const pledgeInfo = PLEDGE_TYPES.find((pt) => pt.id === pledgeType);

    return NextResponse.json({
      success: true,
      message: `Pledge made: ${pledgeInfo?.emoji} ${pledgeInfo?.label}`,
    });
  } catch (error) {
    console.error("Create pledge error:", error);
    return NextResponse.json({ error: "Failed to create pledge" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = getD1();
    const auth = await verifyAuth(request);
    
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pledgeType = searchParams.get("type");

    if (!pledgeType) {
      return NextResponse.json({ error: "Missing pledge type" }, { status: 400 });
    }

    const weekend = getWeekendRange();

    await db.prepare(`
      DELETE FROM weekend_pledges 
      WHERE user_id = ? AND weekend_start = ? AND pledge_type = ?
    `).bind(auth.userId, weekend.start, pledgeType).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete pledge error:", error);
    return NextResponse.json({ error: "Failed to delete pledge" }, { status: 500 });
  }
}
