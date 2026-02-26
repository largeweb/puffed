"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiActivity, FiTrendingUp, FiAward, FiCalendar, FiHeart, FiMessageCircle, FiSmile, FiZap, FiArrowLeft, FiCheck, FiX } from "react-icons/fi";
import Link from "next/link";

interface DayActivity {
  date: string;
  smokes: number;
  likes: number;
  comments: number;
  reactions: number;
  total: number;
}

interface ActivityStreakData {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  recentActivity: DayActivity[];
  streakStartDate: string | null;
  lastActiveDate: string | null;
  todayActive: boolean;
  activityBreakdown: {
    smokes: number;
    likes: number;
    comments: number;
    reactions: number;
  };
}

export default function ActivityStreakPage() {
  const router = useRouter();
  const [data, setData] = useState<ActivityStreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activity-streak")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        return res.json() as Promise<ActivityStreakData>;
      })
      .then((d: ActivityStreakData | null) => {
        if (d && d.currentStreak !== undefined) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 p-6 text-center">
        <p className="text-gray-400">Failed to load activity streak</p>
      </div>
    );
  }

  const getStreakEmoji = (streak: number) => {
    if (streak >= 100) return "🏆";
    if (streak >= 60) return "💎";
    if (streak >= 30) return "🔥";
    if (streak >= 14) return "⚡";
    if (streak >= 7) return "✨";
    if (streak >= 3) return "🌱";
    return "🎯";
  };

  const getStreakMessage = (streak: number, todayActive: boolean) => {
    if (!todayActive && streak > 0) {
      return "Log some activity today to keep your streak alive!";
    }
    if (streak === 0) return "Start your activity streak today!";
    if (streak >= 100) return "Legendary dedication! You're unstoppable!";
    if (streak >= 60) return "Two months strong! Diamond status!";
    if (streak >= 30) return "A full month of engagement! Amazing!";
    if (streak >= 14) return "Two weeks of consistency! Keep it up!";
    if (streak >= 7) return "One week milestone achieved!";
    if (streak >= 3) return "Building momentum! Keep going!";
    return "Great start! Every day counts!";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard" className="text-white/80 hover:text-white">
              <FiArrowLeft size={24} />
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FiActivity className="text-emerald-200" />
              Activity Streak
            </h1>
          </div>
          <p className="text-emerald-100 text-sm">
            Track your daily engagement — smoking, liking, commenting, and reacting all count!
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 -mt-4 space-y-6">
        {/* Current Streak Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/80 backdrop-blur rounded-2xl p-6 text-center"
        >
          <div className="text-6xl mb-2">{getStreakEmoji(data.currentStreak)}</div>
          <div className="text-5xl font-bold text-emerald-400 mb-1">
            {data.currentStreak}
          </div>
          <div className="text-gray-400 mb-4">day activity streak</div>
          
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
            data.todayActive 
              ? "bg-emerald-500/20 text-emerald-400" 
              : "bg-amber-500/20 text-amber-400"
          }`}>
            {data.todayActive ? (
              <>
                <FiCheck /> Active today!
              </>
            ) : (
              <>
                <FiZap /> Do something to stay active!
              </>
            )}
          </div>

          <p className="text-gray-300 mt-4 text-sm">
            {getStreakMessage(data.currentStreak, data.todayActive)}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/60 rounded-xl p-4 text-center"
          >
            <FiAward className="text-amber-400 mx-auto mb-2" size={24} />
            <div className="text-2xl font-bold text-white">{data.longestStreak}</div>
            <div className="text-xs text-gray-400">Longest Streak</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gray-800/60 rounded-xl p-4 text-center"
          >
            <FiCalendar className="text-cyan-400 mx-auto mb-2" size={24} />
            <div className="text-2xl font-bold text-white">{data.totalActiveDays}</div>
            <div className="text-xs text-gray-400">Total Active Days</div>
          </motion.div>
        </div>

        {/* Activity Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/60 rounded-xl p-4"
        >
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <FiTrendingUp className="text-emerald-400" />
            All-Time Activity
          </h3>
          
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-3 bg-gray-700/50 rounded-lg">
              <div className="text-xl mb-1">🚬</div>
              <div className="text-lg font-bold text-white">{data.activityBreakdown.smokes}</div>
              <div className="text-xs text-gray-400">Smokes</div>
            </div>
            <div className="text-center p-3 bg-gray-700/50 rounded-lg">
              <div className="text-xl mb-1">❤️</div>
              <div className="text-lg font-bold text-white">{data.activityBreakdown.likes}</div>
              <div className="text-xs text-gray-400">Likes</div>
            </div>
            <div className="text-center p-3 bg-gray-700/50 rounded-lg">
              <div className="text-xl mb-1">💬</div>
              <div className="text-lg font-bold text-white">{data.activityBreakdown.comments}</div>
              <div className="text-xs text-gray-400">Comments</div>
            </div>
            <div className="text-center p-3 bg-gray-700/50 rounded-lg">
              <div className="text-xl mb-1">😊</div>
              <div className="text-lg font-bold text-white">{data.activityBreakdown.reactions}</div>
              <div className="text-xs text-gray-400">Reactions</div>
            </div>
          </div>
        </motion.div>

        {/* Recent 7 Days */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gray-800/60 rounded-xl p-4"
        >
          <h3 className="text-white font-semibold mb-4">Last 7 Days</h3>
          
          <div className="space-y-2">
            {data.recentActivity.map((day, i) => (
              <div 
                key={day.date}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  day.total > 0 ? "bg-emerald-500/10" : "bg-gray-700/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    day.total > 0 ? "bg-emerald-500/30 text-emerald-400" : "bg-gray-600/50 text-gray-500"
                  }`}>
                    {day.total > 0 ? <FiCheck size={16} /> : <FiX size={16} />}
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">{getDayName(day.date)}</div>
                    <div className="text-xs text-gray-500">{formatDate(day.date)}</div>
                  </div>
                </div>
                
                {day.total > 0 ? (
                  <div className="flex items-center gap-2 text-xs">
                    {day.smokes > 0 && <span className="text-amber-400">🚬{day.smokes}</span>}
                    {day.likes > 0 && <span className="text-pink-400">❤️{day.likes}</span>}
                    {day.comments > 0 && <span className="text-cyan-400">💬{day.comments}</span>}
                    {day.reactions > 0 && <span className="text-purple-400">😊{day.reactions}</span>}
                  </div>
                ) : (
                  <span className="text-gray-500 text-xs">No activity</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Motivation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-xl p-4 text-center"
        >
          <p className="text-emerald-300 text-sm">
            💡 <strong>Tip:</strong> Even a quick like or reaction counts toward your activity streak. Stay engaged!
          </p>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 pb-8">
          <Link 
            href="/dashboard"
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-4 rounded-xl text-center transition-colors"
          >
            🚬 Log a Smoke
          </Link>
          <Link 
            href="/discover"
            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-xl text-center transition-colors"
          >
            ❤️ Browse & React
          </Link>
        </div>
      </div>
    </div>
  );
}
