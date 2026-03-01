"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiHome, FiRefreshCw, FiStar, FiUsers, FiMoon, FiPlus } from "react-icons/fi";

interface CovenMember {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  checkedAt: number;
  timeAgo: string;
  imageUrl?: string;
}

interface WitchingStats {
  totalWitchingSmokes: number;
  uniqueWitches: number;
  yourWitchingCount: number;
  yourMysticTitle: string;
  isWitchingHour: boolean;
  currentHour: number;
  mostCommonOffering?: string;
  darkestHour?: number;
}

interface MysticLeader {
  username: string;
  count: number;
  mysticTitle: string;
  favoriteHour: string;
}

interface TarotReading {
  card: string;
  emoji: string;
  meaning: string;
}

interface WitchingData {
  covenMembers: CovenMember[];
  stats: WitchingStats;
  mysticLeaders: MysticLeader[];
  tarotReading: TarotReading;
}

function formatHour(hour: number): string {
  if (hour === 0) return "Midnight";
  if (hour === 1) return "1 AM";
  if (hour === 2) return "2 AM";
  return `${hour} AM`;
}

export default function WitchingHourPage() {
  const router = useRouter();
  const [data, setData] = useState<WitchingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"coven" | "mystics">("coven");
  const [showTarot, setShowTarot] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/witching-hour");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const result = await res.json() as WitchingData;
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
      <div className="min-h-screen bg-gradient-to-b from-black via-purple-950/30 to-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-4xl"
        >
          🔮
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-purple-950/30 to-black flex items-center justify-center text-white">
        <p>The spirits are silent...</p>
      </div>
    );
  }

  const { covenMembers, stats, mysticLeaders, tarotReading } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-950/30 to-black text-white p-4 pb-20 relative overflow-hidden">
      {/* Animated stars background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-300/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="max-w-lg mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <FiHome size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <motion.span 
                  className="text-3xl"
                  animate={{ rotateY: [0, 360] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                >
                  🔮
                </motion.span> 
                Witching Hour
              </h1>
              <p className="text-sm text-purple-400/70">The mystical hours • 12 AM - 3 AM</p>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            className={`p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all ${refreshing ? "animate-spin" : ""}`}
          >
            <FiRefreshCw size={20} />
          </button>
        </div>

        {/* Witching Hour Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 p-4 rounded-xl border ${
            stats.isWitchingHour 
              ? "bg-gradient-to-r from-purple-950/50 via-violet-900/30 to-purple-950/50 border-purple-500/40"
              : "bg-gray-900/50 border-gray-800/50"
          }`}
        >
          {stats.isWitchingHour ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <motion.span 
                  className="text-3xl"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  🌙
                </motion.span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-pulse"></span>
              </div>
              <div>
                <p className="font-semibold text-purple-300">The Veil Is Thin</p>
                <p className="text-sm text-purple-400/60">Magic flows through the smoke...</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-3xl opacity-50">🕯️</span>
              <div>
                <p className="font-semibold text-gray-400">The Hour Has Not Come</p>
                <p className="text-sm text-gray-600">Return when the clock strikes midnight</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Your Mystic Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4 p-4 rounded-xl bg-gradient-to-br from-violet-950/40 to-purple-950/40 border border-purple-700/30"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-400/70">Your Mystic Title</p>
              <p className="text-xl font-bold text-purple-200">{stats.yourMysticTitle}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-purple-400/70">Witching Smokes</p>
              <p className="text-2xl font-bold text-purple-300">{stats.yourWitchingCount}</p>
            </div>
          </div>
          {stats.isWitchingHour && (
            <Link 
              href="/checkin"
              className="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-sm transition-colors"
            >
              <FiPlus size={16} /> Perform a Ritual Smoke
            </Link>
          )}
        </motion.div>

        {/* Tarot Reading Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-4"
        >
          <button
            onClick={() => setShowTarot(!showTarot)}
            className="w-full p-4 rounded-xl bg-gradient-to-br from-violet-900/30 to-fuchsia-950/30 border border-purple-600/30 hover:border-purple-500/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{tarotReading.emoji}</span>
                <div className="text-left">
                  <p className="text-sm text-purple-400/70">Tonight&apos;s Reading</p>
                  <p className="font-semibold text-purple-200">{tarotReading.card}</p>
                </div>
              </div>
              <motion.span
                animate={{ rotate: showTarot ? 180 : 0 }}
                className="text-purple-400"
              >
                ▼
              </motion.span>
            </div>
          </button>
          <AnimatePresence>
            {showTarot && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-4 rounded-xl bg-black/40 border border-purple-800/30"
              >
                <p className="text-purple-200/80 italic text-center">&quot;{tarotReading.meaning}&quot;</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("coven")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "coven"
                ? "bg-purple-600/40 text-purple-200"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            <FiUsers className="inline mr-2" /> The Coven
          </button>
          <button
            onClick={() => setActiveTab("mystics")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "mystics"
                ? "bg-purple-600/40 text-purple-200"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            <FiMoon className="inline mr-2" /> Mystics
          </button>
        </div>

        {/* Coven Members */}
        <AnimatePresence mode="wait">
          {activeTab === "coven" && (
            <motion.div
              key="coven"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {covenMembers.length === 0 ? (
                <div className="text-center py-8 text-purple-400/60">
                  <span className="text-4xl mb-2 block">🕯️</span>
                  <p>The coven awaits its first member tonight...</p>
                  {stats.isWitchingHour && (
                    <Link href="/checkin" className="mt-3 inline-block text-purple-400 hover:text-purple-300 text-sm">
                      Be the first to light the flame →
                    </Link>
                  )}
                </div>
              ) : (
                covenMembers.map((member, i) => (
                  <motion.div
                    key={`${member.username}-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-3 rounded-lg bg-purple-950/30 border border-purple-800/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🔮</span>
                        <div>
                          <Link href={`/u/${member.username}`} className="font-medium text-purple-200 hover:text-purple-100">
                            @{member.username}
                          </Link>
                          <p className="text-sm text-purple-400/60">{member.brand} {member.product || ""}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {member.rating && (
                          <div className="flex items-center gap-1 text-purple-300">
                            <FiStar size={12} /> {member.rating}
                          </div>
                        )}
                        <p className="text-xs text-purple-500/60">{member.timeAgo}</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "mystics" && (
            <motion.div
              key="mystics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {mysticLeaders.length === 0 ? (
                <div className="text-center py-8 text-purple-400/60">
                  <span className="text-4xl mb-2 block">🌙</span>
                  <p>No mystics have been initiated yet...</p>
                </div>
              ) : (
                mysticLeaders.map((leader, i) => (
                  <motion.div
                    key={leader.username}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-3 rounded-lg bg-purple-950/30 border border-purple-800/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold text-purple-400/70">
                          {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                        </span>
                        <div>
                          <Link href={`/u/${leader.username}`} className="font-medium text-purple-200 hover:text-purple-100">
                            @{leader.username}
                          </Link>
                          <p className="text-sm text-purple-400/60">{leader.mysticTitle}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-300">{leader.count}</p>
                        <p className="text-xs text-purple-500/60">Peak: {leader.favoriteHour}</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Platform Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 rounded-xl bg-black/30 border border-purple-900/30"
        >
          <h3 className="text-sm font-semibold text-purple-400/70 mb-3 flex items-center gap-2">
            <span>🌙</span> Dark Arts Statistics
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-2 rounded-lg bg-purple-950/30">
              <p className="text-purple-400/60 text-xs">Total Rituals</p>
              <p className="text-purple-200 font-bold">{stats.totalWitchingSmokes}</p>
            </div>
            <div className="p-2 rounded-lg bg-purple-950/30">
              <p className="text-purple-400/60 text-xs">Initiated Witches</p>
              <p className="text-purple-200 font-bold">{stats.uniqueWitches}</p>
            </div>
            {stats.mostCommonOffering && (
              <div className="p-2 rounded-lg bg-purple-950/30">
                <p className="text-purple-400/60 text-xs">Favored Offering</p>
                <p className="text-purple-200 font-bold truncate">{stats.mostCommonOffering}</p>
              </div>
            )}
            {stats.darkestHour !== undefined && (
              <div className="p-2 rounded-lg bg-purple-950/30">
                <p className="text-purple-400/60 text-xs">Darkest Hour</p>
                <p className="text-purple-200 font-bold">{formatHour(stats.darkestHour)}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Navigation Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 text-center text-sm text-purple-500/60"
        >
          <p>More dark explorations:</p>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            <Link href="/midnight-society" className="hover:text-purple-400">🌑 Midnight Society</Link>
            <Link href="/graveyard-shift" className="hover:text-purple-400">☠️ Graveyard</Link>
            <Link href="/dead-of-night" className="hover:text-purple-400">📓 Dead of Night</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
