"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiHome, FiRefreshCw, FiStar, FiClock, FiUsers, FiAward, FiMoon, FiPlus } from "react-icons/fi";

interface NightcapCheckin {
  id: string;
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  review?: string;
  imageUrl?: string;
  checkedAt: number;
  timeAgo: string;
}

interface NightcapStats {
  totalNightcaps: number;
  uniqueNightcappers: number;
  yourNightcapCount: number;
  avgNightcapHour: number;
  yourAvgHour?: number;
  mostPopularBrand?: string;
  tonightHasNightcap: boolean;
}

interface NightcapLeader {
  username: string;
  count: number;
  avgHour: number;
}

interface NightcapData {
  tonightsNightcaps: NightcapCheckin[];
  stats: NightcapStats;
  leaders: NightcapLeader[];
  currentHour: number;
  isNightcapTime: boolean;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export default function NightcapPage() {
  const router = useRouter();
  const [data, setData] = useState<NightcapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"tonight" | "leaders">("tonight");

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/nightcap");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const result = await res.json() as NightcapData;
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center text-white">
        <p>Failed to load nightcap data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-sm border-b border-indigo-500/20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <FiHome className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                🌙 Nightcap Club
              </h1>
              <p className="text-xs text-indigo-300">The Last Smoke of the Day</p>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 p-6 mb-6 shadow-xl"
        >
          {/* Stars background */}
          <div className="absolute inset-0 opacity-30">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
          
          <div className="relative z-10 text-center">
            <motion.div
              animate={{ 
                y: [0, -5, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-5xl mb-3"
            >
              🌙
            </motion.div>
            
            {data.isNightcapTime ? (
              <>
                <h2 className="text-xl font-bold mb-2">It&apos;s Nightcap Hour</h2>
                <p className="text-indigo-100 text-sm">
                  The perfect time for your last smoke of the day
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-2">Nightcap Hour Awaits</h2>
                <p className="text-indigo-100 text-sm">
                  Come back after 8 PM for the ritual
                </p>
              </>
            )}

            {!data.stats.tonightHasNightcap && data.isNightcapTime && (
              <Link
                href="/checkin"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                Log Your Nightcap
              </Link>
            )}

            {data.stats.tonightHasNightcap && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-500/30 rounded-full text-sm">
                ✓ You&apos;ve had your nightcap tonight
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/50 rounded-xl p-4 text-center border border-indigo-500/20"
          >
            <div className="text-2xl font-bold text-indigo-400">{data.stats.totalNightcaps}</div>
            <div className="text-xs text-slate-400">Total Nightcaps</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800/50 rounded-xl p-4 text-center border border-indigo-500/20"
          >
            <div className="text-2xl font-bold text-purple-400">{data.stats.uniqueNightcappers}</div>
            <div className="text-xs text-slate-400">Night Owls</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800/50 rounded-xl p-4 text-center border border-indigo-500/20"
          >
            <div className="text-2xl font-bold text-pink-400">{data.stats.yourNightcapCount}</div>
            <div className="text-xs text-slate-400">Your Nightcaps</div>
          </motion.div>
        </div>

        {/* Additional Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-800/30 rounded-xl p-4 mb-6 border border-indigo-500/10"
        >
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <FiClock className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-400">Peak nightcap hour:</span>
            </div>
            <span className="font-medium text-indigo-300">{formatHour(data.stats.avgNightcapHour)}</span>
          </div>
          {data.stats.mostPopularBrand && (
            <div className="flex items-center justify-between text-sm mt-2">
              <div className="flex items-center gap-2">
                <span className="text-indigo-400">🌟</span>
                <span className="text-slate-400">Favorite nightcap:</span>
              </div>
              <span className="font-medium text-indigo-300">{data.stats.mostPopularBrand}</span>
            </div>
          )}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("tonight")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "tonight"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <FiMoon className="w-4 h-4 inline mr-2" />
            Tonight
          </button>
          <button
            onClick={() => setActiveTab("leaders")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "leaders"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <FiAward className="w-4 h-4 inline mr-2" />
            Leaders
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "tonight" ? (
            <motion.div
              key="tonight"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {data.tonightsNightcaps.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FiMoon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No nightcaps logged tonight yet</p>
                  <p className="text-sm mt-2">Be the first to end your day with a smoke!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.tonightsNightcaps.map((checkin, index) => (
                    <motion.div
                      key={checkin.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={`/checkin/${checkin.id}`}
                        className="block bg-slate-800/50 rounded-xl p-4 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {checkin.imageUrl ? (
                            <img
                              src={checkin.imageUrl}
                              alt={checkin.brand}
                              className="w-14 h-14 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-slate-700 flex items-center justify-center text-2xl">
                              🌙
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <Link 
                                href={`/user/${checkin.username}`}
                                className="font-medium hover:text-indigo-400 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {checkin.username}
                              </Link>
                              <span className="text-xs text-slate-500">{checkin.timeAgo}</span>
                            </div>
                            <p className="text-sm text-indigo-300">{checkin.brand}</p>
                            {checkin.product && (
                              <p className="text-xs text-slate-400">{checkin.product}</p>
                            )}
                            {checkin.rating && (
                              <div className="flex items-center gap-1 mt-1">
                                <FiStar className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                <span className="text-xs text-yellow-400">{checkin.rating}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="leaders"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {data.leaders.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FiUsers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No nightcap leaders yet</p>
                  <p className="text-sm mt-2">Start logging your evening smokes!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.leaders.map((leader, index) => (
                    <motion.div
                      key={leader.username}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={`/user/${leader.username}`}
                        className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-4 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg font-bold">
                          {index === 0 ? "👑" : index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{leader.username}</p>
                          <p className="text-xs text-slate-400">
                            Avg nightcap: {formatHour(leader.avgHour)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-indigo-400">{leader.count}</p>
                          <p className="text-xs text-slate-400">nightcaps</p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tips Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded-xl p-4 border border-indigo-500/20"
        >
          <h3 className="font-medium text-indigo-300 mb-2 flex items-center gap-2">
            <span>💡</span> Nightcap Ritual
          </h3>
          <p className="text-sm text-slate-400">
            The nightcap tradition dates back centuries — a final indulgence before rest. 
            Make it special: choose your favorite, find a quiet spot, and savor the moment.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
