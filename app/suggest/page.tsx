"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { FiHome, FiRefreshCw, FiStar, FiUsers, FiTrendingUp, FiBookmark, FiHeart, FiArrowRight, FiZap } from "react-icons/fi";
import { GiCigarette, GiMagicSwirl } from "react-icons/gi";
import Link from "next/link";

interface Suggestion {
  brand: string;
  avg_rating?: number;
  rating?: number;
  smoker_count?: number;
  checkin_count?: number;
  sample_image?: string;
  image_url?: string;
}

interface SuggestResponse {
  suggestion: Suggestion | null;
  suggestionType: string;
  alternatives: {
    fromFollows: Suggestion[];
    topRated: Suggestion[];
    wishlist: Suggestion | null;
    revisitFavorite: Suggestion | null;
  };
  stats: {
    brandsTried: number;
    totalBrands: number;
  };
}

const SUGGESTION_MESSAGES: Record<string, { emoji: string; title: string; subtitle: string }> = {
  follows: {
    emoji: "👥",
    title: "Your Friends Love This",
    subtitle: "People you follow rated this highly"
  },
  top_rated: {
    emoji: "🏆",
    title: "Community Favorite",
    subtitle: "Highly rated by the Puffed community"
  },
  wishlist: {
    emoji: "📋",
    title: "From Your Wishlist",
    subtitle: "You wanted to try this one!"
  },
  revisit: {
    emoji: "❤️",
    title: "Revisit a Favorite",
    subtitle: "You've loved this before"
  }
};

export default function SuggestPage() {
  const [data, setData] = useState<SuggestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const fetchSuggestion = async (withAnimation = true) => {
    if (withAnimation) {
      setSpinning(true);
      setRevealed(false);
    }
    setLoading(true);
    
    try {
      const res = await fetch("/api/suggest");
      if (res.ok) {
        const result: SuggestResponse = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error("Suggest error:", err);
    } finally {
      setLoading(false);
      if (withAnimation) {
        // Spin animation then reveal
        setTimeout(() => {
          setSpinning(false);
          setTimeout(() => setRevealed(true), 100);
        }, 1500);
      } else {
        setRevealed(true);
      }
    }
  };

  useEffect(() => {
    fetchSuggestion(false);
    setTimeout(() => setRevealed(true), 300);
  }, []);

  const messageConfig = data?.suggestionType ? SUGGESTION_MESSAGES[data.suggestionType] : null;
  const suggestion = data?.suggestion;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-black text-amber-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-stone-900/90 backdrop-blur-sm border-b border-amber-900/30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="text-amber-400 hover:text-amber-300">
            <FiHome size={24} />
          </Link>
          <h1 className="text-xl font-bold text-amber-100 flex items-center gap-2">
            <GiMagicSwirl className="text-amber-400" />
            What to Smoke?
          </h1>
          <div className="w-6" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Main Suggestion Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <div className="bg-gradient-to-br from-amber-900/40 to-stone-800/60 rounded-2xl border border-amber-700/30 overflow-hidden">
            {/* Spinning State */}
            <AnimatePresence mode="wait">
              {spinning ? (
                <motion.div
                  key="spinning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-12 flex flex-col items-center justify-center min-h-[300px]"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="text-amber-400 mb-4"
                  >
                    <GiMagicSwirl size={64} />
                  </motion.div>
                  <p className="text-amber-200 animate-pulse">Finding your perfect smoke...</p>
                </motion.div>
              ) : suggestion && revealed ? (
                <motion.div
                  key="revealed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Image or placeholder */}
                  <div className="relative h-48 bg-gradient-to-br from-amber-800/30 to-stone-800/50">
                    {(suggestion.sample_image || suggestion.image_url) ? (
                      <img
                        src={suggestion.sample_image || suggestion.image_url}
                        alt={suggestion.brand}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <GiCigarette className="text-amber-600/40" size={80} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 to-transparent" />
                    
                    {/* Badge */}
                    {messageConfig && (
                      <div className="absolute top-4 left-4 bg-amber-600/90 px-3 py-1 rounded-full flex items-center gap-2">
                        <span>{messageConfig.emoji}</span>
                        <span className="text-sm font-medium text-white">{messageConfig.title}</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h2 className="text-3xl font-bold text-amber-100 mb-2">
                      {suggestion.brand}
                    </h2>
                    
                    {messageConfig && (
                      <p className="text-amber-300/70 mb-4">{messageConfig.subtitle}</p>
                    )}

                    <div className="flex items-center gap-4 mb-6">
                      {(suggestion.avg_rating || suggestion.rating) && (
                        <div className="flex items-center gap-1">
                          <FiStar className="text-amber-400" />
                          <span className="text-amber-200">{suggestion.avg_rating || suggestion.rating}</span>
                        </div>
                      )}
                      {suggestion.smoker_count && suggestion.smoker_count > 1 && (
                        <div className="flex items-center gap-1">
                          <FiUsers className="text-amber-400/70" />
                          <span className="text-amber-200/70">{suggestion.smoker_count} people</span>
                        </div>
                      )}
                      {suggestion.checkin_count && (
                        <div className="flex items-center gap-1">
                          <GiCigarette className="text-amber-400/70" />
                          <span className="text-amber-200/70">{suggestion.checkin_count} check-ins</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Link
                        href={`/cigar/${encodeURIComponent(suggestion.brand)}`}
                        className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        View Details
                        <FiArrowRight />
                      </Link>
                      <Link
                        href="/checkin"
                        className="bg-stone-700 hover:bg-stone-600 text-amber-200 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <GiCigarette />
                        Log It
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ) : !suggestion && !loading ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-12 text-center min-h-[300px] flex flex-col items-center justify-center"
                >
                  <GiCigarette className="text-amber-400/30 mb-4" size={64} />
                  <p className="text-amber-200 mb-2">No suggestions yet!</p>
                  <p className="text-amber-400/60 text-sm mb-4">
                    Follow some users or check in more smokes to get personalized recommendations
                  </p>
                  <Link
                    href="/discover"
                    className="bg-amber-600 hover:bg-amber-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Discover Users
                  </Link>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Shuffle Button */}
          {!spinning && suggestion && (
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => fetchSuggestion(true)}
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold py-3 px-6 rounded-full shadow-lg flex items-center gap-2 transition-colors"
            >
              <FiRefreshCw className={spinning ? "animate-spin" : ""} />
              Shuffle
            </motion.button>
          )}
        </motion.div>

        {/* Stats */}
        {data?.stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-stone-800/40 rounded-xl p-4 border border-amber-900/20"
          >
            <div className="flex items-center justify-center gap-2 text-amber-300">
              <FiZap className="text-amber-400" />
              <span>You've tried <strong>{data.stats.brandsTried}</strong> brands so far!</span>
            </div>
          </motion.div>
        )}

        {/* Alternative Suggestions */}
        {data && revealed && !spinning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            {/* From Follows */}
            {data.alternatives.fromFollows.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                  <FiUsers size={14} />
                  More from people you follow
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {data.alternatives.fromFollows.map((s, i) => (
                    <Link
                      key={`follow-${i}`}
                      href={`/cigar/${encodeURIComponent(s.brand)}`}
                      className="flex-shrink-0 bg-stone-800/40 rounded-lg p-3 border border-amber-900/20 hover:border-amber-700/40 transition-colors min-w-[140px]"
                    >
                      <p className="text-amber-100 font-medium text-sm truncate">{s.brand}</p>
                      <div className="flex items-center gap-1 text-xs text-amber-400/60 mt-1">
                        <FiStar size={10} />
                        <span>{s.avg_rating}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Top Rated */}
            {data.alternatives.topRated.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                  <FiTrendingUp size={14} />
                  Top rated you haven't tried
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {data.alternatives.topRated.map((s, i) => (
                    <Link
                      key={`top-${i}`}
                      href={`/cigar/${encodeURIComponent(s.brand)}`}
                      className="flex-shrink-0 bg-stone-800/40 rounded-lg p-3 border border-amber-900/20 hover:border-amber-700/40 transition-colors min-w-[140px]"
                    >
                      <p className="text-amber-100 font-medium text-sm truncate">{s.brand}</p>
                      <div className="flex items-center gap-1 text-xs text-amber-400/60 mt-1">
                        <FiStar size={10} />
                        <span>{s.avg_rating}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Wishlist */}
            {data.alternatives.wishlist && (
              <div>
                <h3 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                  <FiBookmark size={14} />
                  From your wishlist
                </h3>
                <Link
                  href={`/cigar/${encodeURIComponent(data.alternatives.wishlist.brand)}`}
                  className="block bg-stone-800/40 rounded-lg p-3 border border-amber-900/20 hover:border-amber-700/40 transition-colors"
                >
                  <p className="text-amber-100 font-medium">{data.alternatives.wishlist.brand}</p>
                </Link>
              </div>
            )}

            {/* Revisit Favorite */}
            {data.alternatives.revisitFavorite && (
              <div>
                <h3 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                  <FiHeart size={14} />
                  Revisit a favorite
                </h3>
                <Link
                  href={`/cigar/${encodeURIComponent(data.alternatives.revisitFavorite.brand)}`}
                  className="block bg-stone-800/40 rounded-lg p-3 border border-amber-900/20 hover:border-amber-700/40 transition-colors"
                >
                  <p className="text-amber-100 font-medium">{data.alternatives.revisitFavorite.brand}</p>
                  {data.alternatives.revisitFavorite.rating && (
                    <div className="flex items-center gap-1 text-xs text-amber-400/60 mt-1">
                      <FiStar size={10} />
                      <span>You rated it {data.alternatives.revisitFavorite.rating}</span>
                    </div>
                  )}
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
