"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  FiArrowLeft, FiSun, FiCalendar, FiUsers, FiTrendingUp, 
  FiClock, FiStar, FiAward, FiZap, FiCoffee
} from "react-icons/fi";

interface WeekendData {
  isWeekend: boolean;
  daysUntilWeekend: number;
  dayOfWeek: number;
  prediction: string;
  userPattern: {
    peakHour: string | null;
    peakHourRaw: number | null;
    favoriteWeekendBrands: Array<{ brand: string; count: number }>;
    weekendStreak: number;
  };
  community: {
    weekendWarriors: Array<{ username: string; checkins: number; topBrand: string | null }>;
    lastWeekendTopBrand: string | null;
    lastWeekendCount: number;
  };
  tips: string[];
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function WeekendPage() {
  const router = useRouter();
  const [data, setData] = useState<WeekendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/weekend-preview", { credentials: "include" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const result = await res.json() as WeekendData;
      setData(result);
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"
        />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Failed to load weekend preview</p>
          <button onClick={loadData} className="text-emerald-400 hover:underline">
            Try again
          </button>
        </div>
      </main>
    );
  }

  const countdownText = data.isWeekend 
    ? "🎉 It's the weekend!" 
    : data.daysUntilWeekend === 1 
      ? "Tomorrow!"
      : `${data.daysUntilWeekend} days away`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950/20 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600/20 via-teal-500/20 to-emerald-600/20 border-b border-emerald-500/20">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-3 mb-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <FiArrowLeft className="text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                🌴 Weekend Warmup
              </h1>
              <p className="text-sm text-emerald-200/70">
                {DAY_NAMES[data.dayOfWeek]} • {countdownText}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Countdown / Celebration Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 text-center overflow-hidden relative"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10" />
          
          <div className="relative">
            {data.isWeekend ? (
              <>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl mb-4"
                >
                  🎉
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Weekend Mode: Active
                </h2>
                <p className="text-emerald-300">{data.prediction}</p>
              </>
            ) : (
              <>
                <div className="flex justify-center gap-4 mb-4">
                  {[...Array(data.daysUntilWeekend)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center text-2xl"
                    >
                      {i === data.daysUntilWeekend - 1 ? "🎉" : "📅"}
                    </motion.div>
                  ))}
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {data.daysUntilWeekend === 1 
                    ? "Almost There!" 
                    : data.daysUntilWeekend === 2 
                      ? "The Countdown Begins..." 
                      : "Weekend Incoming"}
                </h2>
                <p className="text-emerald-300 mb-4">{data.prediction}</p>
                
                {/* Countdown display */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-full">
                  <FiCalendar className="text-emerald-400" />
                  <span className="text-white font-semibold">
                    {data.daysUntilWeekend} {data.daysUntilWeekend === 1 ? "day" : "days"} until Saturday
                  </span>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Your Weekend Pattern */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
            <FiClock className="text-emerald-400" />
            Your Weekend Patterns
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Peak Hour */}
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">⏰</div>
              <div className="text-white font-semibold">
                {data.userPattern.peakHour || "???"}
              </div>
              <div className="text-xs text-gray-400">Peak Hour</div>
            </div>
            
            {/* Weekend Streak */}
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">🔥</div>
              <div className="text-white font-semibold">
                {data.userPattern.weekendStreak}
              </div>
              <div className="text-xs text-gray-400">Weekends Active</div>
            </div>
          </div>

          {/* Favorite Weekend Brands */}
          {data.userPattern.favoriteWeekendBrands.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-2">Your Weekend Go-Tos:</div>
              <div className="flex flex-wrap gap-2">
                {data.userPattern.favoriteWeekendBrands.map((brand, i) => (
                  <Link
                    key={brand.brand}
                    href={`/cigar/${encodeURIComponent(brand.brand)}`}
                    className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-full text-sm flex items-center gap-1.5 hover:bg-emerald-500/30 transition"
                  >
                    {i === 0 && <FiStar className="text-amber-400" size={12} />}
                    {brand.brand}
                    <span className="text-emerald-400/60">×{brand.count}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {data.userPattern.favoriteWeekendBrands.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">No weekend patterns yet!</p>
              <p className="text-xs">Start smoking on weekends to build your profile</p>
            </div>
          )}
        </motion.div>

        {/* Weekend Warriors Leaderboard */}
        {data.community.weekendWarriors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-5"
          >
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
              <FiUsers className="text-emerald-400" />
              Weekend Warriors
            </h3>
            
            <div className="space-y-3">
              {data.community.weekendWarriors.map((warrior, i) => (
                <Link
                  key={warrior.username}
                  href={`/user/${warrior.username}`}
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                    {i === 0 ? "👑" : i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium">@{warrior.username}</div>
                    {warrior.topBrand && (
                      <div className="text-xs text-gray-400">Favorite: {warrior.topBrand}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-semibold">{warrior.checkins}</div>
                    <div className="text-xs text-gray-500">weekend smokes</div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Last Weekend's Top Brand */}
        {data.community.lastWeekendTopBrand && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-5"
          >
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-emerald-400" />
              Last Weekend's Champion
            </h3>
            
            <Link
              href={`/cigar/${encodeURIComponent(data.community.lastWeekendTopBrand)}`}
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl hover:from-emerald-500/20 hover:to-teal-500/20 transition"
            >
              <div className="text-4xl">🏆</div>
              <div>
                <div className="text-xl font-bold text-white">{data.community.lastWeekendTopBrand}</div>
                <div className="text-emerald-300 text-sm">
                  {data.community.lastWeekendCount} check-ins last weekend
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Weekend Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
            <FiZap className="text-amber-400" />
            Weekend Tips
          </h3>
          
          <ul className="space-y-3">
            {data.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                <span className="text-emerald-400 mt-0.5">
                  {i === 0 ? "📊" : i === 1 ? "🎯" : "💡"}
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 gap-3"
        >
          <Link
            href="/log"
            className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl text-white font-semibold hover:opacity-90 transition"
          >
            <FiSun />
            Log a Smoke
          </Link>
          <Link
            href="/roulette"
            className="flex items-center justify-center gap-2 p-4 bg-white/10 rounded-xl text-white font-semibold hover:bg-white/20 transition"
          >
            🎰 Lucky Cigar
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
