"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiHome,
  FiRefreshCw,
  FiClock,
  FiAward,
  FiUsers,
  FiStar,
  FiCalendar,
  FiCoffee,
  FiSun,
  FiTrendingUp,
} from "react-icons/fi";
import { GiChampagneCork } from "react-icons/gi";

interface BrunchMenu {
  name: string;
  emoji: string;
  desc: string;
  pairing: string;
}

interface BrunchSmoker {
  username: string;
  lastSmoke: string;
  brunchSmokes: number;
  favoriteDay: string;
  isActive: boolean;
}

interface LeaderboardEntry {
  username: string;
  totalBrunchSmokes: number;
  avgRating: number;
  streak: number;
  topBrand: string | null;
}

interface BrunchData {
  isBrunchTime: boolean;
  isWeekend: boolean;
  currentHour: number;
  dayOfWeek: string;
  countdownMessage: string;
  menu: BrunchMenu;
  brunchCrew: BrunchSmoker[];
  leaderboard: LeaderboardEntry[];
  stats: {
    totalBrunchSmokes: number;
    yourBrunchSmokes: number;
    brunchersToday: number;
    mostPopularHour: number;
    saturdaySmokes: number;
    sundaySmokes: number;
    topBrunchBrand: string | null;
  };
  vibes: {
    message: string;
    emoji: string;
    suggestion: string;
  };
}

export default function BrunchClubPage() {
  const [data, setData] = useState<BrunchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"crew" | "leaderboard">("crew");
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/brunch");
      const json = (await res.json()) as BrunchData;
      setData(json);
    } catch (err) {
      console.error("Failed to fetch brunch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-yellow-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-6xl"
        >
          🥞
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-yellow-900 flex items-center justify-center">
        <p className="text-white">Failed to load brunch data</p>
      </div>
    );
  }

  const formatHour = (hour: number) => {
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour} ${suffix}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-yellow-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating brunch items */}
        {data.isBrunchTime && (
          <>
            <motion.div
              className="absolute text-6xl opacity-20"
              style={{ top: "10%", left: "5%" }}
              animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              🥂
            </motion.div>
            <motion.div
              className="absolute text-5xl opacity-15"
              style={{ top: "30%", right: "10%" }}
              animate={{ y: [0, 15, 0], rotate: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, delay: 1 }}
            >
              🥓
            </motion.div>
            <motion.div
              className="absolute text-4xl opacity-20"
              style={{ bottom: "20%", left: "15%" }}
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
            >
              ☕
            </motion.div>
            <motion.div
              className="absolute text-5xl opacity-15"
              style={{ top: "50%", right: "5%" }}
              animate={{ y: [0, 20, 0], rotate: [0, 15, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, delay: 2 }}
            >
              🍳
            </motion.div>
            <motion.div
              className="absolute text-6xl opacity-10"
              style={{ bottom: "10%", right: "20%" }}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
            >
              🧇
            </motion.div>
          </>
        )}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-amber-800/90 to-orange-800/90 backdrop-blur-md border-b border-amber-500/30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="text-amber-200 hover:text-white">
            <FiHome className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥞</span>
            <h1 className="text-xl font-bold text-white">Weekend Brunch Club</h1>
          </div>
          <button
            onClick={() => fetchData()}
            className="text-amber-200 hover:text-white"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6 relative z-10">
        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-6 text-center ${
            data.isBrunchTime
              ? "bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-400/40"
              : "bg-zinc-800/50 border border-zinc-700"
          }`}
        >
          <div className="text-6xl mb-4">
            {data.isBrunchTime ? data.vibes.emoji : "🔒"}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {data.isBrunchTime ? data.vibes.message : "Brunch Club Closed"}
          </h2>
          <p className="text-amber-200/80 mb-4">
            {data.isBrunchTime ? data.vibes.suggestion : data.countdownMessage}
          </p>
          
          {data.isBrunchTime && (
            <div className="flex items-center justify-center gap-2 text-amber-300">
              <FiClock className="w-4 h-4" />
              <span>{data.dayOfWeek} • {formatHour(data.currentHour)}</span>
            </div>
          )}
        </motion.div>

        {/* Today's Menu */}
        {data.isBrunchTime && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-2xl p-6 border border-yellow-500/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">{data.menu.emoji}</span>
              <div>
                <h3 className="text-xl font-bold text-white">{data.menu.name}</h3>
                <p className="text-amber-200/70">{data.menu.desc}</p>
              </div>
            </div>
            <div className="bg-amber-900/30 rounded-xl p-4 border border-amber-500/20">
              <p className="text-sm text-amber-300 font-medium mb-1">🎯 Today&apos;s Pairing Suggestion</p>
              <p className="text-white">{data.menu.pairing}</p>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <div className="bg-amber-800/30 rounded-xl p-4 text-center border border-amber-600/20">
            <p className="text-3xl font-bold text-amber-300">
              {data.stats.totalBrunchSmokes}
            </p>
            <p className="text-xs text-amber-200/60">Total Brunch Smokes</p>
          </div>
          <div className="bg-orange-800/30 rounded-xl p-4 text-center border border-orange-600/20">
            <p className="text-3xl font-bold text-orange-300">
              {data.stats.yourBrunchSmokes}
            </p>
            <p className="text-xs text-orange-200/60">Your Brunch Smokes</p>
          </div>
          <div className="bg-yellow-800/30 rounded-xl p-4 text-center border border-yellow-600/20">
            <p className="text-3xl font-bold text-yellow-300">
              {data.stats.brunchersToday}
            </p>
            <p className="text-xs text-yellow-200/60">Brunching Today</p>
          </div>
          <div className="bg-red-800/30 rounded-xl p-4 text-center border border-red-600/20">
            <p className="text-3xl font-bold text-red-300">
              {formatHour(data.stats.mostPopularHour)}
            </p>
            <p className="text-xs text-red-200/60">Peak Hour</p>
          </div>
        </motion.div>

        {/* Saturday vs Sunday */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-r from-blue-800/30 to-purple-800/30 rounded-xl p-4 border border-blue-500/20"
        >
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <FiCalendar className="w-4 h-4" />
            Weekend Battle
          </h3>
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-2xl mb-1">🅂</p>
              <p className="text-2xl font-bold text-blue-300">{data.stats.saturdaySmokes}</p>
              <p className="text-xs text-blue-200/60">Saturday</p>
            </div>
            <div className="text-2xl text-zinc-500">vs</div>
            <div className="text-center flex-1">
              <p className="text-2xl mb-1">🅂</p>
              <p className="text-2xl font-bold text-purple-300">{data.stats.sundaySmokes}</p>
              <p className="text-xs text-purple-200/60">Sunday</p>
            </div>
          </div>
          {data.stats.topBrunchBrand && (
            <div className="mt-3 pt-3 border-t border-zinc-700/50 text-center">
              <p className="text-xs text-zinc-400">Top Brunch Brand</p>
              <p className="text-amber-300 font-medium">{data.stats.topBrunchBrand}</p>
            </div>
          )}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("crew")}
            className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === "crew"
                ? "bg-amber-500 text-black"
                : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50"
            }`}
          >
            <FiUsers className="w-4 h-4" />
            Brunch Crew
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === "leaderboard"
                ? "bg-amber-500 text-black"
                : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50"
            }`}
          >
            <FiAward className="w-4 h-4" />
            Leaderboard
          </button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "crew" && (
            <motion.div
              key="crew"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {data.brunchCrew.length === 0 ? (
                <div className="bg-zinc-800/50 rounded-xl p-8 text-center">
                  <p className="text-4xl mb-3">🥞</p>
                  <p className="text-zinc-400">
                    {data.isBrunchTime
                      ? "No brunch smokers yet today — be the first!"
                      : "Come back during brunch hours to see the crew"}
                  </p>
                </div>
              ) : (
                data.brunchCrew.map((smoker, idx) => (
                  <motion.div
                    key={smoker.username}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50 hover:border-amber-500/30 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/user/${smoker.username}`}
                        className="flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold">
                          {smoker.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white flex items-center gap-2">
                            {smoker.username}
                            {smoker.isActive && (
                              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            )}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {smoker.lastSmoke} • {smoker.favoriteDay} fan
                          </p>
                        </div>
                      </Link>
                      <div className="text-right">
                        <p className="text-amber-300 font-bold">
                          {smoker.brunchSmokes}
                        </p>
                        <p className="text-xs text-zinc-500">brunch smokes</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "leaderboard" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {data.leaderboard.length === 0 ? (
                <div className="bg-zinc-800/50 rounded-xl p-8 text-center">
                  <p className="text-4xl mb-3">🏆</p>
                  <p className="text-zinc-400">
                    No brunch champions yet — start logging weekend smokes!
                  </p>
                </div>
              ) : (
                data.leaderboard.map((entry, idx) => (
                  <motion.div
                    key={entry.username}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`rounded-xl p-4 border transition-all ${
                      idx === 0
                        ? "bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-amber-400/50"
                        : idx === 1
                        ? "bg-gradient-to-r from-zinc-400/20 to-zinc-500/20 border-zinc-400/40"
                        : idx === 2
                        ? "bg-gradient-to-r from-orange-700/30 to-amber-700/30 border-orange-500/40"
                        : "bg-zinc-800/50 border-zinc-700/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            idx === 0
                              ? "bg-amber-500 text-black"
                              : idx === 1
                              ? "bg-zinc-400 text-black"
                              : idx === 2
                              ? "bg-orange-600 text-white"
                              : "bg-zinc-700 text-zinc-300"
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <Link
                          href={`/user/${entry.username}`}
                          className="hover:text-amber-300 transition-colors"
                        >
                          <p className="font-medium text-white">
                            {idx === 0 && "👑 "}
                            {entry.username}
                          </p>
                          {entry.topBrand && (
                            <p className="text-xs text-zinc-400">
                              Fave: {entry.topBrand}
                            </p>
                          )}
                        </Link>
                      </div>
                      <div className="text-right">
                        <p className="text-amber-300 font-bold text-lg">
                          {entry.totalBrunchSmokes}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span className="flex items-center gap-1">
                            <FiStar className="w-3 h-3 text-yellow-400" />
                            {entry.avgRating}
                          </span>
                          <span className="flex items-center gap-1">
                            <FiTrendingUp className="w-3 h-3 text-green-400" />
                            {entry.streak}w
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap gap-2 justify-center pt-4"
        >
          <Link
            href="/coffee"
            className="px-4 py-2 bg-amber-800/30 rounded-full text-amber-200 text-sm hover:bg-amber-700/40 transition-colors flex items-center gap-2"
          >
            <FiCoffee className="w-4 h-4" /> Morning Coffee
          </Link>
          <Link
            href="/saturday-cartoons"
            className="px-4 py-2 bg-purple-800/30 rounded-full text-purple-200 text-sm hover:bg-purple-700/40 transition-colors flex items-center gap-2"
          >
            📺 Saturday Cartoons
          </Link>
          <Link
            href="/weekend-scoreboard"
            className="px-4 py-2 bg-blue-800/30 rounded-full text-blue-200 text-sm hover:bg-blue-700/40 transition-colors flex items-center gap-2"
          >
            🏆 Weekend Scoreboard
          </Link>
          <Link
            href="/happy-hour"
            className="px-4 py-2 bg-orange-800/30 rounded-full text-orange-200 text-sm hover:bg-orange-700/40 transition-colors flex items-center gap-2"
          >
            <FiSun className="w-4 h-4" /> Happy Hour
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
