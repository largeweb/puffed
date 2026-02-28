'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FiArrowLeft, FiMapPin, FiShoppingBag, FiUsers,
  FiClock, FiAward, FiStar, FiTrendingUp
} from 'react-icons/fi';

interface ShopSaturdayData {
  isSaturday: boolean;
  isShopHours: boolean;
  currentHour: number;
  vibeMessage: string;
  hoursUntilOpen: number;
  hoursRemaining: number;
  todayShoppers: Array<{
    id: number;
    username: string;
    brand: string;
    product: string | null;
    rating: number;
    photoUrl: string | null;
    time: string;
    review: string | null;
  }>;
  weekendHauls: Array<{
    username: string;
    purchases: number;
    avgRating: number;
    topBrand: string | null;
  }>;
  todayStats: {
    totalPurchases: number;
    avgRating: number;
    topBrand: string | null;
    uniqueShoppers: number;
  };
  allTimeStats: {
    totalSaturdaySmokes: number;
    peakHour: number;
    favoriteBrand: string | null;
    topShopper: string | null;
  };
  userStats: {
    saturdayPurchases: number;
    favoriteBrand: string | null;
    rank: number | null;
    shopperTitle: string;
  } | null;
  popularBrands: Array<{
    brand: string;
    count: number;
    avgRating: number;
  }>;
}

export default function ShopSaturdayPage() {
  const [data, setData] = useState<ShopSaturdayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/shop-saturday')
      .then(res => res.json() as Promise<ShopSaturdayData>)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-teal-50 to-cyan-100 flex items-center justify-center">
        <div className="animate-pulse text-emerald-600 text-xl">🏪 Loading shop vibes...</div>
      </div>
    );
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getRankEmoji = (index: number) => {
    const emojis = ['🥇', '🥈', '🥉'];
    return emojis[index] || `${index + 1}.`;
  };

  const getShopperBadge = (count: number) => {
    if (count >= 20) return '🏆 Shop Legend';
    if (count >= 15) return '💎 VIP Shopper';
    if (count >= 10) return '🛍️ Regular';
    if (count >= 5) return '🏪 Weekend Warrior';
    if (count >= 1) return '👋 Shop Visitor';
    return '🌱 First Timer';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-teal-50 to-cyan-100 text-gray-800">
      {/* Floating shop elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-5xl opacity-20 animate-bounce" style={{ animationDuration: '4s' }}>🏪</div>
        <div className="absolute top-40 right-20 text-4xl opacity-20 animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }}>🛍️</div>
        <div className="absolute bottom-40 left-20 text-6xl opacity-20 animate-bounce" style={{ animationDuration: '6s', animationDelay: '2s' }}>🚬</div>
        <div className="absolute top-1/3 right-1/4 text-3xl opacity-30 animate-pulse" style={{ animationDuration: '3s' }}>💨</div>
        <div className="absolute bottom-1/3 left-1/3 text-4xl opacity-30 animate-pulse" style={{ animationDuration: '4s', animationDelay: '1.5s' }}>📦</div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 text-emerald-700 hover:text-emerald-900 transition-colors"
          >
            <FiArrowLeft />
            <span>Dashboard</span>
          </Link>
          <div className="flex gap-3">
            <Link 
              href="/lazy-saturday"
              className="text-2xl hover:scale-110 transition-transform"
              title="Lazy Saturday"
            >
              🛋️
            </Link>
            <Link 
              href="/brunch"
              className="text-2xl hover:scale-110 transition-transform"
              title="Brunch Club"
            >
              🥂
            </Link>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="text-7xl mb-4">🏪</div>
          <h1 className="text-4xl font-bold text-emerald-800 mb-2">
            Smoke Shop Saturday
          </h1>
          <p className="text-emerald-600 text-lg">
            {data?.vibeMessage || 'Weekend B&M adventures!'}
          </p>
          <p className="text-emerald-500 text-sm mt-2">
            9 AM - 6 PM • Prime shopping hours
          </p>
        </div>

        {/* Status Banner */}
        {data && (
          <div className={`rounded-2xl p-6 mb-8 text-center ${
            data.isShopHours && data.isSaturday
              ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-white'
              : 'bg-gray-200 text-gray-600'
          }`}>
            {data.isShopHours && data.isSaturday ? (
              <>
                <div className="text-3xl mb-2">🛍️ SHOPS ARE OPEN!</div>
                <p className="text-emerald-100">
                  {data.hoursRemaining} hour{data.hoursRemaining !== 1 ? 's' : ''} of shopping left today
                </p>
                <p className="text-emerald-200 text-sm mt-2">
                  🚬 Hit your local B&M and share your haul!
                </p>
              </>
            ) : !data.isSaturday ? (
              <>
                <div className="text-3xl mb-2">📅 Not Saturday</div>
                <p>Shop Saturday is every Saturday 9 AM - 6 PM</p>
                <p className="text-sm mt-2">But hey, shops are open other days too! 😉</p>
              </>
            ) : data.currentHour < 9 ? (
              <>
                <div className="text-3xl mb-2">⏰ Shops Opening Soon</div>
                <p>Prime shopping hours in {data.hoursUntilOpen} hour{data.hoursUntilOpen !== 1 ? 's' : ''}</p>
                <Link href="/coffee" className="inline-block mt-3 text-emerald-700 hover:underline">
                  ☕ Grab coffee while you wait!
                </Link>
              </>
            ) : (
              <>
                <div className="text-3xl mb-2">🌙 Shops Closed</div>
                <p>Hope you got some good finds today!</p>
                <Link href="/saturday-night" className="inline-block mt-3 text-emerald-700 hover:underline">
                  🎉 Time for Saturday Night →
                </Link>
              </>
            )}
          </div>
        )}

        {/* Personal Stats */}
        {data?.userStats && (
          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 mb-8 border border-emerald-200">
            <h2 className="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
              <FiShoppingBag className="text-emerald-500" />
              Your Saturday Shopping Stats
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-emerald-600">
                  {data.userStats.saturdayPurchases}
                </div>
                <div className="text-sm text-gray-600">Saturday Smokes</div>
              </div>
              <div>
                <div className="text-lg">
                  {data.userStats.shopperTitle}
                </div>
                <div className="text-sm text-gray-600">Shopper Status</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">
                  {data.userStats.rank ? `#${data.userStats.rank}` : '—'}
                </div>
                <div className="text-sm text-gray-600">Shop Rank</div>
              </div>
            </div>
            {data.userStats.favoriteBrand && (
              <div className="mt-4 text-center text-emerald-700">
                Go-to brand: <strong>{data.userStats.favoriteBrand}</strong>
              </div>
            )}
          </div>
        )}

        {/* Today's Shoppers */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-6 mb-8 border border-emerald-200">
          <h2 className="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
            <FiUsers className="text-emerald-500" />
            Today&apos;s Shop Visits
          </h2>
          {data?.todayShoppers && data.todayShoppers.length > 0 ? (
            <div className="space-y-3">
              {data.todayShoppers.map((shopper) => (
                <Link
                  key={shopper.id}
                  href={`/checkin/${shopper.id}`}
                  className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {shopper.photoUrl && (
                      <img 
                        src={shopper.photoUrl} 
                        alt="" 
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <div className="font-medium text-gray-800">{shopper.username}</div>
                      <div className="text-sm text-gray-600">{shopper.brand} {shopper.product && `• ${shopper.product}`}</div>
                      {shopper.review && (
                        <div className="text-xs text-emerald-600 truncate max-w-[200px]">
                          &quot;{shopper.review}&quot;
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-emerald-600">
                      <FiStar className="fill-emerald-400" />
                      {shopper.rating}
                    </div>
                    <div className="text-xs text-gray-500">{formatTime(shopper.time)}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🏪</div>
              <p>No shop visits logged yet today</p>
              <p className="text-sm">Be the first to share your haul!</p>
            </div>
          )}
        </div>

        {/* Today's Stats */}
        {data?.todayStats && data.isSaturday && (
          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 mb-8 border border-emerald-200">
            <h2 className="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
              <FiClock className="text-emerald-500" />
              Today&apos;s Shopping Stats
            </h2>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-emerald-600">
                  {data.todayStats.totalPurchases}
                </div>
                <div className="text-sm text-gray-600">Smokes Logged</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-emerald-600">
                  {data.todayStats.uniqueShoppers}
                </div>
                <div className="text-sm text-gray-600">Shoppers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-emerald-600">
                  {data.todayStats.avgRating || '—'}
                </div>
                <div className="text-sm text-gray-600">Avg Rating</div>
              </div>
              <div>
                <div className="text-lg font-bold text-emerald-600 truncate">
                  {data.todayStats.topBrand || '—'}
                </div>
                <div className="text-sm text-gray-600">Top Brand</div>
              </div>
            </div>
          </div>
        )}

        {/* Popular Brands This Saturday */}
        {data?.popularBrands && data.popularBrands.length > 0 && (
          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 mb-8 border border-emerald-200">
            <h2 className="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-emerald-500" />
              Popular Picks Today
            </h2>
            <div className="space-y-2">
              {data.popularBrands.slice(0, 5).map((brand, idx) => (
                <Link
                  key={brand.brand}
                  href={`/cigar/${encodeURIComponent(brand.brand)}`}
                  className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl w-8">{getRankEmoji(idx)}</span>
                    <span className="font-medium text-gray-800">{brand.brand}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-600">{brand.count} logged</div>
                    <div className="text-xs text-gray-500">Avg: ⭐ {brand.avgRating}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Weekend Haul Leaders */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-6 mb-8 border border-emerald-200">
          <h2 className="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
            <FiAward className="text-emerald-500" />
            Weekend Shopping Champions
          </h2>
          {data?.weekendHauls && data.weekendHauls.length > 0 ? (
            <div className="space-y-2">
              {data.weekendHauls.map((shopper, idx) => (
                <Link
                  key={shopper.username}
                  href={`/user/${shopper.username}`}
                  className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl w-8">{getRankEmoji(idx)}</span>
                    <div>
                      <span className="font-medium text-gray-800">{shopper.username}</span>
                      <span className="text-xs text-emerald-600 ml-2">
                        {getShopperBadge(shopper.purchases)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-600">{shopper.purchases} Saturday smokes</div>
                    <div className="text-xs text-gray-500">
                      {shopper.topBrand && `Fav: ${shopper.topBrand}`}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No Saturday shopping champions yet!</p>
            </div>
          )}
        </div>

        {/* All-Time Stats */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-6 mb-8 border border-emerald-200">
          <h2 className="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
            <FiMapPin className="text-emerald-500" />
            All-Time Saturday Stats
          </h2>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-emerald-600">
                {data?.allTimeStats.totalSaturdaySmokes || 0}
              </div>
              <div className="text-sm text-gray-600">Total Saturday Smokes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">
                {data?.allTimeStats.peakHour ? `${data.allTimeStats.peakHour > 12 ? data.allTimeStats.peakHour - 12 : data.allTimeStats.peakHour}${data.allTimeStats.peakHour >= 12 ? ' PM' : ' AM'}` : '—'}
              </div>
              <div className="text-sm text-gray-600">Peak Shopping Hour</div>
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-600 truncate">
                {data?.allTimeStats.favoriteBrand || '—'}
              </div>
              <div className="text-sm text-gray-600">Most Shopped Brand</div>
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-600 truncate">
                {data?.allTimeStats.topShopper || '—'}
              </div>
              <div className="text-sm text-gray-600">Top Shopper</div>
            </div>
          </div>
        </div>

        {/* Shop Tips */}
        <div className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-2xl p-6 mb-8 border border-emerald-200">
          <h2 className="text-xl font-bold text-emerald-800 mb-4 text-center">
            🏪 Saturday Shopping Tips
          </h2>
          <div className="space-y-3 text-emerald-700">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <p className="text-sm">Ask the staff for recommendations — they know the hidden gems!</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">📸</span>
              <p className="text-sm">Snap a photo of your haul to share with the community</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">⭐</span>
              <p className="text-sm">Rate your finds to help others discover great smokes</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <Link
            href="/checkin"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-medium transition-colors shadow-lg"
          >
            🛍️ Log Your Haul
          </Link>
          <p className="text-emerald-600 text-sm mt-3">
            Share what you picked up at the shop!
          </p>
        </div>
      </div>
    </div>
  );
}
