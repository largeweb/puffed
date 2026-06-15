"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { FiStar, FiHeart, FiMessageCircle, FiShuffle } from "react-icons/fi";
import Link from "next/link";
import { getCategory } from "@/lib/categories";
import type { CheckinCategory } from "@/lib/types";

interface RandomCheckin {
  id: string;
  username: string;
  brand: string;
  product?: string | null;
  rating?: number | null;
  review?: string | null;
  photo_url?: string | null;
  category: string;
  created_at: number;
  like_count: number;
  comment_count: number;
}

export default function RandomDiscovery() {
  const [checkin, setCheckin] = useState<RandomCheckin | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRandom = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/random-checkin");
      if (!res.ok) throw new Error("Failed to fetch");
      const data: { checkin: RandomCheckin | null } = await res.json();
      setCheckin(data.checkin);
      setHasLoaded(true);
    } catch (err) {
      setError("Couldn't load. Try again!");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const category = checkin ? getCategory(checkin.category as CheckinCategory) : null;
  const timeAgo = checkin ? getTimeAgo(new Date(checkin.created_at * 1000)) : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4 border bg-gradient-to-r from-cyan-900/30 to-teal-900/30 border-cyan-500/20"
    >
      <div className="flex items-center gap-2 mb-3">
        <FiShuffle className="text-cyan-400" />
        <span className="text-sm font-medium text-stone-200">Random Discovery</span>
        <span className="text-xs text-stone-500 ml-auto">Explore history</span>
      </div>

      {!hasLoaded ? (
        <div className="text-center py-4">
          <p className="text-sm text-stone-400 mb-3">
            Discover a smoke from the community archives ✨
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={fetchRandom}
            disabled={loading}
            className="flex items-center justify-center gap-2 mx-auto bg-cyan-500/30 hover:bg-cyan-500/40 text-cyan-200 rounded-lg py-2 px-5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-cyan-300 border-t-transparent rounded-full"
              />
            ) : (
              <>
                <FiShuffle className="w-4 h-4" />
                Surprise Me
              </>
            )}
          </motion.button>
        </div>
      ) : error ? (
        <div className="text-center py-3">
          <p className="text-sm text-red-400 mb-2">{error}</p>
          <button
            onClick={fetchRandom}
            className="text-cyan-400 text-sm hover:underline"
          >
            Try again
          </button>
        </div>
      ) : checkin ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={checkin.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Link
              href={`/checkin/${checkin.id}`}
              className="block p-3 rounded-xl bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 transition-all group"
            >
              <div className="flex gap-3">
                {checkin.photo_url ? (
                  <img
                    src={checkin.photo_url}
                    alt={checkin.brand}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                ) : category ? (
                  <div className={`w-16 h-16 rounded-lg ${category.bgColor} flex items-center justify-center text-2xl flex-shrink-0`}>
                    {category.emoji}
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-stone-800 flex items-center justify-center text-2xl flex-shrink-0">
                    🚬
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-cyan-400 text-sm">@{checkin.username}</span>
                    <span className="text-stone-500 text-xs">• {timeAgo}</span>
                  </div>
                  <div className="font-medium text-stone-100 truncate">
                    {checkin.brand}{checkin.product ? ` ${checkin.product}` : ''}
                  </div>
                  {checkin.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <FiStar className="w-3 h-3 text-amber-500" fill="currentColor" />
                      <span className="text-amber-500 text-xs">{checkin.rating}/5</span>
                    </div>
                  )}
                  {checkin.review && (
                    <p className="text-xs text-stone-400 mt-1 line-clamp-1">"{checkin.review}"</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-stone-500">
                    {checkin.like_count > 0 && (
                      <span className="flex items-center gap-1">
                        <FiHeart className="w-3 h-3" /> {checkin.like_count}
                      </span>
                    )}
                    {checkin.comment_count > 0 && (
                      <span className="flex items-center gap-1">
                        <FiMessageCircle className="w-3 h-3" /> {checkin.comment_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.preventDefault();
                fetchRandom();
              }}
              disabled={loading}
              className="w-full mt-3 flex items-center justify-center gap-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg py-2 px-4 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-cyan-300 border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <FiShuffle className="w-4 h-4" />
                  Another one
                </>
              )}
            </motion.button>
          </motion.div>
        </AnimatePresence>
      ) : (
        <p className="text-center text-sm text-stone-400 py-3">
          No check-ins found yet. Be the first!
        </p>
      )}
    </motion.div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return date.toLocaleDateString();
}
