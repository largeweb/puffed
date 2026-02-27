import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface BingoCell {
  id: string;
  challenge: string;
  emoji: string;
  completed: boolean;
  completedAt?: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface BingoCard {
  weekStart: number;
  weekEnd: number;
  cells: BingoCell[];
  completedCount: number;
  bingoLines: number; // 0-12 possible lines (5 rows + 5 cols + 2 diagonals)
  hasBingo: boolean;
  hasBlackout: boolean;
}

// Challenge definitions
const CHALLENGES = {
  // Easy challenges
  easy: [
    { id: 'log_smoke', challenge: 'Log any smoke', emoji: '🚬' },
    { id: 'morning_smoke', challenge: 'Smoke before noon', emoji: '🌅' },
    { id: 'evening_smoke', challenge: 'Smoke after 6 PM', emoji: '🌆' },
    { id: 'rate_4plus', challenge: 'Rate 4+ stars', emoji: '⭐' },
    { id: 'add_review', challenge: 'Write a review', emoji: '📝' },
    { id: 'add_photo', challenge: 'Add a photo', emoji: '📸' },
    { id: 'like_checkin', challenge: 'Like someone\'s smoke', emoji: '❤️' },
    { id: 'view_discover', challenge: 'Check Discover page', emoji: '🔍' },
    { id: 'weekend_smoke', challenge: 'Smoke on weekend', emoji: '🎉' },
  ],
  // Medium challenges
  medium: [
    { id: 'two_in_day', challenge: '2 smokes in one day', emoji: '✌️' },
    { id: 'new_brand', challenge: 'Try a new brand', emoji: '🆕' },
    { id: 'five_star', challenge: 'Rate 5 stars', emoji: '🌟' },
    { id: 'get_like', challenge: 'Get a like', emoji: '💕' },
    { id: 'comment', challenge: 'Leave a comment', emoji: '💬' },
    { id: 'night_smoke', challenge: 'Smoke after 10 PM', emoji: '🌙' },
    { id: 'early_bird', challenge: 'Smoke before 8 AM', emoji: '🐦' },
    { id: 'add_flavor', challenge: 'Tag flavors', emoji: '👅' },
    { id: 'follow_someone', challenge: 'Follow someone new', emoji: '👥' },
  ],
  // Hard challenges
  hard: [
    { id: 'three_in_day', challenge: '3 smokes in one day', emoji: '🔥' },
    { id: 'streak_3', challenge: '3-day streak', emoji: '📈' },
    { id: 'two_new_brands', challenge: '2 new brands', emoji: '🎯' },
    { id: 'get_comment', challenge: 'Get a comment', emoji: '💭' },
    { id: 'night_owl', challenge: 'Smoke 12-4 AM', emoji: '🦉' },
    { id: 'social_butterfly', challenge: 'Like 5 check-ins', emoji: '🦋' },
    { id: 'get_follower', challenge: 'Gain a follower', emoji: '🌟' },
    { id: 'perfect_rating', challenge: 'Give & get 5 stars', emoji: '✨' },
  ],
};

// Get week boundaries (Monday-Sunday)
function getWeekBoundaries(): { weekStart: number; weekEnd: number } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    weekStart: Math.floor(monday.getTime() / 1000),
    weekEnd: Math.floor(sunday.getTime() / 1000),
  };
}

// Generate deterministic bingo card based on user + week
function generateBingoCard(userId: string, weekStart: number): BingoCell[] {
  // Use userId + weekStart as seed for deterministic randomness
  const seed = `${userId}-${weekStart}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const seededRandom = () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return hash / 0x7fffffff;
  };
  
  // Shuffle array with seeded random
  const shuffle = <T,>(arr: T[]): T[] => {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  
  // Pick challenges: 3 hard, 6 medium, 6 easy for 5x5 grid (25 total, center is free)
  const easyPicks = shuffle(CHALLENGES.easy).slice(0, 10);
  const mediumPicks = shuffle(CHALLENGES.medium).slice(0, 9);
  const hardPicks = shuffle(CHALLENGES.hard).slice(0, 5);
  
  // Arrange in grid - harder challenges towards edges, easier in middle
  const allChallenges = shuffle([
    ...easyPicks.map(c => ({ ...c, difficulty: 'easy' as const })),
    ...mediumPicks.map(c => ({ ...c, difficulty: 'medium' as const })),
    ...hardPicks.map(c => ({ ...c, difficulty: 'hard' as const })),
  ]);
  
  // Take 24 (center is FREE)
  const cells: BingoCell[] = allChallenges.slice(0, 24).map(c => ({
    ...c,
    completed: false,
  }));
  
  // Insert FREE space in center (position 12)
  cells.splice(12, 0, {
    id: 'free',
    challenge: 'FREE',
    emoji: '🎰',
    completed: true,
    difficulty: 'easy',
    completedAt: weekStart,
  });
  
  return cells;
}

// Check which challenges are completed
async function checkCompletedChallenges(
  db: D1Database,
  userId: string,
  weekStart: number,
  weekEnd: number,
  cells: BingoCell[]
): Promise<BingoCell[]> {
  const now = Math.floor(Date.now() / 1000);
  
  // Get user's check-ins this week
  const checkins = await db.prepare(`
    SELECT 
      id, brand, rating, review, image_url, created_at,
      (SELECT GROUP_CONCAT(flavor_id) FROM checkin_flavors WHERE checkin_id = c.id) as flavors
    FROM checkins c
    WHERE user_id = ? AND created_at >= ? AND created_at <= ?
    ORDER BY created_at
  `).bind(userId, weekStart, weekEnd).all<{
    id: string;
    brand: string;
    rating: number | null;
    review: string | null;
    image_url: string | null;
    created_at: number;
    flavors: string | null;
  }>();
  
  // Get user's brands before this week
  const oldBrands = await db.prepare(`
    SELECT DISTINCT LOWER(brand) as brand FROM checkins 
    WHERE user_id = ? AND created_at < ?
  `).bind(userId, weekStart).all<{ brand: string }>();
  const oldBrandSet = new Set(oldBrands.results.map(r => r.brand));
  
  // Get likes/comments given this week
  const likesGiven = await db.prepare(`
    SELECT COUNT(*) as count FROM likes 
    WHERE user_id = ? AND created_at >= ? AND created_at <= ?
  `).bind(userId, weekStart, weekEnd).first<{ count: number }>();
  
  const commentsGiven = await db.prepare(`
    SELECT COUNT(*) as count FROM comments 
    WHERE user_id = ? AND created_at >= ? AND created_at <= ?
  `).bind(userId, weekStart, weekEnd).first<{ count: number }>();
  
  // Get likes/comments received this week
  const likesReceived = await db.prepare(`
    SELECT COUNT(*) as count FROM likes l
    JOIN checkins c ON l.checkin_id = c.id
    WHERE c.user_id = ? AND l.created_at >= ? AND l.created_at <= ?
  `).bind(userId, weekStart, weekEnd).first<{ count: number }>();
  
  const commentsReceived = await db.prepare(`
    SELECT COUNT(*) as count FROM comments cm
    JOIN checkins c ON cm.checkin_id = c.id
    WHERE c.user_id = ? AND cm.created_at >= ? AND cm.created_at <= ? AND cm.user_id != ?
  `).bind(userId, weekStart, weekEnd, userId).first<{ count: number }>();
  
  // Get follows made this week
  const followsMade = await db.prepare(`
    SELECT COUNT(*) as count FROM follows 
    WHERE follower_id = ? AND created_at >= ? AND created_at <= ?
  `).bind(userId, weekStart, weekEnd).first<{ count: number }>();
  
  // Get followers gained this week
  const followersGained = await db.prepare(`
    SELECT COUNT(*) as count FROM follows 
    WHERE following_id = ? AND created_at >= ? AND created_at <= ?
  `).bind(userId, weekStart, weekEnd).first<{ count: number }>();
  
  // Process check-ins for time-based and pattern challenges
  const checkinList = checkins.results;
  const checkinsByDay: Record<string, typeof checkinList> = {};
  
  for (const ci of checkinList) {
    const date = new Date(ci.created_at * 1000);
    const dateKey = date.toISOString().split('T')[0];
    if (!checkinsByDay[dateKey]) checkinsByDay[dateKey] = [];
    checkinsByDay[dateKey].push(ci);
  }
  
  // Check streak (consecutive days)
  const dayKeys = Object.keys(checkinsByDay).sort();
  let maxStreak = 0;
  let currentStreak = 0;
  let prevDate: Date | null = null;
  
  for (const dk of dayKeys) {
    const d = new Date(dk);
    if (prevDate && (d.getTime() - prevDate.getTime()) === 86400000) {
      currentStreak++;
    } else {
      currentStreak = 1;
    }
    maxStreak = Math.max(maxStreak, currentStreak);
    prevDate = d;
  }
  
  // New brands this week
  const newBrands = new Set<string>();
  for (const ci of checkinList) {
    const brandLower = ci.brand.toLowerCase();
    if (!oldBrandSet.has(brandLower)) {
      newBrands.add(brandLower);
    }
  }
  
  // Check each cell
  return cells.map(cell => {
    if (cell.id === 'free') return cell;
    
    let completed = false;
    let completedAt: number | undefined;
    
    switch (cell.id) {
      case 'log_smoke':
        completed = checkinList.length > 0;
        if (completed) completedAt = checkinList[0].created_at;
        break;
        
      case 'morning_smoke':
        for (const ci of checkinList) {
          const hour = new Date(ci.created_at * 1000).getHours();
          if (hour < 12) {
            completed = true;
            completedAt = ci.created_at;
            break;
          }
        }
        break;
        
      case 'evening_smoke':
        for (const ci of checkinList) {
          const hour = new Date(ci.created_at * 1000).getHours();
          if (hour >= 18) {
            completed = true;
            completedAt = ci.created_at;
            break;
          }
        }
        break;
        
      case 'rate_4plus':
        for (const ci of checkinList) {
          if (ci.rating && ci.rating >= 4) {
            completed = true;
            completedAt = ci.created_at;
            break;
          }
        }
        break;
        
      case 'five_star':
        for (const ci of checkinList) {
          if (ci.rating === 5) {
            completed = true;
            completedAt = ci.created_at;
            break;
          }
        }
        break;
        
      case 'add_review':
        for (const ci of checkinList) {
          if (ci.review && ci.review.trim().length > 0) {
            completed = true;
            completedAt = ci.created_at;
            break;
          }
        }
        break;
        
      case 'add_photo':
        for (const ci of checkinList) {
          if (ci.image_url) {
            completed = true;
            completedAt = ci.created_at;
            break;
          }
        }
        break;
        
      case 'add_flavor':
        for (const ci of checkinList) {
          if (ci.flavors && ci.flavors.length > 0) {
            completed = true;
            completedAt = ci.created_at;
            break;
          }
        }
        break;
        
      case 'like_checkin':
        completed = (likesGiven?.count || 0) > 0;
        break;
        
      case 'comment':
        completed = (commentsGiven?.count || 0) > 0;
        break;
        
      case 'weekend_smoke':
        for (const ci of checkinList) {
          const day = new Date(ci.created_at * 1000).getDay();
          if (day === 0 || day === 6) {
            completed = true;
            completedAt = ci.created_at;
            break;
          }
        }
        break;
        
      case 'two_in_day':
        for (const dayCheckins of Object.values(checkinsByDay)) {
          if (dayCheckins.length >= 2) {
            completed = true;
            completedAt = dayCheckins[1].created_at;
            break;
          }
        }
        break;
        
      case 'three_in_day':
        for (const dayCheckins of Object.values(checkinsByDay)) {
          if (dayCheckins.length >= 3) {
            completed = true;
            completedAt = dayCheckins[2].created_at;
            break;
          }
        }
        break;
        
      case 'new_brand':
        completed = newBrands.size >= 1;
        break;
        
      case 'two_new_brands':
        completed = newBrands.size >= 2;
        break;
        
      case 'get_like':
        completed = (likesReceived?.count || 0) > 0;
        break;
        
      case 'get_comment':
        completed = (commentsReceived?.count || 0) > 0;
        break;
        
      case 'night_smoke':
        for (const ci of checkinList) {
          const hour = new Date(ci.created_at * 1000).getHours();
          if (hour >= 22) {
            completed = true;
            completedAt = ci.created_at;
            break;
          }
        }
        break;
        
      case 'early_bird':
        for (const ci of checkinList) {
          const hour = new Date(ci.created_at * 1000).getHours();
          if (hour < 8) {
            completed = true;
            completedAt = ci.created_at;
            break;
          }
        }
        break;
        
      case 'night_owl':
        for (const ci of checkinList) {
          const hour = new Date(ci.created_at * 1000).getHours();
          if (hour >= 0 && hour < 4) {
            completed = true;
            completedAt = ci.created_at;
            break;
          }
        }
        break;
        
      case 'follow_someone':
        completed = (followsMade?.count || 0) > 0;
        break;
        
      case 'get_follower':
        completed = (followersGained?.count || 0) > 0;
        break;
        
      case 'streak_3':
        completed = maxStreak >= 3;
        break;
        
      case 'social_butterfly':
        completed = (likesGiven?.count || 0) >= 5;
        break;
        
      case 'perfect_rating':
        // Gave a 5-star AND got one
        const gave5 = checkinList.some(ci => ci.rating === 5);
        completed = gave5 && (likesReceived?.count || 0) > 0; // simplified - got engagement
        break;
        
      case 'view_discover':
        // Can't track this server-side, auto-complete for engagement
        completed = checkinList.length > 0;
        break;
    }
    
    return {
      ...cell,
      completed,
      completedAt,
    };
  });
}

// Count bingo lines
function countBingoLines(cells: BingoCell[]): { bingoLines: number; hasBingo: boolean; hasBlackout: boolean } {
  let lines = 0;
  
  // Check rows
  for (let row = 0; row < 5; row++) {
    const rowCells = cells.slice(row * 5, row * 5 + 5);
    if (rowCells.every(c => c.completed)) lines++;
  }
  
  // Check columns
  for (let col = 0; col < 5; col++) {
    const colCells = [cells[col], cells[col + 5], cells[col + 10], cells[col + 15], cells[col + 20]];
    if (colCells.every(c => c.completed)) lines++;
  }
  
  // Check diagonals
  const diag1 = [cells[0], cells[6], cells[12], cells[18], cells[24]];
  const diag2 = [cells[4], cells[8], cells[12], cells[16], cells[20]];
  if (diag1.every(c => c.completed)) lines++;
  if (diag2.every(c => c.completed)) lines++;
  
  const allCompleted = cells.every(c => c.completed);
  
  return {
    bingoLines: lines,
    hasBingo: lines > 0,
    hasBlackout: allCompleted,
  };
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

    // Get user
    const now = Math.floor(Date.now() / 1000);
    const session = await db
      .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
      .bind(sessionId, now)
      .first<{ user_id: string }>();

    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const { weekStart, weekEnd } = getWeekBoundaries();
    
    // Generate deterministic card for this user + week
    let cells = generateBingoCard(session.user_id, weekStart);
    
    // Check which challenges are completed
    cells = await checkCompletedChallenges(db, session.user_id, weekStart, weekEnd, cells);
    
    const { bingoLines, hasBingo, hasBlackout } = countBingoLines(cells);
    const completedCount = cells.filter(c => c.completed).length;

    const card: BingoCard = {
      weekStart,
      weekEnd,
      cells,
      completedCount,
      bingoLines,
      hasBingo,
      hasBlackout,
    };

    return NextResponse.json(card);
  } catch (error) {
    console.error("Smoke bingo error:", error);
    return NextResponse.json({ error: "Failed to load bingo card" }, { status: 500 });
  }
}
