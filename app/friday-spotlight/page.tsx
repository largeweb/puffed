"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  FiHome, FiRefreshCw, FiAward, FiTrendingUp, 
  FiUsers, FiHeart, FiMessageCircle, FiCamera,
  FiStar, FiZap
} from "react-icons/fi";

interface SpotlightWinner {
  userId: string;
  username: string;
  value: number;
  detail?: string;
}

interface SpotlightAward {
  id: string;
  title: string;
  emoji: string;
  description: string;
  winner: SpotlightWinner | null;
  runnerUp?: SpotlightWinner | null;
}

interface WeekStats {
  totalCheckins: number;
  totalLikes: number;
  totalComments: number;
  activeUsers: number;
  newBrands: number;
}

interface SpotlightData {
  awards: SpotlightAward[];
  weekStats: WeekStats;
  userAwards: string[];
  isFriday: boolean;
  dayOfWeek: number;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function FridaySpotlightPage() {
  const [data, setData] = useState<SpotlightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAward, setSelectedAward] = useState<string | null>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/friday-spotlight");
      const result = await res.json() as SpotlightData;
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
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-950 via-yellow-950 to-orange-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <FiAward className="w-8 h-8 text-yellow-400" />
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-950 via-yellow-950 to-orange-950 flex items-center justify-center">
        <p className="text-gray-400">Failed to load spotlight</p>
      </div>
    );
  }

  const { awards, weekStats, userAwards, isFriday, dayOfWeek } = data;

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-950 via-yellow-950 to-orange-950">
      {/* Celebration particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-yellow-400/30"
            initial={{
              x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 400),
              y: -20,
            }}
            animate={{
              y: typeof window !== "undefined" ? window.innerHeight + 20 : 800,
              rotate: 360,
            }}
            transition={{
              duration: 3 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-amber-900/95 to-yellow-900/95 backdrop-blur-sm border-b border-yellow-500/20">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 text-yellow-300 hover:text-yellow-100 transition-colors">
            <FiHome className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-yellow-100 flex items-center gap-2">
            🏆 Friday Spotlight
          </h1>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 -mr-2 text-yellow-300 hover:text-yellow-100 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-6xl mb-4"
          >
            🏆
          </motion.div>
          <h2 className="text-2xl font-bold text-yellow-100 mb-2">
            {isFriday ? "This Week's Winners!" : "Weekly Spotlight"}
          </h2>
          <p className="text-yellow-300/80">
            {isFriday 
              ? "Celebrating our community stars ✨" 
              : `${DAY_NAMES[dayOfWeek]} • Winners announced Friday`}
          </p>
        </motion.div>

        {/* Week Stats Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-2xl p-4 border border-yellow-500/30"
        >
          <h3 className="text-sm font-medium text-yellow-200 mb-3 flex items-center gap-2">
            <FiTrendingUp className="w-4 h-4" />
            This Week's Activity
          </h3>
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-100">{weekStats.totalCheckins}</p>
              <p className="text-xs text-yellow-300/70">Smokes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-pink-300">{weekStats.totalLikes}</p>
              <p className="text-xs text-yellow-300/70">Likes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-300">{weekStats.activeUsers}</p>
              <p className="text-xs text-yellow-300/70">Active</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-300">{weekStats.newBrands}</p>
              <p className="text-xs text-yellow-300/70">Brands</p>
            </div>
          </div>
        </motion.div>

        {/* User Awards */}
        {userAwards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-4 border border-green-500/30"
          >
            <h3 className="text-sm font-medium text-green-200 mb-2 flex items-center gap-2">
              <FiZap className="w-4 h-4" />
              Your Awards This Week!
            </h3>
            <div className="flex flex-wrap gap-2">
              {userAwards.map(awardId => {
                const award = awards.find(a => a.id === awardId);
                return award ? (
                  <span key={awardId} className="px-3 py-1 bg-green-500/30 rounded-full text-green-200 text-sm">
                    {award.emoji} {award.title}
                  </span>
                ) : null;
              })}
            </div>
          </motion.div>
        )}

        {/* Awards Grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-yellow-200 flex items-center gap-2">
            <FiAward className="w-4 h-4" />
            Weekly Awards
          </h3>
          
          {awards.map((award, index) => (
            <motion.div
              key={award.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedAward(selectedAward === award.id ? null : award.id)}
              className={`bg-gray-900/50 rounded-xl p-4 border cursor-pointer transition-all ${
                userAwards.includes(award.id)
                  ? "border-green-500/50 bg-green-900/20"
                  : "border-yellow-500/20 hover:border-yellow-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{award.emoji}</span>
                  <div>
                    <h4 className="font-medium text-yellow-100">{award.title}</h4>
                    <p className="text-xs text-yellow-300/60">{award.description}</p>
                  </div>
                </div>
                
                {award.winner ? (
                  <div className="text-right">
                    <Link 
                      href={`/user/${award.winner.username}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-yellow-200 hover:text-yellow-100 transition-colors"
                    >
                      @{award.winner.username}
                    </Link>
                    <p className="text-xs text-yellow-300/70">{award.winner.detail}</p>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">No winner yet</span>
                )}
              </div>

              {/* Runner Up - Expandable */}
              <AnimatePresence>
                {selectedAward === award.id && award.runnerUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-yellow-500/10"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-yellow-300/60">🥈 Runner Up</span>
                      <div className="text-right">
                        <Link 
                          href={`/user/${award.runnerUp.username}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-yellow-300/80 hover:text-yellow-200 transition-colors"
                        >
                          @{award.runnerUp.username}
                        </Link>
                        <p className="text-xs text-yellow-300/50">{award.runnerUp.detail}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-6"
        >
          <p className="text-yellow-300/60 text-sm mb-4">
            Keep smoking to win next week! 🚬
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 font-medium rounded-xl hover:from-yellow-400 hover:to-amber-400 transition-all"
          >
            <FiZap className="w-4 h-4" />
            Log a Smoke
          </Link>
        </motion.div>

        {/* Footer Note */}
        <p className="text-center text-xs text-yellow-300/40 pb-8">
          Awards reset every Monday • Winners crowned Friday
        </p>
      </div>
    </main>
  );
}
