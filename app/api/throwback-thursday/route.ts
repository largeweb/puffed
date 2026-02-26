import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { parseSessionCookie } from '@/lib/auth'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { env } = getRequestContext()
  const db = env.DB

  // Get current user from session
  const cookieHeader = request.headers.get('cookie')
  const sessionId = parseSessionCookie(cookieHeader)
  
  let currentUserId: string | null = null
  if (sessionId) {
    const now = Math.floor(Date.now() / 1000)
    const session = await db
      .prepare('SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?')
      .bind(sessionId, now)
      .first<{ user_id: string }>()
    currentUserId = session?.user_id || null
  }

  // Get optional user filter
  const userId = request.nextUrl.searchParams.get('user_id')

  // Get current Thursday info
  const now = new Date()
  const currentWeek = getWeekNumber(now)
  const currentYear = now.getFullYear()

  // Get all past Thursday check-ins (or check-ins from past weeks on any day)
  // For throwback, we show check-ins from previous weeks/months/years
  const targetUserId = userId || currentUserId

  if (!targetUserId) {
    // Show community throwbacks
    const communityThrowbacks = await db.prepare(`
      SELECT 
        c.id,
        c.brand,
        c.product,
        c.rating,
        c.review,
        c.image_url,
        c.category,
        c.created_at,
        u.username,
        u.id as user_id,
        u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as likes,
        (SELECT COUNT(*) FROM comments WHERE checkin_id = c.id) as comments
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at < datetime('now', '-7 days')
      ORDER BY c.created_at DESC
      LIMIT 20
    `).all()

    return NextResponse.json({
      type: 'community',
      throwbacks: communityThrowbacks.results || [],
      isThursday: now.getDay() === 4,
      message: now.getDay() === 4 
        ? "🔙 Throwback Thursday! Check out what the community was smoking..." 
        : "📸 Memory Lane - Community Throwbacks"
    })
  }

  // Personal throwbacks - organized by time period
  const [weekAgo, monthAgo, yearAgo, allPast] = await Promise.all([
    // Exactly 1 week ago (±1 day)
    db.prepare(`
      SELECT 
        c.id, c.brand, c.product, c.rating, c.review, c.image_url, c.category, c.created_at,
        (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as likes
      FROM checkins c
      WHERE c.user_id = ?
        AND c.created_at BETWEEN datetime('now', '-8 days') AND datetime('now', '-6 days')
      ORDER BY c.created_at DESC
      LIMIT 3
    `).bind(targetUserId).all(),

    // 1 month ago (±2 days)
    db.prepare(`
      SELECT 
        c.id, c.brand, c.product, c.rating, c.review, c.image_url, c.category, c.created_at,
        (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as likes
      FROM checkins c
      WHERE c.user_id = ?
        AND c.created_at BETWEEN datetime('now', '-32 days') AND datetime('now', '-28 days')
      ORDER BY c.created_at DESC
      LIMIT 3
    `).bind(targetUserId).all(),

    // 1 year ago (±3 days)
    db.prepare(`
      SELECT 
        c.id, c.brand, c.product, c.rating, c.review, c.image_url, c.category, c.created_at,
        (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as likes
      FROM checkins c
      WHERE c.user_id = ?
        AND c.created_at BETWEEN datetime('now', '-368 days') AND datetime('now', '-362 days')
      ORDER BY c.created_at DESC
      LIMIT 3
    `).bind(targetUserId).all(),

    // All past check-ins for "random throwback"
    db.prepare(`
      SELECT 
        c.id, c.brand, c.product, c.rating, c.review, c.image_url, c.category, c.created_at,
        (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as likes
      FROM checkins c
      WHERE c.user_id = ?
        AND c.created_at < datetime('now', '-3 days')
      ORDER BY RANDOM()
      LIMIT 5
    `).bind(targetUserId).all()
  ])

  // Get user's total history stats
  const stats = await db.prepare(`
    SELECT 
      COUNT(*) as total_checkins,
      MIN(created_at) as first_checkin,
      COUNT(DISTINCT brand) as brands_tried,
      AVG(rating) as avg_rating
    FROM checkins
    WHERE user_id = ?
  `).bind(targetUserId).first()

  const daysSinceFirst = stats?.first_checkin 
    ? Math.floor((Date.now() - new Date(stats.first_checkin as string).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return NextResponse.json({
    type: 'personal',
    isThursday: now.getDay() === 4,
    throwbacks: {
      weekAgo: weekAgo.results || [],
      monthAgo: monthAgo.results || [],
      yearAgo: yearAgo.results || [],
      random: allPast.results || []
    },
    stats: {
      totalCheckins: stats?.total_checkins || 0,
      firstCheckin: stats?.first_checkin,
      daysSinceFirst,
      brandsTried: stats?.brands_tried || 0,
      avgRating: stats?.avg_rating ? Number(stats.avg_rating).toFixed(1) : null
    },
    message: now.getDay() === 4 
      ? "🔙 Throwback Thursday! Look back at your smoking journey..."
      : "📸 Your Smoking Memories"
  })
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
