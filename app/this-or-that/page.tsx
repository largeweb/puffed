"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { FiHome, FiRefreshCw, FiUsers, FiTrendingUp, FiCheck } from "react-icons/fi";
import confetti from "canvas-confetti";

interface Matchup {
  id: string;
  a: string;
  b: string;
}

interface RecentVoter {
  username: string;
  choice: string;
  voted_at: number;
}

interface ThisOrThatData {
  matchup: Matchup;
  votesA: number;
  votesB: number;
  percentA: number;
  percentB: number;
  totalVotes: number;
  userVote: string | null;
  recentVoters: RecentVoter[];
  allMatchups: number;
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ThisOrThatPage() {
  const [data, setData] = useState<ThisOrThatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [justVoted, setJustVoted] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/this-or-that");
      const result = await res.json() as ThisOrThatData;
      setData(result);
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVote = async (choice: "a" | "b") => {
    if (voting) return;
    setVoting(choice);

    try {
      const res = await fetch("/api/this-or-that", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice }),
      });

      if (!res.ok) {
        throw new Error("Vote failed");
      }

      const result = await res.json() as Partial<ThisOrThatData>;
      setData((prev) => (prev ? { ...prev, ...result } : prev));
      setJustVoted(true);

      // Confetti on first vote
      if (!data?.userVote) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#f472b6", "#a78bfa", "#60a5fa"],
        });
      }
    } catch (error) {
      console.error("Vote error:", error);
    } finally {
      setVoting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fuchsia-950 via-purple-950 to-indigo-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-fuchsia-400/30 border-t-fuchsia-400 rounded-full"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fuchsia-950 via-purple-950 to-indigo-950 flex items-center justify-center text-white">
        <p>Failed to load</p>
      </div>
    );
  }

  const { matchup, percentA, percentB, totalVotes, userVote, recentVoters } = data;
  const hasVoted = !!userVote;
  const winningChoice = percentA > percentB ? "a" : percentB > percentA ? "b" : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-950 via-purple-950 to-indigo-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-fuchsia-950/80 backdrop-blur-lg border-b border-fuchsia-500/20 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-fuchsia-200 hover:text-white transition"
          >
            <FiHome className="text-lg" />
            <span className="text-sm font-medium">Home</span>
          </Link>
          <h1 className="text-lg font-bold text-white">This or That 🤔</h1>
          <button
            onClick={() => fetchData()}
            className="text-fuchsia-200 hover:text-white transition p-2"
          >
            <FiRefreshCw className="text-lg" />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Today's Question */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-fuchsia-300 text-sm mb-2">Today&apos;s Question</p>
          <h2 className="text-2xl font-bold text-white mb-1">Which do you prefer?</h2>
          <p className="text-fuchsia-200/60 text-xs">New matchup every day!</p>
        </motion.div>

        {/* VS Cards */}
        <div className="space-y-4">
          {/* Option A */}
          <motion.button
            onClick={() => handleVote("a")}
            disabled={!!voting}
            whileHover={{ scale: voting ? 1 : 1.02 }}
            whileTap={{ scale: voting ? 1 : 0.98 }}
            className={`w-full relative overflow-hidden rounded-2xl p-6 text-left transition-all ${
              userVote === "a"
                ? "bg-gradient-to-r from-pink-600/90 to-fuchsia-600/90 ring-2 ring-pink-400"
                : "bg-white/10 hover:bg-white/15"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">{matchup.a}</span>
              {userVote === "a" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-white rounded-full p-1"
                >
                  <FiCheck className="text-pink-600" />
                </motion.div>
              )}
            </div>

            {hasVoted && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentA}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`absolute bottom-0 left-0 h-1 ${
                  winningChoice === "a" ? "bg-green-400" : "bg-fuchsia-400"
                }`}
              />
            )}

            {hasVoted && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 text-white/80 text-sm"
              >
                {percentA}% ({data.votesA} vote{data.votesA !== 1 ? "s" : ""})
                {winningChoice === "a" && " 👑"}
              </motion.p>
            )}

            {voting === "a" && (
              <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                />
              </div>
            )}
          </motion.button>

          {/* VS Divider */}
          <div className="flex items-center justify-center">
            <div className="flex-1 h-px bg-fuchsia-500/30" />
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="px-4 text-2xl font-black text-fuchsia-400"
            >
              VS
            </motion.span>
            <div className="flex-1 h-px bg-fuchsia-500/30" />
          </div>

          {/* Option B */}
          <motion.button
            onClick={() => handleVote("b")}
            disabled={!!voting}
            whileHover={{ scale: voting ? 1 : 1.02 }}
            whileTap={{ scale: voting ? 1 : 0.98 }}
            className={`w-full relative overflow-hidden rounded-2xl p-6 text-left transition-all ${
              userVote === "b"
                ? "bg-gradient-to-r from-violet-600/90 to-indigo-600/90 ring-2 ring-violet-400"
                : "bg-white/10 hover:bg-white/15"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">{matchup.b}</span>
              {userVote === "b" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-white rounded-full p-1"
                >
                  <FiCheck className="text-violet-600" />
                </motion.div>
              )}
            </div>

            {hasVoted && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentB}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`absolute bottom-0 left-0 h-1 ${
                  winningChoice === "b" ? "bg-green-400" : "bg-violet-400"
                }`}
              />
            )}

            {hasVoted && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 text-white/80 text-sm"
              >
                {percentB}% ({data.votesB} vote{data.votesB !== 1 ? "s" : ""})
                {winningChoice === "b" && " 👑"}
              </motion.p>
            )}

            {voting === "b" && (
              <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                />
              </div>
            )}
          </motion.button>
        </div>

        {/* Stats */}
        <AnimatePresence>
          {hasVoted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 rounded-xl p-4 border border-fuchsia-500/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <FiTrendingUp className="text-fuchsia-400" />
                <span className="text-white font-medium">Today&apos;s Results</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-pink-400">{data.votesA}</p>
                  <p className="text-xs text-fuchsia-200/60">chose {matchup.a.split(" ")[0]}</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-violet-400">{data.votesB}</p>
                  <p className="text-xs text-fuchsia-200/60">chose {matchup.b.split(" ")[0]}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-fuchsia-500/20 text-center">
                <p className="text-fuchsia-200 text-sm">
                  <span className="font-bold text-white">{totalVotes}</span> total votes today
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Just Voted Message */}
        <AnimatePresence>
          {justVoted && !data.userVote && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-4 text-center border border-green-500/30"
            >
              <p className="text-green-300 font-medium">🎉 Vote recorded!</p>
              <p className="text-green-200/60 text-sm mt-1">Come back tomorrow for a new matchup</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Voters */}
        {recentVoters.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 rounded-xl p-4 border border-fuchsia-500/20"
          >
            <div className="flex items-center gap-2 mb-3">
              <FiUsers className="text-fuchsia-400" />
              <span className="text-white font-medium">Recent Votes</span>
            </div>
            <div className="space-y-2">
              {recentVoters.slice(0, 5).map((voter, i) => (
                <div
                  key={`${voter.username}-${i}`}
                  className="flex items-center justify-between text-sm"
                >
                  <Link
                    href={`/user/${voter.username}`}
                    className="text-fuchsia-200 hover:text-white transition"
                  >
                    @{voter.username}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        voter.choice === "a"
                          ? "bg-pink-500/20 text-pink-300"
                          : "bg-violet-500/20 text-violet-300"
                      }`}
                    >
                      {voter.choice === "a" ? matchup.a.split(" ")[0] : matchup.b.split(" ")[0]}
                    </span>
                    <span className="text-fuchsia-200/40 text-xs">
                      {getTimeAgo(voter.voted_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Call to Action */}
        {!hasVoted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4"
          >
            <p className="text-fuchsia-200/60 text-sm">
              👆 Tap your preference to vote!
            </p>
            <p className="text-fuchsia-200/40 text-xs mt-1">
              You can change your vote until midnight
            </p>
          </motion.div>
        )}

        {/* Share */}
        <div className="text-center py-4">
          <p className="text-fuchsia-200/40 text-xs">
            {data.allMatchups} different matchups • New question daily
          </p>
        </div>
      </main>
    </div>
  );
}
