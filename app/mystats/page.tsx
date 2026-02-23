"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiStar, FiAward, FiUsers, FiHeart, FiMessageCircle, FiTrendingUp, FiCalendar, FiTarget, FiShare2 } from "react-icons/fi";
import type { MyStatsResponse } from "@/app/api/mystats/route";
import { FLAVOR_TAGS } from "@/lib/flavors";

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  cigar: { emoji: "🚬", color: "amber", label: "Cigars" },
  cannabis: { emoji: "🌿", color: "green", label: "Cannabis" },
  hookah: { emoji: "💨", color: "blue", label: "Hookah" },
  vape: { emoji: "🌫️", color: "purple", label: "Vape" },
};

export default function MyStatsPage() {
  const [stats, setStats] = useState<MyStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/mystats");
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data: MyStatsResponse = await res.json();
        setStats(data);
      } catch (error) {
        console.error("Load error:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [router]);

  const handleShare = async () => {
    if (!stats) return;
    
    const shareText = `🚬 My Puffed Stats:\n• ${stats.totalSmokes} smokes logged\n• ${stats.uniqueBrands} brands explored\n• ${stats.currentStreak} day streak 🔥\n• ${stats.badgesEarned}/${stats.totalBadges} badges earned\n\nTrack your smokes at puffed.pages.dev`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Puffed Stats",
          text: shareText,
          url: window.location.origin,
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

  if (!stats) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Failed to load stats</p>
      </main>
    );
  }

  // Calculate max rating for bar chart
  const maxRatingCount = Math.max(...stats.ratingDistribution.map(r => r.count), 1);

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
              <h1 className="font-semibold">My Stats</h1>
              <p className="text-xs text-gray-400">Your smoking journey</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/calendar"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all text-sm"
            >
              <FiCalendar size={16} />
              Calendar
            </Link>
            <button
              onClick={handleShare}
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
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Overview Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-amber-500">{stats.totalSmokes}</p>
            <p className="text-xs text-gray-400 mt-1">Total Smokes</p>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-blue-400">{stats.uniqueBrands}</p>
            <p className="text-xs text-gray-400 mt-1">Brands Tried</p>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <p className="text-3xl font-bold text-yellow-400">{stats.avgRating || "—"}</p>
              <FiStar className="text-yellow-400" fill="currentColor" size={16} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Avg Rating</p>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <p className={`text-3xl font-bold ${stats.streakActive ? 'text-orange-500' : 'text-gray-500'}`}>
                {stats.currentStreak}
              </p>
              <span className="text-xl">{stats.streakActive ? '🔥' : '❄️'}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Day Streak</p>
          </div>
        </motion.div>

        {/* Journey Timeline */}
        {stats.firstCheckinDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <FiCalendar className="text-green-400" />
              <h2 className="font-semibold">Your Journey</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-2xl font-bold text-green-400">{stats.daysSinceFirstSmoke}</p>
                <p className="text-xs text-gray-400">Days since first smoke</p>
                <p className="text-xs text-gray-500 mt-1">Started {stats.firstCheckinDate}</p>
              </div>
              {stats.mostActiveDay && (
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-2xl font-bold text-purple-400">{stats.mostActiveDay}</p>
                  <p className="text-xs text-gray-400">Most active day</p>
                  <p className="text-xs text-gray-500 mt-1">You love {stats.mostActiveDay}s!</p>
                </div>
              )}
            </div>
            {stats.bestStreak > stats.currentStreak && (
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-sm text-gray-400">Best streak</span>
                <span className="text-sm font-semibold text-orange-400">{stats.bestStreak} days 🏆</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Rating Distribution */}
        {stats.ratingDistribution.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <FiStar className="text-amber-500" />
              <h2 className="font-semibold">Your Ratings</h2>
            </div>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const ratingData = stats.ratingDistribution.find(r => r.rating === rating);
                const count = ratingData?.count || 0;
                const percentage = maxRatingCount > 0 ? (count / maxRatingCount) * 100 : 0;
                
                return (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm font-medium">{rating}</span>
                      <FiStar className="text-amber-500" fill="currentColor" size={12} />
                    </div>
                    <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.2 + rating * 0.05, duration: 0.5 }}
                        className={`h-full rounded-full ${
                          rating === 5 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                          rating === 4 ? 'bg-gradient-to-r from-amber-600 to-amber-500' :
                          rating === 3 ? 'bg-amber-700' :
                          rating === 2 ? 'bg-orange-800' :
                          'bg-red-900'
                        }`}
                      />
                    </div>
                    <span className="text-sm text-gray-400 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Favorite Brand & Top Brands */}
        {stats.topBrands.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <FiTarget className="text-red-400" />
              <h2 className="font-semibold">Top Brands</h2>
            </div>
            
            {/* Favorite brand highlight */}
            {stats.favoriteBrand && (
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-500 mb-1">🏆 Your Favorite</p>
                    <p className="text-lg font-bold">{stats.favoriteBrand.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-amber-500">{stats.favoriteBrand.count}</p>
                    <p className="text-xs text-gray-400">times</p>
                  </div>
                </div>
              </div>
            )}

            {/* Other top brands */}
            <div className="space-y-2">
              {stats.topBrands.slice(1).map((brand, idx) => (
                <Link
                  key={brand.name}
                  href={`/cigar/${encodeURIComponent(brand.name)}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm w-6">#{idx + 2}</span>
                    <span className="font-medium group-hover:text-amber-500 transition-colors">{brand.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {brand.avgRating && (
                      <span className="flex items-center gap-1 text-sm text-gray-400">
                        <FiStar className="text-amber-500" fill="currentColor" size={12} />
                        {brand.avgRating}
                      </span>
                    )}
                    <span className="text-sm text-gray-500">{brand.count}×</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Category Breakdown */}
        {stats.categories.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <FiTrendingUp className="text-cyan-400" />
              <h2 className="font-semibold">Categories</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {stats.categories.map((cat) => {
                const config = CATEGORY_CONFIG[cat.category] || { emoji: "🚬", color: "gray", label: cat.category };
                return (
                  <div
                    key={cat.category}
                    className={`bg-${config.color}-500/10 border border-${config.color}-500/20 rounded-xl p-4`}
                    style={{ backgroundColor: `rgba(${config.color === 'amber' ? '245,158,11' : config.color === 'green' ? '34,197,94' : config.color === 'blue' ? '59,130,246' : '168,85,247'}, 0.1)` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{config.emoji}</span>
                      <span className="text-sm font-medium">{config.label}</span>
                    </div>
                    <p className="text-2xl font-bold">{cat.count}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Flavor Profile */}
        {stats.topFlavors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">👅</span>
                <h2 className="font-semibold">Flavor Profile</h2>
              </div>
              <span className="text-xs text-gray-500">{stats.uniqueFlavors} flavors explored</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.topFlavors.map((flavor) => {
                const tag = FLAVOR_TAGS.find(t => t.id === flavor.id);
                if (!tag) return null;
                return (
                  <Link
                    key={flavor.id}
                    href={`/flavor/${flavor.id}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 transition-all border border-amber-500/20"
                  >
                    <span>{tag.emoji}</span>
                    <span className="text-sm font-medium text-amber-500">{tag.label}</span>
                    <span className="text-xs text-gray-500">×{flavor.count}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Social Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <FiUsers className="text-pink-400" />
            <h2 className="font-semibold">Social</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <FiHeart className="text-pink-400" size={16} />
                <span className="text-xl font-bold">{stats.totalLikesReceived}</span>
              </div>
              <p className="text-xs text-gray-400">Likes received</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <FiMessageCircle className="text-green-400" size={16} />
                <span className="text-xl font-bold">{stats.totalCommentsReceived}</span>
              </div>
              <p className="text-xs text-gray-400">Comments received</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-blue-400">{stats.following}</p>
              <p className="text-xs text-gray-400">Following</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-purple-400">{stats.followers}</p>
              <p className="text-xs text-gray-400">Followers</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Likes given</span>
              <span className="font-medium">{stats.totalLikesGiven}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Comments made</span>
              <span className="font-medium">{stats.totalCommentsGiven}</span>
            </div>
          </div>
        </motion.div>

        {/* Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FiAward className="text-amber-500" />
              <h2 className="font-semibold">Badges</h2>
            </div>
            <Link
              href="/dashboard"
              className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle
                  className="stroke-white/10"
                  fill="none"
                  strokeWidth="3"
                  cx="18"
                  cy="18"
                  r="15.9"
                />
                <motion.circle
                  initial={{ strokeDashoffset: 100 }}
                  animate={{ strokeDashoffset: 100 - (stats.badgesEarned / stats.totalBadges) * 100 }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="stroke-amber-500"
                  fill="none"
                  strokeWidth="3"
                  strokeDasharray="100"
                  strokeLinecap="round"
                  cx="18"
                  cy="18"
                  r="15.9"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">{stats.badgesEarned}/{stats.totalBadges}</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-2">
                {stats.badgesEarned === stats.totalBadges 
                  ? "🎉 You've earned all badges!" 
                  : `${stats.totalBadges - stats.badgesEarned} more to unlock`}
              </p>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.badgesEarned / stats.totalBadges) * 100}%` }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Empty state for new users */}
        {stats.totalSmokes === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <p className="text-4xl mb-4">🚬</p>
            <p className="text-gray-400 mb-2">No smokes logged yet</p>
            <p className="text-sm text-gray-500 mb-6">Start logging to build your stats!</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-semibold"
            >
              Log Your First Smoke
            </Link>
          </motion.div>
        )}
      </div>
    </main>
  );
}
