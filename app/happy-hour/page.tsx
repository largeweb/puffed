"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiClock, FiStar, FiArrowLeft, FiTrendingUp, FiUsers, FiAward } from "react-icons/fi";
import Link from "next/link";

interface HappyHourSmoker {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  image_url?: string;
  created_at: number;
  drink_pairing?: string;
}

interface HappyHourStats {
  todayCount: number;
  weekCount: number;
  allTimeCount: number;
  avgRating: number;
  topBrand: string | null;
  peakMinute: number;
  uniqueSmokers: number;
}

interface HappyHourLeader {
  username: string;
  count: number;
  avgRating: number;
  favoriteBrand: string | null;
}

export default function HappyHourPage() {
  const [smokers, setSmokers] = useState<HappyHourSmoker[]>([]);
  const [stats, setStats] = useState<HappyHourStats | null>(null);
  const [leaders, setLeaders] = useState<HappyHourLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"today" | "leaders">("today");

  useEffect(() => {
    fetchHappyHour();
  }, []);

  const fetchHappyHour = async () => {
    try {
      const res = await fetch("/api/happy-hour");
      if (res.ok) {
        const data: {
          smokers: HappyHourSmoker[];
          stats: HappyHourStats;
          leaders: HappyHourLeader[];
        } = await res.json();
        setSmokers(data.smokers || []);
        setStats(data.stats || null);
        setLeaders(data.leaders || []);
      }
    } catch (error) {
      console.error("Error fetching happy hour data:", error);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const hour = now.getHours();
  const isHappyHour = hour >= 17 && hour < 20; // 5 PM - 8 PM

  const getTimeUntilHappyHour = () => {
    if (isHappyHour) return null;
    const nextHappyHour = new Date();
    if (hour >= 20) {
      nextHappyHour.setDate(nextHappyHour.getDate() + 1);
    }
    nextHappyHour.setHours(17, 0, 0, 0);
    const diff = nextHappyHour.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getTimeAgo = (timestamp: number) => {
    const diff = Math.floor(Date.now() / 1000) - timestamp;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-950 via-gray-900 to-amber-950 p-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="p-2 rounded-xl glass hover:bg-white/10 transition-colors">
            <FiArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              🍻 Happy Hour Club
            </h1>
            <p className="text-gray-400 text-sm">After-work smoking sessions (5-8 PM)</p>
          </div>
        </div>

        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass rounded-2xl p-4 mb-6 ${
            isHappyHour 
              ? "bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30" 
              : "bg-gradient-to-r from-gray-500/10 to-gray-600/10"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isHappyHour ? (
                <>
                  <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                  <div>
                    <p className="font-semibold text-orange-400">🎉 It's Happy Hour!</p>
                    <p className="text-sm text-gray-400">Log a smoke to join the club</p>
                  </div>
                </>
              ) : (
                <>
                  <FiClock className="text-gray-400" size={20} />
                  <div>
                    <p className="font-semibold text-gray-300">Happy Hour starts in</p>
                    <p className="text-lg text-orange-400 font-bold">{getTimeUntilHappyHour()}</p>
                  </div>
                </>
              )}
            </div>
            {isHappyHour && (
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-orange-500 text-black font-semibold rounded-xl hover:bg-orange-400 transition-colors"
              >
                Log Smoke
              </Link>
            )}
          </div>
        </motion.div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-xl p-3 text-center"
            >
              <p className="text-2xl font-bold text-orange-400">{stats.todayCount}</p>
              <p className="text-xs text-gray-400">Today</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-xl p-3 text-center"
            >
              <p className="text-2xl font-bold text-amber-400">{stats.weekCount}</p>
              <p className="text-xs text-gray-400">This Week</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-xl p-3 text-center"
            >
              <p className="text-2xl font-bold text-yellow-400">{stats.allTimeCount}</p>
              <p className="text-xs text-gray-400">All Time</p>
            </motion.div>
          </div>
        )}

        {/* Platform Stats */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-4 mb-6"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FiTrendingUp className="text-orange-400" /> Happy Hour Insights
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Avg Rating</p>
                <p className="font-semibold text-orange-400">
                  {stats.avgRating > 0 ? `${stats.avgRating.toFixed(1)} ⭐` : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Top Brand</p>
                <p className="font-semibold text-amber-400 truncate">
                  {stats.topBrand || "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Unique Smokers</p>
                <p className="font-semibold text-yellow-400">{stats.uniqueSmokers}</p>
              </div>
              <div>
                <p className="text-gray-400">Peak Time</p>
                <p className="font-semibold text-orange-400">
                  {stats.peakMinute > 0 
                    ? `${Math.floor(stats.peakMinute / 60)}:${(stats.peakMinute % 60).toString().padStart(2, '0')} PM`
                    : "—"
                  }
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("today")}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
              activeTab === "today"
                ? "bg-orange-500 text-black"
                : "glass text-gray-400 hover:text-white"
            }`}
          >
            🍻 Today's Happy Hour
          </button>
          <button
            onClick={() => setActiveTab("leaders")}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
              activeTab === "leaders"
                ? "bg-orange-500 text-black"
                : "glass text-gray-400 hover:text-white"
            }`}
          >
            🏆 Leaderboard
          </button>
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-400">Loading happy hour data...</p>
          </div>
        ) : activeTab === "today" ? (
          <div className="space-y-3">
            {smokers.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass rounded-2xl p-8 text-center"
              >
                <p className="text-4xl mb-3">🍻</p>
                <p className="text-gray-300 font-medium">No happy hour smokes yet today</p>
                <p className="text-gray-500 text-sm mt-1">
                  {isHappyHour 
                    ? "Be the first to kick off happy hour!" 
                    : "Check back between 5-8 PM"
                  }
                </p>
              </motion.div>
            ) : (
              smokers.map((smoker, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass rounded-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    {smoker.image_url ? (
                      <img
                        src={smoker.image_url}
                        alt={smoker.brand}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center text-xl">
                        🍻
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/user/${smoker.username}`}
                          className="font-semibold text-orange-400 hover:underline"
                        >
                          {smoker.username}
                        </Link>
                        <span className="text-gray-500 text-xs">{getTimeAgo(smoker.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-300 truncate">
                        {smoker.brand}{smoker.product ? ` - ${smoker.product}` : ""}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {smoker.rating && (
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <FiStar size={10} fill="currentColor" /> {smoker.rating}
                          </span>
                        )}
                        {smoker.drink_pairing && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                            🥃 Paired
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {leaders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass rounded-2xl p-8 text-center"
              >
                <p className="text-4xl mb-3">🏆</p>
                <p className="text-gray-300 font-medium">No happy hour regulars yet</p>
                <p className="text-gray-500 text-sm mt-1">Start logging smokes between 5-8 PM!</p>
              </motion.div>
            ) : (
              leaders.map((leader, index) => (
                <motion.div
                  key={leader.username}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass rounded-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                      index === 0 ? "bg-yellow-500 text-black" :
                      index === 1 ? "bg-gray-400 text-black" :
                      index === 2 ? "bg-amber-700 text-white" :
                      "bg-gray-700 text-gray-300"
                    }`}>
                      {index < 3 ? ["🥇", "🥈", "🥉"][index] : index + 1}
                    </div>
                    <div className="flex-1">
                      <Link
                        href={`/user/${leader.username}`}
                        className="font-semibold text-orange-400 hover:underline"
                      >
                        {leader.username}
                      </Link>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <span>{leader.count} happy hour smokes</span>
                        {leader.avgRating > 0 && (
                          <span className="flex items-center gap-1">
                            <FiStar size={10} className="text-amber-400" fill="currentColor" />
                            {leader.avgRating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {leader.favoriteBrand && (
                        <p className="text-xs text-amber-400 mt-1">
                          Favorite: {leader.favoriteBrand}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-500 text-sm mb-3">
            Happy Hour: The best time to unwind with a smoke 🍻
          </p>
          <Link
            href="/nightcap"
            className="text-purple-400 hover:text-purple-300 text-sm"
          >
            Prefer late nights? Check out the Nightcap Club →
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
