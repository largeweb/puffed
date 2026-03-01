"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  FiHome,
  FiRefreshCw,
  FiUsers,
  FiAward,
  FiStar,
  FiMapPin,
  FiMoon,
} from "react-icons/fi";

interface CityVibes {
  skyline: string;
  emoji: string;
  mood: string;
  desc: string;
}

interface RooftopSmoker {
  id: number;
  username: string;
  brand: string;
  product: string | null;
  rating: number;
  photoUrl: string | null;
  review: string | null;
  time: string;
}

interface LeaderboardEntry {
  username: string;
  rooftopSmokes: number;
  avgRating: number;
  topBrand: string | null;
}

interface RooftopData {
  isRooftopOpen: boolean;
  currentHour: number;
  dayOfWeek: number;
  cityVibes: CityVibes;
  rooftopTip: string;
  currentSmokers: RooftopSmoker[];
  leaderboard: LeaderboardEntry[];
  stats: {
    totalSmokes: number;
    uniqueSmokers: number;
    avgRating: number;
    topBrand: string | null;
  };
  myStats: {
    totalSmokes: number;
    avgRating: number;
    favoriteBrand: string | null;
    username: string | null;
  } | null;
}

// Animated city building component
function CityBuilding({ height, delay, left }: { height: number; delay: number; left: string }) {
  return (
    <motion.div
      className="absolute bottom-0"
      style={{ left, width: "30px" }}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height, opacity: 1 }}
      transition={{ delay, duration: 0.8, ease: "easeOut" }}
    >
      <div 
        className="w-full bg-gradient-to-t from-slate-800 to-slate-700 rounded-t-sm relative"
        style={{ height: `${height}px` }}
      >
        {/* Windows */}
        <div className="absolute inset-1 grid grid-cols-2 gap-0.5">
          {Array.from({ length: Math.floor(height / 12) }).map((_, i) => (
            <motion.div
              key={i}
              className="bg-yellow-400/70 rounded-[1px]"
              style={{ height: "6px" }}
              animate={{
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 2 + Math.random() * 3,
                delay: Math.random() * 2,
                repeat: Infinity,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// City skyline background
function CitySkyline() {
  const buildings = [
    { height: 80, left: "5%" },
    { height: 120, left: "12%" },
    { height: 60, left: "20%" },
    { height: 150, left: "28%" },
    { height: 100, left: "36%" },
    { height: 180, left: "44%" },
    { height: 90, left: "52%" },
    { height: 130, left: "60%" },
    { height: 70, left: "68%" },
    { height: 110, left: "76%" },
    { height: 140, left: "84%" },
    { height: 85, left: "92%" },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 h-48 overflow-hidden pointer-events-none">
      {buildings.map((b, i) => (
        <CityBuilding key={i} height={b.height} delay={i * 0.1} left={b.left} />
      ))}
    </div>
  );
}

// Stars background
function StarsBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 60}%`,
          }}
          animate={{
            opacity: [0.2, 1, 0.2],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 3,
            repeat: Infinity,
          }}
        />
      ))}
    </div>
  );
}

export default function RooftopPage() {
  const [data, setData] = useState<RooftopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"view" | "crowd" | "vips">("crowd");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/rooftop");
      if (res.ok) {
        const result = (await res.json()) as RooftopData;
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch rooftop data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-4xl"
        >
          🌃
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center text-white">
        <p>Failed to load rooftop data</p>
      </div>
    );
  }

  const moodColors: Record<string, string> = {
    magical: "from-amber-500/20 to-orange-500/20",
    electric: "from-cyan-500/20 to-blue-500/20",
    intimate: "from-purple-500/20 to-pink-500/20",
    exclusive: "from-indigo-500/20 to-violet-500/20",
    waiting: "from-slate-500/20 to-gray-500/20",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
      {/* Background effects */}
      <StarsBackground />
      <CitySkyline />
      
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-amber-500/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
            <FiHome size={24} />
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>🌃</span> The Rooftop
          </h1>
          <button
            onClick={fetchData}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <FiRefreshCw size={20} />
          </button>
        </div>

        {/* City Vibes Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl bg-gradient-to-br ${moodColors[data.cityVibes.mood] || moodColors.waiting} border border-white/10 p-6 mb-6`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-3xl mb-2">{data.cityVibes.emoji}</div>
              <h2 className="text-xl font-semibold">{data.cityVibes.skyline}</h2>
              <p className="text-slate-400 text-sm mt-1">{data.cityVibes.desc}</p>
            </div>
            {data.isRooftopOpen && (
              <div className="bg-green-500/20 border border-green-500/30 px-3 py-1 rounded-full text-green-400 text-sm">
                Open Now
              </div>
            )}
          </div>
          
          {/* Rooftop Tip */}
          <div className="bg-white/5 rounded-lg p-3 mt-4">
            <p className="text-sm text-slate-300 italic">💫 {data.rooftopTip}</p>
          </div>
        </motion.div>

        {/* Your Stats Card */}
        {data.myStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4 mb-6"
          >
            <h3 className="font-semibold text-amber-400 mb-3 flex items-center gap-2">
              <FiMapPin /> Your Rooftop Status
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-2xl font-bold">{data.myStats.totalSmokes}</div>
                <div className="text-xs text-slate-400">Rooftop Smokes</div>
              </div>
              <div>
                <div className="text-2xl font-bold">⭐ {data.myStats.avgRating || "-"}</div>
                <div className="text-xs text-slate-400">Avg Rating</div>
              </div>
              <div>
                <div className="text-lg font-semibold truncate">{data.myStats.favoriteBrand || "-"}</div>
                <div className="text-xs text-slate-400">Go-To Brand</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "crowd", label: "Tonight", icon: FiUsers },
            { id: "vips", label: "VIP List", icon: FiAward },
            { id: "view", label: "Stats", icon: FiStar },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all ${
                activeTab === tab.id
                  ? "bg-white/10 text-white border border-white/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Tonight's Crowd */}
          {activeTab === "crowd" && (
            <motion.div
              key="crowd"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {data.currentSmokers.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FiMoon size={48} className="mx-auto mb-4 opacity-50" />
                  <p>The rooftop is quiet tonight</p>
                  <p className="text-sm mt-2">Be the first to light up!</p>
                </div>
              ) : (
                data.currentSmokers.map((smoker, i) => (
                  <motion.div
                    key={smoker.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link
                          href={`/user/${smoker.username}`}
                          className="font-semibold text-amber-400 hover:underline"
                        >
                          @{smoker.username}
                        </Link>
                        <div className="text-sm text-slate-300 mt-1">
                          {smoker.brand}
                          {smoker.product && (
                            <span className="text-slate-500"> • {smoker.product}</span>
                          )}
                        </div>
                        {smoker.review && (
                          <p className="text-sm text-slate-400 mt-2 line-clamp-2 italic">
                            &ldquo;{smoker.review}&rdquo;
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-yellow-400">{"⭐".repeat(smoker.rating)}</div>
                        <div className="text-xs text-slate-500 mt-1">{smoker.time}</div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* VIP List (Leaderboard) */}
          {activeTab === "vips" && (
            <motion.div
              key="vips"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              <p className="text-sm text-slate-400 mb-4">
                The rooftop regulars - earning their spot on the VIP list
              </p>
              {data.leaderboard.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FiAward size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No VIPs yet</p>
                  <p className="text-sm mt-2">Start smoking to claim your spot!</p>
                </div>
              ) : (
                data.leaderboard.map((entry, i) => (
                  <motion.div
                    key={entry.username}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`bg-white/5 backdrop-blur-sm rounded-xl p-4 border transition-colors ${
                      i === 0
                        ? "border-amber-500/30 bg-amber-500/10"
                        : i === 1
                        ? "border-slate-400/30 bg-slate-400/5"
                        : i === 2
                        ? "border-orange-700/30 bg-orange-900/10"
                        : "border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </div>
                      <div className="flex-1">
                        <Link
                          href={`/user/${entry.username}`}
                          className="font-semibold text-white hover:text-amber-400 transition-colors"
                        >
                          @{entry.username}
                        </Link>
                        <div className="text-sm text-slate-400">
                          {entry.rooftopSmokes} rooftop smokes • ⭐ {entry.avgRating || "-"}
                        </div>
                      </div>
                      {entry.topBrand && (
                        <div className="text-xs text-slate-500 text-right">
                          Favorite:<br />{entry.topBrand}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* Platform Stats */}
          {activeTab === "view" && (
            <motion.div
              key="view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
                  <div className="text-3xl font-bold text-amber-400">
                    {data.stats.totalSmokes}
                  </div>
                  <div className="text-sm text-slate-400">Total Rooftop Smokes</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
                  <div className="text-3xl font-bold text-cyan-400">
                    {data.stats.uniqueSmokers}
                  </div>
                  <div className="text-sm text-slate-400">VIP Members</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
                  <div className="text-3xl font-bold text-yellow-400">
                    ⭐ {data.stats.avgRating || "-"}
                  </div>
                  <div className="text-sm text-slate-400">Avg Rating</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
                  <div className="text-xl font-semibold text-purple-400 truncate">
                    {data.stats.topBrand || "-"}
                  </div>
                  <div className="text-sm text-slate-400">Top Brand</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl p-5 border border-indigo-500/20 mt-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  🌃 The Rooftop Experience
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  High above the city, where the lights become stars and the noise becomes music.
                  The rooftop is open from 6 PM to 2 AM for those who appreciate the finer things.
                </p>
                <div className="mt-4 text-xs text-slate-500">
                  Hours: 6:00 PM - 2:00 AM • Dress code: Relaxed elegance
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Related Pages */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-sm text-slate-500 mb-3">More evening vibes:</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/patio"
              className="text-sm bg-white/5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              🪴 The Patio
            </Link>
            <Link
              href="/nightcap"
              className="text-sm bg-white/5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              🌙 Nightcap Club
            </Link>
            <Link
              href="/happy-hour"
              className="text-sm bg-white/5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              🍻 Happy Hour
            </Link>
            <Link
              href="/saturday-night"
              className="text-sm bg-white/5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              🎉 Saturday Night
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
