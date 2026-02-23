"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiAward, FiTrendingUp, FiStar, FiUsers, FiBarChart2, FiZap } from "react-icons/fi";

interface BrandChampion {
  brand: string;
  champion_username: string;
  champion_checkins: number;
  total_checkins: number;
  unique_smokers: number;
  avg_rating: number;
  five_star_count: number;
}

interface BrandStat {
  brand: string;
  avg_rating?: number;
  total_checkins: number;
  unique_smokers: number;
}

interface RisingStar {
  brand: string;
  week_checkins: number;
  growth_pct: number;
  avg_rating: number;
}

interface LeaderboardData {
  champions: BrandChampion[];
  topRated: BrandStat[];
  mostPopular: BrandStat[];
  risingStars: RisingStar[];
}

export default function BrandLeaderboardPage() {
  const router = useRouter();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"champions" | "rated" | "popular" | "rising">("champions");

  useEffect(() => {
    fetch("/api/brand-leaderboard")
      .then((res) => res.json() as Promise<LeaderboardData>)
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-6 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading leaderboards...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-6 flex items-center justify-center">
        <div className="text-gray-400">Failed to load data</div>
      </div>
    );
  }

  const tabs = [
    { id: "champions" as const, label: "🏆 Champions", icon: FiAward },
    { id: "rated" as const, label: "⭐ Top Rated", icon: FiStar },
    { id: "popular" as const, label: "🔥 Most Popular", icon: FiBarChart2 },
    { id: "rising" as const, label: "🚀 Rising", icon: FiZap },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-black/50 border-b border-white/10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <FiArrowLeft className="text-white" size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <FiAward className="text-yellow-500" />
                Brand Leaderboard
              </h1>
              <p className="text-sm text-gray-400">Who champions which brand?</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="sticky top-[73px] z-10 backdrop-blur-xl bg-black/30 border-b border-white/10">
        <div className="max-w-lg mx-auto px-4 py-2 flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-yellow-500 text-black"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {activeTab === "champions" && (
          <>
            <p className="text-gray-400 text-sm mb-4">
              The users who&apos;ve logged each brand the most. Earn your crown! 👑
            </p>
            {data.champions.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No champions yet! Log some smokes to claim your throne.
              </div>
            ) : (
              data.champions.map((brand, i) => (
                <motion.div
                  key={brand.brand}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/cigar/${encodeURIComponent(brand.brand)}`}>
                    <div className="glass rounded-2xl p-4 hover:bg-white/10 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-semibold text-white">{brand.brand}</span>
                            {i === 0 && <span className="text-yellow-500">👑</span>}
                            {i === 1 && <span className="text-gray-300">🥈</span>}
                            {i === 2 && <span className="text-amber-600">🥉</span>}
                          </div>
                          <Link 
                            href={`/user/${brand.champion_username}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
                          >
                            Champion: @{brand.champion_username}
                            <span className="text-gray-500 ml-1">({brand.champion_checkins} smokes)</span>
                          </Link>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-amber-400">
                            <FiStar fill="currentColor" size={14} />
                            <span className="font-semibold">{brand.avg_rating || "—"}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {brand.five_star_count}× ⭐⭐⭐⭐⭐
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-400">
                        <span>{brand.total_checkins} check-ins</span>
                        <span>{brand.unique_smokers} smokers</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </>
        )}

        {activeTab === "rated" && (
          <>
            <p className="text-gray-400 text-sm mb-4">
              The highest-rated brands on the platform. Quality over quantity! ⭐
            </p>
            {data.topRated.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Not enough ratings yet. Start rating your smokes!
              </div>
            ) : (
              data.topRated.map((brand, i) => (
                <motion.div
                  key={brand.brand}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/cigar/${encodeURIComponent(brand.brand)}`}>
                    <div className="glass rounded-2xl p-4 hover:bg-white/10 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            i === 0 ? "bg-yellow-500 text-black" :
                            i === 1 ? "bg-gray-300 text-black" :
                            i === 2 ? "bg-amber-600 text-white" :
                            "bg-white/10 text-gray-400"
                          }`}>
                            #{i + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{brand.brand}</div>
                            <div className="text-xs text-gray-500">
                              {brand.total_checkins} check-ins • {brand.unique_smokers} smokers
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-500/20 px-3 py-1 rounded-full">
                          <FiStar className="text-amber-500" fill="currentColor" size={16} />
                          <span className="text-amber-500 font-bold">{brand.avg_rating}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </>
        )}

        {activeTab === "popular" && (
          <>
            <p className="text-gray-400 text-sm mb-4">
              The most-logged brands. What everyone&apos;s smoking! 🔥
            </p>
            {data.mostPopular.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No check-ins yet. Be the first to log a smoke!
              </div>
            ) : (
              data.mostPopular.map((brand, i) => (
                <motion.div
                  key={brand.brand}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/cigar/${encodeURIComponent(brand.brand)}`}>
                    <div className="glass rounded-2xl p-4 hover:bg-white/10 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            i === 0 ? "bg-orange-500 text-white" :
                            i === 1 ? "bg-orange-400 text-white" :
                            i === 2 ? "bg-orange-300 text-black" :
                            "bg-white/10 text-gray-400"
                          }`}>
                            #{i + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{brand.brand}</div>
                            <div className="text-xs text-gray-500">
                              {brand.unique_smokers} smokers • ⭐ {brand.avg_rating || "—"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-orange-500/20 px-3 py-1 rounded-full">
                          <FiBarChart2 className="text-orange-400" size={16} />
                          <span className="text-orange-400 font-bold">{brand.total_checkins}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </>
        )}

        {activeTab === "rising" && (
          <>
            <p className="text-gray-400 text-sm mb-4">
              Brands gaining momentum this week. Catch the wave! 🚀
            </p>
            {data.risingStars.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Not enough data yet. Check back after a week of activity!
              </div>
            ) : (
              data.risingStars.map((brand, i) => (
                <motion.div
                  key={brand.brand}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/cigar/${encodeURIComponent(brand.brand)}`}>
                    <div className="glass rounded-2xl p-4 hover:bg-white/10 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                            brand.growth_pct >= 100 ? "bg-green-500 text-white" :
                            brand.growth_pct >= 50 ? "bg-green-400 text-white" :
                            "bg-green-500/20 text-green-400"
                          }`}>
                            🚀
                          </div>
                          <div>
                            <div className="font-semibold text-white">{brand.brand}</div>
                            <div className="text-xs text-gray-500">
                              {brand.week_checkins} this week • ⭐ {brand.avg_rating || "—"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-green-500/20 px-3 py-1 rounded-full">
                          <FiTrendingUp className="text-green-400" size={16} />
                          <span className="text-green-400 font-bold">
                            {brand.growth_pct >= 100 ? "NEW" : `+${brand.growth_pct}%`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </>
        )}
      </div>

      {/* CTA */}
      <div className="max-w-lg mx-auto px-4 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-4 text-center"
        >
          <p className="text-yellow-400 font-semibold mb-2">
            Want to become a Brand Champion? 👑
          </p>
          <p className="text-gray-400 text-sm mb-3">
            Log more smokes of your favorite brand to claim the crown!
          </p>
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-yellow-500 text-black px-4 py-2 rounded-full font-semibold hover:bg-yellow-400 transition-colors"
          >
            Log a Smoke
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
