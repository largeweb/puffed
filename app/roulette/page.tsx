"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiRefreshCw, FiStar, FiUsers, FiHash, FiMessageCircle, FiTarget } from "react-icons/fi";
import { getFlavorTag } from "@/lib/flavors";

export const runtime = "edge";

interface LuckyCigarData {
  cigar: {
    brand: string;
    product: string | null;
    avgRating: number | null;
    totalCheckins: number;
    uniqueSmokers: number;
    topFlavors: string[];
    recentSmoker: {
      username: string;
      rating: number | null;
      review: string | null;
      timeAgo: string;
    } | null;
  } | null;
  triedBrands: string[];
  communityBrands: number;
  discoveryPercentage: number;
  spinsToday: number;
  message: string;
  error?: string;
}

export default function RoulettePage() {
  const router = useRouter();
  const [data, setData] = useState<LuckyCigarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);

  const spin = async () => {
    setSpinning(true);
    setLoading(true);
    
    // Dramatic pause for effect
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const res = await fetch("/api/lucky-cigar");
      if (res.ok) {
        const result = await res.json() as LuckyCigarData;
        setData(result);
        setHasSpun(true);
      }
    } catch (error) {
      console.error("Error fetching lucky cigar:", error);
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950/20 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 via-pink-500/20 to-purple-600/20 border-b border-purple-500/20">
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
                🎰 Lucky Cigar
              </h1>
              <p className="text-sm text-purple-200/70">Discover something new!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Spin Button Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-8 text-center"
        >
          {!hasSpun ? (
            <>
              <motion.div
                animate={spinning ? { rotate: 360 } : {}}
                transition={{ duration: 1, repeat: spinning ? Infinity : 0, ease: "linear" }}
                className="text-8xl mb-6"
              >
                🎰
              </motion.div>
              <h2 className="text-xl font-bold text-white mb-2">
                Ready to discover?
              </h2>
              <p className="text-gray-400 mb-6">
                Spin the wheel to get a random cigar recommendation from the community that you haven&apos;t tried yet!
              </p>
              <button
                onClick={spin}
                disabled={loading}
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl text-lg hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <FiRefreshCw className="animate-spin" />
                    Spinning...
                  </span>
                ) : (
                  "🎲 Spin the Wheel!"
                )}
              </button>
            </>
          ) : (
            <AnimatePresence mode="wait">
              {spinning ? (
                <motion.div
                  key="spinning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                    className="text-8xl mb-4"
                  >
                    🎰
                  </motion.div>
                  <p className="text-purple-400 animate-pulse">Finding your destiny...</p>
                </motion.div>
              ) : data?.cigar ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", damping: 15 }}
                >
                  {/* Message */}
                  <p className="text-purple-400 text-sm mb-4">{data.message}</p>
                  
                  {/* Brand Name */}
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-bold text-white mb-2"
                  >
                    {data.cigar.brand}
                  </motion.h2>
                  
                  {/* Rating */}
                  {data.cigar.avgRating && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center justify-center gap-1 text-amber-400 mb-4"
                    >
                      <FiStar fill="currentColor" />
                      <span className="font-bold">{data.cigar.avgRating}</span>
                      <span className="text-gray-400 text-sm">avg rating</span>
                    </motion.div>
                  )}
                  
                  {/* Stats */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex justify-center gap-6 mb-6"
                  >
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-pink-400">
                        <FiHash />
                        <span className="font-bold">{data.cigar.totalCheckins}</span>
                      </div>
                      <div className="text-xs text-gray-400">check-ins</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-purple-400">
                        <FiUsers />
                        <span className="font-bold">{data.cigar.uniqueSmokers}</span>
                      </div>
                      <div className="text-xs text-gray-400">smokers</div>
                    </div>
                  </motion.div>
                  
                  {/* Flavors */}
                  {data.cigar.topFlavors.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex flex-wrap justify-center gap-2 mb-6"
                    >
                      {data.cigar.topFlavors.map(flavor => {
                        const tag = getFlavorTag(flavor);
                        return tag ? (
                          <span
                            key={flavor}
                            className="px-3 py-1 rounded-full text-xs bg-amber-500/20 text-amber-300"
                          >
                            {tag.emoji} {tag.label}
                          </span>
                        ) : null;
                      })}
                    </motion.div>
                  )}
                  
                  {/* Recent Review */}
                  {data.cigar.recentSmoker && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="bg-white/5 rounded-xl p-4 mb-6 text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FiMessageCircle className="text-gray-400" />
                        <Link 
                          href={`/user/${data.cigar.recentSmoker.username}`}
                          className="text-sm text-purple-400 hover:underline"
                        >
                          @{data.cigar.recentSmoker.username}
                        </Link>
                        <span className="text-xs text-gray-500">
                          {data.cigar.recentSmoker.timeAgo}
                        </span>
                        {data.cigar.recentSmoker.rating && (
                          <span className="text-amber-400 text-sm ml-auto">
                            {data.cigar.recentSmoker.rating}★
                          </span>
                        )}
                      </div>
                      {data.cigar.recentSmoker.review && (
                        <p className="text-gray-300 text-sm italic">
                          &quot;{data.cigar.recentSmoker.review}&quot;
                        </p>
                      )}
                    </motion.div>
                  )}
                  
                  {/* Actions */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="flex gap-3 justify-center"
                  >
                    <Link
                      href={`/cigar/${encodeURIComponent(data.cigar.brand)}`}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 font-semibold rounded-xl hover:opacity-90 transition-all"
                    >
                      View Brand →
                    </Link>
                    <button
                      onClick={spin}
                      disabled={loading}
                      className="px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all flex items-center gap-2"
                    >
                      <FiRefreshCw className={loading ? "animate-spin" : ""} />
                      Spin Again
                    </button>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="no-result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="text-6xl mb-4">🏆</div>
                  <h2 className="text-xl font-bold text-white mb-2">
                    You&apos;ve tried them all!
                  </h2>
                  <p className="text-gray-400 mb-6">
                    {data?.message || "Amazing! You've sampled every brand in our community. True connoisseur status!"}
                  </p>
                  <Link
                    href="/discover"
                    className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl"
                  >
                    Explore Community
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </motion.div>

        {/* Discovery Stats */}
        {data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-xl p-4"
          >
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <FiTarget className="text-purple-400" />
              Your Discovery Progress
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Brands Explored</span>
                  <span className="text-white font-semibold">
                    {data.triedBrands.length} / {data.communityBrands}
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${data.discoveryPercentage}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center">
                You&apos;ve explored {data.discoveryPercentage}% of the community&apos;s brands!
              </p>
            </div>
          </motion.div>
        )}

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-xl p-4"
        >
          <h3 className="text-sm font-semibold text-gray-400 mb-3">How Lucky Cigar Works</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-purple-400">🎰</span>
              <span>Spin to get a random cigar you haven&apos;t tried yet</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-400">⭐</span>
              <span>See community ratings and recent reviews</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">🎯</span>
              <span>Track your discovery progress across all brands</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
