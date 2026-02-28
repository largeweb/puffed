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
  FiTv,
} from "react-icons/fi";

interface SportsActivity {
  hour: number;
  activity: string;
  desc: string;
}

interface Spectator {
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
  sportsSmokes: number;
  avgRating: number;
  topBrand: string | null;
  favoriteHour: number;
}

interface SportsDenData {
  isSaturday: boolean;
  isSunday: boolean;
  isWeekend: boolean;
  isSportsDenTime: boolean;
  currentHour: number;
  countdownMessage: string;
  currentActivity: SportsActivity;
  sportsSchedule: SportsActivity[];
  gameIntensity: number;
  todaysTip: string;
  currentSpectators: Spectator[];
  stats: {
    totalSmokes: number;
    uniqueFans: number;
    avgRating: number;
    topBrand: string | null;
  };
  leaderboard: LeaderboardEntry[];
  myStats: {
    totalSmokes: number;
    avgRating: number;
    favoriteBrand: string | null;
  } | null;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

export default function SportsDenPage() {
  const router = useRouter();
  const [data, setData] = useState<SportsDenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"schedule" | "spectators" | "mvps">("schedule");
  const [crowdCheer, setCrowdCheer] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/sports-den");
      if (res.ok) {
        setCrowdCheer(true);
        setTimeout(() => setCrowdCheer(false), 500);
        const json = (await res.json()) as SportsDenData;
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch sports den data:", err);
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
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-6xl"
        >
          🏈
        </motion.div>
      </div>
    );
  }

  const isOpen = data?.isSportsDenTime ?? false;
  const gameDay = data?.isSaturday ? "Saturday" : data?.isSunday ? "Sunday" : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 text-white pb-20">
      {/* Stadium lights effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {isOpen && (
          <>
            <motion.div
              className="absolute top-0 left-1/4 w-32 h-64 bg-gradient-to-b from-yellow-300/20 to-transparent blur-3xl"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute top-0 right-1/4 w-32 h-64 bg-gradient-to-b from-yellow-300/20 to-transparent blur-3xl"
              animate={{ opacity: [0.6, 0.3, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </>
        )}
      </div>

      {/* Crowd cheer effect */}
      <AnimatePresence>
        {crowdCheer && (
          <motion.div
            initial={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gradient-to-t from-green-500/10 to-transparent"
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-green-700/90 via-emerald-700/90 to-teal-700/90 backdrop-blur-sm border-b-4 border-green-400">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/20 rounded-full">
            <FiHome className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ rotate: [-10, 10, -10], y: [0, -3, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="text-2xl"
            >
              🏈
            </motion.span>
            <span className="font-bold text-white drop-shadow-lg">
              The Sports Den
            </span>
          </div>
          <button onClick={fetchData} className="p-2 hover:bg-white/20 rounded-full">
            <FiRefreshCw className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 relative">
        {/* Main Scoreboard Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-2xl p-6 text-center border-4 ${
            isOpen
              ? "bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 border-green-400"
              : "bg-gray-800/80 border-gray-600"
          }`}
        >
          {/* Scoreboard Style Display */}
          <div className="relative inline-block mb-4">
            <div className={`w-40 h-24 rounded-lg flex flex-col items-center justify-center ${
              isOpen ? "bg-black/60" : "bg-gray-900/80"
            }`} style={{ 
              boxShadow: isOpen 
                ? '0 0 20px rgba(34, 197, 94, 0.3), inset 0 0 10px rgba(0,0,0,0.5)' 
                : 'inset 0 0 10px rgba(0,0,0,0.5)',
              border: isOpen ? '2px solid #22c55e' : '2px solid #374151'
            }}>
              {isOpen ? (
                <>
                  <motion.span 
                    className="text-3xl"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    📺
                  </motion.span>
                  <span className="text-green-400 text-xs font-mono mt-1">LIVE</span>
                </>
              ) : (
                <>
                  <span className="text-3xl opacity-50">📺</span>
                  <span className="text-gray-500 text-xs font-mono mt-1">OFF AIR</span>
                </>
              )}
            </div>
            {/* LED dots for scoreboard effect */}
            {isOpen && (
              <div className="absolute -top-1 -right-1">
                <motion.div
                  className="w-3 h-3 bg-red-500 rounded-full"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </div>
            )}
          </div>

          {isOpen ? (
            <>
              <h1 className="text-2xl font-bold text-white drop-shadow-lg mb-2">
                🏆 GAME DAY 🏆
              </h1>
              <div className="text-xl font-bold text-green-200 mb-1">
                {data?.currentActivity.activity}
              </div>
              <p className="text-green-100/80">{data?.currentActivity.desc}</p>
              <p className="text-sm text-green-300/60 mt-2">{gameDay} Sports Session</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-300 mb-2">
                {data?.isWeekend ? "🏈 Waiting for Kickoff" : "Weekend Games Only"}
              </h1>
              <p className="text-gray-400 text-sm">{data?.countdownMessage}</p>
              <p className="text-gray-500 text-xs mt-2">
                Sat & Sun • 12 PM - 6 PM
              </p>
            </>
          )}
        </motion.div>

        {/* Game Intensity Meter */}
        {isOpen && data?.gameIntensity !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/30 rounded-xl p-4 border border-green-500/30"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-green-300 flex items-center gap-2">
                <FiTv className="w-4 h-4" />
                Game Intensity
              </span>
              <span className="text-sm font-bold text-white">
                {data.gameIntensity >= 100 ? "🔥 PEAK" : 
                 data.gameIntensity >= 75 ? "⚡ HIGH" : "📺 WARMING UP"}
              </span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.gameIntensity}%` }}
                transition={{ duration: 1 }}
                className={`h-full rounded-full ${
                  data.gameIntensity >= 100 
                    ? "bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500" 
                    : data.gameIntensity >= 75
                      ? "bg-gradient-to-r from-green-500 to-emerald-500"
                      : "bg-gradient-to-r from-teal-500 to-green-500"
                }`}
              />
            </div>
          </motion.div>
        )}

        {/* Pro Tip */}
        {data?.todaysTip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-800/30 rounded-xl p-4 border border-emerald-500/30"
          >
            <p className="text-emerald-200 text-sm text-center italic">
              💡 {data.todaysTip}
            </p>
          </motion.div>
        )}

        {/* My Stats */}
        {data?.myStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-green-600/30 to-emerald-600/30 rounded-xl p-4 border border-green-400/30"
          >
            <h2 className="text-sm font-semibold text-green-300 mb-3 flex items-center gap-2">
              <FiStar className="w-4 h-4" />
              Your Sports Den Stats
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{data.myStats.totalSmokes}</div>
                <div className="text-xs text-green-300/70">Game Smokes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">⭐ {data.myStats.avgRating?.toFixed(1) || '—'}</div>
                <div className="text-xs text-green-300/70">Avg Rating</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white truncate">{data.myStats.favoriteBrand || '—'}</div>
                <div className="text-xs text-green-300/70">Go-To Brand</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: "schedule", label: "📺 Schedule", icon: FiClock },
            { id: "spectators", label: "🏟️ Fans", icon: FiUsers },
            { id: "mvps", label: "🏆 MVPs", icon: FiAward },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
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
              <p className="text-sm text-green-200 mb-4">
                🏈 Weekend game day schedule (12 PM - 6 PM)
              </p>
              {data?.sportsSchedule.map((activity, i) => {
                const isCurrent = data.isSportsDenTime && data.currentHour === activity.hour;
                const isPast = data.isWeekend && data.currentHour > activity.hour;
                
                return (
                  <motion.div
                    key={activity.hour}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-xl p-4 border-2 ${
                      isCurrent
                        ? "bg-gradient-to-r from-green-500/30 to-emerald-500/30 border-green-400 shadow-lg shadow-green-500/20"
                        : isPast
                          ? "bg-gray-800/30 border-gray-700/50 opacity-50"
                          : "bg-green-900/30 border-green-700/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                          isCurrent ? "bg-green-500/30" : "bg-green-800/30"
                        }`}>
                          {activity.activity.split(' ')[0]}
                        </div>
                        <div>
                          <div className={`font-bold ${isCurrent ? "text-green-200" : "text-white"}`}>
                            {activity.activity.split(' ').slice(1).join(' ')}
                          </div>
                          <div className="text-sm text-green-300/70">{activity.desc}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono font-bold ${isCurrent ? "text-green-300" : "text-green-400/70"}`}>
                          {formatHour(activity.hour)}
                        </div>
                        {isCurrent && (
                          <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full animate-pulse">
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

          {activeTab === "spectators" && (
            <motion.div
              key="spectators"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Platform Stats */}
              {data?.stats && (
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-green-900/30 rounded-lg p-3 border border-green-500/30 text-center">
                    <div className="text-lg font-bold text-white">{data.stats.totalSmokes}</div>
                    <div className="text-[10px] text-green-300/70">All-Time</div>
                  </div>
                  <div className="bg-green-900/30 rounded-lg p-3 border border-green-500/30 text-center">
                    <div className="text-lg font-bold text-white">{data.stats.uniqueFans}</div>
                    <div className="text-[10px] text-green-300/70">Fans</div>
                  </div>
                  <div className="bg-green-900/30 rounded-lg p-3 border border-green-500/30 text-center">
                    <div className="text-lg font-bold text-white">⭐ {data.stats.avgRating?.toFixed(1) || '—'}</div>
                    <div className="text-[10px] text-green-300/70">Avg</div>
                  </div>
                  <div className="bg-green-900/30 rounded-lg p-3 border border-green-500/30 text-center">
                    <div className="text-sm font-bold text-white truncate">{data.stats.topBrand?.slice(0,6) || '—'}</div>
                    <div className="text-[10px] text-green-300/70">Top</div>
                  </div>
                </div>
              )}

              {/* Current Spectators */}
              <div className="bg-green-900/20 rounded-xl p-4 border border-green-500/30">
                <h3 className="text-sm font-semibold text-green-300 mb-3 flex items-center gap-2">
                  <FiUsers className="w-4 h-4" />
                  Watching the Game
                </h3>
                {data?.currentSpectators && data.currentSpectators.length > 0 ? (
                  <div className="space-y-3">
                    {data.currentSpectators.map((spectator, i) => (
                      <motion.div
                        key={spectator.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between bg-green-800/20 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-lg">
                            🏟️
                          </div>
                          <div>
                            <Link href={`/profile/${spectator.username}`} className="font-medium text-white hover:text-green-300">
                              {spectator.username}
                            </Link>
                            <div className="text-xs text-green-300/70">
                              {spectator.brand} {spectator.product ? `• ${spectator.product}` : ""}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-400">{"⭐".repeat(Math.round(spectator.rating))}</div>
                          <div className="text-xs text-green-400/60">{spectator.time}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-green-300/50">
                    <div className="text-4xl mb-2">📺</div>
                    <p className="text-sm">No fans in the den yet</p>
                    {isOpen && <p className="text-xs mt-1">Be the first to catch the game!</p>}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "mvps" && (
            <motion.div
              key="mvps"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              <p className="text-sm text-green-200 mb-4">
                🏆 All-time Sports Den MVPs
              </p>
              {data?.leaderboard && data.leaderboard.length > 0 ? (
                data.leaderboard.map((fan, i) => (
                  <motion.div
                    key={fan.username}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-green-900/30 rounded-xl p-4 border border-green-500/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          i === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white" :
                          i === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800" :
                          i === 2 ? "bg-gradient-to-br from-orange-400 to-amber-500 text-white" :
                          "bg-green-800 text-green-300"
                        }`}>
                          {i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                        </div>
                        <div>
                          <Link href={`/profile/${fan.username}`} className="font-medium text-white hover:text-green-300">
                            {fan.username}
                          </Link>
                          {fan.topBrand && (
                            <div className="text-xs text-green-300/70">
                              Favorite: {fan.topBrand}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-300">{fan.sportsSmokes}</div>
                        <div className="text-xs text-green-400/60">game smokes</div>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-green-300/50">
                      <span>⭐ {fan.avgRating?.toFixed(1) || '—'} avg</span>
                      <span>⏰ Peak: {formatHour(fan.favoriteHour)}</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-green-300/50">
                  <div className="text-5xl mb-3">🏈</div>
                  <p>No MVPs yet!</p>
                  <p className="text-xs mt-1">Be the first to claim the trophy</p>
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
            className="block w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-400 hover:to-teal-400 text-white font-bold py-4 px-6 rounded-xl text-center transition-all shadow-lg"
          >
            🏈 Log a Game Day Smoke!
          </Link>
        </motion.div>

        {/* Quick Links */}
        <div className="pt-4 flex flex-wrap justify-center gap-2 text-xs text-green-300/70">
          <Link href="/saturday-cartoons" className="hover:text-white">📺 Sat Cartoons</Link>
          <span>•</span>
          <Link href="/backyard-bbq" className="hover:text-white">🍖 BBQ</Link>
          <span>•</span>
          <Link href="/hammock" className="hover:text-white">🏖️ Hammock</Link>
          <span>•</span>
          <Link href="/weekend-scoreboard" className="hover:text-white">🏆 Scoreboard</Link>
        </div>
      </main>
    </div>
  );
}
