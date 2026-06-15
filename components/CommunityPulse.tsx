"use client";

import { motion } from "framer-motion";
import { FiActivity, FiUsers, FiTrendingUp, FiZap } from "react-icons/fi";
import Link from "next/link";

interface CommunityPulseProps {
  checkinsThisWeek: number;
  activeUsers?: number;
  recentUsernames?: string[];
  loading?: boolean;
}

export default function CommunityPulse({ 
  checkinsThisWeek, 
  activeUsers = 0,
  recentUsernames = [],
  loading 
}: CommunityPulseProps) {
  if (loading) {
    return (
      <div className="bg-gradient-to-r from-violet-900/30 to-purple-900/30 rounded-xl p-4 border border-violet-500/20 animate-pulse">
        <div className="h-4 bg-violet-500/20 rounded w-32 mb-3" />
        <div className="h-6 bg-violet-500/20 rounded w-48" />
      </div>
    );
  }

  const isQuiet = checkinsThisWeek === 0;
  const isActive = checkinsThisWeek >= 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-4 border ${
        isQuiet
          ? "bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-amber-500/30"
          : isActive
          ? "bg-gradient-to-r from-emerald-900/30 to-green-900/30 border-emerald-500/20"
          : "bg-gradient-to-r from-violet-900/30 to-purple-900/30 border-violet-500/20"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <FiActivity className={isQuiet ? "text-amber-400" : isActive ? "text-emerald-400" : "text-violet-400"} />
        <span className="text-sm font-medium text-stone-200">Community Pulse</span>
        {isActive && (
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-emerald-400"
          >
            <FiZap className="w-4 h-4" />
          </motion.span>
        )}
      </div>

      {isQuiet ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-lg font-semibold text-amber-300">Be the first this week!</p>
              <p className="text-xs text-stone-400">No check-ins yet — claim the spotlight</p>
            </div>
          </div>
          <Link href="/checkin">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 bg-amber-500/30 hover:bg-amber-500/40 text-amber-200 rounded-lg py-2 px-4 text-sm font-medium transition-colors"
            >
              <FiTrendingUp className="w-4 h-4" />
              Log the first smoke of the week
            </motion.div>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${isActive ? "text-emerald-300" : "text-violet-300"}`}>
              {checkinsThisWeek}
            </span>
            <span className="text-sm text-stone-400">
              check-in{checkinsThisWeek !== 1 ? 's' : ''} this week
            </span>
          </div>
          
          {recentUsernames.length > 0 && (
            <p className="text-xs text-stone-400">
              <FiUsers className="inline w-3 h-3 mr-1" />
              Recent: {recentUsernames.slice(0, 3).join(', ')}
              {recentUsernames.length > 3 && ` +${recentUsernames.length - 3} more`}
            </p>
          )}

          {activeUsers > 0 && (
            <p className="text-xs text-stone-500">
              {activeUsers} active smoker{activeUsers !== 1 ? 's' : ''} this week
            </p>
          )}

          <Link href="/checkin">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center justify-center gap-2 ${
                isActive 
                  ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300"
                  : "bg-violet-500/20 hover:bg-violet-500/30 text-violet-300"
              } rounded-lg py-2 px-4 text-sm font-medium transition-colors mt-2`}
            >
              <FiTrendingUp className="w-4 h-4" />
              Join the community
            </motion.div>
          </Link>
        </div>
      )}
    </motion.div>
  );
}
