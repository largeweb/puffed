"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiHome,
  FiRefreshCw,
  FiSend,
  FiMoon,
  FiLock,
  FiUnlock,
  FiEye,
  FiEyeOff,
  FiClock,
  FiFeather,
  FiStar,
} from "react-icons/fi";

interface DiaryEntry {
  id: string;
  thought: string;
  mood: string | null;
  isPublic: boolean;
  createdAt: number;
  timeAgo: string;
  brand: string | null;
  product: string | null;
  username: string;
}

interface DeadOfNightData {
  myEntries: DiaryEntry[];
  publicEntries: DiaryEntry[];
  stats: {
    totalEntries: number;
    uniqueWriters: number;
    nightsWithEntries: number;
    myEntries: number;
    myNights: number;
  };
  isOpen: boolean;
  currentHour: number;
  wroteTonight: boolean;
}

const MOODS = [
  { id: "contemplative", emoji: "🤔", label: "Contemplative" },
  { id: "peaceful", emoji: "😌", label: "Peaceful" },
  { id: "restless", emoji: "😮‍💨", label: "Restless" },
  { id: "melancholy", emoji: "🌧️", label: "Melancholy" },
  { id: "grateful", emoji: "🙏", label: "Grateful" },
  { id: "inspired", emoji: "✨", label: "Inspired" },
  { id: "numb", emoji: "😶", label: "Numb" },
  { id: "hopeful", emoji: "🌅", label: "Hopeful" },
];

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export default function DeadOfNightPage() {
  const router = useRouter();
  const [data, setData] = useState<DeadOfNightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"write" | "mine" | "shared">("write");
  const [thought, setThought] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      try {
        const res = await fetch("/api/dead-of-night");
        if (res.status === 401) {
          router.push("/");
          return;
        }
        const result = (await res.json()) as DeadOfNightData;
        setData(result);
        if (result.wroteTonight && activeTab === "write") {
          setActiveTab("mine");
        }
      } catch (error) {
        console.error("Failed to load:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router, activeTab]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    if (!thought.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/dead-of-night", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thought: thought.trim(),
          mood,
          isPublic,
          brand: brand.trim() || null,
          product: product.trim() || null,
        }),
      });

      if (res.ok) {
        setShowSuccess(true);
        setThought("");
        setMood(null);
        setBrand("");
        setProduct("");
        setTimeout(() => {
          setShowSuccess(false);
          setActiveTab("mine");
          fetchData();
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to submit:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-indigo-400"
        >
          <FiMoon className="w-8 h-8 animate-pulse" />
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center">
        <p className="text-red-400">Failed to load</p>
      </div>
    );
  }

  const { isOpen, currentHour, stats, myEntries, publicEntries, wroteTonight } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white pb-20">
      {/* Stars Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.2,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-indigo-500/20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 hover:bg-indigo-500/10 rounded-lg transition">
              <FiHome className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-bold flex items-center gap-2">
                <span className="text-2xl">🌑</span> Dead of Night Diary
              </h1>
              <p className="text-xs text-indigo-400/80">2-5 AM · Your deepest thoughts</p>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 hover:bg-indigo-500/10 rounded-lg transition disabled:opacity-50"
          >
            <FiRefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 relative z-10">
        {/* Current Time */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center mb-6 p-4 rounded-xl ${
            isOpen
              ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30"
              : "bg-slate-800/50 border border-slate-700/30"
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <FiClock className={isOpen ? "text-indigo-400" : "text-slate-500"} />
            <span className={`font-mono text-lg ${isOpen ? "text-indigo-300" : "text-slate-400"}`}>
              {formatHour(currentHour)} EST
            </span>
          </div>
          {isOpen ? (
            <p className="text-sm text-indigo-300/80">
              ✨ The diary is open. What&apos;s on your mind?
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              🔒 Return between 2-5 AM to write
            </p>
          )}
        </motion.div>

        {/* Stats Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="bg-slate-800/40 rounded-xl p-3 text-center border border-slate-700/30">
            <p className="text-2xl font-bold text-indigo-400">{stats.totalEntries}</p>
            <p className="text-xs text-slate-400">Total Entries</p>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-3 text-center border border-slate-700/30">
            <p className="text-2xl font-bold text-purple-400">{stats.uniqueWriters}</p>
            <p className="text-xs text-slate-400">Night Writers</p>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-3 text-center border border-slate-700/30">
            <p className="text-2xl font-bold text-cyan-400">{stats.myEntries}</p>
            <p className="text-xs text-slate-400">Your Entries</p>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 p-1 bg-slate-800/30 rounded-xl">
          {[
            { id: "write", label: "Write", icon: FiFeather, disabled: !isOpen || wroteTonight },
            { id: "mine", label: "My Diary", icon: FiLock },
            { id: "shared", label: "Shared", icon: FiEye },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id as "write" | "mine" | "shared")}
              disabled={tab.disabled}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : tab.disabled
                  ? "text-slate-600 cursor-not-allowed"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Write Tab */}
          {activeTab === "write" && isOpen && !wroteTonight && (
            <motion.div
              key="write"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {showSuccess ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl p-8 text-center border border-indigo-500/30"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="text-5xl mb-4"
                  >
                    🌙
                  </motion.div>
                  <p className="text-lg font-medium text-indigo-300">
                    Thought preserved in the night
                  </p>
                  <p className="text-sm text-slate-400 mt-2">
                    These quiet hours hold your truth
                  </p>
                </motion.div>
              ) : (
                <>
                  {/* What's smoking */}
                  <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
                    <label className="text-sm text-slate-400 mb-2 block">
                      What are you smoking? (optional)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Brand"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500/50"
                      />
                      <input
                        type="text"
                        placeholder="Product/Vitola"
                        value={product}
                        onChange={(e) => setProduct(e.target.value)}
                        className="bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  </div>

                  {/* Mood */}
                  <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
                    <label className="text-sm text-slate-400 mb-3 block">Your mood</label>
                    <div className="flex flex-wrap gap-2">
                      {MOODS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setMood(mood === m.id ? null : m.id)}
                          className={`px-3 py-1.5 rounded-full text-sm transition ${
                            mood === m.id
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
                          }`}
                        >
                          {m.emoji} {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Thought */}
                  <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
                    <label className="text-sm text-slate-400 mb-2 block">
                      What&apos;s on your mind at this hour?
                    </label>
                    <textarea
                      placeholder="The quiet of 3 AM brings clarity..."
                      value={thought}
                      onChange={(e) => setThought(e.target.value)}
                      rows={4}
                      maxLength={1000}
                      className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500/50 resize-none"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-slate-500">{thought.length}/1000</span>
                    </div>
                  </div>

                  {/* Privacy Toggle */}
                  <button
                    onClick={() => setIsPublic(!isPublic)}
                    className={`w-full p-4 rounded-xl border transition flex items-center justify-between ${
                      isPublic
                        ? "bg-purple-500/10 border-purple-500/30"
                        : "bg-slate-800/40 border-slate-700/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isPublic ? (
                        <FiUnlock className="text-purple-400" />
                      ) : (
                        <FiLock className="text-slate-400" />
                      )}
                      <div className="text-left">
                        <p className={`text-sm font-medium ${isPublic ? "text-purple-300" : "text-slate-300"}`}>
                          {isPublic ? "Public Entry" : "Private Entry"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {isPublic
                            ? "Others can see this in Shared tab"
                            : "Only you can see this"}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-10 h-6 rounded-full transition relative ${
                        isPublic ? "bg-purple-600" : "bg-slate-600"
                      }`}
                    >
                      <motion.div
                        className="absolute top-1 w-4 h-4 bg-white rounded-full"
                        animate={{ left: isPublic ? 20 : 4 }}
                      />
                    </div>
                  </button>

                  {/* Submit */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={!thought.trim() || submitting}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-500 hover:to-purple-500 transition"
                  >
                    {submitting ? (
                      <FiRefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <FiSend className="w-5 h-5" />
                        Preserve This Thought
                      </>
                    )}
                  </motion.button>
                </>
              )}
            </motion.div>
          )}

          {/* Already wrote message */}
          {activeTab === "write" && wroteTonight && (
            <motion.div
              key="wrote"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-800/40 rounded-xl p-8 text-center border border-slate-700/30"
            >
              <div className="text-4xl mb-4">📝</div>
              <p className="text-lg font-medium text-slate-300">
                You&apos;ve already written tonight
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Return tomorrow night for another entry
              </p>
            </motion.div>
          )}

          {/* Not open message */}
          {activeTab === "write" && !isOpen && (
            <motion.div
              key="closed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-800/40 rounded-xl p-8 text-center border border-slate-700/30"
            >
              <div className="text-4xl mb-4">🔒</div>
              <p className="text-lg font-medium text-slate-300">
                The diary opens at 2 AM
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Some thoughts are only meant for the deepest hours
              </p>
            </motion.div>
          )}

          {/* My Entries Tab */}
          {activeTab === "mine" && (
            <motion.div
              key="mine"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              {myEntries.length === 0 ? (
                <div className="bg-slate-800/40 rounded-xl p-8 text-center border border-slate-700/30">
                  <div className="text-4xl mb-4">🌙</div>
                  <p className="text-slate-400">No entries yet</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Come back between 2-5 AM to write
                  </p>
                </div>
              ) : (
                myEntries.map((entry, idx) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <FiClock className="w-4 h-4" />
                        {entry.timeAgo}
                        {entry.mood && (
                          <span>
                            {MOODS.find((m) => m.id === entry.mood)?.emoji}
                          </span>
                        )}
                      </div>
                      {entry.isPublic ? (
                        <FiEye className="w-4 h-4 text-purple-400" />
                      ) : (
                        <FiLock className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    {(entry.brand || entry.product) && (
                      <p className="text-xs text-indigo-400 mb-2">
                        🚬 {entry.brand} {entry.product && `· ${entry.product}`}
                      </p>
                    )}
                    <p className="text-slate-200 whitespace-pre-wrap">{entry.thought}</p>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* Shared Tab */}
          {activeTab === "shared" && (
            <motion.div
              key="shared"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              {publicEntries.length === 0 ? (
                <div className="bg-slate-800/40 rounded-xl p-8 text-center border border-slate-700/30">
                  <div className="text-4xl mb-4">🌌</div>
                  <p className="text-slate-400">No shared entries yet</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Be the first to share a late-night thought
                  </p>
                </div>
              ) : (
                publicEntries.map((entry, idx) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-gradient-to-br from-slate-800/60 to-indigo-900/20 rounded-xl p-4 border border-indigo-500/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Link
                        href={`/user/${entry.username}`}
                        className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition"
                      >
                        @{entry.username}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        {entry.mood && (
                          <span>
                            {MOODS.find((m) => m.id === entry.mood)?.emoji}
                          </span>
                        )}
                        {entry.timeAgo}
                      </div>
                    </div>
                    {(entry.brand || entry.product) && (
                      <p className="text-xs text-indigo-400/70 mb-2">
                        🚬 {entry.brand} {entry.product && `· ${entry.product}`}
                      </p>
                    )}
                    <p className="text-slate-200 whitespace-pre-wrap">{entry.thought}</p>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
