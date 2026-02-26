"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiHome, FiRefreshCw, FiStar, FiClock, FiUsers, FiAward, FiPlus, FiMoon } from "react-icons/fi";

interface InsomniaCheckin {
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

interface InsomniaStats {
  totalInsomnia: number;
  uniqueInsomniacs: number;
  yourInsomniaCount: number;
  avgInsomniaHour: number;
  mostPopularBrand?: string;
  tonightHasInsomnia: boolean;
}

interface InsomniaLeader {
  username: string;
  count: number;
  avgHour: number;
}

interface Achievement {
  id: string;
  name: string;
  emoji: string;
  desc: string;
}

interface InsomniaData {
  tonightsInsomnia: InsomniaCheckin[];
  stats: InsomniaStats;
  leaders: InsomniaLeader[];
  achievements: Achievement[];
  currentHour: number;
  isInsomniaTime: boolean;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export default function InsomniaPage() {
  const router = useRouter();
  const [data, setData] = useState<InsomniaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"tonight" | "leaders" | "achievements">("tonight");

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/insomnia");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const result = await res.json() as InsomniaData;
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 flex items-center justify-center text-white">
        <p>Failed to load insomnia data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-sm border-b border-gray-700/30">
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
                🌃 Insomnia Club
              </h1>
              <p className="text-xs text-gray-400">For Those Who Can&apos;t Sleep</p>
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
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800 via-slate-800 to-gray-900 p-6 mb-6 shadow-xl border border-gray-700/50"
        >
          {/* Dim city lights background */}
          <div className="absolute inset-0 opacity-20">
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-0.5 h-0.5 bg-yellow-200 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${60 + Math.random() * 40}%`,
                }}
                animate={{
                  opacity: [0.2, 0.6, 0.2],
                }}
                transition={{
                  duration: 3 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 3,
                }}
              />
            ))}
          </div>
          
          <div className="relative z-10 text-center">
            <motion.div
              animate={{ 
                opacity: [0.8, 1, 0.8],
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="text-5xl mb-3"
            >
              🌃
            </motion.div>
            
            {data.isInsomniaTime ? (
              <>
                <h2 className="text-xl font-bold mb-2 text-gray-100">The Witching Hours</h2>
                <p className="text-gray-400 text-sm">
                  2 AM - 5 AM • You&apos;re not alone in the dark
                </p>
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-gray-700/50 rounded-full text-xs text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Insomnia hours active
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-2 text-gray-100">Insomnia Club</h2>
                <p className="text-gray-400 text-sm">
                  Return between 2 AM - 5 AM to join the sleepless
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Current time: {formatHour(data.currentHour)}
                </p>
              </>
            )}

            {!data.stats.tonightHasInsomnia && data.isInsomniaTime && (
              <Link
                href="/checkin"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-full text-sm font-medium transition-colors border border-gray-600"
              >
                <FiPlus className="w-4 h-4" />
                Log Your Insomnia Smoke
              </Link>
            )}

            {data.stats.tonightHasInsomnia && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-900/30 rounded-full text-sm border border-green-700/50">
                ✓ Fellow insomniac tonight
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
            className="bg-slate-800/50 rounded-xl p-4 text-center border border-gray-700/30"
          >
            <div className="text-2xl font-bold text-gray-300">{data.stats.totalInsomnia}</div>
            <div className="text-xs text-gray-500">Sleepless Smokes</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800/50 rounded-xl p-4 text-center border border-gray-700/30"
          >
            <div className="text-2xl font-bold text-gray-300">{data.stats.uniqueInsomniacs}</div>
            <div className="text-xs text-gray-500">Insomniacs</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800/50 rounded-xl p-4 text-center border border-gray-700/30"
          >
            <div className="text-2xl font-bold text-gray-300">{data.stats.yourInsomniaCount}</div>
            <div className="text-xs text-gray-500">Your Sleepless</div>
          </motion.div>
        </div>

        {/* Additional Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-800/30 rounded-xl p-4 mb-6 border border-gray-700/20"
        >
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <FiClock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500">Deepest hour:</span>
            </div>
            <span className="font-medium text-gray-300">{formatHour(data.stats.avgInsomniaHour)}</span>
          </div>
          {data.stats.mostPopularBrand && (
            <div className="flex items-center justify-between text-sm mt-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">💤</span>
                <span className="text-gray-500">Insomniac&apos;s choice:</span>
              </div>
              <span className="font-medium text-gray-300">{data.stats.mostPopularBrand}</span>
            </div>
          )}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("tonight")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "tonight"
                ? "bg-gray-700 text-white"
                : "bg-slate-800 text-gray-500 hover:text-gray-300"
            }`}
          >
            <FiMoon className="w-4 h-4 inline mr-2" />
            Recent
          </button>
          <button
            onClick={() => setActiveTab("leaders")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "leaders"
                ? "bg-gray-700 text-white"
                : "bg-slate-800 text-gray-500 hover:text-gray-300"
            }`}
          >
            <FiUsers className="w-4 h-4 inline mr-2" />
            Club
          </button>
          <button
            onClick={() => setActiveTab("achievements")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "achievements"
                ? "bg-gray-700 text-white"
                : "bg-slate-800 text-gray-500 hover:text-gray-300"
            }`}
          >
            <FiAward className="w-4 h-4 inline mr-2" />
            Ranks
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
              {data.tonightsInsomnia.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FiMoon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No insomnia smokes recently</p>
                  <p className="text-sm mt-2">Come back between 2-5 AM</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.tonightsInsomnia.map((checkin, index) => (
                    <motion.div
                      key={checkin.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={`/checkin/${checkin.id}`}
                        className="block bg-slate-800/50 rounded-xl p-4 border border-gray-700/30 hover:border-gray-600/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {checkin.imageUrl ? (
                            <img
                              src={checkin.imageUrl}
                              alt={checkin.brand}
                              className="w-14 h-14 rounded-lg object-cover opacity-90"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-slate-700 flex items-center justify-center text-2xl opacity-80">
                              🌃
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <Link 
                                href={`/user/${checkin.username}`}
                                className="font-medium text-gray-300 hover:text-white transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {checkin.username}
                              </Link>
                              <span className="text-xs text-gray-600">{checkin.timeAgo}</span>
                            </div>
                            <p className="text-sm text-gray-400">{checkin.brand}</p>
                            {checkin.product && (
                              <p className="text-xs text-gray-500">{checkin.product}</p>
                            )}
                            {checkin.rating && (
                              <div className="flex items-center gap-1 mt-1">
                                <FiStar className="w-3 h-3 text-yellow-600 fill-yellow-600" />
                                <span className="text-xs text-yellow-600">{checkin.rating}</span>
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
          ) : activeTab === "leaders" ? (
            <motion.div
              key="leaders"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {data.leaders.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FiUsers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No insomniacs yet</p>
                  <p className="text-sm mt-2">Be the first to join the club</p>
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
                        className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-4 border border-gray-700/30 hover:border-gray-600/50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-slate-700 flex items-center justify-center text-lg font-bold">
                          {index === 0 ? "🧛" : index === 1 ? "👻" : index === 2 ? "😴" : index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-300">{leader.username}</p>
                          <p className="text-xs text-gray-500">
                            Darkest hour: {formatHour(leader.avgHour)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-400">{leader.count}</p>
                          <p className="text-xs text-gray-600">sleepless</p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="space-y-3">
                {/* All possible achievements */}
                {[
                  { id: "first_insomnia", name: "Sleepless", emoji: "😴", desc: "First smoke at 2-5 AM", req: 1 },
                  { id: "insomniac", name: "Insomniac", emoji: "🌃", desc: "5 smokes at 2-5 AM", req: 5 },
                  { id: "night_terror", name: "Night Terror", emoji: "👻", desc: "10 smokes at 2-5 AM", req: 10 },
                  { id: "vampire", name: "Vampire", emoji: "🧛", desc: "25 smokes at 2-5 AM", req: 25 },
                ].map((achievement, index) => {
                  const earned = data.achievements.some((a) => a.id === achievement.id);
                  const progress = Math.min(100, (data.stats.yourInsomniaCount / achievement.req) * 100);
                  
                  return (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`rounded-xl p-4 border transition-colors ${
                        earned 
                          ? "bg-gray-800/70 border-gray-600/50" 
                          : "bg-slate-800/30 border-gray-700/20 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`text-3xl ${earned ? "" : "grayscale"}`}>
                          {achievement.emoji}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium ${earned ? "text-gray-200" : "text-gray-500"}`}>
                              {achievement.name}
                            </p>
                            {earned && (
                              <span className="text-xs px-2 py-0.5 bg-green-900/50 text-green-400 rounded-full">
                                Earned
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{achievement.desc}</p>
                          {!earned && (
                            <div className="mt-2">
                              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gray-600 rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                {data.stats.yourInsomniaCount}/{achievement.req}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lore Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-gradient-to-r from-gray-900/50 to-slate-900/50 rounded-xl p-4 border border-gray-700/20"
        >
          <h3 className="font-medium text-gray-400 mb-2 flex items-center gap-2">
            <span>🌑</span> The Insomnia Hours
          </h3>
          <p className="text-sm text-gray-500">
            2 AM to 5 AM. The city sleeps, but you don&apos;t. In these quiet hours, 
            there&apos;s a strange solidarity among the sleepless — those who find peace 
            in smoke while the world dreams.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
