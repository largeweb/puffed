"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiHome, FiRefreshCw, FiStar, FiSun, FiClock, FiTrendingUp, FiAward } from "react-icons/fi";

interface DawnPatroller {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  checkedAt: number;
  timeAgo: string;
  imageUrl?: string;
  exactTime: string;
}

interface DawnStats {
  totalDawnSmokes: number;
  uniqueDawnPatrollers: number;
  yourDawnCount: number;
  isDawnWindow: boolean;
  currentHour: number;
  earliestThisWeek?: string;
  mostDedicatedPatroller?: string;
  avgDawnRating?: number;
  peakDawnMinute?: number;
}

interface DawnLeader {
  username: string;
  count: number;
  avgRating: string;
  earliestSmoke: string;
}

interface DawnData {
  todaysPatrol: DawnPatroller[];
  stats: DawnStats;
  leaders: DawnLeader[];
}

function formatMinute(minute: number): string {
  const hour = Math.floor(minute / 60) + 4; // Dawn window starts at 4 AM
  const min = minute % 60;
  return `${hour}:${min.toString().padStart(2, '0')} AM`;
}

export default function DawnPatrolPage() {
  const router = useRouter();
  const [data, setData] = useState<DawnData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"today" | "legends">("today");

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/dawn-patrol");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const result = await res.json() as DawnData;
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
    const interval = setInterval(() => fetchData(), 60000); // Refresh every minute during dawn
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-orange-950 to-amber-950 text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-800 rounded w-2/3"></div>
            <div className="h-40 bg-gray-800/50 rounded-xl"></div>
            <div className="h-32 bg-gray-800/50 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const { todaysPatrol, stats, leaders } = data || { todaysPatrol: [], stats: null, leaders: [] };

  // Get dawn vibe based on time and activity
  const getDawnVibe = () => {
    if (!stats?.isDawnWindow) {
      const hour = stats?.currentHour || 0;
      if (hour < 4) {
        return { emoji: "🌑", status: "Before First Light", subtitle: "Dawn patrol begins at 4 AM", gradient: "from-slate-900 to-slate-800" };
      }
      return { emoji: "☀️", status: "Sun's Up", subtitle: "Dawn patrol ended at 7 AM", gradient: "from-amber-900 to-orange-900" };
    }
    const patrolCount = todaysPatrol.length;
    if (patrolCount === 0) {
      return { emoji: "🌅", status: "First Watch", subtitle: "Be the first to greet the dawn", gradient: "from-indigo-900 to-orange-900" };
    }
    if (patrolCount < 3) {
      return { emoji: "🌄", status: "Early Risers", subtitle: "The dedicated few", gradient: "from-purple-900 to-orange-900" };
    }
    if (patrolCount < 6) {
      return { emoji: "🔆", status: "Dawn Squad", subtitle: "The morning crew assembles", gradient: "from-rose-900 to-amber-900" };
    }
    return { emoji: "☀️", status: "FULL PATROL", subtitle: "Maximum dedication achieved", gradient: "from-orange-900 to-yellow-900" };
  };

  const vibe = getDawnVibe();

  // Calculate time until dawn or time remaining in dawn
  const getTimeInfo = () => {
    const hour = stats?.currentHour || 0;
    if (hour < 4) {
      const hoursUntil = 4 - hour;
      return { label: "Dawn patrol begins in", time: `${hoursUntil}h`, sublabel: "4:00 AM start" };
    }
    if (hour < 7) {
      const hoursLeft = 7 - hour;
      return { label: "Time remaining", time: `${hoursLeft}h`, sublabel: "Ends at 7 AM" };
    }
    return { label: "Next patrol in", time: `${24 - hour + 4}h`, sublabel: "Tomorrow 4 AM" };
  };

  const timeInfo = getTimeInfo();

  return (
    <div className={`min-h-screen bg-gradient-to-b ${vibe.gradient} text-white p-4 pb-20`}>
      <div className="max-w-lg mx-auto">
        {/* Stars animation for pre-dawn */}
        {!stats?.isDawnWindow && stats?.currentHour !== undefined && stats.currentHour < 4 && (
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 50}%`,
                }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
        )}

        {/* Sunrise rays animation during dawn */}
        {stats?.isDawnWindow && (
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[50%]"
              style={{
                background: "radial-gradient(ellipse at bottom center, rgba(255,200,100,0.15) 0%, transparent 70%)",
              }}
              animate={{
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
              }}
            />
          </div>
        )}

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <FiHome size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-3xl">🌅</span> Dawn Patrol
              </h1>
              <p className="text-sm text-orange-400/70">4 AM - 7 AM • Early Bird Club</p>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            className={`p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all ${refreshing ? "animate-spin" : ""}`}
          >
            <FiRefreshCw size={20} />
          </button>
        </div>

        {/* Dawn Status Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`relative z-10 mb-4 p-5 rounded-xl ${
            stats?.isDawnWindow
              ? "bg-gradient-to-r from-orange-900/40 via-amber-900/30 to-orange-900/40 border border-orange-500/40"
              : "bg-gray-900/50 border border-gray-800/50"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <motion.span 
                className="text-5xl"
                animate={stats?.isDawnWindow ? { 
                  y: [0, -5, 0],
                  rotate: [0, 5, -5, 0]
                } : {}}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {vibe.emoji}
              </motion.span>
              {stats?.isDawnWindow && (
                <motion.span 
                  className="absolute -top-1 -right-1 w-4 h-4 bg-orange-400 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </div>
            <div>
              <p className={`text-xl font-bold ${stats?.isDawnWindow ? "text-orange-300" : "text-gray-400"}`}>
                {vibe.status}
              </p>
              <p className="text-sm text-gray-500">{vibe.subtitle}</p>
              <div className="flex items-center gap-2 mt-2">
                <FiClock size={12} className="text-orange-500/70" />
                <span className="text-xs text-orange-500/70">{timeInfo.label}: {timeInfo.time}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Your Dawn Stats */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative z-10 mb-6 p-4 rounded-xl bg-gradient-to-r from-gray-900 via-orange-950/20 to-gray-900 border border-gray-800"
          >
            <div className="text-center mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Your Dawn Patrol Count</p>
              <p className="text-4xl font-bold text-orange-400">{stats.yourDawnCount}</p>
              <p className="text-xs text-gray-600 mt-1">
                {stats.yourDawnCount === 0 
                  ? "Join the early bird club!" 
                  : stats.yourDawnCount === 1 
                  ? "Welcome to the dawn squad!" 
                  : stats.yourDawnCount >= 5 
                  ? "🏆 True Early Bird!" 
                  : stats.yourDawnCount >= 10
                  ? "🌟 Dawn Legend!"
                  : "Rising with the sun"}
              </p>
            </div>
            {stats.earliestThisWeek && (
              <div className="text-center pt-2 border-t border-gray-800/50">
                <p className="text-xs text-gray-600">Your earliest this week</p>
                <p className="text-sm text-orange-400 font-medium">{stats.earliestThisWeek}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Tabs */}
        <div className="relative z-10 flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("today")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "today"
                ? "bg-orange-900/50 text-orange-300 border border-orange-700/50"
                : "bg-white/5 text-gray-500 hover:bg-white/10"
            }`}
          >
            <FiSun className="inline mr-1" size={14} /> Today&apos;s Patrol
          </button>
          <button
            onClick={() => setActiveTab("legends")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "legends"
                ? "bg-orange-900/50 text-orange-300 border border-orange-700/50"
                : "bg-white/5 text-gray-500 hover:bg-white/10"
            }`}
          >
            <FiAward className="inline mr-1" size={14} /> Dawn Legends
          </button>
        </div>

        {/* Today's Patrol Tab */}
        <AnimatePresence mode="wait">
          {activeTab === "today" && (
            <motion.div
              key="today"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="relative z-10 space-y-3"
            >
              {todaysPatrol.length === 0 ? (
                <div className="text-center py-12 bg-gray-900/30 rounded-xl border border-gray-800/50">
                  <motion.span 
                    className="text-5xl mb-3 block"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    🌅
                  </motion.span>
                  <p className="text-gray-400">No dawn patrollers yet today</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {stats?.isDawnWindow 
                      ? "Be the first to greet the morning!" 
                      : "Dawn patrol runs 4 AM - 7 AM"}
                  </p>
                  {stats?.isDawnWindow && (
                    <Link 
                      href="/dashboard"
                      className="inline-block mt-4 px-4 py-2 bg-orange-900/50 hover:bg-orange-800/50 border border-orange-700/50 rounded-lg transition-colors text-orange-300"
                    >
                      Log Your Dawn Smoke 🌄
                    </Link>
                  )}
                </div>
              ) : (
                todaysPatrol.map((patroller, idx) => (
                  <motion.div
                    key={`${patroller.username}-${patroller.checkedAt}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 rounded-xl bg-gradient-to-r from-gray-900 via-orange-950/10 to-gray-900 border border-gray-800/50"
                  >
                    <div className="flex items-center gap-3">
                      {patroller.imageUrl ? (
                        <img 
                          src={patroller.imageUrl} 
                          alt={patroller.brand}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-orange-900/30 flex items-center justify-center">
                          <span className="text-2xl">{idx === 0 ? "🥇" : "🌅"}</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/user/${patroller.username}`}
                            className="font-semibold text-gray-200 hover:text-orange-300"
                          >
                            {patroller.username}
                          </Link>
                          {idx === 0 && (
                            <span className="text-xs bg-orange-900/50 px-2 py-0.5 rounded-full text-orange-300">
                              First Up!
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {patroller.brand}{patroller.product ? ` - ${patroller.product}` : ""}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-orange-500/70 flex items-center gap-1">
                            <FiClock size={10} /> {patroller.exactTime}
                          </span>
                          <span className="text-xs text-gray-600">•</span>
                          <span className="text-xs text-gray-600">{patroller.timeAgo}</span>
                        </div>
                      </div>
                      {patroller.rating && (
                        <div className="flex items-center gap-1 bg-orange-900/30 px-2 py-1 rounded-lg border border-orange-800/30">
                          <FiStar className="text-orange-400" size={14} />
                          <span className="text-orange-400 font-semibold text-sm">{patroller.rating}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "legends" && (
            <motion.div
              key="legends"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="relative z-10 space-y-3"
            >
              <div className="text-center py-4 mb-2">
                <h3 className="text-lg font-semibold text-orange-300">🏆 Dawn Patrol Hall of Fame</h3>
                <p className="text-sm text-gray-600">The most dedicated early risers</p>
              </div>
              {leaders.length === 0 ? (
                <div className="text-center py-12 bg-gray-900/30 rounded-xl border border-gray-800/50">
                  <span className="text-5xl mb-3 block">🏆</span>
                  <p className="text-gray-400">No legends yet</p>
                  <p className="text-sm text-gray-600 mt-1">Start smoking at dawn to claim your spot!</p>
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
                        ? "bg-gradient-to-r from-orange-900/40 via-yellow-900/30 to-orange-900/40 border-orange-500/50" 
                        : idx === 1
                        ? "bg-gradient-to-r from-gray-700/30 via-gray-800/30 to-gray-700/30 border-gray-500/50"
                        : idx === 2
                        ? "bg-gradient-to-r from-amber-900/30 via-gray-900 to-amber-900/30 border-amber-700/30"
                        : "bg-gray-900/30 border-gray-800/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl w-8 text-center">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                      </div>
                      <div className="flex-1">
                        <Link 
                          href={`/user/${leader.username}`}
                          className="font-semibold text-gray-200 hover:text-orange-300"
                        >
                          {leader.username}
                        </Link>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span>Avg: {leader.avgRating}⭐</span>
                          {leader.earliestSmoke && (
                            <span className="text-orange-500/70">Earliest: {leader.earliestSmoke}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-orange-400">{leader.count}</p>
                        <p className="text-xs text-gray-600">dawn smokes</p>
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
            className="relative z-10 mt-6 p-4 rounded-xl bg-gray-900/50 border border-gray-800/30"
          >
            <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
              <FiTrendingUp size={14} /> Dawn Patrol Stats
            </h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-orange-400">{stats.totalDawnSmokes}</p>
                <p className="text-xs text-gray-600">Total Dawn Smokes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-400">{stats.uniqueDawnPatrollers}</p>
                <p className="text-xs text-gray-600">Early Birds</p>
              </div>
              <div>
                <p className="text-lg font-bold text-orange-500/70">{stats.mostDedicatedPatroller || "—"}</p>
                <p className="text-xs text-gray-600">Most Dedicated</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-500">
                  {stats.peakDawnMinute !== undefined ? formatMinute(stats.peakDawnMinute) : "—"}
                </p>
                <p className="text-xs text-gray-600">Peak Time</p>
              </div>
            </div>
            {stats.avgDawnRating && (
              <div className="mt-3 pt-3 border-t border-gray-800/50 text-center">
                <p className="text-xs text-gray-600">Average Dawn Rating</p>
                <div className="flex items-center justify-center gap-1">
                  <FiStar className="text-orange-400" size={16} />
                  <span className="text-lg font-bold text-orange-400">{stats.avgDawnRating}</span>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Related Links */}
        <div className="relative z-10 mt-6 flex gap-2">
          <Link 
            href="/first-light"
            className="flex-1 p-3 rounded-xl bg-gradient-to-r from-yellow-950/30 to-orange-950/30 border border-yellow-800/30 text-center hover:bg-yellow-950/40 transition-colors"
          >
            <span className="text-xl">☀️</span>
            <p className="text-sm text-yellow-300 mt-1">First Light</p>
            <p className="text-xs text-gray-600">Daily Race</p>
          </Link>
          <Link 
            href="/coffee"
            className="flex-1 p-3 rounded-xl bg-gradient-to-r from-amber-950/30 to-orange-950/30 border border-amber-800/30 text-center hover:bg-amber-950/40 transition-colors"
          >
            <span className="text-xl">☕</span>
            <p className="text-sm text-amber-300 mt-1">Coffee Lounge</p>
            <p className="text-xs text-gray-600">5-10 AM</p>
          </Link>
        </div>

        {/* Dawn Quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative z-10 mt-8 text-center"
        >
          <p className="text-orange-700/60 italic text-sm">&quot;The early bird gets the best smoke.&quot;</p>
          <p className="text-xs text-gray-700 mt-1">🌅 Dawn Patrol • Rise &amp; Puff</p>
        </motion.div>
      </div>
    </div>
  );
}
