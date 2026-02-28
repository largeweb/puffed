"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  FiHome, FiRefreshCw, FiStar, FiZap, FiActivity, FiSun, FiMoon
} from "react-icons/fi";

interface RecentStar {
  id: number;
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  image_url?: string;
  created_at: number;
  category?: string;
  x: number;
  y: number;
  size: "small" | "medium" | "large";
  twinkle: number;
}

interface Constellation {
  username: string;
  checkins: number;
  lastActive: number;
  brightness: number;
}

interface ObservatoryData {
  currentTime: {
    hour: number;
    dayOfWeek: number;
    phase: string;
    message: string;
  };
  recentStars: RecentStar[];
  constellations: Constellation[];
  cosmicStats: {
    totalSmokesEver: number;
    smokesToday: number;
    activeNow: number;
    brightestStar: string | null;
    cosmicEnergy: number;
  };
  meteors: {
    count: number;
    message: string;
  };
  userStar?: {
    username: string;
    totalSmokes: number;
    constellation: string;
    stardust: number;
  };
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getPhaseIcon(phase: string) {
  switch (phase) {
    case "dawn": return "🌅";
    case "day": return "☀️";
    case "dusk": return "🌆";
    case "night": return "🌙";
    case "midnight": return "✨";
    case "late": return "🌌";
    default: return "🔭";
  }
}

function getPhaseGradient(phase: string): string {
  switch (phase) {
    case "dawn": return "from-orange-900 via-purple-900 to-indigo-900";
    case "day": return "from-blue-800 via-blue-900 to-indigo-900";
    case "dusk": return "from-orange-900 via-rose-900 to-purple-900";
    case "night": return "from-indigo-950 via-purple-950 to-black";
    case "midnight": return "from-black via-indigo-950 to-purple-950";
    case "late": return "from-black via-slate-950 to-indigo-950";
    default: return "from-indigo-950 via-purple-950 to-black";
  }
}

export default function ObservatoryPage() {
  const [data, setData] = useState<ObservatoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStar, setSelectedStar] = useState<RecentStar | null>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/observatory");
      if (res.ok) {
        const result = await res.json() as ObservatoryData;
        setData(result);
      }
    } catch (error) {
      console.error("Failed to observe:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds for real-time feel
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-indigo-950 to-purple-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-6xl"
        >
          🔭
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-indigo-950 flex items-center justify-center text-white">
        <p>Lost in space...</p>
      </div>
    );
  }

  const gradient = getPhaseGradient(data.currentTime.phase);

  return (
    <div className={`min-h-screen bg-gradient-to-b ${gradient} text-white relative overflow-hidden`}>
      {/* Animated star background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.2,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
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

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-black/30 border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-full transition">
            <FiHome className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getPhaseIcon(data.currentTime.phase)}</span>
            <h1 className="text-lg font-bold">The Observatory</h1>
            <span className="text-2xl">🔭</span>
          </div>
          <button
            onClick={() => fetchData(true)}
            className="p-2 hover:bg-white/10 rounded-full transition"
            disabled={refreshing}
          >
            <FiRefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 relative z-10">
        {/* Phase Message */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <p className="text-lg text-purple-200 italic">{data.currentTime.message}</p>
        </motion.div>

        {/* Cosmic Energy Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/10"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-300 flex items-center gap-2">
              <FiZap className="text-yellow-400" /> Cosmic Energy
            </span>
            <span className="text-yellow-400 font-bold">{data.cosmicStats.cosmicEnergy}%</span>
          </div>
          <div className="h-2 bg-black/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500"
              initial={{ width: 0 }}
              animate={{ width: `${data.cosmicStats.cosmicEnergy}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-purple-400 mt-2 text-center">{data.meteors.message}</p>
        </motion.div>

        {/* Star Map */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 mb-6 overflow-hidden"
          style={{ height: "300px" }}
        >
          <div className="absolute inset-0 p-2">
            <p className="text-xs text-purple-400 text-center mb-2">✨ Tap a star to reveal ✨</p>
            {data.recentStars.map((star, i) => (
              <motion.button
                key={star.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`absolute rounded-full ${
                  star.size === "large" ? "w-4 h-4 bg-yellow-300 shadow-lg shadow-yellow-300/50" :
                  star.size === "medium" ? "w-3 h-3 bg-blue-300 shadow-md shadow-blue-300/30" :
                  "w-2 h-2 bg-white/80"
                } hover:scale-150 transition-transform cursor-pointer`}
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  animationDelay: `${star.twinkle}s`,
                }}
                onClick={() => setSelectedStar(star)}
                whileHover={{ scale: 1.5 }}
                whileTap={{ scale: 0.9 }}
              />
            ))}
          </div>
          
          {/* Selected star details */}
          <AnimatePresence>
            {selectedStar && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4"
                onClick={() => setSelectedStar(null)}
              >
                <div className="flex items-center gap-3">
                  {selectedStar.image_url && (
                    <img
                      src={selectedStar.image_url}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">@{selectedStar.username}</p>
                    <p className="text-xs text-purple-300">{selectedStar.brand} {selectedStar.product && `• ${selectedStar.product}`}</p>
                    <p className="text-xs text-purple-400">{getTimeAgo(selectedStar.created_at)}</p>
                  </div>
                  {selectedStar.rating && (
                    <div className="text-right">
                      <span className="text-yellow-400">{"⭐".repeat(Math.floor(selectedStar.rating))}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Your Star */}
        {data.userStar && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-2xl p-5 mb-6 border border-purple-500/30"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">⭐</span>
              <div>
                <h3 className="font-bold text-purple-200">Your Star</h3>
                <p className="text-sm text-purple-400">@{data.userStar.username}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-black/20 rounded-xl p-3">
                <p className="text-xl font-bold text-white">{data.userStar.totalSmokes}</p>
                <p className="text-xs text-purple-400">Smokes</p>
              </div>
              <div className="bg-black/20 rounded-xl p-3">
                <p className="text-sm font-bold text-white">{data.userStar.constellation}</p>
                <p className="text-xs text-purple-400">Constellation</p>
              </div>
              <div className="bg-black/20 rounded-xl p-3">
                <p className="text-xl font-bold text-white">{data.userStar.stardust}</p>
                <p className="text-xs text-purple-400">Stardust</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Cosmic Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 mb-6 border border-white/10"
        >
          <h3 className="font-bold text-purple-200 mb-4 flex items-center gap-2">
            <FiActivity /> Platform Cosmos
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{data.cosmicStats.totalSmokesEver}</p>
              <p className="text-xs text-purple-400">Total Stars</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{data.cosmicStats.smokesToday}</p>
              <p className="text-xs text-purple-400">Today&apos;s Stars</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{data.cosmicStats.activeNow}</p>
              <p className="text-xs text-purple-400">Active Now</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-yellow-400">
                {data.cosmicStats.brightestStar || "—"}
              </p>
              <p className="text-xs text-purple-400">Brightest Star</p>
            </div>
          </div>
        </motion.div>

        {/* Constellations (Top Users) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 mb-6 border border-white/10"
        >
          <h3 className="font-bold text-purple-200 mb-4 flex items-center gap-2">
            <FiStar /> Constellations
          </h3>
          <div className="space-y-3">
            {data.constellations.slice(0, 5).map((c, i) => (
              <div key={c.username} className="flex items-center gap-3">
                <span className="text-lg">{["✨", "🌟", "💫", "⭐", "🔅"][i]}</span>
                <div className="flex-1">
                  <Link href={`/user/${c.username}`} className="text-sm font-medium text-white hover:text-purple-300 transition">
                    @{c.username}
                  </Link>
                  <div className="h-1.5 bg-black/30 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      style={{ width: `${c.brightness}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-purple-400">{c.checkins} ✨</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Meteor Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 backdrop-blur-sm rounded-2xl p-5 mb-20 border border-yellow-500/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-yellow-300 flex items-center gap-2">
                🌠 Meteor Activity
              </h3>
              <p className="text-sm text-yellow-200 mt-1">{data.meteors.count} check-ins this hour</p>
            </div>
            <motion.div
              animate={{ x: [0, 20, 0], opacity: [1, 0, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-3xl"
            >
              ☄️
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
