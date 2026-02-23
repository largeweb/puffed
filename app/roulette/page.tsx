"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiRefreshCw, FiStar, FiUsers, FiClock, FiCheckCircle, FiArrowLeft, FiPlus } from "react-icons/fi";
import Link from "next/link";

interface RouletteSpin {
  brand: string;
  avgRating: number;
  totalCheckins: number;
  uniqueSmokers: number;
  lastSmoked: string;
  reason: string;
  isNew: boolean;
}

interface RouletteResponse {
  spin: RouletteSpin;
  alternatives: RouletteSpin[];
  error?: string;
}

export default function RoulettePage() {
  const [result, setResult] = useState<RouletteResponse | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const spin = async () => {
    setSpinning(true);
    try {
      // Add dramatic delay for effect
      await new Promise(resolve => setTimeout(resolve, 800));
      const res = await fetch("/api/smoke-roulette");
      const data: RouletteResponse = await res.json();
      setResult(data);
    } catch (error) {
      console.error("Spin error:", error);
    } finally {
      setSpinning(false);
    }
  };

  useEffect(() => {
    spin();
    setLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-gray-900/70 border-b border-purple-500/20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            🎰 Smoke Roulette
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Spin Button */}
        <div className="text-center mb-8">
          <motion.button
            onClick={spin}
            disabled={spinning}
            className="relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl font-bold text-lg shadow-lg shadow-purple-500/25 disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.span
              animate={spinning ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 0.8, repeat: spinning ? Infinity : 0, ease: "linear" }}
              className="inline-block mr-2"
            >
              <FiRefreshCw className="w-5 h-5" />
            </motion.span>
            {spinning ? "Spinning..." : "Spin Again!"}
          </motion.button>
          <p className="text-gray-400 text-sm mt-3">
            Discover something new to smoke today
          </p>
        </div>

        {/* Main Result */}
        <AnimatePresence mode="wait">
          {result?.spin && !spinning && (
            <motion.div
              key={result.spin.brand}
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -20 }}
              transition={{ type: "spring", damping: 15 }}
              className="mb-6"
            >
              <div className="relative p-6 rounded-3xl bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/30 shadow-xl shadow-purple-500/10">
                {/* New Badge */}
                {result.spin.isNew && (
                  <div className="absolute -top-3 -right-3 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full text-xs font-bold shadow-lg">
                    ✨ NEW FOR YOU
                  </div>
                )}

                {/* Brand Name */}
                <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                  {result.spin.brand}
                </h2>

                {/* Reason */}
                <p className="text-center text-gray-300 mb-4">
                  {result.spin.reason}
                </p>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 rounded-xl bg-white/5">
                    <FiStar className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                    <div className="text-xl font-bold">{result.spin.avgRating || "—"}</div>
                    <div className="text-xs text-gray-400">Avg Rating</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-white/5">
                    <FiCheckCircle className="w-5 h-5 mx-auto mb-1 text-green-400" />
                    <div className="text-xl font-bold">{result.spin.totalCheckins}</div>
                    <div className="text-xs text-gray-400">Check-ins</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-white/5">
                    <FiUsers className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                    <div className="text-xl font-bold">{result.spin.uniqueSmokers}</div>
                    <div className="text-xs text-gray-400">Smokers</div>
                  </div>
                </div>

                {/* Last Smoked */}
                <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-4">
                  <FiClock className="w-4 h-4" />
                  Last smoked {result.spin.lastSmoked}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Link
                    href={`/cigar/${encodeURIComponent(result.spin.brand)}`}
                    className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-center font-medium transition-colors"
                  >
                    View Details
                  </Link>
                  <Link
                    href="/dashboard"
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-center font-medium flex items-center justify-center gap-2"
                  >
                    <FiPlus className="w-4 h-4" />
                    Log This Smoke
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spinning State */}
        {spinning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="text-6xl mb-4"
            >
              🎰
            </motion.div>
            <p className="text-gray-400">Finding your next smoke...</p>
          </motion.div>
        )}

        {/* Alternatives */}
        {result?.alternatives && result.alternatives.length > 0 && !spinning && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-300 mb-4 text-center">
              Or try these alternatives...
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {result.alternatives.map((alt, i) => (
                <motion.div
                  key={alt.brand}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors"
                >
                  {alt.isNew && (
                    <span className="text-xs text-green-400 font-medium">✨ New</span>
                  )}
                  <h4 className="font-bold text-lg truncate">{alt.brand}</h4>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <FiStar className="text-amber-400" /> {alt.avgRating || "—"}
                    </span>
                    <span>{alt.totalCheckins} logs</span>
                  </div>
                  <Link
                    href={`/cigar/${encodeURIComponent(alt.brand)}`}
                    className="block mt-3 text-center py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
                  >
                    View
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {result?.error && (
          <div className="text-center py-16 text-gray-400">
            <p>{result.error}</p>
          </div>
        )}

        {/* Fun Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>🎲 Can&apos;t decide? Let fate choose for you!</p>
        </div>
      </main>
    </div>
  );
}
