'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FiArrowLeft, FiTrendingUp, FiUsers, FiHeart, FiMessageCircle,
  FiStar, FiAward, FiZap, FiCalendar
} from 'react-icons/fi';

interface WeeklyData {
  weekRange: string;
  stats: {
    newUsers: number;
    newCheckins: number;
    newLikes: number;
    newFollows: number;
    newComments: number;
    newReactions: number;
  };
  topBrands: Array<{
    brand: string;
    count: number;
    avgRating: number;
  }>;
  risingStars: Array<{
    username: string;
    checkins: number;
    joined: string;
  }>;
  mostEngaged: Array<{
    username: string;
    likes: number;
    comments: number;
    reactions: number;
  }>;
  highlights: Array<{
    type: string;
    text: string;
    icon: string;
  }>;
}

export default function ThisWeekPage() {
  const [data, setData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/this-week')
      .then(res => res.json() as Promise<WeeklyData>)
      .then((data) => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center">
        <div className="animate-pulse text-amber-400 text-xl">📊 Loading week...</div>
      </div>
    );
  }

  const stats = data?.stats;
  const hasGrowth = stats && (stats.newUsers > 0 || stats.newCheckins > 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
            <FiArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FiCalendar className="text-amber-400" />
              This Week on Puffed
            </h1>
            <p className="text-zinc-400 mt-1">{data?.weekRange || 'Weekly Recap'}</p>
          </div>
        </div>

        {/* Growth Banner */}
        {hasGrowth && (
          <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <FiTrendingUp className="text-amber-400 text-2xl" />
              <span className="text-xl font-bold">Week in Numbers</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-400">+{stats?.newUsers || 0}</div>
                <div className="text-sm text-zinc-400">New Members</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-400">+{stats?.newCheckins || 0}</div>
                <div className="text-sm text-zinc-400">Check-ins</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-400">+{stats?.newFollows || 0}</div>
                <div className="text-sm text-zinc-400">Follows</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-400">{stats?.newLikes || 0}</div>
                <div className="text-sm text-zinc-400">Likes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{stats?.newComments || 0}</div>
                <div className="text-sm text-zinc-400">Comments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{stats?.newReactions || 0}</div>
                <div className="text-sm text-zinc-400">Reactions</div>
              </div>
            </div>
          </div>
        )}

        {/* Highlights */}
        {data?.highlights && data.highlights.length > 0 && (
          <div className="bg-zinc-800/50 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FiZap className="text-yellow-400" />
              Highlights
            </h2>
            <div className="space-y-3">
              {data.highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-3 bg-zinc-700/30 rounded-xl p-4">
                  <span className="text-2xl">{h.icon}</span>
                  <span className="text-zinc-200">{h.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rising Stars */}
        {data?.risingStars && data.risingStars.length > 0 && (
          <div className="bg-zinc-800/50 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FiStar className="text-amber-400" />
              Rising Stars
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full ml-2">
                New this week
              </span>
            </h2>
            <div className="space-y-3">
              {data.risingStars.map((star, i) => (
                <Link
                  key={i}
                  href={`/user/${star.username}`}
                  className="flex items-center justify-between bg-zinc-700/30 rounded-xl p-4 hover:bg-zinc-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {i === 0 ? '⭐' : i === 1 ? '🌟' : '✨'}
                    </div>
                    <div>
                      <div className="font-semibold">@{star.username}</div>
                      <div className="text-sm text-zinc-400">Joined {star.joined}</div>
                    </div>
                  </div>
                  <div className="text-amber-400 font-bold">
                    {star.checkins} smoke{star.checkins !== 1 ? 's' : ''}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Most Engaged */}
        {data?.mostEngaged && data.mostEngaged.length > 0 && (
          <div className="bg-zinc-800/50 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FiHeart className="text-pink-400" />
              Community MVPs
            </h2>
            <div className="space-y-3">
              {data.mostEngaged.map((user, i) => (
                <Link
                  key={i}
                  href={`/user/${user.username}`}
                  className="flex items-center justify-between bg-zinc-700/30 rounded-xl p-4 hover:bg-zinc-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {i === 0 ? '🏆' : i === 1 ? '🥈' : '🥉'}
                    </div>
                    <div className="font-semibold">@{user.username}</div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-pink-400">❤️ {user.likes}</span>
                    <span className="text-blue-400">💬 {user.comments}</span>
                    <span className="text-purple-400">✨ {user.reactions}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Top Brands */}
        {data?.topBrands && data.topBrands.length > 0 && (
          <div className="bg-zinc-800/50 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FiAward className="text-amber-400" />
              Trending Brands
            </h2>
            <div className="space-y-3">
              {data.topBrands.slice(0, 5).map((brand, i) => (
                <Link
                  key={i}
                  href={`/cigar/${encodeURIComponent(brand.brand)}`}
                  className="flex items-center justify-between bg-zinc-700/30 rounded-xl p-4 hover:bg-zinc-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-zinc-500">#{i + 1}</div>
                    <div className="font-semibold">{brand.brand}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400">{brand.count} smoke{brand.count !== 1 ? 's' : ''}</div>
                    <div className="text-xs text-zinc-400">
                      ⭐ {brand.avgRating?.toFixed(1)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Join the Community */}
        <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-2xl p-6 text-center">
          <div className="text-2xl mb-2">🔥</div>
          <h3 className="text-xl font-bold mb-2">Join the Momentum</h3>
          <p className="text-zinc-400 mb-4">
            Be part of the fastest-growing smoke community
          </p>
          <Link
            href="/checkin"
            className="inline-block px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors"
          >
            Log Your Smoke
          </Link>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex justify-center gap-4 text-sm">
          <Link href="/milestones" className="text-zinc-400 hover:text-white transition-colors">
            🏆 Milestones
          </Link>
          <Link href="/leaderboard" className="text-zinc-400 hover:text-white transition-colors">
            📊 Leaderboard
          </Link>
          <Link href="/discover" className="text-zinc-400 hover:text-white transition-colors">
            🔍 Discover
          </Link>
        </div>
      </div>
    </div>
  );
}
