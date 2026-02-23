import { NextRequest } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { ImageResponse } from "next/og";

export const runtime = "edge";

// Share card generation - creates a beautiful image for social sharing
// Supports: weekly stats, profile stats, achievement unlocks

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("u") || searchParams.get("username");
    const type = searchParams.get("type") || "weekly"; // weekly, profile, badge
    
    if (!username) {
      return new Response("Username required", { status: 400 });
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // Get user info
    const user = await db.prepare(
      "SELECT id, username, bio FROM users WHERE username = ?"
    ).bind(username).first<{ id: string; username: string; bio: string | null }>();

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    // Calculate time ranges
    const now = Math.floor(Date.now() / 1000);
    const oneWeekAgo = now - 7 * 86400;

    // Get stats
    const [weeklyStats, allTimeStats, streak] = await Promise.all([
      db.prepare(`
        SELECT 
          COUNT(*) as smokes,
          COUNT(DISTINCT brand) as brands,
          ROUND(AVG(rating), 1) as avg_rating,
          MAX(rating) as best_rating
        FROM checkins 
        WHERE user_id = ? AND created_at >= ?
      `).bind(user.id, oneWeekAgo).first<{
        smokes: number;
        brands: number;
        avg_rating: number;
        best_rating: number;
      }>(),
      
      db.prepare(`
        SELECT 
          COUNT(*) as total_smokes,
          COUNT(DISTINCT brand) as total_brands
        FROM checkins 
        WHERE user_id = ?
      `).bind(user.id).first<{
        total_smokes: number;
        total_brands: number;
      }>(),
      
      db.prepare(`
        SELECT 
          GROUP_CONCAT(DISTINCT date(created_at, 'unixepoch')) as dates
        FROM checkins 
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).bind(user.id).first<{ dates: string | null }>(),
    ]);

    // Calculate current streak
    let currentStreak = 0;
    if (streak?.dates) {
      const dates = streak.dates.split(',').sort((a, b) => b.localeCompare(a));
      const today = new Date().toISOString().split('T')[0];
      const yesterday = (() => {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        return y.toISOString().split('T')[0];
      })();
      
      if (dates[0] === today || dates[0] === yesterday) {
        let expectedDate = dates[0];
        for (const date of dates) {
          if (date === expectedDate) {
            currentStreak++;
            const dateObj = new Date(expectedDate + 'T12:00:00Z');
            dateObj.setUTCDate(dateObj.getUTCDate() - 1);
            expectedDate = dateObj.toISOString().split('T')[0];
          } else if (date < expectedDate) {
            break;
          }
        }
      }
    }

    const weekNum = getWeekNumber(new Date());

    // Generate the image
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
            fontFamily: 'system-ui, sans-serif',
            padding: '40px',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                fontSize: '48px',
              }}
            >
              🚬
            </div>
            <div
              style={{
                color: '#f59e0b',
                fontSize: '32px',
                fontWeight: 'bold',
              }}
            >
              PUFFED
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              color: 'white',
              fontSize: '28px',
              fontWeight: 'bold',
              marginBottom: '8px',
            }}
          >
            @{user.username}&apos;s Week {weekNum}
          </div>
          <div
            style={{
              color: '#9ca3af',
              fontSize: '18px',
              marginBottom: '32px',
            }}
          >
            My Smoke Journey This Week
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: 'flex',
              gap: '24px',
              marginBottom: '32px',
            }}
          >
            {/* Smokes */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '2px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '16px',
                padding: '24px 32px',
              }}
            >
              <div style={{ fontSize: '48px', color: '#f59e0b', fontWeight: 'bold' }}>
                {weeklyStats?.smokes || 0}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '16px', marginTop: '4px' }}>
                Smokes
              </div>
            </div>

            {/* Brands */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(236, 72, 153, 0.1)',
                border: '2px solid rgba(236, 72, 153, 0.3)',
                borderRadius: '16px',
                padding: '24px 32px',
              }}
            >
              <div style={{ fontSize: '48px', color: '#ec4899', fontWeight: 'bold' }}>
                {weeklyStats?.brands || 0}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '16px', marginTop: '4px' }}>
                Brands
              </div>
            </div>

            {/* Rating */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '2px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '16px',
                padding: '24px 32px',
              }}
            >
              <div style={{ fontSize: '48px', color: '#22c55e', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {weeklyStats?.avg_rating || '-'}
                <span style={{ fontSize: '24px' }}>⭐</span>
              </div>
              <div style={{ color: '#9ca3af', fontSize: '16px', marginTop: '4px' }}>
                Avg Rating
              </div>
            </div>

            {/* Streak */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(249, 115, 22, 0.1)',
                border: '2px solid rgba(249, 115, 22, 0.3)',
                borderRadius: '16px',
                padding: '24px 32px',
              }}
            >
              <div style={{ fontSize: '48px', color: '#f97316', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {currentStreak}
                <span style={{ fontSize: '24px' }}>🔥</span>
              </div>
              <div style={{ color: '#9ca3af', fontSize: '16px', marginTop: '4px' }}>
                Day Streak
              </div>
            </div>
          </div>

          {/* All-time stats */}
          <div
            style={{
              color: '#6b7280',
              fontSize: '16px',
              marginBottom: '24px',
            }}
          >
            {allTimeStats?.total_smokes || 0} total smokes • {allTimeStats?.total_brands || 0} brands discovered
          </div>

          {/* CTA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(90deg, #f59e0b, #ea580c)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '9999px',
              fontSize: '18px',
              fontWeight: 'bold',
            }}
          >
            Join me on puffed.pages.dev
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error("Share card error:", error);
    return new Response(`Error: ${error instanceof Error ? error.message : 'Unknown'}`, { status: 500 });
  }
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
