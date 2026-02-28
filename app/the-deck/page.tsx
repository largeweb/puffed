"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiHome,
  FiRefreshCw,
  FiClock,
  FiAward,
  FiUsers,
  FiStar,
  FiSun,
  FiWind,
  FiInfo,
} from "react-icons/fi";

interface Vibe {
  hour: number;
  vibe: string;
  emoji: string;
  desc: string;
}

interface DeckSmoker {
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
  deckSmokes: number;
  avgRating: number;
  topBrand: string | null;
}

interface DeckData {
  isDeckTime: boolean;
  isWeekend: boolean;
  currentHour: number;
  timeMessage: string;
  deckMood: string;
  currentVibe: Vibe;
  allVibes: Vibe[];
  todayWeather: string;
  currentDeckSmokers: DeckSmoker[];
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
  } | null;
  deckFact: string;
}

export default function TheDeckPage() {
  const router = useRouter();
  const [data, setData] = useState<DeckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"vibes" | "smokers" | "leaderboard">("smokers");
  const [breeze, setBreeze] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/the-deck");
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error("Failed to fetch deck data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Occasional breeze animation
    const breezeInterval = setInterval(() => {
      setBreeze(true);
      setTimeout(() => setBreeze(false), 2000);
    }, 8000);
    return () => clearInterval(breezeInterval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-5xl"
        >
          🪑
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <p className="text-amber-700">Failed to load deck data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Wooden deck pattern overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            #8B4513 0px,
            #8B4513 2px,
            transparent 2px,
            transparent 40px
          )`,
        }}
      />

      {/* Floating leaves when breeze happens */}
      <AnimatePresence>
        {breeze && (
          <>
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: -20, y: Math.random() * 300, opacity: 0, rotate: 0 }}
                animate={{ 
                  x: window.innerWidth + 50, 
                  y: Math.random() * 300 + 100,
                  opacity: [0, 1, 1, 0],
                  rotate: 360,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 3, delay: i * 0.3, ease: "easeInOut" }}
                className="absolute text-2xl pointer-events-none"
              >
                🍃
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Sun glow effect */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-radial from-yellow-300/30 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard" className="text-amber-700 hover:text-amber-900">
            <FiHome className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ rotate: 180 }}
              onClick={fetchData}
              className="text-amber-700 hover:text-amber-900"
            >
              <FiRefreshCw className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl">🪑</span>
            <h1 className="text-3xl font-bold text-amber-900">The Deck</h1>
            <span className="text-4xl">☀️</span>
          </div>
          <p className="text-amber-700">Your afternoon smoking sanctuary</p>
          <p className="text-sm text-amber-600 mt-1">Open daily 12 PM - 7 PM</p>
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-2xl p-6 mb-6 shadow-lg ${
            data.isDeckTime
              ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
              : "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700"
          }`}
        >
          <div className="text-center">
            <motion.div
              animate={data.isDeckTime ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl mb-3"
            >
              {data.isDeckTime ? data.currentVibe.emoji : "🌙"}
            </motion.div>
            <h2 className="text-2xl font-bold mb-1">
              {data.isDeckTime ? data.currentVibe.vibe : "Deck Closed"}
            </h2>
            <p className={data.isDeckTime ? "text-amber-100" : "text-gray-600"}>
              {data.isDeckTime ? data.currentVibe.desc : data.timeMessage}
            </p>
            {data.isDeckTime && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-amber-100">
                <FiClock className="w-4 h-4" />
                <span>{data.timeMessage}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Weather */}
        {data.isDeckTime && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 mb-6 text-amber-800"
          >
            <FiWind className="w-4 h-4" />
            <span>{data.todayWeather}</span>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "smokers" as const, label: "On Deck", icon: FiUsers },
            { id: "vibes" as const, label: "Vibes", icon: FiSun },
            { id: "leaderboard" as const, label: "Legends", icon: FiAward },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? "bg-amber-500 text-white shadow-lg"
                  : "bg-white/80 text-amber-700 hover:bg-white"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "smokers" && (
            <motion.div
              key="smokers"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {data.currentDeckSmokers.length === 0 ? (
                <div className="bg-white/80 backdrop-blur rounded-xl p-8 text-center">
                  <div className="text-4xl mb-3">🪑</div>
                  <p className="text-amber-700 font-medium">The deck is empty</p>
                  <p className="text-amber-600 text-sm">Be the first to pull up a chair today!</p>
                  <Link
                    href="/log"
                    className="inline-block mt-4 px-6 py-2 bg-amber-500 text-white rounded-full font-medium hover:bg-amber-600 transition-colors"
                  >
                    Log a Smoke
                  </Link>
                </div>
              ) : (
                data.currentDeckSmokers.map((smoker, idx) => (
                  <motion.div
                    key={smoker.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white/90 backdrop-blur rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      {smoker.photoUrl ? (
                        <img
                          src={smoker.photoUrl}
                          alt={smoker.brand}
                          className="w-14 h-14 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-amber-100 flex items-center justify-center text-2xl">
                          🪑
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/user/${smoker.username}`}
                            className="font-semibold text-amber-900 hover:underline"
                          >
                            {smoker.username}
                          </Link>
                          <span className="text-xs text-amber-500">{smoker.time}</span>
                        </div>
                        <Link
                          href={`/checkin/${smoker.id}`}
                          className="text-amber-700 hover:text-amber-900 block"
                        >
                          <span className="font-medium">{smoker.brand}</span>
                          {smoker.product && (
                            <span className="text-amber-600"> · {smoker.product}</span>
                          )}
                        </Link>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <FiStar
                              key={i}
                              className={`w-3 h-3 ${
                                i < smoker.rating ? "text-amber-500 fill-amber-500" : "text-amber-200"
                              }`}
                            />
                          ))}
                        </div>
                        {smoker.review && (
                          <p className="text-sm text-amber-600 mt-1 line-clamp-2">{smoker.review}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "vibes" && (
            <motion.div
              key="vibes"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="bg-white/90 backdrop-blur rounded-xl p-5">
                <h3 className="font-semibold text-amber-900 mb-4 flex items-center gap-2">
                  <FiSun className="w-5 h-5" />
                  Afternoon Schedule
                </h3>
                <div className="space-y-2">
                  {data.allVibes.map((vibe) => (
                    <div
                      key={vibe.hour}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        data.currentHour === vibe.hour
                          ? "bg-amber-100 border border-amber-300"
                          : "bg-amber-50/50"
                      }`}
                    >
                      <span className="text-2xl">{vibe.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-amber-900">{vibe.vibe}</span>
                          {data.currentHour === vibe.hour && (
                            <span className="text-xs px-2 py-0.5 bg-amber-500 text-white rounded-full">
                              NOW
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-amber-600">{vibe.desc}</span>
                      </div>
                      <span className="text-sm text-amber-500">
                        {vibe.hour > 12 ? vibe.hour - 12 : vibe.hour} PM
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deck Fact */}
              <div className="bg-amber-100/80 backdrop-blur rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <FiInfo className="w-5 h-5 text-amber-700 mt-0.5" />
                  <div>
                    <span className="font-medium text-amber-800">Deck Wisdom:</span>
                    <p className="text-amber-700 text-sm mt-1">{data.deckFact}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "leaderboard" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="bg-white/90 backdrop-blur rounded-xl p-5">
                <h3 className="font-semibold text-amber-900 mb-4 flex items-center gap-2">
                  <FiAward className="w-5 h-5" />
                  Deck Legends
                </h3>
                {data.leaderboard.length === 0 ? (
                  <p className="text-center text-amber-600 py-4">
                    No deck legends yet. Be the first!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.leaderboard.map((entry, idx) => (
                      <motion.div
                        key={entry.username}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-amber-50/50"
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            idx === 0
                              ? "bg-yellow-400 text-yellow-900"
                              : idx === 1
                              ? "bg-gray-300 text-gray-700"
                              : idx === 2
                              ? "bg-orange-400 text-orange-900"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {idx === 0 ? "👑" : idx + 1}
                        </div>
                        <div className="flex-1">
                          <Link
                            href={`/user/${entry.username}`}
                            className="font-medium text-amber-900 hover:underline"
                          >
                            {entry.username}
                          </Link>
                          {entry.topBrand && (
                            <p className="text-xs text-amber-600">Fave: {entry.topBrand}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-amber-900">{entry.deckSmokes}</div>
                          <div className="text-xs text-amber-500">deck smokes</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Platform Stats */}
              <div className="bg-white/90 backdrop-blur rounded-xl p-5">
                <h3 className="font-semibold text-amber-900 mb-4">📊 Deck Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-900">{data.stats.totalSmokes}</div>
                    <div className="text-xs text-amber-600">Total Deck Smokes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-900">{data.stats.uniqueSmokers}</div>
                    <div className="text-xs text-amber-600">Deck Visitors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-900">
                      {data.stats.avgRating || "—"}⭐
                    </div>
                    <div className="text-xs text-amber-600">Avg Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-900 truncate">
                      {data.stats.topBrand || "—"}
                    </div>
                    <div className="text-xs text-amber-600">Top Brand</div>
                  </div>
                </div>
              </div>

              {/* My Stats */}
              {data.myStats && (
                <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl p-5 text-white">
                  <h3 className="font-semibold mb-4">🪑 Your Deck Stats</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{data.myStats.totalSmokes}</div>
                      <div className="text-xs text-amber-100">Deck Smokes</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {Math.round(data.myStats.avgRating * 10) / 10}⭐
                      </div>
                      <div className="text-xs text-amber-100">Avg Rating</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold truncate">
                        {data.myStats.favoriteBrand || "—"}
                      </div>
                      <div className="text-xs text-amber-100">Fave Brand</div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA if not deck time */}
        {!data.isDeckTime && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 text-center"
          >
            <p className="text-amber-700 mb-4">
              {data.deckMood === "anticipation"
                ? "Morning smoke? Check these out:"
                : "Evening smoke? Try these:"}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href={data.deckMood === "anticipation" ? "/coffee" : "/nightcap"}
                className="px-4 py-2 bg-amber-500 text-white rounded-full text-sm font-medium hover:bg-amber-600 transition-colors"
              >
                {data.deckMood === "anticipation" ? "☕ Coffee Lounge" : "🌙 Nightcap Club"}
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-white text-amber-700 rounded-full text-sm font-medium hover:bg-amber-100 transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </motion.div>
        )}

        {/* Weekend bonus */}
        {data.isWeekend && data.isDeckTime && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-200/50 rounded-full text-amber-800 text-sm">
              <span>🎉</span>
              <span>Weekend Deck Session!</span>
              <span>🪑</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
