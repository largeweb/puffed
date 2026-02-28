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
} from "react-icons/fi";
import { GiCoffin, GiSkullCrossedBones, GiGhost } from "react-icons/gi";

interface ShiftWorker {
  username: string;
  shiftCount: number;
  totalShiftSmokes: number;
  avgRating: number;
  favoriteHour: number;
  lastShift: string;
  rank: string;
}

interface GraveyardData {
  isOpen: boolean;
  currentHour: number;
  onShiftNow: Array<{
    username: string;
    brand: string;
    product: string | null;
    rating: number;
    createdAt: number;
    timeAgo: string;
  }>;
  shiftLeaderboard: ShiftWorker[];
  stats: {
    totalShiftSmokes: number;
    uniqueWorkers: number;
    peakHour: number;
    avgRating: number;
    tonightCount: number;
  };
  myStats: {
    shiftCount: number;
    totalSmokes: number;
    currentStreak: number;
    rank: string;
    percentile: number;
  } | null;
}

const RANKS = [
  { min: 0, rank: "Night Intern", emoji: "👶" },
  { min: 3, rank: "Graveyard Rookie", emoji: "🌑" },
  { min: 7, rank: "Night Shift Regular", emoji: "💀" },
  { min: 15, rank: "Cemetery Veteran", emoji: "⚰️" },
  { min: 25, rank: "Tombstone Master", emoji: "🪦" },
  { min: 40, rank: "Crypt Keeper", emoji: "🧛" },
  { min: 60, rank: "Graveyard Legend", emoji: "👻" },
];

function getRank(shiftCount: number): { rank: string; emoji: string } {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (shiftCount >= RANKS[i].min) {
      return RANKS[i];
    }
  }
  return RANKS[0];
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

export default function GraveyardShiftPage() {
  const router = useRouter();
  const [data, setData] = useState<GraveyardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tonight" | "leaderboard" | "ranks">("tonight");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/graveyard-shift");
      if (res.ok) {
        const json = await res.json() as GraveyardData;
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch graveyard data:", err);
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-zinc-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-gray-400" />
      </div>
    );
  }

  const isOpen = data?.isOpen ?? false;
  const currentHour = data?.currentHour ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-zinc-900 to-black text-gray-100 pb-20">
      {/* Floating tombstones background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-gray-800/30"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -10, 0],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <GiGhost className="w-8 h-8" />
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-full">
            <FiHome className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex items-center gap-2">
            <GiSkullCrossedBones className="w-5 h-5 text-gray-400" />
            <span className="font-bold text-gray-100">Graveyard Shift</span>
          </div>
          <button onClick={fetchData} className="p-2 hover:bg-gray-800 rounded-full">
            <FiRefreshCw className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 relative">
        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-6 text-center ${
            isOpen
              ? "bg-gradient-to-r from-gray-800 via-zinc-800 to-gray-800 border border-gray-700"
              : "bg-gray-800/50 border border-gray-700/50"
          }`}
        >
          <div className="flex justify-center mb-3">
            <GiCoffin className={`w-12 h-12 ${isOpen ? "text-gray-300" : "text-gray-600"}`} />
          </div>
          {isOpen ? (
            <>
              <h1 className="text-2xl font-bold text-gray-100 mb-2">
                ☠️ Shift Active ☠️
              </h1>
              <p className="text-gray-400 text-sm">
                {formatHour(currentHour)} — The graveyard awaits
              </p>
              <p className="text-gray-500 text-xs mt-2">
                3 AM - 6 AM • The deepest hours
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-500 mb-2">
                Shift Closed
              </h1>
              <p className="text-gray-600 text-sm">
                Return between 3 AM - 6 AM
              </p>
              <p className="text-gray-700 text-xs mt-2">
                The graveyard sleeps... for now
              </p>
            </>
          )}
        </motion.div>

        {/* My Stats */}
        {data?.myStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
          >
            <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <GiSkullCrossedBones className="w-4 h-4" />
              Your Graveyard Record
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-100">{data.myStats.shiftCount}</div>
                <div className="text-xs text-gray-500">Shifts Worked</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-100">{data.myStats.totalSmokes}</div>
                <div className="text-xs text-gray-500">Total Smokes</div>
              </div>
              <div>
                <div className="text-2xl">{getRank(data.myStats.shiftCount).emoji}</div>
                <div className="text-xs text-gray-500">{getRank(data.myStats.shiftCount).rank}</div>
              </div>
            </div>
            {data.myStats.percentile > 0 && (
              <div className="mt-3 text-center text-xs text-gray-500">
                Top {data.myStats.percentile}% of graveyard workers
              </div>
            )}
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: "tonight", label: "On Shift", icon: FiUsers },
            { id: "leaderboard", label: "Workers", icon: FiAward },
            { id: "ranks", label: "Ranks", icon: FiStar },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab.id
                  ? "bg-gray-700 text-gray-100"
                  : "bg-gray-800/50 text-gray-500 hover:text-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "tonight" && (
            <motion.div
              key="tonight"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Platform Stats */}
              {data?.stats && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                    <div className="text-lg font-bold text-gray-100">{data.stats.totalShiftSmokes}</div>
                    <div className="text-xs text-gray-500">Total Shift Smokes</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                    <div className="text-lg font-bold text-gray-100">{data.stats.uniqueWorkers}</div>
                    <div className="text-xs text-gray-500">Shift Workers</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                    <div className="text-lg font-bold text-gray-100">{formatHour(data.stats.peakHour)}</div>
                    <div className="text-xs text-gray-500">Peak Hour</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                    <div className="text-lg font-bold text-gray-100">{data.stats.tonightCount}</div>
                    <div className="text-xs text-gray-500">Tonight</div>
                  </div>
                </div>
              )}

              {/* On Shift Now */}
              <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <FiClock className="w-4 h-4" />
                  On Shift Tonight
                </h3>
                {data?.onShiftNow && data.onShiftNow.length > 0 ? (
                  <div className="space-y-3">
                    {data.onShiftNow.map((worker, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                            <GiSkullCrossedBones className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <Link href={`/profile/${worker.username}`} className="font-medium text-gray-100 hover:text-gray-300">
                              {worker.username}
                            </Link>
                            <div className="text-xs text-gray-500">
                              {worker.brand} {worker.product ? `• ${worker.product}` : ""}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-amber-400">{"⭐".repeat(Math.round(worker.rating))}</div>
                          <div className="text-xs text-gray-600">{worker.timeAgo}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <GiGhost className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No one on shift yet tonight</p>
                    {isOpen && <p className="text-xs mt-1">Be the first to clock in!</p>}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "leaderboard" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {data?.shiftLeaderboard && data.shiftLeaderboard.length > 0 ? (
                data.shiftLeaderboard.map((worker, i) => (
                  <motion.div
                    key={worker.username}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          i === 0 ? "bg-amber-500/20 text-amber-400" :
                          i === 1 ? "bg-gray-400/20 text-gray-300" :
                          i === 2 ? "bg-orange-500/20 text-orange-400" :
                          "bg-gray-700 text-gray-500"
                        }`}>
                          {i + 1}
                        </div>
                        <div>
                          <Link href={`/profile/${worker.username}`} className="font-medium text-gray-100 hover:text-gray-300">
                            {worker.username}
                          </Link>
                          <div className="text-xs text-gray-500">
                            {getRank(worker.shiftCount).emoji} {getRank(worker.shiftCount).rank}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-100">{worker.shiftCount}</div>
                        <div className="text-xs text-gray-500">shifts</div>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-gray-500">
                      <span>{worker.totalShiftSmokes} smokes</span>
                      <span>⭐ {worker.avgRating.toFixed(1)}</span>
                      <span>Peak: {formatHour(worker.favoriteHour)}</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <GiCoffin className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No graveyard workers yet</p>
                  <p className="text-xs mt-1">Clock in between 3-6 AM to join</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "ranks" && (
            <motion.div
              key="ranks"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              <p className="text-sm text-gray-500 mb-4">
                Work the graveyard shift to earn ranks. Each shift worked (3-6 AM smoke) increases your standing.
              </p>
              {RANKS.map((rank, i) => (
                <div
                  key={rank.rank}
                  className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{rank.emoji}</span>
                    <div>
                      <div className="font-medium text-gray-100">{rank.rank}</div>
                      <div className="text-xs text-gray-500">
                        {rank.min === 0 ? "Starting rank" : `${rank.min}+ shifts`}
                      </div>
                    </div>
                  </div>
                  {data?.myStats && data.myStats.shiftCount >= rank.min && (
                    data.myStats.shiftCount < (RANKS[i + 1]?.min ?? Infinity) ? (
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">Current</span>
                    ) : (
                      <span className="text-gray-600">✓</span>
                    )
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Log CTA */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link
              href="/log"
              className="block w-full bg-gradient-to-r from-gray-700 via-zinc-700 to-gray-700 hover:from-gray-600 hover:to-gray-600 text-white font-semibold py-4 px-6 rounded-xl text-center transition-all shadow-lg"
            >
              <GiSkullCrossedBones className="inline w-5 h-5 mr-2" />
              Clock In (Log a Smoke)
            </Link>
          </motion.div>
        )}

        {/* Links */}
        <div className="pt-4 flex flex-wrap justify-center gap-2 text-xs text-gray-500">
          <Link href="/void" className="hover:text-gray-300">🕳️ The Void</Link>
          <span>•</span>
          <Link href="/dead-of-night" className="hover:text-gray-300">📓 Dead of Night</Link>
          <span>•</span>
          <Link href="/nightcap" className="hover:text-gray-300">🌙 Nightcap</Link>
          <span>•</span>
          <Link href="/dawn-patrol" className="hover:text-gray-300">🌅 Dawn Patrol</Link>
        </div>
      </main>
    </div>
  );
}
