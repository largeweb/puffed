"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { FiHome, FiAward, FiTrendingUp, FiStar, FiClock } from "react-icons/fi";
import Link from "next/link";

interface LoyaltyTier {
  name: string;
  minSmokes: number;
  emoji: string;
  color: string;
}

interface BrandLoyalty {
  brand: string;
  smokeCount: number;
  avgRating: number | null;
  firstSmoke: number;
  lastSmoke: number;
  currentTier: LoyaltyTier | null;
  nextTier: LoyaltyTier | null;
  progressToNext: {
    current: number;
    needed: number;
    remaining: number;
    percentage: number;
  } | null;
}

interface LoyaltyResponse {
  username: string;
  brands: BrandLoyalty[];
  summary: {
    totalBrands: number;
    ambassadorCount: number;
    expertCount: number;
    fanCount: number;
    closestToLevelUp: BrandLoyalty[];
  };
  tiers: LoyaltyTier[];
}

const TIER_COLORS: Record<string, string> = {
  gray: "from-gray-500 to-gray-600",
  blue: "from-blue-500 to-blue-600",
  cyan: "from-cyan-500 to-cyan-600",
  amber: "from-amber-500 to-amber-600",
  yellow: "from-yellow-400 to-amber-500",
  purple: "from-purple-500 to-pink-600",
};

const TIER_BORDERS: Record<string, string> = {
  gray: "border-gray-500/30",
  blue: "border-blue-500/30",
  cyan: "border-cyan-500/30",
  amber: "border-amber-500/30",
  yellow: "border-yellow-400/50",
  purple: "border-purple-500/50",
};

function BrandLoyaltyCard({ brand }: { brand: BrandLoyalty }) {
  const tierColor = brand.currentTier?.color || "gray";
  const isMaxTier = !brand.nextTier;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-xl p-4 border ${TIER_BORDERS[tierColor]}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Tier badge */}
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${TIER_COLORS[tierColor]} flex items-center justify-center text-2xl`}>
            {brand.currentTier?.emoji || "🌱"}
          </div>
          
          <div>
            <Link 
              href={`/cigar/${encodeURIComponent(brand.brand)}`}
              className="font-semibold hover:text-amber-500 transition-colors"
            >
              {brand.brand}
            </Link>
            <div className="text-xs text-gray-400 flex items-center gap-2">
              <span className="font-medium" style={{ color: `var(--${tierColor}-400, #9ca3af)` }}>
                {brand.currentTier?.name || "Newcomer"}
              </span>
              <span>•</span>
              <span>{brand.smokeCount} smoke{brand.smokeCount === 1 ? "" : "s"}</span>
            </div>
          </div>
        </div>
        
        {brand.avgRating && (
          <div className="flex items-center gap-1 text-amber-500">
            <FiStar size={14} fill="currentColor" />
            <span className="text-sm font-medium">{brand.avgRating}</span>
          </div>
        )}
      </div>
      
      {/* Progress bar */}
      {brand.progressToNext && !isMaxTier && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Progress to {brand.nextTier?.emoji} {brand.nextTier?.name}</span>
            <span>{brand.progressToNext.current}/{brand.progressToNext.needed}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${brand.progressToNext.percentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full bg-gradient-to-r ${TIER_COLORS[brand.nextTier?.color || "amber"]}`}
            />
          </div>
          <div className="text-xs text-gray-500">
            {brand.progressToNext.remaining} more smoke{brand.progressToNext.remaining === 1 ? "" : "s"} to level up!
          </div>
        </div>
      )}
      
      {isMaxTier && (
        <div className="text-xs text-purple-400 flex items-center gap-1 mt-2">
          <span>🎉</span>
          <span>Max tier reached! You&apos;re a true legend.</span>
        </div>
      )}
    </motion.div>
  );
}

export default function BrandLoyaltyPage() {
  const [data, setData] = useState<LoyaltyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLoyalty();
  }, []);

  async function loadLoyalty() {
    try {
      const res = await fetch("/api/brand-loyalty");
      if (!res.ok) {
        if (res.status === 401) {
          setError("Please log in to view your brand loyalty");
          return;
        }
        throw new Error("Failed to load");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError("Failed to load brand loyalty data");
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
          className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full"
        />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-gray-400 mb-4">{error}</p>
          <Link href="/dashboard" className="text-amber-500 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center">
                <FiAward size={20} />
              </div>
              <div>
                <h1 className="font-semibold">Brand Loyalty</h1>
                <p className="text-xs text-gray-400">Track your journey with each brand</p>
              </div>
            </div>
            <Link 
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <FiHome size={20} />
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Stats */}
        {data?.summary && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4 border border-amber-500/20"
          >
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{data.summary.totalBrands}</div>
                <div className="text-xs text-gray-400">Brands</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-400">
                  {data.summary.ambassadorCount}
                  <span className="text-lg ml-1">👑</span>
                </div>
                <div className="text-xs text-gray-400">Ambassador</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-400">
                  {data.summary.expertCount}
                  <span className="text-lg ml-1">🏅</span>
                </div>
                <div className="text-xs text-gray-400">Expert</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-cyan-400">
                  {data.summary.fanCount}
                  <span className="text-lg ml-1">💙</span>
                </div>
                <div className="text-xs text-gray-400">Fan</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Close to Level Up */}
        {data?.summary?.closestToLevelUp && data.summary.closestToLevelUp.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-xl p-4 border border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10"
          >
            <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-3">
              <FiTrendingUp />
              <span>Almost there! 🎯</span>
            </div>
            <div className="space-y-2">
              {data.summary.closestToLevelUp.map((brand) => (
                <div key={brand.brand} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{brand.brand}</span>
                  <span className="text-green-400">
                    {brand.progressToNext?.remaining} more to {brand.nextTier?.emoji} {brand.nextTier?.name}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tier Guide */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-4"
        >
          <div className="text-sm font-medium text-gray-400 mb-3">Loyalty Tiers</div>
          <div className="flex flex-wrap gap-2">
            {data?.tiers?.map((tier) => (
              <div 
                key={tier.name}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r ${TIER_COLORS[tier.color]} bg-opacity-20 text-xs`}
              >
                <span>{tier.emoji}</span>
                <span className="font-medium">{tier.name}</span>
                <span className="text-white/60">({tier.minSmokes}+)</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Brand List */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-400">Your Brands</div>
          <AnimatePresence>
            {data?.brands && data.brands.length > 0 ? (
              data.brands.map((brand, i) => (
                <motion.div
                  key={brand.brand}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <BrandLoyaltyCard brand={brand} />
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-gray-400"
              >
                <p className="text-4xl mb-3">🏆</p>
                <p>No brands logged yet</p>
                <p className="text-sm mt-2">Log your first smoke to start building loyalty!</p>
                <Link 
                  href="/checkin"
                  className="inline-block mt-4 px-4 py-2 bg-amber-500 text-black rounded-lg font-medium hover:bg-amber-400 transition-colors"
                >
                  Log a Smoke
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
