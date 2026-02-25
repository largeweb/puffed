"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FiHome, FiSun, FiClock, FiAward, FiRefreshCw } from "react-icons/fi";

interface WinnerData {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  time: string;
  timeAgo: string;
  checkinId: string;
  imageUrl?: string;
}

interface EarlyBird {
  username: string;
  brand: string;
  time: string;
  rank: number;
}

interface FirstSmokeData {
  claimed: boolean;
  winner?: WinnerData;
  recentEarlyBirds: EarlyBird[];
  yourRank?: number;
  yourTime?: string;
  totalSmokesToday: number;
  dayOfWeek: string;
  funFact?: string;
  error?: string;
}

const RANK_MEDALS: Record<number, { emoji: string; color: string }> = {
  1: { emoji: "🥇", color: "text-yellow-400" },
  2: { emoji: "🥈", color: "text-gray-300" },
  3: { emoji: "🥉", color: "text-amber-600" },
  4: { emoji: "4️⃣", color: "text-gray-400" },
  5: { emoji: "5️⃣", color: "text-gray-400" },
};

export default function FirstSmokePage() {
  const [data, setData] = useState<FirstSmokeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/first-smoke-today");
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch first smoke data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black p-4 pb-20">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <Link href="/dashboard" className="glass p-2 rounded-xl hover:bg-white/10 transition-colors">
          <FiHome className="text-xl" />
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          🌅 First Smoke
        </h1>
        <button 
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="glass p-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          <FiRefreshCw className={`text-xl ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">Checking today&apos;s early birds...</p>
        </div>
      ) : data?.error ? (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-gray-400">{data.error}</p>
        </div>
      ) : !data?.claimed ? (
        // No one has claimed first smoke yet!
        <div className="space-y-6 max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-8 text-center bg-gradient-to-br from-orange-900/30 to-amber-900/30 border border-orange-500/50"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              className="text-7xl mb-4"
            >
              🏁
            </motion.div>
            <h2 className="text-2xl font-bold text-orange-400 mb-2">
              Unclaimed!
            </h2>
            <p className="text-gray-300 mb-4">
              Be the first to log a smoke today and claim the 🥇 spot!
            </p>
            <p className="text-sm text-gray-500">
              Happy {data?.dayOfWeek}!
            </p>
            
            <Link
              href="/checkin"
              className="inline-block mt-6 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/30"
            >
              🚬 Claim First Smoke!
            </Link>
          </motion.div>

          {data?.funFact && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-xl p-4 text-center"
            >
              <p className="text-sm text-gray-400">💡 {data.funFact}</p>
            </motion.div>
          )}
        </div>
      ) : (
        // Someone claimed first smoke!
        <div className="space-y-6 max-w-md mx-auto">
          {/* Winner Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl overflow-hidden bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-500/50"
          >
            {data.winner?.imageUrl && (
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={data.winner.imageUrl} 
                  alt="First smoke" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <span className="text-3xl">🥇</span>
                  <span className="text-lg font-bold text-yellow-400">FIRST SMOKE</span>
                </div>
              </div>
            )}
            
            <div className="p-6">
              {!data.winner?.imageUrl && (
                <div className="text-center mb-4">
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-6xl inline-block"
                  >
                    🥇
                  </motion.span>
                </div>
              )}
              
              <div className="text-center">
                <h2 className="text-xl font-bold text-yellow-400">
                  Today&apos;s Champion
                </h2>
                <Link 
                  href={`/user/${data.winner?.username}`}
                  className="text-2xl font-bold hover:text-orange-400 transition-colors"
                >
                  @{data.winner?.username}
                </Link>
                
                <div className="mt-4 space-y-2">
                  <div className="glass rounded-lg p-3 inline-block">
                    <p className="text-gray-400 text-sm">Smoking</p>
                    <p className="font-semibold">{data.winner?.brand}</p>
                    {data.winner?.product && (
                      <p className="text-sm text-gray-400">{data.winner.product}</p>
                    )}
                  </div>
                  
                  {data.winner?.rating && (
                    <div className="flex items-center justify-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span 
                          key={i}
                          className={i < data.winner!.rating! ? "text-yellow-400" : "text-gray-600"}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <FiClock /> {data.winner?.time}
                  </span>
                  <span>•</span>
                  <span>{data.winner?.timeAgo}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Your Rank */}
          {data.yourRank && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-xl p-4 text-center bg-gradient-to-r from-amber-900/20 to-orange-900/20"
            >
              <p className="text-gray-400 text-sm">Your rank today</p>
              <div className="flex items-center justify-center gap-3 mt-1">
                <span className="text-3xl">
                  {RANK_MEDALS[data.yourRank]?.emoji || `#${data.yourRank}`}
                </span>
                <div>
                  <p className={`text-xl font-bold ${RANK_MEDALS[data.yourRank]?.color || "text-gray-300"}`}>
                    #{data.yourRank}
                  </p>
                  <p className="text-sm text-gray-500">at {data.yourTime}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Early Birds Leaderboard */}
          {data.recentEarlyBirds.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-2xl p-6"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FiSun className="text-orange-400" /> Early Birds
              </h3>
              <div className="space-y-3">
                {data.recentEarlyBirds.map((bird, index) => (
                  <motion.div
                    key={bird.username}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-center gap-3"
                  >
                    <span className="text-2xl w-10 text-center">
                      {RANK_MEDALS[bird.rank]?.emoji || `#${bird.rank}`}
                    </span>
                    <div className="flex-1">
                      <Link 
                        href={`/user/${bird.username}`}
                        className="font-medium hover:text-orange-400 transition-colors"
                      >
                        @{bird.username}
                      </Link>
                      <p className="text-sm text-gray-500">{bird.brand}</p>
                    </div>
                    <span className="text-sm text-gray-400 flex items-center gap-1">
                      <FiClock className="text-xs" />
                      {bird.time}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 gap-3"
          >
            <div className="glass rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">{data.totalSmokesToday}</div>
              <div className="text-xs text-gray-400">Smokes Today</div>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <div className="text-lg font-bold text-amber-400">{data.dayOfWeek}</div>
              <div className="text-xs text-gray-400">Day of Week</div>
            </div>
          </motion.div>

          {/* Fun Fact */}
          {data.funFact && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="glass rounded-xl p-4 text-center"
            >
              <p className="text-sm text-gray-400">💡 {data.funFact}</p>
            </motion.div>
          )}

          {/* CTA */}
          {!data.yourRank && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <Link
                href="/checkin"
                className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                🚬 Log Your Smoke
              </Link>
              <p className="text-xs text-gray-500 mt-2">
                Get on the early bird leaderboard!
              </p>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
