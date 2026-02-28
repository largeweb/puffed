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
  review: string | null;
}

interface LeaderRow {
  username: string;
  saturday_smokes: number;
  avg_rating: number;
  top_brand: string | null;
}

interface BrandRow {
  brand: string;
  count: number;
  avg_rating: number;
}

interface StatsRow {
  total_purchases: number;
  avg_rating: number;
  top_brand: string | null;
  unique_shoppers: number;
}

interface AllTimeRow {
  total_saturday_smokes: number;
  peak_hour: number;
  favorite_brand: string | null;
  top_shopper: string | null;
}

interface UserStatsRow {
  saturday_purchases: number;
  favorite_brand: string | null;
  rank: number | null;
}

function getShopperTitle(count: number): string {
  if (count >= 20) return '🏆 Shop Legend';
  if (count >= 15) return '💎 VIP Shopper';
  if (count >= 10) return '🛍️ Regular';
  if (count >= 5) return '🏪 Weekend Warrior';
  if (count >= 1) return '👋 Shop Visitor';
  return '🌱 First Timer';
}

function getVibeMessage(hour: number, isSaturday: boolean, isShopHours: boolean): string {
  if (!isSaturday) {
    return "It's not Saturday, but shops are always waiting!";
  }
  if (!isShopHours) {
    if (hour < 9) return "☕ Shops opening soon — coffee first?";
    return "🌙 Shops closed for the day — hope you found some gems!";
  }
  if (hour < 11) return "🌅 Early bird gets the best selection!";
  if (hour < 14) return "☀️ Prime shopping time — browse away!";
  if (hour < 17) return "🛍️ Afternoon haul hunters unite!";
  return "⏰ Last chance for Saturday shopping!";
}

export async function GET() {
  const db = getRequestContext().env.DB;
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  const now = new Date();
  // Adjust to Eastern time (UTC-5)
  const estOffset = -5 * 60;
  const utcOffset = now.getTimezoneOffset();
  const estTime = new Date(now.getTime() + (utcOffset + estOffset) * 60000);
  
  const dayOfWeek = estTime.getDay(); // 0 = Sunday, 6 = Saturday
  const currentHour = estTime.getHours();
  const isSaturday = dayOfWeek === 6;
  const isShopHours = currentHour >= 9 && currentHour < 18;
  
  const hoursUntilOpen = currentHour < 9 ? 9 - currentHour : 0;
  const hoursRemaining = isShopHours ? 18 - currentHour : 0;

  // Get today's date in EST for filtering
  const todayStr = estTime.toISOString().split('T')[0];

  // Today's shoppers (Saturday check-ins during shop hours 9 AM - 6 PM)
  const todayShoppersQuery = `
    SELECT c.id, u.username, c.brand, c.product, c.rating, c.photo_url, c.created_at, c.review
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE DATE(c.created_at, '-5 hours') = ?
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) >= 9
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) < 18
    ORDER BY c.created_at DESC
    LIMIT 15
  `;
  const todayShoppers = await db.prepare(todayShoppersQuery).bind(todayStr).all<CheckinRow>();

  // Today's stats
  const todayStatsQuery = `
    SELECT 
      COUNT(*) as total_purchases,
      ROUND(AVG(c.rating), 1) as avg_rating,
      (SELECT brand FROM checkins WHERE DATE(created_at, '-5 hours') = ?
         AND CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) >= 9
         AND CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) < 18
         GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1) as top_brand,
      COUNT(DISTINCT c.user_id) as unique_shoppers
    FROM checkins c
    WHERE DATE(c.created_at, '-5 hours') = ?
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) >= 9
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) < 18
  `;
  const todayStats = await db.prepare(todayStatsQuery).bind(todayStr, todayStr).first<StatsRow>();

  // Popular brands today
  const popularBrandsQuery = `
    SELECT brand, COUNT(*) as count, ROUND(AVG(rating), 1) as avg_rating
    FROM checkins
    WHERE DATE(created_at, '-5 hours') = ?
      AND CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) >= 9
      AND CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) < 18
    GROUP BY brand
    ORDER BY count DESC
    LIMIT 5
  `;
  const popularBrands = await db.prepare(popularBrandsQuery).bind(todayStr).all<BrandRow>();

  // Weekend shopping champions (all Saturdays, shop hours)
  const weekendHaulsQuery = `
    SELECT 
      u.username,
      COUNT(*) as saturday_smokes,
      ROUND(AVG(c.rating), 1) as avg_rating,
      (SELECT brand FROM checkins c2 
       WHERE c2.user_id = c.user_id 
         AND strftime('%w', c2.created_at, '-5 hours') = '6'
         AND CAST(strftime('%H', c2.created_at, '-5 hours') AS INTEGER) >= 9
         AND CAST(strftime('%H', c2.created_at, '-5 hours') AS INTEGER) < 18
       GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1) as top_brand
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE strftime('%w', c.created_at, '-5 hours') = '6'
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) >= 9
      AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) < 18
    GROUP BY c.user_id
    ORDER BY saturday_smokes DESC
    LIMIT 10
  `;
  const weekendHauls = await db.prepare(weekendHaulsQuery).all<LeaderRow>();

  // All-time Saturday stats
  const allTimeQuery = `
    SELECT 
      COUNT(*) as total_saturday_smokes,
      (SELECT CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) as hour
       FROM checkins 
       WHERE strftime('%w', created_at, '-5 hours') = '6'
         AND CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) >= 9
         AND CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) < 18
       GROUP BY hour ORDER BY COUNT(*) DESC LIMIT 1) as peak_hour,
      (SELECT brand FROM checkins 
       WHERE strftime('%w', created_at, '-5 hours') = '6'
         AND CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) >= 9
         AND CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) < 18
       GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1) as favorite_brand,
      (SELECT u.username FROM checkins c 
       JOIN users u ON c.user_id = u.id
       WHERE strftime('%w', c.created_at, '-5 hours') = '6'
         AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) >= 9
         AND CAST(strftime('%H', c.created_at, '-5 hours') AS INTEGER) < 18
       GROUP BY c.user_id ORDER BY COUNT(*) DESC LIMIT 1) as top_shopper
    FROM checkins
    WHERE strftime('%w', created_at, '-5 hours') = '6'
      AND CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) >= 9
      AND CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) < 18
  `;
  const allTimeStats = await db.prepare(allTimeQuery).first<AllTimeRow>();

  // User stats (if logged in)
  let userStats = null;
  if (userId) {
    const userStatsQuery = `
      SELECT 
        COUNT(*) as saturday_purchases,
        (SELECT brand FROM checkins 
         WHERE user_id = ? 
           AND strftime('%w', created_at, '-5 hours') = '6'
           AND CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) >= 9
           AND CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) < 18
         GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1) as favorite_brand
      FROM checkins
      WHERE user_id = ?
        AND strftime('%w', created_at, '-5 hours') = '6'
        AND CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) >= 9
        AND CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) < 18
    `;
    const userStatsRow = await db.prepare(userStatsQuery).bind(userId, userId).first<UserStatsRow>();
    
    // Get rank
    const rankQuery = `
      SELECT COUNT(*) + 1 as rank
      FROM (
        SELECT user_id, COUNT(*) as cnt
        FROM checkins
        WHERE strftime('%w', created_at, '-5 hours') = '6'
          AND CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) >= 9
          AND CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) < 18
        GROUP BY user_id
      ) ranked
      WHERE cnt > (
        SELECT COUNT(*) FROM checkins
        WHERE user_id = ?
          AND strftime('%w', created_at, '-5 hours') = '6'
          AND CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) >= 9
          AND CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) < 18
      )
    `;
    const rankRow = await db.prepare(rankQuery).bind(userId).first<{ rank: number }>();
    
    if (userStatsRow) {
      userStats = {
        saturdayPurchases: userStatsRow.saturday_purchases,
        favoriteBrand: userStatsRow.favorite_brand,
        rank: userStatsRow.saturday_purchases > 0 ? rankRow?.rank || null : null,
        shopperTitle: getShopperTitle(userStatsRow.saturday_purchases)
      };
    }
  }

  return Response.json({
    isSaturday,
    isShopHours,
    currentHour,
    vibeMessage: getVibeMessage(currentHour, isSaturday, isShopHours),
    hoursUntilOpen,
    hoursRemaining,
    todayShoppers: todayShoppers.results.map(s => ({
      id: s.id,
      username: s.username,
      brand: s.brand,
      product: s.product,
      rating: s.rating,
      photoUrl: s.photo_url,
      time: s.created_at,
      review: s.review
    })),
    weekendHauls: weekendHauls.results.map(w => ({
      username: w.username,
      purchases: w.saturday_smokes,
      avgRating: w.avg_rating,
      topBrand: w.top_brand
    })),
    todayStats: {
      totalPurchases: todayStats?.total_purchases || 0,
      avgRating: todayStats?.avg_rating || null,
      topBrand: todayStats?.top_brand || null,
      uniqueShoppers: todayStats?.unique_shoppers || 0
    },
    allTimeStats: {
      totalSaturdaySmokes: allTimeStats?.total_saturday_smokes || 0,
      peakHour: allTimeStats?.peak_hour || null,
      favoriteBrand: allTimeStats?.favorite_brand || null,
      topShopper: allTimeStats?.top_shopper || null
    },
    userStats,
    popularBrands: popularBrands.results.map(b => ({
      brand: b.brand,
      count: b.count,
      avgRating: b.avg_rating
    }))
  });
}
