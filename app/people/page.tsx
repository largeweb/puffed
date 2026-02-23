"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiUsers, FiArrowLeft, FiUserPlus, FiUserCheck, FiStar, FiPercent, FiActivity, FiSearch, FiHeart } from "react-icons/fi";
import Link from "next/link";

interface UserSuggestion {
  id: string;
  username: string;
  bio: string | null;
  checkin_count: number;
  follower_count: number;
  following_count: number;
  taste_match?: number;
  common_brands?: string[];
  recent_brand?: string;
  is_following: boolean;
  reason: string;
}

interface DiscoverResponse {
  suggestions: UserSuggestion[];
  following_count: number;
  total_users: number;
}

export default function DiscoverPeople() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [followingCount, setFollowingCount] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [filter, setFilter] = useState<"all" | "not-following">("not-following");
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
  const [followingLoading, setFollowingLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const res = await fetch("/api/discover-people");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const data: DiscoverResponse = await res.json();
      setSuggestions(data.suggestions || []);
      setFollowingCount(data.following_count || 0);
      setTotalUsers(data.total_users || 0);
      
      // Initialize following states
      const states: Record<string, boolean> = {};
      for (const user of data.suggestions || []) {
        states[user.id] = user.is_following;
      }
      setFollowingStates(states);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async (username: string, userId: string) => {
    setFollowingLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json() as { following: boolean };
      setFollowingStates(prev => ({ ...prev, [userId]: data.following }));
      setFollowingCount(prev => data.following ? prev + 1 : prev - 1);
    } catch (error) {
      console.error("Follow error:", error);
    } finally {
      setFollowingLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const filteredSuggestions = filter === "not-following"
    ? suggestions.filter(s => !followingStates[s.id])
    : suggestions;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-white">
              <FiArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FiUsers className="text-pink-500" />
              Discover People
            </h1>
          </div>
          <Link href="/search" className="text-gray-400 hover:text-white">
            <FiSearch className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-2xl p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">You're following</p>
              <p className="text-2xl font-bold text-white">{followingCount} people</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">{totalUsers} users on Puffed</p>
              <p className="text-xs text-pink-400">Find your smoke buddies! 💨</p>
            </div>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("not-following")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === "not-following"
                ? "bg-pink-500 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            <FiUserPlus className="inline mr-1" />
            Discover New
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === "all"
                ? "bg-pink-500 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            <FiUsers className="inline mr-1" />
            All Users
          </button>
        </div>

        {/* User List */}
        <div className="space-y-3">
          {filteredSuggestions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <FiUserCheck className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-white font-medium">You're following everyone!</p>
              <p className="text-sm text-gray-400 mt-1">Check back as more smokers join</p>
            </motion.div>
          ) : (
            filteredSuggestions.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/8 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* User Info */}
                  <Link href={`/user/${user.username}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white truncate">@{user.username}</p>
                        <p className="text-xs text-pink-400">{user.reason}</p>
                      </div>
                    </div>

                    {/* Bio */}
                    {user.bio && (
                      <p className="text-sm text-gray-400 mt-2 line-clamp-2">{user.bio}</p>
                    )}

                    {/* Stats Row */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FiActivity className="w-3 h-3" />
                        {user.checkin_count} smokes
                      </span>
                      <span className="flex items-center gap-1">
                        <FiUsers className="w-3 h-3" />
                        {user.follower_count} followers
                      </span>
                      {user.taste_match !== undefined && user.taste_match > 0 && (
                        <span className="flex items-center gap-1 text-pink-400">
                          <FiHeart className="w-3 h-3" />
                          {user.taste_match}% match
                        </span>
                      )}
                    </div>

                    {/* Common Brands */}
                    {user.common_brands && user.common_brands.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {user.common_brands.map((brand, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full"
                          >
                            {brand}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Recent Brand */}
                    {!user.common_brands?.length && user.recent_brand && (
                      <p className="text-xs text-gray-500 mt-2">
                        Recently smoked: {user.recent_brand}
                      </p>
                    )}
                  </Link>

                  {/* Follow Button */}
                  <button
                    onClick={() => toggleFollow(user.username, user.id)}
                    disabled={followingLoading[user.id]}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      followingStates[user.id]
                        ? "bg-white/10 text-gray-400 hover:bg-red-500/20 hover:text-red-400"
                        : "bg-pink-500 text-white hover:bg-pink-600"
                    } disabled:opacity-50`}
                  >
                    {followingLoading[user.id] ? (
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                      />
                    ) : followingStates[user.id] ? (
                      <>
                        <FiUserCheck className="inline mr-1" />
                        Following
                      </>
                    ) : (
                      <>
                        <FiUserPlus className="inline mr-1" />
                        Follow
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Help Text */}
        <div className="text-center text-xs text-gray-600 pt-4">
          <p>💡 Following people shows their check-ins on your dashboard</p>
        </div>
      </main>
    </div>
  );
}
