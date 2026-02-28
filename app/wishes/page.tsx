"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiHome, FiStar, FiSend, FiMoon, FiClock } from "react-icons/fi";

interface Wish {
  id: number;
  username: string;
  wishText: string;
  stars: number;
  createdAt: number;
  isYours: boolean;
  youStarred: boolean;
  timeAgo: string;
}

interface WishData {
  wishes: Wish[];
  isWishingHour: boolean;
  currentHour: number;
  stats: {
    totalWishes: number;
    totalStars: number;
    yourWishes: number;
    yourStarsReceived: number;
  };
  magicMessage: string;
  username: string;
}

export default function WishesPage() {
  const router = useRouter();
  const [data, setData] = useState<WishData | null>(null);
  const [loading, setLoading] = useState(true);
  const [wishText, setWishText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showStars, setShowStars] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/wishes");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const result = (await res.json()) as WishData;
      setData(result);
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const submitWish = async () => {
    if (!wishText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wishText: wishText.trim() }),
      });
      if (res.ok) {
        setWishText("");
        setShowStars(true);
        setTimeout(() => setShowStars(false), 2000);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to submit:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const starWish = async (wishId: number) => {
    try {
      await fetch("/api/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "star", wishId }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to star:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-purple-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-4xl"
        >
          🌟
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-purple-950 flex items-center justify-center text-white">
        Failed to load wishes
      </div>
    );
  }

  const getNextWishingHour = () => {
    const hour = data.currentHour;
    if (hour < 1) return 1 - hour;
    if (hour >= 4) return 24 - hour + 1;
    return 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-purple-950 relative overflow-hidden">
      {/* Animated stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Shooting star on wish submit */}
      <AnimatePresence>
        {showStars && (
          <motion.div
            initial={{ x: -100, y: 100, opacity: 1 }}
            animate={{ x: window.innerWidth + 100, y: -100, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute text-4xl z-50"
          >
            ✨🌠✨
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-lg mx-auto p-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-2">
          <Link href="/dashboard" className="text-white/60 hover:text-white">
            <FiHome size={24} />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>🌟</span> Smoke Wishes
            </h1>
            <p className="text-xs text-purple-300/70">The 2 AM Wishing Well</p>
          </div>
          <div className="w-6" />
        </div>

        {/* Magic Message */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <p className="text-purple-200/80 italic text-sm">
            &quot;{data.magicMessage}&quot;
          </p>
        </motion.div>

        {/* Current Status */}
        {data.isWishingHour ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 rounded-2xl p-4 mb-6 border border-purple-500/30"
          >
            <div className="flex items-center justify-center gap-2 text-purple-200 mb-3">
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🌟
              </motion.span>
              <span className="font-medium">The Wishing Hour is NOW</span>
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              >
                🌟
              </motion.span>
            </div>

            {/* Wish Input */}
            <div className="relative">
              <textarea
                value={wishText}
                onChange={(e) => setWishText(e.target.value)}
                placeholder="Close your eyes... what do you wish for?"
                className="w-full bg-slate-900/50 text-white placeholder-purple-300/40 rounded-xl p-4 pr-12 resize-none border border-purple-500/20 focus:border-purple-400/50 focus:outline-none"
                rows={3}
                maxLength={280}
              />
              <button
                onClick={submitWish}
                disabled={!wishText.trim() || submitting}
                className="absolute right-3 bottom-3 text-purple-400 hover:text-purple-200 disabled:opacity-30 transition-colors"
              >
                <FiSend size={20} />
              </button>
            </div>
            <div className="text-right text-xs text-purple-400/50 mt-1">
              {wishText.length}/280
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900/40 rounded-2xl p-6 mb-6 border border-slate-700/30 text-center"
          >
            <FiMoon className="mx-auto text-slate-500 mb-2" size={32} />
            <p className="text-slate-400 mb-2">The Well Sleeps...</p>
            <div className="flex items-center justify-center gap-2 text-slate-500">
              <FiClock size={14} />
              <span className="text-sm">
                Opens in {getNextWishingHour()} hour{getNextWishingHour() !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-2">1 AM - 4 AM EST</p>
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="bg-slate-900/30 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-purple-300">{data.stats.totalWishes}</div>
            <div className="text-xs text-slate-500">All Wishes</div>
          </div>
          <div className="bg-slate-900/30 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-yellow-300">{data.stats.totalStars}</div>
            <div className="text-xs text-slate-500">⭐ Given</div>
          </div>
          <div className="bg-slate-900/30 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-indigo-300">{data.stats.yourWishes}</div>
            <div className="text-xs text-slate-500">Your Wishes</div>
          </div>
          <div className="bg-slate-900/30 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-pink-300">{data.stats.yourStarsReceived}</div>
            <div className="text-xs text-slate-500">⭐ Received</div>
          </div>
        </div>

        {/* Wishes Feed */}
        <div className="space-y-3">
          <h2 className="text-purple-300/70 text-sm font-medium flex items-center gap-2">
            <span>✨</span> Tonight&apos;s Wishes
          </h2>

          {data.wishes.length === 0 ? (
            <div className="text-center py-12">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-4xl mb-4"
              >
                🌙
              </motion.div>
              <p className="text-slate-500">No wishes tonight yet...</p>
              <p className="text-xs text-slate-600 mt-1">
                Be the first to make a wish
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {data.wishes.map((wish, idx) => (
                <motion.div
                  key={wish.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-4 rounded-2xl ${
                    wish.isYours
                      ? "bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30"
                      : "bg-slate-900/40 border border-slate-700/30"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400 font-medium text-sm">
                        @{wish.username}
                      </span>
                      {wish.isYours && (
                        <span className="text-xs text-purple-400/60">(you)</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{wish.timeAgo}</span>
                  </div>

                  <p className="text-white/90 text-sm leading-relaxed mb-3">
                    {wish.wishText}
                  </p>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => starWish(wish.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                        wish.youStarred
                          ? "bg-yellow-500/20 text-yellow-300"
                          : "bg-slate-800/50 text-slate-400 hover:bg-yellow-500/10 hover:text-yellow-400"
                      }`}
                    >
                      <FiStar
                        size={14}
                        className={wish.youStarred ? "fill-yellow-400" : ""}
                      />
                      <span className="text-xs font-medium">{wish.stars}</span>
                    </button>

                    {wish.stars >= 5 && (
                      <span className="text-xs text-yellow-400/70">
                        ✨ Gaining power...
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer hint */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-600">
            Stars help wishes come true 🌟
          </p>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800/50 p-4">
        <div className="max-w-lg mx-auto flex justify-around">
          <Link
            href="/void"
            className="text-slate-500 hover:text-white transition-colors text-center"
          >
            <span className="text-xl">🕳️</span>
            <p className="text-[10px] mt-0.5">Void</p>
          </Link>
          <Link
            href="/insomnia"
            className="text-slate-500 hover:text-white transition-colors text-center"
          >
            <span className="text-xl">🦉</span>
            <p className="text-[10px] mt-0.5">Insomnia</p>
          </Link>
          <div className="text-purple-400 text-center">
            <span className="text-xl">🌟</span>
            <p className="text-[10px] mt-0.5">Wishes</p>
          </div>
          <Link
            href="/goodnight"
            className="text-slate-500 hover:text-white transition-colors text-center"
          >
            <span className="text-xl">😴</span>
            <p className="text-[10px] mt-0.5">Goodnight</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
