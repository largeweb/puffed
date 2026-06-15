"use client";

import { motion } from "framer-motion";
import { FiTarget, FiZap, FiAward, FiPlus } from "react-icons/fi";
import Link from "next/link";
import type { WeeklyProgressResponse } from "@/lib/types";

interface WeeklyProgressProps {
  data: WeeklyProgressResponse | null;
  loading?: boolean;
}

export default function WeeklyProgress({ data, loading }: WeeklyProgressProps) {
  if (loading) {
    return (
      <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl p-4 border border-amber-500/20 animate-pulse">
        <div className="h-4 bg-amber-500/20 rounded w-32 mb-3" />
        <div className="h-8 bg-amber-500/20 rounded mb-2" />
        <div className="h-3 bg-amber-500/20 rounded w-24" />
      </div>
    );
  }

  if (!data) return null;

  const { checkinsThisWeek, weeklyGoal, progress, streak } = data;
  const remaining = Math.max(0, weeklyGoal - checkinsThisWeek);
  const goalMet = checkinsThisWeek >= weeklyGoal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-4 border ${
        goalMet
          ? "bg-gradient-to-r from-emerald-900/40 to-green-900/40 border-emerald-500/30"
          : "bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-amber-500/20"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FiTarget className={goalMet ? "text-emerald-400" : "text-amber-400"} />
          <span className="text-sm font-medium text-stone-200">Weekly Goal</span>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1 text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full">
            <FiZap className="w-3 h-3" />
            <span>{streak} week streak!</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-2xl font-bold text-white">
            {checkinsThisWeek} <span className="text-sm font-normal text-stone-400">/ {weeklyGoal}</span>
          </span>
          {goalMet && (
            <span className="flex items-center gap-1 text-emerald-400 text-sm">
              <FiAward /> Goal Met!
            </span>
          )}
        </div>
        <div className="h-2 bg-stone-700/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`h-full rounded-full ${
              goalMet
                ? "bg-gradient-to-r from-emerald-500 to-green-400"
                : "bg-gradient-to-r from-amber-500 to-orange-400"
            }`}
          />
        </div>
      </div>

      {/* CTA */}
      {!goalMet && (
        <Link href="/checkin">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg py-2 px-4 text-sm font-medium transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            {remaining === weeklyGoal
              ? "Log your first smoke this week!"
              : `${remaining} more to hit your goal!`}
          </motion.div>
        </Link>
      )}

      {goalMet && checkinsThisWeek > weeklyGoal && (
        <p className="text-xs text-emerald-400/80 text-center">
          🔥 {checkinsThisWeek - weeklyGoal} bonus check-in{checkinsThisWeek - weeklyGoal > 1 ? 's' : ''}!
        </p>
      )}
    </motion.div>
  );
}
