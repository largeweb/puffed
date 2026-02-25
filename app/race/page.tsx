"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FiHome, FiRefreshCw, FiClock, FiTrendingUp, FiAward, FiChevronUp, FiZap, FiFlag } from "react-icons/fi";

interface Racer {
  username: string;
  count: number;
  position: number;
  title: string;
  emoji: string;
  isMe: boolean;
  lastSmoke: number;
}

interface RaceData {
  leaderboard: Racer[];
  totalSmokesToday: number;
  hoursRemaining: number;
  myPosition: number | null;
  myCount: number;
  yesterdayWinner: { username: string; count: number } | null;
  raceEndsAt: number;
}

const POSITION_STYLES: Record<number, { bg: string; border: string; text: string; glow: string }> = {
  1: { bg: "bg-gradient-to-r from-yellow-500/20 to-amber-500/20", border: "border-yellow-500/50", text: "text-yellow-400", glow: "shadow-yellow-500/20" },
  2: { bg: "bg-gradient-to-r from-gray-400/20 to-slate-400/20", border: "border-gray-400/50", text: "text-gray-300", glow: "shadow-gray-400/20" },
  3: { bg: "bg-gradient-to-r from-orange-600/20 to-amber-600/20", border: "border-orange-500/50", text: "text-orange-400", glow: "shadow-orange-500/20" },
};

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function SmokeRacePage() {
  const [raceData, setRaceData] = useState<RaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRace = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/smoke-race");
      if (res.ok) {
        const data = await res.json() as RaceData;
        setRaceData(data);
      }
    } catch (e) {
      console.error("Failed to fetch race:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRace();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchRace(), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <FiFlag className="w-8 h-8 text-red-500" />
        </motion.div>
      </div>
    );
  }

  if (!raceData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-red-400">
        Failed to load race data
      </div>
    );
  }

  const { leaderboard, totalSmokesToday, hoursRemaining, myPosition, myCount, yesterdayWinner } = raceData;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur border-b border-red-500/20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 text-gray-400 hover:text-white">
            <FiHome className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl">🏁</span>
            <h1 className="font-bold text-lg">Smoke Race</h1>
          </div>
          <button
            onClick={() => fetchRace(true)}
            disabled={refreshing}
            className="p-2 -mr-2 text-gray-400 hover:text-white"
          >
            <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={{ repeat: refreshing ? Infinity : 0, duration: 1 }}>
              <FiRefreshCw className="w-5 h-5" />
            </motion.div>
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Race Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-600/20 via-orange-500/20 to-yellow-500/20 rounded-2xl p-5 border border-red-500/30"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-2xl"
              >
                🏎️
              </motion.span>
              <span className="text-red-400 font-semibold">TODAY&apos;S RACE</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <FiClock className="w-4 h-4" />
              <span>{hoursRemaining}h left</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/30 rounded-xl p-3 text-center">
              <div className="text-3xl font-bold text-white">{totalSmokesToday}</div>
              <div className="text-xs text-gray-400">smokes today</div>
            </div>
            <div className="bg-black/30 rounded-xl p-3 text-center">
              <div className="text-3xl font-bold text-white">{leaderboard.length}</div>
              <div className="text-xs text-gray-400">racers</div>
            </div>
          </div>
        </motion.div>

        {/* My Position (if racing) */}
        {myPosition && myCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-xl p-4 border border-blue-500/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-400 mb-1">Your Position</div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">#{myPosition}</span>
                  <span className="text-gray-400">with {myCount} smoke{myCount !== 1 ? "s" : ""}</span>
                </div>
              </div>
              {myPosition <= 3 ? (
                <span className="text-3xl">{myPosition === 1 ? "🏆" : myPosition === 2 ? "🥈" : "🥉"}</span>
              ) : (
                <Link
                  href="/checkin"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <FiChevronUp /> Move Up
                </Link>
              )}
            </div>
          </motion.div>
        )}

        {/* Leaderboard */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FiTrendingUp className="w-5 h-5 text-red-400" />
            <h2 className="font-semibold text-lg">Live Leaderboard</h2>
          </div>
          
          {leaderboard.length === 0 ? (
            <div className="bg-gray-900/50 rounded-xl p-8 text-center">
              <span className="text-4xl mb-3 block">🏁</span>
              <p className="text-gray-400 mb-4">No racers yet today!</p>
              <Link
                href="/checkin"
                className="inline-block px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-medium"
              >
                Be the first! Log a smoke
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {leaderboard.map((racer, idx) => {
                  const style = POSITION_STYLES[racer.position] || {
                    bg: "bg-gray-900/50",
                    border: "border-gray-700/30",
                    text: "text-gray-400",
                    glow: "",
                  };
                  
                  return (
                    <motion.div
                      key={racer.username}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`${style.bg} rounded-xl p-4 border ${style.border} ${racer.isMe ? "ring-2 ring-blue-500" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${style.bg} border ${style.border}`}>
                            {racer.position <= 3 ? (
                              <span className="text-xl">{racer.position === 1 ? "🥇" : racer.position === 2 ? "🥈" : "🥉"}</span>
                            ) : (
                              <span className={`font-bold ${style.text}`}>#{racer.position}</span>
                            )}
                          </div>
                          <div>
                            <Link href={`/user/${racer.username}`} className="font-medium hover:text-red-400">
                              {racer.username}
                              {racer.isMe && <span className="ml-2 text-xs bg-blue-600/50 px-2 py-0.5 rounded">you</span>}
                            </Link>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <span>{racer.emoji}</span>
                              <span>{racer.title}</span>
                              <span>•</span>
                              <span>last smoke {formatTimeAgo(racer.lastSmoke)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${style.text}`}>{racer.count}</div>
                          <div className="text-xs text-gray-500">smoke{racer.count !== 1 ? "s" : ""}</div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Yesterday's Winner */}
        {yesterdayWinner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-xl p-4 border border-purple-500/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <FiAward className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-400">Yesterday&apos;s Champion</span>
            </div>
            <div className="flex items-center justify-between">
              <Link href={`/user/${yesterdayWinner.username}`} className="font-medium hover:text-purple-400">
                👑 {yesterdayWinner.username}
              </Link>
              <span className="text-gray-400">{yesterdayWinner.count} smokes</span>
            </div>
          </motion.div>
        )}

        {/* Call to Action */}
        {!myCount && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <Link
              href="/checkin"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-xl font-semibold shadow-lg shadow-red-500/20"
            >
              <FiZap className="w-5 h-5" />
              Join Today&apos;s Race
            </Link>
            <p className="text-sm text-gray-500 mt-2">Log a smoke to start racing!</p>
          </motion.div>
        )}

        {/* Race Rules */}
        <div className="bg-gray-900/30 rounded-xl p-4 border border-gray-800">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <FiFlag className="w-4 h-4 text-red-400" />
            Race Rules
          </h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Log check-ins to climb the leaderboard</li>
            <li>• Race resets at midnight EST</li>
            <li>• Top 3 get podium finishes</li>
            <li>• Have fun and smoke responsibly! 🚬</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
