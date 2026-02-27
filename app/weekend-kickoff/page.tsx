"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  FiHome, FiRefreshCw, FiClock, FiTrendingUp, 
  FiUsers, FiHeart, FiStar, FiZap, FiAward,
  FiSunrise, FiSunset, FiMoon
} from "react-icons/fi";

interface CheckinData {
  id: string;
  brand: string;
  product?: string;
  rating: number;
  username: string;
  avatar_url?: string;
  created_at: number;
  review?: string;
}

interface LeaderData {
  id: string;
  username: string;
  avatar_url?: string;
  weekend_count: number;
  avg_rating: number;
}

interface PersonalStats {
  totalWeekendSmokes: number;
  avgRating: number;
  thisWeekendCount: number;
}

interface Suggestion {
  brand: string;
  product?: string;
  avgRating: number;
  reason: string;
}

interface WeekendData {
  countdown: string;
  isWeekend: boolean;
  weekendCheckins: CheckinData[];
  weekendLeaders: LeaderData[];
  platformStats: {
    totalWeekendSmokes: number;
    weekendSmokers: number;
    avgWeekendRating: number;
    topBrand: string | null;
  };
  personalStats: PersonalStats | null;
  suggestion: Suggestion | null;
  quote: string;
}

const MEDAL_COLORS = ["text-yellow-400", "text-gray-300", "text-amber-600"];
const MEDAL_EMOJIS = ["🥇", "🥈", "🥉"];

export default function WeekendKickoffPage() {
  const [data, setData] = useState<WeekendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const token = localStorage.getItem("puffed_token");
      const res = await fetch("/api/weekend-kickoff", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const result = await res.json() as WeekendData;
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <FiClock className="w-8 h-8 text-purple-400" />
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 flex flex-col items-center justify-center p-4">
        <p className="text-gray-400">Failed to load weekend data</p>
        <button onClick={() => fetchData(true)} className="mt-4 text-purple-400 hover:text-purple-300">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-purple-800/30">
        <Link href="/dashboard" className="p-2 hover:bg-purple-800/30 rounded-lg transition-colors">
          <FiHome className="w-5 h-5 text-purple-400" />
        </Link>
        <h1 className="text-lg font-bold text-purple-200">Weekend Kickoff</h1>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="p-2 hover:bg-purple-800/30 rounded-lg transition-colors"
        >
          <FiRefreshCw className={`w-5 h-5 text-purple-400 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-6 pb-20">
        {/* Countdown Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-orange-600/20 p-6 border border-purple-500/30"
        >
          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-32 h-32 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 3 + i,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          <div className="relative z-10 text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl mb-4"
            >
              {data.isWeekend ? "🎉" : "⏰"}
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">{data.countdown}</h2>
            <p className="text-purple-200/80 italic">&ldquo;{data.quote}&rdquo;</p>
          </div>
        </motion.div>

        {/* Personal Stats */}
        {data.personalStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 rounded-xl p-4 border border-pink-500/30"
          >
            <h3 className="text-sm font-semibold text-pink-300 mb-3 flex items-center gap-2">
              <FiStar className="w-4 h-4" /> Your Weekend Stats
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{data.personalStats.thisWeekendCount}</p>
                <p className="text-xs text-pink-300/70">This Weekend</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{data.personalStats.totalWeekendSmokes}</p>
                <p className="text-xs text-pink-300/70">All-Time</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{data.personalStats.avgRating?.toFixed(1) || "-"}</p>
                <p className="text-xs text-pink-300/70">Avg Rating</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Weekend Suggestion */}
        {data.suggestion && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-xl p-4 border border-amber-500/30"
          >
            <h3 className="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-2">
              <FiZap className="w-4 h-4" /> Weekend Suggestion
            </h3>
            <p className="text-lg font-bold text-white">{data.suggestion.brand}</p>
            {data.suggestion.product && (
              <p className="text-amber-200/80 text-sm">{data.suggestion.product}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-amber-400">★ {data.suggestion.avgRating?.toFixed(1)}</span>
              <span className="text-amber-200/60 text-sm">• {data.suggestion.reason}</span>
            </div>
          </motion.div>
        )}

        {/* Weekend Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-900/50 rounded-xl p-4 border border-purple-800/30"
        >
          <h3 className="text-sm font-semibold text-purple-300 mb-4 flex items-center gap-2">
            <FiAward className="w-4 h-4" /> Weekend Warriors
          </h3>
          
          {data.weekendLeaders.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No weekend check-ins yet!</p>
          ) : (
            <div className="space-y-3">
              {data.weekendLeaders.map((leader, idx) => (
                <motion.div
                  key={leader.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-800/20"
                >
                  <span className="text-2xl">{idx < 3 ? MEDAL_EMOJIS[idx] : `#${idx + 1}`}</span>
                  {leader.avatar_url ? (
                    <Image
                      src={leader.avatar_url}
                      alt={leader.username}
                      width={36}
                      height={36}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                      {leader.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <Link 
                      href={`/profile/${leader.username}`}
                      className="font-semibold text-white hover:text-purple-300"
                    >
                      {leader.username}
                    </Link>
                    <p className="text-xs text-purple-300/70">
                      ★ {leader.avg_rating?.toFixed(1) || "-"} avg
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${idx < 3 ? MEDAL_COLORS[idx] : "text-purple-300"}`}>
                      {leader.weekend_count}
                    </p>
                    <p className="text-xs text-purple-300/70">smokes</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Platform Weekend Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-br from-purple-800/30 to-indigo-800/30 rounded-xl p-4 border border-purple-600/30"
        >
          <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
            <FiTrendingUp className="w-4 h-4" /> All-Time Weekend Stats
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{data.platformStats.totalWeekendSmokes}</p>
              <p className="text-xs text-purple-300/70">Weekend Smokes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{data.platformStats.weekendSmokers}</p>
              <p className="text-xs text-purple-300/70">Weekend Smokers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {data.platformStats.avgWeekendRating?.toFixed(1) || "-"}
              </p>
              <p className="text-xs text-purple-300/70">Avg Rating</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-purple-200 truncate">
                {data.platformStats.topBrand || "-"}
              </p>
              <p className="text-xs text-purple-300/70">Top Brand</p>
            </div>
          </div>
        </motion.div>

        {/* This Weekend's Check-ins */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-900/50 rounded-xl p-4 border border-purple-800/30"
        >
          <h3 className="text-sm font-semibold text-purple-300 mb-4 flex items-center gap-2">
            <FiSunset className="w-4 h-4" /> This Weekend&apos;s Smokes
          </h3>
          
          {data.weekendCheckins.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">🚬</p>
              <p className="text-gray-400">No check-ins yet this weekend!</p>
              <p className="text-purple-400 text-sm mt-1">Be the first to kick it off!</p>
              <Link
                href="/checkin"
                className="inline-block mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-semibold transition-colors"
              >
                Log a Smoke
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.weekendCheckins.slice(0, 5).map((checkin, idx) => (
                <Link
                  key={checkin.id}
                  href={`/checkin/${checkin.id}`}
                  className="block"
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + idx * 0.05 }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-800/20 transition-colors"
                  >
                    {checkin.avatar_url ? (
                      <Image
                        src={checkin.avatar_url}
                        alt={checkin.username}
                        width={36}
                        height={36}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                        {checkin.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{checkin.brand}</p>
                      <p className="text-xs text-purple-300/70">@{checkin.username}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-amber-400 font-bold">★ {checkin.rating}</p>
                    </div>
                  </motion.div>
                </Link>
              ))}
              
              {data.weekendCheckins.length > 5 && (
                <p className="text-center text-purple-400 text-sm">
                  +{data.weekendCheckins.length - 5} more this weekend
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-2 gap-3"
        >
          <Link
            href="/checkin"
            className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            <FiSunrise className="w-5 h-5" /> Log Smoke
          </Link>
          <Link
            href="/leaderboard"
            className="flex items-center justify-center gap-2 p-4 bg-gray-800/50 hover:bg-gray-700/50 border border-purple-600/30 rounded-xl text-purple-300 font-semibold transition-colors"
          >
            <FiUsers className="w-5 h-5" /> Leaderboard
          </Link>
        </motion.div>

        {/* Related Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center space-y-2 text-sm text-purple-400"
        >
          <p>
            <Link href="/tgif" className="hover:text-purple-300">🎊 TGIF Celebration</Link>
            {" • "}
            <Link href="/nightcap" className="hover:text-purple-300">🌙 Nightcap Club</Link>
          </p>
          <p>
            <Link href="/happy-hour" className="hover:text-purple-300">🍻 Happy Hour</Link>
            {" • "}
            <Link href="/goodnight" className="hover:text-purple-300">😴 Goodnight Lounge</Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
