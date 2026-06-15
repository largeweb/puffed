"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiUsers, FiUserPlus, FiCheck, FiStar, FiZap } from "react-icons/fi";
import Link from "next/link";

interface SuggestedUser {
  id: string;
  username: string;
  totalSmokes: number;
  commonBrands: number;
  tasteMatchScore: number;
  topBrand?: string;
}

interface SuggestedFollowsResponse {
  suggestions?: SuggestedUser[];
  error?: string;
}

interface FollowResponse {
  success?: boolean;
  following?: boolean;
  error?: string;
}

export default function SmokeBuddies() {
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followingInProgress, setFollowingInProgress] = useState<string | null>(null);

  useEffect(() => {
    async function loadSuggestions() {
      try {
        const res = await fetch("/api/suggested-follows");
        const data: SuggestedFollowsResponse = await res.json();
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadSuggestions();
  }, []);

  const handleFollow = async (userId: string) => {
    if (followingInProgress) return;
    setFollowingInProgress(userId);
    
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      
      if (res.ok) {
        const data: FollowResponse = await res.json();
        if (data.following) {
          setFollowingIds(prev => new Set([...prev, userId]));
        }
      }
    } catch {
      // ignore
    } finally {
      setFollowingInProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-2xl p-4 animate-pulse">
        <div className="h-24 bg-white/10 rounded-xl" />
      </div>
    );
  }

  // Filter out already followed users
  const availableSuggestions = suggestions.filter(s => !followingIds.has(s.id));

  if (availableSuggestions.length === 0) {
    return null;
  }

  const getMatchLabel = (score: number) => {
    if (score >= 70) return { label: "Great Match!", color: "text-green-400" };
    if (score >= 40) return { label: "Good Match", color: "text-amber-400" };
    return { label: "Discover", color: "text-blue-400" };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-2xl p-4 border border-purple-700/30"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-lg bg-purple-700/30">
          <FiUsers className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">Smoke Buddies</h3>
          <p className="text-white/60 text-xs">People with similar taste</p>
        </div>
      </div>

      {/* Suggestions */}
      <div className="space-y-2">
        {availableSuggestions.slice(0, 3).map((user, index) => {
          const match = getMatchLabel(user.tasteMatchScore);
          const isFollowing = followingIds.has(user.id);
          const isLoading = followingInProgress === user.id;

          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between bg-white/5 rounded-xl p-3"
            >
              <Link href={`/profile/${user.username}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  {/* Avatar placeholder */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm truncate">
                        @{user.username}
                      </span>
                      {user.tasteMatchScore >= 70 && (
                        <FiZap className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs">
                      <span className={match.color}>{match.label}</span>
                      {user.commonBrands > 0 && (
                        <span className="text-white/50">
                          • {user.commonBrands} shared brand{user.commonBrands !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    
                    {user.topBrand && (
                      <p className="text-white/40 text-xs truncate mt-0.5">
                        Loves: {user.topBrand}
                      </p>
                    )}
                  </div>
                </div>
              </Link>

              {/* Follow button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleFollow(user.id)}
                disabled={isFollowing || isLoading}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ml-2 ${
                  isFollowing
                    ? "bg-green-600/30 text-green-400"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isFollowing ? (
                  <>
                    <FiCheck className="w-4 h-4" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <FiUserPlus className="w-4 h-4" />
                    <span>Follow</span>
                  </>
                )}
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Find More CTA */}
      <Link href="/discover/people">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium transition-colors"
        >
          Find more people →
        </motion.button>
      </Link>
    </motion.div>
  );
}
