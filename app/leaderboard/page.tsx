"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { FiAward, FiHome, FiTrendingUp, FiCalendar, FiHeart, FiStar, FiZap } from "react-icons/fi";
import Link from "next/link";
import type { LeaderboardEntry, LeaderboardResponse, StreakLeaderEntry } from "@/lib/types";

type TimeFrame = "allTime" | "thisMonth" | "thisWeek" | "streaks";

const RANK_EMOJIS = ["🥇", "🥈", "🥉"];
const RANK_COLORS = [
  "from-yellow-500 to-amber-600",
  "from-gray-300 to-gray-400", 
  "from-amber-600 to-orange-700"
];

function StreakCard({ entry, index }: { entry: StreakLeaderEntry; index: number }) {
  const isTopThree = index < 3;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`glass rounded-xl p-4 ${isTopThree ? "border border-orange-500/30" : ""}`}
    >
      <div className="flex items-center gap-4">
        {/* Rank */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${
          isTopThree 
            ? `bg-gradient-to-br ${RANK_COLORS[index]} text-white`
            : "bg-white/5 text-gray-400"
        }`}>
          {isTopThree ? RANK_EMOJIS[index] : entry.rank}
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <Link 
            href={`/user/${entry.username}`}
            className="font-semibold hover:text-amber-500 transition-colors truncate block"
          >
            @{entry.username}
          </Link>
          <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
            <span className="flex items-center gap-1 text-orange-400 font-medium">
              🔥 {entry.currentStreak} day{entry.currentStreak === 1 ? "" : "s"}
            </span>
            {entry.bestStreak > entry.currentStreak && (
              <span className="flex items-center gap-1 text-gray-500">
                Best: {entry.bestStreak} days
              </span>
            )}
          </div>
        </div>

        {/* Streak flame */}
        <div className="text-3xl">
          {entry.currentStreak >= 7 ? "🔥" : entry.currentStreak >= 3 ? "🔥" : "🌟"}
        </div>
      </div>
    </motion.div>
  );
}

function LeaderboardCard({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  const isTopThree = index < 3;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`glass rounded-xl p-4 ${isTopThree ? "border border-amber-500/30" : ""}`}
    >
      <div className="flex items-center gap-4">
        {/* Rank */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${
          isTopThree 
            ? `bg-gradient-to-br ${RANK_COLORS[index]} text-white`
            : "bg-white/5 text-gray-400"
        }`}>
          {isTopThree ? RANK_EMOJIS[index] : entry.rank}
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <Link 
            href={`/user/${entry.username}`}
            className="font-semibold hover:text-amber-500 transition-colors truncate block"
          >
            @{entry.username}
          </Link>
          <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
            <span className="flex items-center gap-1">
              🚬 {entry.checkin_count} {entry.checkin_count === 1 ? "smoke" : "smokes"}
            </span>
            {entry.avg_rating && (
              <span className="flex items-center gap-1">
                <FiStar className="text-amber-500" size={12} /> {entry.avg_rating}
              </span>
            )}
            <span className="flex items-center gap-1">
              📦 {entry.unique_brands} {entry.unique_brands === 1 ? "brand" : "brands"}
            </span>
          </div>
        </div>

        {/* Likes received */}
        {entry.total_likes_received > 0 && (
          <div className="flex items-center gap-1 text-red-400 text-sm">
            <FiHeart size={14} fill="currentColor" />
            <span>{entry.total_likes_received}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("allTime");

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    try {
      const res = await fetch("/api/leaderboard");
      const json: LeaderboardResponse = await res.json();
      setData(json);
    } catch (error) {
      console.error("Leaderboard error:", error);
    } finally {
      setLoading(false);
    }
  }

  const entries = timeFrame === "streaks" ? (data?.streaks || []) : (data?.[timeFrame] || []);
  const isStreakMode = timeFrame === "streaks";

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full"
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <FiAward size={20} />
              </div>
              <div>
                <h1 className="font-semibold">Leaderboard</h1>
                <p className="text-xs text-gray-400">Top smokers on Puffed</p>
              </div>
            </div>
            <Link 
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <FiHome size={20} />
            </Link>
          </div>

          {/* Time frame selector */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
            <button
              onClick={() => setTimeFrame("allTime")}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
                timeFrame === "allTime" 
                  ? "bg-amber-500 text-black" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <FiTrendingUp size={14} />
              All
            </button>
            <button
              onClick={() => setTimeFrame("thisMonth")}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
                timeFrame === "thisMonth" 
                  ? "bg-amber-500 text-black" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <FiCalendar size={14} />
              Month
            </button>
            <button
              onClick={() => setTimeFrame("thisWeek")}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
                timeFrame === "thisWeek" 
                  ? "bg-amber-500 text-black" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              📅
              Week
            </button>
            <button
              onClick={() => setTimeFrame("streaks")}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
                timeFrame === "streaks" 
                  ? "bg-orange-500 text-black" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              🔥
              Streaks
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {entries.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 text-gray-400"
            >
              <p className="text-4xl mb-3">{isStreakMode ? "🔥" : "🏆"}</p>
              <p>
                {isStreakMode 
                  ? "No active streaks yet" 
                  : timeFrame === "thisWeek" 
                    ? "No activity this week" 
                    : timeFrame === "thisMonth" 
                      ? "No activity this month" 
                      : "No activity yet"}
              </p>
              <p className="text-sm mt-2">
                {isStreakMode 
                  ? "Log a smoke daily to build your streak!" 
                  : "Be the first to claim the top spot!"}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={timeFrame}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {isStreakMode ? (
                <>
                  {/* Streak info banner */}
                  <div className="glass rounded-xl p-4 mb-4 border border-orange-500/20">
                    <div className="flex items-center gap-2 text-orange-400 text-sm">
                      <span className="text-xl">🔥</span>
                      <span>Log a smoke every day to build your streak!</span>
                    </div>
                  </div>
                  {(entries as StreakLeaderEntry[]).map((entry, index) => (
                    <StreakCard key={entry.username} entry={entry} index={index} />
                  ))}
                </>
              ) : (
                (entries as LeaderboardEntry[]).map((entry, index) => (
                  <LeaderboardCard key={entry.username} entry={entry} index={index} />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
