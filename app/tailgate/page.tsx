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
  FiTrendingUp,
  FiInfo,
  FiTarget,
} from "react-icons/fi";

interface TailgateSmoker {
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
  tailgateSmokes: number;
  avgRating: number;
  favoriteSport: string | null;
}

interface TailgateData {
  isTailgateTime: boolean;
  isWeekend: boolean;
  currentHour: number;
  timeMessage: string;
  gameDay: string;
  currentSport: {
    name: string;
    emoji: string;
    season: string;
  };
  allSports: Array<{
    name: string;
    emoji: string;
    inSeason: boolean;
  }>;
  currentTailgaters: TailgateSmoker[];
  leaderboard: LeaderboardEntry[];
  stats: {
    totalSmokes: number;
    uniqueTailgaters: number;
    avgRating: number;
    topBrand: string | null;
    peakHour: number | null;
  };
  myStats: {
    totalSmokes: number;
    avgRating: number;
    favoriteBrand: string | null;
    totalSaturdays: number;
  } | null;
  tailgateFact: string;
  countdown: {
    nextGame: string;
    hoursUntil: number;
  } | null;
}

export default function TailgatePage() {
  const router = useRouter();
  const [data, setData] = useState<TailgateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"smokers" | "leaderboard" | "sports">("smokers");
  const [cheer, setCheer] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/tailgate");
      if (res.ok) {
        const result = (await res.json()) as TailgateData;
        setData(result);
      }
    } catch (error) {
      console.error("Failed to load tailgate data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Crowd cheer animation
  useEffect(() => {
    if (data?.isTailgateTime) {
      const cheerInterval = setInterval(() => {
        setCheer(true);
        setTimeout(() => setCheer(false), 1500);
      }, 8000);
      return () => clearInterval(cheerInterval);
    }
  }, [data?.isTailgateTime]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-950 via-green-900 to-emerald-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <span className="text-5xl">🏈</span>
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-950 via-green-900 to-emerald-950 flex items-center justify-center">
        <p className="text-green-300">Failed to load tailgate data</p>
      </div>
    );
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-950 via-green-900 to-emerald-950 relative overflow-hidden">
      {/* Stadium lights effect */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-32 h-32 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
              left: `${20 + i * 20}%`,
              top: "-5%",
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Field lines pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="h-full w-full" style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 40px,
              rgba(255,255,255,0.3) 40px,
              rgba(255,255,255,0.3) 42px
            )
          `,
        }} />
      </div>

      {/* Crowd cheer overlay */}
      <AnimatePresence>
        {cheer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <motion.span
              className="text-8xl"
              animate={{
                scale: [1, 1.5, 1],
                rotate: [0, 10, -10, 0],
              }}
              transition={{ duration: 1 }}
            >
              📣
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="relative z-10 p-4 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="p-2 rounded-full bg-green-800/50 hover:bg-green-700/50 transition-colors"
        >
          <FiHome className="w-5 h-5 text-green-200" />
        </Link>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-2xl">🏈</span> The Tailgate
        </h1>
        <button
          onClick={() => fetchData()}
          className="p-2 rounded-full bg-green-800/50 hover:bg-green-700/50 transition-colors"
        >
          <FiRefreshCw className="w-5 h-5 text-green-200" />
        </button>
      </header>

      {/* Main content */}
      <main className="relative z-10 px-4 pb-8 max-w-2xl mx-auto">
        {/* Status card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-800/60 to-emerald-800/60 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-green-700/30"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-3xl">{data.currentSport.emoji}</span>
                <span className="text-lg text-green-100 font-semibold">
                  {data.currentSport.name} {data.currentSport.season}
                </span>
              </div>
              <p className="text-green-300">{data.timeMessage}</p>
            </div>
            {data.isTailgateTime && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="bg-green-500 text-green-950 px-3 py-1 rounded-full text-sm font-bold"
              >
                LIVE
              </motion.div>
            )}
          </div>

          {/* Current sports in season */}
          <div className="flex flex-wrap gap-2">
            {data.allSports
              .filter((s) => s.inSeason)
              .map((sport) => (
                <span
                  key={sport.name}
                  className="bg-green-700/50 px-2 py-1 rounded-full text-xs text-green-200 flex items-center gap-1"
                >
                  {sport.emoji} {sport.name}
                </span>
              ))}
          </div>
        </motion.div>

        {/* Personal stats */}
        {data.myStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-green-800/40 backdrop-blur-sm rounded-xl p-4 mb-6 border border-green-700/20"
          >
            <h3 className="text-green-200 text-sm mb-3 flex items-center gap-2">
              <FiTarget className="w-4 h-4" /> Your Tailgate Stats
            </h3>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{data.myStats.totalSmokes}</div>
                <div className="text-xs text-green-400">Tailgate Smokes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-400">
                  {data.myStats.avgRating > 0 ? data.myStats.avgRating.toFixed(1) : "-"}
                </div>
                <div className="text-xs text-green-400">Avg Rating</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{data.myStats.totalSaturdays}</div>
                <div className="text-xs text-green-400">Game Days</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-300 truncate">
                  {data.myStats.favoriteBrand || "-"}
                </div>
                <div className="text-xs text-green-400">Fav Brand</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(["smokers", "leaderboard", "sports"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-green-600 text-white"
                  : "bg-green-800/40 text-green-300 hover:bg-green-700/40"
              }`}
            >
              {tab === "smokers" && "🚬 Live"}
              {tab === "leaderboard" && "🏆 Leaders"}
              {tab === "sports" && "📺 Sports"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === "smokers" && (
            <motion.div
              key="smokers"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {data.currentTailgaters.length === 0 ? (
                <div className="text-center py-8 text-green-300/70">
                  <span className="text-4xl block mb-2">🏟️</span>
                  No tailgaters yet today. Be the first!
                </div>
              ) : (
                data.currentTailgaters.map((smoker, index) => (
                  <motion.div
                    key={smoker.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-green-800/30 backdrop-blur-sm rounded-xl p-4 border border-green-700/20"
                  >
                    <div className="flex items-start gap-3">
                      {smoker.photoUrl ? (
                        <img
                          src={smoker.photoUrl}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-green-700/50 flex items-center justify-center">
                          <span className="text-2xl">🏈</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/user/${smoker.username}`}
                            className="font-semibold text-white hover:text-green-300"
                          >
                            {smoker.username}
                          </Link>
                          <span className="text-green-400 text-xs">{smoker.time}</span>
                        </div>
                        <div className="text-green-200 text-sm">
                          {smoker.brand}
                          {smoker.product && (
                            <span className="text-green-400"> · {smoker.product}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <FiStar
                              key={i}
                              className={`w-3 h-3 ${
                                i < smoker.rating ? "text-amber-400 fill-amber-400" : "text-green-700"
                              }`}
                            />
                          ))}
                        </div>
                        {smoker.review && (
                          <p className="text-green-300/80 text-xs mt-2 line-clamp-2">
                            {smoker.review}
                          </p>
                        )}
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
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-2"
            >
              {data.leaderboard.length === 0 ? (
                <div className="text-center py-8 text-green-300/70">
                  <span className="text-4xl block mb-2">🏆</span>
                  No tailgate champions yet!
                </div>
              ) : (
                data.leaderboard.map((entry, index) => (
                  <motion.div
                    key={entry.username}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      index === 0
                        ? "bg-gradient-to-r from-amber-600/30 to-amber-700/20 border border-amber-500/30"
                        : index === 1
                        ? "bg-gradient-to-r from-gray-400/20 to-gray-500/10 border border-gray-400/20"
                        : index === 2
                        ? "bg-gradient-to-r from-amber-700/20 to-amber-800/10 border border-amber-600/20"
                        : "bg-green-800/30 border border-green-700/20"
                    }`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center text-lg font-bold">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`}
                    </div>
                    <div className="flex-1">
                      <Link
                        href={`/user/${entry.username}`}
                        className="font-semibold text-white hover:text-green-300"
                      >
                        {entry.username}
                      </Link>
                      <div className="text-xs text-green-400">
                        Avg: ⭐ {entry.avgRating > 0 ? entry.avgRating.toFixed(1) : "-"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{entry.tailgateSmokes}</div>
                      <div className="text-xs text-green-400">tailgate smokes</div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "sports" && (
            <motion.div
              key="sports"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-2 gap-3"
            >
              {data.allSports.map((sport) => (
                <motion.div
                  key={sport.name}
                  whileHover={{ scale: 1.02 }}
                  className={`p-4 rounded-xl text-center ${
                    sport.inSeason
                      ? "bg-green-600/40 border border-green-500/30"
                      : "bg-green-800/20 border border-green-700/10 opacity-50"
                  }`}
                >
                  <span className="text-3xl block mb-2">{sport.emoji}</span>
                  <div className="text-white font-medium">{sport.name}</div>
                  <div className={`text-xs ${sport.inSeason ? "text-green-300" : "text-green-500"}`}>
                    {sport.inSeason ? "In Season" : "Off Season"}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Platform stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 bg-green-800/30 backdrop-blur-sm rounded-xl p-4 border border-green-700/20"
        >
          <h3 className="text-green-200 text-sm mb-3 flex items-center gap-2">
            <FiTrendingUp className="w-4 h-4" /> All-Time Tailgate Stats
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{data.stats.totalSmokes}</div>
              <div className="text-xs text-green-400">Total Smokes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{data.stats.uniqueTailgaters}</div>
              <div className="text-xs text-green-400">Tailgaters</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">
                {data.stats.avgRating > 0 ? data.stats.avgRating.toFixed(1) : "-"}
              </div>
              <div className="text-xs text-green-400">Avg Rating</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-300 truncate">
                {data.stats.peakHour !== null ? formatHour(data.stats.peakHour) : "-"}
              </div>
              <div className="text-xs text-green-400">Peak Hour</div>
            </div>
          </div>
          {data.stats.topBrand && (
            <div className="mt-3 text-center">
              <span className="text-green-400 text-xs">🏆 Top Tailgate Brand: </span>
              <span className="text-white font-medium">{data.stats.topBrand}</span>
            </div>
          )}
        </motion.div>

        {/* Tailgate fact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 bg-green-700/20 rounded-xl p-4 border border-green-600/20"
        >
          <div className="flex items-start gap-3">
            <FiInfo className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-200 text-sm">{data.tailgateFact}</p>
          </div>
        </motion.div>

        {/* CTA */}
        {data.isTailgateTime && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <Link
              href="/checkin"
              className="block w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-center font-bold rounded-xl hover:from-green-400 hover:to-emerald-400 transition-all"
            >
              🏈 Log Your Tailgate Smoke
            </Link>
          </motion.div>
        )}

        {/* Quick links */}
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          <Link
            href="/the-deck"
            className="bg-green-800/40 text-green-300 px-4 py-2 rounded-full text-sm hover:bg-green-700/40"
          >
            🪑 The Deck
          </Link>
          <Link
            href="/lazy-saturday"
            className="bg-green-800/40 text-green-300 px-4 py-2 rounded-full text-sm hover:bg-green-700/40"
          >
            😴 Lazy Saturday
          </Link>
          <Link
            href="/backyard-bbq"
            className="bg-green-800/40 text-green-300 px-4 py-2 rounded-full text-sm hover:bg-green-700/40"
          >
            🍖 BBQ
          </Link>
        </div>
      </main>
    </div>
  );
}
