"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { FiArrowLeft, FiStar, FiClock, FiWind, FiDroplet, FiSmile, FiHeart, FiUserPlus, FiUserCheck, FiShare2 } from "react-icons/fi";
import Link from "next/link";
import type { FollowResponse, Badge } from "@/lib/types";

interface CheckinWithLikes {
  id: string;
  user_id: string;
  brand: string;
  product?: string;
  rating?: number;
  review?: string;
  flavor_notes?: string;
  image_url?: string;
  created_at: number;
  like_count: number;
  draw_rating?: number;
  burn_rating?: number;
  aroma_rating?: number;
  smoke_time_mins?: number;
}

interface UserProfileData {
  user: {
    id: string;
    username: string;
    bio: string | null;
    joinedAt: number;
  };
  stats: {
    totalCheckins: number;
    avgRating: number;
    uniqueBrands: number;
    following: number;
    followers: number;
  };
  checkins: CheckinWithLikes[];
  badges: Badge[];
  isFollowing: boolean;
  isOwnProfile: boolean;
  topBrand?: string;
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function CheckinCard({ checkin }: { checkin: CheckinWithLikes }) {
  const date = new Date(checkin.created_at * 1000);
  const timeAgo = getTimeAgo(date);

  return (
    <Link href={`/checkin/${checkin.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-5 hover:bg-white/5 transition-all"
      >
        {checkin.image_url && (
          <div className="mb-3 -mx-5 -mt-5 rounded-t-2xl overflow-hidden">
            <img 
              src={checkin.image_url} 
              alt={checkin.brand}
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-lg">{checkin.brand}</h3>
            {checkin.product && <p className="text-gray-400 text-sm">{checkin.product}</p>}
          </div>
          {checkin.rating && (
            <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-lg">
              <FiStar className="text-amber-500" fill="currentColor" />
              <span className="text-amber-500 font-semibold">{checkin.rating}</span>
            </div>
          )}
        </div>

        {checkin.review && (
          <p className="text-gray-300 text-sm mb-3 line-clamp-2">{checkin.review}</p>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-gray-400">
          {checkin.draw_rating && (
            <span className="flex items-center gap-1">
              <FiWind /> Draw: {checkin.draw_rating}/5
            </span>
          )}
          {checkin.burn_rating && (
            <span className="flex items-center gap-1">
              <FiDroplet /> Burn: {checkin.burn_rating}/5
            </span>
          )}
          {checkin.aroma_rating && (
            <span className="flex items-center gap-1">
              <FiSmile /> Aroma: {checkin.aroma_rating}/5
            </span>
          )}
          {checkin.smoke_time_mins && (
            <span className="flex items-center gap-1">
              <FiClock /> {checkin.smoke_time_mins} min
            </span>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
          <span>{timeAgo}</span>
          {checkin.like_count > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <FiHeart size={12} fill="currentColor" /> {checkin.like_count}
            </span>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

export default function UserProfileClient({ initialData }: { initialData: UserProfileData }) {
  const { user, stats: initialStats, checkins, badges, isOwnProfile } = initialData;
  const [isFollowing, setIsFollowing] = useState(initialData.isFollowing);
  const [stats, setStats] = useState(initialStats);
  const [followLoading, setFollowLoading] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const handleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.username }),
      });
      if (res.ok) {
        const data: FollowResponse = await res.json();
        setIsFollowing(data.following);
        setStats(prev => ({
          ...prev,
          followers: data.following ? prev.followers + 1 : prev.followers - 1,
        }));
      }
    } catch (err) {
      console.error("Follow error:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/user/${user.username}`;
    const shareText = `Check out @${user.username} on Puffed! 🚬 ${stats.totalCheckins} smokes logged.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `@${user.username} on Puffed`,
          text: shareText,
          url: shareUrl,
        });
        setShareStatus("Shared!");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Link copied!");
      setTimeout(() => setShareStatus(null), 2000);
    } catch {
      setShareStatus("Failed");
      setTimeout(() => setShareStatus(null), 2000);
    }
  };

  const joinDate = new Date(user.joinedAt * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const hasBio = user.bio && user.bio.trim().length > 0;

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/discover" className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-all">
              <FiArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-semibold">@{user.username}</h1>
              <p className="text-xs text-gray-400">Joined {joinDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Share button */}
            <button
              onClick={handleShare}
              className="relative p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-green-400 transition-all"
              title="Share profile"
            >
              <FiShare2 size={20} />
              {shareStatus && (
                <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs bg-green-500 text-black px-2 py-0.5 rounded whitespace-nowrap z-10">
                  {shareStatus}
                </span>
              )}
            </button>
            {!isOwnProfile && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  isFollowing
                    ? "bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400"
                    : "bg-amber-500 text-black hover:bg-amber-400"
                }`}
              >
                {isFollowing ? (
                  <>
                    <FiUserCheck size={16} />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <FiUserPlus size={16} />
                    <span>Follow</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 mb-6"
        >
          <div className="grid grid-cols-5 gap-2 text-center">
            <div>
              <p className="text-xl font-bold text-amber-500">{stats.totalCheckins}</p>
              <p className="text-xs text-gray-400">Smokes</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-500">{stats.avgRating || 0}</p>
              <p className="text-xs text-gray-400">Rating</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-500">{stats.uniqueBrands}</p>
              <p className="text-xs text-gray-400">Brands</p>
            </div>
            <Link
              href={`/user/${user.username}/followers`}
              className="block hover:bg-white/5 rounded-lg py-1 transition-all"
            >
              <p className="text-xl font-bold text-white">{stats.followers}</p>
              <p className="text-xs text-gray-400">Followers</p>
            </Link>
            <Link
              href={`/user/${user.username}/following`}
              className="block hover:bg-white/5 rounded-lg py-1 transition-all"
            >
              <p className="text-xl font-bold text-white">{stats.following}</p>
              <p className="text-xs text-gray-400">Following</p>
            </Link>
          </div>

          {/* Top brand indicator */}
          {initialData.topBrand && (
            <div className="mt-4 pt-4 border-t border-white/5 text-center">
              <p className="text-xs text-gray-500">
                🏆 Favorite brand: <span className="text-amber-500 font-medium">{initialData.topBrand}</span>
              </p>
            </div>
          )}
        </motion.div>

        {/* Badges */}
        {badges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass rounded-2xl p-4 mb-6"
          >
            <p className="text-xs text-gray-400 mb-2">Badges</p>
            <div className="flex flex-wrap gap-2">
              {badges.map(badge => (
                <div
                  key={badge.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30"
                  title={badge.description}
                >
                  <span>{badge.emoji}</span>
                  <span className="text-xs font-medium text-amber-500">{badge.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Bio */}
        {hasBio && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-4 mb-6"
          >
            <p className="text-gray-300 text-sm">{user.bio}</p>
          </motion.div>
        )}

        {/* Check-ins */}
        <h2 className="font-semibold mb-4">Recent Smokes</h2>
        
        {checkins.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-gray-400"
          >
            <p className="text-4xl mb-3">🚬</p>
            <p>No smokes logged yet</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {checkins.map((checkin, index) => (
              <motion.div
                key={checkin.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <CheckinCard checkin={checkin} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
