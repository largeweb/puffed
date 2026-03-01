import { getRequestContext } from '@cloudflare/next-on-pages';
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "edge";

interface PartyData {
  isPartyTime: boolean;
  partyTitle: string;
  partyVibe: string;
  djBooth: {
    nowPlaying: { brand: string; count: number; rating: number } | null;
    upNext: Array<{ brand: string; count: number }>;
  };
  vipList: Array<{
    username: string;
    title: string;
    checkins: number;
    vibe: string;
  }>;
  partyStats: {
    totalGuests: number;
    smokesTonight: number;
    peakHour: number;
    vibeLevel: string;
  };
  dancefloorBrands: Array<{ brand: string; count: number; emoji: string }>;
  lateNightSnacks: Array<{ emoji: string; text: string }>;
  closingTime: string;
}

export async function GET(): Promise<Response> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;
  
  if (!sessionToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { env } = getRequestContext();
  const db = env.DB;
  
  // Verify session
  const session = await db.prepare(
    "SELECT user_id FROM sessions WHERE id = ?"
  ).bind(sessionToken).first<{ user_id: string }>();
  
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
  
  const now = Math.floor(Date.now() / 1000);
  const todayStart = now - (now % 86400);
  const date = new Date();
  const hour = date.getHours();
  const day = date.getDay();
  
  // Party time: Saturday 11 PM to Sunday 3 AM
  // Saturday = 6, Sunday = 0
  const isPartyTime = (day === 6 && hour >= 23) || (day === 0 && hour < 3);
  
  // Get tonight's time range (from 6 PM onwards)
  const tonightStart = todayStart + (hour >= 18 ? 18 * 3600 : -6 * 3600);
  
  // Party vibes based on time
  const getPartyVibe = () => {
    if (hour >= 23 || hour < 1) return "Peak hours - the party is just getting started! 🔥";
    if (hour >= 1 && hour < 2) return "Late night vibes - the real ones are still here 💜";
    if (hour >= 2 && hour < 3) return "After hours - for the true night owls 🦉";
    return "Pre-party - building up the energy ⚡";
  };
  
  // Get top brands tonight as "DJ playlist"
  const topBrands = await db.prepare(`
    SELECT 
      brand,
      COUNT(*) as count,
      AVG(rating) as avg_rating
    FROM checkins
    WHERE created_at >= ?
    GROUP BY brand
    ORDER BY count DESC
    LIMIT 5
  `).bind(tonightStart).all();
  
  const brands = (topBrands.results || []) as Array<{ brand: string; count: number; avg_rating: number | null }>;
  
  const djBooth = {
    nowPlaying: brands.length > 0 ? {
      brand: brands[0].brand,
      count: brands[0].count,
      rating: Math.round((brands[0].avg_rating || 0) * 10) / 10
    } : null,
    upNext: brands.slice(1, 4).map(b => ({ brand: b.brand, count: b.count }))
  };
  
  // Get VIP list (most active tonight)
  const vipQuery = await db.prepare(`
    SELECT 
      u.username,
      COUNT(c.id) as checkins
    FROM users u
    JOIN checkins c ON c.user_id = u.id
    WHERE c.created_at >= ?
    GROUP BY u.id
    ORDER BY checkins DESC
    LIMIT 5
  `).bind(tonightStart).all();
  
  const vipTitles = [
    { title: "Party Host", vibe: "👑" },
    { title: "VIP Guest", vibe: "⭐" },
    { title: "Dance Floor King", vibe: "🕺" },
    { title: "Night Owl", vibe: "🦉" },
    { title: "Party Animal", vibe: "🎉" }
  ];
  
  const vipList = ((vipQuery.results || []) as Array<{ username: string; checkins: number }>).map((v, i) => ({
    username: v.username,
    title: vipTitles[i]?.title || "Party Goer",
    checkins: v.checkins,
    vibe: vipTitles[i]?.vibe || "🎊"
  }));
  
  // Party stats
  const statsQuery = await db.prepare(`
    SELECT 
      COUNT(DISTINCT user_id) as total_guests,
      COUNT(*) as smokes_tonight
    FROM checkins
    WHERE created_at >= ?
  `).bind(tonightStart).first() as { total_guests: number; smokes_tonight: number };
  
  // Calculate vibe level
  const getVibeLevel = (smokes: number, guests: number) => {
    const intensity = smokes + guests * 2;
    if (intensity >= 20) return "🔥 LEGENDARY";
    if (intensity >= 15) return "💜 ELECTRIC";
    if (intensity >= 10) return "🎉 LIT";
    if (intensity >= 5) return "⚡ WARMING UP";
    return "🌙 CHILL";
  };
  
  // Dance floor brands with fun emojis
  const brandEmojis = ['💃', '🕺', '🎶', '✨', '🌟', '💫'];
  const dancefloorBrands = brands.slice(0, 4).map((b, i) => ({
    brand: b.brand,
    count: b.count,
    emoji: brandEmojis[i % brandEmojis.length]
  }));
  
  // Late night snacks/pairings
  const lateNightSnacks = [
    { emoji: "🍕", text: "Pizza pairs perfectly with a smooth Connecticut" },
    { emoji: "🍟", text: "Fries + Maduro = chef's kiss at 2 AM" },
    { emoji: "🌯", text: "Kebab run? Grab a quick corona size" },
    { emoji: "🍩", text: "Donuts hit different with a mild morning smoke" },
    { emoji: "☕", text: "Late night espresso + full-bodied cigar" }
  ];
  
  // Shuffle and pick 3
  const shuffledSnacks = lateNightSnacks.sort(() => Math.random() - 0.5).slice(0, 3);
  
  // Closing time message
  const getClosingTime = () => {
    if (hour < 3) {
      const hoursLeft = 3 - hour;
      return `${hoursLeft}h until last call`;
    }
    return "After party continues next Saturday!";
  };
  
  const data: PartyData = {
    isPartyTime,
    partyTitle: "The After Party 🎊",
    partyVibe: getPartyVibe(),
    djBooth,
    vipList,
    partyStats: {
      totalGuests: statsQuery.total_guests,
      smokesTonight: statsQuery.smokes_tonight,
      peakHour: 23, // 11 PM is typically peak
      vibeLevel: getVibeLevel(statsQuery.smokes_tonight, statsQuery.total_guests)
    },
    dancefloorBrands,
    lateNightSnacks: shuffledSnacks,
    closingTime: getClosingTime()
  };
  
  return Response.json(data);
}
