"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiArrowLeft, FiCheck, FiUsers, FiTrendingUp } from "react-icons/fi";
import Link from "next/link";
import confetti from "canvas-confetti";

interface PollResult {
  option: string;
  count: number;
  percentage: number;
}

interface PollData {
  poll: {
    id: string;
    question: string;
    options: string[];
  };
  results: PollResult[];
  totalVotes: number;
  userVote: string | null;
  hasVoted: boolean;
  winners: string[];
}

export default function PollPage() {
  const [data, setData] = useState<PollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    loadPoll();
  }, []);

  async function loadPoll() {
    try {
      const res = await fetch("/api/daily-poll");
      const pollData: PollData = await res.json();
      setData(pollData);
      if (pollData.userVote) {
        setSelectedOption(pollData.userVote);
      }
    } catch (error) {
      console.error("Load poll error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(option: string) {
    if (voting || data?.hasVoted) return;

    setVoting(true);
    setSelectedOption(option);

    try {
      const res = await fetch("/api/daily-poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote: option }),
      });

      if (res.ok) {
        // Celebrate!
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ["#f59e0b", "#ec4899", "#8b5cf6"],
        });
        // Reload to get updated results
        await loadPoll();
      }
    } catch (error) {
      console.error("Vote error:", error);
      setSelectedOption(null);
    } finally {
      setVoting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900">
        <p className="text-gray-400">Failed to load poll</p>
      </div>
    );
  }

  const { poll, results, totalVotes, hasVoted, winners } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-gray-900/70 border-b border-indigo-500/20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
            🗳️ Daily Poll
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Question Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative p-6 rounded-3xl bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 shadow-xl"
        >
          {/* Badge */}
          <div className="absolute -top-3 left-6 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-xs font-bold shadow-lg">
            🔥 TODAY&apos;S QUESTION
          </div>

          <h2 className="text-2xl font-bold text-center mt-2 mb-6 bg-gradient-to-r from-indigo-200 to-purple-200 bg-clip-text text-transparent">
            {poll.question}
          </h2>

          {/* Options */}
          <div className="space-y-3">
            <AnimatePresence>
              {poll.options.map((option, index) => {
                const result = results.find((r) => r.option === option);
                const isSelected = selectedOption === option;
                const isWinner = winners.includes(option) && hasVoted;
                const percentage = result?.percentage || 0;

                return (
                  <motion.button
                    key={option}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleVote(option)}
                    disabled={hasVoted || voting}
                    className={`relative w-full p-4 rounded-xl text-left overflow-hidden transition-all ${
                      hasVoted
                        ? "cursor-default"
                        : "hover:scale-[1.02] hover:shadow-lg cursor-pointer"
                    } ${
                      isSelected
                        ? "border-2 border-indigo-400 bg-indigo-500/20"
                        : "border border-white/10 bg-white/5"
                    } ${isWinner ? "ring-2 ring-amber-400" : ""}`}
                  >
                    {/* Progress bar (shows after voting) */}
                    {hasVoted && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                        className={`absolute inset-y-0 left-0 ${
                          isWinner
                            ? "bg-gradient-to-r from-amber-500/30 to-amber-400/30"
                            : "bg-indigo-500/20"
                        }`}
                      />
                    )}

                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center"
                          >
                            <FiCheck className="w-4 h-4" />
                          </motion.div>
                        )}
                        {isWinner && !isSelected && (
                          <span className="text-xl">👑</span>
                        )}
                        <span className={`font-medium ${isWinner ? "text-amber-300" : ""}`}>
                          {option}
                        </span>
                      </div>

                      {hasVoted && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="text-gray-400">{result?.count || 0}</span>
                          <span className={`font-bold ${isWinner ? "text-amber-400" : "text-indigo-400"}`}>
                            {percentage}%
                          </span>
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Vote Count */}
          <div className="flex items-center justify-center gap-2 mt-6 text-gray-400 text-sm">
            <FiUsers className="w-4 h-4" />
            <span>
              {totalVotes} {totalVotes === 1 ? "vote" : "votes"} so far
            </span>
          </div>

          {/* Status Message */}
          {hasVoted ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-center"
            >
              <p className="text-indigo-300">
                ✅ You voted! Come back tomorrow for a new poll.
              </p>
            </motion.div>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-center text-gray-400 text-sm"
            >
              Tap an option to vote
            </motion.p>
          )}
        </motion.div>

        {/* Fun Facts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/10"
        >
          <div className="flex items-center gap-2 mb-3">
            <FiTrendingUp className="text-indigo-400" />
            <h3 className="font-semibold text-indigo-300">Why Polls?</h3>
          </div>
          <p className="text-gray-400 text-sm">
            Daily polls help us learn about the community&apos;s preferences. Your votes help shape
            recommendations and features. New question every day at midnight! 🌙
          </p>
        </motion.div>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
