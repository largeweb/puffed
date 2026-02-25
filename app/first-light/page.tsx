"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FiArrowLeft, FiSun, FiClock, FiAward, FiTrendingUp } from "react-icons/fi";

interface FirstLighter {
  username: string;
  firstLightCount: number;
  lastFirstLight: string;
  rank: number;
}

interface DailyFirstLight {
  date: string;
  username: string;
  brand: string;
  time: string;
}

interface FirstLightResponse {
  leaders: FirstLighter[];
  recentDays: DailyFirstLight[];
  todaysFirstLight: DailyFirstLight | null;
  platformStats: {
    totalDays: number;
    mostWins: number;
    competitionLevel: string;
  };
}

const RANK_EMOJIS = ["🥇", "🥈", "🥉"];
const RANK_COLORS = [
  "from-yellow-500 to-amber-600",
  "from-gray-300 to-gray-400",
  "from-amber-600 to-orange-700",
];

export default function FirstLightPage() {
  const [data, setData] = useState<FirstLightResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/first-light");
        if (res.ok) {
          const json = await res.json() as FirstLightResponse;
          setData(json);
        }
      } catch (error) {
        console.error("Failed to load first light data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6">
            <FiArrowLeft /> Back to Dashboard
          </Link>
          <div className="text-center py-12 text-gray-400">
            Failed to load data
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-yellow-900/10 to-gray-900">
      <div className="max-w-2xl mx-auto p-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
          <Link
            href="/leaderboard"
            className="text-yellow-400 hover:text-yellow-300 text-sm"
          >
            All Leaderboards →
          </Link>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 mb-4">
            <FiSun className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">First Light ☀️</h1>
          <p className="text-gray-400">
            Who logs the first smoke of the day?
          </p>
        </motion.div>

        {/* Today's First Light */}
        {data.todaysFirstLight && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6 mb-6 border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-orange-500/10"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🌅</span>
              <h2 className="text-lg font-semibold text-yellow-400">Today&apos;s First Light</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Link
                  href={`/user/${data.todaysFirstLight.username}`}
                  className="text-xl font-bold text-white hover:text-yellow-400 transition-colors"
                >
                  @{data.todaysFirstLight.username}
                </Link>
                <p className="text-gray-400 text-sm mt-1">
                  {data.todaysFirstLight.brand} • {data.todaysFirstLight.time}
                </p>
              </div>
              <div className="text-4xl">☀️</div>
            </div>
          </motion.div>
        )}

        {/* Platform Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {data.platformStats.totalDays}
            </div>
            <div className="text-xs text-gray-400">Days Tracked</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">
              {data.platformStats.mostWins}
            </div>
            <div className="text-xs text-gray-400">Most Wins</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-sm font-bold text-amber-400">
              {data.platformStats.competitionLevel}
            </div>
            <div className="text-xs text-gray-400">Competition</div>
          </div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <FiAward className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-white">First Light Leaders</h2>
          </div>
          <div className="space-y-2">
            {data.leaders.map((leader, index) => {
              const isTopThree = index < 3;
              return (
                <motion.div
                  key={leader.username}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + index * 0.05 }}
                  className={`glass rounded-xl p-4 ${
                    isTopThree ? "border border-yellow-500/30" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                        isTopThree
                          ? `bg-gradient-to-br ${RANK_COLORS[index]} text-white`
                          : "bg-white/5 text-gray-400"
                      }`}
                    >
                      {isTopThree ? RANK_EMOJIS[index] : leader.rank}
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/user/${leader.username}`}
                        className="font-semibold hover:text-yellow-400 transition-colors truncate block"
                      >
                        @{leader.username}
                      </Link>
                      <div className="text-xs text-gray-400">
                        Last win: {leader.lastFirstLight}
                      </div>
                    </div>

                    {/* Win count */}
                    <div className="text-right">
                      <div className="text-xl font-bold text-yellow-400">
                        {leader.firstLightCount}
                      </div>
                      <div className="text-xs text-gray-400">
                        {leader.firstLightCount === 1 ? "win" : "wins"}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Days */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <FiClock className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-white">Recent First Lights</h2>
          </div>
          <div className="space-y-2">
            {data.recentDays.map((day, index) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 + index * 0.03 }}
                className="glass rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {index === 0 ? "🌅" : "☀️"}
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm">
                      {day.date}
                    </div>
                    <Link
                      href={`/user/${day.username}`}
                      className="text-xs text-yellow-400 hover:text-yellow-300"
                    >
                      @{day.username}
                    </Link>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white">{day.brand}</div>
                  <div className="text-xs text-gray-400">{day.time}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-400 text-sm mb-3">
            Be the first to log your smoke tomorrow morning!
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all"
          >
            <FiTrendingUp className="w-5 h-5" />
            Log a Smoke
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
