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
  FiSun,
} from "react-icons/fi";

interface BBQActivity {
  hour: number;
  activity: string;
  desc: string;
}

interface Griller {
  id: number;
  username: string;
  brand: string;
  product: string | null;
  rating: number;
  photoUrl: string | null;
  time: string;
}

interface LeaderboardEntry {
  username: string;
  saturdayAfternoonSmokes: number;
  avgRating: number;
  favoriteHour: number;
  topBrand: string | null;
}

interface BBQData {
  isSaturday: boolean;
  isBBQTime: boolean;
  isWeekend: boolean;
  currentHour: number;
  countdownMessage: string;
  currentActivity: BBQActivity;
  bbqActivities: BBQActivity[];
  currentGrillers: Griller[];
  leaderboard: LeaderboardEntry[];
  stats: {
    totalSmokes: number;
    uniqueGrillers: number;
    avgRating: number;
  };
  myStats: {
    totalSmokes: number;
    avgRating: number;
    favoriteBrand: string | null;
  } | null;
  todaysFact: string;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

export default function BackyardBBQPage() {
  const router = useRouter();
  const [data, setData] = useState<BBQData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"schedule" | "grillers" | "leaderboard">("schedule");
  const [sizzle, setSizzle] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/backyard-bbq");
      if (res.ok) {
        setSizzle(true);
        setTimeout(() => setSizzle(false), 500);
        const json = (await res.json()) as BBQData;
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch BBQ data:", err);
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
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-6xl"
        >
          🍖
        </motion.div>
      </div>
    );
  }

  const isOpen = data?.isBBQTime ?? false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 text-white pb-20">
      {/* Smoke particles effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {isOpen && [...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-8 h-8 bg-white/10 rounded-full blur-xl"
            initial={{ 
              x: `${20 + i * 15}%`, 
              y: "100%",
              opacity: 0 
            }}
            animate={{
              y: "-20%",
              opacity: [0, 0.3, 0],
              scale: [1, 2, 3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              delay: i * 1.5,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
      
      {/* Sizzle effect */}
      <AnimatePresence>
        {sizzle && (
          <motion.div
            initial={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gradient-to-t from-orange-500/20 to-transparent"
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-amber-600/90 via-orange-600/90 to-red-600/90 backdrop-blur-sm border-b-4 border-amber-400">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/20 rounded-full">
            <FiHome className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-2xl"
            >
              🍖
            </motion.span>
            <span className="font-bold text-white drop-shadow-lg">
              Backyard BBQ Lounge
            </span>
          </div>
          <button onClick={fetchData} className="p-2 hover:bg-white/20 rounded-full">
            <FiRefreshCw className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 relative">
        {/* Current Activity Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-2xl p-6 text-center border-4 ${
            isOpen
              ? "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 border-amber-300"
              : "bg-gray-800/80 border-gray-600"
          }`}
        >
          {/* Grill Icon */}
          <div className="relative inline-block mb-4">
            <div className={`w-32 h-24 rounded-lg flex items-center justify-center text-4xl ${
              isOpen ? "bg-stone-800" : "bg-gray-900"
            }`} style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
              {isOpen ? (
                <motion.div className="relative">
                  <motion.span
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    🔥
                  </motion.span>
                  {/* Smoke wisps */}
                  <motion.span
                    className="absolute -top-2 left-1/2 text-lg opacity-50"
                    animate={{ y: [-5, -15], opacity: [0.5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    💨
                  </motion.span>
                </motion.div>
              ) : (
                <span className="text-gray-600">🍖</span>
              )}
            </div>
            {/* Grill grates */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-4 h-0.5 bg-gray-500 rounded-full" />
              ))}
            </div>
          </div>

          {isOpen ? (
            <>
              <h1 className="text-2xl font-bold text-white drop-shadow-lg mb-2">
                🔥 GRILL&apos;S HOT 🔥
              </h1>
              <div className="text-3xl font-bold text-white drop-shadow-lg mb-1">
                {data?.currentActivity.activity}
              </div>
              <p className="text-white/80">{data?.currentActivity.desc}</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-300 mb-2">
                {data?.isSaturday ? "🍖 Grill's Cooling Down" : "Fire Up Saturday!"}
              </h1>
              <p className="text-gray-400 text-sm">{data?.countdownMessage}</p>
              <p className="text-gray-500 text-xs mt-2">
                Saturday 12 PM - 6 PM
              </p>
            </>
          )}
        </motion.div>

        {/* BBQ Fact of the Day */}
        {data?.todaysFact && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-stone-800/50 rounded-xl p-4 border border-amber-500/30"
          >
            <p className="text-amber-200 text-sm text-center italic">
              {data.todaysFact}
            </p>
          </motion.div>
        )}

        {/* My Stats */}
        {data?.myStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-amber-600/30 to-orange-600/30 rounded-xl p-4 border border-amber-400/30"
          >
            <h2 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
              <FiStar className="w-4 h-4" />
              Your BBQ Stats
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{data.myStats.totalSmokes}</div>
                <div className="text-xs text-amber-300/70">Afternoon Smokes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">⭐ {data.myStats.avgRating?.toFixed(1) || '—'}</div>
                <div className="text-xs text-amber-300/70">Avg Rating</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white truncate">{data.myStats.favoriteBrand || '—'}</div>
                <div className="text-xs text-amber-300/70">Go-To Brand</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: "schedule", label: "🍖 Activities", icon: FiClock },
            { id: "grillers", label: "🔥 Grillers", icon: FiUsers },
            { id: "leaderboard", label: "🏆 Pit Masters", icon: FiAward },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "schedule" && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              <p className="text-sm text-amber-200 mb-4">
                🍖 Saturday afternoon BBQ schedule (12 PM - 6 PM)
              </p>
              {data?.bbqActivities.map((activity, i) => {
                const isCurrent = data.isBBQTime && data.currentHour === activity.hour;
                const isPast = data.isSaturday && data.currentHour > activity.hour;
                
                return (
                  <motion.div
                    key={activity.hour}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-xl p-4 border-2 ${
                      isCurrent
                        ? "bg-gradient-to-r from-amber-500/30 to-orange-500/30 border-amber-400 shadow-lg shadow-amber-500/20"
                        : isPast
                          ? "bg-gray-800/30 border-gray-700/50 opacity-50"
                          : "bg-stone-800/30 border-stone-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                          isCurrent ? "bg-amber-500/30" : "bg-stone-700/30"
                        }`}>
                          {activity.activity.split(' ')[0]}
                        </div>
                        <div>
                          <div className={`font-bold ${isCurrent ? "text-amber-200" : "text-white"}`}>
                            {activity.activity.split(' ').slice(1).join(' ')}
                          </div>
                          <div className="text-sm text-amber-300/70">{activity.desc}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono font-bold ${isCurrent ? "text-amber-300" : "text-amber-400/70"}`}>
                          {formatHour(activity.hour)}
                        </div>
                        {isCurrent && (
                          <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                            NOW
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {activeTab === "grillers" && (
            <motion.div
              key="grillers"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Platform Stats */}
              {data?.stats && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-stone-800/30 rounded-lg p-3 border border-amber-500/30 text-center">
                    <div className="text-xl font-bold text-white">{data.stats.totalSmokes}</div>
                    <div className="text-xs text-amber-300/70">Total Sessions</div>
                  </div>
                  <div className="bg-stone-800/30 rounded-lg p-3 border border-amber-500/30 text-center">
                    <div className="text-xl font-bold text-white">{data.stats.uniqueGrillers}</div>
                    <div className="text-xs text-amber-300/70">Grillers</div>
                  </div>
                  <div className="bg-stone-800/30 rounded-lg p-3 border border-amber-500/30 text-center">
                    <div className="text-xl font-bold text-white">⭐ {data.stats.avgRating?.toFixed(1) || '—'}</div>
                    <div className="text-xs text-amber-300/70">Avg Rating</div>
                  </div>
                </div>
              )}

              {/* Current Grillers */}
              <div className="bg-stone-800/20 rounded-xl p-4 border border-amber-500/30">
                <h3 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
                  <FiSun className="w-4 h-4" />
                  At the Grill Today
                </h3>
                {data?.currentGrillers && data.currentGrillers.length > 0 ? (
                  <div className="space-y-3">
                    {data.currentGrillers.map((griller, i) => (
                      <motion.div
                        key={griller.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between bg-stone-700/20 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-lg">
                            🔥
                          </div>
                          <div>
                            <Link href={`/profile/${griller.username}`} className="font-medium text-white hover:text-amber-300">
                              {griller.username}
                            </Link>
                            <div className="text-xs text-amber-300/70">
                              {griller.brand} {griller.product ? `• ${griller.product}` : ""}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-amber-400">{"⭐".repeat(Math.round(griller.rating))}</div>
                          <div className="text-xs text-amber-400/60">{griller.time}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-amber-300/50">
                    <div className="text-4xl mb-2">🍖</div>
                    <p className="text-sm">No one at the grill yet today</p>
                    {isOpen && <p className="text-xs mt-1">Fire up the coals and be the first!</p>}
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
              <p className="text-sm text-amber-200 mb-4">
                🏆 All-time Saturday afternoon pit masters
              </p>
              {data?.leaderboard && data.leaderboard.length > 0 ? (
                data.leaderboard.map((griller, i) => (
                  <motion.div
                    key={griller.username}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-stone-800/30 rounded-xl p-4 border border-amber-500/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" :
                          i === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800" :
                          i === 2 ? "bg-gradient-to-br from-orange-500 to-red-600 text-white" :
                          "bg-stone-700 text-amber-300"
                        }`}>
                          {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                        </div>
                        <div>
                          <Link href={`/profile/${griller.username}`} className="font-medium text-white hover:text-amber-300">
                            {griller.username}
                          </Link>
                          {griller.topBrand && (
                            <div className="text-xs text-amber-300/70">
                              Go-to: {griller.topBrand}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-amber-300">{griller.saturdayAfternoonSmokes}</div>
                        <div className="text-xs text-amber-400/60">BBQ sessions</div>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-amber-300/50">
                      <span>⭐ {griller.avgRating?.toFixed(1) || '—'} avg</span>
                      <span>⏰ Peak: {formatHour(griller.favoriteHour)}</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-amber-300/50">
                  <div className="text-5xl mb-3">🍖</div>
                  <p>No pit masters yet!</p>
                  <p className="text-xs mt-1">Be the first to claim the grill</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Log CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link
            href="/log"
            className="block w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-white font-bold py-4 px-6 rounded-xl text-center transition-all shadow-lg"
          >
            🔥 Log a Backyard Smoke!
          </Link>
        </motion.div>

        {/* Quick Links */}
        <div className="pt-4 flex flex-wrap justify-center gap-2 text-xs text-amber-300/70">
          <Link href="/saturday-cartoons" className="hover:text-white">📺 Sat Morning</Link>
          <span>•</span>
          <Link href="/saturday-night" className="hover:text-white">🌙 Sat Night</Link>
          <span>•</span>
          <Link href="/weekend-scoreboard" className="hover:text-white">🏆 Weekend Score</Link>
          <span>•</span>
          <Link href="/happy-hour" className="hover:text-white">🍻 Happy Hour</Link>
        </div>
      </main>
    </div>
  );
}
