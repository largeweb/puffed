"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiShare2, FiTrendingUp, FiAward, FiTarget, FiLock, FiCheckCircle } from "react-icons/fi";

interface Milestone {
  id: string;
  title: string;
  description: string;
  emoji: string;
  achieved: boolean;
  achievedAt?: string;
  progress?: number;
  target?: number;
  shareText?: string;
  category: "checkins" | "brands" | "social" | "streaks" | "time" | "special";
}

interface MilestonesData {
  achieved: Milestone[];
  upcoming: Milestone[];
  stats: {
    totalAchieved: number;
    totalMilestones: number;
    nextUp: Milestone | null;
  };
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
  checkins: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    gradient: "from-amber-500 to-orange-500",
  },
  brands: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    text: "text-cyan-400",
    gradient: "from-cyan-500 to-teal-500",
  },
  social: {
    bg: "bg-pink-500/10",
    border: "border-pink-500/30",
    text: "text-pink-400",
    gradient: "from-pink-500 to-rose-500",
  },
  streaks: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    text: "text-orange-400",
    gradient: "from-orange-500 to-red-500",
  },
  time: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    text: "text-purple-400",
    gradient: "from-purple-500 to-violet-500",
  },
  special: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    gradient: "from-yellow-500 to-amber-500",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  checkins: "Check-ins",
  brands: "Exploration",
  social: "Social",
  streaks: "Streaks",
  time: "Membership",
  special: "Special",
};

export default function MilestonesPage() {
  const [data, setData] = useState<MilestonesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadMilestones() {
      try {
        const res = await fetch("/api/milestones");
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const json: MilestonesData = await res.json();
        setData(json);
      } catch (error) {
        console.error("Load error:", error);
      } finally {
        setLoading(false);
      }
    }
    loadMilestones();
  }, [router]);

  const handleShare = async (milestone?: Milestone) => {
    const shareText = milestone?.shareText || 
      `I've unlocked ${data?.stats.totalAchieved || 0} milestones on Puffed! 🏆\n\nTrack your smokes at puffed.pages.dev`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: milestone ? `${milestone.emoji} ${milestone.title}` : "My Puffed Milestones",
          text: shareText,
          url: `${window.location.origin}/milestones`,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          copyToClipboard(shareText);
        }
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShareStatus("Copied!");
      setTimeout(() => setShareStatus(null), 2000);
    } catch {
      setShareStatus("Failed");
      setTimeout(() => setShareStatus(null), 2000);
    }
  };

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
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Failed to load milestones</p>
      </main>
    );
  }

  const filteredAchieved = selectedCategory
    ? data.achieved.filter((m) => m.category === selectedCategory)
    : data.achieved;

  const filteredUpcoming = selectedCategory
    ? data.upcoming.filter((m) => m.category === selectedCategory)
    : data.upcoming;

  const categories = ["checkins", "brands", "social", "streaks", "time", "special"];
  const progressPercent = Math.round((data.stats.totalAchieved / data.stats.totalMilestones) * 100);

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <FiArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-semibold flex items-center gap-2">
                <FiAward className="text-amber-500" />
                Milestones
              </h1>
              <p className="text-xs text-gray-400">{data.stats.totalAchieved} of {data.stats.totalMilestones} unlocked</p>
            </div>
          </div>
          <button
            onClick={() => handleShare()}
            className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition-all text-sm"
          >
            <FiShare2 size={16} />
            Share
            {shareStatus && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-green-500 text-black px-2 py-1 rounded whitespace-nowrap">
                {shareStatus}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Progress Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 text-center bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20"
        >
          <div className="text-5xl mb-3">🏆</div>
          <h2 className="text-2xl font-bold mb-2">{progressPercent}% Complete</h2>
          <p className="text-gray-400 text-sm mb-4">
            {data.stats.totalAchieved} milestones unlocked
          </p>
          {/* Progress bar */}
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
            />
          </div>
          {data.stats.nextUp && (
            <div className="mt-4 pt-4 border-t border-amber-500/20">
              <p className="text-xs text-gray-500 mb-1">Next milestone</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">{data.stats.nextUp.emoji}</span>
                <span className="font-medium">{data.stats.nextUp.title}</span>
                {data.stats.nextUp.target && data.stats.nextUp.progress !== undefined && (
                  <span className="text-gray-500 text-sm">
                    ({data.stats.nextUp.progress}/{data.stats.nextUp.target})
                  </span>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === null
                ? "bg-amber-500 text-black"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? `bg-gradient-to-r ${CATEGORY_COLORS[cat].gradient} text-white`
                  : `${CATEGORY_COLORS[cat].bg} ${CATEGORY_COLORS[cat].text} hover:opacity-80`
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Achieved Milestones */}
        {filteredAchieved.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FiCheckCircle className="text-green-400" />
              <h2 className="font-semibold">Unlocked</h2>
              <span className="text-gray-500 text-sm">({filteredAchieved.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredAchieved.map((milestone, idx) => {
                const colors = CATEGORY_COLORS[milestone.category];
                return (
                  <motion.div
                    key={milestone.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`glass rounded-2xl overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform`}
                    onClick={() => milestone.shareText && handleShare(milestone)}
                  >
                    <div className={`h-1.5 bg-gradient-to-r ${colors.gradient}`} />
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{milestone.emoji}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{milestone.title}</h3>
                            <FiCheckCircle className="text-green-400 text-sm" />
                          </div>
                          <p className="text-gray-400 text-sm">{milestone.description}</p>
                        </div>
                        <FiShare2 className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" size={14} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* Upcoming Milestones */}
        {filteredUpcoming.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FiTarget className="text-gray-400" />
              <h2 className="font-semibold text-gray-300">Coming Up</h2>
              <span className="text-gray-500 text-sm">({filteredUpcoming.length})</span>
            </div>
            <div className="space-y-3">
              {filteredUpcoming.map((milestone, idx) => {
                const colors = CATEGORY_COLORS[milestone.category];
                const progress = milestone.progress !== undefined && milestone.target 
                  ? Math.round((milestone.progress / milestone.target) * 100) 
                  : 0;
                
                return (
                  <motion.div
                    key={milestone.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`glass rounded-2xl p-4 ${colors.bg} ${colors.border} border opacity-70`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <span className="text-2xl grayscale opacity-50">{milestone.emoji}</span>
                        <FiLock className="absolute -bottom-1 -right-1 text-gray-500 text-xs" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-300">{milestone.title}</h3>
                        <p className="text-gray-500 text-sm">{milestone.description}</p>
                        {milestone.target && milestone.progress !== undefined && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-500">Progress</span>
                              <span className={colors.text}>{milestone.progress}/{milestone.target}</span>
                            </div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full transition-all`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty state */}
        {filteredAchieved.length === 0 && filteredUpcoming.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 glass rounded-2xl"
          >
            <p className="text-4xl mb-4">🚬</p>
            <p className="text-gray-400 mb-2">No milestones in this category yet!</p>
            <p className="text-sm text-gray-500 mb-6">Keep logging smokes to unlock achievements</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-semibold"
            >
              Log a Smoke
            </Link>
          </motion.div>
        )}

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-3"
        >
          <Link
            href="/records"
            className="glass rounded-xl p-4 text-center hover:bg-white/5 transition-all group"
          >
            <span className="text-2xl">🏆</span>
            <p className="text-sm font-medium mt-2 group-hover:text-amber-500 transition-colors">Records</p>
          </Link>
          <Link
            href="/achievements"
            className="glass rounded-xl p-4 text-center hover:bg-white/5 transition-all group"
          >
            <span className="text-2xl">🎖️</span>
            <p className="text-sm font-medium mt-2 group-hover:text-amber-500 transition-colors">Badges</p>
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
