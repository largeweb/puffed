import { getRequestContext } from '@cloudflare/next-on-pages';
import { cookies } from 'next/headers';

export const runtime = 'edge';

interface CheckinRow {
  id: number;
  username: string;
  brand: string;
  product: string | null;
  rating: number;
  photo_url: string | null;
  created_at: string;
}

interface UserStatsRow {
  username: string;
  saturday_smokes: number;
  avg_rating: number;
}

interface BrandRow {
  brand: string;
}

interface CountRow {
  count: number;
}

interface AvgRow {
  avg: number | null;
}

interface HourRow {
  hour: number;
  count: number;
}

export async function GET() {
  const db = getRequestContext().env.DB;
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  const username = cookieStore.get('username')?.value;
  
  const now = new Date();
  // Adjust to Eastern time (UTC-5)
  const estOffset = -5 * 60;
  const utcOffset = now.getTimezoneOffset();
  const estTime = new Date(now.getTime() + (utcOffset + estOffset) * 60000);
  
  const day = estTime.getDay();
  const hour = estTime.getHours();
  const isSaturday = day === 6;
  const isLazyHours = hour >= 12 && hour < 18; // 12 PM - 6 PM
  
  const todayStr = estTime.toISOString().split('T')[0];
  
  // Get current lazy Saturday smokers (today 12-6 PM)
  const currentSmokersResult = await db.prepare(`
    SELECT c.id, u.username, c.brand, c.product, c.rating, c.photo_url, c.created_at
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE DATE(c.created_at, '-5 hours') = ?
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) >= 12
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) < 18
      AND strftime('%w', c.created_at, '-5 hours') = '6'
    ORDER BY c.created_at DESC
    LIMIT 10
  `).bind(todayStr).all<CheckinRow>();
  
  // Get all-time lazy Saturday legends (most afternoon smokes on Saturdays)
  const legendsResult = await db.prepare(`
    SELECT u.username,
           COUNT(*) as saturday_smokes,
           ROUND(AVG(c.rating), 1) as avg_rating
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE strftime('%w', c.created_at, '-5 hours') = '6'
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) >= 12
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) < 18
    GROUP BY u.id
    ORDER BY saturday_smokes DESC, avg_rating DESC
    LIMIT 10
  `).all<UserStatsRow>();
  
  // Today's lazy Saturday stats
  const todayStatsCount = await db.prepare(`
    SELECT COUNT(*) as count
    FROM checkins c
    WHERE DATE(c.created_at, '-5 hours') = ?
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) >= 12
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) < 18
      AND strftime('%w', c.created_at, '-5 hours') = '6'
  `).bind(todayStr).first<CountRow>();
  
  const todayAvg = await db.prepare(`
    SELECT ROUND(AVG(c.rating), 1) as avg
    FROM checkins c
    WHERE DATE(c.created_at, '-5 hours') = ?
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) >= 12
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) < 18
      AND strftime('%w', c.created_at, '-5 hours') = '6'
  `).bind(todayStr).first<AvgRow>();
  
  const todayTopBrand = await db.prepare(`
    SELECT c.brand
    FROM checkins c
    WHERE DATE(c.created_at, '-5 hours') = ?
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) >= 12
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) < 18
      AND strftime('%w', c.created_at, '-5 hours') = '6'
    GROUP BY c.brand
    ORDER BY COUNT(*) DESC
    LIMIT 1
  `).bind(todayStr).first<BrandRow>();
  
  // All-time lazy Saturday stats
  const allTimeCount = await db.prepare(`
    SELECT COUNT(*) as count
    FROM checkins c
    WHERE strftime('%w', c.created_at, '-5 hours') = '6'
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) >= 12
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) < 18
  `).first<CountRow>();
  
  const allTimePeakHour = await db.prepare(`
    SELECT CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) as hour, COUNT(*) as count
    FROM checkins c
    WHERE strftime('%w', c.created_at, '-5 hours') = '6'
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) >= 12
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) < 18
    GROUP BY hour
    ORDER BY count DESC
    LIMIT 1
  `).first<HourRow>();
  
  const allTimeFavBrand = await db.prepare(`
    SELECT c.brand
    FROM checkins c
    WHERE strftime('%w', c.created_at, '-5 hours') = '6'
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) >= 12
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) < 18
    GROUP BY c.brand
    ORDER BY COUNT(*) DESC
    LIMIT 1
  `).first<BrandRow>();
  
  // User's personal lazy Saturday stats
  let userStats = null;
  if (userId) {
    const userCount = await db.prepare(`
      SELECT COUNT(*) as count
      FROM checkins c
      WHERE c.user_id = ?
        AND strftime('%w', c.created_at, '-5 hours') = '6'
        AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) >= 12
        AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) < 18
    `).bind(userId).first<CountRow>();
    
    const userFavBrand = await db.prepare(`
      SELECT c.brand
      FROM checkins c
      WHERE c.user_id = ?
        AND strftime('%w', c.created_at, '-5 hours') = '6'
        AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) >= 12
        AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) < 18
      GROUP BY c.brand
      ORDER BY COUNT(*) DESC
      LIMIT 1
    `).bind(userId).first<BrandRow>();
    
    // Get user's rank
    const userRank = legendsResult.results?.findIndex(
      (l) => l.username === username
    );
    
    userStats = {
      totalLazySaturdays: userCount?.count || 0,
      favoriteBrand: userFavBrand?.brand || null,
      rank: userRank !== undefined && userRank >= 0 ? userRank + 1 : null
    };
  }
  
  // Fun lazy vibes based on time
  const getVibeMessage = () => {
    if (!isSaturday) return "Come back Saturday for the lazy vibes! 🛋️";
    if (hour < 12) return "Lazy hours start at noon... patience, grasshopper 🧘";
    if (hour >= 18) return "Lazy hours are over! Time for Saturday Night! 🎉";
    if (hour === 12) return "The lazy afternoon begins... 🌅";
    if (hour === 13) return "Post-lunch perfection 🥱";
    if (hour === 14) return "Peak lazy hours 😴";
    if (hour === 15) return "Maximum couch potato energy 🛋️";
    if (hour === 16) return "The golden lazy hour ✨";
    if (hour === 17) return "Last call for lazy vibes! ⏰";
    return "Embrace the lazy 🦥";
  };
  
  return Response.json({
    isSaturday,
    isLazyHours,
    currentHour: hour,
    vibeMessage: getVibeMessage(),
    hoursUntilLazy: !isLazyHours && hour < 12 ? 12 - hour : 0,
    hoursRemaining: isLazyHours ? 18 - hour : 0,
    currentSmokers: currentSmokersResult.results?.map(c => ({
      id: c.id,
      username: c.username,
      brand: c.brand,
      product: c.product,
      rating: c.rating,
      photoUrl: c.photo_url,
      time: c.created_at
    })) || [],
    lazyLegends: legendsResult.results?.map(l => ({
      username: l.username,
      saturdaySmokes: l.saturday_smokes,
      avgRating: l.avg_rating
    })) || [],
    todayStats: {
      totalSmokes: todayStatsCount?.count || 0,
      avgRating: todayAvg?.avg || 0,
      topBrand: todayTopBrand?.brand || null
    },
    allTimeStats: {
      totalSmokes: allTimeCount?.count || 0,
      peakHour: allTimePeakHour?.hour || 14,
      favoriteBrand: allTimeFavBrand?.brand || null
    },
    userStats
  });
}
