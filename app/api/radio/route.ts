import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface RadioTrack {
  id: string;
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  review?: string;
  imageUrl?: string;
  checkedAt: number;
  timeAgo: string;
  isLive: boolean;
  trackTitle: string;
  artistName: string;
}

interface RadioStats {
  listenersToday: number;
  tracksPlayedToday: number;
  topGenre: string;
  stationVibe: string;
  peakHour: number;
}

interface RadioData {
  nowPlaying: RadioTrack | null;
  upNext: RadioTrack[];
  recentlyPlayed: RadioTrack[];
  stats: RadioStats;
  djMessage: string;
  stationName: string;
  currentHour: number;
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function generateTrackTitle(brand: string, product?: string): string {
  const titles = [
    `${brand} Sessions`,
    `${brand} Groove`,
    `${brand} Vibes`,
    `${brand} Flow`,
    `${brand} Anthem`,
    `${brand} Dreams`,
    `${brand} Night`,
  ];
  if (product) {
    return `${product} (${brand} Mix)`;
  }
  return titles[Math.floor(Math.random() * titles.length)];
}

function getStationVibe(hour: number): { vibe: string; name: string; djMessage: string } {
  if (hour >= 5 && hour < 10) {
    return {
      vibe: "☕ Morning Mellow",
      name: "PUFF FM - Rise & Smoke",
      djMessage: "Good morning, smokers! Starting the day right with some smooth morning tracks.",
    };
  } else if (hour >= 10 && hour < 14) {
    return {
      vibe: "🌤️ Midday Mix",
      name: "PUFF FM - Lunch Break Sessions",
      djMessage: "Midday smoke break vibes coming at you! Keep that energy up.",
    };
  } else if (hour >= 14 && hour < 17) {
    return {
      vibe: "☀️ Afternoon Chill",
      name: "PUFF FM - Afternoon Delight",
      djMessage: "Afternoon crew checking in! Let's ride this out together.",
    };
  } else if (hour >= 17 && hour < 20) {
    return {
      vibe: "🌅 Golden Hour",
      name: "PUFF FM - Sunset Sessions",
      djMessage: "Golden hour hits different. Spark up and enjoy the sunset.",
    };
  } else if (hour >= 20 && hour < 23) {
    return {
      vibe: "🌙 Night Shift",
      name: "PUFF FM - After Dark",
      djMessage: "Welcome to the night shift! Friday night's looking good.",
    };
  } else {
    return {
      vibe: "🌌 Late Night",
      name: "PUFF FM - Midnight Frequencies",
      djMessage: "Late night crew, you know the deal. Slow burns and good vibes only.",
    };
  }
}

function getTopGenre(brands: string[]): string {
  const genres = [
    "Smooth Jazz",
    "Lo-fi Beats",
    "Ambient Clouds",
    "Chill Hop",
    "Soul & Smoke",
    "Acoustic Vibes",
  ];
  // Deterministic based on brand hash
  const hash = brands.join("").split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  return genres[hash % genres.length];
}

export async function GET(request: NextRequest) {
  const session = await parseSessionCookie(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { env } = getRequestContext();
  const db = env.DB;

  const now = Math.floor(Date.now() / 1000);
  const currentHour = new Date().getHours();
  const todayStart = now - (now % 86400) - (currentHour * 3600) - (new Date().getMinutes() * 60);

  // Get recent check-ins as "tracks"
  const recentCheckins = await db
    .prepare(`
      SELECT c.id, u.username, c.brand, c.product, c.rating, c.review, c.image_url, c.checked_at
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.checked_at > ?
      ORDER BY c.checked_at DESC
      LIMIT 20
    `)
    .bind(now - 86400) // Last 24 hours
    .all<{
      id: string;
      username: string;
      brand: string;
      product: string | null;
      rating: number | null;
      review: string | null;
      image_url: string | null;
      checked_at: number;
    }>();

  // Transform to tracks
  const tracks: RadioTrack[] = (recentCheckins.results || []).map((c, i) => ({
    id: c.id,
    username: c.username,
    brand: c.brand,
    product: c.product || undefined,
    rating: c.rating || undefined,
    review: c.review || undefined,
    imageUrl: c.image_url || undefined,
    checkedAt: c.checked_at,
    timeAgo: getTimeAgo(c.checked_at),
    isLive: i === 0 && (now - c.checked_at) < 3600, // "Live" if most recent and within 1 hour
    trackTitle: generateTrackTitle(c.brand, c.product || undefined),
    artistName: c.username,
  }));

  // Get today's stats
  const todayStats = await db
    .prepare(`
      SELECT 
        COUNT(DISTINCT user_id) as listeners,
        COUNT(*) as tracks
      FROM checkins
      WHERE checked_at > ?
    `)
    .bind(todayStart)
    .first<{ listeners: number; tracks: number }>();

  // Get peak hour
  const peakHourResult = await db
    .prepare(`
      SELECT 
        ((checked_at - ?) / 3600) % 24 as hour,
        COUNT(*) as count
      FROM checkins
      WHERE checked_at > ?
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `)
    .bind(todayStart - (currentHour * 3600), todayStart - 86400 * 7)
    .first<{ hour: number; count: number }>();

  const stationInfo = getStationVibe(currentHour);
  const brands = tracks.map(t => t.brand);

  const nowPlaying = tracks.length > 0 ? tracks[0] : null;
  const upNext = tracks.slice(1, 4);
  const recentlyPlayed = tracks.slice(4, 10);

  const stats: RadioStats = {
    listenersToday: todayStats?.listeners || 0,
    tracksPlayedToday: todayStats?.tracks || 0,
    topGenre: getTopGenre(brands),
    stationVibe: stationInfo.vibe,
    peakHour: peakHourResult?.hour || 12,
  };

  const data: RadioData = {
    nowPlaying,
    upNext,
    recentlyPlayed,
    stats,
    djMessage: stationInfo.djMessage,
    stationName: stationInfo.name,
    currentHour,
  };

  return NextResponse.json(data);
}
