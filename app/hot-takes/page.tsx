"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  FiArrowLeft, 
  FiThumbsUp, 
  FiThumbsDown, 
  FiSend,
  FiTrendingUp,
  FiClock,
  FiZap
} from "react-icons/fi";

interface HotTake {
  id: string;
  user_id: string;
  username: string;
  take: string;
  upvotes: number;
  downvotes: number;
  created_at: number;
  user_vote: number;
}

interface HotTakesResponse {
  takes: HotTake[];
  stats: {
    totalTakes: number;
    totalVotes: number;
    weekStart: number;
  };
  userPostedThisWeek: boolean;
  isThursday: boolean;
}

export default function HotTakesPage() {
  const [takes, setTakes] = useState<HotTake[]>([]);
  const [stats, setStats] = useState<{ totalTakes: number; totalVotes: number } | null>(null);
  const [userPosted, setUserPosted] = useState(false);
  const [isThursday, setIsThursday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newTake, setNewTake] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [voting, setVoting] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"hot" | "new">("hot");
  const router = useRouter();

  useEffect(() => {
    loadTakes();
  }, []);

  async function loadTakes() {
    try {
      const res = await fetch("/api/hot-takes");
      const data: HotTakesResponse = await res.json();
      
      setTakes(data.takes || []);
      setStats(data.stats);
      setUserPosted(data.userPostedThisWeek);
      setIsThursday(data.isThursday);
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTake.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/hot-takes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ take: newTake }),
      });

      if (res.ok) {
        setNewTake("");
        setUserPosted(true);
        loadTakes();
      } else {
        const data = await res.json() as { error?: string };
        alert(data.error || "Failed to submit");
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVote(takeId: string, vote: number) {
    if (voting) return;
    
    setVoting(takeId);
    try {
      const res = await fetch("/api/hot-takes/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ takeId, vote }),
      });

      if (res.ok) {
        const data = await res.json();
        setTakes(prev => prev.map(t => 
          t.id === takeId 
            ? { ...t, upvotes: data.upvotes, downvotes: data.downvotes, user_vote: data.userVote }
            : t
        ));
      }
    } catch (error) {
      console.error("Vote error:", error);
    } finally {
      setVoting(null);
    }
  }

  function getHeatScore(take: HotTake): number {
    return take.upvotes - take.downvotes;
  }

  function getSpicyLevel(take: HotTake): string {
    const ratio = take.downvotes / (take.upvotes + 1);
    if (ratio > 1) return "🌶️🌶️🌶️"; // Very controversial
    if (ratio > 0.5) return "🌶️🌶️"; // Controversial
    if (take.downvotes > 0) return "🌶️"; // Mild controversy
    return ""; // No controversy
  }

  function timeAgo(timestamp: number): string {
    const seconds = Math.floor(Date.now() / 1000) - timestamp;
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  const sortedTakes = [...takes].sort((a, b) => {
    if (sortBy === "hot") {
      return getHeatScore(b) - getHeatScore(a);
    }
    return b.created_at - a.created_at;
  });

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full"
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-white/5">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 -ml-2 text-neutral-400 hover:text-white">
              <FiArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                🔥 Hot Take Thursday
              </h1>
              <p className="text-xs text-neutral-400">Share your spiciest opinions</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Thursday Banner */}
        {isThursday && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-orange-600/30 to-red-600/30 rounded-xl p-4 border border-orange-500/30"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔥</span>
              <div>
                <p className="font-bold text-orange-300">It&apos;s Hot Take Thursday!</p>
                <p className="text-sm text-orange-200/70">Drop your most controversial cigar opinion</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Banner */}
        <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-orange-400">{stats?.totalTakes || 0}</p>
              <p className="text-xs text-neutral-400">Hot Takes</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-yellow-400">{stats?.totalVotes || 0}</p>
              <p className="text-xs text-neutral-400">Total Votes</p>
            </div>
          </div>
        </div>

        {/* Submit Form */}
        {!userPosted ? (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="bg-gradient-to-br from-orange-900/30 to-red-900/30 rounded-xl p-4 border border-orange-500/20"
          >
            <label className="block text-sm font-medium text-orange-300 mb-2">
              🎤 Drop your hot take
            </label>
            <textarea
              value={newTake}
              onChange={(e) => setNewTake(e.target.value)}
              placeholder="Cuban cigars are overrated because..."
              className="w-full bg-black/30 rounded-lg p-3 text-white placeholder-neutral-500 border border-white/10 focus:border-orange-500/50 focus:outline-none resize-none"
              rows={3}
              maxLength={280}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-neutral-500">{newTake.length}/280</span>
              <button
                type="submit"
                disabled={newTake.length < 10 || submitting}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSend size={16} />
                {submitting ? "Posting..." : "Post Hot Take"}
              </button>
            </div>
          </motion.form>
        ) : (
          <div className="bg-green-900/20 rounded-xl p-4 border border-green-500/20 text-center">
            <p className="text-green-400">✅ You&apos;ve shared your hot take this week!</p>
            <p className="text-sm text-neutral-400 mt-1">Come back next Thursday for another</p>
          </div>
        )}

        {/* Sort Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy("hot")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
              sortBy === "hot"
                ? "bg-orange-600/30 text-orange-300 border border-orange-500/30"
                : "bg-neutral-800/50 text-neutral-400 border border-white/5"
            }`}
          >
            <FiTrendingUp size={16} />
            Hottest
          </button>
          <button
            onClick={() => setSortBy("new")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
              sortBy === "new"
                ? "bg-orange-600/30 text-orange-300 border border-orange-500/30"
                : "bg-neutral-800/50 text-neutral-400 border border-white/5"
            }`}
          >
            <FiClock size={16} />
            Newest
          </button>
        </div>

        {/* Hot Takes List */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {sortedTakes.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <span className="text-5xl mb-4 block">🌶️</span>
                <p className="text-neutral-400">No hot takes yet this week</p>
                <p className="text-sm text-neutral-500 mt-1">Be the first to drop a spicy opinion!</p>
              </motion.div>
            ) : (
              sortedTakes.map((take, index) => (
                <motion.div
                  key={take.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 rounded-xl p-4 border border-white/5"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <Link href={`/user/${take.username}`} className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {take.username?.[0]?.toUpperCase() || "?"}
                      </div>
                      <span className="font-medium text-white">{take.username}</span>
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{getSpicyLevel(take)}</span>
                      <span className="text-xs text-neutral-500">{timeAgo(take.created_at)}</span>
                    </div>
                  </div>

                  {/* Take */}
                  <p className="text-white mb-3">{take.take}</p>

                  {/* Voting */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleVote(take.id, take.user_vote === 1 ? 0 : 1)}
                      disabled={voting === take.id}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                        take.user_vote === 1
                          ? "bg-green-600/30 text-green-400 border border-green-500/30"
                          : "bg-neutral-800 text-neutral-400 hover:text-green-400 border border-white/5"
                      }`}
                    >
                      <FiThumbsUp size={14} />
                      <span>{take.upvotes}</span>
                    </button>
                    <button
                      onClick={() => handleVote(take.id, take.user_vote === -1 ? 0 : -1)}
                      disabled={voting === take.id}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                        take.user_vote === -1
                          ? "bg-red-600/30 text-red-400 border border-red-500/30"
                          : "bg-neutral-800 text-neutral-400 hover:text-red-400 border border-white/5"
                      }`}
                    >
                      <FiThumbsDown size={14} />
                      <span>{take.downvotes}</span>
                    </button>
                    <div className="flex-1" />
                    <div className={`flex items-center gap-1 text-sm ${
                      getHeatScore(take) > 0 ? "text-green-400" : 
                      getHeatScore(take) < 0 ? "text-red-400" : "text-neutral-400"
                    }`}>
                      <FiZap size={14} />
                      <span>{getHeatScore(take) > 0 ? "+" : ""}{getHeatScore(take)}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
