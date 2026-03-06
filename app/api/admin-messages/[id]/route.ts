import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

// PATCH - Update message status/notes (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = getRequestContext();
    const db = (env as { DB: D1Database }).DB;
    const { id } = await params;
    
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    
    if (key !== 'puffed-admin-2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { status, admin_notes } = body;
    
    const updates: string[] = [];
    const values: (string | number)[] = [];
    
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }
    
    if (admin_notes !== undefined) {
      updates.push('admin_notes = ?');
      values.push(admin_notes);
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    
    updates.push('updated_at = ?');
    values.push(Math.floor(Date.now() / 1000));
    values.push(id);
    
    await db.prepare(`
      UPDATE admin_messages 
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...values).run();
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Admin message update error:', error);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}

// DELETE - Delete message (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = getRequestContext();
    const db = (env as { DB: D1Database }).DB;
    const { id } = await params;
    
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    
    if (key !== 'puffed-admin-2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await db.prepare('DELETE FROM admin_messages WHERE id = ?').bind(id).run();
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Admin message delete error:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
