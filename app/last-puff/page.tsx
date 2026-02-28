"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { 
  FiHome, FiRefreshCw, FiMoon, FiStar, FiClock, 
  FiUsers, FiAward, FiTrendingUp, FiPlus, FiZap
} from "react-icons/fi";

interface TonightContender {
  username: string;
  avatarUrl: string | null;
  brand: string;
  checkedAt: number;
  timeString: string;
}

interface LastPuffWinner {
  date: string;
  username: string;
  avatarUrl: string | null;
  brand: string;
  product: string | null;
  rating: number | null;
  checkedAt: number;
  timeString: string;
}

interface LastPuffLeader {
  username: string;
  avatarUrl: string | null;
  wins: number;
  latestWin: string | null;
  avgTime: string | null;
}

interface LastPuffData {
  tonightContenders: TonightContender[];
  currentLeader: TonightContender | null;
  yesterdayWinner: LastPuffWinner | null;
  recentWinners: LastPuffWinner[];
  leaders: LastPuffLeader[];
  stats: {
    totalDaysTracked: number;
    uniqueWinners: number;
    currentHour: number;
    currentMinute: number;
    isLateNight: boolean;
  };
  todayStr: string;
  message: string;
}

function formatDateLabel(dateStr: string): string {
  const today = new Date();
  const date = new Date(dateStr + 'T12:00:00');
  const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function LastPuffPage() {
  const [data, setData] = useState<LastPuffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tonight" | "history" | "legends">("tonight");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/last-puff");
      const json = await res.json() as LastPuffData;
      setData(json);
    } catch (err) {
      console.error("Failed to load last puff data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 2 minutes during late night
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-6xl"
        >
          🌙
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center text-white">
        <p>Failed to load data</p>
      </div>
    );
  }

  const { tonightContenders, currentLeader, yesterdayWinner, recentWinners, leaders, stats, message } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900/30 to-slate-900">
      {/* Starry background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.7 + 0.3,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-purple-500/20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition">
            <FiHome className="w-5 h-5 text-purple-300" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌙</span>
            <h1 className="text-lg font-bold text-white">Last Puff Club</h1>
          </div>
          <button 
            onClick={() => { setLoading(true); fetchData(); }}
            className="p-2 -mr-2 hover:bg-white/10 rounded-lg transition"
          >
            <FiRefreshCw className="w-5 h-5 text-purple-300" />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 relative z-10 space-y-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <motion.div
            animate={{ 
              scale: stats.isLateNight ? [1, 1.1, 1] : 1,
              rotate: stats.isLateNight ? [0, 5, -5, 0] : 0
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-6xl"
          >
            🌙
          </motion.div>
          <h2 className="text-xl font-bold text-white">Who Had The Last Puff?</h2>
          <p className="text-purple-300 text-sm">{message}</p>
          
          {stats.isLateNight && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 
                         px-4 py-2 rounded-full text-purple-200 text-sm"
            >
              <FiZap className="w-4 h-4" />
              PRIME TIME - Log now to compete!
            </motion.div>
          )}
        </motion.div>

        {/* Current Leader (Tonight) */}
        {currentLeader && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-500/30 
                       rounded-2xl p-5 text-center space-y-3"
          >
            <div className="text-xs text-purple-300 uppercase tracking-wider">Current Leader Tonight</div>
            <div className="flex items-center justify-center gap-3">
              {currentLeader.avatarUrl ? (
                <Image
                  src={currentLeader.avatarUrl}
                  alt={currentLeader.username}
                  width={48}
                  height={48}
                  className="rounded-full border-2 border-purple-400"
                />
              ) : (
                <div className="w-12 h-12 bg-purple-500/30 rounded-full flex items-center justify-center text-xl">
                  🌙
                </div>
              )}
              <div className="text-left">
                <Link 
                  href={`/user/${currentLeader.username}`}
                  className="text-lg font-bold text-white hover:text-purple-300 transition"
                >
                  {currentLeader.username}
                </Link>
                <p className="text-purple-300 text-sm">{currentLeader.brand}</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-purple-200">
              <FiClock className="w-4 h-4" />
              <span className="text-lg font-mono">{currentLeader.timeString}</span>
            </div>
            <p className="text-xs text-purple-400">
              Log a smoke now to take the crown! 👑
            </p>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-slate-800/50 rounded-xl p-1">
          {[
            { key: "tonight", label: "Tonight", icon: FiMoon },
            { key: "history", label: "History", icon: FiClock },
            { key: "legends", label: "Legends", icon: FiAward },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg 
                         text-sm font-medium transition ${
                activeTab === key
                  ? "bg-purple-500 text-white"
                  : "text-purple-300 hover:bg-white/10"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "tonight" && (
            <motion.div
              key="tonight"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FiUsers className="w-5 h-5 text-purple-400" />
                  Tonight&apos;s Contenders
                </h3>
                <Link
                  href="/checkin"
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm"
                >
                  <FiPlus className="w-4 h-4" />
                  Join Race
                </Link>
              </div>
              
              {tonightContenders.length === 0 ? (
                <div className="bg-slate-800/50 rounded-xl p-8 text-center border border-purple-500/20">
                  <div className="text-4xl mb-3">🌑</div>
                  <p className="text-purple-300">No smokes logged today yet</p>
                  <p className="text-purple-400 text-sm mt-1">Be the first to claim Last Puff!</p>
                  <Link
                    href="/checkin"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-purple-500 
                             text-white rounded-lg hover:bg-purple-600 transition"
                  >
                    <FiPlus className="w-4 h-4" />
                    Log a Smoke
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {tonightContenders.map((contender, index) => (
                    <motion.div
                      key={`${contender.username}-${contender.checkedAt}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                        index === 0
                          ? "bg-purple-500/20 border-purple-500/40"
                          : "bg-slate-800/50 border-slate-700/50"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 
                          ? "bg-purple-500 text-white" 
                          : "bg-slate-700 text-slate-300"
                      }`}>
                        {index === 0 ? "👑" : index + 1}
                      </div>
                      
                      {contender.avatarUrl ? (
                        <Image
                          src={contender.avatarUrl}
                          alt={contender.username}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-purple-500/30 rounded-full flex items-center justify-center">
                          🌙
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <Link 
                          href={`/user/${contender.username}`}
                          className={`font-medium hover:underline ${
                            index === 0 ? "text-purple-200" : "text-white"
                          }`}
                        >
                          {contender.username}
                        </Link>
                        <p className="text-sm text-slate-400 truncate">{contender.brand}</p>
                      </div>
                      
                      <div className="text-right">
                        <span className={`font-mono text-sm ${
                          index === 0 ? "text-purple-300" : "text-slate-400"
                        }`}>
                          {contender.timeString}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              
              {/* Yesterday's Winner */}
              {yesterdayWinner && (
                <div className="mt-6 pt-6 border-t border-purple-500/20">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <FiStar className="w-5 h-5 text-yellow-400" />
                    Yesterday&apos;s Last Puff
                  </h3>
                  <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 
                                 rounded-xl p-4 flex items-center gap-4">
                    <div className="text-3xl">🏆</div>
                    {yesterdayWinner.avatarUrl ? (
                      <Image
                        src={yesterdayWinner.avatarUrl}
                        alt={yesterdayWinner.username}
                        width={48}
                        height={48}
                        className="rounded-full border-2 border-yellow-400"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center text-xl">
                        🌙
                      </div>
                    )}
                    <div className="flex-1">
                      <Link 
                        href={`/user/${yesterdayWinner.username}`}
                        className="font-bold text-yellow-200 hover:underline"
                      >
                        {yesterdayWinner.username}
                      </Link>
                      <p className="text-sm text-yellow-300/70">
                        {yesterdayWinner.brand} at {yesterdayWinner.timeString}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FiClock className="w-5 h-5 text-purple-400" />
                Recent Last Puff Winners
              </h3>
              
              {recentWinners.length === 0 ? (
                <div className="bg-slate-800/50 rounded-xl p-6 text-center border border-purple-500/20">
                  <p className="text-purple-300">No history yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentWinners.map((winner, index) => (
                    <motion.div
                      key={winner.date}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50"
                    >
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-lg">🌙</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/user/${winner.username}`}
                            className="font-medium text-white hover:underline"
                          >
                            {winner.username}
                          </Link>
                          {winner.rating && (
                            <span className="flex items-center gap-1 text-yellow-400 text-xs">
                              <FiStar className="w-3 h-3" fill="currentColor" />
                              {winner.rating}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 truncate">
                          {winner.brand}{winner.product ? ` - ${winner.product}` : ''}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-purple-300">{formatDateLabel(winner.date)}</p>
                        <p className="text-xs text-slate-500 font-mono">{winner.timeString}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "legends" && (
            <motion.div
              key="legends"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FiAward className="w-5 h-5 text-yellow-400" />
                Last Puff Legends
              </h3>
              
              <div className="bg-slate-800/30 rounded-xl p-4 border border-purple-500/20">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-purple-300">{stats.totalDaysTracked}</p>
                    <p className="text-xs text-slate-400">Days Tracked</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-300">{stats.uniqueWinners}</p>
                    <p className="text-xs text-slate-400">Unique Winners</p>
                  </div>
                </div>
              </div>
              
              {leaders.length === 0 ? (
                <div className="bg-slate-800/50 rounded-xl p-6 text-center border border-purple-500/20">
                  <p className="text-purple-300">No legends yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaders.map((leader, index) => (
                    <motion.div
                      key={leader.username}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                        index < 3
                          ? "bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border-purple-500/30"
                          : "bg-slate-800/50 border-slate-700/50"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? "bg-yellow-500 text-black" :
                        index === 1 ? "bg-slate-300 text-black" :
                        index === 2 ? "bg-amber-600 text-white" :
                        "bg-slate-700 text-slate-300"
                      }`}>
                        {index < 3 ? ["🥇", "🥈", "🥉"][index] : index + 1}
                      </div>
                      
                      {leader.avatarUrl ? (
                        <Image
                          src={leader.avatarUrl}
                          alt={leader.username}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-purple-500/30 rounded-full flex items-center justify-center">
                          🌙
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <Link 
                          href={`/user/${leader.username}`}
                          className="font-medium text-white hover:underline"
                        >
                          {leader.username}
                        </Link>
                        <p className="text-sm text-slate-400">
                          {leader.avgTime && `Avg: ${leader.avgTime}`}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-300">{leader.wins}</p>
                        <p className="text-xs text-slate-500">wins</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <Link
            href="/checkin"
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 
                     text-white font-medium rounded-full shadow-lg shadow-purple-500/30 
                     hover:shadow-purple-500/50 hover:scale-105 transition-all"
          >
            <FiPlus className="w-5 h-5" />
            Log Last Puff
          </Link>
        </motion.div>
        
        {/* Spacer for fixed button */}
        <div className="h-20" />
      </main>
    </div>
  );
}
