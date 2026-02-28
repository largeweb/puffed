import { getRequestContext } from '@cloudflare/next-on-pages';
import { cookies } from 'next/headers';

export const runtime = 'edge';

const ZODIAC_SIGNS = [
  { sign: 'aries', symbol: '♈', name: 'Aries', dates: 'Mar 21 - Apr 19', element: 'Fire', startMonth: 3, startDay: 21, endMonth: 4, endDay: 19 },
  { sign: 'taurus', symbol: '♉', name: 'Taurus', dates: 'Apr 20 - May 20', element: 'Earth', startMonth: 4, startDay: 20, endMonth: 5, endDay: 20 },
  { sign: 'gemini', symbol: '♊', name: 'Gemini', dates: 'May 21 - Jun 20', element: 'Air', startMonth: 5, startDay: 21, endMonth: 6, endDay: 20 },
  { sign: 'cancer', symbol: '♋', name: 'Cancer', dates: 'Jun 21 - Jul 22', element: 'Water', startMonth: 6, startDay: 21, endMonth: 7, endDay: 22 },
  { sign: 'leo', symbol: '♌', name: 'Leo', dates: 'Jul 23 - Aug 22', element: 'Fire', startMonth: 7, startDay: 23, endMonth: 8, endDay: 22 },
  { sign: 'virgo', symbol: '♍', name: 'Virgo', dates: 'Aug 23 - Sep 22', element: 'Earth', startMonth: 8, startDay: 23, endMonth: 9, endDay: 22 },
  { sign: 'libra', symbol: '♎', name: 'Libra', dates: 'Sep 23 - Oct 22', element: 'Air', startMonth: 9, startDay: 23, endMonth: 10, endDay: 22 },
  { sign: 'scorpio', symbol: '♏', name: 'Scorpio', dates: 'Oct 23 - Nov 21', element: 'Water', startMonth: 10, startDay: 23, endMonth: 11, endDay: 21 },
  { sign: 'sagittarius', symbol: '♐', name: 'Sagittarius', dates: 'Nov 22 - Dec 21', element: 'Fire', startMonth: 11, startDay: 22, endMonth: 12, endDay: 21 },
  { sign: 'capricorn', symbol: '♑', name: 'Capricorn', dates: 'Dec 22 - Jan 19', element: 'Earth', startMonth: 12, startDay: 22, endMonth: 1, endDay: 19 },
  { sign: 'aquarius', symbol: '♒', name: 'Aquarius', dates: 'Jan 20 - Feb 18', element: 'Air', startMonth: 1, startDay: 20, endMonth: 2, endDay: 18 },
  { sign: 'pisces', symbol: '♓', name: 'Pisces', dates: 'Feb 19 - Mar 20', element: 'Water', startMonth: 2, startDay: 19, endMonth: 3, endDay: 20 },
];

const DAILY_PREDICTIONS = [
  "The stars align for an exceptional smoke today. Trust your palate.",
  "Today brings unexpected flavor discoveries. Try something new.",
  "A social smoke session could lead to meaningful connections.",
  "Your patience will be rewarded with a perfectly aged experience.",
  "The cosmos suggest a bold, full-bodied choice today.",
  "A mellow, contemplative smoke will bring clarity tonight.",
  "Share your favorites with someone special today.",
  "The universe hints at a surprise pairing that will delight.",
  "Today's smoke will spark creative inspiration.",
  "Evening hours hold the most auspicious smoking energy.",
  "A classic choice will bring comfort and satisfaction.",
  "Adventure awaits in an unfamiliar brand or blend.",
  "Your smoking intuition is particularly strong today.",
  "The late night hours will bring peaceful contemplation.",
  "A celebratory smoke is written in the stars.",
];

const LUCKY_BRANDS = [
  "Padron", "Arturo Fuente", "My Father", "Oliva", "Davidoff",
  "Ashton", "Rocky Patel", "Montecristo", "Romeo y Julieta", "Liga Privada",
  "Perdomo", "CAO", "Drew Estate", "Crowned Heads", "Tatuaje"
];

const LUCKY_FLAVORS = [
  "Cedar", "Leather", "Pepper", "Coffee", "Chocolate",
  "Earth", "Cream", "Nuts", "Spice", "Wood",
  "Honey", "Cocoa", "Vanilla", "Citrus", "Toast"
];

const LUCKY_TIMES = [
  "Golden Hour (5-7 PM)", "Late Night (11 PM - 1 AM)", "Early Morning (6-8 AM)",
  "Afternoon Break (2-4 PM)", "Midnight Hour", "Weekend Brunch", "Post-Dinner",
  "Dawn Patrol (5-6 AM)", "Twilight (8-9 PM)", "The Witching Hour (3 AM)"
];

const ELEMENT_TRAITS = {
  Fire: { trait: "Bold and adventurous", suggestion: "Full-bodied cigars match your fiery spirit" },
  Earth: { trait: "Grounded and patient", suggestion: "Well-aged classics suit your refined taste" },
  Air: { trait: "Social and curious", suggestion: "Variety and sharing enhance your experience" },
  Water: { trait: "Intuitive and reflective", suggestion: "Contemplative solo sessions feed your soul" }
};

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export async function GET(request: Request) {
  const { env } = getRequestContext();
  const db = env.DB;
  
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  
  if (!sessionToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await db.prepare(
    'SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?'
  ).bind(sessionToken, Date.now()).first<{ user_id: string }>();

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const selectedSign = url.searchParams.get('sign')?.toLowerCase();
  
  // Get user's saved zodiac preference
  const user = await db.prepare(
    'SELECT username, zodiac_sign FROM users WHERE id = ?'
  ).bind(session.user_id).first<{ username: string; zodiac_sign: string | null }>();

  const now = new Date();
  const dayOfYear = getDayOfYear(now);
  const year = now.getFullYear();
  
  // Use selected sign, or user's saved sign, or null
  const currentSign = selectedSign || user?.zodiac_sign || null;
  const zodiacInfo = currentSign ? ZODIAC_SIGNS.find(z => z.sign === currentSign) : null;
  
  // Get user's smoking stats for personalized predictions
  const stats = await db.prepare(`
    SELECT 
      COUNT(*) as totalSmokes,
      AVG(rating) as avgRating,
      (SELECT brand FROM checkins WHERE user_id = ? GROUP BY brand ORDER BY COUNT(*) DESC LIMIT 1) as favBrand
    FROM checkins 
    WHERE user_id = ?
  `).bind(session.user_id, session.user_id).first<{ totalSmokes: number; avgRating: number | null; favBrand: string | null }>();

  // Generate deterministic daily predictions based on sign + day
  const signIndex = zodiacInfo ? ZODIAC_SIGNS.indexOf(zodiacInfo) : 0;
  const seed = year * 1000 + dayOfYear + signIndex * 100;
  const random = seededRandom(seed);
  
  const predictionIndex = Math.floor(random() * DAILY_PREDICTIONS.length);
  const brandIndex = Math.floor(random() * LUCKY_BRANDS.length);
  const flavorIndex = Math.floor(random() * LUCKY_FLAVORS.length);
  const timeIndex = Math.floor(random() * LUCKY_TIMES.length);
  const luckyNumber = Math.floor(random() * 9) + 1;
  const compatibleSignIndex = Math.floor(random() * 12);
  
  // Compatibility rating (1-5 stars) for the day
  const dailyStars = Math.floor(random() * 3) + 3; // 3-5 stars range
  
  // Get community stats for this sign
  const signUsers = zodiacInfo ? await db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE zodiac_sign = ?
  `).bind(currentSign).first<{ count: number }>() : null;
  
  // Get today's check-ins from users with same sign
  const signCheckins = zodiacInfo ? await db.prepare(`
    SELECT c.brand, c.rating, u.username
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE u.zodiac_sign = ?
    AND c.created_at > ?
    ORDER BY c.created_at DESC
    LIMIT 5
  `).bind(currentSign, Date.now() - 24 * 60 * 60 * 1000).all<{ brand: string; rating: number; username: string }>() : null;

  return Response.json({
    allSigns: ZODIAC_SIGNS.map(z => ({ sign: z.sign, symbol: z.symbol, name: z.name, dates: z.dates })),
    currentSign: zodiacInfo ? {
      ...zodiacInfo,
      elementTraits: ELEMENT_TRAITS[zodiacInfo.element as keyof typeof ELEMENT_TRAITS]
    } : null,
    userZodiac: user?.zodiac_sign || null,
    username: user?.username,
    dailyReading: zodiacInfo ? {
      prediction: DAILY_PREDICTIONS[predictionIndex],
      luckyBrand: LUCKY_BRANDS[brandIndex],
      luckyFlavor: LUCKY_FLAVORS[flavorIndex],
      luckyTime: LUCKY_TIMES[timeIndex],
      luckyNumber,
      dailyStars,
      compatibleSign: ZODIAC_SIGNS[compatibleSignIndex].name,
      date: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    } : null,
    personalInsights: {
      totalSmokes: stats?.totalSmokes || 0,
      avgRating: stats?.avgRating ? Number(stats.avgRating).toFixed(1) : null,
      favBrand: stats?.favBrand || null
    },
    communityStats: zodiacInfo ? {
      signUsers: signUsers?.count || 0,
      recentCheckins: signCheckins?.results || []
    } : null
  });
}

export async function POST(request: Request) {
  const { env } = getRequestContext();
  const db = env.DB;
  
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  
  if (!sessionToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await db.prepare(
    'SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?'
  ).bind(sessionToken, Date.now()).first<{ user_id: string }>();

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { sign: string };
  const sign = body.sign?.toLowerCase();
  
  if (!sign || !ZODIAC_SIGNS.find(z => z.sign === sign)) {
    return Response.json({ error: 'Invalid zodiac sign' }, { status: 400 });
  }

  // Save zodiac sign to user profile
  await db.prepare(
    'UPDATE users SET zodiac_sign = ? WHERE id = ?'
  ).bind(sign, session.user_id).run();

  return Response.json({ success: true, sign });
}
