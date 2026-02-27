"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiHome, FiRefreshCw, FiStar, FiUsers, FiMoon } from "react-icons/fi";

interface MidnightMember {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  checkedAt: number;
  timeAgo: string;
  imageUrl?: string;
}

interface MidnightStats {
  totalMidnightSmokes: number;
  uniqueMidnightSmokers: number;
  yourMidnightCount: number;
  yourMidnightRank: string;
  isMidnightWindow: boolean;
  currentHour: number;
  mostPopularMidnightBrand?: string;
  peakMinute?: number;
}

interface Leader {
  username: string;
  count: number;
  favoriteHour: string;
}

interface MidnightData {
  tonightsMembers: MidnightMember[];
  stats: MidnightStats;
  leaders: Leader[];
}

export default function MidnightSocietyPage() {
  const router = useRouter();
  const [data, setData] = useState<MidnightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "leaders">("members");

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/midnight-society");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const result = await res.json() as MidnightData;
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
    const interval = setInterval(() => fetchData(), 120000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-800 rounded w-2/3"></div>
            <div className="h-40 bg-gray-800/50 rounded-xl"></div>
            <div className="h-32 bg-gray-800/50 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const { tonightsMembers, stats, leaders } = data || { tonightsMembers: [], stats: null, leaders: [] };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white p-4 pb-20">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <FiHome size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-3xl">🌑</span> Midnight Society
              </h1>
              <p className="text-sm text-gray-500">The exclusive 12 AM - 2 AM club</p>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            className={`p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all ${refreshing ? "animate-spin" : ""}`}
          >
            <FiRefreshCw size={20} />
          </button>
        </div>

        {/* Window Status */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 p-4 rounded-xl ${
              stats.isMidnightWindow 
                ? "bg-gradient-to-r from-gray-900 via-purple-950/30 to-gray-900 border border-purple-500/30"
                : "bg-gray-900/50 border border-gray-800/50"
            }`}
          >
            {stats.isMidnightWindow ? (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="text-3xl">🌑</span>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-pulse"></span>
                </div>
                <div>
                  <p className="font-semibold text-purple-300">The Society Is In Session</p>
                  <p className="text-sm text-gray-500">12 AM - 2 AM • The darkest hours</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-3xl opacity-50">🕯️</span>
                <div>
                  <p className="font-semibold text-gray-400">The Society Sleeps</p>
                  <p className="text-sm text-gray-600">Returns at the stroke of midnight</p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Your Membership Status */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 p-4 rounded-xl bg-gradient-to-r from-gray-900 via-purple-950/20 to-gray-900 border border-gray-800"
          >
            <div className="text-center mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Your Society Rank</p>
              <p className="text-xl font-bold text-purple-300">{stats.yourMidnightRank}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-white">{stats.yourMidnightCount}</p>
                <p className="text-xs text-gray-500">Midnight Smokes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-400">
                  {stats.yourMidnightCount > 0 
                    ? `Top ${Math.max(1, Math.round((1 - stats.yourMidnightCount / Math.max(stats.totalMidnightSmokes, 1)) * 100))}%`
                    : "—"
                  }
                </p>
                <p className="text-xs text-gray-500">Percentile</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("members")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "members"
                ? "bg-purple-900/50 text-purple-300 border border-purple-700/50"
                : "bg-white/5 text-gray-500 hover:bg-white/10"
            }`}
          >
            🌑 Tonight&apos;s Members
          </button>
          <button
            onClick={() => setActiveTab("leaders")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "leaders"
                ? "bg-purple-900/50 text-purple-300 border border-purple-700/50"
                : "bg-white/5 text-gray-500 hover:bg-white/10"
            }`}
          >
            👑 Society Elders
          </button>
        </div>

        {/* Tonight's Members Tab */}
        <AnimatePresence mode="wait">
          {activeTab === "members" && (
            <motion.div
              key="members"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {tonightsMembers.length === 0 ? (
                <div className="text-center py-12 bg-gray-900/30 rounded-xl border border-gray-800/50">
                  <span className="text-5xl mb-3 block">🕯️</span>
                  <p className="text-gray-400">No midnight members yet tonight</p>
                  <p className="text-sm text-gray-600 mt-1">The society awaits its first member...</p>
                  {stats?.isMidnightWindow && (
                    <Link 
                      href="/dashboard"
                      className="inline-block mt-4 px-4 py-2 bg-purple-900/50 hover:bg-purple-800/50 border border-purple-700/50 rounded-lg transition-colors text-purple-300"
                    >
                      Join the Society
                    </Link>
                  )}
                </div>
              ) : (
                tonightsMembers.map((member, idx) => (
                  <motion.div
                    key={`${member.username}-${member.checkedAt}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 rounded-xl bg-gradient-to-r from-gray-900 via-purple-950/10 to-gray-900 border border-gray-800/50"
                  >
                    <div className="flex items-center gap-3">
                      {member.imageUrl && (
                        <img 
                          src={member.imageUrl} 
                          alt={member.brand}
                          className="w-12 h-12 rounded-lg object-cover opacity-80"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/user/${member.username}`}
                            className="font-semibold text-gray-200 hover:text-purple-300"
                          >
                            {member.username}
                          </Link>
                          <span className="text-xs text-gray-600">{member.timeAgo}</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {member.brand}{member.product ? ` - ${member.product}` : ""}
                        </p>
                      </div>
                      {member.rating && (
                        <div className="flex items-center gap-1 bg-purple-900/30 px-2 py-1 rounded-lg border border-purple-800/30">
                          <FiStar className="text-purple-400" size={14} />
                          <span className="text-purple-400 font-semibold text-sm">{member.rating}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "leaders" && (
            <motion.div
              key="leaders"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <div className="text-center py-4 mb-2">
                <h3 className="text-lg font-semibold text-purple-300">👑 Society Elders</h3>
                <p className="text-sm text-gray-600">Those who walk the darkest hours</p>
              </div>
              {leaders.length === 0 ? (
                <div className="text-center py-12 bg-gray-900/30 rounded-xl border border-gray-800/50">
                  <span className="text-5xl mb-3 block">👑</span>
                  <p className="text-gray-400">No elders have emerged</p>
                  <p className="text-sm text-gray-600 mt-1">Be the first to claim your place</p>
                </div>
              ) : (
                leaders.map((leader, idx) => (
                  <motion.div
                    key={leader.username}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-4 rounded-xl border ${
                      idx === 0 
                        ? "bg-gradient-to-r from-purple-950/50 via-gray-900 to-purple-950/50 border-purple-600/50" 
                        : idx === 1
                        ? "bg-gradient-to-r from-gray-800/50 via-gray-900 to-gray-800/50 border-gray-600/50"
                        : idx === 2
                        ? "bg-gradient-to-r from-amber-950/30 via-gray-900 to-amber-950/30 border-amber-800/30"
                        : "bg-gray-900/30 border-gray-800/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl w-8 text-center">
                        {idx === 0 ? "👑" : idx === 1 ? "🌑" : idx === 2 ? "🕯️" : `#${idx + 1}`}
                      </div>
                      <div className="flex-1">
                        <Link 
                          href={`/user/${leader.username}`}
                          className="font-semibold text-gray-200 hover:text-purple-300"
                        >
                          {leader.username}
                        </Link>
                        <p className="text-sm text-gray-600">Peak hour: {leader.favoriteHour}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-purple-400">{leader.count}</p>
                        <p className="text-xs text-gray-600">sessions</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Platform Stats */}
        {stats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 p-4 rounded-xl bg-gray-900/50 border border-gray-800/30"
          >
            <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
              <FiUsers size={14} /> Society Statistics
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-purple-400">{stats.totalMidnightSmokes}</p>
                <p className="text-xs text-gray-600">All-time Sessions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-400">{stats.uniqueMidnightSmokers}</p>
                <p className="text-xs text-gray-600">Total Members</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-500/70">{stats.mostPopularMidnightBrand || "—"}</p>
                <p className="text-xs text-gray-600">Dark Hour Fave</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Related Links */}
        <div className="mt-6 flex gap-2">
          <Link 
            href="/goodnight"
            className="flex-1 p-3 rounded-xl bg-gradient-to-r from-indigo-950/30 to-purple-950/30 border border-indigo-800/30 text-center hover:bg-indigo-950/40 transition-colors"
          >
            <span className="text-xl">😴</span>
            <p className="text-sm text-indigo-300 mt-1">Goodnight</p>
            <p className="text-xs text-gray-600">9 PM - 2 AM</p>
          </Link>
          <Link 
            href="/nightcap"
            className="flex-1 p-3 rounded-xl bg-gradient-to-r from-purple-950/30 to-indigo-950/30 border border-purple-800/30 text-center hover:bg-purple-950/40 transition-colors"
          >
            <FiMoon className="mx-auto text-purple-400" />
            <p className="text-sm text-purple-300 mt-1">Nightcap</p>
            <p className="text-xs text-gray-600">8 PM - 4 AM</p>
          </Link>
        </div>

        {/* Atmospheric Quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-700 italic text-sm">&quot;When the world sleeps, we smoke.&quot;</p>
        </motion.div>
      </div>
    </div>
  );
}
