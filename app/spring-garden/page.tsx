'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface GardenSmoker {
  id: number;
  username: string;
  brand: string;
  product: string | null;
  rating: number;
  review: string | null;
  createdAt: number;
}

interface SpringBloomer {
  username: string;
  count: number;
  avgRating: number;
  rank: number;
}

interface GardenData {
  isActive: boolean;
  daysSinceSpring: number;
  springStart: string;
  timeInfo: {
    isActive: boolean;
    minutesRemaining?: number;
    phase?: string;
    hoursUntil?: number;
  };
  todaysQuote: string;
  flowers: string[];
  gardenSmokers: GardenSmoker[];
  springBloomers: SpringBloomer[];
  userStats: {
    springCount: number;
    avgRating: number | null;
  };
  platformStats: {
    totalSpringSmokes: number;
    bloomers: number;
    avgRating: number | null;
  };
}

// Floating flower component
function FloatingFlower({ emoji, delay, duration, left }: { emoji: string; delay: number; duration: number; left: number }) {
  return (
    <div
      className="absolute text-2xl animate-bounce pointer-events-none"
      style={{
        left: `${left}%`,
        bottom: '-30px',
        animation: `floatUp ${duration}s ease-in-out ${delay}s infinite`,
        opacity: 0.7
      }}
    >
      {emoji}
    </div>
  );
}

export default function SpringGardenPage() {
  const router = useRouter();
  const [data, setData] = useState<GardenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'garden' | 'bloomers'>('garden');

  useEffect(() => {
    fetch('/api/spring-garden')
      .then(res => {
        if (res.status === 401) {
          router.push('/');
          return null;
        }
        return res.json() as Promise<GardenData>;
      })
      .then(result => {
        if (result) setData(result);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-emerald-800 to-teal-900 flex items-center justify-center">
        <div className="text-4xl animate-pulse">🌸</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-emerald-800 to-teal-900 p-4 text-center text-white">
        <p>Could not load garden data</p>
        <Link href="/dashboard" className="text-pink-300 underline mt-4 block">Back to Dashboard</Link>
      </div>
    );
  }

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🌻';
      case 2: return '🌷';
      case 3: return '🌹';
      default: return '🌱';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-emerald-800 to-teal-900 relative overflow-hidden">
      {/* Floating flowers animation */}
      <style jsx global>{`
        @keyframes floatUp {
          0%, 100% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.7;
          }
          90% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(-100px) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes sway {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        @keyframes bloom {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>

      {/* Floating flowers */}
      {data.flowers.map((flower, i) => (
        <FloatingFlower
          key={i}
          emoji={flower}
          delay={i * 1.5}
          duration={10 + (i % 5) * 2}
          left={10 + (i * 10)}
        />
      ))}

      {/* Sun rays (during active hours) */}
      {data.isActive && (
        <div className="absolute top-0 right-0 w-32 h-32 opacity-30">
          <div className="absolute w-full h-full bg-yellow-400 rounded-full animate-pulse" 
               style={{ filter: 'blur(30px)' }} />
        </div>
      )}

      <div className="relative z-10 p-4 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <Link href="/dashboard" className="text-green-300 text-sm mb-2 block">← Dashboard</Link>
          <h1 className="text-4xl font-bold text-white mb-2" style={{ animation: 'bloom 3s ease-in-out infinite' }}>
            🌸 Spring Garden 🌸
          </h1>
          <p className="text-emerald-200 text-sm">
            Day {data.daysSinceSpring} of Spring
          </p>
          {data.timeInfo.isActive ? (
            <p className="text-green-300 text-xs mt-1">
              ☀️ {data.timeInfo.phase === 'morning' ? 'Morning light' : 
                   data.timeInfo.phase === 'midday' ? 'Midday bloom' : 'Golden hour'}
            </p>
          ) : (
            <p className="text-green-400 text-xs mt-1">
              🌙 Garden sleeps • Opens in {data.timeInfo.hoursUntil}h
            </p>
          )}
        </div>

        {/* Quote of the day */}
        <div className="bg-gradient-to-r from-pink-900/40 to-green-900/40 rounded-xl p-4 mb-6 border border-pink-500/30">
          <p className="text-pink-100 italic text-sm text-center">
            &ldquo;{data.todaysQuote}&rdquo;
          </p>
        </div>

        {/* Your Spring Stats */}
        <div className="bg-emerald-800/50 rounded-xl p-4 mb-6 border border-emerald-500/30">
          <h2 className="text-lg font-semibold text-white mb-3">🌱 Your Spring</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300">{data.userStats.springCount}</div>
              <div className="text-emerald-300 text-xs">Spring smokes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-300">
                {data.userStats.avgRating ? data.userStats.avgRating.toFixed(1) : '—'}
              </div>
              <div className="text-emerald-300 text-xs">Avg rating</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('garden')}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'garden'
                ? 'bg-pink-600 text-white'
                : 'bg-green-800/50 text-green-300'
            }`}
          >
            🌸 Garden
          </button>
          <button
            onClick={() => setActiveTab('bloomers')}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'bloomers'
                ? 'bg-pink-600 text-white'
                : 'bg-green-800/50 text-green-300'
            }`}
          >
            🌻 Bloomers
          </button>
        </div>

        {/* Garden Tab - Today's smokers */}
        {activeTab === 'garden' && (
          <div className="bg-green-800/40 rounded-xl p-4 border border-green-500/30">
            <h2 className="text-lg font-semibold text-white mb-3">Today&apos;s Garden</h2>
            {data.gardenSmokers.length === 0 ? (
              <p className="text-green-300 text-center py-8">
                🌱 No one in the garden yet today
                <br />
                <span className="text-sm">Be the first to bloom!</span>
              </p>
            ) : (
              <div className="space-y-3">
                {data.gardenSmokers.map((smoker, i) => (
                  <Link
                    key={smoker.id}
                    href={`/checkin/${smoker.id}`}
                    className="block bg-green-900/50 rounded-lg p-3 hover:bg-green-900/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl" style={{ animation: 'sway 2s ease-in-out infinite' }}>
                        {data.flowers[i % data.flowers.length]}
                      </span>
                      <div className="flex-1">
                        <div className="text-white font-medium">@{smoker.username}</div>
                        <div className="text-green-300 text-sm">
                          {smoker.brand} {smoker.product && `• ${smoker.product}`}
                        </div>
                      </div>
                      <div className="text-yellow-400">
                        {'⭐'.repeat(Math.min(smoker.rating, 5))}
                      </div>
                    </div>
                    {smoker.review && (
                      <p className="text-emerald-200 text-xs mt-2 line-clamp-2 ml-9">
                        &ldquo;{smoker.review}&rdquo;
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bloomers Tab - Spring leaderboard */}
        {activeTab === 'bloomers' && (
          <div className="bg-green-800/40 rounded-xl p-4 border border-green-500/30">
            <h2 className="text-lg font-semibold text-white mb-3">Spring Bloomers 🌻</h2>
            {data.springBloomers.length === 0 ? (
              <p className="text-green-300 text-center py-8">
                🌱 No spring bloomers yet
              </p>
            ) : (
              <div className="space-y-2">
                {data.springBloomers.map((bloomer) => (
                  <Link
                    key={bloomer.username}
                    href={`/user/${bloomer.username}`}
                    className="flex items-center gap-3 bg-green-900/50 rounded-lg p-3 hover:bg-green-900/70 transition-colors"
                  >
                    <span className="text-2xl">{getRankEmoji(bloomer.rank)}</span>
                    <div className="flex-1">
                      <div className="text-white font-medium">@{bloomer.username}</div>
                      <div className="text-green-300 text-xs">
                        {bloomer.count} spring smoke{bloomer.count !== 1 ? 's' : ''} • 
                        {bloomer.avgRating ? ` ⭐ ${bloomer.avgRating.toFixed(1)}` : ''}
                      </div>
                    </div>
                    <span className={`text-lg font-bold ${
                      bloomer.rank === 1 ? 'text-yellow-400' :
                      bloomer.rank === 2 ? 'text-gray-300' :
                      bloomer.rank === 3 ? 'text-amber-600' : 'text-green-400'
                    }`}>
                      #{bloomer.rank}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Platform Stats */}
        <div className="mt-6 bg-gradient-to-r from-emerald-800/40 to-pink-800/40 rounded-xl p-4 border border-emerald-500/30">
          <h2 className="text-lg font-semibold text-white mb-3">🌍 Spring Stats</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-green-300">{data.platformStats.totalSpringSmokes}</div>
              <div className="text-emerald-300 text-xs">Spring Smokes</div>
            </div>
            <div>
              <div className="text-xl font-bold text-pink-300">{data.platformStats.bloomers}</div>
              <div className="text-emerald-300 text-xs">Bloomers</div>
            </div>
            <div>
              <div className="text-xl font-bold text-yellow-400">
                {data.platformStats.avgRating ? data.platformStats.avgRating.toFixed(1) : '—'}
              </div>
              <div className="text-emerald-300 text-xs">Avg Rating</div>
            </div>
          </div>
        </div>

        {/* Log smoke CTA */}
        <div className="mt-6 text-center">
          <Link
            href="/log"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-green-600 text-white font-bold py-3 px-6 rounded-full hover:opacity-90 transition-opacity"
          >
            🌸 Plant a Smoke 🌿
          </Link>
        </div>

        {/* Related links */}
        <div className="mt-6 text-center text-sm text-emerald-300">
          <Link href="/coffee" className="hover:text-white">☕ Coffee Lounge</Link>
          <span className="mx-2">•</span>
          <Link href="/zen" className="hover:text-white">🧘 Morning Zen</Link>
          <span className="mx-2">•</span>
          <Link href="/porch" className="hover:text-white">🏡 The Porch</Link>
        </div>
      </div>
    </div>
  );
}
