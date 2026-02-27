"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiHome,
  FiRefreshCw,
  FiSend,
  FiLock,
  FiUnlock,
  FiClock,
  FiCalendar,
  FiGift,
  FiPlus,
  FiX,
} from "react-icons/fi";

interface TimeCapsule {
  id: string;
  message: string;
  brand: string | null;
  product: string | null;
  mood: string | null;
  createdAt: number;
  unlocksAt: number;
  isUnlocked: boolean;
  timeUntilUnlock: string;
  timeSinceCreated: string;
}

interface TimeCapsuleData {
  myCapsules: {
    locked: TimeCapsule[];
    unlocked: TimeCapsule[];
  };
  stats: {
    totalCapsules: number;
    lockedCount: number;
    unlockedCount: number;
    nextUnlock: string | null;
    oldestCapsule: string | null;
  };
  canCreate: boolean;
  maxCapsulesReached: boolean;
}

const MOODS = [
  { id: "reflective", emoji: "🤔", label: "Reflective" },
  { id: "hopeful", emoji: "🌟", label: "Hopeful" },
  { id: "nostalgic", emoji: "🌙", label: "Nostalgic" },
  { id: "grateful", emoji: "🙏", label: "Grateful" },
  { id: "ambitious", emoji: "🚀", label: "Ambitious" },
  { id: "peaceful", emoji: "😌", label: "Peaceful" },
  { id: "curious", emoji: "🔮", label: "Curious" },
  { id: "excited", emoji: "✨", label: "Excited" },
];

const UNLOCK_OPTIONS = [
  { days: 7, label: "1 Week", emoji: "📅" },
  { days: 30, label: "1 Month", emoji: "🗓️" },
  { days: 90, label: "3 Months", emoji: "🌸" },
  { days: 180, label: "6 Months", emoji: "☀️" },
  { days: 365, label: "1 Year", emoji: "🎆" },
];

export default function TimeCapsulePage() {
  const router = useRouter();
  const [data, setData] = useState<TimeCapsuleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<"locked" | "unlocked">("locked");

  // Create form state
  const [message, setMessage] = useState("");
  const [unlockDays, setUnlockDays] = useState<number>(30);
  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      try {
        const res = await fetch("/api/time-capsule");
        if (res.status === 401) {
          router.push("/");
          return;
        }
        const result = (await res.json()) as TimeCapsuleData;
        setData(result);
      } catch (error) {
        console.error("Failed to load:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    if (!message.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/time-capsule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          unlockDays,
          brand: brand.trim() || undefined,
          product: product.trim() || undefined,
          mood: mood || undefined,
        }),
      });

      const result = await res.json() as { success?: boolean; message?: string; error?: string };

      if (res.ok && result.success) {
        setShowSuccess(true);
        setSuccessMessage(result.message || "Time capsule created!");
        setMessage("");
        setBrand("");
        setProduct("");
        setMood(null);
        setUnlockDays(30);
        setTimeout(() => {
          setShowSuccess(false);
          setShowCreate(false);
          fetchData();
        }, 3000);
      } else {
        alert(result.error || "Failed to create capsule");
      }
    } catch (error) {
      console.error("Failed to submit:", error);
      alert("Failed to create capsule");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-violet-400"
        >
          <FiGift className="w-8 h-8 animate-pulse" />
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <p className="text-red-400">Failed to load</p>
      </div>
    );
  }

  const { myCapsules, stats, canCreate, maxCapsulesReached } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-950 via-purple-950 to-slate-950 text-white pb-20">
      {/* Floating particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-violet-500/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 4,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-violet-950/90 backdrop-blur-md border-b border-violet-500/20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 hover:bg-violet-500/10 rounded-lg transition">
              <FiHome className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-bold flex items-center gap-2">
                <span className="text-2xl">📦</span> Time Capsule
              </h1>
              <p className="text-xs text-violet-400/80">Messages to your future self</p>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 hover:bg-violet-500/10 rounded-lg transition disabled:opacity-50"
          >
            <FiRefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 relative z-10">
        {/* Stats Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="bg-violet-900/30 rounded-xl p-3 text-center border border-violet-500/20">
            <p className="text-2xl font-bold text-violet-400">{stats.lockedCount}</p>
            <p className="text-xs text-violet-300/60">Locked</p>
          </div>
          <div className="bg-violet-900/30 rounded-xl p-3 text-center border border-violet-500/20">
            <p className="text-2xl font-bold text-green-400">{stats.unlockedCount}</p>
            <p className="text-xs text-violet-300/60">Unlocked</p>
          </div>
          <div className="bg-violet-900/30 rounded-xl p-3 text-center border border-violet-500/20">
            <p className="text-lg font-bold text-amber-400 truncate">{stats.nextUnlock || "—"}</p>
            <p className="text-xs text-violet-300/60">Next Unlock</p>
          </div>
        </motion.div>

        {/* Create Button */}
        {canCreate && !showCreate && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setShowCreate(true)}
            className="w-full mb-6 p-4 bg-gradient-to-r from-violet-600/30 to-purple-600/30 rounded-xl border border-violet-500/30 hover:border-violet-500/50 transition flex items-center justify-center gap-3"
          >
            <FiPlus className="w-5 h-5 text-violet-400" />
            <span className="font-medium text-violet-200">Create New Time Capsule</span>
          </motion.button>
        )}

        {maxCapsulesReached && !showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 bg-amber-900/20 rounded-xl border border-amber-500/30 text-center"
          >
            <p className="text-amber-300 text-sm">Maximum 10 capsules reached. Wait for some to unlock!</p>
          </motion.div>
        )}

        {/* Create Form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              {showSuccess ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-8 text-center border border-green-500/30"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="text-5xl mb-4"
                  >
                    🎁
                  </motion.div>
                  <p className="text-lg font-medium text-green-300">{successMessage}</p>
                  <p className="text-sm text-slate-400 mt-2">
                    Your future self will thank you
                  </p>
                </motion.div>
              ) : (
                <div className="bg-violet-900/20 rounded-xl border border-violet-500/30 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-violet-200 flex items-center gap-2">
                      <FiGift /> Write to Your Future Self
                    </h3>
                    <button
                      onClick={() => setShowCreate(false)}
                      className="p-2 hover:bg-violet-500/10 rounded-lg transition"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Unlock Duration */}
                  <div>
                    <label className="text-sm text-violet-300/80 mb-2 block flex items-center gap-2">
                      <FiCalendar /> When should this unlock?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {UNLOCK_OPTIONS.map((opt) => (
                        <button
                          key={opt.days}
                          onClick={() => setUnlockDays(opt.days)}
                          className={`px-3 py-2 rounded-lg text-sm transition ${
                            unlockDays === opt.days
                              ? "bg-violet-600 text-white"
                              : "bg-violet-900/40 text-violet-300 hover:bg-violet-800/40"
                          }`}
                        >
                          {opt.emoji} {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* What you're smoking */}
                  <div>
                    <label className="text-sm text-violet-300/80 mb-2 block">
                      What are you smoking right now? (optional)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Brand"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="bg-violet-950/50 border border-violet-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
                      />
                      <input
                        type="text"
                        placeholder="Product"
                        value={product}
                        onChange={(e) => setProduct(e.target.value)}
                        className="bg-violet-950/50 border border-violet-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
                      />
                    </div>
                  </div>

                  {/* Mood */}
                  <div>
                    <label className="text-sm text-violet-300/80 mb-2 block">Your mood</label>
                    <div className="flex flex-wrap gap-2">
                      {MOODS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setMood(mood === m.id ? null : m.id)}
                          className={`px-3 py-1.5 rounded-full text-sm transition ${
                            mood === m.id
                              ? "bg-violet-600 text-white"
                              : "bg-violet-900/40 text-violet-300 hover:bg-violet-800/40"
                          }`}
                        >
                          {m.emoji} {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="text-sm text-violet-300/80 mb-2 block">
                      Your message to the future
                    </label>
                    <textarea
                      placeholder="Hey future me, I hope you're doing well. Right now I'm..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      maxLength={2000}
                      className="w-full bg-violet-950/50 border border-violet-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 resize-none"
                    />
                    <p className="text-xs text-violet-400/60 mt-1 text-right">
                      {message.length}/2000
                    </p>
                  </div>

                  {/* Submit */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={!message.trim() || submitting}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-500 hover:to-purple-500 transition"
                  >
                    {submitting ? (
                      <FiRefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <FiLock className="w-5 h-5" />
                        Seal Time Capsule
                      </>
                    )}
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4 p-1 bg-violet-900/20 rounded-xl">
          <button
            onClick={() => setActiveTab("locked")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
              activeTab === "locked"
                ? "bg-violet-600 text-white"
                : "text-violet-400 hover:text-white hover:bg-violet-800/50"
            }`}
          >
            <FiLock className="w-4 h-4" />
            Locked ({myCapsules.locked.length})
          </button>
          <button
            onClick={() => setActiveTab("unlocked")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
              activeTab === "unlocked"
                ? "bg-green-600 text-white"
                : "text-violet-400 hover:text-white hover:bg-violet-800/50"
            }`}
          >
            <FiUnlock className="w-4 h-4" />
            Unlocked ({myCapsules.unlocked.length})
          </button>
        </div>

        {/* Capsules List */}
        <AnimatePresence mode="wait">
          {activeTab === "locked" && (
            <motion.div
              key="locked"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {myCapsules.locked.length === 0 ? (
                <div className="bg-violet-900/20 rounded-xl p-8 text-center border border-violet-500/20">
                  <div className="text-4xl mb-4">📦</div>
                  <p className="text-violet-300">No locked capsules</p>
                  <p className="text-sm text-violet-400/60 mt-1">
                    Create one to send a message to your future self
                  </p>
                </div>
              ) : (
                myCapsules.locked.map((capsule, idx) => (
                  <motion.div
                    key={capsule.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-gradient-to-br from-violet-900/40 to-purple-900/20 rounded-xl p-4 border border-violet-500/30"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FiLock className="text-violet-400" />
                        <span className="text-sm text-violet-300">
                          {capsule.timeSinceCreated}
                        </span>
                        {capsule.mood && (
                          <span>
                            {MOODS.find((m) => m.id === capsule.mood)?.emoji}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-amber-400 text-sm">
                        <FiClock className="w-4 h-4" />
                        {capsule.timeUntilUnlock}
                      </div>
                    </div>
                    <div className="bg-violet-950/50 rounded-lg p-4 border border-violet-500/20">
                      <div className="flex items-center justify-center gap-2 text-violet-400">
                        <FiLock className="w-6 h-6" />
                        <span className="font-medium">Contents Hidden</span>
                      </div>
                      <p className="text-center text-xs text-violet-400/60 mt-2">
                        Unlocks{" "}
                        {new Date(capsule.unlocksAt * 1000).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "unlocked" && (
            <motion.div
              key="unlocked"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {myCapsules.unlocked.length === 0 ? (
                <div className="bg-green-900/20 rounded-xl p-8 text-center border border-green-500/20">
                  <div className="text-4xl mb-4">🎁</div>
                  <p className="text-green-300">No unlocked capsules yet</p>
                  <p className="text-sm text-green-400/60 mt-1">
                    Your locked capsules will appear here when they unlock
                  </p>
                </div>
              ) : (
                myCapsules.unlocked.map((capsule, idx) => (
                  <motion.div
                    key={capsule.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-gradient-to-br from-green-900/30 to-emerald-900/20 rounded-xl p-4 border border-green-500/30"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FiUnlock className="text-green-400" />
                        <span className="text-sm text-green-300">
                          Created {capsule.timeSinceCreated}
                        </span>
                        {capsule.mood && (
                          <span>
                            {MOODS.find((m) => m.id === capsule.mood)?.emoji}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-green-400/60">
                        Unlocked{" "}
                        {new Date(capsule.unlocksAt * 1000).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    {(capsule.brand || capsule.product) && (
                      <p className="text-xs text-green-400 mb-2 flex items-center gap-1">
                        🚬 {capsule.brand} {capsule.product && `· ${capsule.product}`}
                      </p>
                    )}
                    <div className="bg-green-950/40 rounded-lg p-4 border border-green-500/20">
                      <p className="text-green-100 whitespace-pre-wrap">{capsule.message}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-violet-900/20 rounded-xl p-4 border border-violet-500/20"
        >
          <h3 className="font-semibold text-violet-300 mb-2 flex items-center gap-2">
            <FiGift /> How It Works
          </h3>
          <ul className="text-sm text-violet-400/80 space-y-1">
            <li>• Write a message to your future self</li>
            <li>• Choose when it unlocks (1 week to 1 year)</li>
            <li>• Include what you&apos;re smoking and your mood</li>
            <li>• Content stays hidden until unlock date</li>
            <li>• Maximum 10 capsules at a time</li>
          </ul>
        </motion.div>
      </main>
    </div>
  );
}
