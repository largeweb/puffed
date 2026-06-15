"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiTrendingUp, FiTrendingDown, FiMinus, FiZap, FiTarget, FiCalendar, FiChevronRight, FiAward } from "react-icons/fi";
import Link from "next/link";

interface MomentumData {
  thisWeek: number;
  lastWeek: number;
  streak: number;
  bestStreak: number;
  daysSinceLastSmoke: number;
  lastBrand?: string;
  weeklyGoal?: number;
  totalAllTime: number;
}

interface MomentumResponse {
  momentum: MomentumData;
  encouragement: string;
  badge?: string;
}

const ENCOURAGEMENTS = {
  onFire: [
    "🔥 You're on fire this week!",
    "⚡ Crushing it! Keep the momentum going.",
    "🚀 Beast mode activated!",
    "💪 This is YOUR week!",
  ],
  improving: [
    "📈 Nice uptick! Building momentum.",
    "🌱 Growing strong this week!",
    "⬆️ Trending up! Love to see it.",
    "✨ Picking up steam!",
  ],
  steady: [
    "⚖️ Steady as she goes!",
    "🎯 Consistency is key.",
    "💎 Reliable as always.",
    "🧘 Finding your rhythm.",
  ],
  slowing: [
    "🌅 Taking it easy? That's okay too.",
    "🍃 Sometimes less is more.",
    "☕ Quality over quantity.",
    "🌙 A gentle week.",
  ],
  comeback: [
    "👋 We missed you! Time to spark one?",
    "🎬 Plot twist: The comeback arc starts now.",
    "🌄 Fresh week, fresh start!",
    "🔄 Ready to get back in the groove?",
  ],
};

function getEncouragement(data: MomentumData): { text: string; type: keyof typeof ENCOURAGEMENTS } {
  const dayOfWeek = new Date().getDay();
  const seed = dayOfWeek + data.totalAllTime;
  
  let type: keyof typeof ENCOURAGEMENTS;
  
  if (data.daysSinceLastSmoke > 7) {
    type = "comeback";
  } else if (data.thisWeek > data.lastWeek && data.thisWeek >= 3) {
    type = "onFire";
  } else if (data.thisWeek > data.lastWeek) {
    type = "improving";
  } else if (data.thisWeek === data.lastWeek) {
    type = "steady";
  } else {
    type = "slowing";
  }
  
  const options = ENCOURAGEMENTS[type];
  const text = options[seed % options.length];
  
  return { text, type };
}

function getTrendIcon(thisWeek: number, lastWeek: number) {
  if (thisWeek > lastWeek) return <FiTrendingUp className="text-green-400" />;
  if (thisWeek < lastWeek) return <FiTrendingDown className="text-amber-400" />;
  return <FiMinus className="text-gray-400" />;
}

export default function WeeklyMomentum() {
  const [data, setData] = useState<MomentumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchMomentum();
  }, []);

  async function fetchMomentum() {
    try {
      const res = await fetch("/api/weekly-momentum");
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const json: MomentumResponse = await res.json();
      setData(json.momentum);
    } catch {
      // Silently fail - component is optional
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-1/2 mb-2" />
        <div className="h-3 bg-gray-700 rounded w-3/4" />
      </div>
    );
  }

  if (!data) return null;

  const { text: encouragement, type } = getEncouragement(data);
  const weekProgress = data.weeklyGoal ? Math.min(100, (data.thisWeek / data.weeklyGoal) * 100) : null;
  
  const bgGradient = {
    onFire: "from-orange-500/10 via-red-500/10 to-amber-500/10 border-orange-500/30",
    improving: "from-green-500/10 via-emerald-500/10 to-cyan-500/10 border-green-500/30",
    steady: "from-blue-500/10 via-indigo-500/10 to-purple-500/10 border-blue-500/30",
    slowing: "from-gray-500/10 via-slate-500/10 to-zinc-500/10 border-gray-500/30",
    comeback: "from-amber-500/10 via-yellow-500/10 to-orange-500/10 border-amber-500/30",
  }[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-xl p-4 bg-gradient-to-br ${bgGradient} border cursor-pointer`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header with encouragement */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FiCalendar className="text-amber-400" size={16} />
          <span className="text-sm font-medium text-white">Weekly Momentum</span>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          className="text-gray-400"
        >
          <FiChevronRight size={16} />
        </motion.div>
      </div>

      {/* Encouragement message */}
      <p className="text-sm text-gray-300 mb-3">{encouragement}</p>

      {/* Quick stats row */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          {getTrendIcon(data.thisWeek, data.lastWeek)}
          <span className="text-white font-medium">{data.thisWeek}</span>
          <span className="text-gray-500">this week</span>
          <span className="text-gray-600">vs {data.lastWeek}</span>
        </div>
        
        {data.streak > 0 && (
          <div className="flex items-center gap-1 text-orange-400">
            <FiZap size={12} />
            <span className="font-medium">{data.streak}d</span>
            <span className="text-gray-500">streak</span>
          </div>
        )}
      </div>

      {/* Weekly goal progress */}
      {weekProgress !== null && (
        <div className="mt-3">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-gray-400">Weekly Goal</span>
            <span className="text-amber-400 font-medium">{data.thisWeek}/{data.weeklyGoal}</span>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${weekProgress}%` }}
              className={`h-full rounded-full ${
                weekProgress >= 100 
                  ? "bg-gradient-to-r from-green-400 to-emerald-500" 
                  : "bg-gradient-to-r from-amber-400 to-orange-500"
              }`}
            />
          </div>
        </div>
      )}

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-gray-700/50 space-y-3">
              {/* Best streak */}
              {data.bestStreak > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 flex items-center gap-2">
                    <FiAward className="text-yellow-500" size={14} />
                    Best Streak
                  </span>
                  <span className="text-white font-medium">{data.bestStreak} days</span>
                </div>
              )}
              
              {/* Total all time */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-2">
                  <FiTarget className="text-purple-400" size={14} />
                  All Time
                </span>
                <span className="text-white font-medium">{data.totalAllTime} smokes</span>
              </div>
              
              {/* Days since last */}
              {data.daysSinceLastSmoke > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Last smoke</span>
                  <span className="text-gray-300">
                    {data.daysSinceLastSmoke === 1 ? "Yesterday" : `${data.daysSinceLastSmoke} days ago`}
                    {data.lastBrand && <span className="text-amber-400 ml-1">({data.lastBrand})</span>}
                  </span>
                </div>
              )}
              
              {/* Action link */}
              <Link
                href="/achievements"
                className="block text-center text-xs text-amber-400 hover:text-amber-300 pt-2"
                onClick={(e) => e.stopPropagation()}
              >
                View Achievements →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
