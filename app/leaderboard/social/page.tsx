"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { FiArrowLeft, FiHeart, FiMessageCircle, FiZap, FiAward, FiTrendingUp } from "react-icons/fi";
import Link from "next/link";

interface SocialMVP {
  username: string;
  likesGiven: number;
  commentsGiven: number;
  reactionsGiven: number;
  totalEngagement: number;
  rank: number;
}

interface Champion {
  username: string;
  count: number;
}

interface SocialMVPsResponse {
  mvps: SocialMVP[];
  categories: {
    heartChampion: Champion | null;
    chatChampion: Champion | null;
    hypeChampion: Champion | null;
  };
  platformStats: {
    totalLikes: number;
    totalComments: number;
    totalReactions: number;
    avgEngagementPerUser: number;
  };
}

type TimeFrame = "allTime" | "thisMonth" | "thisWeek";

const RANK_EMOJIS = ["🥇", "🥈", "🥉"];
const RANK_COLORS = [
  "from-yellow-500 to-amber-600",
  "from-gray-300 to-gray-400",
  "from-amber-600 to-orange-700",
];

function ChampionCard({ 
  title, 
  emoji, 
  champion, 
  color,
  statLabel 
}: { 
  title: string; 
  emoji: string; 
  champion: Champion | null;
  color: string;
  statLabel: string;
}) {
  if (!champion) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass rounded-xl p-4 border ${color}`}
    >
      <div className="text-center">
        <div className="text-3xl mb-2">{emoji}</div>
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{title}</div>
        <Link 
          href={`/user/${champion.username}`}
          className="font-semibold text-white hover:text-pink-400 transition-colors"
        >
          @{champion.username}
        </Link>
        <div className="text-sm text-gray-400 mt-1">
          {champion.count} {statLabel}
        </div>
      </div>
    </motion.div>
  );
}

function MVPCard({ mvp, index }: { mvp: SocialMVP; index: number }) {
  const isTopThree = index < 3;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`glass rounded-xl p-4 ${isTopThree ? "border border-pink-500/30" : ""}`}
    >
      <div className="flex items-center gap-4">
        {/* Rank */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${
            isTopThree
              ? `bg-gradient-to-br ${RANK_COLORS[index]} text-white`
              : "bg-white/5 text-gray-400"
          }`}
        >
          {isTopThree ? RANK_EMOJIS[index] : mvp.rank}
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/user/${mvp.username}`}
            className="font-semibold hover:text-pink-400 transition-colors truncate block"
          >
            @{mvp.username}
          </Link>
          <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
            <span className="flex items-center gap-1 text-pink-400">
              <FiHeart size={12} fill="currentColor" /> {mvp.likesGiven}
            </span>
            <span className="flex items-center gap-1 text-cyan-400">
              <FiMessageCircle size={12} /> {mvp.commentsGiven}
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <FiZap size={12} /> {mvp.reactionsGiven}
            </span>
          </div>
        </div>

        {/* Total */}
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{mvp.totalEngagement}</div>
          <div className="text-xs text-gray-500">total</div>
        </div>
      </div>
    </motion.div>
  );
}

export default function SocialMVPsPage() {
  const [data, setData] = useState<SocialMVPsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<TimeFrame>("allTime");

  useEffect(() => {
    loadData();
  }, [timeframe]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/social-mvps?timeframe=${timeframe}`);
      const json: SocialMVPsResponse = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const timeframes: { id: TimeFrame; label: string }[] = [
    { id: "allTime", label: "All Time" },
    { id: "thisMonth", label: "This Month" },
    { id: "thisWeek", label: "This Week" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/leaderboard"
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
              >
                <FiArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="font-bold text-lg flex items-center gap-2">
                  <span className="text-2xl">💗</span>
                  Social MVPs
                </h1>
                <p className="text-xs text-gray-400">Who spreads the most love?</p>
              </div>
            </div>
            <Link
              href="/leaderboard"
              className="text-xs text-gray-400 hover:text-pink-400 transition-colors"
            >
              ← User Leaderboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Time Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {timeframes.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                timeframe === tf.id
                  ? "bg-pink-500 text-white"
                  : "glass text-gray-400 hover:text-white"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full"
            />
          </div>
        ) : data ? (
          <>
            {/* Platform Stats */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-4 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20"
            >
              <div className="grid grid-cols-4 gap-3 text-center">
                <div>
                  <div className="text-xl font-bold text-pink-400">
                    {data.platformStats.totalLikes}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                    <FiHeart size={10} /> Likes
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold text-cyan-400">
                    {data.platformStats.totalComments}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                    <FiMessageCircle size={10} /> Comments
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold text-amber-400">
                    {data.platformStats.totalReactions}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                    <FiZap size={10} /> Reactions
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white">
                    {data.platformStats.avgEngagementPerUser}
                  </div>
                  <div className="text-xs text-gray-400">Avg/User</div>
                </div>
              </div>
            </motion.div>

            {/* Category Champions */}
            {(data.categories.heartChampion || data.categories.chatChampion || data.categories.hypeChampion) && (
              <div>
                <h2 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <FiAward /> Category Champions
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  <ChampionCard
                    title="Heart Champion"
                    emoji="💗"
                    champion={data.categories.heartChampion}
                    color="border-pink-500/30"
                    statLabel="likes given"
                  />
                  <ChampionCard
                    title="Chat Champion"
                    emoji="💬"
                    champion={data.categories.chatChampion}
                    color="border-cyan-500/30"
                    statLabel="comments"
                  />
                  <ChampionCard
                    title="Hype Champion"
                    emoji="🔥"
                    champion={data.categories.hypeChampion}
                    color="border-amber-500/30"
                    statLabel="reactions"
                  />
                </div>
              </div>
            )}

            {/* MVP List */}
            <div>
              <h2 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                <FiTrendingUp /> Most Engaged Users
              </h2>
              <div className="space-y-3">
                <AnimatePresence>
                  {data.mvps.length > 0 ? (
                    data.mvps.map((mvp, i) => <MVPCard key={mvp.username} mvp={mvp} index={i} />)
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12 text-gray-400"
                    >
                      <p className="text-4xl mb-3">💗</p>
                      <p>No engagement yet</p>
                      <p className="text-sm mt-2">Be the first to spread some love!</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-xl p-4 text-center"
            >
              <p className="text-gray-400 text-sm mb-3">
                Climb the leaderboard by engaging with the community!
              </p>
              <div className="flex justify-center gap-3">
                <Link
                  href="/discover"
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors flex items-center gap-2"
                >
                  <FiHeart size={16} />
                  Start Engaging
                </Link>
              </div>
            </motion.div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-400">Failed to load data</div>
        )}
      </main>
    </div>
  );
}
