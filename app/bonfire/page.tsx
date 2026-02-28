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
  FiMessageCircle,
} from "react-icons/fi";

interface Phase {
  hour: number;
  phase: string;
  emoji: string;
  desc: string;
  color: string;
}

interface BonfireSmoker {
  id: number;
  username: string;
  brand: string;
  product: string | null;
  rating: number;
  photoUrl: string | null;
  review: string | null;
  time: string;
}

interface LeaderboardEntry {
  username: string;
  bonfireSmokes: number;
  avgRating: number;
  topBrand: string | null;
}

interface BonfireData {
  isBonfireTime: boolean;
  isWeekend: boolean;
  currentHour: number;
  dayOfWeek: number;
  timeMessage: string;
  bonfireMood: string;
  currentPhase: Phase;
  allPhases: Phase[];
  currentBonfireSmokers: BonfireSmoker[];
  leaderboard: LeaderboardEntry[];
  stats: {
    totalSmokes: number;
    uniqueSmokers: number;
    avgRating: number;
    topBrand: string | null;
  };
  myStats: {
    totalSmokes: number;
    avgRating: number;
    favoriteBrand: string | null;
    username: string | null;
  } | null;
  tonightPrompt: string;
  bonfireFact: string;
}

export default function BonfirePage() {
  const router = useRouter();
  const [data, setData] = useState<BonfireData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"flames" | "smokers" | "legends">("smokers");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/bonfire");
      if (res.ok) {
        const result = (await res.json()) as BonfireData;
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch bonfire data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getMoodGradient = (mood: string) => {
    switch (mood) {
      case "blazing":
        return "from-orange-900 via-red-900 to-amber-900";
      case "anticipation":
        return "from-amber-900 via-orange-900 to-yellow-900";
      case "embers":
        return "from-gray-900 via-red-950 to-orange-950";
      case "waiting":
        return "from-slate-900 via-gray-900 to-zinc-900";
      default:
        return "from-orange-900 via-red-900 to-amber-900";
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-amber-900 flex items-center justify-center`}>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-6xl"
        >
          🔥
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-amber-900 flex items-center justify-center text-white">
        <p>Failed to load bonfire data</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getMoodGradient(data.bonfireMood)} text-white relative overflow-hidden`}>
      {/* Animated fire particles */}
      {data.isBonfireTime && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-orange-400 rounded-full opacity-60"
              style={{
                left: `${Math.random() * 100}%`,
                bottom: "0%",
              }}
              animate={{
                y: [0, -window.innerHeight],
                x: [0, (Math.random() - 0.5) * 100],
                opacity: [0.8, 0],
                scale: [1, 0.5],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      )}

      {/* Ember glow effect at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-orange-600/30 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 p-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition">
            <FiHome className="w-5 h-5" />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold flex items-center gap-2 justify-center">
              <span className="text-3xl">🔥</span> The Bonfire
            </h1>
            <p className="text-xs text-orange-200 mt-1">Weekend Evening Gathering</p>
          </div>
          <button
            onClick={fetchData}
            className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="relative z-10 p-4 pb-24 max-w-lg mx-auto space-y-6">
        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl ${
            data.isBonfireTime
              ? "bg-gradient-to-r from-orange-500/40 to-red-500/40 border border-orange-400/30"
              : "bg-black/40 border border-gray-600/30"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl">
              {data.isBonfireTime ? data.currentPhase.emoji : data.bonfireMood === "embers" ? "🌙" : "🪵"}
            </span>
            <div>
              <h2 className="font-bold text-lg">
                {data.isBonfireTime ? data.currentPhase.phase : data.bonfireMood === "waiting" ? "Bonfire Awaits" : "After Hours"}
              </h2>
              <p className="text-sm text-orange-200">{data.timeMessage}</p>
              {data.isBonfireTime && (
                <p className="text-xs text-orange-300 mt-1">{data.currentPhase.desc}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tonight's Prompt */}
        {data.isWeekend && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/20"
          >
            <div className="flex items-start gap-3">
              <FiMessageCircle className="w-5 h-5 text-amber-300 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-amber-300 mb-1">Tonight&apos;s Campfire Question</p>
                <p className="text-sm font-medium">&ldquo;{data.tonightPrompt}&rdquo;</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Phase Timeline (only during bonfire hours) */}
        {data.isBonfireTime && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="overflow-x-auto pb-2"
          >
            <div className="flex gap-2 min-w-max">
              {data.allPhases.map((phase) => (
                <div
                  key={phase.hour}
                  className={`px-3 py-2 rounded-xl text-center min-w-[80px] transition-all ${
                    phase.hour === data.currentHour
                      ? "bg-orange-500/50 border-2 border-orange-300 scale-105"
                      : phase.hour < data.currentHour
                      ? "bg-gray-800/50 opacity-50"
                      : "bg-black/30"
                  }`}
                >
                  <span className="text-xl">{phase.emoji}</span>
                  <p className="text-xs font-medium mt-1">{phase.phase}</p>
                  <p className="text-[10px] text-gray-400">{phase.hour > 12 ? phase.hour - 12 : phase.hour} PM</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-black/30 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("flames")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              activeTab === "flames"
                ? "bg-orange-500/50 text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            🔥 Phases
          </button>
          <button
            onClick={() => setActiveTab("smokers")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              activeTab === "smokers"
                ? "bg-orange-500/50 text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            <FiUsers className="inline mr-1" /> Tonight
          </button>
          <button
            onClick={() => setActiveTab("legends")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              activeTab === "legends"
                ? "bg-orange-500/50 text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            <FiAward className="inline mr-1" /> Legends
          </button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "flames" && (
            <motion.div
              key="flames"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* All Phases */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-orange-300">Bonfire Phases (5-11 PM)</h3>
                {data.allPhases.map((phase, i) => (
                  <div
                    key={phase.hour}
                    className={`p-3 rounded-xl flex items-center gap-3 ${
                      phase.hour === data.currentHour && data.isBonfireTime
                        ? "bg-orange-500/40 border border-orange-400/50"
                        : "bg-black/20"
                    }`}
                  >
                    <span className="text-2xl">{phase.emoji}</span>
                    <div className="flex-1">
                      <p className="font-medium">{phase.phase}</p>
                      <p className="text-xs text-gray-400">{phase.desc}</p>
                    </div>
                    <span className="text-sm text-gray-400">
                      {phase.hour > 12 ? phase.hour - 12 : phase.hour} PM
                    </span>
                  </div>
                ))}
              </div>

              {/* Bonfire Fact */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/20">
                <p className="text-xs text-amber-300 mb-1">🔥 Bonfire Fact</p>
                <p className="text-sm">{data.bonfireFact}</p>
              </div>
            </motion.div>
          )}

          {activeTab === "smokers" && (
            <motion.div
              key="smokers"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Your Bonfire Stats */}
              {data.myStats && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-orange-600/30 to-red-600/30 border border-orange-400/30">
                  <h3 className="text-sm font-semibold mb-3">Your Bonfire Record</h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-2xl font-bold text-orange-300">{data.myStats.totalSmokes}</p>
                      <p className="text-xs text-gray-400">Sessions</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-300">
                        {data.myStats.avgRating > 0 ? data.myStats.avgRating : "-"}
                      </p>
                      <p className="text-xs text-gray-400">Avg Rating</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-300 truncate">
                        {data.myStats.favoriteBrand || "-"}
                      </p>
                      <p className="text-xs text-gray-400">Top Brand</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tonight's Smokers */}
              <div>
                <h3 className="text-sm font-semibold text-orange-300 mb-3">
                  {data.isBonfireTime ? "Around the Fire Tonight" : "Weekend Bonfire Sessions"}
                </h3>
                {data.currentBonfireSmokers.length > 0 ? (
                  <div className="space-y-3">
                    {data.currentBonfireSmokers.map((smoker, i) => (
                      <motion.div
                        key={smoker.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-3 rounded-xl bg-black/30 flex items-start gap-3"
                      >
                        {smoker.photoUrl ? (
                          <img
                            src={smoker.photoUrl}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-orange-800/50 flex items-center justify-center text-2xl">
                            🔥
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/profile/${smoker.username}`}
                              className="font-medium hover:text-orange-300 transition"
                            >
                              {smoker.username}
                            </Link>
                            <span className="text-xs text-gray-500">{smoker.time}</span>
                          </div>
                          <p className="text-sm text-gray-300">
                            {smoker.brand}
                            {smoker.product && ` - ${smoker.product}`}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {[...Array(5)].map((_, j) => (
                              <FiStar
                                key={j}
                                className={`w-3 h-3 ${
                                  j < smoker.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-600"
                                }`}
                              />
                            ))}
                          </div>
                          {smoker.review && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{smoker.review}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-black/20 text-center">
                    <span className="text-4xl block mb-2">🪵</span>
                    <p className="text-gray-400">No one at the bonfire yet</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {data.isBonfireTime ? "Be the first to join!" : "Check back during bonfire hours"}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "legends" && (
            <motion.div
              key="legends"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Platform Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-black/30 text-center">
                  <p className="text-2xl font-bold text-orange-300">{data.stats.totalSmokes}</p>
                  <p className="text-xs text-gray-400">Bonfire Sessions</p>
                </div>
                <div className="p-3 rounded-xl bg-black/30 text-center">
                  <p className="text-2xl font-bold text-amber-300">{data.stats.uniqueSmokers}</p>
                  <p className="text-xs text-gray-400">Unique Smokers</p>
                </div>
                <div className="p-3 rounded-xl bg-black/30 text-center">
                  <p className="text-2xl font-bold text-yellow-300">{data.stats.avgRating || "-"}</p>
                  <p className="text-xs text-gray-400">Avg Rating</p>
                </div>
                <div className="p-3 rounded-xl bg-black/30 text-center">
                  <p className="text-lg font-bold text-red-300 truncate">{data.stats.topBrand || "-"}</p>
                  <p className="text-xs text-gray-400">Top Brand</p>
                </div>
              </div>

              {/* Leaderboard */}
              <div>
                <h3 className="text-sm font-semibold text-orange-300 mb-3">🏆 Bonfire Legends</h3>
                {data.leaderboard.length > 0 ? (
                  <div className="space-y-2">
                    {data.leaderboard.map((entry, i) => (
                      <div
                        key={entry.username}
                        className={`p-3 rounded-xl flex items-center gap-3 ${
                          i === 0
                            ? "bg-gradient-to-r from-orange-500/40 to-red-500/40 border border-orange-400/30"
                            : i === 1
                            ? "bg-gradient-to-r from-gray-400/20 to-gray-500/20"
                            : i === 2
                            ? "bg-gradient-to-r from-amber-700/20 to-amber-800/20"
                            : "bg-black/20"
                        }`}
                      >
                        <span className="text-2xl w-8 text-center">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                        </span>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/profile/${entry.username}`}
                            className="font-medium hover:text-orange-300 transition"
                          >
                            {entry.username}
                          </Link>
                          {entry.topBrand && (
                            <p className="text-xs text-gray-400">Fave: {entry.topBrand}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-300">{entry.bonfireSmokes}</p>
                          <p className="text-xs text-gray-500">sessions</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-black/20 text-center">
                    <span className="text-4xl block mb-2">🏆</span>
                    <p className="text-gray-400">No bonfire legends yet</p>
                    <p className="text-xs text-gray-500 mt-1">Be the first to claim the title!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Link
            href="/checkin"
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-center font-semibold hover:from-orange-400 hover:to-red-400 transition"
          >
            🔥 Join the Bonfire
          </Link>
          <Link
            href="/nightcap"
            className="py-3 px-4 rounded-xl bg-black/40 hover:bg-black/60 transition"
          >
            🌙
          </Link>
        </div>

        {/* Related Links */}
        <div className="flex gap-2 justify-center text-sm">
          <Link href="/happy-hour" className="text-orange-300 hover:text-orange-200">
            🍺 Happy Hour
          </Link>
          <span className="text-gray-600">•</span>
          <Link href="/goodnight" className="text-orange-300 hover:text-orange-200">
            😴 Goodnight
          </Link>
          <span className="text-gray-600">•</span>
          <Link href="/saturday-cartoons" className="text-orange-300 hover:text-orange-200">
            📺 Cartoons
          </Link>
        </div>
      </main>
    </div>
  );
}
