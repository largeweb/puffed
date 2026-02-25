"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiHome, FiRefreshCw, FiStar, FiClock, FiUsers, FiAward, FiSunrise, FiMoon } from "react-icons/fi";

interface TwilightSmoker {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  checkedAt: number;
  timeAgo: string;
  imageUrl?: string;
}

interface TwilightStats {
  totalTwilightSmokes: number;
  uniqueTwilightSmokers: number;
  twilightPercent: number;
  yourTwilightCount: number;
  yourTwilightPercent: number;
  isTwilightZone: boolean;
  currentHour: number;
  minutesUntilDawn: number;
}

interface Leader {
  username: string;
  count: number;
}

interface TwilightData {
  twilightSmokers: TwilightSmoker[];
  stats: TwilightStats;
  leaders: Leader[];
}

export default function TwilightZonePage() {
  const router = useRouter();
  const [data, setData] = useState<TwilightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/twilight-zone");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Error fetching twilight data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-indigo-300">
          <FiSunrise className="w-12 h-12 mx-auto mb-4 animate-bounce" />
          <p>Entering the twilight...</p>
        </div>
      </div>
    );
  }

  const { twilightSmokers, stats, leaders } = data || { twilightSmokers: [], stats: null, leaders: [] };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900">
      {/* Animated stars background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 60}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
        {/* Dawn glow at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-orange-500/20 via-pink-500/10 to-transparent" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-indigo-300 hover:text-white transition-colors"
          >
            <FiHome className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </Link>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <FiMoon className="w-8 h-8 text-indigo-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Twilight Zone
            </h1>
            <FiSunrise className="w-8 h-8 text-orange-400" />
          </div>
          <p className="text-indigo-300 text-sm">
            The pre-dawn hour • 4-5 AM EST
          </p>
          <p className="text-indigo-400/60 text-xs mt-1">
            When night meets morning
          </p>
        </motion.div>

        {/* Live Status */}
        {stats?.isTwilightZone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-orange-500/30 border border-indigo-400/30 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-orange-400"
              />
              <span className="text-indigo-200 font-semibold">You're in the Twilight Zone</span>
            </div>
            <p className="text-sm text-indigo-300">
              {stats.minutesUntilDawn} minutes until dawn 🌅
            </p>
          </motion.div>
        )}

        {/* Stats Grid */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 mb-8"
          >
            <div className="glass rounded-xl p-4 text-center bg-indigo-500/10">
              <div className="text-2xl font-bold text-indigo-300">{stats.totalTwilightSmokes}</div>
              <div className="text-xs text-indigo-400/80">Twilight Smokes</div>
            </div>
            <div className="glass rounded-xl p-4 text-center bg-purple-500/10">
              <div className="text-2xl font-bold text-purple-300">{stats.uniqueTwilightSmokers}</div>
              <div className="text-xs text-purple-400/80">Dawn Seekers</div>
            </div>
            <div className="glass rounded-xl p-4 text-center bg-orange-500/10">
              <div className="text-2xl font-bold text-orange-300">{stats.twilightPercent}%</div>
              <div className="text-xs text-orange-400/80">Of Community</div>
            </div>
          </motion.div>
        )}

        {/* Your Twilight Stats */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-6 mb-8 bg-gradient-to-r from-indigo-500/10 to-purple-500/10"
          >
            <h2 className="text-lg font-semibold text-indigo-200 mb-4 flex items-center gap-2">
              <FiClock className="text-indigo-400" />
              Your Twilight Journey
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-indigo-300">{stats.yourTwilightCount}</div>
                <div className="text-sm text-indigo-400/80">pre-dawn smokes</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-purple-300">{stats.yourTwilightPercent}%</div>
                <div className="text-sm text-purple-400/80">twilight ratio</div>
              </div>
            </div>
            {stats.yourTwilightCount === 0 && (
              <p className="mt-4 text-sm text-indigo-300/60 text-center">
                Log a smoke between 4-5 AM to join the Twilight Club ✨
              </p>
            )}
          </motion.div>
        )}

        {/* Dawn Seekers Leaderboard */}
        {leaders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-6 mb-8"
          >
            <h2 className="text-lg font-semibold text-indigo-200 mb-4 flex items-center gap-2">
              <FiAward className="text-orange-400" />
              Dawn Seekers Leaderboard
            </h2>
            <div className="space-y-3">
              {leaders.map((leader, index) => (
                <motion.div
                  key={leader.username}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {index === 0 ? "🌟" : index === 1 ? "✨" : index === 2 ? "💫" : "⭐"}
                    </span>
                    <Link 
                      href={`/user/${leader.username}`}
                      className="text-indigo-200 hover:text-white transition-colors"
                    >
                      @{leader.username}
                    </Link>
                  </div>
                  <div className="text-sm text-indigo-400">
                    {leader.count} {leader.count === 1 ? "smoke" : "smokes"}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tonight's Twilight Smokers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold text-indigo-200 mb-4 flex items-center gap-2">
            <FiUsers className="text-purple-400" />
            {stats?.isTwilightZone ? "Smoking Right Now" : "Recent Twilight Smokers"}
          </h2>
          
          {twilightSmokers.length === 0 ? (
            <div className="text-center py-8">
              <FiSunrise className="w-12 h-12 mx-auto mb-4 text-indigo-400/40" />
              <p className="text-indigo-300/60 text-sm">
                No twilight smokers yet today
              </p>
              <p className="text-indigo-400/40 text-xs mt-1">
                Be the first to light up before dawn 🌅
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {twilightSmokers.map((smoker, index) => (
                  <motion.div
                    key={`${smoker.username}-${smoker.checkedAt}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-400/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/user/${smoker.username}`}
                            className="font-medium text-indigo-200 hover:text-white transition-colors"
                          >
                            @{smoker.username}
                          </Link>
                          <span className="text-xs text-indigo-400/60">{smoker.timeAgo}</span>
                        </div>
                        <div className="text-sm text-indigo-300">{smoker.brand}</div>
                        {smoker.product && (
                          <div className="text-xs text-indigo-400/60">{smoker.product}</div>
                        )}
                      </div>
                      {smoker.rating && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/20">
                          <FiStar className="w-3 h-3 text-orange-400" fill="currentColor" />
                          <span className="text-sm text-orange-300">{smoker.rating}</span>
                        </div>
                      )}
                    </div>
                    {smoker.imageUrl && (
                      <div className="mt-3 rounded-lg overflow-hidden">
                        <img
                          src={smoker.imageUrl}
                          alt={smoker.brand}
                          className="w-full h-32 object-cover"
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Poetic Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-8 mb-4"
        >
          <p className="text-indigo-400/40 text-xs italic">
            "In the space between night and day, we find ourselves."
          </p>
        </motion.div>

        {/* CTA if not twilight time */}
        {stats && !stats.isTwilightZone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
            >
              <FiHome className="w-4 h-4" />
              Return to Dashboard
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
