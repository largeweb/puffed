"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiArrowLeft, FiTrendingUp, FiTrendingDown, FiMinus, FiAward, FiZap, FiTarget, FiUsers } from "react-icons/fi";

interface GymSession {
  name: string;
  emoji: string;
  reps: number;
  startHour: number;
  endHour: number;
}

interface LeaderboardEntry {
  username: string;
  repsToday: number;
}

interface GymData {
  username: string;
  today: {
    reps: number;
    sets: number;
    brands: number;
    sessions: GymSession[];
  };
  comparison: {
    yesterday: number;
    change: number;
  };
  records: {
    personalBest: number;
    personalBestDate: string | null;
    isPR: boolean;
    weeklyTotal: number;
    streak: number;
  };
  motivation: string;
  level: string;
  leaderboard: LeaderboardEntry[];
}

function RepCounter({ reps, isPR }: { reps: number; isPR: boolean }) {
  return (
    <div className="relative">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-40 h-40 mx-auto rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-1"
      >
        <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <motion.span
              key={reps}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl font-black text-white"
            >
              {reps}
            </motion.span>
            <div className="text-orange-400 font-bold text-sm">REPS</div>
          </div>
        </div>
      </motion.div>
      {isPR && (
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold px-3 py-1 rounded-full text-xs shadow-lg"
        >
          🏆 NEW PR!
        </motion.div>
      )}
    </div>
  );
}

export default function SmokeGymPage() {
  const router = useRouter();
  const [data, setData] = useState<GymData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/smoke-gym", { credentials: "include" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const result = await res.json() as GymData;
      setData(result);
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full"
        />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Failed to load gym stats</p>
          <button onClick={loadData} className="text-orange-400 hover:underline">
            Try again
          </button>
        </div>
      </main>
    );
  }

  const changeIcon = data.comparison.change > 0 ? <FiTrendingUp className="text-green-400" /> 
    : data.comparison.change < 0 ? <FiTrendingDown className="text-red-400" /> 
    : <FiMinus className="text-gray-400" />;

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Rest Day": return "bg-gray-500/20 text-gray-400";
      case "Warm-up": return "bg-blue-500/20 text-blue-400";
      case "Light Session": return "bg-green-500/20 text-green-400";
      case "Regular": return "bg-yellow-500/20 text-yellow-400";
      case "Power Lifter": return "bg-orange-500/20 text-orange-400";
      case "Champion": return "bg-red-500/20 text-red-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-950/10 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600/20 via-red-500/20 to-pink-500/20 border-b border-orange-500/20">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-3 mb-2">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <FiArrowLeft className="text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                💪 Smoke Gym
              </h1>
              <p className="text-sm text-orange-200/70">
                Track your reps, crush your PRs
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Main Rep Counter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 text-center"
        >
          <div className={`inline-block px-4 py-1 rounded-full text-sm font-semibold mb-4 ${getLevelColor(data.level)}`}>
            {data.level}
          </div>
          
          <RepCounter reps={data.today.reps} isPR={data.records.isPR} />
          
          <p className="mt-4 text-gray-300 text-sm">{data.motivation}</p>
          
          {/* Today's Stats Row */}
          <div className="flex justify-center gap-8 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{data.today.sets}</div>
              <div className="text-xs text-gray-500">Sets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-400">{data.today.brands}</div>
              <div className="text-xs text-gray-500">Brands</div>
            </div>
            <div className="text-center flex items-center gap-1">
              <div className="text-2xl font-bold text-white">{data.comparison.change >= 0 ? '+' : ''}{data.comparison.change}</div>
              {changeIcon}
              <div className="text-xs text-gray-500 ml-1">vs yesterday</div>
            </div>
          </div>
        </motion.div>

        {/* Today's Sessions */}
        {data.today.sessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-5"
          >
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
              <FiZap className="text-orange-400" />
              Today's Sessions
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {data.today.sessions.map((session, i) => (
                <motion.div
                  key={session.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="bg-gradient-to-br from-orange-500/10 to-pink-500/10 rounded-xl p-4 text-center"
                >
                  <div className="text-2xl mb-1">{session.emoji}</div>
                  <div className="text-white font-bold text-lg">{session.reps}</div>
                  <div className="text-xs text-gray-400">{session.name}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Personal Records */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
            <FiAward className="text-amber-400" />
            Personal Records
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-amber-400">{data.records.personalBest}</div>
              <div className="text-xs text-gray-400">Best Day</div>
              {data.records.personalBestDate && (
                <div className="text-xs text-gray-500 mt-1">{data.records.personalBestDate}</div>
              )}
            </div>
            
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-blue-400">{data.records.weeklyTotal}</div>
              <div className="text-xs text-gray-400">This Week</div>
            </div>
            
            <div className="bg-gradient-to-br from-red-500/20 to-orange-500/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-red-400">{data.records.streak}🔥</div>
              <div className="text-xs text-gray-400">Day Streak</div>
            </div>
          </div>
        </motion.div>

        {/* Today's Leaderboard */}
        {data.leaderboard.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-5"
          >
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
              <FiUsers className="text-pink-400" />
              Today's Leaderboard
            </h3>
            
            <div className="space-y-2">
              {data.leaderboard.map((entry, i) => {
                const medals = ["🥇", "🥈", "🥉"];
                const isCurrentUser = entry.username === data.username;
                
                return (
                  <Link
                    key={entry.username}
                    href={`/user/${entry.username}`}
                    className={`flex items-center gap-3 p-3 rounded-xl transition ${
                      isCurrentUser 
                        ? 'bg-gradient-to-r from-orange-500/20 to-pink-500/20 border border-orange-500/30' 
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="w-8 text-center text-lg">
                      {i < 3 ? medals[i] : <span className="text-gray-500 text-sm">{i + 1}</span>}
                    </div>
                    <div className="flex-1 text-white font-medium">
                      @{entry.username}
                      {isCurrentUser && <span className="text-xs text-orange-400 ml-2">(you)</span>}
                    </div>
                    <div className="text-orange-400 font-bold">{entry.repsToday} reps</div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 gap-3"
        >
          <Link
            href="/log"
            className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold hover:opacity-90 transition"
          >
            💪 Add Rep
          </Link>
          <Link
            href="/leaderboard"
            className="flex items-center justify-center gap-2 p-4 bg-white/10 rounded-xl text-white font-semibold hover:bg-white/20 transition"
          >
            <FiTarget />
            All Leaderboards
          </Link>
        </motion.div>

        {/* Pro Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center text-gray-500 text-sm pb-8"
        >
          <p>💡 Every smoke is a rep. Beat your personal record!</p>
        </motion.div>
      </div>
    </div>
  );
}
