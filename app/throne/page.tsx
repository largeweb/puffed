"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FiArrowLeft, FiAward, FiRefreshCw } from "react-icons/fi";

interface Champion {
  username: string;
  value: number;
  label: string;
}

interface ThroneCategory {
  id: string;
  name: string;
  emoji: string;
  description: string;
  champion: Champion | null;
  runnerUp: Champion | null;
  yourRank: number | null;
  yourValue: number | null;
}

interface ThroneRoomData {
  categories: ThroneCategory[];
  stats: {
    totalCompetitors: number;
    yourCrowns: number;
    yourRunnerUps: number;
  };
  lastUpdated: number;
  error?: string;
}

function CategoryCard({ category, index }: { category: ThroneCategory; index: number }) {
  const hasChampion = category.champion !== null;
  
  // Different gradient colors for each category
  const gradients = [
    "from-amber-500/20 to-yellow-600/20 border-amber-500/30",     // Weekly King
    "from-purple-500/20 to-indigo-600/20 border-purple-500/30",   // Streak Master
    "from-yellow-400/20 to-orange-500/20 border-yellow-500/30",   // Five Star
    "from-pink-500/20 to-rose-600/20 border-pink-500/30",         // Social
    "from-indigo-500/20 to-violet-600/20 border-indigo-500/30",   // Night Owl
    "from-orange-400/20 to-amber-500/20 border-orange-500/30",    // Early Bird
    "from-cyan-500/20 to-teal-600/20 border-cyan-500/30",         // Explorer
    "from-emerald-500/20 to-green-600/20 border-emerald-500/30",  // Photographer
  ];

  const gradient = gradients[index % gradients.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} border p-5`}
    >
      {/* Category Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{category.emoji}</span>
        <div>
          <h3 className="font-bold text-lg">{category.name}</h3>
          <p className="text-sm text-gray-400">{category.description}</p>
        </div>
      </div>

      {/* Champion */}
      {hasChampion ? (
        <div className="space-y-3">
          {/* Winner */}
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <span className="text-lg">👑</span>
              </div>
              <div>
                <Link 
                  href={`/user/${category.champion!.username}`}
                  className="font-semibold hover:text-amber-400 transition-colors"
                >
                  @{category.champion!.username}
                </Link>
                <p className="text-xs text-gray-400">Current Champion</p>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-amber-400">{category.champion!.label}</div>
            </div>
          </div>

          {/* Runner Up */}
          {category.runnerUp && (
            <div className="flex items-center justify-between bg-white/5 rounded-xl p-2.5 opacity-75">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-600/50 flex items-center justify-center">
                  <span className="text-sm">🥈</span>
                </div>
                <div>
                  <Link 
                    href={`/user/${category.runnerUp.username}`}
                    className="text-sm font-medium hover:text-gray-300 transition-colors"
                  >
                    @{category.runnerUp.username}
                  </Link>
                </div>
              </div>
              <div className="text-sm text-gray-400">{category.runnerUp.label}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          <div className="text-4xl mb-2">🏆</div>
          <p>No champion yet</p>
          <p className="text-sm">Be the first!</p>
        </div>
      )}
    </motion.div>
  );
}

export default function ThroneRoomPage() {
  const [data, setData] = useState<ThroneRoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch("/api/throne-room");
      if (res.ok) {
        const json = await res.json() as ThroneRoomData;
        setData(json);
      }
    } catch (error) {
      console.error("Failed to load throne room:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen smoke-bg p-4 pt-8 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading throne room...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen smoke-bg p-4 pt-8 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <FiArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                🏰 Throne Room
              </h1>
              <p className="text-sm text-gray-400">
                Champions of the Smoke Kingdom
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Stats Banner */}
        {data && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-4 mb-6"
          >
            <div className="flex items-center justify-around text-center">
              <div>
                <div className="text-2xl font-bold text-amber-400">{data.stats.totalCompetitors}</div>
                <div className="text-xs text-gray-400">Competitors</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <div className="text-2xl font-bold text-yellow-400">{data.categories.length}</div>
                <div className="text-xs text-gray-400">Thrones</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <div className="text-2xl font-bold text-emerald-400">{data.stats.yourCrowns}</div>
                <div className="text-xs text-gray-400">Your Crowns</div>
              </div>
            </div>
            {data.stats.yourCrowns > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-3 text-center text-sm text-amber-400"
              >
                👑 You reign supreme in {data.stats.yourCrowns} {data.stats.yourCrowns === 1 ? "category" : "categories"}!
              </motion.div>
            )}
            {data.stats.yourRunnerUps > 0 && data.stats.yourCrowns === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-3 text-center text-sm text-gray-400"
              >
                🥈 You&apos;re runner-up in {data.stats.yourRunnerUps} {data.stats.yourRunnerUps === 1 ? "category" : "categories"} - keep pushing!
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Description */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-6 text-gray-400 text-sm"
        >
          Compete for crowns across different categories. Each throne awaits its champion! 👑
        </motion.div>

        {/* Categories Grid */}
        <div className="grid gap-4">
          {data?.categories.map((category, index) => (
            <CategoryCard key={category.id} category={category} index={index} />
          ))}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 text-sm text-gray-500"
        >
          <p>👑 Crowns update in real-time based on your activity</p>
          <p className="mt-1">Keep smoking to claim your throne!</p>
        </motion.div>
      </div>
    </div>
  );
}
