'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiRefreshCw, FiClock, FiMapPin, FiCoffee, FiSmile, FiActivity, FiUsers, FiTrendingUp } from 'react-icons/fi';

interface VibeData {
  moods: Array<{ mood: string; count: number; emoji: string }>;
  spots: Array<{ spot: string; count: number; emoji: string }>;
  drinks: Array<{ drink: string; count: number; emoji: string }>;
  recentSmokers: Array<{ username: string; brand: string; mood: string; moodEmoji: string; minutesAgo: number }>;
  collectiveVibe: { label: string; emoji: string; avgRating: string; totalToday: number };
  topBrand: { brand: string; count: number } | null;
  timestamp: number;
}

export default function VibeCheckPage() {
  const [data, setData] = useState<VibeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVibes = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/vibe-check');
      if (res.ok) {
        const json = await res.json() as VibeData;
        setData(json);
      }
    } catch (error) {
      console.error('Error fetching vibes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVibes();
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => fetchVibes(), 60000);
    return () => clearInterval(interval);
  }, []);

  const totalMoods = data?.moods.reduce((acc, m) => acc + m.count, 0) || 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-white/70 hover:text-white">
              <FiArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              🎭 Vibe Check
            </h1>
          </div>
          <button
            onClick={() => fetchVibes(true)}
            className="text-white/70 hover:text-white transition-colors"
            disabled={refreshing}
          >
            <FiRefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mx-auto"></div>
            <p className="text-white/60 mt-4">Reading the vibes...</p>
          </div>
        ) : data ? (
          <>
            {/* Collective Vibe Card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-white/80">
                  <FiActivity size={18} />
                  <span className="text-sm font-medium">Community Vibe</span>
                </div>
                <span className="text-xs text-white/50">Last 24h</span>
              </div>
              <div className="text-center">
                <div className="text-6xl mb-2">{data.collectiveVibe.emoji}</div>
                <h2 className="text-2xl font-bold text-white mb-1">{data.collectiveVibe.label}</h2>
                <p className="text-white/60 text-sm">
                  Avg rating: {data.collectiveVibe.avgRating}★ across {data.collectiveVibe.totalToday} smokes
                </p>
              </div>
              {data.topBrand && (
                <div className="mt-4 pt-4 border-t border-white/10 text-center">
                  <p className="text-sm text-white/60">
                    Today's hot brand: <span className="text-fuchsia-300 font-medium">{data.topBrand.brand}</span>
                    <span className="text-white/40 ml-1">({data.topBrand.count}x)</span>
                  </p>
                </div>
              )}
            </div>

            {/* Smoking Now */}
            {data.recentSmokers.length > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <div className="flex items-center gap-2 text-white/80 mb-4">
                  <FiUsers size={18} />
                  <span className="font-medium">Smoking Now</span>
                  <span className="text-xs bg-green-500/30 text-green-300 px-2 py-0.5 rounded-full ml-auto">LIVE</span>
                </div>
                <div className="space-y-3">
                  {data.recentSmokers.map((smoker, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                      <div className="text-2xl">{smoker.moodEmoji}</div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/user/${smoker.username}`} className="text-white font-medium hover:text-purple-300 truncate block">
                          @{smoker.username}
                        </Link>
                        <p className="text-sm text-white/50 truncate">{smoker.brand}</p>
                      </div>
                      <div className="text-xs text-white/40 flex items-center gap-1">
                        <FiClock size={12} />
                        {smoker.minutesAgo}m ago
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mood Breakdown */}
            {data.moods.length > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <div className="flex items-center gap-2 text-white/80 mb-4">
                  <FiSmile size={18} />
                  <span className="font-medium">Mood Check</span>
                </div>
                <div className="space-y-3">
                  {data.moods.map((m, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="text-2xl w-8">{m.emoji}</div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-white capitalize text-sm">{m.mood}</span>
                          <span className="text-white/50 text-sm">{m.count}</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all"
                            style={{ width: `${(m.count / totalMoods) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Smoke Spots */}
            {data.spots.length > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <div className="flex items-center gap-2 text-white/80 mb-4">
                  <FiMapPin size={18} />
                  <span className="font-medium">Where Everyone's Smoking</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.spots.map((s, i) => (
                    <div key={i} className="bg-white/10 px-4 py-2 rounded-full flex items-center gap-2">
                      <span className="text-lg">{s.emoji}</span>
                      <span className="text-white text-sm capitalize">{s.spot}</span>
                      <span className="text-white/40 text-xs">({s.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Drink Pairings */}
            {data.drinks.length > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <div className="flex items-center gap-2 text-white/80 mb-4">
                  <FiCoffee size={18} />
                  <span className="font-medium">What's Pouring</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {data.drinks.map((d, i) => (
                    <div key={i} className="bg-white/5 px-4 py-3 rounded-xl flex items-center gap-3">
                      <span className="text-2xl">{d.emoji}</span>
                      <div>
                        <p className="text-white text-sm capitalize">{d.drink}</p>
                        <p className="text-white/40 text-xs">{d.count} smoker{d.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {data.moods.length === 0 && data.spots.length === 0 && data.recentSmokers.length === 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
                <div className="text-5xl mb-4">🌙</div>
                <h3 className="text-xl font-bold text-white mb-2">Quiet Vibes</h3>
                <p className="text-white/60 mb-4">Not much activity in the last 24 hours</p>
                <Link href="/checkin" className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-full transition-colors">
                  <FiTrendingUp size={18} />
                  Be the first to log
                </Link>
              </div>
            )}

            {/* Footer note */}
            <p className="text-center text-white/30 text-xs pb-4">
              Auto-refreshes every 60 seconds • Vibes from the last 24 hours
            </p>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-white/60">Couldn't read the vibes 😔</p>
          </div>
        )}
      </main>
    </div>
  );
}
