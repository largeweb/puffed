"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiTrendingUp, FiChevronRight } from "react-icons/fi";
import Link from "next/link";

interface PersonalBest {
  label: string;
  value: string | number;
  detail?: string;
  icon: string;
  date?: string;
}

interface PersonalBestsData {
  bests: PersonalBest[];
  message?: string;
}

export default function PersonalBests() {
  const [data, setData] = useState<PersonalBestsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/personal-bests");
      if (res.ok) {
        const result: PersonalBestsData = await res.json();
        setData(result);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl p-4 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-16 bg-white/10 rounded-lg" />
          <div className="h-16 bg-white/10 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data || data.bests.length === 0) {
    return null;
  }

  // Show top 4 by default, all when expanded
  const visibleBests = expanded ? data.bests : data.bests.slice(0, 4);
  const hasMore = data.bests.length > 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center">
            <FiTrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-amber-100">Your Personal Bests</h3>
            <p className="text-xs text-gray-400">Your smoking journey in numbers</p>
          </div>
        </div>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
          >
            {expanded ? "Less" : `+${data.bests.length - 4} more`}
            <motion.div
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <FiChevronRight className="w-3 h-3" />
            </motion.div>
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <motion.div 
        className="grid grid-cols-2 gap-2"
        layout
      >
        {visibleBests.map((best, idx) => (
          <motion.div
            key={best.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white/5 rounded-xl p-3 border border-white/10 hover:border-amber-500/30 transition-colors"
          >
            <div className="flex items-start gap-2">
              <span className="text-xl">{best.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold text-amber-100 truncate">
                  {best.value}
                </div>
                <div className="text-xs text-gray-400 truncate">{best.label}</div>
                {best.detail && (
                  <div className="text-[10px] text-gray-500 truncate mt-0.5">
                    {best.detail}
                  </div>
                )}
                {best.date && (
                  <div className="text-[10px] text-amber-500/70 mt-0.5">
                    {best.date}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Footer link */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <Link
          href="/history"
          className="text-xs text-gray-400 hover:text-amber-400 transition-colors flex items-center gap-1"
        >
          View your smoking history
          <FiChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </motion.div>
  );
}
