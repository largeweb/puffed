"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiHome, FiRefreshCw, FiStar, FiUsers, FiClock, FiTrendingUp } from "react-icons/fi";

interface TGIFMember {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  checkedAt: number;
  timeAgo: string;
  imageUrl?: string;
}

interface TGIFStats {
  totalFridaySmokes: number;
  uniqueFridaySmokers: number;
  yourFridayCount: number;
  isTGIFWindow: boolean;
  currentHour: number;
  dayOfWeek: number;
  mostPopularFridayBrand?: string;
  peakFridayHour?: number;
  avgFridayRating?: number;
}

interface Leader {
  username: string;
  count: number;
  avgRating: string;
}

interface TGIFData {
  tonightsMembers: TGIFMember[];
  stats: TGIFStats;
  leaders: Leader[];
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export default function TGIFPage() {
  const router = useRouter();
  const [data, setData] = useState<TGIFData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"party" | "legends">("party");

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/tgif");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const result = await res.json() as TGIFData;
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
      <div className="min-h-screen bg-gradient-to-b from-amber-950 via-gray-950 to-gray-950 text-white p-4">
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

  // Get party vibe based on time and activity
  const getPartyVibe = () => {
    if (!stats?.isTGIFWindow) {
      return { emoji: "📅", status: "Waiting for Friday", subtitle: "The party starts Friday at 5 PM" };
    }
    const memberCount = tonightsMembers.length;
    if (memberCount === 0) {
      return { emoji: "🎤", status: "First One Here!", subtitle: "Be the party starter" };
    }
    if (memberCount < 3) {
      return { emoji: "🍻", status: "Party's Starting", subtitle: "Early vibes" };
    }
    if (memberCount < 6) {
      return { emoji: "🎉", status: "Getting Lit!", subtitle: "The crew's arriving" };
    }
    return { emoji: "🔥", status: "FULL SEND", subtitle: "Weekend mode activated" };
  };

  const vibe = getPartyVibe();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 via-gray-950 to-gray-950 text-white p-4 pb-20">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <FiHome size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-3xl">🍻</span> TGIF Lounge
              </h1>
              <p className="text-sm text-amber-500/70">Friday Night • Weekend Kickoff</p>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            className={`p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all ${refreshing ? "animate-spin" : ""}`}
          >
            <FiRefreshCw size={20} />
          </button>
        </div>

        {/* Party Status Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`mb-4 p-5 rounded-xl ${
            stats?.isTGIFWindow
              ? "bg-gradient-to-r from-amber-900/40 via-orange-900/30 to-amber-900/40 border border-amber-600/40"
              : "bg-gray-900/50 border border-gray-800/50"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="text-5xl">{vibe.emoji}</span>
              {stats?.isTGIFWindow && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full animate-pulse"></span>
              )}
            </div>
            <div>
              <p className={`text-xl font-bold ${stats?.isTGIFWindow ? "text-amber-300" : "text-gray-400"}`}>
                {vibe.status}
              </p>
              <p className="text-sm text-gray-500">{vibe.subtitle}</p>
              {stats?.isTGIFWindow && (
                <p className="text-xs text-amber-600/70 mt-1 flex items-center gap-1">
                  <FiClock size={10} /> Friday 5 PM - Saturday 3 AM
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Your TGIF Stats */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 p-4 rounded-xl bg-gradient-to-r from-gray-900 via-amber-950/20 to-gray-900 border border-gray-800"
          >
            <div className="text-center mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Your Friday Night Count</p>
              <p className="text-4xl font-bold text-amber-400">{stats.yourFridayCount}</p>
              <p className="text-xs text-gray-600 mt-1">
                {stats.yourFridayCount === 0 
                  ? "Time to start the party!" 
                  : stats.yourFridayCount === 1 
                  ? "Welcome to the club!" 
                  : stats.yourFridayCount >= 5 
                  ? "🏆 TGIF Legend!" 
                  : "Weekend warrior in the making"}
              </p>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("party")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "party"
                ? "bg-amber-900/50 text-amber-300 border border-amber-700/50"
                : "bg-white/5 text-gray-500 hover:bg-white/10"
            }`}
          >
            🎉 Tonight&apos;s Party
          </button>
          <button
            onClick={() => setActiveTab("legends")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "legends"
                ? "bg-amber-900/50 text-amber-300 border border-amber-700/50"
                : "bg-white/5 text-gray-500 hover:bg-white/10"
            }`}
          >
            🏆 TGIF Legends
          </button>
        </div>

        {/* Tonight's Party Tab */}
        <AnimatePresence mode="wait">
          {activeTab === "party" && (
            <motion.div
              key="party"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {tonightsMembers.length === 0 ? (
                <div className="text-center py-12 bg-gray-900/30 rounded-xl border border-gray-800/50">
                  <span className="text-5xl mb-3 block">🎤</span>
                  <p className="text-gray-400">No one&apos;s arrived yet</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {stats?.isTGIFWindow 
                      ? "Be the first to kick off the weekend!" 
                      : "Party starts Friday at 5 PM"}
                  </p>
                  {stats?.isTGIFWindow && (
                    <Link 
                      href="/dashboard"
                      className="inline-block mt-4 px-4 py-2 bg-amber-900/50 hover:bg-amber-800/50 border border-amber-700/50 rounded-lg transition-colors text-amber-300"
                    >
                      Start the Party 🎉
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
                    className="p-4 rounded-xl bg-gradient-to-r from-gray-900 via-amber-950/10 to-gray-900 border border-gray-800/50"
                  >
                    <div className="flex items-center gap-3">
                      {member.imageUrl ? (
                        <img 
                          src={member.imageUrl} 
                          alt={member.brand}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-amber-900/30 flex items-center justify-center">
                          <span className="text-2xl">🔥</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/user/${member.username}`}
                            className="font-semibold text-gray-200 hover:text-amber-300"
                          >
                            {member.username}
                          </Link>
                          {idx === 0 && <span className="text-xs bg-amber-900/50 px-2 py-0.5 rounded-full text-amber-300">Latest</span>}
                        </div>
                        <p className="text-sm text-gray-500">
                          {member.brand}{member.product ? ` - ${member.product}` : ""}
                        </p>
                        <p className="text-xs text-gray-600">{member.timeAgo}</p>
                      </div>
                      {member.rating && (
                        <div className="flex items-center gap-1 bg-amber-900/30 px-2 py-1 rounded-lg border border-amber-800/30">
                          <FiStar className="text-amber-400" size={14} />
                          <span className="text-amber-400 font-semibold text-sm">{member.rating}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "legends" && (
            <motion.div
              key="legends"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <div className="text-center py-4 mb-2">
                <h3 className="text-lg font-semibold text-amber-300">🏆 TGIF Hall of Fame</h3>
                <p className="text-sm text-gray-600">The ultimate weekend warriors</p>
              </div>
              {leaders.length === 0 ? (
                <div className="text-center py-12 bg-gray-900/30 rounded-xl border border-gray-800/50">
                  <span className="text-5xl mb-3 block">🏆</span>
                  <p className="text-gray-400">No legends yet</p>
                  <p className="text-sm text-gray-600 mt-1">Start smoking on Fridays to claim your spot!</p>
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
                        ? "bg-gradient-to-r from-amber-900/40 via-yellow-900/30 to-amber-900/40 border-amber-500/50" 
                        : idx === 1
                        ? "bg-gradient-to-r from-gray-700/30 via-gray-800/30 to-gray-700/30 border-gray-500/50"
                        : idx === 2
                        ? "bg-gradient-to-r from-orange-900/30 via-gray-900 to-orange-900/30 border-orange-700/30"
                        : "bg-gray-900/30 border-gray-800/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl w-8 text-center">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                      </div>
                      <div className="flex-1">
                        <Link 
                          href={`/user/${leader.username}`}
                          className="font-semibold text-gray-200 hover:text-amber-300"
                        >
                          {leader.username}
                        </Link>
                        <p className="text-sm text-gray-600">Avg rating: {leader.avgRating}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-amber-400">{leader.count}</p>
                        <p className="text-xs text-gray-600">Friday smokes</p>
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
              <FiTrendingUp size={14} /> TGIF Stats
            </h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-amber-400">{stats.totalFridaySmokes}</p>
                <p className="text-xs text-gray-600">Total Friday Smokes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-400">{stats.uniqueFridaySmokers}</p>
                <p className="text-xs text-gray-600">TGIF Members</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-500/70">{stats.mostPopularFridayBrand || "—"}</p>
                <p className="text-xs text-gray-600">Friday Favorite</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-500">
                  {stats.peakFridayHour !== undefined ? formatHour(stats.peakFridayHour) : "—"}
                </p>
                <p className="text-xs text-gray-600">Peak Party Hour</p>
              </div>
            </div>
            {stats.avgFridayRating && (
              <div className="mt-3 pt-3 border-t border-gray-800/50 text-center">
                <p className="text-xs text-gray-600">Average Friday Rating</p>
                <div className="flex items-center justify-center gap-1">
                  <FiStar className="text-amber-400" size={16} />
                  <span className="text-lg font-bold text-amber-400">{stats.avgFridayRating}</span>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Related Links */}
        <div className="mt-6 flex gap-2">
          <Link 
            href="/happy-hour"
            className="flex-1 p-3 rounded-xl bg-gradient-to-r from-orange-950/30 to-amber-950/30 border border-orange-800/30 text-center hover:bg-orange-950/40 transition-colors"
          >
            <span className="text-xl">🕔</span>
            <p className="text-sm text-orange-300 mt-1">Happy Hour</p>
            <p className="text-xs text-gray-600">5-8 PM</p>
          </Link>
          <Link 
            href="/midnight-society"
            className="flex-1 p-3 rounded-xl bg-gradient-to-r from-purple-950/30 to-gray-950/30 border border-purple-800/30 text-center hover:bg-purple-950/40 transition-colors"
          >
            <span className="text-xl">🌑</span>
            <p className="text-sm text-purple-300 mt-1">Midnight</p>
            <p className="text-xs text-gray-600">12-2 AM</p>
          </Link>
        </div>

        {/* Friday Quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-amber-700/60 italic text-sm">&quot;Friday night is for celebrating another week survived.&quot;</p>
          <p className="text-xs text-gray-700 mt-1">🍻 Thank God It&apos;s Friday</p>
        </motion.div>
      </div>
    </div>
  );
}
