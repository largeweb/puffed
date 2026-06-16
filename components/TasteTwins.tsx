"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FiUsers, FiHeart, FiUserPlus, FiCheck } from "react-icons/fi";
import { getFlavorTag } from "@/lib/flavors";

interface TasteTwin {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  sharedFlavors: string[];
  matchScore: number;
  totalCheckins: number;
  isFollowing: boolean;
}

interface TasteTwinsData {
  twins: TasteTwin[];
  userTopFlavors: string[];
  message: string | null;
}

export default function TasteTwins() {
  const [data, setData] = useState<TasteTwinsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/taste-twins")
      .then((res) => res.json() as Promise<TasteTwinsData>)
      .then((d) => {
        setData(d);
        const following = new Set(d.twins.filter(t => t.isFollowing).map(t => t.userId));
        setFollowingIds(following);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleFollow = async (userId: string) => {
    try {
      const res = await fetch(`/api/follow/${userId}`, { method: "POST" });
      if (res.ok) {
        setFollowingIds(prev => new Set([...prev, userId]));
      }
    } catch (error) {
      console.error("Follow error:", error);
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.twins.length === 0) {
    return (
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <FiHeart className="w-5 h-5 text-pink-500" />
          <h3 className="font-semibold">Taste Twins</h3>
        </div>
        <p className="text-gray-400 text-sm">
          {data?.message || "Log smokes with flavor tags to find users with similar taste!"}
        </p>
        {data?.userTopFlavors && data.userTopFlavors.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-gray-500">Your flavors:</span>
            {data.userTopFlavors.map((flavor) => {
              const tag = getFlavorTag(flavor);
              return (
                <span key={flavor} className="px-2 py-1 bg-amber-500/20 rounded-full text-xs text-amber-400">
                  {tag?.emoji} {tag?.label || flavor}
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FiHeart className="w-5 h-5 text-pink-500" />
          <h3 className="font-semibold">Taste Twins</h3>
        </div>
        <Link href="/discover" className="text-amber-500 text-sm hover:underline">
          Discover more
        </Link>
      </div>

      {/* User's top flavors */}
      {data.userTopFlavors.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <span className="text-xs text-gray-500 mr-1">Your palate:</span>
          {data.userTopFlavors.slice(0, 4).map((flavor) => {
            const tag = getFlavorTag(flavor);
            return (
              <span key={flavor} className="px-2 py-0.5 bg-amber-500/10 rounded-full text-xs text-amber-400">
                {tag?.emoji}
              </span>
            );
          })}
        </div>
      )}

      {/* Twins list */}
      <div className="space-y-3">
        {data.twins.slice(0, 4).map((twin) => (
          <div key={twin.userId} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
            <Link href={`/profile/${twin.username}`} className="flex-shrink-0">
              {twin.avatarUrl ? (
                <img
                  src={twin.avatarUrl}
                  alt={twin.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <span className="text-white font-medium">
                    {(twin.displayName || twin.username)[0].toUpperCase()}
                  </span>
                </div>
              )}
            </Link>

            <div className="flex-1 min-w-0">
              <Link href={`/profile/${twin.username}`} className="hover:underline">
                <p className="font-medium text-sm truncate">
                  {twin.displayName || twin.username}
                </p>
              </Link>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {twin.sharedFlavors.slice(0, 3).map((flavor) => {
                  const tag = getFlavorTag(flavor);
                  return (
                    <span key={flavor} className="text-[10px] text-gray-400">
                      {tag?.emoji}
                    </span>
                  );
                })}
                <span className="text-[10px] text-pink-400 ml-1">
                  {twin.matchScore}% match
                </span>
              </div>
            </div>

            {followingIds.has(twin.userId) ? (
              <span className="text-green-500 text-xs flex items-center gap-1">
                <FiCheck className="w-3 h-3" /> Following
              </span>
            ) : (
              <button
                onClick={() => handleFollow(twin.userId)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 rounded-full text-xs font-medium text-black transition-colors flex items-center gap-1"
              >
                <FiUserPlus className="w-3 h-3" />
                Follow
              </button>
            )}
          </div>
        ))}
      </div>

      {data.twins.length > 4 && (
        <p className="text-center text-xs text-gray-500 mt-3">
          +{data.twins.length - 4} more twins on Discover
        </p>
      )}
    </div>
  );
}
