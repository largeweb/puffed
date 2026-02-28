"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiHome,
  FiRefreshCw,
  FiSun,
  FiClock,
  FiAward,
  FiUsers,
  FiStar,
  FiWind,
} from "react-icons/fi";

interface ChillQuote {
  text: string;
  mood: string;
}

interface Occupant {
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
  hammockSmokes: number;
  avgRating: number;
  favoriteBrand: string | null;
}

interface HammockData {
  isWeekend: boolean;
  isHammockTime: boolean;
  currentHour: number;
  countdownMessage: string;
  weekendProgress: number;
  chillFactor: number;
  chillQuote: ChillQuote;
  currentActivity: string;
  currentOccupants: Occupant[];
  stats: {
    totalSmokes: number;
    uniqueChillers: number;
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

function getChillLevel(factor: number): { label: string; emoji: string; color: string } {
  if (factor >= 80) return { label: "Maximum Chill", emoji: "🧘", color: "from-emerald-400 to-teal-400" };
  if (factor >= 60) return { label: "Very Relaxed", emoji: "😌", color: "from-cyan-400 to-emerald-400" };
  if (factor >= 40) return { label: "Chillin'", emoji: "🏖️", color: "from-amber-400 to-cyan-400" };
  if (factor >= 20) return { label: "Warming Up", emoji: "☀️", color: "from-orange-400 to-amber-400" };
  return { label: "Just Getting Started", emoji: "🌅", color: "from-rose-400 to-orange-400" };
}

export default function HammockPage() {
  const router = useRouter();
  const [data, setData] = useState<HammockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"occupants" | "leaderboard">("occupants");
  const [swayOffset, setSwayOffset] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/hammock");
      if (res.ok) {
        const json = (await res.json()) as HammockData;
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch hammock data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Gentle swaying animation for hammock effect
  useEffect(() => {
    const interval = setInterval(() => {
      setSwayOffset(Math.sin(Date.now() / 2000) * 3);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 flex items-center justify-center">
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [-5, 5, -5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-6xl"
        >
          🏖️
        </motion.div>
      </div>
    );
  }

  const isOpen = data?.isHammockTime ?? false;
  const chillLevel = getChillLevel(data?.chillFactor || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 text-white pb-20 overflow-hidden">
      {/* Animated palm fronds overlay */}
      <div className="fixed top-0 left-0 right-0 h-32 pointer-events-none">
        <motion.div
          animate={{ x: swayOffset }}
          className="absolute -top-4 -left-8 text-8xl opacity-30"
        >
          🌴
        </motion.div>
        <motion.div
          animate={{ x: -swayOffset }}
          className="absolute -top-4 -right-8 text-8xl opacity-30 transform scale-x-[-1]"
        >
          🌴
        </motion.div>
      </div>

      {/* Floating elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl opacity-20"
            initial={{ y: -20, x: `${20 + i * 20}%` }}
            animate={{ y: ["-20px", "110vh"], rotate: [0, 360] }}
            transition={{
              duration: 15 + i * 3,
              repeat: Infinity,
              delay: i * 2,
              ease: "linear",
            }}
          >
            {["🍃", "☀️", "🌺", "🐚", "🌸"][i]}
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-teal-600/90 via-emerald-600/90 to-cyan-600/90 backdrop-blur-sm border-b-4 border-teal-300">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/20 rounded-full">
            <FiHome className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ y: [0, -3, 0], rotate: [-3, 3, -3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="text-2xl"
            >
              🏖️
            </motion.span>
            <span className="font-bold text-white drop-shadow-lg">The Hammock</span>
          </div>
          <button onClick={fetchData} className="p-2 hover:bg-white/20 rounded-full">
            <FiRefreshCw className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 relative">
        {/* Main Hammock Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ transform: `rotate(${swayOffset * 0.3}deg)` }}
          className={`rounded-2xl p-6 text-center border-4 ${
            isOpen
              ? "bg-gradient-to-r from-amber-400/30 via-teal-400/30 to-cyan-400/30 border-amber-300/50"
              : "bg-teal-800/50 border-teal-600/50"
          }`}
        >
          {/* Hammock illustration */}
          <div className="relative inline-block mb-4">
            <div className={`w-40 h-20 rounded-full border-b-4 ${
              isOpen ? "border-amber-400" : "border-teal-600"
            }`} style={{ 
              borderBottomLeftRadius: "50%",
              borderBottomRightRadius: "50%",
              background: isOpen 
                ? "linear-gradient(180deg, transparent 0%, rgba(251, 191, 36, 0.3) 100%)"
                : "linear-gradient(180deg, transparent 0%, rgba(20, 184, 166, 0.2) 100%)"
            }}>
              <motion.span 
                className="absolute top-2 left-1/2 -translate-x-1/2 text-4xl"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {isOpen ? "😌" : "😴"}
              </motion.span>
            </div>
            {/* Ropes */}
            <div className="absolute -top-4 left-2 w-1 h-6 bg-amber-600/50 transform -rotate-45" />
            <div className="absolute -top-4 right-2 w-1 h-6 bg-amber-600/50 transform rotate-45" />
          </div>

          {isOpen ? (
            <>
              <h1 className="text-2xl font-bold text-white drop-shadow-lg mb-2">
                The Hammock is Open
              </h1>
              <p className="text-amber-100/80 text-sm mb-3">{data?.currentActivity}</p>
              <p className="text-white/70 text-sm italic">"{data?.chillQuote?.text}"</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-teal-100 mb-2">
                {data?.isWeekend ? "⏰ Not Quite Time Yet" : "Weekend Vibes Only"}
              </h1>
              <p className="text-teal-200/70 text-sm">{data?.countdownMessage}</p>
              <p className="text-teal-300/50 text-xs mt-2">
                Sat & Sun • 12 PM - 5 PM
              </p>
            </>
          )}
        </motion.div>

        {/* Chill Factor Meter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <FiWind className="w-4 h-4" />
              Chill Factor
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-lg">{chillLevel.emoji}</span>
              <span className="text-sm font-medium text-teal-200">{chillLevel.label}</span>
            </div>
          </div>
          <div className="h-4 bg-teal-900/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${data?.chillFactor || 0}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full bg-gradient-to-r ${chillLevel.color}`}
            />
          </div>
          <p className="text-xs text-teal-200/50 mt-2 text-center">
            Platform relaxation level: {data?.chillFactor || 0}%
          </p>
        </motion.div>

        {/* Weekend Progress */}
        {data?.isWeekend && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-400/30"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-purple-200">Weekend Progress</span>
              <span className="text-sm font-bold text-white">{data.weekendProgress}%</span>
            </div>
            <div className="h-2 bg-purple-900/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.weekendProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-purple-300/50">
              <span>Sat 12am</span>
              <span>Sun 11pm</span>
            </div>
          </motion.div>
        )}

        {/* My Stats */}
        {data?.myStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl p-4 border border-amber-400/30"
          >
            <h2 className="text-sm font-semibold text-amber-200 mb-3 flex items-center gap-2">
              <FiStar className="w-4 h-4" />
              Your Hammock Stats
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{data.myStats.totalSmokes}</div>
                <div className="text-xs text-amber-300/70">Hammock Smokes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">⭐ {data.myStats.avgRating?.toFixed(1) || '—'}</div>
                <div className="text-xs text-amber-300/70">Avg Chill</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white truncate">{data.myStats.favoriteBrand || '—'}</div>
                <div className="text-xs text-amber-300/70">Go-To Brand</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Platform Stats */}
        {data?.stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="grid grid-cols-4 gap-2"
          >
            <div className="bg-white/10 rounded-lg p-3 border border-white/10 text-center">
              <div className="text-lg font-bold text-white">{data.stats.totalSmokes}</div>
              <div className="text-[10px] text-teal-200/70">All-Time</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 border border-white/10 text-center">
              <div className="text-lg font-bold text-white">{data.stats.uniqueChillers}</div>
              <div className="text-[10px] text-teal-200/70">Chillers</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 border border-white/10 text-center">
              <div className="text-lg font-bold text-white">⭐ {data.stats.avgRating?.toFixed(1) || '—'}</div>
              <div className="text-[10px] text-teal-200/70">Avg Rating</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 border border-white/10 text-center">
              <div className="text-sm font-bold text-white truncate">{data.stats.topBrand?.slice(0, 8) || '—'}</div>
              <div className="text-[10px] text-teal-200/70">Top Brand</div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: "occupants", label: "🧘 Occupants", icon: FiUsers },
            { id: "leaderboard", label: "🏆 Chill Kings", icon: FiAward },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-lg"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "occupants" && (
            <motion.div
              key="occupants"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white/5 rounded-xl p-4 border border-white/10"
            >
              <h3 className="text-sm font-semibold text-teal-200 mb-3 flex items-center gap-2">
                <FiSun className="w-4 h-4" />
                Currently in the Hammock
              </h3>
              {data?.currentOccupants && data.currentOccupants.length > 0 ? (
                <div className="space-y-3">
                  {data.currentOccupants.map((occupant, i) => (
                    <motion.div
                      key={occupant.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between bg-teal-700/20 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <motion.div 
                          animate={{ y: [0, -2, 0] }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                          className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full flex items-center justify-center text-lg"
                        >
                          🧘
                        </motion.div>
                        <div>
                          <Link href={`/profile/${occupant.username}`} className="font-medium text-white hover:text-amber-300">
                            {occupant.username}
                          </Link>
                          <div className="text-xs text-teal-300/70">
                            {occupant.brand} {occupant.product ? `• ${occupant.product}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-amber-400">{"⭐".repeat(Math.round(occupant.rating))}</div>
                        <div className="text-xs text-teal-400">chillin'</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-teal-200/50">
                  <motion.div 
                    animate={{ y: [0, -5, 0], rotate: [-5, 5, -5] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="text-5xl mb-3"
                  >
                    🏖️
                  </motion.div>
                  <p>The hammock is empty</p>
                  <p className="text-xs mt-1">
                    {isOpen ? "Claim your spot and relax!" : "Check back during hammock hours"}
                  </p>
                </div>
              )}
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
              <p className="text-sm text-teal-200 mb-4">
                👑 Weekend afternoon chill champions
              </p>
              {data?.leaderboard && data.leaderboard.length > 0 ? (
                data.leaderboard.map((chiller, i) => (
                  <motion.div
                    key={chiller.username}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white/10 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" :
                          i === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800" :
                          i === 2 ? "bg-gradient-to-br from-orange-300 to-amber-500 text-white" :
                          "bg-teal-700 text-teal-300"
                        }`}>
                          {i === 0 ? "🧘" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                        </div>
                        <div>
                          <Link href={`/profile/${chiller.username}`} className="font-medium text-white hover:text-amber-300">
                            {chiller.username}
                          </Link>
                          {chiller.favoriteBrand && (
                            <div className="text-xs text-teal-300/70">
                              Favorite: {chiller.favoriteBrand}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-amber-300">{chiller.hammockSmokes}</div>
                        <div className="text-xs text-teal-400">hammock smokes</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-teal-300/50">
                      ⭐ {chiller.avgRating?.toFixed(1) || '—'} avg rating
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-teal-200/50">
                  <div className="text-5xl mb-3">🌴</div>
                  <p>No chill kings yet!</p>
                  <p className="text-xs mt-1">Be the first to master the hammock</p>
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
            className="block w-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 hover:from-amber-300 hover:to-rose-300 text-white font-bold py-4 px-6 rounded-xl text-center transition-all shadow-lg"
          >
            🧘 Log a Chill Smoke
          </Link>
        </motion.div>

        {/* Quick Links */}
        <div className="pt-4 flex flex-wrap justify-center gap-2 text-xs text-teal-200/70">
          <Link href="/saturday-cartoons" className="hover:text-white">📺 Saturday Cartoons</Link>
          <span>•</span>
          <Link href="/coffee" className="hover:text-white">☕ Coffee Lounge</Link>
          <span>•</span>
          <Link href="/weekend-scoreboard" className="hover:text-white">🏆 Scoreboard</Link>
          <span>•</span>
          <Link href="/backyard-bbq" className="hover:text-white">🍖 BBQ</Link>
        </div>
      </main>
    </div>
  );
}
