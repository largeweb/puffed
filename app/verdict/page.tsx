"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiStar, FiArrowLeft, FiTrendingUp, FiTrendingDown, FiMinus, FiAward, FiTarget, FiUsers } from "react-icons/fi";
import Link from "next/link";

interface RatingDistribution {
  rating: number;
  count: number;
}

interface BrandVerdict {
  brand: string;
  yourRating: number;
  communityAvg: number;
  diff: number;
  totalRatings: number;
}

interface VerdictData {
  userAvg: number;
  communityAvg: number;
  totalUserRatings: number;
  totalCommunityRatings: number;
  distribution: RatingDistribution[];
  raterType: string;
  raterEmoji: string;
  raterDesc: string;
  fiveStarPercent: number;
  highestRated: { brand: string; rating: number; product: string | null } | null;
  lowestRated: { brand: string; rating: number; product: string | null } | null;
  brandVerdicts: BrandVerdict[];
  agreements: BrandVerdict[];
  disagreements: BrandVerdict[];
}

export default function VerdictPage() {
  const router = useRouter();
  const [data, setData] = useState<VerdictData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/verdict")
      .then(res => {
        if (!res.ok) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((json: VerdictData | null) => {
        if (json && json.userAvg !== undefined) setData(json);
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading verdict...</div>
      </div>
    );
  }

  if (!data) return null;

  const maxCount = Math.max(...data.distribution.map(d => d.count), 1);

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="p-2 rounded-full hover:bg-white/10 transition">
            <FiArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold">The Verdict 👨‍⚖️</h1>
        </div>

        {/* Rater Type Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 mb-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30"
        >
          <div className="text-center">
            <div className="text-6xl mb-4">{data.raterEmoji}</div>
            <h2 className="text-2xl font-bold mb-2 text-purple-300">{data.raterType}</h2>
            <p className="text-gray-400">{data.raterDesc}</p>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{data.userAvg}</div>
            <div className="text-xs text-gray-500">Your Avg</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-400">{data.communityAvg}</div>
            <div className="text-xs text-gray-500">Community</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{data.fiveStarPercent}%</div>
            <div className="text-xs text-gray-500">5-Star Rate</div>
          </div>
        </motion.div>

        {/* Rating Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-5 mb-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FiStar className="text-amber-500" />
            Your Rating Distribution
          </h3>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map(rating => {
              const item = data.distribution.find(d => d.rating === rating);
              const count = item?.count || 0;
              const percent = maxCount > 0 ? (count / maxCount) * 100 : 0;
              
              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12 text-sm">
                    <FiStar className="text-amber-500" fill="currentColor" size={14} />
                    <span>{rating}</span>
                  </div>
                  <div className="flex-1 h-6 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.5, delay: 0.3 + rating * 0.1 }}
                      className={`h-full rounded-full ${
                        rating === 5 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                        rating === 4 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                        rating === 3 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                        rating === 2 ? 'bg-gradient-to-r from-red-500 to-pink-500' :
                        'bg-gradient-to-r from-pink-500 to-purple-500'
                      }`}
                    />
                  </div>
                  <div className="w-8 text-right text-sm text-gray-500">{count}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-center text-sm text-gray-500">
            {data.totalUserRatings} total ratings
          </div>
        </motion.div>

        {/* Extremes */}
        {data.highestRated && data.lowestRated && data.highestRated.brand !== data.lowestRated.brand && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 gap-3 mb-6"
          >
            <div className="glass rounded-xl p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <div className="text-xs text-green-400 mb-1 flex items-center gap-1">
                <FiTrendingUp size={12} /> Highest Rated
              </div>
              <div className="font-semibold text-sm truncate">{data.highestRated.brand}</div>
              <div className="flex items-center gap-1 text-amber-400 text-sm">
                <FiStar fill="currentColor" size={12} />
                {data.highestRated.rating}
              </div>
            </div>
            <div className="glass rounded-xl p-4 bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/20">
              <div className="text-xs text-red-400 mb-1 flex items-center gap-1">
                <FiTrendingDown size={12} /> Lowest Rated
              </div>
              <div className="font-semibold text-sm truncate">{data.lowestRated.brand}</div>
              <div className="flex items-center gap-1 text-amber-400 text-sm">
                <FiStar fill="currentColor" size={12} />
                {data.lowestRated.rating}
              </div>
            </div>
          </motion.div>
        )}

        {/* Brand Verdicts - Where you differ from community */}
        {data.brandVerdicts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-2xl p-5 mb-6"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FiTarget className="text-cyan-500" />
              You vs Community
            </h3>
            <div className="space-y-3">
              {data.brandVerdicts.map((verdict, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div className="flex-1 min-w-0">
                    <Link href={`/cigar/${encodeURIComponent(verdict.brand)}`} className="font-medium text-sm hover:text-amber-400 transition truncate block">
                      {verdict.brand}
                    </Link>
                    <div className="text-xs text-gray-500">{verdict.totalRatings} community ratings</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-xs text-gray-500">You</div>
                      <div className="flex items-center gap-0.5 text-amber-400">
                        <FiStar fill="currentColor" size={12} />
                        <span className="font-semibold">{verdict.yourRating}</span>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      verdict.diff > 0.3 ? 'bg-green-500/20 text-green-400' :
                      verdict.diff < -0.3 ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {verdict.diff > 0 ? '+' : ''}{verdict.diff.toFixed(1)}
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Avg</div>
                      <div className="flex items-center gap-0.5 text-gray-400">
                        <FiStar fill="currentColor" size={12} />
                        <span>{verdict.communityAvg.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {data.totalUserRatings === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-2xl p-8 text-center"
          >
            <div className="text-4xl mb-4">🚬</div>
            <h3 className="font-semibold mb-2">No Ratings Yet</h3>
            <p className="text-gray-500 text-sm mb-4">
              Log some smokes with ratings to see your verdict!
            </p>
            <Link 
              href="/dashboard" 
              className="inline-block px-4 py-2 bg-amber-500 text-black rounded-lg font-medium hover:bg-amber-400 transition"
            >
              Log a Smoke
            </Link>
          </motion.div>
        )}

        {/* Fun Insight */}
        {data.totalUserRatings >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-2xl p-5 text-center bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20"
          >
            <FiAward className="text-amber-500 mx-auto mb-2" size={24} />
            <p className="text-sm text-gray-300">
              {data.userAvg > data.communityAvg 
                ? `You rate ${(data.userAvg - data.communityAvg).toFixed(1)} stars higher than average. Spread the love! 💛`
                : data.userAvg < data.communityAvg
                ? `You rate ${(data.communityAvg - data.userAvg).toFixed(1)} stars lower than average. Tough crowd! 🎯`
                : "Your ratings are perfectly aligned with the community! Great minds think alike. 🤝"
              }
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
