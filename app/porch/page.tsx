'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FiArrowLeft, FiSun, FiCloud, FiStar, FiUsers,
  FiClock, FiAward, FiWind
} from 'react-icons/fi';

interface PorchData {
  isSunday: boolean;
  currentHour: number;
  timeOfDay: string;
  porchMood: string;
  currentSitters: Array<{
    id: number;
    username: string;
    brand: string;
    product: string | null;
    rating: number;
    photoUrl: string | null;
    time: string;
  }>;
  porchRegulars: Array<{
    username: string;
    sundaySmokes: number;
    avgRating: number;
    favoriteSpot: string;
  }>;
  todayStats: {
    totalSmokes: number;
    avgRating: number;
    topBrand: string | null;
    peaceLevel: string;
  };
  allTimeStats: {
    totalSundaySmokes: number;
    mostPopularHour: number;
    favoriteBrand: string | null;
    avgSessionLength: number;
  };
  userStats: {
    totalPorchSessions: number;
    favoriteBrand: string | null;
    longestStreak: number;
    rank: number | null;
  } | null;
  neighborhoodVibes: string[];
}

export default function PorchPage() {
  const [data, setData] = useState<PorchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rockingSpeed, setRockingSpeed] = useState(1);

  useEffect(() => {
    fetch('/api/porch')
      .then(res => res.json() as Promise<PorchData>)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Slow rocking animation
  useEffect(() => {
    const interval = setInterval(() => {
      setRockingSpeed(prev => prev === 1 ? 0.98 : 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-100 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="animate-pulse text-amber-700 text-xl">🪑 Setting up the rocking chair...</div>
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

  const getPorchTitle = (count: number) => {
    if (count >= 30) return '👴 Porch Elder';
    if (count >= 20) return '🪑 Rocking Master';
    if (count >= 15) return '🍂 Sunday Regular';
    if (count >= 10) return '☕ Porch Dweller';
    if (count >= 5) return '🌅 Sunset Watcher';
    if (count >= 1) return '🌱 New Neighbor';
    return '👋 Just Visiting';
  };

  const getTimeEmoji = () => {
    const hour = data?.currentHour || 12;
    if (hour < 8) return '🌅';
    if (hour < 12) return '☀️';
    if (hour < 17) return '🌤️';
    if (hour < 20) return '🌇';
    return '🌙';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-100 via-orange-50 to-yellow-50 text-gray-800">
      {/* Ambient porch elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Floating leaves */}
        <div className="absolute top-20 left-10 text-4xl opacity-30 animate-bounce" 
             style={{ animationDuration: '8s' }}>🍂</div>
        <div className="absolute top-32 right-16 text-3xl opacity-25 animate-bounce" 
             style={{ animationDuration: '10s', animationDelay: '2s' }}>🍃</div>
        <div className="absolute bottom-40 left-1/4 text-3xl opacity-20 animate-bounce" 
             style={{ animationDuration: '12s', animationDelay: '4s' }}>🍂</div>
        
        {/* Birds */}
        <div className="absolute top-16 right-1/3 text-2xl opacity-40 animate-pulse"
             style={{ animationDuration: '4s' }}>🐦</div>
        
        {/* Gentle breeze indicator */}
        <div className="absolute bottom-20 right-10 text-5xl opacity-20 animate-pulse"
             style={{ animationDuration: '6s' }}>💨</div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-amber-700 hover:text-amber-900 transition-colors">
            <FiArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
          <div className="flex items-center gap-2 text-amber-600">
            <FiWind className="w-5 h-5" />
            <span className="text-sm">Gentle Breeze</span>
          </div>
        </div>

        {/* Main Title with Rocking Chair */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4" style={{ 
            transform: `rotate(${rockingSpeed === 1 ? '2deg' : '-2deg'})`,
            transition: 'transform 3s ease-in-out'
          }}>
            🪑
          </div>
          <h1 className="text-4xl font-bold text-amber-800 mb-2">The Porch</h1>
          <p className="text-amber-600 text-lg">
            {data?.isSunday 
              ? `${getTimeEmoji()} ${data?.porchMood || 'Sunday on the porch. Nothing to do, nowhere to be.'}`
              : '🗓️ Come back Sunday for porch time'}
          </p>
        </div>

        {!data?.isSunday ? (
          /* Not Sunday - Show preview */
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-amber-200 text-center">
            <div className="text-6xl mb-4">🪑</div>
            <h2 className="text-2xl font-bold text-amber-800 mb-4">The Porch is a Sunday Tradition</h2>
            <p className="text-amber-700 mb-6">
              Every Sunday, we sit on the porch. No rush. No agenda. 
              Just good smoke, good vibes, and watching the world go by.
            </p>
            <div className="grid grid-cols-3 gap-4 text-center mb-6">
              <div className="bg-amber-50 rounded-xl p-4">
                <div className="text-2xl mb-1">☀️</div>
                <div className="text-xs text-amber-600">Morning Coffee</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <div className="text-2xl mb-1">🌤️</div>
                <div className="text-xs text-amber-600">Afternoon Ease</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <div className="text-2xl mb-1">🌇</div>
                <div className="text-xs text-amber-600">Evening Glow</div>
              </div>
            </div>
            <p className="text-sm text-amber-500">See you Sunday 🪑</p>
          </div>
        ) : (
          <>
            {/* Today's Porch Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-amber-200">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <FiUsers className="w-5 h-5" />
                  <span className="text-sm">On the Porch</span>
                </div>
                <div className="text-3xl font-bold text-amber-800">{data?.todayStats.totalSmokes || 0}</div>
                <div className="text-xs text-amber-500">folks today</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-amber-200">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <FiStar className="w-5 h-5" />
                  <span className="text-sm">Vibe Check</span>
                </div>
                <div className="text-3xl font-bold text-amber-800">{data?.todayStats.peaceLevel || '😌'}</div>
                <div className="text-xs text-amber-500">peace level</div>
              </div>
            </div>

            {/* Neighborhood Vibes */}
            {data?.neighborhoodVibes && data.neighborhoodVibes.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-amber-200 mb-8">
                <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
                  <span>🏘️</span> Neighborhood Sounds
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.neighborhoodVibes.map((vibe, i) => (
                    <span key={i} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                      {vibe}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Currently on the Porch */}
            {data?.currentSitters && data.currentSitters.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-amber-200 mb-8">
                <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
                  <span>🪑</span> Currently Sitting
                </h3>
                <div className="space-y-3">
                  {data.currentSitters.map((sitter) => (
                    <Link 
                      key={sitter.id} 
                      href={`/checkin/${sitter.id}`}
                      className="flex items-center gap-4 p-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
                    >
                      {sitter.photoUrl ? (
                        <img src={sitter.photoUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-amber-200 flex items-center justify-center text-2xl">
                          🚬
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-amber-800">@{sitter.username}</div>
                        <div className="text-sm text-amber-600">
                          {sitter.brand} {sitter.product && `• ${sitter.product}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-amber-700">{'⭐'.repeat(Math.round(sitter.rating))}</div>
                        <div className="text-xs text-amber-500">{formatTime(sitter.time)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Porch Regulars */}
            {data?.porchRegulars && data.porchRegulars.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-amber-200 mb-8">
                <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
                  <FiAward className="w-5 h-5" />
                  <span>Porch Regulars</span>
                </h3>
                <div className="space-y-3">
                  {data.porchRegulars.slice(0, 5).map((regular, i) => (
                    <Link 
                      key={regular.username}
                      href={`/user/${regular.username}`}
                      className="flex items-center gap-4 p-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
                    >
                      <div className="text-2xl">{getRankEmoji(i)}</div>
                      <div className="flex-1">
                        <div className="font-medium text-amber-800">@{regular.username}</div>
                        <div className="text-xs text-amber-500">{getPorchTitle(regular.sundaySmokes)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-amber-700">{regular.sundaySmokes} Sundays</div>
                        <div className="text-xs text-amber-500">⭐ {regular.avgRating.toFixed(1)} avg</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Your Porch Stats */}
            {data?.userStats && (
              <div className="bg-gradient-to-br from-amber-200 to-orange-200 rounded-2xl p-6 shadow-lg mb-8">
                <h3 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
                  <span>🏡</span> Your Porch Spot
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-amber-900">{data.userStats.totalPorchSessions}</div>
                    <div className="text-xs text-amber-700">Sundays</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-900">{data.userStats.longestStreak}</div>
                    <div className="text-xs text-amber-700">Week Streak</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-900">
                      {data.userStats.rank ? `#${data.userStats.rank}` : '—'}
                    </div>
                    <div className="text-xs text-amber-700">Porch Rank</div>
                  </div>
                </div>
                {data.userStats.favoriteBrand && (
                  <div className="mt-4 text-center text-sm text-amber-800">
                    Favorite: <span className="font-medium">{data.userStats.favoriteBrand}</span>
                  </div>
                )}
              </div>
            )}

            {/* All-Time Porch Stats */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-amber-200 mb-8">
              <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
                <FiClock className="w-5 h-5" />
                <span>Porch History</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-800">{data?.allTimeStats.totalSundaySmokes || 0}</div>
                  <div className="text-xs text-amber-600">All-time Sunday smokes</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-800">
                    {data?.allTimeStats.mostPopularHour !== undefined 
                      ? `${data.allTimeStats.mostPopularHour > 12 
                          ? data.allTimeStats.mostPopularHour - 12 
                          : data.allTimeStats.mostPopularHour}${data.allTimeStats.mostPopularHour >= 12 ? 'PM' : 'AM'}`
                      : '—'}
                  </div>
                  <div className="text-xs text-amber-600">Peak porch hour</div>
                </div>
                {data?.allTimeStats.favoriteBrand && (
                  <div className="col-span-2 bg-amber-50 rounded-xl p-4 text-center">
                    <div className="text-lg font-bold text-amber-800">{data.allTimeStats.favoriteBrand}</div>
                    <div className="text-xs text-amber-600">Most popular Sunday brand</div>
                  </div>
                )}
              </div>
            </div>

            {/* Porch Wisdom */}
            <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-6 text-center border border-amber-200">
              <div className="text-3xl mb-3">🪑</div>
              <p className="text-amber-800 italic text-lg mb-2">
                &ldquo;The porch is where time slows down and smoke rises up.&rdquo;
              </p>
              <p className="text-amber-600 text-sm">— Sunday Wisdom</p>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 flex justify-center gap-4">
              <Link 
                href="/checkin" 
                className="px-6 py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition-colors"
              >
                🚬 Log a Smoke
              </Link>
              <Link 
                href="/brunch" 
                className="px-6 py-3 bg-white text-amber-700 border border-amber-300 rounded-xl font-medium hover:bg-amber-50 transition-colors"
              >
                🥂 Sunday Brunch
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
