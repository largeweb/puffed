"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiHome, FiRefreshCw, FiClock, FiStar, FiHash, FiZap, FiGift } from "react-icons/fi";
import type { SmokeFortune } from "../api/smoke-fortune/route";

function FortuneCard({ fortune, revealed }: { fortune: SmokeFortune; revealed: boolean }) {
  return (
    <motion.div
      initial={{ rotateY: 180, opacity: 0 }}
      animate={{ rotateY: revealed ? 0 : 180, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative"
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="bg-gradient-to-br from-amber-900/40 via-orange-800/30 to-amber-900/40 rounded-3xl p-8 border-2 border-amber-500/30 shadow-2xl shadow-amber-500/10">
        {/* Fortune cookie emoji header */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="text-center mb-6"
        >
          <span className="text-7xl">{fortune.emoji}</span>
        </motion.div>

        {/* Main fortune text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-8"
        >
          <p className="text-2xl sm:text-3xl font-serif text-amber-100 leading-relaxed italic">
            "{fortune.fortune}"
          </p>
        </motion.div>

        {/* Fortune metadata */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="space-y-4"
        >
          {/* Lucky numbers */}
          <div className="flex items-center justify-center gap-2">
            <FiHash className="text-amber-500" />
            <span className="text-gray-400 text-sm">Lucky Numbers:</span>
            <div className="flex gap-2">
              {fortune.luckyNumbers.map((num, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm font-bold"
                >
                  {num}
                </motion.span>
              ))}
            </div>
          </div>

          {/* Lucky brand */}
          <div className="flex items-center justify-center gap-2">
            <FiGift className="text-amber-500" />
            <span className="text-gray-400 text-sm">Lucky Brand:</span>
            <span className="text-amber-300 font-semibold">{fortune.luckyBrand}</span>
          </div>

          {/* Category badge */}
          <div className="flex justify-center">
            <span className="bg-amber-500/10 text-amber-400/80 px-4 py-1 rounded-full text-xs uppercase tracking-wider border border-amber-500/20">
              {fortune.category}
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function CrackingAnimation({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.1, 0.9, 1.05, 0] }}
      transition={{ duration: 1.5, times: [0, 0.2, 0.4, 0.6, 1] }}
      className="text-center"
    >
      <motion.span
        className="text-9xl block"
        animate={{ rotate: [0, -10, 10, -5, 0] }}
        transition={{ duration: 0.5, repeat: 2 }}
      >
        🥠
      </motion.span>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1.5 }}
        className="text-amber-400 text-xl mt-4"
      >
        Cracking your fortune...
      </motion.p>
    </motion.div>
  );
}

export default function FortunePage() {
  const router = useRouter();
  const [fortune, setFortune] = useState<SmokeFortune | null>(null);
  const [loading, setLoading] = useState(true);
  const [cracking, setCracking] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const fetchFortune = useCallback(async () => {
    try {
      const res = await fetch("/api/smoke-fortune");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const data = await res.json() as SmokeFortune;
      setFortune(data);
    } catch (error) {
      console.error("Failed to load fortune:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchFortune();
  }, [fetchFortune]);

  const handleCrack = () => {
    setCracking(true);
  };

  const handleCrackComplete = () => {
    setCracking(false);
    setRevealed(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-amber-950/20 to-black text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-2/3 mx-auto"></div>
            <div className="h-64 bg-gray-700/50 rounded-3xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-amber-950/20 to-black text-white">
      {/* Mystical particles background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-amber-500/30 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
              y: typeof window !== 'undefined' ? window.innerHeight + 10 : 800,
            }}
            animate={{
              y: -10,
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 4,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-lg border-b border-amber-500/10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <FiHome className="text-xl text-gray-400" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥠</span>
            <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Smoke Fortune
            </h1>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Date header */}
        {fortune && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <p className="text-gray-400 text-sm">{fortune.todayDate}</p>
            {fortune.streak > 0 && (
              <p className="text-amber-500 text-sm mt-1 flex items-center justify-center gap-1">
                <FiZap /> {fortune.streak} day streak amplifies your fortune!
              </p>
            )}
          </motion.div>
        )}

        {/* Fortune display */}
        <AnimatePresence mode="wait">
          {cracking ? (
            <CrackingAnimation key="cracking" onComplete={handleCrackComplete} />
          ) : revealed && fortune ? (
            <motion.div key="revealed">
              <FortuneCard fortune={fortune} revealed={revealed} />
              
              {/* Next fortune timer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-8 text-center"
              >
                <div className="inline-flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-full text-gray-400 text-sm">
                  <FiClock />
                  <span>Next fortune in {fortune.nextFortuneIn}h</span>
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  Fortune #{fortune.fortuneNumber} of 50
                </p>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="initial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              {/* Unopened fortune cookie */}
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, 2, -2, 0],
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="mb-8"
              >
                <span className="text-9xl">🥠</span>
              </motion.div>

              <h2 className="text-2xl font-bold text-amber-100 mb-4">
                Your Daily Smoke Fortune Awaits
              </h2>
              <p className="text-gray-400 mb-8 max-w-xs mx-auto">
                Crack open your fortune cookie to reveal today's mystical cigar wisdom
              </p>

              <motion.button
                onClick={handleCrack}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-shadow"
              >
                🔮 Reveal Your Fortune
              </motion.button>

              {/* Teaser stats */}
              <div className="mt-12 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-400">50</p>
                  <p className="text-xs text-gray-500">Unique Fortunes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-400">6</p>
                  <p className="text-xs text-gray-500">Categories</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-400">∞</p>
                  <p className="text-xs text-gray-500">Wisdom</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category legend (shown after reveal) */}
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="mt-12 bg-gray-800/30 rounded-2xl p-4"
          >
            <h3 className="text-sm font-semibold text-gray-400 mb-3 text-center">Fortune Categories</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {['discovery', 'wisdom', 'social', 'pairing', 'fortune', 'time'].map((cat) => (
                <span
                  key={cat}
                  className={`px-3 py-1 rounded-full text-xs ${
                    fortune?.category === cat 
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50' 
                      : 'bg-gray-700/50 text-gray-500'
                  }`}
                >
                  {cat}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
