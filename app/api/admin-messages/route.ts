import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { cookies } from 'next/headers';

export const runtime = 'edge';

// POST - Submit new support/feedback message
export async function POST(request: Request) {
  try {
    const { env } = getRequestContext();
    const db = (env as { DB: D1Database }).DB;
    
    const body: { type?: string; category?: string; subject?: string; message?: string } = await request.json();
    const { type, category, subject, message } = body;
    
    if (!type || !message) {
      return NextResponse.json({ error: 'Type and message are required' }, { status: 400 });
    }
    
    // Get current user if logged in
    let userId: string | null = null;
    let username: string | null = null;
    
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    
    if (session) {
      const sessionRow = await db.prepare(
        'SELECT user_id FROM sessions WHERE id = ?'
      ).bind(session).first<{ user_id: string }>();
      
      if (sessionRow) {
        userId = sessionRow.user_id;
        const userRow = await db.prepare(
          'SELECT username FROM users WHERE id = ?'
        ).bind(userId).first<{ username: string }>();
        username = userRow?.username || null;
      }
    }
    
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    await db.prepare(`
      INSERT INTO admin_messages (id, user_id, username, type, category, subject, message, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `).bind(id, userId, username, type, category || null, subject || null, message, now, now).run();
    
    return NextResponse.json({ 
      success: true, 
      id,
      message: type === 'support' 
        ? "Thanks! We'll look into this and get back to you soon." 
        : "Thanks for the feedback! We read every submission."
    });
    
  } catch (error) {
    console.error('Admin message submit error:', error);
    return NextResponse.json({ error: 'Failed to submit message' }, { status: 500 });
  }
}

// GET - Fetch all messages (admin only)
export async function GET(request: Request) {
  try {
    const { env } = getRequestContext();
    const db = (env as { DB: D1Database }).DB;
    
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    const status = url.searchParams.get('status'); // 'open', 'in-progress', 'completed', 'all'
    const type = url.searchParams.get('type'); // 'support', 'feedback', 'all'
    
    // Simple admin key check
    if (key !== 'puffed-admin-2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let query = `
      SELECT id, user_id, username, type, category, subject, message, status, admin_notes, created_at, updated_at
      FROM admin_messages
      WHERE 1=1
    `;
    const params: string[] = [];
    
    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (type && type !== 'all') {
      query += ' AND type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 100';
    
    const stmt = db.prepare(query);
    const result = await (params.length > 0 
      ? stmt.bind(...params) 
      : stmt
    ).all<{
      id: string;
      user_id: string | null;
      username: string | null;
      type: string;
      category: string | null;
      subject: string | null;
      message: string;
      status: string;
      admin_notes: string | null;
      created_at: number;
      updated_at: number;
    }>();
    
    // Get counts by status
    const counts = await db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM admin_messages
      GROUP BY status
    `).all<{ status: string; count: number }>();
    
    const statusCounts = {
      open: 0,
      'in-progress': 0,
      completed: 0,
      total: 0
    };
    
    for (const row of counts.results || []) {
      statusCounts[row.status as keyof typeof statusCounts] = row.count;
      statusCounts.total += row.count;
    }
    
    return NextResponse.json({
      messages: result.results || [],
      counts: statusCounts
    });
    
  } catch (error) {
    console.error('Admin messages fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
