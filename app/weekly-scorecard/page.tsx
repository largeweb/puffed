"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiHome, FiRefreshCw, FiTrendingUp, FiTrendingDown, FiMinus, FiStar, FiHeart, FiMessageSquare, FiUsers, FiAward, FiCalendar, FiZap, FiTarget } from "react-icons/fi";

interface WeeklyStats {
  smokesThisWeek: number;
  smokesLastWeek: number;
  avgRatingThisWeek: number | null;
  avgRatingLastWeek: number | null;
  likesReceived: number;
  likesGiven: number;
  commentsReceived: number;
  commentsGiven: number;
  newFollowers: number;
  newFollowing: number;
  reactionsReceived: number;
  badgesEarnedThisWeek: string[];
  currentStreak: number;
  bestSmokeThisWeek: {
    brand: string;
    product?: string;
    rating: number;
    checkinId: number;
  } | null;
  mostEngagedCheckin: {
    brand: string;
    likes: number;
    comments: number;
    checkinId: number;
  } | null;
  weekStartDate: string;
  weekEndDate: string;
  uniqueBrandsThisWeek: number;
  totalSmokesAllTime: number;
  percentileRank: number;
}

interface ScorecardData {
  stats: WeeklyStats;
  weeklyGoal: number | null;
  communityAvgSmokes: number;
  gradeEmoji: string;
  gradeName: string;
  gradeMessage: string;
}

function getTrendIcon(current: number, previous: number) {
  if (current > previous) return <FiTrendingUp className="text-green-400" />;
  if (current < previous) return <FiTrendingDown className="text-red-400" />;
  return <FiMinus className="text-gray-500" />;
}

function getTrendColor(current: number, previous: number) {
  if (current > previous) return "text-green-400";
  if (current < previous) return "text-red-400";
  return "text-gray-500";
}

function formatChange(current: number, previous: number) {
  const diff = current - previous;
  if (diff > 0) return `+${diff}`;
  if (diff < 0) return `${diff}`;
  return "—";
}

export default function WeeklyScorecardPage() {
  const router = useRouter();
  const [data, setData] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/weekly-scorecard");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const result = await res.json() as ScorecardData;
      setData(result);
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-purple-950 text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-800 rounded w-2/3"></div>
            <div className="h-48 bg-gray-800/50 rounded-xl"></div>
            <div className="h-32 bg-gray-800/50 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-purple-950 text-white p-4">
        <div className="max-w-lg mx-auto text-center py-20">
          <p className="text-gray-400">Failed to load scorecard</p>
        </div>
      </div>
    );
  }

  const { stats, communityAvgSmokes, gradeEmoji, gradeName, gradeMessage } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-purple-950 text-white p-4 pb-20">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <FiHome size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-3xl">📊</span> Weekly Scorecard
              </h1>
              <p className="text-sm text-indigo-400/70">
                {stats.weekStartDate} — {stats.weekEndDate}
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            className={`p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all ${refreshing ? "animate-spin" : ""}`}
          >
            <FiRefreshCw size={20} />
          </button>
        </div>

        {/* Grade Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-indigo-900/50 via-purple-900/40 to-indigo-900/50 border border-indigo-500/30 text-center"
        >
          <motion.span 
            className="text-6xl block mb-3"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {gradeEmoji}
          </motion.span>
          <h2 className="text-2xl font-bold text-indigo-300">{gradeName}</h2>
          <p className="text-sm text-gray-400 mt-1">{gradeMessage}</p>
          {stats.percentileRank > 0 && (
            <p className="text-xs text-indigo-400/70 mt-3">
              Top {100 - stats.percentileRank}% of smokers this week
            </p>
          )}
        </motion.div>

        {/* Smokes Overview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4 p-4 rounded-xl bg-gray-900/50 border border-gray-800/50"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
              <FiCalendar size={14} /> Smoking Activity
            </h3>
            {getTrendIcon(stats.smokesThisWeek, stats.smokesLastWeek)}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-indigo-400">{stats.smokesThisWeek}</p>
              <p className="text-xs text-gray-600">This Week</p>
            </div>
            <div className="border-x border-gray-800">
              <p className={`text-xl font-bold ${getTrendColor(stats.smokesThisWeek, stats.smokesLastWeek)}`}>
                {formatChange(stats.smokesThisWeek, stats.smokesLastWeek)}
              </p>
              <p className="text-xs text-gray-600">vs Last Week</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-500">{stats.smokesLastWeek}</p>
              <p className="text-xs text-gray-600">Last Week</p>
            </div>
          </div>
          {communityAvgSmokes > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-800/50 text-center">
              <p className="text-xs text-gray-600">
                Community avg: <span className="text-indigo-400">{communityAvgSmokes.toFixed(1)}</span> smokes/week
                {stats.smokesThisWeek > communityAvgSmokes && (
                  <span className="text-green-400 ml-2">⬆️ Above avg!</span>
                )}
              </p>
            </div>
          )}
        </motion.div>

        {/* Rating & Discovery */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-4 rounded-xl bg-gray-900/50 border border-gray-800/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <FiStar className="text-yellow-400" size={14} />
              <span className="text-xs text-gray-500">Avg Rating</span>
            </div>
            <p className="text-2xl font-bold text-yellow-400">
              {stats.avgRatingThisWeek?.toFixed(1) || "—"}
            </p>
            {stats.avgRatingLastWeek && stats.avgRatingThisWeek && (
              <p className={`text-xs ${getTrendColor(stats.avgRatingThisWeek, stats.avgRatingLastWeek)}`}>
                {formatChange(parseFloat(stats.avgRatingThisWeek.toFixed(1)), parseFloat(stats.avgRatingLastWeek.toFixed(1)))} vs last week
              </p>
            )}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl bg-gray-900/50 border border-gray-800/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <FiTarget className="text-purple-400" size={14} />
              <span className="text-xs text-gray-500">Brands Tried</span>
            </div>
            <p className="text-2xl font-bold text-purple-400">{stats.uniqueBrandsThisWeek}</p>
            <p className="text-xs text-gray-600">unique brands</p>
          </motion.div>
        </div>

        {/* Social Engagement */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-4 p-4 rounded-xl bg-gradient-to-r from-pink-950/30 via-gray-900/50 to-pink-950/30 border border-pink-800/30"
        >
          <h3 className="text-sm font-semibold text-pink-400 mb-3 flex items-center gap-2">
            <FiHeart size={14} /> Social Engagement
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <FiHeart size={10} /> Likes received
                </span>
                <span className="text-sm font-semibold text-pink-400">{stats.likesReceived}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <FiHeart size={10} /> Likes given
                </span>
                <span className="text-sm font-semibold text-gray-400">{stats.likesGiven}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <FiMessageSquare size={10} /> Comments received
                </span>
                <span className="text-sm font-semibold text-pink-400">{stats.commentsReceived}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <FiMessageSquare size={10} /> Comments given
                </span>
                <span className="text-sm font-semibold text-gray-400">{stats.commentsGiven}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <FiUsers size={10} /> New followers
                </span>
                <span className="text-sm font-semibold text-pink-400">{stats.newFollowers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <FiZap size={10} /> Reactions
                </span>
                <span className="text-sm font-semibold text-pink-400">{stats.reactionsReceived}</span>
              </div>
            </div>
          </div>
          {(stats.likesReceived + stats.commentsReceived + stats.newFollowers + stats.reactionsReceived) === 0 && (
            <p className="text-xs text-gray-600 text-center mt-3 pt-3 border-t border-gray-800/50">
              Engage more to get engagement back! 💕
            </p>
          )}
        </motion.div>

        {/* Streak & Badges */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-xl bg-gradient-to-br from-orange-950/40 to-gray-900/50 border border-orange-800/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🔥</span>
              <span className="text-xs text-gray-500">Current Streak</span>
            </div>
            <p className="text-3xl font-bold text-orange-400">{stats.currentStreak}</p>
            <p className="text-xs text-gray-600">days</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="p-4 rounded-xl bg-gradient-to-br from-amber-950/40 to-gray-900/50 border border-amber-800/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <FiAward className="text-amber-400" size={16} />
              <span className="text-xs text-gray-500">Badges This Week</span>
            </div>
            <p className="text-3xl font-bold text-amber-400">{stats.badgesEarnedThisWeek.length}</p>
            {stats.badgesEarnedThisWeek.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {stats.badgesEarnedThisWeek.slice(0, 3).map((badge, i) => (
                  <span key={i} className="text-lg">{badge}</span>
                ))}
                {stats.badgesEarnedThisWeek.length > 3 && (
                  <span className="text-xs text-amber-400/70">+{stats.badgesEarnedThisWeek.length - 3}</span>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* Best Smoke This Week */}
        {stats.bestSmokeThisWeek && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-4 p-4 rounded-xl bg-gradient-to-r from-yellow-950/30 via-gray-900/50 to-yellow-950/30 border border-yellow-700/30"
          >
            <h3 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
              <span className="text-lg">⭐</span> Best Smoke This Week
            </h3>
            <Link href={`/checkin/${stats.bestSmokeThisWeek.checkinId}`} className="block hover:opacity-80 transition-opacity">
              <p className="font-semibold text-gray-200">
                {stats.bestSmokeThisWeek.brand}
                {stats.bestSmokeThisWeek.product && <span className="text-gray-500"> — {stats.bestSmokeThisWeek.product}</span>}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <FiStar className="text-yellow-400" size={14} />
                <span className="text-yellow-400 font-bold">{stats.bestSmokeThisWeek.rating}</span>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Most Engaged Check-in */}
        {stats.mostEngagedCheckin && (stats.mostEngagedCheckin.likes > 0 || stats.mostEngagedCheckin.comments > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mb-4 p-4 rounded-xl bg-gradient-to-r from-pink-950/30 via-gray-900/50 to-pink-950/30 border border-pink-700/30"
          >
            <h3 className="text-sm font-semibold text-pink-400 mb-2 flex items-center gap-2">
              <span className="text-lg">🔥</span> Most Loved Check-in
            </h3>
            <Link href={`/checkin/${stats.mostEngagedCheckin.checkinId}`} className="block hover:opacity-80 transition-opacity">
              <p className="font-semibold text-gray-200">{stats.mostEngagedCheckin.brand}</p>
              <div className="flex items-center gap-3 mt-1 text-sm">
                <span className="flex items-center gap-1 text-pink-400">
                  <FiHeart size={12} /> {stats.mostEngagedCheckin.likes}
                </span>
                <span className="flex items-center gap-1 text-gray-500">
                  <FiMessageSquare size={12} /> {stats.mostEngagedCheckin.comments}
                </span>
              </div>
            </Link>
          </motion.div>
        )}

        {/* All-Time Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-4 rounded-xl bg-gray-900/30 border border-gray-800/30"
        >
          <h3 className="text-sm font-semibold text-gray-500 mb-2">📈 All-Time Progress</h3>
          <p className="text-xs text-gray-600">
            Total smokes logged: <span className="text-indigo-400 font-semibold">{stats.totalSmokesAllTime}</span>
          </p>
        </motion.div>

        {/* Quick Links */}
        <div className="mt-6 flex gap-2">
          <Link 
            href="/achievements"
            className="flex-1 p-3 rounded-xl bg-amber-950/30 border border-amber-800/30 text-center hover:bg-amber-950/40 transition-colors"
          >
            <span className="text-xl">🏆</span>
            <p className="text-sm text-amber-300 mt-1">Badges</p>
          </Link>
          <Link 
            href="/mystats"
            className="flex-1 p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/30 text-center hover:bg-indigo-950/40 transition-colors"
          >
            <span className="text-xl">📊</span>
            <p className="text-sm text-indigo-300 mt-1">My Stats</p>
          </Link>
          <Link 
            href="/leaderboard"
            className="flex-1 p-3 rounded-xl bg-purple-950/30 border border-purple-800/30 text-center hover:bg-purple-950/40 transition-colors"
          >
            <span className="text-xl">👑</span>
            <p className="text-sm text-purple-300 mt-1">Leaderboard</p>
          </Link>
        </div>

        {/* Motivational Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <p className="text-indigo-700/60 italic text-sm">&quot;Every week is a fresh opportunity to puff.&quot;</p>
          <p className="text-xs text-gray-700 mt-1">📊 Weekly Scorecard • Track Your Progress</p>
        </motion.div>
      </div>
    </div>
  );
}
