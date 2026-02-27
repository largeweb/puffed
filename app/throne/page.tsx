"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiArrowLeft, FiAward, FiStar, FiTrendingUp, FiClock, FiZap, FiTarget, FiSun, FiMoon } from "react-icons/fi";

interface BrandReign {
  brand: string;
  yourCount: number;
  totalCount: number;
  isChampion: boolean;
  rank: number;
}

interface PersonalRecord {
  id: string;
  name: string;
  emoji: string;
  value: string;
  detail?: string;
}

interface ThroneData {
  username: string;
  joinedAt: number;
  totalSmokes: number;
  brandReigns: BrandReign[];
  records: PersonalRecord[];
  stats: {
    uniqueBrands: number;
    avgRating: number;
    fiveStarCount: number;
    currentStreak: number;
    bestStreak: number;
    earlyBirdSmokes: number;
    nightOwlSmokes: number;
    weekendSmokes: number;
  };
  badgeCount: number;
  throneLevel: {
    name: string;
    emoji: string;
    description: string;
  };
}

export default function ThronePage() {
  const [data, setData] = useState<ThroneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/throne");
      if (!res.ok) {
        if (res.status === 401) {
          setError("Please sign in to view your throne");
        } else {
          setError("Failed to load throne data");
        }
        return;
      }
      const json = await res.json() as ThroneData;
      setData(json);
    } catch (err) {
      console.error("Failed to fetch throne data:", err);
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-amber-950 via-yellow-950 to-orange-950 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="text-6xl mb-4"
          >
            👑
          </motion.div>
          <p className="text-amber-300">Preparing your throne...</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-amber-950 via-yellow-950 to-orange-950">
        <div className="max-w-lg mx-auto p-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-amber-400 hover:text-white mb-6">
            <FiArrowLeft />
            <span>Back to Dashboard</span>
          </Link>
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👑</div>
            <p className="text-amber-300">{error || "Something went wrong"}</p>
            {error?.includes("sign in") && (
              <Link href="/login" className="mt-4 inline-block px-6 py-2 bg-amber-500 text-black rounded-lg font-semibold">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  const joinDate = new Date(data.joinedAt * 1000);
  const daysSinceJoin = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-950 via-yellow-950 to-orange-950">
      <div className="max-w-lg mx-auto p-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-amber-400 hover:text-white">
            <FiArrowLeft />
            <span>Back</span>
          </Link>
          <h1 className="text-xl font-bold text-white">Throne Room</h1>
          <div className="w-16"></div>
        </div>

        {/* Crown Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-gradient-to-br from-amber-500/30 via-yellow-500/20 to-orange-500/30 rounded-2xl p-6 mb-6 border border-amber-500/40 overflow-hidden"
        >
          <div className="absolute top-0 right-0 text-[120px] opacity-20 -mt-4 -mr-4">👑</div>
          <div className="relative">
            <div className="text-5xl mb-3">{data.throneLevel.emoji}</div>
            <h2 className="text-2xl font-bold text-white mb-1">{data.username}</h2>
            <p className="text-amber-300 text-lg">{data.throneLevel.name}</p>
            <p className="text-amber-400/70 text-sm mt-1">{data.throneLevel.description}</p>
            
            <div className="flex gap-4 mt-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{data.totalSmokes}</div>
                <div className="text-amber-400/70">Smokes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{data.stats.uniqueBrands}</div>
                <div className="text-amber-400/70">Brands</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{daysSinceJoin}</div>
                <div className="text-amber-400/70">Days</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Brand Reigns */}
        {data.brandReigns.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>🏰</span> Your Brand Reigns
            </h3>
            <div className="space-y-2">
              {data.brandReigns.map((reign, i) => (
                <motion.div
                  key={reign.brand}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    reign.isChampion 
                      ? "bg-gradient-to-r from-amber-500/30 to-yellow-500/20 border border-amber-500/50" 
                      : "bg-white/5 border border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`text-2xl ${reign.isChampion ? "animate-pulse" : ""}`}>
                      {reign.isChampion ? "👑" : reign.rank === 2 ? "🥈" : reign.rank === 3 ? "🥉" : "🎖️"}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{reign.brand}</div>
                      <div className="text-xs text-amber-400/70">
                        {reign.isChampion ? "Champion!" : `#${reign.rank} smoker`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-amber-300">{reign.yourCount}</div>
                    <div className="text-xs text-gray-500">of {reign.totalCount} total</div>
                  </div>
                </motion.div>
              ))}
            </div>
            {data.brandReigns.filter(r => r.isChampion).length === 0 && (
              <p className="text-amber-400/50 text-sm mt-2 text-center">
                Keep smoking to claim a brand throne! 👑
              </p>
            )}
          </motion.section>
        )}

        {/* Personal Records */}
        {data.records.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>🏆</span> Personal Records
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {data.records.map((record, i) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-3"
                >
                  <div className="text-2xl mb-1">{record.emoji}</div>
                  <div className="text-xs text-amber-400/70 mb-1">{record.name}</div>
                  <div className="font-semibold text-white text-sm truncate">{record.value}</div>
                  {record.detail && (
                    <div className="text-xs text-gray-500 mt-0.5">{record.detail}</div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Stats Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <span>📊</span> Your Stats
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <FiStar className="mx-auto text-amber-400 mb-1" />
              <div className="text-xl font-bold text-white">{data.stats.avgRating || "-"}</div>
              <div className="text-xs text-gray-500">Avg Rating</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <FiZap className="mx-auto text-yellow-400 mb-1" />
              <div className="text-xl font-bold text-white">{data.stats.currentStreak}</div>
              <div className="text-xs text-gray-500">Streak</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <FiAward className="mx-auto text-purple-400 mb-1" />
              <div className="text-xl font-bold text-white">{data.badgeCount}</div>
              <div className="text-xs text-gray-500">Badges</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <FiTarget className="mx-auto text-green-400 mb-1" />
              <div className="text-xl font-bold text-white">{data.stats.fiveStarCount}</div>
              <div className="text-xs text-gray-500">5-Star</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <FiMoon className="mx-auto text-indigo-400 mb-1" />
              <div className="text-xl font-bold text-white">{data.stats.nightOwlSmokes}</div>
              <div className="text-xs text-gray-500">Night</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <FiSun className="mx-auto text-orange-400 mb-1" />
              <div className="text-xl font-bold text-white">{data.stats.weekendSmokes}</div>
              <div className="text-xs text-gray-500">Weekend</div>
            </div>
          </div>
        </motion.section>

        {/* Throne Level Progress */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <span>🎯</span> Throne Level
          </h3>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl">{data.throneLevel.emoji}</div>
              <div>
                <div className="font-semibold text-white">{data.throneLevel.name}</div>
                <div className="text-sm text-gray-400">{data.throneLevel.description}</div>
              </div>
            </div>
            
            {/* Level progression */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>🌱 Newcomer</span>
                <span>⭐ Rising</span>
                <span>🔥 Enthusiast</span>
                <span>🎩 Aficionado</span>
                <span>👑 Royalty</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ 
                    width: data.throneLevel.name === "Smoke Royalty" ? "100%" :
                           data.throneLevel.name === "Aficionado" ? "80%" :
                           data.throneLevel.name === "Enthusiast" ? "60%" :
                           data.throneLevel.name === "Rising Star" ? "40%" :
                           "20%"
                  }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Empty state encouragement */}
        {data.totalSmokes < 5 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center py-6"
          >
            <div className="text-4xl mb-3">🚀</div>
            <p className="text-amber-300">
              Keep logging smokes to build your legacy!
            </p>
            <Link 
              href="/dashboard"
              className="inline-block mt-3 px-4 py-2 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors"
            >
              Log a Smoke
            </Link>
          </motion.div>
        )}
      </div>
    </main>
  );
}
