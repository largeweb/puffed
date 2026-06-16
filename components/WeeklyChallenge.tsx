"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiTarget, FiCheck, FiStar, FiPlus, FiUsers, FiZap } from "react-icons/fi";
import Link from "next/link";

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  goal: number;
  type: "checkins" | "newBrands" | "ratings" | "social" | "flavors";
  reward: string;
}

interface ChallengeProgress {
  challenge: Challenge;
  progress: number;
  completed: boolean;
}

// Weekly challenges rotate based on week number
const CHALLENGES: Challenge[] = [
  {
    id: "log3",
    title: "Triple Puff",
    description: "Log 3 smoke sessions this week",
    icon: <FiPlus className="w-5 h-5" />,
    goal: 3,
    type: "checkins",
    reward: "🏆 Triple Puff badge"
  },
  {
    id: "newbrand",
    title: "Explorer",
    description: "Try a brand you've never logged before",
    icon: <FiZap className="w-5 h-5" />,
    goal: 1,
    type: "newBrands",
    reward: "🗺️ Explorer badge"
  },
  {
    id: "rate5",
    title: "Five Star",
    description: "Give a cigar a perfect 5-star rating",
    icon: <FiStar className="w-5 h-5" />,
    goal: 1,
    type: "ratings",
    reward: "⭐ Critic badge"
  },
  {
    id: "social",
    title: "Social Smoker",
    description: "Like or comment on 3 check-ins",
    icon: <FiUsers className="w-5 h-5" />,
    goal: 3,
    type: "social",
    reward: "💬 Social badge"
  },
  {
    id: "flavor",
    title: "Flavor Hunter",
    description: "Tag 3 different flavors on your check-ins",
    icon: <FiTarget className="w-5 h-5" />,
    goal: 3,
    type: "flavors",
    reward: "🎯 Flavor Hunter badge"
  },
];

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

function getCurrentChallenge(): Challenge {
  const weekNum = getWeekNumber();
  return CHALLENGES[weekNum % CHALLENGES.length];
}

export default function WeeklyChallenge() {
  const [progress, setProgress] = useState<ChallengeProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, []);

  async function loadProgress() {
    try {
      const challenge = getCurrentChallenge();
      const res = await fetch(`/api/weekly-challenge?type=${challenge.type}`);
      if (res.ok) {
        const data: { progress: number } = await res.json();
        setProgress({
          challenge,
          progress: data.progress,
          completed: data.progress >= challenge.goal,
        });
      } else {
        // Fallback with 0 progress
        setProgress({
          challenge,
          progress: 0,
          completed: false,
        });
      }
    } catch (error) {
      console.error("Weekly challenge error:", error);
      const challenge = getCurrentChallenge();
      setProgress({
        challenge,
        progress: 0,
        completed: false,
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl p-4 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/2 mb-3" />
        <div className="h-8 bg-white/10 rounded" />
      </div>
    );
  }

  if (!progress) return null;

  const { challenge, progress: currentProgress, completed } = progress;
  const progressPercent = Math.min((currentProgress / challenge.goal) * 100, 100);

  // Calculate days left in the week
  const now = new Date();
  const daysLeft = 7 - now.getDay();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-2xl p-4 border ${
        completed 
          ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent" 
          : "border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${
            completed ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
          }`}>
            {completed ? <FiCheck className="w-5 h-5" /> : challenge.icon}
          </div>
          <div>
            <h3 className="font-semibold text-white">
              {completed ? "✨ Challenge Complete!" : "Weekly Challenge"}
            </h3>
            <p className="text-xs text-gray-400">
              {completed ? challenge.reward : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
            </p>
          </div>
        </div>
        {!completed && (
          <span className="text-sm font-medium text-amber-400">
            {currentProgress}/{challenge.goal}
          </span>
        )}
      </div>

      <div className="mb-3">
        <h4 className="font-medium text-white mb-1">{challenge.title}</h4>
        <p className="text-sm text-gray-400">{challenge.description}</p>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full rounded-full ${
            completed ? "bg-emerald-500" : "bg-amber-500"
          }`}
        />
      </div>

      {/* CTA for incomplete challenges */}
      {!completed && (
        <Link href="/checkin" className="mt-3 block">
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full py-2 px-4 bg-amber-500/20 hover:bg-amber-500/30 rounded-xl text-amber-400 text-sm font-medium transition-colors"
          >
            Log a Smoke to Progress →
          </motion.button>
        </Link>
      )}
    </motion.div>
  );
}
