"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiHome,
  FiRefreshCw,
  FiTarget,
  FiZap,
  FiAward,
  FiCheck,
  FiX,
  FiStar,
  FiTrendingUp,
} from "react-icons/fi";
import confetti from "canvas-confetti";

interface Challenge {
  challengeId: string;
  review: string;
  rating: number | null;
  flavors: string[];
  product: string | null;
  username: string;
  options: string[];
}

interface Stats {
  totalCorrect: number;
  totalAttempts: number;
  currentStreak: number;
}

interface GuessResult {
  correct: boolean;
  correctBrand: string;
  streak: number;
  totalCorrect: number;
  totalAttempts: number;
}

const STREAK_MESSAGES = [
  { min: 0, message: "Let's get started! 🎯" },
  { min: 1, message: "Nice one! Keep it up! 🔥" },
  { min: 3, message: "You're on fire! 🔥🔥" },
  { min: 5, message: "Incredible streak! 🚀" },
  { min: 7, message: "Cigar connoisseur! 🏆" },
  { min: 10, message: "LEGENDARY! 👑" },
];

function getStreakMessage(streak: number): string {
  const match = [...STREAK_MESSAGES].reverse().find(s => streak >= s.min);
  return match?.message || "Let's go!";
}

export default function GuessBrandPage() {
  const router = useRouter();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GuessResult | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadChallenge = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setSelectedOption(null);
    setError(null);

    try {
      const res = await fetch("/api/guess-brand");
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        setError(data.message || data.error || "Failed to load challenge");
        return;
      }

      setChallenge(data.challenge);
      setStats(data.stats);
    } catch (err) {
      setError("Failed to load challenge");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  const handleGuess = async (guess: string) => {
    if (submitting || result || !challenge) return;

    setSelectedOption(guess);
    setSubmitting(true);

    try {
      const res = await fetch("/api/guess-brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.challengeId,
          guess,
        }),
      });

      const data: GuessResult = await res.json();
      setResult(data);

      if (data.correct) {
        // Celebrate!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#f59e0b", "#fbbf24", "#fcd34d"],
        });
      }
    } catch (err) {
      console.error("Guess error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const getOptionStyle = (option: string) => {
    if (!result) {
      if (selectedOption === option) {
        return "bg-amber-500/30 border-amber-400";
      }
      return "bg-zinc-800/50 border-zinc-700 hover:border-amber-500/50 hover:bg-zinc-800";
    }

    // Show results
    if (option.toLowerCase() === result.correctBrand.toLowerCase()) {
      return "bg-green-500/30 border-green-400";
    }
    if (selectedOption === option && !result.correct) {
      return "bg-red-500/30 border-red-400";
    }
    return "bg-zinc-800/30 border-zinc-700/50 opacity-50";
  };

  const accuracy = stats && stats.totalAttempts > 0 
    ? Math.round((stats.totalCorrect / stats.totalAttempts) * 100) 
    : 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-amber-950/20 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-zinc-900/80 border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <FiHome className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <FiTarget className="w-5 h-5 text-amber-400" />
            <span className="font-bold">Guess the Brand</span>
          </div>
          <button
            onClick={loadChallenge}
            disabled={loading}
            className="p-2 rounded-full hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Stats Banner */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FiZap className="w-5 h-5 text-amber-400" />
                  <div>
                    <div className="text-2xl font-bold text-amber-400">
                      {stats.currentStreak}
                    </div>
                    <div className="text-xs text-zinc-400">Streak</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FiAward className="w-5 h-5 text-green-400" />
                  <div>
                    <div className="text-lg font-semibold">
                      {stats.totalCorrect}/{stats.totalAttempts}
                    </div>
                    <div className="text-xs text-zinc-400">{accuracy}% accuracy</div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-amber-300">
                  {getStreakMessage(stats.currentStreak)}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-xl font-bold mb-2">Not Enough Reviews Yet</h2>
            <p className="text-zinc-400 mb-6">{error}</p>
            <Link
              href="/checkin"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-black rounded-full font-semibold hover:bg-amber-400 transition"
            >
              Add a Review
            </Link>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Loading challenge...</p>
          </div>
        )}

        {/* Challenge */}
        {challenge && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Review Card */}
            <div className="p-6 rounded-2xl bg-zinc-800/50 border border-zinc-700">
              <div className="flex items-center gap-2 mb-4 text-zinc-400 text-sm">
                <span>Review by</span>
                <span className="font-semibold text-white">@{challenge.username}</span>
                {challenge.rating && (
                  <span className="flex items-center gap-1 ml-auto">
                    <FiStar className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-amber-400 font-semibold">{challenge.rating}</span>
                  </span>
                )}
              </div>

              {challenge.product && (
                <div className="mb-3 text-sm text-zinc-500">
                  <span className="italic">"{challenge.product}"</span>
                </div>
              )}

              <blockquote className="text-lg leading-relaxed">
                "{challenge.review}"
              </blockquote>

              {challenge.flavors.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {challenge.flavors.map((flavor) => (
                    <span
                      key={flavor}
                      className="px-2 py-1 text-xs bg-amber-500/20 text-amber-300 rounded-full"
                    >
                      {flavor}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Question */}
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">What brand is this?</h2>
              <p className="text-zinc-400 text-sm">
                {result ? "Here's the answer:" : "Choose from the options below"}
              </p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence mode="wait">
                {challenge.options.map((option, idx) => (
                  <motion.button
                    key={option}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => handleGuess(option)}
                    disabled={submitting || !!result}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all
                      ${getOptionStyle(option)}
                      ${!result && !submitting ? "cursor-pointer" : "cursor-default"}
                    `}
                  >
                    <span className="font-semibold">{option}</span>
                    {result && option.toLowerCase() === result.correctBrand.toLowerCase() && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
                      >
                        <FiCheck className="w-4 h-4" />
                      </motion.span>
                    )}
                    {result && selectedOption === option && !result.correct && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                      >
                        <FiX className="w-4 h-4" />
                      </motion.span>
                    )}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>

            {/* Result */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div
                  className={`
                    p-4 rounded-xl text-center
                    ${result.correct 
                      ? "bg-green-500/20 border border-green-500/30" 
                      : "bg-red-500/20 border border-red-500/30"}
                  `}
                >
                  <div className="text-3xl mb-2">
                    {result.correct ? "🎉" : "😅"}
                  </div>
                  <div className="font-bold text-lg">
                    {result.correct ? "Correct!" : "Not quite!"}
                  </div>
                  {!result.correct && (
                    <p className="text-sm text-zinc-400 mt-1">
                      The answer was <span className="text-white font-semibold">{result.correctBrand}</span>
                    </p>
                  )}
                  {result.correct && result.streak > 1 && (
                    <p className="text-sm text-green-300 mt-1 flex items-center justify-center gap-1">
                      <FiTrendingUp className="w-4 h-4" />
                      {result.streak} in a row!
                    </p>
                  )}
                </div>

                <button
                  onClick={loadChallenge}
                  className="w-full py-4 px-6 bg-amber-500 text-black rounded-xl font-bold hover:bg-amber-400 transition flex items-center justify-center gap-2"
                >
                  <FiRefreshCw className="w-5 h-5" />
                  Next Challenge
                </button>

                <Link
                  href={`/cigar/${encodeURIComponent(result.correctBrand)}`}
                  className="block w-full py-3 px-6 bg-zinc-800 text-white rounded-xl font-semibold text-center hover:bg-zinc-700 transition"
                >
                  Learn more about {result.correctBrand}
                </Link>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* How to Play */}
        {!loading && !error && !challenge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <h2 className="text-xl font-bold mb-4">How to Play</h2>
            <div className="space-y-3 text-zinc-400 text-left max-w-sm mx-auto">
              <p>🎯 Read the review carefully</p>
              <p>🤔 Look for clues in flavor notes and descriptions</p>
              <p>✅ Pick the brand you think it is</p>
              <p>🔥 Build your streak with correct answers!</p>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
