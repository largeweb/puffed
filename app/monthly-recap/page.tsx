"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiCalendar,
  FiAward,
  FiHeart,
  FiMessageCircle,
  FiStar,
  FiSunrise,
  FiSun,
  FiSunset,
  FiMoon,
  FiTrendingUp,
  FiClock,
  FiZap,
} from "react-icons/fi";
import Link from "next/link";

interface UserStats {
  totalSmokes: number;
  uniqueBrands: number;
  avgRating: string;
  totalLikesReceived: number;
  totalCommentsReceived: number;
  favoriteBrand: string | null;
  highestRatedSmoke: {
    brand: string;
    product?: string;
    rating: number;
    date: number;
  } | null;
  mostActiveDay: string | null;
  mostActiveHour: number | null;
  smokingPattern: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };
  firstSmoke: { brand: string; date: number } | null;
  lastSmoke: { brand: string; date: number } | null;
}

interface PlatformStats {
  totalSmokes: number;
  totalUsers: number;
  avgRating: string;
  topBrand: string | null;
  mostActiveUser: string | null;
}

interface RecapData {
  month: string;
  year: number;
  userStats: UserStats | null;
  platformStats: PlatformStats;
  daysInMonth: number;
  daysRemaining: number;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function getPatternIcon(pattern: string) {
  switch (pattern) {
    case "morning": return <FiSunrise className="text-amber-400" />;
    case "afternoon": return <FiSun className="text-yellow-400" />;
    case "evening": return <FiSunset className="text-orange-400" />;
    case "night": return <FiMoon className="text-indigo-400" />;
    default: return <FiClock />;
  }
}

function getPatternEmoji(dominant: string): string {
  switch (dominant) {
    case "morning": return "🌅";
    case "afternoon": return "☀️";
    case "evening": return "🌆";
    case "night": return "🌙";
    default: return "💨";
  }
}

export default function MonthlyRecapPage() {
  const [data, setData] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    setUserId(id);
  }, []);

  useEffect(() => {
    if (userId !== null) {
      fetchRecap();
    }
  }, [userId]);

  const fetchRecap = async () => {
    try {
      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);
      params.set("month", "2"); // February
      params.set("year", "2026");
      
      const res = await fetch(`/api/monthly-recap?${params}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch recap:", err);
    } finally {
      setLoading(false);
    }
  };

  // Determine dominant smoking time
  const getDominantPattern = (pattern: UserStats["smokingPattern"]) => {
    const entries = Object.entries(pattern) as [string, number][];
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    return sorted[0][1] > 0 ? sorted[0][0] : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-violet-200">Loading your recap...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900">
        <p className="text-red-400">Failed to load recap</p>
      </div>
    );
  }

  const { userStats, platformStats, month, year, daysRemaining } = data;
  const dominantPattern = userStats?.smokingPattern ? getDominantPattern(userStats.smokingPattern) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-violet-900/70 border-b border-violet-700/50">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 hover:bg-violet-800/50 rounded-full transition-colors">
            <FiArrowLeft className="w-5 h-5 text-violet-200" />
          </Link>
          <div className="flex items-center gap-2">
            <FiCalendar className="w-5 h-5 text-fuchsia-400" />
            <h1 className="text-lg font-bold text-white">{month} Recap</h1>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-fuchsia-600 to-violet-600 rounded-2xl p-6 text-center"
        >
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10"></div>
          <div className="relative z-10">
            <div className="text-6xl mb-3">📅</div>
            <h2 className="text-2xl font-bold text-white mb-1">
              Your {month} {year}
            </h2>
            <p className="text-fuchsia-100 text-sm">
              {daysRemaining > 0 ? `${daysRemaining} days left in the month` : "Month complete!"}
            </p>
          </div>
        </motion.div>

        {userStats && userStats.totalSmokes > 0 ? (
          <>
            {/* Main Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 gap-3"
            >
              <div className="bg-violet-800/40 backdrop-blur rounded-xl p-4 text-center border border-violet-700/50">
                <div className="text-3xl font-bold text-white">{userStats.totalSmokes}</div>
                <div className="text-xs text-violet-300 mt-1">Total Smokes</div>
              </div>
              <div className="bg-violet-800/40 backdrop-blur rounded-xl p-4 text-center border border-violet-700/50">
                <div className="text-3xl font-bold text-white">{userStats.uniqueBrands}</div>
                <div className="text-xs text-violet-300 mt-1">Unique Brands</div>
              </div>
              <div className="bg-violet-800/40 backdrop-blur rounded-xl p-4 text-center border border-violet-700/50">
                <div className="flex items-center justify-center gap-1">
                  <FiStar className="text-yellow-400 fill-yellow-400" />
                  <span className="text-3xl font-bold text-white">{userStats.avgRating}</span>
                </div>
                <div className="text-xs text-violet-300 mt-1">Avg Rating</div>
              </div>
              <div className="bg-violet-800/40 backdrop-blur rounded-xl p-4 text-center border border-violet-700/50">
                <div className="flex items-center justify-center gap-2">
                  <FiHeart className="text-pink-400" />
                  <span className="text-2xl font-bold text-white">{userStats.totalLikesReceived}</span>
                </div>
                <div className="text-xs text-violet-300 mt-1">Likes Received</div>
              </div>
            </motion.div>

            {/* Favorite Brand */}
            {userStats.favoriteBrand && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur rounded-xl p-5 border border-amber-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="text-4xl">🏆</div>
                  <div>
                    <div className="text-xs text-amber-300 uppercase tracking-wide">Your #1 Brand</div>
                    <div className="text-xl font-bold text-white">{userStats.favoriteBrand}</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Highest Rated Smoke */}
            {userStats.highestRatedSmoke && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 backdrop-blur rounded-xl p-5 border border-yellow-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="text-4xl">⭐</div>
                  <div className="flex-1">
                    <div className="text-xs text-yellow-300 uppercase tracking-wide">Best Smoke</div>
                    <div className="text-lg font-bold text-white">{userStats.highestRatedSmoke.brand}</div>
                    {userStats.highestRatedSmoke.product && (
                      <div className="text-sm text-yellow-200">{userStats.highestRatedSmoke.product}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-500/30 px-2 py-1 rounded-full">
                    <FiStar className="text-yellow-400 fill-yellow-400 w-4 h-4" />
                    <span className="text-white font-bold">{userStats.highestRatedSmoke.rating}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Smoking Pattern */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-violet-800/40 backdrop-blur rounded-xl p-5 border border-violet-700/50"
            >
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <FiClock className="text-fuchsia-400" />
                When You Smoke
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {(["morning", "afternoon", "evening", "night"] as const).map((period) => {
                  const count = userStats.smokingPattern[period];
                  const isMax = dominantPattern === period;
                  return (
                    <div
                      key={period}
                      className={`text-center p-3 rounded-lg ${
                        isMax 
                          ? "bg-fuchsia-500/30 border border-fuchsia-400/50" 
                          : "bg-violet-700/30"
                      }`}
                    >
                      <div className="text-2xl mb-1">{getPatternIcon(period)}</div>
                      <div className={`text-lg font-bold ${isMax ? "text-fuchsia-300" : "text-white"}`}>
                        {count}
                      </div>
                      <div className="text-[10px] text-violet-300 capitalize">{period}</div>
                    </div>
                  );
                })}
              </div>
              {dominantPattern && (
                <div className="mt-4 text-center text-sm text-violet-200">
                  You&apos;re a <span className="text-fuchsia-300 font-semibold capitalize">{dominantPattern}</span> smoker {getPatternEmoji(dominantPattern)}
                </div>
              )}
            </motion.div>

            {/* Peak Day & Hour */}
            {(userStats.mostActiveDay || userStats.mostActiveHour !== null) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="grid grid-cols-2 gap-3"
              >
                {userStats.mostActiveDay && (
                  <div className="bg-violet-800/40 backdrop-blur rounded-xl p-4 text-center border border-violet-700/50">
                    <div className="text-2xl mb-1">📆</div>
                    <div className="text-lg font-bold text-white">{userStats.mostActiveDay}</div>
                    <div className="text-xs text-violet-300">Peak Day</div>
                  </div>
                )}
                {userStats.mostActiveHour !== null && (
                  <div className="bg-violet-800/40 backdrop-blur rounded-xl p-4 text-center border border-violet-700/50">
                    <div className="text-2xl mb-1">⏰</div>
                    <div className="text-lg font-bold text-white">{formatHour(userStats.mostActiveHour)}</div>
                    <div className="text-xs text-violet-300">Peak Hour</div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Social Stats */}
            {(userStats.totalLikesReceived > 0 || userStats.totalCommentsReceived > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-pink-500/20 to-rose-500/20 backdrop-blur rounded-xl p-5 border border-pink-500/30"
              >
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <FiHeart className="text-pink-400" />
                  Community Love
                </h3>
                <div className="flex items-center justify-around">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{userStats.totalLikesReceived}</div>
                    <div className="text-xs text-pink-300">Likes</div>
                  </div>
                  <div className="w-px h-8 bg-pink-500/30"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{userStats.totalCommentsReceived}</div>
                    <div className="text-xs text-pink-300">Comments</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* First & Last Smoke */}
            {(userStats.firstSmoke || userStats.lastSmoke) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-violet-800/40 backdrop-blur rounded-xl p-5 border border-violet-700/50"
              >
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <FiZap className="text-fuchsia-400" />
                  Journey
                </h3>
                <div className="space-y-3">
                  {userStats.firstSmoke && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-violet-400 w-16">First:</span>
                      <span className="text-white font-medium">{userStats.firstSmoke.brand}</span>
                      <span className="text-xs text-violet-400 ml-auto">
                        {new Date(userStats.firstSmoke.date * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                  {userStats.lastSmoke && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-violet-400 w-16">Latest:</span>
                      <span className="text-white font-medium">{userStats.lastSmoke.brand}</span>
                      <span className="text-xs text-violet-400 ml-auto">
                        {new Date(userStats.lastSmoke.date * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-violet-800/40 backdrop-blur rounded-xl p-8 text-center border border-violet-700/50"
          >
            <div className="text-5xl mb-4">💨</div>
            <h3 className="text-lg font-semibold text-white mb-2">No smokes logged yet!</h3>
            <p className="text-violet-300 text-sm mb-4">
              Log your first smoke to start building your {month} recap.
            </p>
            <Link
              href="/checkin"
              className="inline-flex items-center gap-2 bg-fuchsia-500 hover:bg-fuchsia-600 text-white px-4 py-2 rounded-full transition-colors"
            >
              <FiTrendingUp /> Log a Smoke
            </Link>
          </motion.div>
        )}

        {/* Platform Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-violet-800/30 backdrop-blur rounded-xl p-5 border border-violet-700/30"
        >
          <h3 className="font-semibold text-violet-200 mb-4 flex items-center gap-2">
            <FiTrendingUp className="text-violet-400" />
            Platform in {month}
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xl font-bold text-white">{platformStats.totalSmokes}</div>
              <div className="text-xs text-violet-400">Smokes</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{platformStats.totalUsers}</div>
              <div className="text-xs text-violet-400">Smokers</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <FiStar className="text-yellow-400 w-3 h-3" />
                <span className="text-xl font-bold text-white">{platformStats.avgRating}</span>
              </div>
              <div className="text-xs text-violet-400">Avg Rating</div>
            </div>
          </div>
          {platformStats.topBrand && (
            <div className="mt-4 pt-4 border-t border-violet-700/30 text-center">
              <div className="text-xs text-violet-400 mb-1">Top Brand of {month}</div>
              <div className="text-lg font-bold text-fuchsia-300">{platformStats.topBrand}</div>
            </div>
          )}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="text-center pb-6"
        >
          <p className="text-violet-300 text-sm mb-4">
            {daysRemaining > 0 
              ? `${daysRemaining} days left to make ${month} legendary!`
              : `Great month! Check back for March!`}
          </p>
          <Link
            href="/checkin"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:from-fuchsia-600 hover:to-violet-600 text-white px-6 py-3 rounded-full font-semibold transition-all shadow-lg shadow-fuchsia-500/30"
          >
            <FiZap /> Log a Smoke
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
