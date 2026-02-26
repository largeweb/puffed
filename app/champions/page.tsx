"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { FiHome, FiRefreshCw, FiTrendingUp, FiAward, FiUsers, FiActivity, FiShare2, FiChevronRight } from "react-icons/fi";

interface Champion {
  username: string;
  value: number;
  detail?: string;
}

interface Category {
  id: string;
  title: string;
  emoji: string;
  description: string;
  champion: Champion | null;
  runners: Champion[];
}

interface WeeklyChampionsData {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  categories: Category[];
  yourRankings: { category: string; rank: number; value: number }[];
  platformStats: {
    totalCheckins: number;
    activeUsers: number;
    totalEngagement: number;
  };
}

const CATEGORY_COLORS: Record<string, { gradient: string; bg: string; border: string }> = {
  smoker: { gradient: "from-orange-500 to-red-500", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  social: { gradient: "from-pink-500 to-rose-500", bg: "bg-pink-500/10", border: "border-pink-500/30" },
  star: { gradient: "from-yellow-500 to-amber-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  explorer: { gradient: "from-cyan-500 to-teal-500", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
  connoisseur: { gradient: "from-purple-500 to-violet-500", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  photographer: { gradient: "from-rose-400 to-pink-500", bg: "bg-rose-500/10", border: "border-rose-500/30" },
};

const RANK_BADGES = ["🥇", "🥈", "🥉", "4th", "5th"];

export default function WeeklyChampionsPage() {
  const [data, setData] = useState<WeeklyChampionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/weekly-champions");
      if (res.ok) {
        const json = await res.json() as WeeklyChampionsData;
        setData(json);
      }
    } catch (error) {
      console.error("Failed to load champions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleShare = async () => {
    if (!data) return;
    
    const champList = data.categories
      .filter(c => c.champion)
      .slice(0, 4)
      .map(c => `${c.emoji} ${c.title}: @${c.champion!.username}`)
      .join('\n');
    
    const shareText = `🏅 Puffed Weekly Champions (Week ${data.weekNumber})\n\n${champList}\n\nJoin the competition at puffed.pages.dev`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: "Weekly Champions - Puffed", text: shareText });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          await navigator.clipboard.writeText(shareText);
        }
      }
    } else {
      await navigator.clipboard.writeText(shareText);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <FiAward className="w-12 h-12 text-yellow-500" />
          </motion.div>
          <p className="text-gray-400">Loading champions...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black p-4">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-gray-400">Failed to load data</p>
          <Link href="/dashboard" className="text-cyan-400 hover:underline mt-4 inline-block">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
              <FiHome size={20} />
            </Link>
            <div>
              <h1 className="font-bold text-lg flex items-center gap-2">
                🏅 Weekly Champions
              </h1>
              <p className="text-xs text-gray-500">Week {data.weekNumber}: {data.weekStart} - {data.weekEnd}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-green-400 transition-colors"
              title="Share"
            >
              <FiShare2 size={18} />
            </button>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <FiRefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Week Stats Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-orange-500/20 border border-yellow-500/30 p-5"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-500/10 to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-2xl">
                🏆
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">This Week&apos;s Competition</h2>
                <p className="text-sm text-gray-400">Who&apos;s dominating the leaderboards?</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{data.platformStats.totalCheckins}</div>
                <div className="text-xs text-gray-400">Check-ins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{data.platformStats.activeUsers}</div>
                <div className="text-xs text-gray-400">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{data.platformStats.totalEngagement}</div>
                <div className="text-xs text-gray-400">Interactions</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Champions Grid */}
        <div className="space-y-4">
          {data.categories.map((category, index) => {
            const colors = CATEGORY_COLORS[category.id] || CATEGORY_COLORS.smoker;
            const isExpanded = expandedCategory === category.id;
            
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`rounded-2xl ${colors.bg} border ${colors.border} overflow-hidden`}
              >
                {/* Main Champion */}
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                  className="w-full p-4 flex items-center gap-4 text-left"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-2xl flex-shrink-0`}>
                    {category.emoji}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white">{category.title}</h3>
                      <span className="text-lg">🥇</span>
                    </div>
                    <p className="text-xs text-gray-400">{category.description}</p>
                    
                    {category.champion ? (
                      <div className="mt-1">
                        <Link 
                          href={`/user/${category.champion.username}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-white hover:text-cyan-400 transition-colors"
                        >
                          @{category.champion.username}
                        </Link>
                        {category.champion.detail && (
                          <span className="text-gray-500 text-sm ml-2">
                            ({category.champion.detail})
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm mt-1">No champion yet - be the first!</p>
                    )}
                  </div>

                  {category.runners.length > 0 && (
                    <FiChevronRight 
                      className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                      size={20} 
                    />
                  )}
                </button>

                {/* Runners Up */}
                <AnimatePresence>
                  {isExpanded && category.runners.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-white/5"
                    >
                      <div className="p-4 pt-3 space-y-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Runners Up</p>
                        {category.runners.map((runner, idx) => (
                          <div key={runner.username} className="flex items-center gap-3 py-1">
                            <span className="text-lg w-8 text-center">{RANK_BADGES[idx + 1]}</span>
                            <Link 
                              href={`/user/${runner.username}`}
                              className="font-medium text-gray-300 hover:text-white transition-colors"
                            >
                              @{runner.username}
                            </Link>
                            <span className="text-gray-500 text-sm ml-auto">
                              {runner.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center py-6"
        >
          <p className="text-gray-400 mb-4">
            Want to become a champion? Start logging your smokes!
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-semibold hover:opacity-90 transition-opacity"
          >
            <FiActivity size={18} />
            Log a Smoke
          </Link>
        </motion.div>

        {/* Footer Links */}
        <div className="flex justify-center gap-4 text-sm text-gray-500 pb-8">
          <Link href="/leaderboard" className="hover:text-white transition-colors">
            All-Time Leaderboard
          </Link>
          <span>•</span>
          <Link href="/achievements" className="hover:text-white transition-colors">
            Achievements
          </Link>
          <span>•</span>
          <Link href="/smoke-score" className="hover:text-white transition-colors">
            Smoke Score
          </Link>
        </div>
      </div>
    </div>
  );
}
