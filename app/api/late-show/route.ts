import { getRequestContext } from '@cloudflare/next-on-pages';
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "edge";

interface ShowData {
  isShowtime: boolean;
  showTitle: string;
  showEmoji: string;
  host: {
    greeting: string;
    monologue: string[];
  };
  tonightsGuests: Array<{
    username: string;
    intro: string;
    checkins: number;
    topBrand: string;
  }>;
  topTen: {
    title: string;
    items: string[];
  };
  headlines: Array<{
    text: string;
    emoji: string;
  }>;
  musicalGuest: {
    brand: string;
    intro: string;
    stats: { checkins: number; avgRating: number };
  } | null;
  audienceStats: {
    totalViewers: number;
    activeNow: number;
    applause: number;
  };
  signOff: string;
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
  
  // Get username
  const userRecord = await db.prepare(
    "SELECT username FROM users WHERE id = ?"
  ).bind(session.user_id).first<{ username: string }>();
  
  const username = userRecord?.username || "Guest";
  
  const now = Math.floor(Date.now() / 1000);
  const todayStart = now - (now % 86400);
  
  // Check if it's showtime (8 PM - 2 AM)
  const hour = new Date().getHours();
  const isShowtime = hour >= 20 || hour < 2;
  
  // Get show theme based on day
  const day = new Date().getDay();
  const showThemes = [
    { title: "Sunday Night Live", emoji: "🌙" },
    { title: "Monday Night Show", emoji: "📺" },
    { title: "Tuesday Tonight", emoji: "🎭" },
    { title: "Midweek Late Night", emoji: "🌟" },
    { title: "Thursday Night Live", emoji: "🎤" },
    { title: "Friday Night Fever", emoji: "🔥" },
    { title: "Saturday Night Live", emoji: "🎬" },
  ];
  const theme = showThemes[day];
  
  // Get today's active users as "guests"
  const guests = await db.prepare(`
    SELECT 
      u.username,
      COUNT(c.id) as checkins,
      MAX(c.brand) as recent_brand
    FROM users u
    JOIN checkins c ON c.user_id = u.id
    WHERE c.created_at >= ?
    GROUP BY u.id
    ORDER BY checkins DESC
    LIMIT 3
  `).bind(todayStart).all();
  
  const tonightsGuests = (guests.results || []).map((g: Record<string, unknown>, i: number) => {
    const intros = [
      "Tonight's headliner! They've been on fire today!",
      "A fan favorite making waves!",
      "Rising star of the evening!",
      "Making their grand entrance!"
    ];
    return {
      username: g.username as string,
      intro: intros[i] || intros[3],
      checkins: g.checkins as number,
      topBrand: g.recent_brand as string
    };
  });
  
  // Get platform stats for headlines
  const statsQuery = await db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM checkins WHERE created_at >= ?) as today_checkins,
      (SELECT COUNT(*) FROM likes WHERE created_at >= ?) as today_likes,
      (SELECT COUNT(*) FROM comments WHERE created_at >= ?) as today_comments,
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(DISTINCT user_id) FROM checkins WHERE created_at >= ?) as active_today
  `).bind(todayStart, todayStart, todayStart, todayStart).first() as Record<string, number>;
  
  // Generate headlines
  const headlines: Array<{ text: string; emoji: string }> = [];
  if (statsQuery.today_checkins > 0) {
    headlines.push({ 
      text: `${statsQuery.today_checkins} smokes logged today!`, 
      emoji: "📊" 
    });
  }
  if (statsQuery.today_likes > 0) {
    headlines.push({ 
      text: `${statsQuery.today_likes} likes flying around the community`, 
      emoji: "❤️" 
    });
  }
  if (statsQuery.active_today > 0) {
    headlines.push({ 
      text: `${statsQuery.active_today} smokers active today`, 
      emoji: "🔥" 
    });
  }
  
  // Get top brand as "musical guest"
  const topBrand = await db.prepare(`
    SELECT 
      brand,
      COUNT(*) as count,
      AVG(rating) as avg_rating
    FROM checkins
    WHERE created_at >= ?
    GROUP BY brand
    ORDER BY count DESC
    LIMIT 1
  `).bind(todayStart).first() as { brand: string; count: number; avg_rating: number } | null;
  
  const musicalGuest = topBrand ? {
    brand: topBrand.brand,
    intro: "Tonight's musical guest, making their debut...",
    stats: { 
      checkins: topBrand.count, 
      avgRating: Math.round((topBrand.avg_rating || 0) * 10) / 10 
    }
  } : null;
  
  // Generate monologue based on stats
  const monologues = [
    `Welcome to ${theme.title}! I'm your host, and boy do we have a show for you tonight.`,
    statsQuery.today_checkins > 5 
      ? "The community is ON FIRE today! More smokes than a BBQ convention!"
      : "It's been a chill day in the smoking world, but quality over quantity, am I right?",
    statsQuery.today_likes > statsQuery.today_checkins
      ? "More likes than check-ins? You all are feeling generous tonight!"
      : "Let's spread some love out there, folks!"
  ];
  
  // Generate Top 10 list
  const topBrands = await db.prepare(`
    SELECT brand, COUNT(*) as count
    FROM checkins
    WHERE created_at >= ? - 604800
    GROUP BY brand
    ORDER BY count DESC
    LIMIT 10
  `).bind(now).all();
  
  const topTenItems = (topBrands.results || []).map((b: Record<string, unknown>, i: number) => 
    `#${10 - i}: ${b.brand} (${b.count} smokes)`
  ).reverse();
  
  // Sign-off messages
  const signOffs = [
    "That's our show! Keep puffing, stay classy, and remember - life's too short for bad cigars!",
    "Thanks for watching! Don't forget to tip your bartender and log your smokes!",
    "We'll be right back after these messages... just kidding, go smoke one!",
    "Good night everybody! May your ash be long and your draw be smooth!"
  ];
  
  const data: ShowData = {
    isShowtime,
    showTitle: theme.title,
    showEmoji: theme.emoji,
    host: {
      greeting: `Good evening ${username}!`,
      monologue: monologues
    },
    tonightsGuests,
    topTen: {
      title: "Top 10 Brands This Week",
      items: topTenItems
    },
    headlines,
    musicalGuest,
    audienceStats: {
      totalViewers: statsQuery.total_users,
      activeNow: statsQuery.active_today,
      applause: statsQuery.today_likes + statsQuery.today_comments
    },
    signOff: signOffs[Math.floor(Math.random() * signOffs.length)]
  };
  
  return Response.json(data);
}
