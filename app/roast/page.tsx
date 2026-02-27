"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiShare2, FiRefreshCw, FiZap, FiUser, FiCopy, FiCheck, FiX } from "react-icons/fi";
import Link from "next/link";

interface RoastData {
  username: string;
  roasts: string[];
  stats: {
    totalSmokes: number;
    favoriteBrand: string | null;
    avgRating: number | null;
    uniqueBrands: number;
  };
  roastLevel: "mild" | "medium" | "spicy";
  generatedAt: number;
  error?: string;
}

const ROAST_LEVEL_CONFIG = {
  mild: { emoji: "😊", label: "Mild", color: "text-green-400", bg: "bg-green-500/20" },
  medium: { emoji: "😏", label: "Medium", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  spicy: { emoji: "🔥", label: "Spicy", color: "text-red-400", bg: "bg-red-500/20" },
};

export default function RoastPage() {
  const router = useRouter();
  const [data, setData] = useState<RoastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [currentRoastIndex, setCurrentRoastIndex] = useState(0);
  const [showAllRoasts, setShowAllRoasts] = useState(false);

  const fetchRoasts = async (regenerate = false) => {
    if (regenerate) setRegenerating(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/smoke-roast?t=${Date.now()}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/");
          return;
        }
        throw new Error("Failed to fetch");
      }
      const json = await res.json() as RoastData;
      setData(json);
      setCurrentRoastIndex(0);
      setShowAllRoasts(false);
    } catch (error) {
      console.error("Error fetching roasts:", error);
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  useEffect(() => {
    fetchRoasts();
  }, []);

  const handleShare = async () => {
    if (!data) return;
    
    const roastText = data.roasts[0];
    const shareText = `🔥 I got roasted on Puffed!\n\n"${roastText}"\n\nGet your smoking habits roasted at`;
    const shareUrl = `${window.location.origin}/roast`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Smoke Roast 🔥",
          text: shareText,
          url: shareUrl,
        });
        setShareStatus("Shared!");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          await copyToClipboard(`${shareText}\n${shareUrl}`);
        }
      }
    } else {
      await copyToClipboard(`${shareText}\n${shareUrl}`);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setShareStatus("Copied!");
      setTimeout(() => {
        setCopied(false);
        setShareStatus(null);
      }, 2000);
    } catch {
      setShareStatus("Failed");
      setTimeout(() => setShareStatus(null), 2000);
    }
  };

  const nextRoast = () => {
    if (data) {
      setCurrentRoastIndex((prev) => (prev + 1) % data.roasts.length);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-4xl"
        >
          🔥
        </motion.div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-lg mx-auto">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
            <FiArrowLeft /> Back
          </Link>
          <div className="glass rounded-2xl p-6 text-center">
            <div className="text-4xl mb-4">😅</div>
            <h2 className="text-xl font-semibold mb-2">Couldn&apos;t generate roasts</h2>
            <p className="text-gray-400 mb-4">Log a few more smokes and come back!</p>
            <Link href="/dashboard" className="btn-primary">
              Start Logging
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const levelConfig = ROAST_LEVEL_CONFIG[data.roastLevel];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white">
            <FiArrowLeft /> Back
          </Link>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-2xl">🔥</span> Smoke Roast
          </h1>
          <button
            onClick={() => fetchRoasts(true)}
            disabled={regenerating}
            className="p-2 rounded-lg hover:bg-white/5 transition-all disabled:opacity-50"
          >
            <FiRefreshCw className={regenerating ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 space-y-6">
        {/* User Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-3xl">
              🔥
            </div>
            <div>
              <h2 className="text-xl font-bold">{data.username}</h2>
              <div className={`flex items-center gap-2 ${levelConfig.color}`}>
                <span>{levelConfig.emoji}</span>
                <span className="text-sm font-medium">{levelConfig.label} Roast Level</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-xl font-bold text-amber-400">{data.stats.totalSmokes}</div>
              <div className="text-xs text-gray-400">Smokes</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-xl font-bold text-cyan-400">{data.stats.uniqueBrands}</div>
              <div className="text-xs text-gray-400">Brands</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-xl font-bold text-yellow-400">
                {data.stats.avgRating?.toFixed(1) || "—"}
              </div>
              <div className="text-xs text-gray-400">Avg Rating</div>
            </div>
          </div>
        </motion.div>

        {/* Main Roast Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-3xl blur-xl" />
          <div className="relative glass rounded-3xl p-8 border border-red-500/30">
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.4 }}
                className="text-6xl mb-4"
              >
                🔥
              </motion.div>
              <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-2">
                Roast #{currentRoastIndex + 1} of {data.roasts.length}
              </h3>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentRoastIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                <p className="text-xl leading-relaxed text-gray-100 italic">
                  &ldquo;{data.roasts[currentRoastIndex]}&rdquo;
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Navigation dots */}
            <div className="flex justify-center gap-2 mt-6">
              {data.roasts.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentRoastIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentRoastIndex ? "bg-red-500 w-4" : "bg-white/20"
                  }`}
                />
              ))}
            </div>

            {/* Next roast button */}
            <button
              onClick={nextRoast}
              className="w-full mt-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-gray-300"
            >
              <FiZap /> Next Roast
            </button>
          </div>
        </motion.div>

        {/* All Roasts (expandable) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <button
            onClick={() => setShowAllRoasts(!showAllRoasts)}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all"
          >
            <span className="font-medium">View All Roasts</span>
            <motion.span
              animate={{ rotate: showAllRoasts ? 180 : 0 }}
              className="text-gray-400"
            >
              ▼
            </motion.span>
          </button>
          
          <AnimatePresence>
            {showAllRoasts && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-white/5"
              >
                <div className="p-4 space-y-3">
                  {data.roasts.map((roast, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white/5 rounded-xl text-sm text-gray-300"
                    >
                      <span className="text-red-400 font-medium">#{idx + 1}</span> {roast}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 font-semibold hover:opacity-90 transition-all"
          >
            {copied ? <FiCheck /> : <FiShare2 />}
            {shareStatus || "Share Roast"}
          </button>
          <Link
            href={`/user/${data.username}`}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 font-semibold hover:bg-white/20 transition-all"
          >
            <FiUser /> My Profile
          </Link>
        </div>

        {/* Roast Others */}
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-2">Want to roast your friends?</p>
          <p className="text-xs text-gray-500">Share the app and roast their smoking habits too! 🔥</p>
        </div>
      </main>
    </div>
  );
}
