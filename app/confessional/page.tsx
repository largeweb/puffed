"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiHome, FiRefreshCw, FiSend, FiHeart, FiClock } from "react-icons/fi";

interface Confession {
  id: string;
  confession: string;
  mood?: string;
  createdAt: number;
  hourPosted: number;
  reactionCount: number;
  userReacted: boolean;
  timeAgo: string;
}

interface ConfessionalData {
  confessions: Confession[];
  stats: {
    totalConfessions: number;
    uniqueConfessors: number;
    moodBreakdown: { mood: string; count: number }[];
  };
  hasConfessedToday: boolean;
  isConfessionalTime: boolean;
  currentHour: number;
}

const MOODS = [
  { id: "contemplative", emoji: "🤔", label: "Contemplative" },
  { id: "grateful", emoji: "🙏", label: "Grateful" },
  { id: "restless", emoji: "😮‍💨", label: "Restless" },
  { id: "peaceful", emoji: "😌", label: "Peaceful" },
  { id: "melancholy", emoji: "😔", label: "Melancholy" },
  { id: "hopeful", emoji: "✨", label: "Hopeful" },
];

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export default function ConfessionalPage() {
  const router = useRouter();
  const [data, setData] = useState<ConfessionalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confession, setConfession] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [reactingTo, setReactingTo] = useState<string | null>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/confessional");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const result = await res.json() as ConfessionalData;
      setData(result);
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const submitConfession = async () => {
    if (!confession.trim() || submitting) return;
    setSubmitting(true);
    
    try {
      const res = await fetch("/api/confessional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confession: confession.trim(), mood: selectedMood }),
      });
      
      if (res.ok) {
        setConfession("");
        setSelectedMood(null);
        setShowForm(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to submit");
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("Failed to submit confession");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleReaction = async (confessionId: string) => {
    setReactingTo(confessionId);
    try {
      const res = await fetch("/api/confessional/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confessionId }),
      });
      
      if (res.ok) {
        // Update local state
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            confessions: prev.confessions.map(c => 
              c.id === confessionId 
                ? { 
                    ...c, 
                    userReacted: !c.userReacted,
                    reactionCount: c.userReacted ? c.reactionCount - 1 : c.reactionCount + 1
                  }
                : c
            ),
          };
        });
      }
    } catch (error) {
      console.error("Reaction error:", error);
    } finally {
      setReactingTo(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-neutral-900 to-stone-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-amber-700 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-neutral-900 to-stone-950 flex items-center justify-center text-white">
        <p>Failed to load confessional</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-neutral-900 to-stone-950 text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur-sm border-b border-amber-900/20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-full bg-stone-800 hover:bg-stone-700 transition-colors"
            >
              <FiHome className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                🕯️ Confessional
              </h1>
              <p className="text-xs text-stone-400">Anonymous late-night thoughts</p>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 rounded-full bg-stone-800 hover:bg-stone-700 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-900 via-neutral-800 to-stone-900 p-6 mb-6 shadow-xl border border-amber-900/30"
        >
          {/* Candlelight flicker effect */}
          <div className="absolute top-4 right-4">
            <motion.div
              animate={{
                opacity: [0.5, 1, 0.6, 0.9, 0.5],
                scale: [1, 1.1, 0.95, 1.05, 1],
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-4xl"
            >
              🕯️
            </motion.div>
          </div>
          
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-2 text-amber-100">The Confessional</h2>
            
            {data.isConfessionalTime ? (
              <>
                <p className="text-stone-400 text-sm mb-3">
                  11 PM - 5 AM • What weighs on your mind tonight?
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-900/30 rounded-full text-xs text-amber-200">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                  Confessional open
                </div>
              </>
            ) : (
              <>
                <p className="text-stone-400 text-sm mb-3">
                  Return between 11 PM - 5 AM to share your thoughts
                </p>
                <p className="text-xs text-stone-500">
                  Current time: {formatHour(data.currentHour)}
                </p>
              </>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-stone-800/50 rounded-xl p-4 text-center border border-stone-700/30"
          >
            <div className="text-2xl font-bold text-amber-200">{data.stats.totalConfessions}</div>
            <div className="text-xs text-stone-500">Confessions shared</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-stone-800/50 rounded-xl p-4 text-center border border-stone-700/30"
          >
            <div className="text-2xl font-bold text-amber-200">{data.stats.uniqueConfessors}</div>
            <div className="text-xs text-stone-500">Anonymous souls</div>
          </motion.div>
        </div>

        {/* Confession Form */}
        {data.isConfessionalTime && !data.hasConfessedToday && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-900/50 to-orange-900/50 hover:from-amber-800/50 hover:to-orange-800/50 border border-amber-700/30 text-amber-100 font-medium transition-all"
              >
                🕯️ Share a confession
              </button>
            ) : (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="bg-stone-800/50 rounded-xl p-4 border border-amber-900/30"
              >
                <p className="text-xs text-stone-400 mb-3">
                  Your confession is anonymous. One per night — make it count.
                </p>
                
                <textarea
                  value={confession}
                  onChange={(e) => setConfession(e.target.value.slice(0, 500))}
                  placeholder="What's on your mind tonight?"
                  className="w-full bg-stone-900/50 rounded-lg p-3 text-white placeholder-stone-500 border border-stone-700 focus:border-amber-700 focus:outline-none resize-none"
                  rows={4}
                  autoFocus
                />
                
                <div className="flex justify-between items-center mt-2 mb-3">
                  <span className="text-xs text-stone-500">{confession.length}/500</span>
                </div>

                {/* Mood selector */}
                <div className="mb-4">
                  <p className="text-xs text-stone-400 mb-2">How are you feeling?</p>
                  <div className="flex flex-wrap gap-2">
                    {MOODS.map((mood) => (
                      <button
                        key={mood.id}
                        onClick={() => setSelectedMood(selectedMood === mood.id ? null : mood.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          selectedMood === mood.id
                            ? "bg-amber-800/70 text-amber-100 border border-amber-600"
                            : "bg-stone-700/50 text-stone-300 border border-stone-600 hover:bg-stone-700"
                        }`}
                      >
                        {mood.emoji} {mood.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowForm(false); setConfession(""); setSelectedMood(null); }}
                    className="flex-1 py-2 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-300 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitConfession}
                    disabled={!confession.trim() || submitting}
                    className="flex-1 py-2 rounded-lg bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <FiSend className="w-4 h-4" />
                    {submitting ? "Sharing..." : "Confess"}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {data.hasConfessedToday && (
          <div className="mb-6 text-center py-4 bg-stone-800/30 rounded-xl border border-stone-700/20">
            <p className="text-stone-400 text-sm">✓ You&apos;ve shared your confession tonight</p>
          </div>
        )}

        {/* Confessions Feed */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-stone-400 flex items-center gap-2">
            <FiClock className="w-4 h-4" />
            Recent confessions
          </h3>
        </div>

        <AnimatePresence>
          {data.confessions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-stone-500"
            >
              <div className="text-4xl mb-4 opacity-50">🕯️</div>
              <p>No confessions yet</p>
              <p className="text-sm mt-1">Be the first to share</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {data.confessions.map((c, index) => {
                const mood = MOODS.find(m => m.id === c.mood);
                
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-stone-800/40 rounded-xl p-4 border border-stone-700/20"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {mood && (
                          <span className="text-lg" title={mood.label}>{mood.emoji}</span>
                        )}
                        <span className="text-xs text-stone-500">
                          {formatHour(c.hourPosted)} · {c.timeAgo}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-stone-200 text-sm leading-relaxed mb-3">
                      {c.confession}
                    </p>
                    
                    <button
                      onClick={() => toggleReaction(c.id)}
                      disabled={reactingTo === c.id}
                      className={`flex items-center gap-2 text-xs transition-colors ${
                        c.userReacted 
                          ? "text-rose-400" 
                          : "text-stone-500 hover:text-rose-400"
                      }`}
                    >
                      <FiHeart className={`w-4 h-4 ${c.userReacted ? "fill-current" : ""}`} />
                      <span>{c.reactionCount > 0 ? c.reactionCount : ""} {c.reactionCount === 1 ? "feels this" : c.reactionCount > 1 ? "feel this" : "Show solidarity"}</span>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>

        {/* Footer quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-stone-600 text-xs italic"
        >
          &quot;The night has a thousand eyes, and the day but one.&quot;
        </motion.div>
      </div>
    </div>
  );
}
