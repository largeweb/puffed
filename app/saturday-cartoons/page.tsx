"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiHome,
  FiRefreshCw,
  FiTv,
  FiClock,
  FiAward,
  FiUsers,
  FiStar,
  FiCoffee,
} from "react-icons/fi";

interface CartoonShow {
  hour: number;
  show: string;
  desc: string;
}

interface Viewer {
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
  saturdayMorningSmokes: number;
  avgRating: number;
  favoriteHour: number;
  topBrand: string | null;
}

interface CartoonData {
  isSaturday: boolean;
  isCartoonTime: boolean;
  currentHour: number;
  countdownMessage: string;
  currentShow: CartoonShow;
  cartoonLineup: CartoonShow[];
  currentViewers: Viewer[];
  leaderboard: LeaderboardEntry[];
  stats: {
    totalSmokes: number;
    uniqueViewers: number;
    avgRating: number;
  };
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

export default function SaturdayCartoonsPage() {
  const router = useRouter();
  const [data, setData] = useState<CartoonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"lineup" | "viewers" | "leaderboard">("lineup");
  const [tvStatic, setTvStatic] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/saturday-cartoons");
      if (res.ok) {
        setTvStatic(true);
        setTimeout(() => setTvStatic(false), 300);
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch cartoon data:", err);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-6xl"
        >
          📺
        </motion.div>
      </div>
    );
  }

  const isOpen = data?.isCartoonTime ?? false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 text-white pb-20">
      {/* Retro TV scan lines overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-10"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />
      
      {/* TV Static effect when refreshing */}
      <AnimatePresence>
        {tvStatic && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/20"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-yellow-500/90 via-orange-500/90 to-red-500/90 backdrop-blur-sm border-b-4 border-yellow-300">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/20 rounded-full">
            <FiHome className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-2xl"
            >
              📺
            </motion.span>
            <span className="font-bold text-white drop-shadow-lg" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
              Saturday Morning Cartoons
            </span>
          </div>
          <button onClick={fetchData} className="p-2 hover:bg-white/20 rounded-full">
            <FiRefreshCw className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 relative">
        {/* Current Show Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-2xl p-6 text-center border-4 ${
            isOpen
              ? "bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 border-yellow-200"
              : "bg-gray-800/80 border-gray-600"
          }`}
        >
          {/* TV Frame */}
          <div className="relative inline-block mb-4">
            <div className={`w-32 h-24 rounded-lg flex items-center justify-center text-4xl ${
              isOpen ? "bg-blue-900" : "bg-gray-900"
            }`} style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
              {isOpen ? (
                <motion.span
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {data?.currentShow.show.split(' ')[0] || '📺'}
                </motion.span>
              ) : (
                <span className="text-gray-600">📺</span>
              )}
            </div>
            {/* Antenna */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-2">
              <div className="w-1 h-6 bg-gray-400 rounded-full transform -rotate-12" />
              <div className="w-1 h-6 bg-gray-400 rounded-full transform rotate-12" />
            </div>
          </div>

          {isOpen ? (
            <>
              <h1 className="text-2xl font-bold text-white drop-shadow-lg mb-2" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                NOW PLAYING
              </h1>
              <div className="text-3xl font-bold text-white drop-shadow-lg mb-1">
                {data?.currentShow.show}
              </div>
              <p className="text-white/80">{data?.currentShow.desc}</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-300 mb-2">
                {data?.isSaturday ? "📺 Off Air" : "See You Saturday!"}
              </h1>
              <p className="text-gray-400 text-sm">{data?.countdownMessage}</p>
              <p className="text-gray-500 text-xs mt-2">
                Saturday 6 AM - 12 PM
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
            className="bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-xl p-4 border border-cyan-400/30"
          >
            <h2 className="text-sm font-semibold text-cyan-300 mb-3 flex items-center gap-2">
              <FiStar className="w-4 h-4" />
              Your Cartoon Stats
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{data.myStats.totalSmokes}</div>
                <div className="text-xs text-cyan-300/70">Sat AM Smokes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">⭐ {data.myStats.avgRating?.toFixed(1) || '—'}</div>
                <div className="text-xs text-cyan-300/70">Avg Rating</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white truncate">{data.myStats.favoriteBrand || '—'}</div>
                <div className="text-xs text-cyan-300/70">Favorite</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: "lineup", label: "📺 Lineup", icon: FiTv },
            { id: "viewers", label: "👀 Viewers", icon: FiUsers },
            { id: "leaderboard", label: "🏆 Leaders", icon: FiAward },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-lg"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
              style={{ fontFamily: activeTab === tab.id ? 'Comic Sans MS, cursive' : 'inherit' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "lineup" && (
            <motion.div
              key="lineup"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              <p className="text-sm text-purple-200 mb-4">
                📺 Saturday morning programming guide (6 AM - 12 PM)
              </p>
              {data?.cartoonLineup.map((show, i) => {
                const isCurrentShow = data.isCartoonTime && data.currentHour === show.hour;
                const isPast = data.isSaturday && data.currentHour > show.hour;
                
                return (
                  <motion.div
                    key={show.hour}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-xl p-4 border-2 ${
                      isCurrentShow
                        ? "bg-gradient-to-r from-yellow-400/30 to-orange-400/30 border-yellow-400 shadow-lg shadow-yellow-500/20"
                        : isPast
                          ? "bg-gray-800/30 border-gray-700/50 opacity-50"
                          : "bg-purple-800/30 border-purple-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                          isCurrentShow ? "bg-yellow-500/30" : "bg-purple-500/20"
                        }`}>
                          {show.show.split(' ')[0]}
                        </div>
                        <div>
                          <div className={`font-bold ${isCurrentShow ? "text-yellow-200" : "text-white"}`}>
                            {show.show.split(' ').slice(1).join(' ')}
                          </div>
                          <div className="text-sm text-purple-300/70">{show.desc}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono font-bold ${isCurrentShow ? "text-yellow-300" : "text-purple-300"}`}>
                          {formatHour(show.hour)}
                        </div>
                        {isCurrentShow && (
                          <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                            ON AIR
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {activeTab === "viewers" && (
            <motion.div
              key="viewers"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Platform Stats */}
              {data?.stats && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-purple-800/30 rounded-lg p-3 border border-purple-500/30 text-center">
                    <div className="text-xl font-bold text-white">{data.stats.totalSmokes}</div>
                    <div className="text-xs text-purple-300/70">Total Views</div>
                  </div>
                  <div className="bg-purple-800/30 rounded-lg p-3 border border-purple-500/30 text-center">
                    <div className="text-xl font-bold text-white">{data.stats.uniqueViewers}</div>
                    <div className="text-xs text-purple-300/70">Viewers</div>
                  </div>
                  <div className="bg-purple-800/30 rounded-lg p-3 border border-purple-500/30 text-center">
                    <div className="text-xl font-bold text-white">⭐ {data.stats.avgRating?.toFixed(1) || '—'}</div>
                    <div className="text-xs text-purple-300/70">Avg Rating</div>
                  </div>
                </div>
              )}

              {/* Current Viewers */}
              <div className="bg-purple-800/20 rounded-xl p-4 border border-purple-500/30">
                <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                  <FiCoffee className="w-4 h-4" />
                  Watching This Morning
                </h3>
                {data?.currentViewers && data.currentViewers.length > 0 ? (
                  <div className="space-y-3">
                    {data.currentViewers.map((viewer, i) => (
                      <motion.div
                        key={viewer.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between bg-purple-700/20 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-lg">
                            🥣
                          </div>
                          <div>
                            <Link href={`/profile/${viewer.username}`} className="font-medium text-white hover:text-yellow-300">
                              {viewer.username}
                            </Link>
                            <div className="text-xs text-purple-300/70">
                              {viewer.brand} {viewer.product ? `• ${viewer.product}` : ""}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-amber-400">{"⭐".repeat(Math.round(viewer.rating))}</div>
                          <div className="text-xs text-purple-400">{viewer.time}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-purple-300/50">
                    <div className="text-4xl mb-2">🥣</div>
                    <p className="text-sm">No one watching yet today</p>
                    {isOpen && <p className="text-xs mt-1">Grab your cereal and log a smoke!</p>}
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
              <p className="text-sm text-purple-200 mb-4">
                🏆 All-time Saturday morning champions
              </p>
              {data?.leaderboard && data.leaderboard.length > 0 ? (
                data.leaderboard.map((viewer, i) => (
                  <motion.div
                    key={viewer.username}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-purple-800/30 rounded-xl p-4 border border-purple-500/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          i === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white" :
                          i === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800" :
                          i === 2 ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white" :
                          "bg-purple-700 text-purple-300"
                        }`}>
                          {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                        </div>
                        <div>
                          <Link href={`/profile/${viewer.username}`} className="font-medium text-white hover:text-yellow-300">
                            {viewer.username}
                          </Link>
                          {viewer.topBrand && (
                            <div className="text-xs text-purple-300/70">
                              Favorite: {viewer.topBrand}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-yellow-300">{viewer.saturdayMorningSmokes}</div>
                        <div className="text-xs text-purple-400">Sat AM smokes</div>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-purple-300/50">
                      <span>⭐ {viewer.avgRating?.toFixed(1) || '—'} avg</span>
                      <span>⏰ Peak: {formatHour(viewer.favoriteHour)}</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-purple-300/50">
                  <div className="text-5xl mb-3">📺</div>
                  <p>No Saturday morning viewers yet!</p>
                  <p className="text-xs mt-1">Be the first to tune in</p>
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
            className="block w-full bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 hover:from-yellow-300 hover:to-pink-300 text-white font-bold py-4 px-6 rounded-xl text-center transition-all shadow-lg"
            style={{ fontFamily: 'Comic Sans MS, cursive' }}
          >
            🥣 Log a Saturday Morning Smoke!
          </Link>
        </motion.div>

        {/* Quick Links */}
        <div className="pt-4 flex flex-wrap justify-center gap-2 text-xs text-purple-300/70">
          <Link href="/coffee" className="hover:text-white">☕ Coffee Lounge</Link>
          <span>•</span>
          <Link href="/graveyard-shift" className="hover:text-white">☠️ Graveyard Shift</Link>
          <span>•</span>
          <Link href="/weekend" className="hover:text-white">🌴 Weekend</Link>
          <span>•</span>
          <Link href="/morning-brief" className="hover:text-white">📰 Morning Brief</Link>
        </div>
      </main>
    </div>
  );
}
