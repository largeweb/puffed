"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  target: number;
  current: number;
  category: string;
}

interface AchievementData {
  achievement: Achievement | null;
  message: string;
}

export default function NextAchievement() {
  const [data, setData] = useState<AchievementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/next-achievement");
      if (res.ok) {
        const result = await res.json() as AchievementData;
        setData(result);
      }
    } catch {
      // ignore errors
    } finally {
      setLoading(false);
    }
  }

  if (loading || !data?.achievement) return null;

  const ach = data.achievement;
  const progress = Math.round((ach.current / ach.target) * 100);
  const remaining = ach.target - ach.current;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-700/50 rounded-xl p-4"
    >
      <div className="flex items-center gap-3">
        <div className="text-3xl">{ach.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-purple-200 font-semibold">{ach.name}</span>
            <span className="text-xs bg-purple-700/50 text-purple-200 px-2 py-0.5 rounded-full">
              {remaining} to go!
            </span>
          </div>
          <div className="text-sm text-purple-300">{ach.description}</div>
          
          {/* Progress bar */}
          <div className="mt-2 h-2 bg-purple-900/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
            />
          </div>
          <div className="text-xs text-purple-400 mt-1">
            {ach.current}/{ach.target} ({progress}%)
          </div>
        </div>
      </div>
    </motion.div>
  );
}
