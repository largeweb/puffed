"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft,
  FiSun,
  FiCoffee,
  FiStar,
  FiAward,
  FiClock,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";

interface EarlyRiser {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  image_url?: string;
  minutesAgo: number;
}

interface WeekendStats {
  totalWeekendMornings: number;
  yourWeekendMornings: number;
  peakHour: number;
  topBrand: string | null;
  earlyBirdStreak: number;
}

interface WeekendChampion {
  username: string;
  count: number;
  favoriteBrand: string | null;
}

interface Recommendation {
  brand: string;
  product?: string;
  avgRating: number;
  count: number;
}

interface Vibes {
  emoji: string;
  message: string;
  mood: string;
}

interface WakeBakeData {
  username: string;
  isWeekend: boolean;
  isWakeBakeTime: boolean;
  currentHour: number;
  dayOfWeek: number;
  earlyRisers: EarlyRiser[];
  stats: WeekendStats;
  champions: WeekendChampion[];
  recommendations: Recommendation[];
  vibes: Vibes;
}

const MEDAL_EMOJIS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function WakeBakePage() {
  const router = useRouter();
  const [data, setData] = useState<WakeBakeData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/wake-bake", { credentials: "include" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const result = (await res.json()) as WakeBakeData;
      setData(result);
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 via-orange-800 to-yellow-600 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <FiSun className="w-12 h-12 text-yellow-200" />
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 via-orange-800 to-yellow-600 flex items-center justify-center">
        <p className="text-yellow-200">Failed to load</p>
      </div>
    );
  }

  const getMoodGradient = (mood: string) => {
    switch (mood) {
      case "twilight":
        return "from-indigo-900 via-purple-800 to-orange-700";
      case "dawn":
        return "from-purple-800 via-orange-700 to-yellow-500";
      case "golden":
        return "from-orange-700 via-amber-600 to-yellow-500";
      case "warm":
        return "from-amber-600 via-yellow-500 to-orange-400";
      case "bright":
        return "from-yellow-500 via-orange-400 to-amber-500";
      default:
        return "from-amber-500 via-yellow-400 to-orange-400";
    }
  };

  const gradient = getMoodGradient(data.vibes.mood);

  return (
    <div className={`min-h-screen bg-gradient-to-b ${gradient} p-4 pb-24`}>
      {/* Animated sun rays */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-0 left-1/2 w-1 h-full bg-gradient-to-b from-yellow-200/10 to-transparent origin-top"
            style={{ rotate: `${i * 45}deg`, transformOrigin: "50% 0%" }}
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
      </div>

      <div className="max-w-lg mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard" className="text-yellow-100 hover:text-white">
            <FiArrowLeft className="w-6 h-6" />
          </Link>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-4xl"
          >
            🌞
          </motion.div>
          <div className="w-6" />
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Wake & Bake</h1>
          <p className="text-yellow-100/80 text-sm">
            {DAY_NAMES[data.dayOfWeek]} Morning Ritual
          </p>
        </motion.div>

        {/* Vibes Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-yellow-200/20"
        >
          <div className="text-center">
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl mb-3"
            >
              {data.vibes.emoji}
            </motion.div>
            <p className="text-white text-lg font-medium mb-1">
              Good morning, {data.username}!
            </p>
            <p className="text-yellow-100/80 text-sm italic">
              &ldquo;{data.vibes.message}&rdquo;
            </p>
          </div>
        </motion.div>

        {/* Not Weekend Warning */}
        {!data.isWeekend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-amber-900/50 rounded-xl p-4 mb-6 border border-amber-500/30 text-center"
          >
            <p className="text-amber-200 text-sm">
              🗓️ Wake & Bake is best enjoyed on weekend mornings (5-10 AM)
            </p>
            <p className="text-amber-300/70 text-xs mt-1">
              Come back Saturday or Sunday!
            </p>
          </motion.div>
        )}

        {/* Early Risers - Today's Smokers */}
        {data.earlyRisers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 mb-6 border border-yellow-200/20"
          >
            <div className="flex items-center gap-2 mb-4">
              <FiSun className="w-5 h-5 text-yellow-200" />
              <h2 className="text-lg font-semibold text-white">
                Today&apos;s Early Risers
              </h2>
            </div>
            <div className="space-y-3">
              {data.earlyRisers.slice(0, 5).map((riser, i) => (
                <Link
                  key={i}
                  href={`/user/${riser.username}`}
                  className="flex items-center gap-3 bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors"
                >
                  {riser.image_url ? (
                    <img
                      src={riser.image_url}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/30 flex items-center justify-center">
                      <FiCoffee className="w-5 h-5 text-yellow-200" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {riser.username}
                    </p>
                    <p className="text-yellow-200/70 text-xs truncate">
                      {riser.brand}
                      {riser.product && ` - ${riser.product}`}
                    </p>
                  </div>
                  <div className="text-right">
                    {riser.rating && (
                      <div className="flex items-center gap-1 text-yellow-200">
                        <FiStar className="w-3 h-3" />
                        <span className="text-xs">{riser.rating}</span>
                      </div>
                    )}
                    <p className="text-yellow-100/50 text-xs">
                      {riser.minutesAgo}m ago
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Your Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 mb-6 border border-yellow-200/20"
        >
          <div className="flex items-center gap-2 mb-4">
            <FiTrendingUp className="w-5 h-5 text-yellow-200" />
            <h2 className="text-lg font-semibold text-white">Your Morning Stats</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">
                {data.stats.yourWeekendMornings}
              </p>
              <p className="text-yellow-200/70 text-xs">Weekend Mornings</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">
                {data.stats.earlyBirdStreak}
              </p>
              <p className="text-yellow-200/70 text-xs">This Month</p>
            </div>
          </div>
        </motion.div>

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 mb-6 border border-yellow-200/20"
          >
            <div className="flex items-center gap-2 mb-4">
              <FiCoffee className="w-5 h-5 text-yellow-200" />
              <h2 className="text-lg font-semibold text-white">
                Perfect for Your Morning
              </h2>
            </div>
            <div className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <Link
                  key={i}
                  href={`/cigar/${encodeURIComponent(rec.brand)}`}
                  className="flex items-center justify-between bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors"
                >
                  <div>
                    <p className="text-white font-medium">{rec.brand}</p>
                    {rec.product && (
                      <p className="text-yellow-200/70 text-xs">{rec.product}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-yellow-200">
                    <FiStar className="w-3 h-3" />
                    <span className="text-sm">{rec.avgRating.toFixed(1)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Weekend Morning Champions */}
        {data.champions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 mb-6 border border-yellow-200/20"
          >
            <div className="flex items-center gap-2 mb-4">
              <FiAward className="w-5 h-5 text-yellow-200" />
              <h2 className="text-lg font-semibold text-white">
                Wake & Bake Champions
              </h2>
            </div>
            <div className="space-y-2">
              {data.champions.map((champ, i) => (
                <Link
                  key={i}
                  href={`/user/${champ.username}`}
                  className="flex items-center justify-between bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{MEDAL_EMOJIS[i]}</span>
                    <div>
                      <p className="text-white font-medium">{champ.username}</p>
                      {champ.favoriteBrand && (
                        <p className="text-yellow-200/70 text-xs">
                          Loves {champ.favoriteBrand}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{champ.count}</p>
                    <p className="text-yellow-200/70 text-xs">mornings</p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Platform Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 mb-6 border border-yellow-200/20"
        >
          <div className="flex items-center gap-2 mb-4">
            <FiUsers className="w-5 h-5 text-yellow-200" />
            <h2 className="text-lg font-semibold text-white">Community Mornings</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-white">
                {data.stats.totalWeekendMornings}
              </p>
              <p className="text-yellow-200/70 text-xs">Total Wake & Bakes</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-white">
                {data.stats.peakHour}:00
              </p>
              <p className="text-yellow-200/70 text-xs">Peak Hour</p>
            </div>
            {data.stats.topBrand && (
              <div className="col-span-2 bg-white/5 rounded-xl p-4 text-center">
                <p className="text-yellow-200/70 text-xs mb-1">Most Popular</p>
                <p className="text-lg font-bold text-white">
                  {data.stats.topBrand}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-2 gap-3"
        >
          <Link
            href="/coffee"
            className="bg-amber-800/50 rounded-xl p-4 text-center hover:bg-amber-800/70 transition-colors border border-amber-500/30"
          >
            <span className="text-2xl mb-2 block">☕</span>
            <p className="text-white text-sm font-medium">Coffee Lounge</p>
          </Link>
          <Link
            href="/saturday-cartoons"
            className="bg-fuchsia-800/50 rounded-xl p-4 text-center hover:bg-fuchsia-800/70 transition-colors border border-fuchsia-500/30"
          >
            <span className="text-2xl mb-2 block">📺</span>
            <p className="text-white text-sm font-medium">Saturday Cartoons</p>
          </Link>
          <Link
            href="/first-light"
            className="bg-orange-800/50 rounded-xl p-4 text-center hover:bg-orange-800/70 transition-colors border border-orange-500/30"
          >
            <span className="text-2xl mb-2 block">☀️</span>
            <p className="text-white text-sm font-medium">First Light</p>
          </Link>
          <Link
            href="/checkin/new"
            className="bg-green-800/50 rounded-xl p-4 text-center hover:bg-green-800/70 transition-colors border border-green-500/30"
          >
            <span className="text-2xl mb-2 block">🌿</span>
            <p className="text-white text-sm font-medium">Log Smoke</p>
          </Link>
        </motion.div>

        {/* Footer Quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-8 mb-4"
        >
          <p className="text-yellow-200/60 text-xs italic">
            &ldquo;The best time for a smoke is when you make time for it.&rdquo;
          </p>
        </motion.div>
      </div>
    </div>
  );
}
