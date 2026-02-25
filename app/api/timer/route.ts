import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { parseSessionCookie } from "@/lib/auth";

export const runtime = 'edge';

// Helper to get authenticated user
async function getUser(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const sessionId = parseSessionCookie(cookieHeader);
  if (!sessionId) return null;

  const { env } = getRequestContext();
  const now = Math.floor(Date.now() / 1000);
  const session = await env.DB
    .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
    .bind(sessionId, now)
    .first<{ user_id: number }>();

  return session ? { id: session.user_id } : null;
}

// GET - Get active timer and recent sessions
export async function GET(request: NextRequest) {
  const auth = await getUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { env } = getRequestContext();

  // Get active timer if any
  const activeTimer = await env.DB.prepare(`
    SELECT id, brand, product, started_at, notes
    FROM smoke_timers 
    WHERE user_id = ? AND ended_at IS NULL
    ORDER BY started_at DESC LIMIT 1
  `).bind(auth.id).first();

  // Get recent completed sessions with duration
  const recentSessions = await env.DB.prepare(`
    SELECT 
      st.id, st.brand, st.product, st.started_at, st.ended_at, st.notes,
      (st.ended_at - st.started_at) as duration_seconds,
      c.id as checkin_id, c.rating
    FROM smoke_timers st
    LEFT JOIN checkins c ON st.checkin_id = c.id
    WHERE st.user_id = ? AND st.ended_at IS NOT NULL
    ORDER BY st.started_at DESC LIMIT 10
  `).bind(auth.id).all();

  // Get average duration by brand
  const brandDurations = await env.DB.prepare(`
    SELECT 
      brand,
      COUNT(*) as sessions,
      AVG(ended_at - started_at) as avg_duration
    FROM smoke_timers 
    WHERE user_id = ? AND ended_at IS NOT NULL
    GROUP BY brand
    ORDER BY sessions DESC
    LIMIT 5
  `).bind(auth.id).all();

  return NextResponse.json({
    activeTimer: activeTimer || null,
    recentSessions: recentSessions.results || [],
    brandDurations: brandDurations.results || [],
    stats: {
      totalSessions: recentSessions.results?.length || 0
    }
  });
}

// POST - Start a new timer
export async function POST(request: NextRequest) {
  const auth = await getUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { env } = getRequestContext();
  const body = await request.json() as { brand: string; product?: string; notes?: string };
  const { brand, product, notes } = body;

  if (!brand) {
    return NextResponse.json({ error: 'Brand is required' }, { status: 400 });
  }

  // Check if there's already an active timer
  const existing = await env.DB.prepare(`
    SELECT id FROM smoke_timers WHERE user_id = ? AND ended_at IS NULL
  `).bind(auth.id).first();

  if (existing) {
    return NextResponse.json({ error: 'Timer already running', timerId: existing.id }, { status: 409 });
  }

  const now = Math.floor(Date.now() / 1000);
  
  const result = await env.DB.prepare(`
    INSERT INTO smoke_timers (user_id, brand, product, notes, started_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(auth.id, brand, product || null, notes || null, now).run();

  return NextResponse.json({
    success: true,
    timerId: result.meta.last_row_id,
    startedAt: now
  });
}

// PATCH - Stop timer and optionally link to check-in
export async function PATCH(request: NextRequest) {
  const auth = await getUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { env } = getRequestContext();
  const body = await request.json() as { timerId?: number; checkinId?: number; notes?: string };
  const { timerId, checkinId, notes } = body;

  const now = Math.floor(Date.now() / 1000);

  // Find active timer
  let timer;
  if (timerId) {
    timer = await env.DB.prepare(`
      SELECT * FROM smoke_timers WHERE id = ? AND user_id = ? AND ended_at IS NULL
    `).bind(timerId, auth.id).first();
  } else {
    timer = await env.DB.prepare(`
      SELECT * FROM smoke_timers WHERE user_id = ? AND ended_at IS NULL
      ORDER BY started_at DESC LIMIT 1
    `).bind(auth.id).first();
  }

  if (!timer) {
    return NextResponse.json({ error: 'No active timer found' }, { status: 404 });
  }

  // Stop the timer
  await env.DB.prepare(`
    UPDATE smoke_timers 
    SET ended_at = ?, checkin_id = ?, notes = COALESCE(?, notes)
    WHERE id = ?
  `).bind(now, checkinId || null, notes, timer.id).run();

  const duration = now - (timer.started_at as number);

  return NextResponse.json({
    success: true,
    timerId: timer.id,
    duration: duration,
    durationFormatted: formatDuration(duration)
  });
}

// DELETE - Cancel active timer
export async function DELETE(request: NextRequest) {
  const auth = await getUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { env } = getRequestContext();

  await env.DB.prepare(`
    DELETE FROM smoke_timers WHERE user_id = ? AND ended_at IS NULL
  `).bind(auth.id).run();

  return NextResponse.json({ success: true });
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${secs}s`;
}
