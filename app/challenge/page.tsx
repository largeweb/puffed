"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiArrowLeft,
  FiTarget,
  FiCheck,
  FiClock,
  FiPlus,
  FiRefreshCw,
  FiHeart,
  FiMessageCircle,
  FiCamera,
  FiMap,
  FiStar,
  FiActivity,
} from "react-icons/fi";

interface ChallengeData {
  challenge: {
    id: string;
    title: string;
    description: string;
    emoji: string;
    category: "social" | "activity" | "explore" | "quality" | "timing";
  };
  progress: {
    current: number;
    target: number;
    completed: boolean;
    percent: number;
  };
  refreshesAt: string;
  stats: {
    checkinsToday: number;
    likesToday: number;
    photosToday: number;
  };
}

const CATEGORY_STYLES: Record<
  string,
  { gradient: string; icon: typeof FiTarget; label: string }
> = {
  social: { gradient: "from-pink-500 to-rose-600", icon: FiHeart, label: "Social" },
  activity: { gradient: "from-amber-500 to-orange-600", icon: FiActivity, label: "Activity" },
  explore: { gradient: "from-cyan-500 to-blue-600", icon: FiMap, label: "Exploration" },
  quality: { gradient: "from-yellow-500 to-amber-600", icon: FiStar, label: "Quality" },
  timing: { gradient: "from-purple-500 to-indigo-600", icon: FiClock, label: "Timing" },
};

function formatTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default function ChallengePage() {
  const router = useRouter();
  const [data, setData] = useState<ChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState("");
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    fetchChallenge();
  }, []);

  useEffect(() => {
    if (!data?.refreshesAt) return;

    const updateTime = () => {
      setTimeLeft(formatTimeUntil(new Date(data.refreshesAt)));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [data?.refreshesAt]);

  // Celebrate on completion
  useEffect(() => {
    if (data?.progress.completed && !celebrating) {
      setCelebrating(true);
      // Confetti effect would go here
    }
  }, [data?.progress.completed]);

  async function fetchChallenge() {
    try {
      const res = await fetch("/api/daily-challenge");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Failed to load challenge:", error);
    } finally {
      setLoading(false);
    }
  }

  const categoryStyle = data?.challenge
    ? CATEGORY_STYLES[data.challenge.category]
    : CATEGORY_STYLES.activity;
  const CategoryIcon = categoryStyle?.icon || FiTarget;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900">
      {/* Header */}
      <header className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <FiArrowLeft />
            <span>Back</span>
          </button>
          <h1 className="text-lg font-semibold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            🎯 Daily Challenge
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <FiRefreshCw className="text-4xl text-amber-500" />
            </motion.div>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Challenge Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative rounded-2xl p-6 border overflow-hidden ${
                data.progress.completed
                  ? "border-green-500/50 bg-gradient-to-br from-green-900/30 to-emerald-900/20"
                  : "border-amber-500/30 bg-gradient-to-br from-amber-900/20 to-orange-900/10"
              }`}
            >
              {/* Background glow */}
              <div
                className={`absolute inset-0 opacity-20 bg-gradient-to-br ${
                  data.progress.completed
                    ? "from-green-500 to-emerald-600"
                    : `${categoryStyle.gradient}`
                }`}
              />

              {/* Category badge */}
              <div className="relative flex items-center gap-2 mb-4">
                <div
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${categoryStyle.gradient} flex items-center justify-center`}
                >
                  <CategoryIcon className="text-white" size={16} />
                </div>
                <span className="text-gray-400 text-sm">{categoryStyle.label} Challenge</span>
                {data.progress.completed && (
                  <span className="ml-auto px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1">
                    <FiCheck size={12} /> Complete!
                  </span>
                )}
              </div>

              {/* Challenge content */}
              <div className="relative text-center py-6">
                <motion.div
                  animate={data.progress.completed ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.5 }}
                  className="text-6xl mb-4"
                >
                  {data.progress.completed ? "🎉" : data.challenge.emoji}
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {data.challenge.title}
                </h2>
                <p className="text-gray-400">{data.challenge.description}</p>
              </div>

              {/* Progress */}
              <div className="relative mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Progress</span>
                  <span
                    className={
                      data.progress.completed ? "text-green-400" : "text-amber-400"
                    }
                  >
                    {data.progress.current} / {data.progress.target}
                  </span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${data.progress.percent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      data.progress.completed
                        ? "bg-gradient-to-r from-green-500 to-emerald-500"
                        : "bg-gradient-to-r from-amber-500 to-orange-500"
                    }`}
                  />
                </div>
              </div>
            </motion.div>

            {/* Timer */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <FiClock className="text-gray-500" />
                <span className="text-gray-400">New challenge in</span>
              </div>
              <span className="text-white font-semibold">{timeLeft}</span>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-xl p-4"
            >
              <h3 className="text-gray-400 text-sm mb-3">Today&apos;s Activity</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-white">
                    {data.stats.checkinsToday}
                  </p>
                  <p className="text-xs text-gray-500">Check-ins</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {data.stats.likesToday}
                  </p>
                  <p className="text-xs text-gray-500">Likes Given</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {data.stats.photosToday}
                  </p>
                  <p className="text-xs text-gray-500">Photos</p>
                </div>
              </div>
            </motion.div>

            {/* CTA */}
            {!data.progress.completed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                {data.challenge.category === "activity" && (
                  <Link
                    href="/dashboard"
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-white font-semibold shadow-lg hover:shadow-amber-500/25 transition-all"
                  >
                    <FiPlus /> Log a Smoke
                  </Link>
                )}
                {data.challenge.category === "social" && (
                  <Link
                    href="/discover"
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl text-white font-semibold shadow-lg hover:shadow-pink-500/25 transition-all"
                  >
                    <FiHeart /> Browse & Engage
                  </Link>
                )}
                {data.challenge.category === "explore" && (
                  <Link
                    href="/roulette"
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white font-semibold shadow-lg hover:shadow-cyan-500/25 transition-all"
                  >
                    <FiMap /> Try Something New
                  </Link>
                )}
                {data.challenge.category === "quality" && (
                  <Link
                    href="/dashboard"
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl text-white font-semibold shadow-lg hover:shadow-yellow-500/25 transition-all"
                  >
                    <FiStar /> Rate Your Smoke
                  </Link>
                )}
              </motion.div>
            )}

            {/* Completed celebration */}
            {data.progress.completed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <p className="text-green-400 text-lg font-medium mb-2">
                  ✨ Challenge Complete!
                </p>
                <p className="text-gray-500 text-sm mb-6">
                  Come back tomorrow for a new challenge
                </p>
                <Link
                  href="/achievements"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors"
                >
                  View All Achievements
                </Link>
              </motion.div>
            )}

            {/* Tips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center pt-4"
            >
              <p className="text-gray-600 text-xs">
                💡 Complete daily challenges to stay engaged with the community
              </p>
            </motion.div>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">
            <FiTarget className="mx-auto text-4xl text-gray-600 mb-4" />
            <p>Failed to load challenge. Try again later.</p>
          </div>
        )}
      </main>
    </div>
  );
}
