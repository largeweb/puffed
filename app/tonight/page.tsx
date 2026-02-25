"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { FiHome, FiRefreshCw, FiClock, FiStar, FiHeart, FiCheck, FiChevronRight, FiMoon, FiZap } from "react-icons/fi";
import Link from "next/link";

interface TonightsPick {
  brand: string;
  product?: string;
  reason: string;
  reasonEmoji: string;
  confidence: "perfect" | "strong" | "good";
  lastSmoked?: number;
  avgRating?: number;
  communityAvgRating?: number;
  timesSmoked: number;
  flavorProfile: string[];
  suggestion: string;
  alternatives: {
    brand: string;
    reason: string;
  }[];
  error?: string;
}

interface DailyTip {
  id: string;
  category: string;
  emoji: string;
  tip: string;
  detail: string;
}

const CONFIDENCE_STYLES = {
  perfect: {
    badge: "bg-gradient-to-r from-amber-500 to-yellow-500",
    glow: "shadow-amber-500/30",
    text: "Perfect Match",
    emoji: "🎯",
  },
  strong: {
    badge: "bg-gradient-to-r from-orange-500 to-amber-500",
    glow: "shadow-orange-500/30",
    text: "Strong Pick",
    emoji: "💪",
  },
  good: {
    badge: "bg-gradient-to-r from-blue-500 to-cyan-500",
    glow: "shadow-blue-500/30",
    text: "Good Option",
    emoji: "👍",
  },
};

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <FiStar
          key={star}
          className={`w-4 h-4 ${star <= rating ? "text-amber-400 fill-current" : "text-gray-600"}`}
        />
      ))}
    </div>
  );
}

export default function TonightPage() {
  const [pick, setPick] = useState<TonightsPick | null>(null);
  const [tip, setTip] = useState<DailyTip | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggedSmoke, setLoggedSmoke] = useState(false);

  const fetchData = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const [pickRes, tipRes] = await Promise.all([
        fetch("/api/tonights-pick"),
        fetch("/api/daily-tip"),
      ]);
      
      if (pickRes.ok) {
        setPick(await pickRes.json() as TonightsPick);
      }
      if (tipRes.ok) {
        const data = await tipRes.json() as { tip: DailyTip };
        setTip(data.tip);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogSmoke = () => {
    if (pick?.brand) {
      // Redirect to checkin page with brand pre-filled
      window.location.href = `/checkin?brand=${encodeURIComponent(pick.brand)}${pick.product ? `&product=${encodeURIComponent(pick.product)}` : ''}`;
    }
  };

  const confidenceStyle = pick?.confidence ? CONFIDENCE_STYLES[pick.confidence] : CONFIDENCE_STYLES.good;

  // Get current hour for time-based theming
  const hour = new Date().getHours();
  const isLateNight = hour >= 22 || hour < 4;
  const isEvening = hour >= 17 && hour < 22;
  const timeEmoji = isLateNight ? "🌙" : isEvening ? "🌆" : "☀️";
  const timeGreeting = isLateNight ? "Late Night Smoke" : isEvening ? "Evening Session" : "Today's Pick";

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-indigo-950/30 to-black p-4 pb-20">
      {/* Animated background stars for late night */}
      {isLateNight && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0.1, 0.5, 0.1],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between mb-6 relative z-10">
        <Link href="/dashboard" className="glass p-2 rounded-xl hover:bg-white/10 transition-colors">
          <FiHome className="text-xl" />
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          {timeEmoji} {timeGreeting}
        </h1>
        <button 
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="glass p-2 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <FiRefreshCw className={`text-xl ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-full border-4 border-indigo-500 border-t-transparent mb-4"
          />
          <p className="text-gray-400">Finding your perfect smoke...</p>
        </div>
      ) : pick?.error ? (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-gray-400">{pick.error}</p>
          <Link href="/dashboard" className="text-amber-400 mt-4 inline-block hover:underline">
            Back to Dashboard
          </Link>
        </div>
      ) : pick && (
        <div className="space-y-6 max-w-md mx-auto relative z-10">
          {/* Main Pick Card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`glass rounded-3xl p-6 relative overflow-hidden shadow-2xl ${confidenceStyle.glow}`}
          >
            {/* Confidence Badge */}
            <motion.div
              initial={{ x: 100 }}
              animate={{ x: 0 }}
              className={`absolute top-4 right-4 ${confidenceStyle.badge} px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1`}
            >
              {confidenceStyle.emoji} {confidenceStyle.text}
            </motion.div>

            {/* Reason Tag */}
            <div className="mb-4">
              <span className="text-2xl">{pick.reasonEmoji}</span>
              <span className="ml-2 text-sm text-gray-400">{pick.reason}</span>
            </div>

            {/* Brand & Product */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-3xl font-bold text-white mb-1">{pick.brand}</h2>
              {pick.product && (
                <p className="text-lg text-gray-300">{pick.product}</p>
              )}
            </motion.div>

            {/* Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-4 mt-4 text-sm"
            >
              {pick.avgRating && (
                <div className="flex items-center gap-1">
                  <StarDisplay rating={Math.round(pick.avgRating)} />
                  <span className="text-gray-400 ml-1">{pick.avgRating.toFixed(1)}</span>
                </div>
              )}
              {pick.timesSmoked > 0 && (
                <div className="flex items-center gap-1 text-gray-400">
                  <FiHeart className="text-pink-400" />
                  <span>×{pick.timesSmoked}</span>
                </div>
              )}
              {pick.lastSmoked && (
                <div className="flex items-center gap-1 text-gray-400">
                  <FiClock />
                  <span>{getTimeAgo(pick.lastSmoked)}</span>
                </div>
              )}
            </motion.div>

            {/* Flavor Profile */}
            {pick.flavorProfile.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-4 flex flex-wrap gap-2"
              >
                {pick.flavorProfile.slice(0, 5).map((flavor) => (
                  <span
                    key={flavor}
                    className="px-2 py-1 bg-white/10 rounded-full text-xs text-gray-300"
                  >
                    {flavor}
                  </span>
                ))}
              </motion.div>
            )}

            {/* Suggestion */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 text-gray-300 italic border-l-2 border-amber-500/50 pl-3"
            >
              "{pick.suggestion}"
            </motion.p>

            {/* CTA Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={handleLogSmoke}
              disabled={loggedSmoke}
              className={`w-full mt-6 py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
                loggedSmoke 
                  ? "bg-green-600 text-white"
                  : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-98"
              }`}
            >
              {loggedSmoke ? (
                <>
                  <FiCheck className="text-xl" /> Logged!
                </>
              ) : (
                <>
                  <FiZap className="text-xl" /> Light It Up
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Alternatives */}
          {pick.alternatives.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="glass rounded-2xl p-4"
            >
              <h3 className="text-sm font-medium text-gray-400 mb-3">Other Options</h3>
              <div className="space-y-2">
                {pick.alternatives.map((alt, idx) => (
                  <Link
                    key={idx}
                    href={`/checkin?brand=${encodeURIComponent(alt.brand)}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div>
                      <span className="font-medium">{alt.brand}</span>
                      <p className="text-xs text-gray-400">{alt.reason}</p>
                    </div>
                    <FiChevronRight className="text-gray-500" />
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* Daily Tip */}
          {tip && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="glass rounded-2xl p-5 border border-cyan-500/20 bg-gradient-to-br from-cyan-900/20 to-blue-900/20"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{tip.emoji}</span>
                <div>
                  <h3 className="font-semibold text-cyan-300 mb-1">Today's Tip</h3>
                  <p className="text-sm font-medium text-white">{tip.tip}</p>
                  <p className="text-xs text-gray-400 mt-1">{tip.detail}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Late Night Vibes */}
          {isLateNight && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-center text-gray-500 text-sm pt-4"
            >
              <FiMoon className="inline mr-1" />
              Night owl hours. Smoke slow, enjoy the quiet.
            </motion.div>
          )}

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="flex justify-center gap-4 pt-4"
          >
            <Link href="/flavor-dna" className="text-sm text-amber-400 hover:underline">
              Your Flavor DNA →
            </Link>
            <Link href="/roulette" className="text-sm text-purple-400 hover:underline">
              Smoke Roulette →
            </Link>
          </motion.div>
        </div>
      )}
    </div>
  );
}
