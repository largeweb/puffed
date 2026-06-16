"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiTrendingUp, FiTarget, FiUsers, FiHeart, FiMessageCircle, FiCheck } from "react-icons/fi";

interface MilestoneData {
  current: number;
  target: number;
  type: "users" | "checkins" | "likes" | "follows";
  label: string;
  icon: string;
  message: string;
}

interface PublicStats {
  users: number;
  checkins: number;
  likes: number;
  follows: number;
  comments: number;
  reactions: number;
  brands: number;
}

const MILESTONES = {
  users: [50, 100, 150, 200, 250, 300, 500, 750, 1000],
  checkins: [100, 200, 250, 300, 500, 750, 1000, 2000],
  likes: [100, 200, 300, 500, 750, 1000],
  follows: [200, 300, 400, 500, 750, 1000],
};

const MILESTONE_MESSAGES: Record<string, string[]> = {
  users: [
    "Growing the community together! 🌱",
    "Every new member makes us stronger 💪",
    "The community is thriving! 🎉",
  ],
  checkins: [
    "Every smoke tells a story 📖",
    "Logging our way to greatness! 🚀",
    "The smoke log is growing! 💨",
  ],
  likes: [
    "Spreading the love! ❤️",
    "Supporting each other's smokes 🙌",
    "Good vibes all around! ✨",
  ],
  follows: [
    "Building connections! 🔗",
    "A network of fellow aficionados 🤝",
    "Growing our circle! 🌐",
  ],
};

function getNextMilestone(stats: PublicStats): MilestoneData | null {
  const candidates: MilestoneData[] = [];

  // Find next milestone for each type
  for (const type of ["users", "checkins", "likes", "follows"] as const) {
    const current = stats[type];
    const targets = MILESTONES[type];
    const nextTarget = targets.find(t => t > current);
    
    if (nextTarget) {
      const remaining = nextTarget - current;
      const progress = (current / nextTarget) * 100;
      
      // Only consider milestones that are >50% complete (feels achievable)
      if (progress >= 50) {
        const icons: Record<string, string> = {
          users: "👥",
          checkins: "🚬",
          likes: "❤️",
          follows: "🤝",
        };
        const labels: Record<string, string> = {
          users: "members",
          checkins: "check-ins",
          likes: "likes",
          follows: "follows",
        };
        const messages = MILESTONE_MESSAGES[type];
        
        candidates.push({
          current,
          target: nextTarget,
          type,
          label: labels[type],
          icon: icons[type],
          message: messages[Math.floor(Math.random() * messages.length)],
        });
      }
    }
  }

  // Sort by progress (closest to completion first)
  candidates.sort((a, b) => {
    const progressA = a.current / a.target;
    const progressB = b.current / b.target;
    return progressB - progressA;
  });

  return candidates[0] || null;
}

export default function CommunityMilestone() {
  const [milestone, setMilestone] = useState<MilestoneData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch("/api/public-stats");
        if (res.ok) {
          const data: { stats: PublicStats } = await res.json();
          const next = getNextMilestone(data.stats);
          setMilestone(next);
        }
      } catch (err) {
        console.error("Failed to load milestone:", err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/20 animate-pulse">
        <div className="h-16" />
      </div>
    );
  }

  if (!milestone) {
    return null; // No nearby milestones
  }

  const progress = (milestone.current / milestone.target) * 100;
  const remaining = milestone.target - milestone.current;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/30 via-indigo-900/25 to-violet-900/20 border border-purple-500/30"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{milestone.icon}</span>
          <div>
            <h3 className="font-semibold text-purple-200">Community Milestone</h3>
            <p className="text-xs text-purple-400/80">{milestone.message}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-white">
            {milestone.current.toLocaleString()}
            <span className="text-purple-400 text-sm font-normal">/{milestone.target.toLocaleString()}</span>
          </div>
          <div className="text-xs text-purple-300">{milestone.label}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-purple-950/50 rounded-full overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
      </div>

      {/* Call to action */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-purple-300/70">
          {Math.round(progress)}% there!
        </span>
        <span className="text-purple-200 font-medium">
          {remaining === 1 ? "Just 1 more!" : `${remaining} to go!`} 🎯
        </span>
      </div>
    </motion.div>
  );
}
