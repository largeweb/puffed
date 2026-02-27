"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiHome, FiRefreshCw, FiStar, FiClock, FiUsers, FiAward, FiMoon, FiSunrise } from "react-icons/fi";

interface GoodnightSmoker {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  checkedAt: number;
  timeAgo: string;
  imageUrl?: string;
}

interface GoodnightStats {
  totalGoodnightSmokes: number;
  uniqueGoodnightSmokers: number;
  avgGoodnightHour: number;
  yourGoodnightCount: number;
  yourAvgBedtime: string;
  isGoodnightWindow: boolean;
  currentHour: number;
  mostPopularGoodnightBrand?: string;
}

interface Leader {
  username: string;
  count: number;
  avgHour: string;
}

interface GoodnightData {
  tonightsSmokers: GoodnightSmoker[];
  stats: GoodnightStats;
  leaders: Leader[];
}

export default function GoodnightLoungePage() {
  const router = useRouter();
  const [data, setData] = useState<GoodnightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"tonight" | "leaders">("tonight");

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/goodnight");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const result = await res.json() as GoodnightData;
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
    // Refresh every 2 minutes
    const interval = setInterval(() => fetchData(), 120000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-indigo-950/30 to-black text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-2/3"></div>
            <div className="h-40 bg-gray-700/50 rounded-xl"></div>
            <div className="h-32 bg-gray-700/50 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const { tonightsSmokers, stats, leaders } = data || { tonightsSmokers: [], stats: null, leaders: [] };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-indigo-950/40 to-black text-white p-4 pb-20">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <FiHome size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-3xl">😴</span> Goodnight Lounge
              </h1>
              <p className="text-sm text-gray-400">Final smokes before bed</p>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            className={`p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all ${refreshing ? "animate-spin" : ""}`}
          >
            <FiRefreshCw size={20} />
          </button>
        </div>

        {/* Window Status */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 p-4 rounded-xl ${
              stats.isGoodnightWindow 
                ? "bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-indigo-500/30"
                : "bg-gray-800/50 border border-gray-700/50"
            }`}
          >
            {stats.isGoodnightWindow ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl animate-pulse">🌙</span>
                <div>
                  <p className="font-semibold text-indigo-300">Goodnight Window Open</p>
                  <p className="text-sm text-gray-400">9 PM - 2 AM • Perfect time for your last smoke</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl">💤</span>
                <div>
                  <p className="font-semibold text-gray-300">Goodnight Window Closed</p>
                  <p className="text-sm text-gray-500">Opens at 9 PM for your bedtime ritual</p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Your Stats Banner */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 p-4 rounded-xl bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-700/30"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-indigo-300">{stats.yourGoodnightCount}</p>
                <p className="text-sm text-gray-400">Your Goodnights</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-300">{stats.yourAvgBedtime}</p>
                <p className="text-sm text-gray-400">Avg Bedtime</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("tonight")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "tonight"
                ? "bg-indigo-600 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            🌙 Tonight&apos;s Goodnights
          </button>
          <button
            onClick={() => setActiveTab("leaders")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "leaders"
                ? "bg-indigo-600 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            🏆 Sleep Legends
          </button>
        </div>

        {/* Tonight's Tab */}
        <AnimatePresence mode="wait">
          {activeTab === "tonight" && (
            <motion.div
              key="tonight"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {tonightsSmokers.length === 0 ? (
                <div className="text-center py-12 bg-gray-800/30 rounded-xl">
                  <span className="text-5xl mb-3 block">💤</span>
                  <p className="text-gray-400">No goodnight smokes yet tonight</p>
                  <p className="text-sm text-gray-500 mt-1">Be the first to wind down!</p>
                  <Link 
                    href="/dashboard"
                    className="inline-block mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                  >
                    Log Your Goodnight Smoke
                  </Link>
                </div>
              ) : (
                tonightsSmokers.map((smoker, idx) => (
                  <motion.div
                    key={`${smoker.username}-${smoker.checkedAt}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 rounded-xl bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-800/30"
                  >
                    <div className="flex items-center gap-3">
                      {smoker.imageUrl && (
                        <img 
                          src={smoker.imageUrl} 
                          alt={smoker.brand}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/user/${smoker.username}`}
                            className="font-semibold text-indigo-300 hover:text-indigo-200"
                          >
                            {smoker.username}
                          </Link>
                          <span className="text-xs text-gray-500">{smoker.timeAgo}</span>
                        </div>
                        <p className="text-sm text-gray-400">
                          {smoker.brand}{smoker.product ? ` - ${smoker.product}` : ""}
                        </p>
                      </div>
                      {smoker.rating && (
                        <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-lg">
                          <FiStar className="text-amber-500" size={14} />
                          <span className="text-amber-500 font-semibold text-sm">{smoker.rating}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "leaders" && (
            <motion.div
              key="leaders"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <div className="text-center py-4 mb-2">
                <h3 className="text-lg font-semibold text-indigo-300">😴 Sleep Legends</h3>
                <p className="text-sm text-gray-500">Most goodnight smokes all-time</p>
              </div>
              {leaders.length === 0 ? (
                <div className="text-center py-12 bg-gray-800/30 rounded-xl">
                  <span className="text-5xl mb-3 block">🏆</span>
                  <p className="text-gray-400">No sleep legends yet</p>
                  <p className="text-sm text-gray-500 mt-1">Start your bedtime routine!</p>
                </div>
              ) : (
                leaders.map((leader, idx) => (
                  <motion.div
                    key={leader.username}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-4 rounded-xl border ${
                      idx === 0 
                        ? "bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border-amber-700/50" 
                        : idx === 1
                        ? "bg-gradient-to-r from-gray-700/30 to-gray-600/30 border-gray-600/50"
                        : idx === 2
                        ? "bg-gradient-to-r from-orange-900/30 to-amber-900/30 border-orange-700/50"
                        : "bg-gray-800/30 border-gray-700/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl w-8 text-center">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                      </div>
                      <div className="flex-1">
                        <Link 
                          href={`/user/${leader.username}`}
                          className="font-semibold text-indigo-300 hover:text-indigo-200"
                        >
                          {leader.username}
                        </Link>
                        <p className="text-sm text-gray-500">Avg bedtime: {leader.avgHour}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-indigo-400">{leader.count}</p>
                        <p className="text-xs text-gray-500">goodnights</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Platform Stats */}
        {stats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 p-4 rounded-xl bg-gray-800/30 border border-gray-700/30"
          >
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <FiUsers size={14} /> Platform Goodnight Stats
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-indigo-400">{stats.totalGoodnightSmokes}</p>
                <p className="text-xs text-gray-500">Total Goodnights</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">{stats.uniqueGoodnightSmokers}</p>
                <p className="text-xs text-gray-500">Night Owls</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-400">{stats.mostPopularGoodnightBrand || "—"}</p>
                <p className="text-xs text-gray-500">Fave Brand</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Related Links */}
        <div className="mt-6 flex gap-2">
          <Link 
            href="/first-light"
            className="flex-1 p-3 rounded-xl bg-gradient-to-r from-orange-900/30 to-amber-900/30 border border-orange-700/30 text-center hover:bg-orange-900/40 transition-colors"
          >
            <FiSunrise className="mx-auto mb-1 text-orange-400" />
            <p className="text-sm text-orange-300">First Light ☀️</p>
            <p className="text-xs text-gray-500">Morning smokes</p>
          </Link>
          <Link 
            href="/nightcap"
            className="flex-1 p-3 rounded-xl bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-700/30 text-center hover:bg-purple-900/40 transition-colors"
          >
            <FiMoon className="mx-auto mb-1 text-purple-400" />
            <p className="text-sm text-purple-300">Nightcap 🌙</p>
            <p className="text-xs text-gray-500">Evening ritual</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
