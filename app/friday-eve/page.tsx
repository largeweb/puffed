"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  FiStar, FiArrowLeft, FiUsers, FiAward, FiMusic, 
  FiSun, FiClock, FiTrendingUp 
} from "react-icons/fi";
import Link from "next/link";

interface FridayEveSmoker {
  id: number;
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  image_url?: string;
  created_at: number;
  drink_pairing?: string;
}

interface FridayEveStats {
  count: number;
  avgRating: string;
  uniqueSmokers: number;
  topBrand: string | null;
}

interface FridayEveLeader {
  username: string;
  count: number;
  avgRating: number;
}

interface FridayEveData {
  isFridayEve: boolean;
  tonightSmokers: FridayEveSmoker[];
  countdown: {
    hours: number;
    minutes: number;
    label: string;
  };
  tonightStats: FridayEveStats;
  allTimeThursday: {
    totalSmokes: number;
    avgRating: string;
    uniqueSmokers: number;
  };
  leaders: FridayEveLeader[];
  userStats: {
    thursdaySmokes: number;
    thursdayAvgRating: string;
    tonightSmokes: number;
  };
}

export default function FridayEvePage() {
  const [data, setData] = useState<FridayEveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tonight" | "leaders">("tonight");
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Live countdown ticker
    const interval = setInterval(() => {
      const now = new Date();
      const fridayFivePM = new Date();
      const dayOfWeek = now.getDay();
      
      if (dayOfWeek === 4) {
        fridayFivePM.setDate(fridayFivePM.getDate() + 1);
      } else if (dayOfWeek === 5 && now.getHours() < 17) {
        // Already Friday, counting down to 5 PM
      } else {
        // Weekend or past Friday 5 PM
        setCountdown({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      fridayFivePM.setHours(17, 0, 0, 0);
      
      const diff = fridayFivePM.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      setCountdown({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/friday-eve");
      if (res.ok) {
        const result: FridayEveData = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching Friday Eve data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const getExcitement = () => {
    const total = countdown.hours + countdown.minutes / 60;
    if (total <= 1) return "🎉 ALMOST THERE!";
    if (total <= 6) return "🔥 So close!";
    if (total <= 12) return "⚡ Getting there!";
    return "🌙 The countdown begins...";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-orange-900 flex items-center justify-center">
        <div className="animate-pulse text-pink-300 text-xl">Loading Friday Eve...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-orange-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-purple-900/80 backdrop-blur-md border-b border-pink-500/30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="text-pink-300 hover:text-pink-100">
            <FiArrowLeft size={24} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            <h1 className="text-xl font-bold text-white">Friday Eve</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Weekend Countdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-pink-600/40 to-orange-600/40 rounded-2xl p-6 border border-pink-400/30"
        >
          <div className="text-center">
            <p className="text-pink-200 text-sm mb-2">{getExcitement()}</p>
            <div className="flex justify-center gap-4 mb-3">
              <div className="bg-purple-900/60 rounded-xl px-4 py-3">
                <div className="text-4xl font-bold text-white">{countdown.hours}</div>
                <div className="text-xs text-pink-300">hours</div>
              </div>
              <div className="text-4xl font-bold text-pink-300 self-center">:</div>
              <div className="bg-purple-900/60 rounded-xl px-4 py-3">
                <div className="text-4xl font-bold text-white">{countdown.minutes}</div>
                <div className="text-xs text-pink-300">min</div>
              </div>
              <div className="text-4xl font-bold text-pink-300 self-center">:</div>
              <div className="bg-purple-900/60 rounded-xl px-4 py-3">
                <div className="text-4xl font-bold text-white">{countdown.seconds}</div>
                <div className="text-xs text-pink-300">sec</div>
              </div>
            </div>
            <p className="text-white font-medium">until Weekend! 🎊</p>
            <p className="text-pink-200/60 text-sm mt-1">Friday 5 PM kickoff</p>
          </div>
        </motion.div>

        {/* Your Friday Eve Stats */}
        {data?.userStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-purple-800/40 rounded-xl p-4 border border-purple-400/20"
          >
            <h3 className="text-pink-300 font-medium mb-3 flex items-center gap-2">
              <FiStar className="text-yellow-400" /> Your Thursday Vibes
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{data.userStats.tonightSmokes}</div>
                <div className="text-xs text-pink-200/60">Tonight</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{data.userStats.thursdaySmokes}</div>
                <div className="text-xs text-pink-200/60">All Thursdays</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{data.userStats.thursdayAvgRating}⭐</div>
                <div className="text-xs text-pink-200/60">Avg Rating</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tonight's Stats Banner */}
        {data?.tonightStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-r from-orange-500/30 to-pink-500/30 rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiTrendingUp className="text-orange-300" size={20} />
                <span className="text-pink-100">Tonight&apos;s vibe:</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-white font-medium">{data.tonightStats.count} smokes</span>
                <span className="text-pink-200">{data.tonightStats.uniqueSmokers} smokers</span>
                {data.tonightStats.topBrand && (
                  <span className="text-orange-300">🔥 {data.tonightStats.topBrand}</span>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("tonight")}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
              activeTab === "tonight"
                ? "bg-pink-500/40 text-white border border-pink-400/50"
                : "bg-purple-800/30 text-pink-200/60 hover:text-pink-100"
            }`}
          >
            🌙 Tonight&apos;s Crew
          </button>
          <button
            onClick={() => setActiveTab("leaders")}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
              activeTab === "leaders"
                ? "bg-orange-500/40 text-white border border-orange-400/50"
                : "bg-purple-800/30 text-pink-200/60 hover:text-pink-100"
            }`}
          >
            🏆 Thursday Kings
          </button>
        </div>

        {/* Tonight's Smokers Tab */}
        {activeTab === "tonight" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {data?.tonightSmokers && data.tonightSmokers.length > 0 ? (
              data.tonightSmokers.map((smoker, idx) => (
                <motion.div
                  key={smoker.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-purple-800/40 rounded-xl p-4 border border-purple-400/20"
                >
                  <div className="flex items-start gap-3">
                    {smoker.image_url && (
                      <img
                        src={smoker.image_url}
                        alt={smoker.brand}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/user/${smoker.username}`}
                          className="font-medium text-pink-200 hover:text-pink-100"
                        >
                          @{smoker.username}
                        </Link>
                        <span className="text-purple-300/60 text-sm">
                          {formatTime(smoker.created_at)}
                        </span>
                      </div>
                      <p className="text-white font-medium truncate">
                        {smoker.brand}
                        {smoker.product && <span className="text-pink-200/60"> · {smoker.product}</span>}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {smoker.rating && (
                          <span className="text-yellow-400 text-sm">{smoker.rating}⭐</span>
                        )}
                        {smoker.drink_pairing && (
                          <span className="text-orange-300 text-sm">🥃 {smoker.drink_pairing}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-pink-200/60">
                <FiMusic size={32} className="mx-auto mb-3 opacity-50" />
                <p>No Friday Eve smokers yet!</p>
                <p className="text-sm mt-1">Be the first to celebrate 🎉</p>
                <Link
                  href="/checkin"
                  className="inline-block mt-4 px-6 py-2 bg-pink-500/40 text-white rounded-lg hover:bg-pink-500/60 transition-all"
                >
                  Log a Smoke
                </Link>
              </div>
            )}
          </motion.div>
        )}

        {/* Thursday Leaders Tab */}
        {activeTab === "leaders" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {data?.leaders && data.leaders.length > 0 ? (
              data.leaders.map((leader, idx) => (
                <motion.div
                  key={leader.username}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-purple-800/40 rounded-xl p-4 border border-purple-400/20 flex items-center gap-4"
                >
                  <div className="text-2xl font-bold text-pink-300/60">
                    {idx === 0 ? "👑" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                  </div>
                  <div className="flex-1">
                    <Link
                      href={`/user/${leader.username}`}
                      className="font-medium text-white hover:text-pink-200"
                    >
                      @{leader.username}
                    </Link>
                    <p className="text-sm text-pink-200/60">
                      {leader.count} Thursday smokes · {leader.avgRating?.toFixed(1) || "-"}⭐ avg
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-pink-200/60">
                <FiAward size={32} className="mx-auto mb-3 opacity-50" />
                <p>No Thursday data yet!</p>
                <p className="text-sm mt-1">Start logging to claim the throne</p>
              </div>
            )}
          </motion.div>
        )}

        {/* All-time Thursday Stats */}
        {data?.allTimeThursday && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-purple-900/60 to-pink-900/60 rounded-xl p-5 border border-purple-400/20"
          >
            <h3 className="text-pink-300 font-medium mb-3 flex items-center gap-2">
              <FiClock /> All-Time Thursday Stats
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-white">{data.allTimeThursday.totalSmokes}</div>
                <div className="text-xs text-pink-200/60">Total Smokes</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{data.allTimeThursday.uniqueSmokers}</div>
                <div className="text-xs text-pink-200/60">Smokers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{data.allTimeThursday.avgRating}⭐</div>
                <div className="text-xs text-pink-200/60">Avg Rating</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Links */}
        <div className="flex gap-3 text-sm">
          <Link
            href="/nightcap"
            className="flex-1 text-center py-3 bg-indigo-800/40 text-indigo-200 rounded-xl hover:bg-indigo-800/60 transition-all"
          >
            🌙 Nightcap Club
          </Link>
          <Link
            href="/thursday-hub"
            className="flex-1 text-center py-3 bg-purple-800/40 text-purple-200 rounded-xl hover:bg-purple-800/60 transition-all"
          >
            🍻 Thursday Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
