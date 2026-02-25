"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiHome, FiRefreshCw, FiStar, FiClock, FiUsers, FiAward, FiMoon } from "react-icons/fi";

interface WitchingHourSmoker {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  checkedAt: number;
  timeAgo: string;
  imageUrl?: string;
}

interface WitchingHourStats {
  totalWitchingHourSmokes: number;
  uniqueWitchingHourSmokers: number;
  witchingHourPercent: number;
  yourWitchingHourCount: number;
  yourWitchingHourPercent: number;
  isWitchingHour: boolean;
  currentHour: number;
}

interface Leader {
  username: string;
  count: number;
}

interface WitchingHourData {
  tonightsSmokers: WitchingHourSmoker[];
  stats: WitchingHourStats;
  leaders: Leader[];
}

export default function WitchingHourPage() {
  const router = useRouter();
  const [data, setData] = useState<WitchingHourData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/witching-hour");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
    // Refresh every 2 minutes
    const interval = setInterval(() => fetchData(), 120000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-violet-950/30 to-black text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-2/3"></div>
            <div className="h-40 bg-gray-700/50 rounded-xl"></div>
            <div className="h-32 bg-gray-700/50 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const isWitchingHour = stats?.isWitchingHour;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-violet-950/30 to-black text-white">
      {/* Animated background for witching hour */}
      {isWitchingHour && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-10 w-2 h-2 bg-violet-400 rounded-full"
            animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.5, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-40 right-20 w-1.5 h-1.5 bg-purple-400 rounded-full"
            animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.3, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
          />
          <motion.div
            className="absolute bottom-32 left-1/4 w-2 h-2 bg-indigo-400 rounded-full"
            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.4, 1] }}
            transition={{ duration: 4, repeat: Infinity, delay: 1 }}
          />
        </div>
      )}

      <div className="relative max-w-lg mx-auto p-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-white/10 transition">
            <FiHome className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            🕯️ Witching Hour
          </h1>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-white/10 transition"
          >
            <FiRefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-4 mb-6 border ${
            isWitchingHour
              ? "bg-gradient-to-r from-violet-600/30 to-purple-600/30 border-violet-500/50"
              : "bg-gradient-to-r from-gray-700/30 to-gray-600/30 border-gray-500/30"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`text-3xl ${isWitchingHour ? "animate-pulse" : ""}`}>
              {isWitchingHour ? "🕯️" : "💤"}
            </div>
            <div>
              <h2 className="font-bold text-lg">
                {isWitchingHour ? "The Witching Hour is NOW" : "The Veil is Closed"}
              </h2>
              <p className="text-sm text-gray-400">
                {isWitchingHour
                  ? "2-4 AM — The deepest night. Only true insomniacs smoke now."
                  : `Come back between 2-4 AM to join the Witching Hour`}
              </p>
            </div>
          </div>
          {isWitchingHour && (
            <Link
              href="/checkin"
              className="mt-3 block w-full py-2 px-4 bg-violet-600 hover:bg-violet-500 rounded-lg text-center font-medium transition"
            >
              🔥 Log a Smoke to Join
            </Link>
          )}
        </motion.div>

        {/* Your Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-4 mb-6"
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <FiMoon className="text-violet-400" />
            Your Witching Hour Stats
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <div className="text-2xl font-bold text-violet-400">
                {stats?.yourWitchingHourCount || 0}
              </div>
              <div className="text-xs text-gray-400">Deep Night Smokes</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="text-2xl font-bold text-purple-400">
                {stats?.yourWitchingHourPercent || 0}%
              </div>
              <div className="text-xs text-gray-400">Of Your Smokes</div>
            </div>
          </div>
          {(stats?.yourWitchingHourCount || 0) === 0 && (
            <p className="text-sm text-gray-500 mt-3 text-center italic">
              You haven&apos;t joined the Witching Hour yet... 👻
            </p>
          )}
        </motion.div>

        {/* Tonight's Smokers */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-4 mb-6"
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <FiUsers className="text-violet-400" />
            {isWitchingHour ? "Smoking Now" : "Last Witching Hour"}
          </h3>
          {data?.tonightsSmokers && data.tonightsSmokers.length > 0 ? (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {data.tonightsSmokers.map((smoker, i) => (
                  <motion.div
                    key={`${smoker.username}-${smoker.checkedAt}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition"
                  >
                    {smoker.imageUrl ? (
                      <img
                        src={smoker.imageUrl}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center">
                        🕯️
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/user/${smoker.username}`}
                        className="font-medium hover:text-violet-400 transition"
                      >
                        @{smoker.username}
                      </Link>
                      <p className="text-sm text-gray-400 truncate">
                        {smoker.brand}
                        {smoker.product && ` • ${smoker.product}`}
                      </p>
                    </div>
                    <div className="text-right">
                      {smoker.rating && (
                        <div className="flex items-center gap-1 text-amber-400 text-sm">
                          <FiStar size={12} />
                          {smoker.rating}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <FiClock size={10} />
                        {smoker.timeAgo}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <div className="text-4xl mb-2">🌙</div>
              <p>No one braved the witching hour yet...</p>
              {isWitchingHour && (
                <p className="text-sm mt-1">Be the first! 👻</p>
              )}
            </div>
          )}
        </motion.div>

        {/* All-Time Leaders */}
        {data?.leaders && data.leaders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-xl p-4 mb-6"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FiAward className="text-violet-400" />
              Witching Hour Masters
            </h3>
            <div className="space-y-2">
              {data.leaders.map((leader, i) => (
                <div
                  key={leader.username}
                  className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center text-sm font-bold">
                    {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </div>
                  <Link
                    href={`/user/${leader.username}`}
                    className="flex-1 font-medium hover:text-violet-400 transition"
                  >
                    @{leader.username}
                  </Link>
                  <div className="text-violet-400 font-bold">
                    {leader.count}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Platform Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-xl p-4"
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            📊 Platform Stats
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-white/5">
              <div className="text-xl font-bold text-violet-400">
                {stats?.totalWitchingHourSmokes || 0}
              </div>
              <div className="text-xs text-gray-500">Total Smokes</div>
            </div>
            <div className="p-3 rounded-lg bg-white/5">
              <div className="text-xl font-bold text-purple-400">
                {stats?.uniqueWitchingHourSmokers || 0}
              </div>
              <div className="text-xs text-gray-500">Brave Souls</div>
            </div>
            <div className="p-3 rounded-lg bg-white/5">
              <div className="text-xl font-bold text-indigo-400">
                {stats?.witchingHourPercent || 0}%
              </div>
              <div className="text-xs text-gray-500">Of Users</div>
            </div>
          </div>
        </motion.div>

        {/* Lore */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 rounded-xl border border-violet-500/20 bg-violet-950/20"
        >
          <p className="text-sm text-gray-400 italic text-center">
            &ldquo;In the depths of night, between 2 and 4, the veil thins. 
            Those who smoke in these hours know a different kind of peace.&rdquo;
          </p>
          <p className="text-xs text-gray-600 text-center mt-2">
            — The Witching Hour Society
          </p>
        </motion.div>
      </div>
    </div>
  );
}
