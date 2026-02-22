"use client";

export const runtime = "edge";

import { motion } from "framer-motion";
import { useState, useEffect, use } from "react";
import { FiArrowLeft, FiUserPlus, FiUserCheck, FiUsers } from "react-icons/fi";
import Link from "next/link";

interface FollowingUser {
  username: string;
  bio: string | null;
  checkin_count: number;
  is_following: boolean;
}

interface FollowingResponse {
  username: string;
  following: FollowingUser[];
  count: number;
}

export default function FollowingPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadFollowing() {
      try {
        const res = await fetch(`/api/users/${username}/following`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("User not found");
          } else {
            setError("Failed to load following");
          }
          return;
        }
        const data: FollowingResponse = await res.json();
        setFollowing(data.following);
        
        // Initialize following states
        const states: Record<string, boolean> = {};
        data.following.forEach((f) => {
          states[f.username] = f.is_following;
        });
        setFollowingStates(states);
      } catch (err) {
        console.error("Load error:", err);
        setError("Failed to load following");
      } finally {
        setLoading(false);
      }
    }

    loadFollowing();
  }, [username]);

  const handleFollow = async (targetUsername: string) => {
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: targetUsername }),
      });
      if (res.ok) {
        const data = (await res.json()) as { following: boolean };
        setFollowingStates((prev) => ({
          ...prev,
          [targetUsername]: data.following,
        }));
      }
    } catch (err) {
      console.error("Follow error:", err);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full"
        />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-4xl">😕</p>
        <p className="text-gray-400">{error}</p>
        <Link href="/discover" className="text-amber-500 hover:underline">
          ← Back to Discover
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href={`/user/${username}`}
            className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-all"
          >
            <FiArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-semibold">Following</h1>
            <p className="text-xs text-gray-400">@{username}</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {following.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <FiUsers className="mx-auto text-gray-500 mb-3" size={48} />
            <p className="text-gray-400">Not following anyone yet</p>
            <p className="text-sm text-gray-500 mt-1">
              When @{username} follows people, they'll appear here
            </p>
            <Link
              href="/discover"
              className="inline-block mt-4 px-4 py-2 rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400 transition-all"
            >
              Discover People
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {following.map((user, index) => (
              <motion.div
                key={user.username}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center justify-between p-4 glass rounded-xl"
              >
                <Link
                  href={`/user/${user.username}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-white">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-amber-500 hover:underline truncate">
                      @{user.username}
                    </p>
                    {user.bio && (
                      <p className="text-sm text-gray-400 truncate">{user.bio}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {user.checkin_count} {user.checkin_count === 1 ? "smoke" : "smokes"}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => handleFollow(user.username)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all flex-shrink-0 ${
                    followingStates[user.username]
                      ? "bg-amber-500/20 text-amber-400 hover:bg-red-500/20 hover:text-red-400"
                      : "bg-amber-500 text-black hover:bg-amber-400"
                  }`}
                >
                  {followingStates[user.username] ? (
                    <>
                      <FiUserCheck size={16} />
                      <span className="hidden sm:inline">Following</span>
                    </>
                  ) : (
                    <>
                      <FiUserPlus size={16} />
                      <span className="hidden sm:inline">Follow</span>
                    </>
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
