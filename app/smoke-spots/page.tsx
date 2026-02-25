'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiMapPin, FiStar, FiUsers, FiAward, FiTrendingUp, FiClock, FiCompass, FiCheck } from 'react-icons/fi';

interface SpotStats {
  spot: string;
  count: number;
  unique_smokers: number;
  avg_rating: number;
}

interface AdventurousSmoker {
  user_id: string;
  username: string;
  unique_spots: number;
  total_smokes_with_spot: number;
  favorite_spot: string;
}

interface UserSpotHistory {
  spot: string;
  count: number;
  last_used: number;
  avg_rating: number;
}

interface RecentActivity {
  spot: string;
  username: string;
  brand: string;
  created_at: number;
}

interface SpotsData {
  popularSpots: SpotStats[];
  adventurousSmokers: AdventurousSmoker[];
  platformStats: {
    total_unique_spots: number;
    total_smokes_with_spot: number;
    users_logging_spots: number;
  };
  userSpots: UserSpotHistory[];
  userUniqueSpots: number;
  recentActivity: RecentActivity[];
  suggestedSpots: string[];
}

// Spot emoji mapping
const spotEmoji: Record<string, string> = {
  'home': '🏠',
  'patio': '🌿',
  'backyard': '🌳',
  'lounge': '🛋️',
  'bar': '🍺',
  'porch': '🏡',
  'garage': '🚗',
  'deck': '🪵',
  'balcony': '🌆',
  'office': '💼',
  'shop': '🏪',
  'golf': '⛳',
  'beach': '🏖️',
  'park': '🌲',
  'car': '🚙',
  'cigar bar': '🍸',
  'smoking room': '💨',
  'rooftop': '🏙️',
  'pool': '🏊',
  'cabin': '🏕️',
  'lake': '🌊',
  'fire pit': '🔥',
  'shed': '🛖',
  'man cave': '🎮',
};

function getSpotEmoji(spot: string): string {
  const lower = spot.toLowerCase();
  for (const [key, emoji] of Object.entries(spotEmoji)) {
    if (lower.includes(key)) return emoji;
  }
  return '📍';
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function SmokeSpotsPage() {
  const [data, setData] = useState<SpotsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'popular' | 'adventurers' | 'yours'>('popular');

  useEffect(() => {
    fetch('/api/smoke-spots-explorer')
      .then(res => res.json() as Promise<SpotsData>)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-900 via-slate-900 to-black p-4">
        <div className="animate-pulse text-center py-20">
          <div className="text-4xl mb-4">📍</div>
          <div className="text-sky-400">Mapping smoke spots...</div>
        </div>
      </div>
    );
  }

  const { popularSpots, adventurousSmokers, platformStats, userSpots, userUniqueSpots, recentActivity, suggestedSpots } = data || {
    popularSpots: [],
    adventurousSmokers: [],
    platformStats: { total_unique_spots: 0, total_smokes_with_spot: 0, users_logging_spots: 0 },
    userSpots: [],
    userUniqueSpots: 0,
    recentActivity: [],
    suggestedSpots: [],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-900 via-slate-900 to-black text-white">
      {/* Header */}
      <div className="sticky top-0 bg-sky-900/90 backdrop-blur-sm border-b border-sky-700/50 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 hover:bg-sky-800/50 rounded-full">
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              📍 Smoke Spots Explorer
            </h1>
            <p className="text-sm text-sky-300">Where the community smokes</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Platform Stats Banner */}
        <div className="bg-gradient-to-r from-sky-800/50 to-cyan-800/50 rounded-2xl p-4 mb-6 border border-sky-600/30">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-sky-300">{platformStats.total_unique_spots}</div>
              <div className="text-xs text-slate-400">Unique Spots</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-cyan-300">{platformStats.total_smokes_with_spot}</div>
              <div className="text-xs text-slate-400">Smokes Logged</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-teal-300">{platformStats.users_logging_spots}</div>
              <div className="text-xs text-slate-400">Explorers</div>
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        {recentActivity.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <FiClock className="text-sky-400" /> Live Activity (24h)
            </h3>
            <div className="space-y-2">
              {recentActivity.slice(0, 4).map((activity, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-lg">{getSpotEmoji(activity.spot)}</span>
                  <Link href={`/user/${activity.username}`} className="text-sky-400 hover:underline font-medium">
                    {activity.username}
                  </Link>
                  <span className="text-slate-500">@</span>
                  <span className="text-slate-300 truncate">{activity.spot}</span>
                  <span className="text-slate-500 text-xs ml-auto">{formatTimeAgo(activity.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('popular')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === 'popular'
                ? 'bg-sky-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FiTrendingUp className="inline mr-1" /> Popular Spots
          </button>
          <button
            onClick={() => setActiveTab('adventurers')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === 'adventurers'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FiCompass className="inline mr-1" /> Adventurers
          </button>
          <button
            onClick={() => setActiveTab('yours')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === 'yours'
                ? 'bg-teal-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FiMapPin className="inline mr-1" /> Your Spots
          </button>
        </div>

        {/* Popular Spots Tab */}
        {activeTab === 'popular' && (
          <div className="space-y-3">
            {popularSpots.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">🗺️</div>
                <p className="text-slate-400">No smoke spots logged yet!</p>
                <p className="text-slate-500 text-sm mt-1">Be the first to add a spot when you check in</p>
              </div>
            ) : (
              popularSpots.map((spot, i) => (
                <div
                  key={spot.spot}
                  className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 hover:border-sky-600/50 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{getSpotEmoji(spot.spot)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {i < 3 && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            i === 0 ? 'bg-amber-500/20 text-amber-400' :
                            i === 1 ? 'bg-slate-400/20 text-slate-300' :
                            'bg-orange-500/20 text-orange-400'
                          }`}>
                            #{i + 1}
                          </span>
                        )}
                        <h3 className="font-semibold text-white truncate">{spot.spot}</h3>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <FiTrendingUp className="text-sky-400" />
                          {spot.count} smokes
                        </span>
                        <span className="flex items-center gap-1">
                          <FiUsers className="text-cyan-400" />
                          {spot.unique_smokers} {spot.unique_smokers === 1 ? 'smoker' : 'smokers'}
                        </span>
                        {spot.avg_rating && (
                          <span className="flex items-center gap-1">
                            <FiStar className="text-amber-400" />
                            {spot.avg_rating} avg
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Adventurers Tab */}
        {activeTab === 'adventurers' && (
          <div className="space-y-3">
            {adventurousSmokers.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">🧭</div>
                <p className="text-slate-400">No adventurers yet!</p>
                <p className="text-slate-500 text-sm mt-1">Start logging different smoke spots to climb the leaderboard</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-400 mb-4">
                  🏆 Users who smoke in the most different locations
                </p>
                {adventurousSmokers.map((smoker, i) => (
                  <Link
                    key={smoker.user_id}
                    href={`/user/${smoker.username}`}
                    className="block bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 hover:border-amber-600/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                        i === 0 ? 'bg-amber-500/30 text-amber-400' :
                        i === 1 ? 'bg-slate-400/30 text-slate-300' :
                        i === 2 ? 'bg-orange-500/30 text-orange-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white">{smoker.username}</div>
                        <div className="text-sm text-slate-400">
                          Favorite: {getSpotEmoji(smoker.favorite_spot)} {smoker.favorite_spot}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-amber-400">{smoker.unique_spots}</div>
                        <div className="text-xs text-slate-500">spots</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </>
            )}
          </div>
        )}

        {/* Your Spots Tab */}
        {activeTab === 'yours' && (
          <div className="space-y-4">
            {userSpots.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">📍</div>
                <p className="text-slate-400">You haven't logged any smoke spots yet!</p>
                <p className="text-slate-500 text-sm mt-2">
                  Add a spot next time you check in to see your history here
                </p>
                <Link 
                  href="/checkin"
                  className="inline-block mt-4 px-6 py-2 bg-sky-600 hover:bg-sky-500 rounded-full text-sm font-medium transition-colors"
                >
                  Log a Smoke
                </Link>
              </div>
            ) : (
              <>
                {/* Your Stats */}
                <div className="bg-gradient-to-r from-teal-800/40 to-emerald-800/40 rounded-xl p-4 border border-teal-600/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-teal-300">Your Spot Variety</div>
                      <div className="text-3xl font-bold text-white">{userUniqueSpots} spots</div>
                    </div>
                    <div className="text-5xl">
                      {userUniqueSpots >= 10 ? '🌍' : userUniqueSpots >= 5 ? '🧭' : userUniqueSpots >= 3 ? '🗺️' : '📍'}
                    </div>
                  </div>
                  {userUniqueSpots < 10 && (
                    <div className="mt-3 text-sm text-teal-400">
                      {10 - userUniqueSpots} more unique spots to become a World Traveler! 🌍
                    </div>
                  )}
                </div>

                {/* Suggested Spots */}
                {suggestedSpots.length > 0 && (
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                      <FiCompass className="text-amber-400" /> Try These Popular Spots
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {suggestedSpots.map(spot => (
                        <span
                          key={spot}
                          className="px-3 py-1.5 bg-slate-700/50 rounded-full text-sm text-slate-300 flex items-center gap-1.5"
                        >
                          {getSpotEmoji(spot)} {spot}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Your Spot History */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Your Spot History</h3>
                  {userSpots.map((spot, i) => (
                    <div
                      key={spot.spot}
                      className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 flex items-center gap-3"
                    >
                      <div className="text-2xl">{getSpotEmoji(spot.spot)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{spot.spot}</div>
                        <div className="text-xs text-slate-500">
                          Last: {formatTimeAgo(spot.last_used)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-teal-400">{spot.count}x</div>
                        {spot.avg_rating && (
                          <div className="text-xs text-slate-500 flex items-center justify-end gap-1">
                            <FiStar className="text-amber-400 w-3 h-3" />
                            {spot.avg_rating}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-8 text-center">
          <Link 
            href="/checkin"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 rounded-full font-semibold transition-all shadow-lg shadow-sky-900/50"
          >
            <FiMapPin /> Log a Smoke with Your Spot
          </Link>
          <p className="text-xs text-slate-500 mt-2">
            Add where you're smoking to unlock spot tracking! 📍
          </p>
        </div>
      </div>
    </div>
  );
}
