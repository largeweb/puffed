"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiRefreshCw, FiStar, FiShare2, FiPlus } from "react-icons/fi";

interface FortuneData {
  fortune: string;
  emoji: string;
  luckyNumbers: number[];
  luckyFlavor?: string;
  category: string;
  personalized: boolean;
  insight?: string;
  dominantFlavor?: string;
  stats?: {
    totalSmokes: number;
    uniqueBrands: number;
    avgRating: number | null;
  };
  error?: string;
}

export default function FortunePage() {
  const router = useRouter();
  const [fortune, setFortune] = useState<FortuneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchFortune();
  }, []);

  const fetchFortune = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/smoke-fortune");
      const data = await res.json();
      if (data.error) {
        router.push("/login");
        return;
      }
      setFortune(data);
    } catch (error) {
      console.error("Fortune error:", error);
    } finally {
      setLoading(false);
    }
  };

  const revealFortune = () => {
    setRevealing(true);
    // Dramatic reveal after animation
    setTimeout(() => {
      setRevealed(true);
      setRevealing(false);
    }, 1500);
  };

  const handleShare = async () => {
    if (!fortune) return;
    
    const shareText = `🔮 My Smoke Fortune: "${fortune.fortune}"\n\n🍀 Lucky Numbers: ${fortune.luckyNumbers.join(", ")}\n${fortune.luckyFlavor ? `🌿 Lucky Flavor: ${fortune.luckyFlavor}\n` : ""}\n#Puffed #SmokeFortune`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Smoke Fortune - Puffed",
          text: shareText,
        });
        setShareStatus("Shared!");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          copyToClipboard(shareText);
        }
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShareStatus("Copied!");
      setTimeout(() => setShareStatus(null), 2000);
    } catch {
      setShareStatus("Failed");
      setTimeout(() => setShareStatus(null), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950/50 via-gray-900 to-gray-900">
      {/* Mystical background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-purple-500/5 to-transparent rounded-full" />
      </div>

      {/* Header */}
      <header className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <FiArrowLeft />
            <span>Back</span>
          </button>
          <h1 className="text-lg font-semibold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            🔮 Smoke Fortune
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 relative">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="text-6xl"
            >
              🔮
            </motion.div>
          </div>
        ) : fortune ? (
          <div className="space-y-6">
            {/* Crystal Ball */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex justify-center"
            >
              <div className="relative">
                <motion.div
                  animate={revealing ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
                  transition={{ duration: 1.5 }}
                  className="text-8xl filter drop-shadow-[0_0_40px_rgba(147,51,234,0.5)]"
                >
                  🔮
                </motion.div>
                {revealing && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 2, 0] }}
                    transition={{ duration: 1.5 }}
                    className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl"
                  />
                )}
              </div>
            </motion.div>

            {/* Reveal Button or Fortune */}
            <AnimatePresence mode="wait">
              {!revealed ? (
                <motion.div
                  key="reveal"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6"
                >
                  <p className="text-gray-400 text-sm">The smoke swirls with ancient wisdom...</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={revealFortune}
                    disabled={revealing}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full text-white font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all disabled:opacity-50"
                  >
                    {revealing ? (
                      <span className="flex items-center gap-2">
                        <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>✨</motion.span>
                        Consulting the smoke...
                      </span>
                    ) : (
                      "Reveal Your Fortune"
                    )}
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="fortune"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Main Fortune Card */}
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="glass rounded-2xl p-6 border border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-indigo-900/20"
                  >
                    <div className="text-center space-y-4">
                      <span className="text-4xl">{fortune.emoji}</span>
                      <p className="text-xl text-white font-medium leading-relaxed">
                        &ldquo;{fortune.fortune}&rdquo;
                      </p>
                      {fortune.insight && (
                        <p className="text-purple-300 text-sm italic">{fortune.insight}</p>
                      )}
                    </div>
                  </motion.div>

                  {/* Lucky Numbers & Flavor */}
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="glass rounded-xl p-4 text-center"
                    >
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Lucky Numbers</p>
                      <div className="flex justify-center gap-2">
                        {fortune.luckyNumbers.map((num, i) => (
                          <motion.span
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3 + i * 0.1 }}
                            className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg"
                          >
                            {num}
                          </motion.span>
                        ))}
                      </div>
                    </motion.div>

                    {fortune.luckyFlavor && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="glass rounded-xl p-4 text-center"
                      >
                        <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Lucky Flavor</p>
                        <div className="flex flex-col items-center">
                          <span className="text-2xl mb-1">🌿</span>
                          <span className="text-white font-semibold">{fortune.luckyFlavor}</span>
                        </div>
                      </motion.div>
                    )}

                    {!fortune.luckyFlavor && fortune.dominantFlavor && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="glass rounded-xl p-4 text-center"
                      >
                        <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Your Aura</p>
                        <div className="flex flex-col items-center">
                          <span className="text-2xl mb-1">✨</span>
                          <span className="text-white font-semibold capitalize">{fortune.dominantFlavor}</span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Stats if personalized */}
                  {fortune.personalized && fortune.stats && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="glass rounded-xl p-4"
                    >
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-3 text-center">Your Smoking Spirit</p>
                      <div className="flex justify-around text-center">
                        <div>
                          <p className="text-2xl font-bold text-white">{fortune.stats.totalSmokes}</p>
                          <p className="text-gray-500 text-xs">Smokes</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">{fortune.stats.uniqueBrands}</p>
                          <p className="text-gray-500 text-xs">Brands</p>
                        </div>
                        {fortune.stats.avgRating && (
                          <div>
                            <p className="text-2xl font-bold text-white flex items-center justify-center gap-1">
                              {fortune.stats.avgRating} <FiStar className="text-amber-500" size={16} />
                            </p>
                            <p className="text-gray-500 text-xs">Avg Rating</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Actions */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex justify-center gap-4"
                  >
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors relative"
                    >
                      <FiShare2 />
                      <span>Share Fortune</span>
                      {shareStatus && (
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-purple-500 px-2 py-1 rounded whitespace-nowrap">
                          {shareStatus}
                        </span>
                      )}
                    </button>
                  </motion.div>

                  {/* CTA */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-center pt-4"
                  >
                    <p className="text-gray-500 text-sm mb-4">
                      The stars say it&apos;s time for a smoke...
                    </p>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 rounded-full text-white font-semibold shadow-lg hover:shadow-amber-500/25 transition-all"
                    >
                      <FiPlus />
                      Log a Smoke
                    </Link>
                  </motion.div>

                  {/* Return tomorrow */}
                  <p className="text-center text-gray-600 text-xs">
                    🌙 New fortune available at midnight
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">
            The smoke has cleared... refresh to try again.
          </div>
        )}
      </main>
    </div>
  );
}
