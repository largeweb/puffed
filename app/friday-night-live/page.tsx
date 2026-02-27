"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  FiHome, FiRefreshCw, FiStar, FiUsers, FiTrendingUp,
  FiHeart, FiMessageCircle, FiZap, FiRadio
} from "react-icons/fi";

interface FridayNightSmoker {
  id: number;
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  image_url?: string;
  created_at: number;
  likes: number;
  comments: number;
}

interface FridayNightLegend {
  username: string;
  fridayNightCount: number;
  avgRating: number;
  favoriteBrand: string | null;
}

interface TonightStats {
  checkins: number;
  uniqueSmokers: number;
  avgRating: number | null;
  topBrand: string | null;
}

interface AllTimeStats {
  totalCheckins: number;
  uniqueSmokers: number;
  avgRating: number | null;
}

interface FridayNightData {
  isFridayNight: boolean;
  currentHour: number;
  dayOfWeek: number;
  partyVibe: { emoji: string; message: string };
  activeSmokers: FridayNightSmoker[];
  legends: FridayNightLegend[];
  tonightStats: TonightStats;
  allTimeStats: AllTimeStats;
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function FridayNightLivePage() {
  const [data, setData] = useState<FridayNightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"live" | "legends">("live");
  const [pulseColor, setPulseColor] = useState(true);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/friday-night-live");
      const result = await res.json() as FridayNightData;
      setData(result);
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds for live feel
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Pulsing live indicator animation
  useEffect(() => {
    const pulse = setInterval(() => setPulseColor(p => !p), 1000);
    return () => clearInterval(pulse);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-950 via-black to-purple-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-950 via-black to-purple-950">
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-rose-500/20 rounded-full"
            initial={{ 
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
              y: typeof window !== 'undefined' ? window.innerHeight + 20 : 800
            }}
            animate={{ 
              y: -20,
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-black/40 border-b border-rose-500/20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <FiHome className="text-white" size={20} />
          </Link>
          
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: pulseColor ? 1 : 1.2, opacity: pulseColor ? 1 : 0.7 }}
              className="w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-500/50"
            />
            <h1 className="text-lg font-bold text-white">Friday Night Live</h1>
            <FiRadio className="text-rose-400" />
          </div>

          <button 
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <FiRefreshCw className={`text-white ${refreshing ? "animate-spin" : ""}`} size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 relative z-10">
        {/* Party Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-6 mb-6 text-center ${
            data?.isFridayNight 
              ? "bg-gradient-to-r from-rose-600 to-purple-600" 
              : "bg-gradient-to-r from-gray-700 to-gray-800"
          }`}
        >
          <motion.span 
            className="text-5xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {data?.partyVibe.emoji || "🎉"}
          </motion.span>
          <h2 className="text-xl font-bold text-white mt-3">
            {data?.isFridayNight ? "🔴 LIVE NOW" : "📺 Last Friday Night"}
          </h2>
          <p className="text-white/80 mt-1">{data?.partyVibe.message}</p>
          
          {!data?.isFridayNight && (
            <p className="text-white/60 text-sm mt-2">
              Come back Friday 6 PM - 2 AM for live action!
            </p>
          )}
        </motion.div>

        {/* Tonight's Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-xl p-4 text-center"
          >
            <FiZap className="text-rose-400 mx-auto mb-1" size={20} />
            <p className="text-2xl font-bold text-white">{data?.tonightStats.checkins || 0}</p>
            <p className="text-xs text-gray-400">Tonight</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-xl p-4 text-center"
          >
            <FiUsers className="text-purple-400 mx-auto mb-1" size={20} />
            <p className="text-2xl font-bold text-white">{data?.tonightStats.uniqueSmokers || 0}</p>
            <p className="text-xs text-gray-400">Smokers</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-xl p-4 text-center"
          >
            <FiStar className="text-amber-400 mx-auto mb-1" size={20} />
            <p className="text-2xl font-bold text-white">
              {data?.tonightStats.avgRating || "-"}
            </p>
            <p className="text-xs text-gray-400">Avg Rating</p>
          </motion.div>
        </div>

        {/* Top Brand Tonight */}
        {data?.tonightStats.topBrand && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4 mb-6 flex items-center justify-between"
          >
            <div>
              <p className="text-xs text-gray-400">🔥 Tonight's Hot Brand</p>
              <p className="text-lg font-bold text-white">{data.tonightStats.topBrand}</p>
            </div>
            <span className="text-2xl">🚬</span>
          </motion.div>
        )}

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("live")}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              activeTab === "live"
                ? "bg-rose-600 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            🔴 Live Feed
          </button>
          <button
            onClick={() => setActiveTab("legends")}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              activeTab === "legends"
                ? "bg-purple-600 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            🏆 Legends
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "live" ? (
            <motion.div
              key="live"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {data?.activeSmokers.length === 0 ? (
                <div className="glass rounded-xl p-8 text-center">
                  <span className="text-4xl">🌙</span>
                  <p className="text-gray-400 mt-3">No check-ins yet tonight</p>
                  <p className="text-gray-500 text-sm mt-1">Be the first to start the party!</p>
                  <Link
                    href="/dashboard"
                    className="inline-block mt-4 px-6 py-2 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-500 transition-colors"
                  >
                    Log a Smoke 🚬
                  </Link>
                </div>
              ) : (
                data?.activeSmokers.map((smoker, index) => (
                  <motion.div
                    key={smoker.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass rounded-xl overflow-hidden"
                  >
                    {smoker.image_url && (
                      <img 
                        src={smoker.image_url} 
                        alt={smoker.brand}
                        className="w-full h-32 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link 
                            href={`/user/${smoker.username}`}
                            className="text-rose-400 font-semibold hover:underline"
                          >
                            @{smoker.username}
                          </Link>
                          <p className="text-white font-medium">{smoker.brand}</p>
                          {smoker.product && (
                            <p className="text-gray-400 text-sm">{smoker.product}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          {smoker.rating && (
                            <span className="flex items-center gap-1 text-amber-400">
                              <FiStar fill="currentColor" size={14} />
                              {smoker.rating}
                            </span>
                          )}
                          <span className="text-gray-500">
                            {getTimeAgo(smoker.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <FiHeart size={14} /> {smoker.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiMessageCircle size={14} /> {smoker.comments}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="legends"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {/* All-time Stats */}
              <div className="glass rounded-xl p-4 mb-4">
                <h3 className="text-sm text-gray-400 mb-2">📊 All-Time Friday Nights</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xl font-bold text-white">{data?.allTimeStats.totalCheckins || 0}</p>
                    <p className="text-xs text-gray-500">Check-ins</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">{data?.allTimeStats.uniqueSmokers || 0}</p>
                    <p className="text-xs text-gray-500">Smokers</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">{data?.allTimeStats.avgRating || "-"}</p>
                    <p className="text-xs text-gray-500">Avg Rating</p>
                  </div>
                </div>
              </div>

              {/* Legends Leaderboard */}
              {data?.legends.length === 0 ? (
                <div className="glass rounded-xl p-8 text-center">
                  <span className="text-4xl">🏆</span>
                  <p className="text-gray-400 mt-3">No legends yet!</p>
                  <p className="text-gray-500 text-sm">Start smoking on Friday nights to become one</p>
                </div>
              ) : (
                data?.legends.map((legend, index) => (
                  <motion.div
                    key={legend.username}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass rounded-xl p-4 flex items-center gap-4"
                  >
                    <div className="text-2xl">
                      {index === 0 ? "👑" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🎖️"}
                    </div>
                    <div className="flex-1">
                      <Link 
                        href={`/user/${legend.username}`}
                        className="text-white font-semibold hover:text-rose-400 transition-colors"
                      >
                        @{legend.username}
                      </Link>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span>{legend.fridayNightCount} Friday nights</span>
                        {legend.avgRating && (
                          <span className="flex items-center gap-1">
                            <FiStar className="text-amber-400" size={12} fill="currentColor" />
                            {legend.avgRating}
                          </span>
                        )}
                      </div>
                      {legend.favoriteBrand && (
                        <p className="text-xs text-gray-500 mt-1">
                          Fave: {legend.favoriteBrand}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-rose-400">#{index + 1}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Action */}
        {data?.isFridayNight && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto"
          >
            <Link
              href="/dashboard"
              className="block w-full py-4 bg-gradient-to-r from-rose-600 to-purple-600 text-white text-center rounded-xl font-bold text-lg shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 transition-all"
            >
              🎉 Join the Party - Log a Smoke!
            </Link>
          </motion.div>
        )}
      </main>
    </div>
  );
}
