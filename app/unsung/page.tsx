"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  FiHome, FiRefreshCw, FiStar, FiHeart, FiClock, 
  FiMessageCircle, FiAward, FiUsers, FiZap
} from "react-icons/fi";

interface UnsungCheckin {
  id: string;
  username: string;
  userId: string;
  brand: string;
  product?: string;
  category: string;
  rating?: number;
  review?: string;
  imageUrl?: string;
  createdAt: number;
  timeAgo: string;
  hoursOld: number;
}

interface UnsungData {
  checkins: UnsungCheckin[];
  stats: {
    totalUnsung: number;
    oldestUnsungHours: number;
    avgAgeHours: number;
  };
  yourImpact?: {
    likesGivenToday: number;
    heroesHelped: number;
  };
}

const categoryEmojis: Record<string, string> = {
  cigar: "🚬",
  cannabis: "🌿",
  hookah: "💨",
  vape: "🌫️",
};

export default function UnsungHeroesPage() {
  const router = useRouter();
  const [data, setData] = useState<UnsungData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedCheckins, setLikedCheckins] = useState<Set<string>>(new Set());
  const [likingId, setLikingId] = useState<string | null>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/unsung-heroes");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const result = await res.json() as UnsungData;
      setData(result);
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLike = async (checkinId: string) => {
    if (likedCheckins.has(checkinId) || likingId) return;
    
    setLikingId(checkinId);
    try {
      const res = await fetch("/api/checkins/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinId }),
      });
      
      if (res.ok) {
        setLikedCheckins(prev => new Set([...prev, checkinId]));
        // Remove from list after a moment for visual feedback
        setTimeout(() => {
          setData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              checkins: prev.checkins.filter(c => c.id !== checkinId),
              stats: {
                ...prev.stats,
                totalUnsung: Math.max(0, prev.stats.totalUnsung - 1),
              },
              yourImpact: prev.yourImpact ? {
                ...prev.yourImpact,
                likesGivenToday: prev.yourImpact.likesGivenToday + 1,
                heroesHelped: prev.yourImpact.heroesHelped + 1,
              } : undefined,
            };
          });
        }, 500);
      }
    } catch (error) {
      console.error("Failed to like:", error);
    } finally {
      setLikingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-rose-950/30 to-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-rose-950/30 to-slate-900 flex items-center justify-center text-white">
        <p>Failed to load</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-rose-950/30 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-rose-500/20">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="p-2 text-gray-400 hover:text-white transition-colors">
              <FiHome className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-2xl">👏</span>
              <h1 className="text-lg font-bold text-white">Unsung Heroes</h1>
            </div>
            <button 
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <FiRefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500/20 via-pink-500/20 to-purple-500/20 border border-rose-500/30 p-6"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
          <div className="relative z-10 text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl mb-3"
            >
              💖
            </motion.div>
            <h2 className="text-xl font-bold text-white mb-2">Spread Some Love</h2>
            <p className="text-sm text-rose-200/80 max-w-md mx-auto">
              These check-ins haven&apos;t received any love yet. Be the hero who makes someone&apos;s day!
            </p>
          </div>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/50 rounded-xl p-4 text-center border border-rose-500/10"
          >
            <FiUsers className="w-5 h-5 text-rose-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{data.stats.totalUnsung}</div>
            <div className="text-xs text-gray-400">Waiting</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800/50 rounded-xl p-4 text-center border border-rose-500/10"
          >
            <FiClock className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{data.stats.oldestUnsungHours}h</div>
            <div className="text-xs text-gray-400">Oldest</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800/50 rounded-xl p-4 text-center border border-rose-500/10"
          >
            <FiAward className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{data.yourImpact?.heroesHelped || 0}</div>
            <div className="text-xs text-gray-400">You&apos;ve Helped</div>
          </motion.div>
        </div>

        {/* Your Impact */}
        {data.yourImpact && data.yourImpact.likesGivenToday > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl p-4 border border-emerald-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">🌟</div>
              <div>
                <div className="text-sm font-medium text-emerald-300">
                  You&apos;ve given {data.yourImpact.likesGivenToday} like{data.yourImpact.likesGivenToday > 1 ? 's' : ''} today!
                </div>
                <div className="text-xs text-emerald-300/70">
                  Keep spreading the love 💕
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Check-ins List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {data.checkins.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-lg font-bold text-white mb-2">All Caught Up!</h3>
                <p className="text-gray-400 text-sm">
                  Everyone has received some love. Check back later!
                </p>
              </motion.div>
            ) : (
              data.checkins.map((checkin, idx) => (
                <motion.div
                  key={checkin.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 100 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`bg-slate-800/50 rounded-xl border overflow-hidden transition-all ${
                    likedCheckins.has(checkin.id) 
                      ? 'border-rose-500/50 bg-rose-500/10' 
                      : 'border-slate-700/50 hover:border-rose-500/30'
                  }`}
                >
                  {/* Header */}
                  <div className="p-4 pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <Link href={`/user/${checkin.username}`} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                          {checkin.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-white hover:text-rose-400 transition-colors">
                          {checkin.username}
                        </span>
                      </Link>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <FiClock className="w-3 h-3" />
                        <span>{checkin.timeAgo}</span>
                      </div>
                    </div>

                    {/* Brand & Rating */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{categoryEmojis[checkin.category] || "🚬"}</span>
                      <Link 
                        href={`/cigar/${encodeURIComponent(checkin.brand)}`}
                        className="font-semibold text-white hover:text-rose-400 transition-colors"
                      >
                        {checkin.brand}
                      </Link>
                      {checkin.product && (
                        <span className="text-gray-400">• {checkin.product}</span>
                      )}
                    </div>

                    {checkin.rating && (
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map(star => (
                          <FiStar
                            key={star}
                            className={`w-4 h-4 ${
                              star <= checkin.rating!
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {checkin.review && (
                      <p className="text-sm text-gray-300 line-clamp-2">
                        {checkin.review}
                      </p>
                    )}
                  </div>

                  {/* Image */}
                  {checkin.imageUrl && (
                    <div className="relative aspect-video bg-slate-900">
                      <Image
                        src={checkin.imageUrl}
                        alt={checkin.brand}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}

                  {/* Action Footer */}
                  <div className="p-4 pt-3 border-t border-slate-700/50">
                    <button
                      onClick={() => handleLike(checkin.id)}
                      disabled={likedCheckins.has(checkin.id) || likingId === checkin.id}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                        likedCheckins.has(checkin.id)
                          ? 'bg-rose-500/20 text-rose-400 cursor-default'
                          : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:opacity-90 active:scale-95'
                      }`}
                    >
                      {likedCheckins.has(checkin.id) ? (
                        <>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-xl"
                          >
                            💖
                          </motion.div>
                          <span>You&apos;re a Hero!</span>
                        </>
                      ) : likingId === checkin.id ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                      ) : (
                        <>
                          <FiHeart className="w-5 h-5" />
                          <span>Give Some Love</span>
                          <FiZap className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Encouragement Footer */}
        {data.checkins.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-sm text-gray-400 py-4"
          >
            <FiMessageCircle className="w-4 h-4 inline mr-1" />
            Pro tip: Comments mean even more than likes! 
            <Link href="/discover" className="text-rose-400 hover:underline ml-1">
              Visit their profile →
            </Link>
          </motion.div>
        )}
      </main>
    </div>
  );
}
