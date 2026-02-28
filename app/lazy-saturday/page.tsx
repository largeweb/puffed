'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FiArrowLeft, FiCoffee, FiStar, FiUsers,
  FiClock, FiAward, FiSun, FiMoon
} from 'react-icons/fi';

interface LazySaturdayData {
  isSaturday: boolean;
  isLazyHours: boolean;
  currentHour: number;
  vibeMessage: string;
  hoursUntilLazy: number;
  hoursRemaining: number;
  currentSmokers: Array<{
    id: number;
    username: string;
    brand: string;
    product: string | null;
    rating: number;
    photoUrl: string | null;
    time: string;
  }>;
  lazyLegends: Array<{
    username: string;
    saturdaySmokes: number;
    avgRating: number;
  }>;
  todayStats: {
    totalSmokes: number;
    avgRating: number;
    topBrand: string | null;
  };
  allTimeStats: {
    totalSmokes: number;
    peakHour: number;
    favoriteBrand: string | null;
  };
  userStats: {
    totalLazySaturdays: number;
    favoriteBrand: string | null;
    rank: number | null;
  } | null;
}

export default function LazySaturdayPage() {
  const [data, setData] = useState<LazySaturdayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/lazy-saturday')
      .then(res => res.json() as Promise<LazySaturdayData>)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-100 flex items-center justify-center">
        <div className="animate-pulse text-amber-600 text-xl">🛋️ Loading lazy vibes...</div>
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

  const getLazyTitle = (count: number) => {
    if (count >= 20) return '🦥 Supreme Sloth';
    if (count >= 15) return '😴 Nap Champion';
    if (count >= 10) return '🛋️ Couch King';
    if (count >= 5) return '☕ Weekend Warrior';
    if (count >= 1) return '🌅 Afternoon Enthusiast';
    return '🌱 Lazy Newbie';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-100 text-gray-800">
      {/* Lazy floating elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-6xl opacity-20 animate-bounce" style={{ animationDuration: '4s' }}>☁️</div>
        <div className="absolute top-40 right-20 text-5xl opacity-20 animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }}>☁️</div>
        <div className="absolute bottom-40 left-20 text-7xl opacity-20 animate-bounce" style={{ animationDuration: '6s', animationDelay: '2s' }}>☁️</div>
        <div className="absolute top-1/3 right-1/4 text-4xl opacity-30 animate-pulse" style={{ animationDuration: '3s' }}>💤</div>
        <div className="absolute bottom-1/3 left-1/3 text-3xl opacity-30 animate-pulse" style={{ animationDuration: '4s', animationDelay: '1.5s' }}>💤</div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 text-amber-700 hover:text-amber-900 transition-colors"
          >
            <FiArrowLeft />
            <span>Dashboard</span>
          </Link>
          <div className="flex gap-3">
            <Link 
              href="/saturday-cartoons"
              className="text-2xl hover:scale-110 transition-transform"
              title="Saturday Morning Cartoons"
            >
              📺
            </Link>
            <Link 
              href="/saturday-night"
              className="text-2xl hover:scale-110 transition-transform"
              title="Saturday Night"
            >
              🎉
            </Link>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="text-7xl mb-4">🛋️</div>
          <h1 className="text-4xl font-bold text-amber-800 mb-2">
            Lazy Saturday Lounge
          </h1>
          <p className="text-amber-600 text-lg">
            {data?.vibeMessage}
          </p>
          <p className="text-amber-500 text-sm mt-2">
            12 PM - 6 PM • Peak couch potato hours
          </p>
        </div>

        {/* Status Banner */}
        {data && (
          <div className={`rounded-2xl p-6 mb-8 text-center ${
            data.isLazyHours && data.isSaturday
              ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white'
              : 'bg-gray-200 text-gray-600'
          }`}>
            {data.isLazyHours && data.isSaturday ? (
              <>
                <div className="text-3xl mb-2">😌 LAZY MODE ACTIVE</div>
                <p className="text-amber-100">
                  {data.hoursRemaining} hour{data.hoursRemaining !== 1 ? 's' : ''} of lazy left
                </p>
              </>
            ) : !data.isSaturday ? (
              <>
                <div className="text-3xl mb-2">📅 Not Saturday</div>
                <p>The lazy lounge opens every Saturday 12-6 PM</p>
              </>
            ) : data.currentHour < 12 ? (
              <>
                <div className="text-3xl mb-2">⏰ Coming Soon</div>
                <p>Lazy hours start in {data.hoursUntilLazy} hour{data.hoursUntilLazy !== 1 ? 's' : ''}</p>
                <Link href="/saturday-cartoons" className="inline-block mt-3 text-amber-700 hover:underline">
                  📺 Catch Saturday Morning Cartoons instead!
                </Link>
              </>
            ) : (
              <>
                <div className="text-3xl mb-2">🌙 Lazy Hours Over</div>
                <p>Time for Saturday Night festivities!</p>
                <Link href="/saturday-night" className="inline-block mt-3 text-amber-700 hover:underline">
                  🎉 Head to Saturday Night →
                </Link>
              </>
            )}
          </div>
        )}

        {/* Personal Stats */}
        {data?.userStats && (
          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 mb-8 border border-amber-200">
            <h2 className="text-xl font-bold text-amber-800 mb-4 flex items-center gap-2">
              <FiSun className="text-amber-500" />
              Your Lazy Saturday Stats
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-amber-600">
                  {data.userStats.totalLazySaturdays}
                </div>
                <div className="text-sm text-gray-600">Lazy Smokes</div>
              </div>
              <div>
                <div className="text-xl">
                  {getLazyTitle(data.userStats.totalLazySaturdays)}
                </div>
                <div className="text-sm text-gray-600">Your Title</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">
                  {data.userStats.rank ? `#${data.userStats.rank}` : '—'}
                </div>
                <div className="text-sm text-gray-600">Lazy Rank</div>
              </div>
            </div>
            {data.userStats.favoriteBrand && (
              <div className="mt-4 text-center text-amber-700">
                Lazy day favorite: <strong>{data.userStats.favoriteBrand}</strong>
              </div>
            )}
          </div>
        )}

        {/* Today's Lazy Smokers */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-6 mb-8 border border-amber-200">
          <h2 className="text-xl font-bold text-amber-800 mb-4 flex items-center gap-2">
            <FiCoffee className="text-amber-500" />
            Today&apos;s Lazy Smokers
          </h2>
          {data?.currentSmokers && data.currentSmokers.length > 0 ? (
            <div className="space-y-3">
              {data.currentSmokers.map((smoker) => (
                <Link
                  key={smoker.id}
                  href={`/checkin/${smoker.id}`}
                  className="flex items-center justify-between p-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {smoker.photoUrl && (
                      <img 
                        src={smoker.photoUrl} 
                        alt="" 
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <div className="font-medium text-gray-800">{smoker.username}</div>
                      <div className="text-sm text-gray-600">{smoker.brand}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-600">
                      <FiStar className="fill-amber-400" />
                      {smoker.rating}
                    </div>
                    <div className="text-xs text-gray-500">{formatTime(smoker.time)}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">😴</div>
              <p>No lazy smokers yet today</p>
              <p className="text-sm">Be the first to embrace the lazy!</p>
            </div>
          )}
        </div>

        {/* Today's Stats */}
        {data?.todayStats && data.isSaturday && (
          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 mb-8 border border-amber-200">
            <h2 className="text-xl font-bold text-amber-800 mb-4 flex items-center gap-2">
              <FiClock className="text-amber-500" />
              Today&apos;s Lazy Stats
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-amber-600">
                  {data.todayStats.totalSmokes}
                </div>
                <div className="text-sm text-gray-600">Lazy Smokes</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-amber-600">
                  {data.todayStats.avgRating || '—'}
                </div>
                <div className="text-sm text-gray-600">Avg Rating</div>
              </div>
              <div>
                <div className="text-xl font-bold text-amber-600 truncate">
                  {data.todayStats.topBrand || '—'}
                </div>
                <div className="text-sm text-gray-600">Top Brand</div>
              </div>
            </div>
          </div>
        )}

        {/* Lazy Legends Leaderboard */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-6 mb-8 border border-amber-200">
          <h2 className="text-xl font-bold text-amber-800 mb-4 flex items-center gap-2">
            <FiAward className="text-amber-500" />
            Lazy Saturday Legends
          </h2>
          {data?.lazyLegends && data.lazyLegends.length > 0 ? (
            <div className="space-y-2">
              {data.lazyLegends.map((legend, idx) => (
                <Link
                  key={legend.username}
                  href={`/user/${legend.username}`}
                  className="flex items-center justify-between p-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl w-8">{getRankEmoji(idx)}</span>
                    <span className="font-medium text-gray-800">{legend.username}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-amber-600">{legend.saturdaySmokes} lazy smokes</div>
                    <div className="text-xs text-gray-500">Avg: ⭐ {legend.avgRating}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No lazy legends yet... be the first!</p>
            </div>
          )}
        </div>

        {/* All-Time Stats */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-6 mb-8 border border-amber-200">
          <h2 className="text-xl font-bold text-amber-800 mb-4 flex items-center gap-2">
            <FiUsers className="text-amber-500" />
            All-Time Lazy Saturday Stats
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-amber-600">
                {data?.allTimeStats.totalSmokes || 0}
              </div>
              <div className="text-sm text-gray-600">Total Lazy Smokes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">
                {data?.allTimeStats.peakHour ? `${data.allTimeStats.peakHour > 12 ? data.allTimeStats.peakHour - 12 : data.allTimeStats.peakHour} PM` : '—'}
              </div>
              <div className="text-sm text-gray-600">Peak Lazy Hour</div>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-600 truncate">
                {data?.allTimeStats.favoriteBrand || '—'}
              </div>
              <div className="text-sm text-gray-600">Fav Lazy Brand</div>
            </div>
          </div>
        </div>

        {/* Saturday Journey */}
        <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-6 border border-amber-200">
          <h2 className="text-xl font-bold text-amber-800 mb-4 text-center">
            🌅 Your Saturday Journey
          </h2>
          <div className="flex justify-between items-center">
            <Link 
              href="/saturday-cartoons"
              className="text-center p-4 rounded-xl hover:bg-white/50 transition-colors flex-1"
            >
              <div className="text-3xl mb-1">📺</div>
              <div className="text-sm font-medium text-amber-700">Morning</div>
              <div className="text-xs text-amber-600">6 AM - 12 PM</div>
            </Link>
            <div className="text-2xl text-amber-400">→</div>
            <div className="text-center p-4 rounded-xl bg-amber-200/50 flex-1">
              <div className="text-3xl mb-1">🛋️</div>
              <div className="text-sm font-medium text-amber-700">Afternoon</div>
              <div className="text-xs text-amber-600">12 PM - 6 PM</div>
            </div>
            <div className="text-2xl text-amber-400">→</div>
            <Link 
              href="/saturday-night"
              className="text-center p-4 rounded-xl hover:bg-white/50 transition-colors flex-1"
            >
              <div className="text-3xl mb-1">🎉</div>
              <div className="text-sm font-medium text-amber-700">Night</div>
              <div className="text-xs text-amber-600">8 PM - 4 AM</div>
            </Link>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <Link
            href="/checkin"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-medium transition-colors shadow-lg"
          >
            🛋️ Log a Lazy Smoke
          </Link>
        </div>
      </div>
    </div>
  );
}
