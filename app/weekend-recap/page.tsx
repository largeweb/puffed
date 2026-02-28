"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiHome,
  FiRefreshCw,
  FiTrendingUp,
  FiTrendingDown,
  FiMinus,
  FiAward,
  FiStar,
  FiHeart,
  FiMessageCircle,
  FiClock,
  FiCalendar,
  FiSmile,
} from "react-icons/fi";

interface WeekdayStats {
  day: string;
  count: number;
  avgRating: number;
}

interface RecapData {
  totalCheckins: number;
  avgRating: number;
  uniqueBrands: number;
  topBrand: {
    brand: string;
    count: number;
    avgRating: number;
  } | null;
  bestRated: {
    id: number;
    brand: string;
    product: string | null;
    rating: number;
    review: string | null;
  } | null;
  comparison: {
    lastWeekCount: number;
    change: number;
    changePercent: number;
  };
  engagement: {
    received: {
      likes: number;
      comments: number;
      reactions: number;
    };
    given: {
      likes: number;
      comments: number;
      reactions: number;
    };
  };
  weekdayStats: WeekdayStats[];
  peakHour: number;
  peakCount: number;
  categoryStats: Record<string, number>;
  streak: {
    current: number;
    longest: number;
  };
  recentCheckins: Array<{
    id: number;
    brand: string;
    product: string | null;
    rating: number;
    photoUrl: string | null;
    createdAt: number;
  }>;
}

export default function WeekendRecapPage() {
  const router = useRouter();
  const [data, setData] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecap = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/weekend-recap");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch recap");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchRecap();
  }, [fetchRecap]);

  const formatHour = (hour: number) => {
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case "cannabis": return "🌿";
      case "hookah": return "💨";
      case "vape": return "🌫️";
      default: return "🚬";
    }
  };

  const getVibeMessage = (checkins: number, change: number) => {
    if (checkins === 0) return { emoji: "😴", message: "Quiet week! Time to light one up?" };
    if (checkins >= 10) {
      if (change > 0) return { emoji: "🔥", message: "On fire! You're unstoppable!" };
      return { emoji: "🏆", message: "Champion week! Smoke game strong!" };
    }
    if (checkins >= 5) {
      if (change > 0) return { emoji: "📈", message: "Great momentum! Keep it up!" };
      return { emoji: "😎", message: "Solid week of smoking!" };
    }
    if (change > 0) return { emoji: "🌱", message: "Growing! Nice to see you more!" };
    if (change < 0) return { emoji: "🧘", message: "Taking it easy this week!" };
    return { emoji: "✌️", message: "Steady vibes!" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <FiRefreshCw className="w-8 h-8 text-violet-300" />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={fetchRecap}
            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const vibe = getVibeMessage(data.totalCheckins, data.comparison.change);
  const maxDayCount = Math.max(...data.weekdayStats.map(d => d.count), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-violet-900/80 backdrop-blur-lg border-b border-violet-700/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="text-violet-300 hover:text-violet-100">
            <FiHome className="w-6 h-6" />
          </Link>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            📊 Weekend Recap
          </h1>
          <button onClick={fetchRecap} className="text-violet-300 hover:text-violet-100">
            <FiRefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Hero Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-violet-800/50 to-fuchsia-800/50 rounded-2xl p-6 border border-violet-600/30"
        >
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="text-6xl mb-2"
            >
              {vibe.emoji}
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-1">Your Week in Smoke</h2>
            <p className="text-violet-300">{vibe.message}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-white">{data.totalCheckins}</div>
              <div className="text-violet-400 text-sm">Smokes</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-amber-400">
                {data.avgRating > 0 ? data.avgRating.toFixed(1) : "-"}
              </div>
              <div className="text-violet-400 text-sm">Avg Rating</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-fuchsia-400">{data.uniqueBrands}</div>
              <div className="text-violet-400 text-sm">Brands</div>
            </div>
          </div>

          {/* Week over week comparison */}
          {data.comparison.lastWeekCount > 0 || data.totalCheckins > 0 ? (
            <div className="mt-4 pt-4 border-t border-violet-600/30 flex items-center justify-center gap-2">
              {data.comparison.change > 0 ? (
                <FiTrendingUp className="w-5 h-5 text-green-400" />
              ) : data.comparison.change < 0 ? (
                <FiTrendingDown className="w-5 h-5 text-red-400" />
              ) : (
                <FiMinus className="w-5 h-5 text-violet-400" />
              )}
              <span className={`font-medium ${
                data.comparison.change > 0 ? "text-green-400" : 
                data.comparison.change < 0 ? "text-red-400" : "text-violet-400"
              }`}>
                {data.comparison.change > 0 ? "+" : ""}{data.comparison.change} vs last week
                {data.comparison.changePercent !== 0 && ` (${data.comparison.changePercent > 0 ? "+" : ""}${data.comparison.changePercent}%)`}
              </span>
            </div>
          ) : null}
        </motion.div>

        {/* Top Brand */}
        {data.topBrand && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-violet-800/40 rounded-xl p-4 border border-violet-600/30"
          >
            <div className="flex items-center gap-3 mb-2">
              <FiAward className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-white">Top Brand This Week</h3>
            </div>
            <div className="flex items-center justify-between">
              <Link 
                href={`/cigar/${encodeURIComponent(data.topBrand.brand)}`}
                className="text-xl font-bold text-violet-200 hover:text-white transition-colors"
              >
                {data.topBrand.brand}
              </Link>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-violet-400">{data.topBrand.count}x</span>
                <span className="text-amber-400 flex items-center gap-1">
                  <FiStar className="w-4 h-4" />
                  {data.topBrand.avgRating}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Best Rated Smoke */}
        {data.bestRated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-r from-amber-900/40 to-amber-800/20 rounded-xl p-4 border border-amber-600/30"
          >
            <div className="flex items-center gap-3 mb-2">
              <FiStar className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-white">Best Rated Smoke</h3>
            </div>
            <Link 
              href={`/checkin/${data.bestRated.id}`}
              className="block hover:bg-amber-800/20 rounded-lg p-2 -m-2 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-amber-200">{data.bestRated.brand}</div>
                  {data.bestRated.product && (
                    <div className="text-sm text-amber-400/70">{data.bestRated.product}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-amber-400">
                  {"★".repeat(data.bestRated.rating)}
                  <span className="text-amber-600">{"★".repeat(5 - data.bestRated.rating)}</span>
                </div>
              </div>
              {data.bestRated.review && (
                <p className="mt-2 text-sm text-amber-300/80 line-clamp-2">"{data.bestRated.review}"</p>
              )}
            </Link>
          </motion.div>
        )}

        {/* Day by Day Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-violet-800/40 rounded-xl p-4 border border-violet-600/30"
        >
          <div className="flex items-center gap-3 mb-4">
            <FiCalendar className="w-5 h-5 text-violet-400" />
            <h3 className="font-semibold text-white">Day by Day</h3>
          </div>
          <div className="space-y-2">
            {data.weekdayStats.map((day, i) => (
              <div key={day.day} className="flex items-center gap-3">
                <span className="w-12 text-xs text-violet-400">{day.day.slice(0, 3)}</span>
                <div className="flex-1 h-4 bg-violet-900/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(day.count / maxDayCount) * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                  />
                </div>
                <span className="w-8 text-sm text-violet-300 text-right">{day.count}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Peak Hour */}
        {data.peakCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-violet-800/40 rounded-xl p-4 border border-violet-600/30"
          >
            <div className="flex items-center gap-3">
              <FiClock className="w-5 h-5 text-violet-400" />
              <div>
                <h3 className="font-semibold text-white">Peak Smoking Hour</h3>
                <p className="text-violet-300">
                  {formatHour(data.peakHour)} ({data.peakCount} smokes)
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Engagement Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-violet-800/40 rounded-xl p-4 border border-violet-600/30"
        >
          <div className="flex items-center gap-3 mb-4">
            <FiSmile className="w-5 h-5 text-pink-400" />
            <h3 className="font-semibold text-white">Social Stats</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-violet-900/40 rounded-lg p-3">
              <div className="text-sm text-violet-400 mb-2">Received</div>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-pink-400">
                  <FiHeart className="w-4 h-4" />
                  {data.engagement.received.likes}
                </span>
                <span className="flex items-center gap-1 text-blue-400">
                  <FiMessageCircle className="w-4 h-4" />
                  {data.engagement.received.comments}
                </span>
                <span className="text-amber-400">
                  🔥 {data.engagement.received.reactions}
                </span>
              </div>
            </div>
            <div className="bg-violet-900/40 rounded-lg p-3">
              <div className="text-sm text-violet-400 mb-2">Given</div>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-pink-400">
                  <FiHeart className="w-4 h-4" />
                  {data.engagement.given.likes}
                </span>
                <span className="flex items-center gap-1 text-blue-400">
                  <FiMessageCircle className="w-4 h-4" />
                  {data.engagement.given.comments}
                </span>
                <span className="text-amber-400">
                  🔥 {data.engagement.given.reactions}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Category Breakdown */}
        {Object.keys(data.categoryStats).length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-violet-800/40 rounded-xl p-4 border border-violet-600/30"
          >
            <h3 className="font-semibold text-white mb-3">Category Mix</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.categoryStats).map(([cat, count]) => (
                <span
                  key={cat}
                  className="px-3 py-1 bg-violet-900/50 rounded-full text-sm text-violet-200 flex items-center gap-1"
                >
                  {getCategoryEmoji(cat)} {cat} ({count})
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Streak Status */}
        {data.streak.current > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-orange-900/40 to-red-900/30 rounded-xl p-4 border border-orange-600/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔥</span>
                <div>
                  <h3 className="font-semibold text-white">Current Streak</h3>
                  <p className="text-orange-300 text-sm">Keep it going!</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-400">{data.streak.current} days</div>
                {data.streak.longest > data.streak.current && (
                  <div className="text-sm text-orange-400/70">Best: {data.streak.longest}</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {data.totalCheckins === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-white mb-2">No smokes this week yet!</h3>
            <p className="text-violet-300 mb-4">Log a smoke to see your weekly stats</p>
            <Link
              href="/checkin"
              className="inline-block bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Log a Smoke
            </Link>
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex justify-center gap-4 pt-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-violet-300 hover:text-white transition-colors"
          >
            <FiHome className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            href="/leaderboard"
            className="flex items-center gap-2 text-violet-300 hover:text-white transition-colors"
          >
            <FiAward className="w-4 h-4" />
            Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}
