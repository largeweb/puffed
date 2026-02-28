"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FiArrowLeft, FiTrendingUp, FiTrendingDown, FiMinus,
  FiClock, FiUsers, FiStar, FiZap, FiSun, FiActivity
} from "react-icons/fi";

interface HalftimeStats {
  isWeekend: boolean;
  isHalftime: boolean;
  weekendProgress: number;
  hoursIn: number;
  hoursRemaining: number;
  saturdayCheckins: number;
  fridayNightCheckins: number;
  totalWeekendCheckins: number;
  activeSmokersToday: number;
  thisWeekendVsLast: number;
  saturdayVsFriday: number;
  currentMood: string;
  moodEmoji: string;
  avgRating: number;
  topBrandToday: string | null;
  peakHourToday: number | null;
  mvp: {
    username: string;
    checkins: number;
    avgRating: number;
    streak: number;
  } | null;
  topPerformers: Array<{
    username: string;
    checkins: number;
    stat: string;
  }>;
  prediction: {
    expectedCheckins: number;
    expectedPeak: string;
    vibeLevel: string;
  };
  yourStats?: {
    weekendCheckins: number;
    saturdayCheckins: number;
    rank: number;
    avgRating: number;
    momentum: "rising" | "steady" | "quiet";
  };
}

const TrendIndicator = ({ value }: { value: number }) => {
  if (value > 0) {
    return <span className="text-green-400 flex items-center gap-1"><FiTrendingUp /> +{value}%</span>;
  }
  if (value < 0) {
    return <span className="text-red-400 flex items-center gap-1"><FiTrendingDown /> {value}%</span>;
  }
  return <span className="text-gray-400 flex items-center gap-1"><FiMinus /> Even</span>;
};

const MomentumBadge = ({ momentum }: { momentum: "rising" | "steady" | "quiet" }) => {
  const config = {
    rising: { bg: "bg-green-500/20", text: "text-green-400", label: "🚀 Rising" },
    steady: { bg: "bg-amber-500/20", text: "text-amber-400", label: "⚡ Steady" },
    quiet: { bg: "bg-gray-500/20", text: "text-gray-400", label: "😴 Quiet" }
  };
  const c = config[momentum];
  return (
    <span className={`${c.bg} ${c.text} px-3 py-1 rounded-full text-sm font-medium`}>
      {c.label}
    </span>
  );
};

export default function WeekendHalftimePage() {
  const [data, setData] = useState<HalftimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("puffed_user");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setUserId(user.id);
      } catch {}
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const url = userId 
          ? `/api/weekend-halftime?userId=${userId}`
          : "/api/weekend-halftime";
        const res = await fetch(url);
        const json = await res.json() as HalftimeStats;
        setData(json);
      } catch (error) {
        console.error("Failed to load halftime stats:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-gray-950 to-teal-950 flex items-center justify-center">
        <div className="animate-pulse text-emerald-400">Loading halftime report...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-gray-950 to-teal-950 flex items-center justify-center">
        <div className="text-red-400">Failed to load halftime stats</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-gray-950 to-teal-950">
      {/* Animated halftime field lines */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute inset-x-0 top-1/2 h-1 bg-white/30 transform -translate-y-1/2" />
        <div className="absolute inset-y-0 left-1/2 w-1 bg-white/10 transform -translate-x-1/2" />
        <motion.div
          className="absolute w-20 h-20 border-2 border-white/20 rounded-full"
          style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4">
            <FiArrowLeft /> Back to Dashboard
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold text-white mb-2">
              🏈 Weekend Halftime
            </h1>
            <p className="text-emerald-400">Mid-Weekend Checkpoint</p>
            
            {data.isHalftime ? (
              <motion.div 
                className="mt-4 inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-5 py-2 rounded-full font-medium"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <FiZap className="animate-pulse" />
                <span>LIVE HALFTIME SHOW</span>
              </motion.div>
            ) : data.isWeekend ? (
              <div className="mt-4 inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-4 py-2 rounded-full">
                <FiClock />
                <span>Weekend in Progress</span>
              </div>
            ) : (
              <div className="mt-4 inline-flex items-center gap-2 bg-gray-700/50 text-gray-400 px-4 py-2 rounded-full">
                <FiClock />
                <span>Check back this weekend!</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Weekend Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/60 rounded-2xl p-5 border border-gray-800 mb-6"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">Weekend Progress</span>
            <span className="text-emerald-400 font-bold">{data.weekendProgress}%</span>
          </div>
          <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${data.weekendProgress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Fri 5pm</span>
            <span className="text-emerald-400">{data.hoursIn}h in · {data.hoursRemaining}h left</span>
            <span>Sun midnight</span>
          </div>
        </motion.div>

        {/* Community Pulse */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 rounded-2xl p-5 border border-emerald-700/30 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FiActivity className="text-emerald-400" />
              <h3 className="font-bold text-white">Community Pulse</h3>
            </div>
            <div className="text-3xl">{data.moodEmoji}</div>
          </div>
          
          <div className="text-center mb-4">
            <div className="text-2xl font-bold text-white">{data.currentMood}</div>
            <div className="text-emerald-400 text-sm">Current Vibe</div>
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold text-white">{data.totalWeekendCheckins}</div>
              <div className="text-xs text-gray-500">Smokes</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-teal-400">{data.activeSmokersToday}</div>
              <div className="text-xs text-gray-500">Active Today</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-amber-400">{data.avgRating ? data.avgRating.toFixed(1) : '-'}</div>
              <div className="text-xs text-gray-500">Avg Rating</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-400 truncate">{data.topBrandToday || '-'}</div>
              <div className="text-xs text-gray-500">Hot Brand</div>
            </div>
          </div>
        </motion.div>

        {/* Performance Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 gap-4 mb-6"
        >
          <div className="bg-gray-900/60 rounded-xl p-4 border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">vs Last Weekend</div>
            <div className="text-lg font-bold">
              <TrendIndicator value={data.thisWeekendVsLast} />
            </div>
          </div>
          <div className="bg-gray-900/60 rounded-xl p-4 border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Saturday vs Friday</div>
            <div className="text-lg font-bold">
              <TrendIndicator value={data.saturdayVsFriday} />
            </div>
          </div>
        </motion.div>

        {/* MVP Card */}
        {data.mvp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-amber-900/50 to-yellow-900/50 rounded-2xl p-5 border border-amber-600/40 mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🏆</span>
              <h3 className="font-bold text-white">Weekend MVP (So Far)</h3>
            </div>
            
            <Link href={`/user/${data.mvp.username}`} className="block">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-white">{data.mvp.username}</div>
                  <div className="text-amber-400 text-sm">{data.mvp.checkins} smokes · ⭐ {data.mvp.avgRating.toFixed(1)} avg</div>
                </div>
                <div className="text-right">
                  {data.mvp.streak > 0 && (
                    <div className="text-orange-400 text-sm">🔥 {data.mvp.streak} day streak</div>
                  )}
                </div>
              </div>
            </Link>
            
            {/* Runner ups */}
            {data.topPerformers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-amber-700/30">
                <div className="text-xs text-gray-400 mb-2">Also killing it:</div>
                <div className="flex flex-wrap gap-2">
                  {data.topPerformers.map((p, idx) => (
                    <Link 
                      key={p.username}
                      href={`/user/${p.username}`}
                      className="inline-flex items-center gap-1 bg-amber-950/50 px-3 py-1 rounded-full text-sm text-amber-300 hover:bg-amber-900/50 transition-colors"
                    >
                      {idx === 0 ? "🥈" : idx === 1 ? "🥉" : "👤"} {p.username}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Your Stats */}
        {data.yourStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-gray-900/60 rounded-2xl p-5 border border-gray-800 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FiStar className="text-emerald-400" />
                <h3 className="font-bold text-white">Your Halftime Report</h3>
              </div>
              <MomentumBadge momentum={data.yourStats.momentum} />
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{data.yourStats.weekendCheckins}</div>
                <div className="text-xs text-gray-500">Weekend</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-teal-400">{data.yourStats.saturdayCheckins}</div>
                <div className="text-xs text-gray-500">Saturday</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">#{data.yourStats.rank}</div>
                <div className="text-xs text-gray-500">Rank</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{data.yourStats.avgRating ? data.yourStats.avgRating.toFixed(1) : '-'}</div>
                <div className="text-xs text-gray-500">Avg</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Sunday Prediction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 rounded-2xl p-5 border border-blue-700/30 mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <FiSun className="text-blue-400" />
            <h3 className="font-bold text-white">Sunday Forecast</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-400">~{data.prediction.expectedCheckins}</div>
              <div className="text-xs text-gray-500">Expected Smokes</div>
            </div>
            <div>
              <div className="text-lg font-bold text-indigo-400">{data.prediction.expectedPeak}</div>
              <div className="text-xs text-gray-500">Peak Time</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-400">{data.prediction.vibeLevel}</div>
              <div className="text-xs text-gray-500">Vibe Level</div>
            </div>
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-center space-y-3"
        >
          <p className="text-gray-500 text-sm">Keep the momentum going</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/checkin" className="px-4 py-2 bg-emerald-600 rounded-full text-sm text-white font-medium hover:bg-emerald-500 transition-colors">
              🚬 Log a Smoke
            </Link>
            <Link href="/weekend-scoreboard" className="px-4 py-2 bg-gray-800/50 rounded-full text-sm text-gray-300 hover:bg-gray-700/50 transition-colors">
              🏆 Full Scoreboard
            </Link>
            <Link href="/saturday-cartoons" className="px-4 py-2 bg-gray-800/50 rounded-full text-sm text-gray-300 hover:bg-gray-700/50 transition-colors">
              📺 Saturday Cartoons
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
