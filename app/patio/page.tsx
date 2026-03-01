"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  FiHome,
  FiRefreshCw,
  FiUsers,
  FiAward,
  FiStar,
  FiSun,
  FiMoon,
} from "react-icons/fi";

interface PatioVibes {
  condition: string;
  emoji: string;
  temp: string;
  desc: string;
}

interface PatioSmoker {
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
  patioSmokes: number;
  avgRating: number;
  topBrand: string | null;
}

interface PatioData {
  isPatioTime: boolean;
  isWeekend: boolean;
  currentHour: number;
  dayOfWeek: number;
  timeMessage: string;
  patioMood: string;
  patioVibes: PatioVibes;
  patioTip: string;
  currentPatioSmokers: PatioSmoker[];
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
}

export default function PatioPage() {
  const [data, setData] = useState<PatioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"vibes" | "smokers" | "legends">("smokers");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/patio");
      if (res.ok) {
        const result = (await res.json()) as PatioData;
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch patio data:", error);
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
      case "prime":
        return "from-emerald-900 via-green-900 to-teal-900";
      case "late":
        return "from-slate-900 via-emerald-950 to-green-950";
      case "early":
        return "from-amber-900 via-green-900 to-emerald-900";
      case "waiting":
        return "from-gray-800 via-slate-800 to-zinc-800";
      default:
        return "from-emerald-900 via-green-900 to-teal-900";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-6xl"
        >
          🪴
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 flex items-center justify-center text-white">
        <p>Failed to load patio data</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getMoodGradient(data.patioMood)} text-white relative overflow-hidden`}>
      {/* Ambient particles - fireflies */}
      {data.isPatioTime && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-yellow-300 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1.5, 0.5],
                x: [0, (Math.random() - 0.5) * 50],
                y: [0, (Math.random() - 0.5) * 50],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>
      )}

      {/* Garden glow at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-green-800/30 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 p-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition">
            <FiHome className="w-5 h-5" />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold flex items-center gap-2 justify-center">
              <span className="text-3xl">🪴</span> The Patio
            </h1>
            <p className="text-xs text-emerald-200 mt-1">Evening Outdoor Sessions</p>
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
        {/* Weather/Vibes Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl ${
            data.isPatioTime
              ? "bg-gradient-to-r from-emerald-500/40 to-teal-500/40 border border-emerald-400/30"
              : "bg-black/40 border border-gray-600/30"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl">{data.patioVibes.emoji}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg">{data.patioVibes.condition}</h2>
                <span className="text-sm text-emerald-200 bg-black/30 px-2 py-0.5 rounded-full">
                  {data.patioVibes.temp}
                </span>
              </div>
              <p className="text-sm text-emerald-200">{data.patioVibes.desc}</p>
            </div>
          </div>
          <p className="text-xs text-emerald-300 mt-2 flex items-center gap-1">
            {data.isPatioTime ? <FiMoon className="w-3 h-3" /> : <FiSun className="w-3 h-3" />}
            {data.timeMessage}
          </p>
        </motion.div>

        {/* Patio Tip */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-teal-500/20 to-emerald-500/20 border border-teal-400/20"
        >
          <p className="text-xs text-teal-300 mb-1">💡 Patio Wisdom</p>
          <p className="text-sm italic">&ldquo;{data.patioTip}&rdquo;</p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-black/30 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("vibes")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              activeTab === "vibes"
                ? "bg-emerald-500/50 text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            🌿 Vibes
          </button>
          <button
            onClick={() => setActiveTab("smokers")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              activeTab === "smokers"
                ? "bg-emerald-500/50 text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            <FiUsers className="inline mr-1" /> Tonight
          </button>
          <button
            onClick={() => setActiveTab("legends")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              activeTab === "legends"
                ? "bg-emerald-500/50 text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            <FiAward className="inline mr-1" /> Regulars
          </button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "vibes" && (
            <motion.div
              key="vibes"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Patio Hours Guide */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-emerald-300">Patio Hours (5 PM - 2 AM)</h3>
                
                <div className={`p-3 rounded-xl flex items-center gap-3 ${data.currentHour >= 17 && data.currentHour < 19 ? "bg-emerald-500/40 border border-emerald-400/50" : "bg-black/20"}`}>
                  <span className="text-2xl">🌅</span>
                  <div className="flex-1">
                    <p className="font-medium">Golden Hour</p>
                    <p className="text-xs text-gray-400">5-7 PM • Perfect light, perfect smoke</p>
                  </div>
                </div>
                
                <div className={`p-3 rounded-xl flex items-center gap-3 ${data.currentHour >= 19 && data.currentHour < 21 ? "bg-emerald-500/40 border border-emerald-400/50" : "bg-black/20"}`}>
                  <span className="text-2xl">🌆</span>
                  <div className="flex-1">
                    <p className="font-medium">Twilight Chill</p>
                    <p className="text-xs text-gray-400">7-9 PM • Stars coming out</p>
                  </div>
                </div>
                
                <div className={`p-3 rounded-xl flex items-center gap-3 ${data.currentHour >= 21 && data.currentHour < 23 ? "bg-emerald-500/40 border border-emerald-400/50" : "bg-black/20"}`}>
                  <span className="text-2xl">🌙</span>
                  <div className="flex-1">
                    <p className="font-medium">Night Breeze</p>
                    <p className="text-xs text-gray-400">9-11 PM • Peak patio vibes</p>
                  </div>
                </div>
                
                <div className={`p-3 rounded-xl flex items-center gap-3 ${data.currentHour >= 23 || data.currentHour < 2 ? "bg-emerald-500/40 border border-emerald-400/50" : "bg-black/20"}`}>
                  <span className="text-2xl">✨</span>
                  <div className="flex-1">
                    <p className="font-medium">Midnight Garden</p>
                    <p className="text-xs text-gray-400">11 PM - 2 AM • Just you and the night</p>
                  </div>
                </div>
              </div>

              {/* Your Patio Stats */}
              {data.myStats && data.myStats.totalSmokes > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border border-emerald-400/30">
                  <h3 className="text-sm font-semibold mb-3">Your Patio Record</h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-2xl font-bold text-emerald-300">{data.myStats.totalSmokes}</p>
                      <p className="text-xs text-gray-400">Sessions</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-teal-300">
                        {data.myStats.avgRating > 0 ? data.myStats.avgRating : "-"}
                      </p>
                      <p className="text-xs text-gray-400">Avg Rating</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-300 truncate">
                        {data.myStats.favoriteBrand || "-"}
                      </p>
                      <p className="text-xs text-gray-400">Go-to</p>
                    </div>
                  </div>
                </div>
              )}
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
              {/* Tonight's Patio Smokers */}
              <div>
                <h3 className="text-sm font-semibold text-emerald-300 mb-3">
                  {data.isPatioTime ? "On the Patio Now" : "Evening Sessions"}
                </h3>
                {data.currentPatioSmokers.length > 0 ? (
                  <div className="space-y-3">
                    {data.currentPatioSmokers.map((smoker, i) => (
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
                          <div className="w-12 h-12 rounded-lg bg-emerald-800/50 flex items-center justify-center text-2xl">
                            🪴
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/profile/${smoker.username}`}
                              className="font-medium hover:text-emerald-300 transition"
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
                    <span className="text-4xl block mb-2">🪑</span>
                    <p className="text-gray-400">The patio is empty</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {data.isPatioTime ? "Pull up a chair and be first!" : "Check back during evening hours"}
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
                  <p className="text-2xl font-bold text-emerald-300">{data.stats.totalSmokes}</p>
                  <p className="text-xs text-gray-400">Patio Sessions</p>
                </div>
                <div className="p-3 rounded-xl bg-black/30 text-center">
                  <p className="text-2xl font-bold text-teal-300">{data.stats.uniqueSmokers}</p>
                  <p className="text-xs text-gray-400">Patio Regulars</p>
                </div>
                <div className="p-3 rounded-xl bg-black/30 text-center">
                  <p className="text-2xl font-bold text-green-300">{data.stats.avgRating || "-"}</p>
                  <p className="text-xs text-gray-400">Avg Rating</p>
                </div>
                <div className="p-3 rounded-xl bg-black/30 text-center">
                  <p className="text-lg font-bold text-lime-300 truncate">{data.stats.topBrand || "-"}</p>
                  <p className="text-xs text-gray-400">Top Brand</p>
                </div>
              </div>

              {/* Leaderboard */}
              <div>
                <h3 className="text-sm font-semibold text-emerald-300 mb-3">🏆 Patio Regulars</h3>
                {data.leaderboard.length > 0 ? (
                  <div className="space-y-2">
                    {data.leaderboard.map((entry, i) => (
                      <div
                        key={entry.username}
                        className={`p-3 rounded-xl flex items-center gap-3 ${
                          i === 0
                            ? "bg-gradient-to-r from-emerald-500/40 to-teal-500/40 border border-emerald-400/30"
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
                            className="font-medium hover:text-emerald-300 transition"
                          >
                            {entry.username}
                          </Link>
                          {entry.topBrand && (
                            <p className="text-xs text-gray-400">Fave: {entry.topBrand}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-300">{entry.patioSmokes}</p>
                          <p className="text-xs text-gray-500">sessions</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-black/20 text-center">
                    <span className="text-4xl block mb-2">🏆</span>
                    <p className="text-gray-400">No patio regulars yet</p>
                    <p className="text-xs text-gray-500 mt-1">Start your evening sessions!</p>
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
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-center font-semibold hover:from-emerald-400 hover:to-teal-400 transition"
          >
            🪴 Pull Up a Chair
          </Link>
          <Link
            href="/bonfire"
            className="py-3 px-4 rounded-xl bg-black/40 hover:bg-black/60 transition"
          >
            🔥
          </Link>
        </div>

        {/* Related Links */}
        <div className="flex gap-2 justify-center text-sm flex-wrap">
          <Link href="/bonfire" className="text-emerald-300 hover:text-emerald-200">
            🔥 Bonfire
          </Link>
          <span className="text-gray-600">•</span>
          <Link href="/nightcap" className="text-emerald-300 hover:text-emerald-200">
            🌙 Nightcap
          </Link>
          <span className="text-gray-600">•</span>
          <Link href="/happy-hour" className="text-emerald-300 hover:text-emerald-200">
            🍺 Happy Hour
          </Link>
          <span className="text-gray-600">•</span>
          <Link href="/goodnight" className="text-emerald-300 hover:text-emerald-200">
            😴 Goodnight
          </Link>
        </div>
      </main>
    </div>
  );
}
