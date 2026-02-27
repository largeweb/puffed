"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  FiHome, FiRefreshCw, FiAward, FiStar, FiHeart, 
  FiMessageCircle, FiTrendingUp, FiUsers, FiZap,
  FiClock, FiTarget, FiShare2, FiCamera
} from "react-icons/fi";
import confetti from "canvas-confetti";

interface WeeklyWin {
  type: "checkin" | "social" | "streak" | "badge" | "discovery" | "engagement";
  title: string;
  description: string;
  emoji: string;
  value?: number;
  highlight?: string;
}

interface BestSmoke {
  id: number;
  brand: string;
  product?: string;
  rating?: number;
  review?: string;
  imageUrl?: string;
  likes: number;
  comments: number;
  reactions: number;
  createdAt: number;
}

interface VictoryLapData {
  username: string;
  weekSummary: {
    totalSmokes: number;
    totalLikes: number;
    totalComments: number;
    totalReactions: number;
    newFollowers: number;
    uniqueBrands: number;
    avgRating: number | null;
  };
  wins: WeeklyWin[];
  bestSmoke: BestSmoke | null;
  streakStatus: {
    current: number;
    improved: boolean;
    previousBest: number;
  };
  rank: {
    position: number;
    change: number;
    totalUsers: number;
  };
  encouragement: string;
  weekStart: string;
  weekEnd: string;
}

const WIN_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  checkin: { bg: "bg-amber-500/20", border: "border-amber-500/50", text: "text-amber-400" },
  social: { bg: "bg-pink-500/20", border: "border-pink-500/50", text: "text-pink-400" },
  streak: { bg: "bg-orange-500/20", border: "border-orange-500/50", text: "text-orange-400" },
  badge: { bg: "bg-purple-500/20", border: "border-purple-500/50", text: "text-purple-400" },
  discovery: { bg: "bg-cyan-500/20", border: "border-cyan-500/50", text: "text-cyan-400" },
  engagement: { bg: "bg-green-500/20", border: "border-green-500/50", text: "text-green-400" },
};

export default function VictoryLapPage() {
  const router = useRouter();
  const [data, setData] = useState<VictoryLapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [celebrated, setCelebrated] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/victory-lap");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const result = await res.json() as VictoryLapData;
      setData(result);
      
      // Trigger confetti celebration on first load if they have wins
      if (!celebrated && result.wins.length > 0) {
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#fbbf24", "#f97316", "#ec4899", "#8b5cf6", "#06b6d4"]
          });
        }, 500);
        setCelebrated(true);
      }
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, celebrated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full"
        />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Failed to load your victory lap</p>
          <button onClick={() => fetchData()} className="text-amber-400 hover:underline">
            Try again
          </button>
        </div>
      </main>
    );
  }

  const hasActivity = data.weekSummary.totalSmokes > 0 || data.wins.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-amber-950/20 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600/20 via-orange-500/20 to-yellow-500/20 border-b border-amber-500/20">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <FiHome className="text-white text-xl" />
            </Link>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2 justify-center">
                <span>🏆</span> Victory Lap
              </h1>
              <p className="text-amber-200/70 text-sm">Your wins this week</p>
            </div>
            <button 
              onClick={() => fetchData(true)} 
              disabled={refreshing}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <FiRefreshCw className={`text-white text-xl ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Week Period */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-gray-400 text-sm"
        >
          <FiClock className="inline mr-1" />
          {data.weekStart} — {data.weekEnd}
        </motion.div>

        {/* Main Stats Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 border border-amber-500/30"
        >
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
              className="text-6xl mb-3"
            >
              🏆
            </motion.div>
            <h2 className="text-xl font-bold text-white mb-1">
              Great week, {data.username}!
            </h2>
            <p className="text-amber-200/70">{data.encouragement}</p>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-amber-500/10 rounded-xl p-3">
              <div className="text-2xl font-bold text-amber-400">{data.weekSummary.totalSmokes}</div>
              <div className="text-xs text-gray-400">Smokes</div>
            </div>
            <div className="bg-pink-500/10 rounded-xl p-3">
              <div className="text-2xl font-bold text-pink-400">{data.weekSummary.totalLikes}</div>
              <div className="text-xs text-gray-400">Likes</div>
            </div>
            <div className="bg-cyan-500/10 rounded-xl p-3">
              <div className="text-2xl font-bold text-cyan-400">{data.weekSummary.uniqueBrands}</div>
              <div className="text-xs text-gray-400">Brands</div>
            </div>
            <div className="bg-purple-500/10 rounded-xl p-3">
              <div className="text-2xl font-bold text-purple-400">{data.wins.length}</div>
              <div className="text-xs text-gray-400">Wins</div>
            </div>
          </div>
        </motion.div>

        {/* Rank Card */}
        {data.rank.position > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-xl p-4 border border-yellow-500/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-xl font-bold text-white">
                  #{data.rank.position}
                </div>
                <div>
                  <div className="font-semibold text-white">Weekly Rank</div>
                  <div className="text-sm text-gray-400">out of {data.rank.totalUsers} smokers</div>
                </div>
              </div>
              {data.rank.change !== 0 && (
                <div className={`flex items-center gap-1 ${data.rank.change > 0 ? "text-green-400" : "text-red-400"}`}>
                  <FiTrendingUp className={data.rank.change < 0 ? "rotate-180" : ""} />
                  <span className="text-sm font-medium">
                    {data.rank.change > 0 ? "+" : ""}{data.rank.change}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Streak Status */}
        {data.streakStatus.current > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass rounded-xl p-4 border border-orange-500/30"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">🔥</div>
              <div className="flex-1">
                <div className="font-semibold text-white">
                  {data.streakStatus.current} Day Streak
                </div>
                <div className="text-sm text-gray-400">
                  {data.streakStatus.improved 
                    ? `New personal best! (was ${data.streakStatus.previousBest})`
                    : "Keep it going!"}
                </div>
              </div>
              {data.streakStatus.improved && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.3 }}
                  className="text-2xl"
                >
                  ⭐
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Wins Section */}
        {data.wins.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FiAward className="text-amber-400" />
              Your Wins This Week
            </h3>
            <div className="space-y-2">
              {data.wins.map((win, index) => {
                const colors = WIN_COLORS[win.type] || WIN_COLORS.checkin;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className={`glass rounded-xl p-4 border ${colors.border}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center text-xl`}>
                        {win.emoji}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-white">{win.title}</div>
                        <div className="text-sm text-gray-400">{win.description}</div>
                      </div>
                      {win.value && (
                        <div className={`text-lg font-bold ${colors.text}`}>
                          {win.value}
                        </div>
                      )}
                    </div>
                    {win.highlight && (
                      <div className="mt-2 text-sm text-gray-300 italic">
                        &ldquo;{win.highlight}&rdquo;
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Best Smoke of the Week */}
        {data.bestSmoke && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FiStar className="text-yellow-400" />
              Best Smoke of the Week
            </h3>
            <Link href={`/checkin/${data.bestSmoke.id}`}>
              <div className="glass rounded-xl overflow-hidden border border-yellow-500/30 hover:border-yellow-500/50 transition-colors cursor-pointer">
                {data.bestSmoke.imageUrl && (
                  <div className="h-48 relative">
                    <img 
                      src={data.bestSmoke.imageUrl} 
                      alt={data.bestSmoke.brand}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-3 left-3">
                      <div className="text-lg font-bold text-white">{data.bestSmoke.brand}</div>
                      {data.bestSmoke.product && (
                        <div className="text-sm text-gray-300">{data.bestSmoke.product}</div>
                      )}
                    </div>
                    {data.bestSmoke.rating && (
                      <div className="absolute top-3 right-3 bg-yellow-500/90 px-2 py-1 rounded-lg flex items-center gap-1">
                        <FiStar className="text-white" />
                        <span className="font-bold text-white">{data.bestSmoke.rating}</span>
                      </div>
                    )}
                  </div>
                )}
                {!data.bestSmoke.imageUrl && (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-bold text-white">{data.bestSmoke.brand}</div>
                        {data.bestSmoke.product && (
                          <div className="text-sm text-gray-400">{data.bestSmoke.product}</div>
                        )}
                      </div>
                      {data.bestSmoke.rating && (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <FiStar />
                          <span className="font-bold">{data.bestSmoke.rating}</span>
                        </div>
                      )}
                    </div>
                    {data.bestSmoke.review && (
                      <p className="text-sm text-gray-300 line-clamp-2">{data.bestSmoke.review}</p>
                    )}
                  </div>
                )}
                <div className="px-4 py-3 border-t border-white/10 flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <FiHeart className="text-pink-400" /> {data.bestSmoke.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <FiMessageCircle className="text-cyan-400" /> {data.bestSmoke.comments}
                  </span>
                  <span className="flex items-center gap-1">
                    <FiZap className="text-amber-400" /> {data.bestSmoke.reactions}
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* No Activity State */}
        {!hasActivity && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-8 text-center border border-gray-500/30"
          >
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-white mb-2">No wins yet this week</h3>
            <p className="text-gray-400 mb-4">
              Start smoking and engaging to earn your victories!
            </p>
            <Link 
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <FiZap /> Log a Smoke
            </Link>
          </motion.div>
        )}

        {/* Call to Action */}
        {hasActivity && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-xl p-6 text-center border border-amber-500/30"
          >
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="text-lg font-semibold text-white mb-2">Keep the momentum going!</h3>
            <p className="text-gray-400 mb-4">
              The weekend is here. Set new records!
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link 
                href="/challenge"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <FiTarget /> Today&apos;s Challenge
              </Link>
              <Link 
                href="/tgif"
                className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                🎉 TGIF Party
              </Link>
            </div>
          </motion.div>
        )}

        {/* Navigation Links */}
        <div className="flex flex-wrap gap-3 justify-center text-sm">
          <Link href="/weekly-wrap" className="text-amber-400 hover:underline">📊 Full Weekly Wrap</Link>
          <span className="text-gray-600">•</span>
          <Link href="/leaderboard" className="text-amber-400 hover:underline">🏆 Leaderboards</Link>
          <span className="text-gray-600">•</span>
          <Link href="/achievements" className="text-amber-400 hover:underline">🎖️ Achievements</Link>
        </div>
      </div>
    </div>
  );
}
