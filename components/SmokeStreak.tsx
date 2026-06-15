"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiZap, FiCalendar, FiTrendingUp, FiPlus } from "react-icons/fi";
import Link from "next/link";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCheckinDate: string | null;
  checkinDates: string[];
  isOnFire: boolean;
}

export default function SmokeStreak() {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStreak() {
      try {
        const res = await fetch("/api/streak");
        const data = await res.json() as { streak: StreakData };
        setStreak(data.streak);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadStreak();
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-2xl p-4 animate-pulse">
        <div className="h-16 bg-white/10 rounded-xl" />
      </div>
    );
  }

  if (!streak) return null;

  const today = new Date().toISOString().split('T')[0];
  const checkedInToday = streak.checkinDates.includes(today);

  // Generate last 7 days for mini calendar
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  });

  const getDayLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 ${
        streak.isOnFire 
          ? "bg-gradient-to-r from-orange-600/40 to-red-600/40 border border-orange-500/30" 
          : "bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-700/30"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${streak.isOnFire ? "bg-orange-500/30" : "bg-amber-700/30"}`}>
            <FiZap className={`w-5 h-5 ${streak.isOnFire ? "text-orange-400" : "text-amber-400"}`} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Smoke Streak</h3>
            <p className="text-white/60 text-xs">
              {streak.currentStreak > 0 
                ? `${streak.currentStreak} day${streak.currentStreak !== 1 ? 's' : ''} and counting!`
                : "Start your streak today!"
              }
            </p>
          </div>
        </div>
        
        {/* Current streak number */}
        <div className="text-right">
          <div className={`text-3xl font-bold ${streak.isOnFire ? "text-orange-400" : "text-amber-400"}`}>
            {streak.currentStreak}
            {streak.isOnFire && <span className="ml-1">🔥</span>}
          </div>
          {streak.longestStreak > streak.currentStreak && (
            <p className="text-white/50 text-xs flex items-center justify-end gap-1">
              <FiTrendingUp className="w-3 h-3" />
              Best: {streak.longestStreak}
            </p>
          )}
        </div>
      </div>

      {/* Mini calendar - last 7 days */}
      <div className="flex justify-between mb-3">
        {last7Days.map((dateStr) => {
          const hasCheckin = streak.checkinDates.includes(dateStr);
          const isToday = dateStr === today;
          
          return (
            <div key={dateStr} className="flex flex-col items-center gap-1">
              <span className="text-white/40 text-xs">{getDayLabel(dateStr)}</span>
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  hasCheckin 
                    ? streak.isOnFire 
                      ? "bg-orange-500 text-white" 
                      : "bg-amber-600 text-white"
                    : isToday
                      ? "bg-white/20 text-white/60 border-2 border-dashed border-white/30"
                      : "bg-white/10 text-white/30"
                }`}
              >
                {hasCheckin ? "✓" : isToday ? "?" : "·"}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      {!checkedInToday && (
        <Link href="/checkin">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 ${
              streak.currentStreak > 0
                ? "bg-orange-500 hover:bg-orange-600 text-white"
                : "bg-amber-600 hover:bg-amber-700 text-white"
            }`}
          >
            <FiPlus className="w-4 h-4" />
            {streak.currentStreak > 0 
              ? "Keep your streak alive!" 
              : "Log your first smoke!"
            }
          </motion.button>
        </Link>
      )}

      {checkedInToday && streak.currentStreak > 0 && (
        <div className="text-center py-2 text-white/60 text-sm">
          ✨ Nice! You&apos;ve logged today — see you tomorrow!
        </div>
      )}
    </motion.div>
  );
}
