"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiHome, FiRefreshCw, FiTrendingUp, FiAward, FiStar, FiTarget, FiUsers, FiChevronRight, FiZap } from "react-icons/fi";

interface ScoreBreakdown {
  category: string;
  emoji: string;
  points: number;
  maxPoints: number;
  description: string;
  detail: string;
}

interface LeaderEntry {
  username: string;
  totalScore: number;
  rank: number;
  tier: string;
  tierEmoji: string;
}

interface SmokeScoreData {
  totalScore: number;
  maxPossible: number;
  breakdown: ScoreBreakdown[];
  rank: number;
  totalUsers: number;
  percentile: number;
  tier: string;
  tierEmoji: string;
  nextTier: { name: string; pointsNeeded: number } | null;
  leaderboard: LeaderEntry[];
  tips: string[];
}

function getRankBadge(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function getTierColor(tier: string): string {
  switch (tier) {
    case "Legendary": return "from-amber-400 to-yellow-600";
    case "Master": return "from-purple-400 to-pink-500";
    case "Expert": return "from-cyan-400 to-blue-500";
    case "Enthusiast": return "from-orange-400 to-red-500";
    case "Regular": return "from-green-400 to-emerald-500";
    case "Newcomer": return "from-teal-400 to-cyan-500";
    default: return "from-gray-400 to-gray-500";
  }
}

export default function SmokeScorePage() {
  const router = useRouter();
  const [data, setData] = useState<SmokeScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/smoke-score");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch");
      }
      const json = await res.json() as SmokeScoreData;
      setData(json);
    } catch (error) {
      console.error("Error fetching smoke score:", error);
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
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <FiTarget className="w-12 h-12 text-cyan-400" />
          </motion.div>
          <p className="text-gray-400">Calculating your score...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Failed to load score data</p>
          <button
            onClick={() => fetchData()}
            className="px-4 py-2 bg-cyan-500 text-black rounded-lg font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const scorePercentage = Math.round((data.totalScore / data.maxPossible) * 100);
  const tierColor = getTierColor(data.tier);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <FiHome className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-lg flex items-center gap-2">
            <FiTarget className="text-cyan-400" />
            Smoke Score
          </h1>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Main Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${tierColor} p-1`}
        >
          <div className="bg-gray-900 rounded-[22px] p-6 relative">
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden rounded-[22px]">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-white/10"
                  initial={{ x: Math.random() * 300, y: Math.random() * 200 }}
                  animate={{
                    x: [Math.random() * 300, Math.random() * 300],
                    y: [Math.random() * 200, Math.random() * 200],
                    opacity: [0.1, 0.3, 0.1],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>

            <div className="relative z-10 text-center">
              {/* Tier Badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 mb-4"
              >
                <span className="text-2xl">{data.tierEmoji}</span>
                <span className="font-bold">{data.tier}</span>
              </motion.div>

              {/* Score */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="mb-2"
              >
                <span className="text-7xl font-black">{data.totalScore}</span>
                <span className="text-2xl text-gray-400 ml-1">pts</span>
              </motion.div>

              {/* Progress bar */}
              <div className="w-full bg-gray-800 rounded-full h-3 mb-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${scorePercentage}%` }}
                  transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                  className={`h-full bg-gradient-to-r ${tierColor} rounded-full`}
                />
              </div>
              <p className="text-sm text-gray-400">{scorePercentage}% of max possible ({data.maxPossible} pts)</p>

              {/* Rank */}
              <div className="flex justify-center gap-6 mt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{getRankBadge(data.rank)}</p>
                  <p className="text-xs text-gray-400">Rank</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-cyan-400">{data.percentile}%</p>
                  <p className="text-xs text-gray-400">Top Percentile</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{data.totalUsers}</p>
                  <p className="text-xs text-gray-400">Players</p>
                </div>
              </div>

              {/* Next Tier */}
              {data.nextTier && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <p className="text-sm text-gray-300">
                    <FiZap className="inline mr-1 text-yellow-400" />
                    <span className="font-semibold">{data.nextTier.pointsNeeded}</span> points to{" "}
                    <span className="font-bold text-white">{data.nextTier.name}</span>
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Score Breakdown Toggle */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FiTrendingUp className="text-cyan-400" />
            <span className="font-semibold">Score Breakdown</span>
          </div>
          <motion.div
            animate={{ rotate: showBreakdown ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <FiChevronRight />
          </motion.div>
        </motion.button>

        {/* Breakdown Details */}
        <AnimatePresence>
          {showBreakdown && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              {data.breakdown.map((item, i) => (
                <motion.div
                  key={item.category}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/30"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.emoji}</span>
                      <div>
                        <p className="font-semibold">{item.category}</p>
                        <p className="text-xs text-gray-400">{item.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-cyan-400">{item.points}</p>
                      <p className="text-xs text-gray-500">/{item.maxPoints}</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.points / item.maxPoints) * 100}%` }}
                      transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{item.detail}</p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tips Section */}
        {data.tips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FiZap className="text-yellow-400" />
              Level Up Tips
            </h3>
            <ul className="space-y-2">
              {data.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-yellow-400 mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl bg-gray-800/50 border border-gray-700/50 overflow-hidden"
        >
          <div className="p-4 border-b border-gray-700/50 flex items-center gap-2">
            <FiUsers className="text-purple-400" />
            <h3 className="font-semibold">Score Leaderboard</h3>
          </div>
          <div className="divide-y divide-gray-700/30">
            {data.leaderboard.map((entry, i) => (
              <motion.div
                key={entry.username}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.05 }}
                className="p-4 flex items-center justify-between hover:bg-gray-700/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xl ${i < 3 ? "text-2xl" : ""}`}>
                    {getRankBadge(entry.rank)}
                  </span>
                  <div>
                    <Link 
                      href={`/user/${entry.username}`}
                      className="font-medium hover:text-cyan-400 transition-colors"
                    >
                      {entry.username}
                    </Link>
                    <p className="text-xs text-gray-500">{entry.tierEmoji} {entry.tier}</p>
                  </div>
                </div>
                <p className="font-bold text-lg">{entry.totalScore}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex gap-3"
        >
          <Link
            href="/achievements"
            className="flex-1 p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-center hover:bg-amber-500/30 transition-colors"
          >
            <FiAward className="mx-auto mb-2 text-amber-400" size={24} />
            <p className="text-sm font-medium">Badges</p>
          </Link>
          <Link
            href="/leaderboard"
            className="flex-1 p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-center hover:bg-purple-500/30 transition-colors"
          >
            <FiUsers className="mx-auto mb-2 text-purple-400" size={24} />
            <p className="text-sm font-medium">Leaderboard</p>
          </Link>
          <Link
            href="/goals"
            className="flex-1 p-4 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 text-center hover:bg-green-500/30 transition-colors"
          >
            <FiTarget className="mx-auto mb-2 text-green-400" size={24} />
            <p className="text-sm font-medium">Goals</p>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
