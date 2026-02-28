"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FiTrophy, FiSun, FiMoon, FiLayers, FiStar, FiClock, FiUsers, FiArrowLeft, FiAward, FiZap } from "react-icons/fi";

interface WeekendUser {
  username: string;
  value: number;
  label: string;
}

interface WeekendScoreboard {
  weekendStart: number;
  weekendEnd: number;
  isWeekend: boolean;
  hoursRemaining: number;
  mostCheckins: WeekendUser[];
  earlyBirds: WeekendUser[];
  nightOwls: WeekendUser[];
  varietyKings: WeekendUser[];
  ratingChamps: WeekendUser[];
  totalWeekendCheckins: number;
  totalWeekendSmokers: number;
  avgWeekendRating: number;
  topWeekendBrand: string | null;
  yourStats?: {
    checkins: number;
    rank: number;
    earliestSmoke: string | null;
    latestSmoke: string | null;
    uniqueBrands: number;
  };
}

type LeaderboardType = "volume" | "earlybird" | "nightowl" | "variety" | "quality";

const MEDALS = ["🥇", "🥈", "🥉"];

function LeaderboardCard({ 
  title, 
  icon, 
  users, 
  emptyText,
  accentColor 
}: { 
  title: string; 
  icon: React.ReactNode; 
  users: WeekendUser[]; 
  emptyText: string;
  accentColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/60 rounded-2xl p-5 border border-gray-800"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className={accentColor}>{icon}</span>
        <h3 className="font-bold text-white">{title}</h3>
      </div>
      
      {users.length === 0 ? (
        <p className="text-gray-500 text-sm italic">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {users.slice(0, 5).map((user, idx) => (
            <Link 
              key={user.username}
              href={`/user/${user.username}`}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 text-center">
                  {idx < 3 ? MEDALS[idx] : <span className="text-gray-500 text-sm">{idx + 1}</span>}
                </span>
                <span className="text-white font-medium">{user.username}</span>
              </div>
              <span className={`text-sm ${accentColor}`}>{user.label}</span>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function WeekendScoreboardPage() {
  const [data, setData] = useState<WeekendScoreboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LeaderboardType>("volume");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("puffed_user");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setUserId(user.id);
      } catch {}
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const url = userId 
          ? `/api/weekend-scoreboard?userId=${userId}`
          : "/api/weekend-scoreboard";
        const res = await fetch(url);
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Failed to load weekend scoreboard:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-950 via-gray-950 to-orange-950 flex items-center justify-center">
        <div className="animate-pulse text-amber-400">Loading weekend scoreboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-950 via-gray-950 to-orange-950 flex items-center justify-center">
        <div className="text-red-400">Failed to load scoreboard</div>
      </div>
    );
  }

  const weekendStartDate = new Date(data.weekendStart * 1000);
  const weekendEndDate = new Date(data.weekendEnd * 1000);
  const dateRange = `${weekendStartDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} - ${weekendEndDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;

  const tabs = [
    { id: "volume" as const, label: "Most Smokes", icon: <FiTrophy /> },
    { id: "earlybird" as const, label: "Early Birds", icon: <FiSun /> },
    { id: "nightowl" as const, label: "Night Owls", icon: <FiMoon /> },
    { id: "variety" as const, label: "Variety", icon: <FiLayers /> },
    { id: "quality" as const, label: "Quality", icon: <FiStar /> },
  ];

  const getActiveLeaderboard = () => {
    switch (activeTab) {
      case "volume":
        return { users: data.mostCheckins, title: "Weekend Warriors 🔥", emptyText: "No smokes logged yet!", accent: "text-amber-400" };
      case "earlybird":
        return { users: data.earlyBirds, title: "Early Bird Champions ☀️", emptyText: "No early birds yet!", accent: "text-yellow-400" };
      case "nightowl":
        return { users: data.nightOwls, title: "Night Owl Legends 🦉", emptyText: "No night owls yet!", accent: "text-purple-400" };
      case "variety":
        return { users: data.varietyKings, title: "Variety Kings 👑", emptyText: "No variety data yet!", accent: "text-emerald-400" };
      case "quality":
        return { users: data.ratingChamps, title: "Quality Connoisseurs ⭐", emptyText: "Not enough ratings yet!", accent: "text-blue-400" };
    }
  };

  const activeLeaderboard = getActiveLeaderboard();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-950 via-gray-950 to-orange-950">
      {/* Animated weekend vibes background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-amber-500/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4">
            <FiArrowLeft /> Back to Dashboard
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold text-white mb-2">
              🏆 Weekend Scoreboard
            </h1>
            <p className="text-amber-400">{dateRange}</p>
            
            {data.isWeekend ? (
              <div className="mt-3 inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full">
                <FiZap className="animate-pulse" />
                <span>Live! {data.hoursRemaining}h remaining</span>
              </div>
            ) : (
              <div className="mt-3 inline-flex items-center gap-2 bg-gray-700/50 text-gray-400 px-4 py-2 rounded-full">
                <FiClock />
                <span>Weekend starts Friday 5pm</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Weekend Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-3 mb-6"
        >
          <div className="bg-gray-900/60 rounded-xl p-3 text-center border border-gray-800">
            <div className="text-2xl font-bold text-amber-400">{data.totalWeekendCheckins}</div>
            <div className="text-xs text-gray-500">Smokes</div>
          </div>
          <div className="bg-gray-900/60 rounded-xl p-3 text-center border border-gray-800">
            <div className="text-2xl font-bold text-emerald-400">{data.totalWeekendSmokers}</div>
            <div className="text-xs text-gray-500">Smokers</div>
          </div>
          <div className="bg-gray-900/60 rounded-xl p-3 text-center border border-gray-800">
            <div className="text-2xl font-bold text-yellow-400">{data.avgWeekendRating ? data.avgWeekendRating.toFixed(1) : '-'}</div>
            <div className="text-xs text-gray-500">Avg Rating</div>
          </div>
          <div className="bg-gray-900/60 rounded-xl p-3 text-center border border-gray-800">
            <div className="text-lg font-bold text-purple-400 truncate">{data.topWeekendBrand || '-'}</div>
            <div className="text-xs text-gray-500">Top Brand</div>
          </div>
        </motion.div>

        {/* Your Stats (if logged in) */}
        {data.yourStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 rounded-2xl p-5 border border-amber-700/30 mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <FiAward className="text-amber-400" />
              <h3 className="font-bold text-white">Your Weekend</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{data.yourStats.checkins}</div>
                <div className="text-xs text-gray-400">Smokes</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-amber-400">#{data.yourStats.rank}</div>
                <div className="text-xs text-gray-400">Rank</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-emerald-400">{data.yourStats.uniqueBrands}</div>
                <div className="text-xs text-gray-400">Brands</div>
              </div>
            </div>
            {(data.yourStats.earliestSmoke || data.yourStats.latestSmoke) && (
              <div className="mt-3 pt-3 border-t border-gray-700/50 flex justify-around text-sm">
                {data.yourStats.earliestSmoke && (
                  <div className="text-center">
                    <FiSun className="inline text-yellow-400 mr-1" />
                    <span className="text-gray-400">First: {data.yourStats.earliestSmoke}</span>
                  </div>
                )}
                {data.yourStats.latestSmoke && (
                  <div className="text-center">
                    <FiMoon className="inline text-purple-400 mr-1" />
                    <span className="text-gray-400">Last: {data.yourStats.latestSmoke}</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-amber-500 text-black font-semibold"
                  : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50"
              }`}
            >
              {tab.icon}
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Active Leaderboard */}
        <LeaderboardCard
          title={activeLeaderboard.title}
          icon={tabs.find(t => t.id === activeTab)?.icon}
          users={activeLeaderboard.users}
          emptyText={activeLeaderboard.emptyText}
          accentColor={activeLeaderboard.accent}
        />

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center space-y-3"
        >
          <p className="text-gray-500 text-sm">More weekend fun</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/saturday-cartoons" className="px-4 py-2 bg-gray-800/50 rounded-full text-sm text-gray-300 hover:bg-gray-700/50 transition-colors">
              📺 Saturday Cartoons
            </Link>
            <Link href="/saturday-night" className="px-4 py-2 bg-gray-800/50 rounded-full text-sm text-gray-300 hover:bg-gray-700/50 transition-colors">
              🌙 Saturday Night
            </Link>
            <Link href="/weekend" className="px-4 py-2 bg-gray-800/50 rounded-full text-sm text-gray-300 hover:bg-gray-700/50 transition-colors">
              🎉 Weekend Hub
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
