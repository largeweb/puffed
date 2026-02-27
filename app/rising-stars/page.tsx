"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { FiHome, FiStar, FiHeart, FiMessageCircle, FiUsers, FiTrendingUp, FiUserPlus, FiCheck, FiAward } from "react-icons/fi";
import Link from "next/link";

interface RisingStar {
  user_id: string;
  username: string;
  joined_days_ago: number;
  checkins: number;
  likes_received: number;
  comments_received: number;
  followers: number;
  engagement_score: number;
  isFollowing: boolean;
  isMe: boolean;
  latest_checkin?: {
    brand: string;
    rating: number;
    photo_url?: string;
  };
}

interface Stats {
  new_users_week: number;
  new_users_month: number;
  new_checkins_week: number;
}

export default function RisingStarsPage() {
  const [risingStars, setRisingStars] = useState<RisingStar[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [followingInProgress, setFollowingInProgress] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/rising-stars")
      .then((res) => res.json())
      .then((data) => {
        setRisingStars(data.risingStars || []);
        setStats(data.stats || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleFollow = async (userId: string) => {
    setFollowingInProgress(prev => new Set(prev).add(userId));
    
    try {
      const star = risingStars.find(s => s.user_id === userId);
      const method = star?.isFollowing ? "DELETE" : "POST";
      
      await fetch(`/api/follow/${userId}`, { method });
      
      setRisingStars(prev => prev.map(s => 
        s.user_id === userId 
          ? { ...s, isFollowing: !s.isFollowing, followers: s.followers + (s.isFollowing ? -1 : 1) }
          : s
      ));
    } catch (error) {
      console.error("Follow error:", error);
    } finally {
      setFollowingInProgress(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return { emoji: "🥇", color: "text-yellow-400" };
    if (index === 1) return { emoji: "🥈", color: "text-gray-300" };
    if (index === 2) return { emoji: "🥉", color: "text-amber-600" };
    return { emoji: "⭐", color: "text-purple-400" };
  };

  const getJoinedLabel = (days: number) => {
    if (days === 0) return "Joined today!";
    if (days === 1) return "Joined yesterday";
    if (days < 7) return `Joined ${days} days ago`;
    if (days < 14) return "Joined last week";
    return `Joined ${Math.floor(days / 7)} weeks ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-fuchsia-950 to-pink-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-purple-900/60 border-b border-purple-500/30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="p-2 hover:bg-purple-800/50 rounded-full transition-colors">
            <FiHome className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <FiStar className="w-5 h-5 text-yellow-400" /> Rising Stars
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">🌟</div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Rising Stars
          </h2>
          <p className="text-purple-300 mt-2">
            New members making waves in the community
          </p>
        </motion.div>

        {/* Stats Banner */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-purple-800/40 to-pink-800/40 rounded-xl p-4 border border-purple-500/30"
          >
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-yellow-400">{stats.new_users_week}</div>
                <div className="text-xs text-purple-300">New This Week</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-pink-400">{stats.new_users_month}</div>
                <div className="text-xs text-purple-300">This Month</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400">{stats.new_checkins_week}</div>
                <div className="text-xs text-purple-300">Week's Smokes</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl mb-4"
            >
              🌟
            </motion.div>
            <p className="text-purple-400">Discovering rising stars...</p>
          </div>
        )}

        {/* Rising Stars List */}
        {!loading && risingStars.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-2">
              <FiTrendingUp className="w-4 h-4" /> Top New Members
            </h3>
            
            <AnimatePresence>
              {risingStars.map((star, index) => {
                const rank = getRankBadge(index);
                return (
                  <motion.div
                    key={star.user_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-purple-900/40 rounded-xl p-4 border border-purple-500/30 hover:border-pink-500/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Rank Badge */}
                      <div className={`text-3xl ${rank.color}`}>
                        {rank.emoji}
                      </div>
                      
                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/user/${star.username}`}
                            className="font-bold text-white hover:text-pink-400 transition-colors truncate"
                          >
                            @{star.username}
                          </Link>
                          {star.isMe && (
                            <span className="text-xs bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded-full">
                              You!
                            </span>
                          )}
                        </div>
                        
                        <div className="text-sm text-purple-400 mt-1">
                          {getJoinedLabel(star.joined_days_ago)}
                        </div>
                        
                        {/* Stats Row */}
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1 text-purple-300">
                            <span className="text-lg">🚬</span> {star.checkins}
                          </span>
                          <span className="flex items-center gap-1 text-pink-400">
                            <FiHeart className="w-4 h-4" /> {star.likes_received}
                          </span>
                          <span className="flex items-center gap-1 text-purple-300">
                            <FiMessageCircle className="w-4 h-4" /> {star.comments_received}
                          </span>
                          <span className="flex items-center gap-1 text-purple-300">
                            <FiUsers className="w-4 h-4" /> {star.followers}
                          </span>
                        </div>
                        
                        {/* Latest Checkin */}
                        {star.latest_checkin && (
                          <div className="mt-2 text-sm bg-purple-800/30 rounded-lg px-3 py-2">
                            <span className="text-purple-400">Latest:</span>{" "}
                            <span className="text-white">{star.latest_checkin.brand}</span>
                            <span className="text-yellow-400 ml-2">
                              {"⭐".repeat(Math.min(star.latest_checkin.rating, 5))}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Follow Button */}
                      {!star.isMe && (
                        <button
                          onClick={() => handleFollow(star.user_id)}
                          disabled={followingInProgress.has(star.user_id)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            star.isFollowing
                              ? "bg-purple-700/50 text-purple-300 hover:bg-red-600/50 hover:text-red-300"
                              : "bg-pink-600 text-white hover:bg-pink-500"
                          }`}
                        >
                          {followingInProgress.has(star.user_id) ? (
                            <span className="animate-pulse">...</span>
                          ) : star.isFollowing ? (
                            <FiCheck className="w-4 h-4" />
                          ) : (
                            <FiUserPlus className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                    
                    {/* Engagement Score Bar */}
                    <div className="mt-3 pt-3 border-t border-purple-500/20">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-purple-400 flex items-center gap-1">
                          <FiAward className="w-3 h-3" /> Engagement Score
                        </span>
                        <span className="text-pink-400 font-bold">{star.engagement_score}</span>
                      </div>
                      <div className="h-2 bg-purple-800/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((star.engagement_score / 200) * 100, 100)}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                          className="h-full bg-gradient-to-r from-pink-500 to-yellow-500 rounded-full"
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Empty State */}
        {!loading && risingStars.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-5xl mb-4">🌱</div>
            <p className="text-purple-300 mb-2">No rising stars yet!</p>
            <p className="text-purple-400 text-sm">
              Be the first to shine by logging some smokes
            </p>
            <Link
              href="/checkin"
              className="inline-block mt-4 px-6 py-3 bg-pink-600 rounded-xl font-bold hover:bg-pink-500 transition-colors"
            >
              Log Your First Smoke
            </Link>
          </motion.div>
        )}

        {/* Tips Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-xl p-4 border border-yellow-500/30"
        >
          <h3 className="font-bold text-yellow-400 flex items-center gap-2 mb-2">
            <FiStar className="w-4 h-4" /> How to Rise
          </h3>
          <ul className="text-sm text-yellow-200/80 space-y-1">
            <li>• Log smokes regularly to build your streak 🔥</li>
            <li>• Leave thoughtful reviews for more engagement 💬</li>
            <li>• React and comment on others' check-ins ❤️</li>
            <li>• Upload photos to stand out 📸</li>
          </ul>
        </motion.div>

        {/* Footer Links */}
        <div className="text-center space-y-2">
          <Link
            href="/people"
            className="block text-purple-400 hover:text-pink-400 transition-colors"
          >
            👥 Discover More People
          </Link>
          <Link
            href="/leaderboard"
            className="block text-purple-400 hover:text-pink-400 transition-colors"
          >
            🏆 View Full Leaderboard
          </Link>
        </div>
      </main>
    </div>
  );
}
