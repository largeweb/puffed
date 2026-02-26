import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

interface Legend {
  id: string;
  username: string;
  avatar_url: string | null;
  value: number;
  label: string;
}

interface LegendCategory {
  title: string;
  icon: string;
  description: string;
  legends: Legend[];
}

export async function GET() {
  const ctx = getRequestContext();
  const db = ctx.env.DB;

  try {
    // Most Check-ins (Smoke Kings)
    const smokeKings = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, COUNT(*) as count
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      GROUP BY c.user_id
      ORDER BY count DESC
      LIMIT 5
    `).all<{ id: string; username: string; avatar_url: string | null; count: number }>();

    // Longest Current Streak (Streak Masters)
    const streakMasters = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, u.current_streak as streak
      FROM users u
      WHERE u.current_streak > 0
      ORDER BY u.current_streak DESC
      LIMIT 5
    `).all<{ id: string; username: string; avatar_url: string | null; streak: number }>();

    // Most Unique Brands (Explorers)
    const explorers = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, COUNT(DISTINCT c.brand) as brands
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      GROUP BY c.user_id
      ORDER BY brands DESC
      LIMIT 5
    `).all<{ id: string; username: string; avatar_url: string | null; brands: number }>();

    // Most Followers (Influencers)
    const influencers = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, COUNT(f.follower_id) as followers
      FROM users u
      LEFT JOIN follows f ON f.following_id = u.id
      GROUP BY u.id
      ORDER BY followers DESC
      LIMIT 5
    `).all<{ id: string; username: string; avatar_url: string | null; followers: number }>();

    // Most Likes Received (Fan Favorites)
    const fanFavorites = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, COUNT(l.id) as likes
      FROM users u
      LEFT JOIN checkins c ON c.user_id = u.id
      LEFT JOIN likes l ON l.checkin_id = c.id
      GROUP BY u.id
      ORDER BY likes DESC
      LIMIT 5
    `).all<{ id: string; username: string; avatar_url: string | null; likes: number }>();

    // Most 5-Star Reviews (Connoisseurs)
    const connoisseurs = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, COUNT(*) as fives
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.rating = 5
      GROUP BY c.user_id
      ORDER BY fives DESC
      LIMIT 5
    `).all<{ id: string; username: string; avatar_url: string | null; fives: number }>();

    // Most Comments Given (Socialites)
    const socialites = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, COUNT(*) as comments
      FROM comments c
      JOIN users u ON c.user_id = u.id
      GROUP BY c.user_id
      ORDER BY comments DESC
      LIMIT 5
    `).all<{ id: string; username: string; avatar_url: string | null; comments: number }>();

    // Night Owls (Most late night smokes 10pm-4am)
    const nightOwls = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, COUNT(*) as night_smokes
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE (strftime('%H', datetime(c.created_at, 'unixepoch')) >= '22' 
         OR strftime('%H', datetime(c.created_at, 'unixepoch')) < '04')
      GROUP BY c.user_id
      ORDER BY night_smokes DESC
      LIMIT 5
    `).all<{ id: string; username: string; avatar_url: string | null; night_smokes: number }>();

    // Early Birds (Most morning smokes 5-9am)
    const earlyBirds = await db.prepare(`
      SELECT u.id, u.username, u.avatar_url, COUNT(*) as morning_smokes
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE strftime('%H', datetime(c.created_at, 'unixepoch')) >= '05' 
        AND strftime('%H', datetime(c.created_at, 'unixepoch')) < '09'
      GROUP BY c.user_id
      ORDER BY morning_smokes DESC
      LIMIT 5
    `).all<{ id: string; username: string; avatar_url: string | null; morning_smokes: number }>();

    // Platform Records
    const platformRecords = await db.prepare(`
      SELECT 
        MAX(current_streak) as max_streak,
        MAX(total_checkins) as max_checkins,
        (SELECT brand FROM checkins GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1) as top_brand,
        (SELECT COUNT(DISTINCT brand) FROM checkins) as total_brands,
        (SELECT COUNT(*) FROM checkins WHERE rating = 5) as total_fives
      FROM users
    `).first<{ 
      max_streak: number; 
      max_checkins: number;
      top_brand: string;
      total_brands: number;
      total_fives: number;
    }>();

    // Format the categories
    const categories: LegendCategory[] = [
      {
        title: 'Smoke Kings',
        icon: '👑',
        description: 'Most check-ins all-time',
        legends: smokeKings.results.map(r => ({
          id: r.id,
          username: r.username,
          avatar_url: r.avatar_url,
          value: r.count,
          label: `${r.count} smokes`
        }))
      },
      {
        title: 'Streak Masters',
        icon: '🔥',
        description: 'Longest active streaks',
        legends: streakMasters.results.map(r => ({
          id: r.id,
          username: r.username,
          avatar_url: r.avatar_url,
          value: r.streak,
          label: `${r.streak} day streak`
        }))
      },
      {
        title: 'Brand Explorers',
        icon: '🧭',
        description: 'Most unique brands tried',
        legends: explorers.results.map(r => ({
          id: r.id,
          username: r.username,
          avatar_url: r.avatar_url,
          value: r.brands,
          label: `${r.brands} brands`
        }))
      },
      {
        title: 'Fan Favorites',
        icon: '❤️',
        description: 'Most likes received',
        legends: fanFavorites.results.map(r => ({
          id: r.id,
          username: r.username,
          avatar_url: r.avatar_url,
          value: r.likes,
          label: `${r.likes} likes`
        }))
      },
      {
        title: 'Influencers',
        icon: '⭐',
        description: 'Most followers',
        legends: influencers.results.map(r => ({
          id: r.id,
          username: r.username,
          avatar_url: r.avatar_url,
          value: r.followers,
          label: `${r.followers} followers`
        }))
      },
      {
        title: 'Connoisseurs',
        icon: '🎯',
        description: 'Most 5-star reviews',
        legends: connoisseurs.results.map(r => ({
          id: r.id,
          username: r.username,
          avatar_url: r.avatar_url,
          value: r.fives,
          label: `${r.fives} perfect scores`
        }))
      },
      {
        title: 'Socialites',
        icon: '💬',
        description: 'Most comments given',
        legends: socialites.results.map(r => ({
          id: r.id,
          username: r.username,
          avatar_url: r.avatar_url,
          value: r.comments,
          label: `${r.comments} comments`
        }))
      },
      {
        title: 'Night Owls',
        icon: '🦉',
        description: 'Most late-night smokes',
        legends: nightOwls.results.map(r => ({
          id: r.id,
          username: r.username,
          avatar_url: r.avatar_url,
          value: r.night_smokes,
          label: `${r.night_smokes} night smokes`
        }))
      },
      {
        title: 'Early Birds',
        icon: '🌅',
        description: 'Most morning smokes',
        legends: earlyBirds.results.map(r => ({
          id: r.id,
          username: r.username,
          avatar_url: r.avatar_url,
          value: r.morning_smokes,
          label: `${r.morning_smokes} morning smokes`
        }))
      }
    ].filter(cat => cat.legends.length > 0);

    return NextResponse.json({
      categories,
      records: {
        longestStreak: platformRecords?.max_streak || 0,
        mostCheckins: platformRecords?.max_checkins || 0,
        topBrand: platformRecords?.top_brand || 'N/A',
        totalBrands: platformRecords?.total_brands || 0,
        totalFiveStars: platformRecords?.total_fives || 0
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Legends API error:', error);
    return NextResponse.json({ error: 'Failed to load legends' }, { status: 500 });
  }
}
