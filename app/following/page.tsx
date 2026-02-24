"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  FiArrowLeft, 
  FiUsers, 
  FiHeart, 
  FiMessageCircle, 
  FiStar,
  FiUserPlus,
  FiRefreshCw,
  FiChevronDown
} from "react-icons/fi";
import type { FollowingFeedResponse, FeedCheckin } from "@/app/api/following-feed/route";
import { FLAVOR_TAGS, getFlavorTag } from "@/lib/flavors";

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string }> = {
  cigar: { emoji: "🚬", color: "amber" },
  cannabis: { emoji: "🌿", color: "green" },
  hookah: { emoji: "💨", color: "blue" },
  vape: { emoji: "🌫️", color: "purple" },
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function CheckinCard({ checkin, onLike }: { checkin: FeedCheckin; onLike: (id: string, liked: boolean) => void }) {
  const [isLiked, setIsLiked] = useState(checkin.liked_by_me > 0);
  const [likeCount, setLikeCount] = useState(checkin.like_count);
  const [liking, setLiking] = useState(false);
  
  const categoryConfig = CATEGORY_CONFIG[checkin.category] || CATEGORY_CONFIG.cigar;
  const date = new Date(checkin.created_at * 1000);
  
  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinId: checkin.id }),
      });
      
      if (res.ok) {
        const newLiked = !isLiked;
        setIsLiked(newLiked);
        setLikeCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));
        onLike(checkin.id, newLiked);
      }
    } catch (error) {
      console.error("Like error:", error);
    } finally {
      setLiking(false);
    }
  };

  // Parse flavor notes
  const flavors: string[] = checkin.flavor_notes 
    ? (() => {
        try { return JSON.parse(checkin.flavor_notes); } 
        catch { return []; }
      })()
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl overflow-hidden"
    >
      {/* Image */}
      {checkin.image_url && (
        <Link href={`/checkin/${checkin.id}`}>
          <div className="relative aspect-[4/3] overflow-hidden">
            <img 
              src={checkin.image_url} 
              alt={checkin.brand}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
            {/* Category badge */}
            <div className={`absolute top-3 left-3 px-2 py-1 rounded-lg bg-${categoryConfig.color}-500/80 text-xs font-medium`}>
              {categoryConfig.emoji}
            </div>
          </div>
        </Link>
      )}

      <div className="p-4">
        {/* User info + timestamp */}
        <div className="flex items-center justify-between mb-3">
          <Link 
            href={`/user/${checkin.username}`}
            className="flex items-center gap-2 hover:text-cyan-400 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm font-bold">
              {checkin.username.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium">@{checkin.username}</span>
          </Link>
          <span className="text-xs text-gray-500">{getTimeAgo(date)}</span>
        </div>

        {/* Brand info */}
        <Link href={`/checkin/${checkin.id}`}>
          <h3 className="font-semibold text-lg hover:text-amber-500 transition-colors">
            {checkin.brand}
          </h3>
        </Link>
        {checkin.product && (
          <p className="text-gray-400 text-sm">{checkin.product}</p>
        )}

        {/* Rating */}
        {checkin.rating && (
          <div className="flex items-center gap-1 mt-2">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg bg-${categoryConfig.color}-500/20 text-${categoryConfig.color}-500`}>
              <FiStar fill="currentColor" size={14} />
              <span className="font-semibold text-sm">{checkin.rating}/5</span>
            </div>
          </div>
        )}

        {/* Review */}
        {checkin.review && (
          <p className="text-gray-300 text-sm mt-2 line-clamp-2">{checkin.review}</p>
        )}

        {/* Flavors */}
        {flavors.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {flavors.slice(0, 4).map(f => {
              const tag = getFlavorTag(f);
              return tag ? (
                <span key={f} className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                  {tag.emoji} {tag.label}
                </span>
              ) : null;
            })}
            {flavors.length > 4 && (
              <span className="text-xs px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded-full">
                +{flavors.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
          <button
            onClick={handleLike}
            disabled={liking}
            className={`flex items-center gap-1.5 text-sm transition-all ${
              isLiked ? "text-pink-500" : "text-gray-400 hover:text-pink-400"
            }`}
          >
            <FiHeart fill={isLiked ? "currentColor" : "none"} size={16} />
            <span>{likeCount}</span>
          </button>
          
          <Link 
            href={`/checkin/${checkin.id}`}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-400 transition-all"
          >
            <FiMessageCircle size={16} />
            <span>{checkin.comment_count}</span>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function FollowingFeedPage() {
  const [data, setData] = useState<FollowingFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadFeed = async (offset = 0, refresh = false) => {
    if (refresh) setRefreshing(true);
    else if (offset === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(`/api/following-feed?limit=20&offset=${offset}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      
      const json: FollowingFeedResponse = await res.json();
      
      if (offset === 0) {
        setData(json);
      } else {
        setData(prev => prev ? {
          ...json,
          checkins: [...prev.checkins, ...json.checkins]
        } : json);
      }
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const handleLike = (checkinId: string, liked: boolean) => {
    // Update local state optimistically
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        checkins: prev.checkins.map(c => 
          c.id === checkinId 
            ? { ...c, liked_by_me: liked ? 1 : 0, like_count: c.like_count + (liked ? 1 : -1) }
            : c
        )
      };
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <FiArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-semibold flex items-center gap-2">
                <FiUsers className="text-cyan-500" />
                Following
              </h1>
              <p className="text-xs text-gray-400">
                {data?.followingCount || 0} people
              </p>
            </div>
          </div>
          
          <button
            onClick={() => loadFeed(0, true)}
            disabled={refreshing}
            className={`p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-cyan-400 transition-all ${
              refreshing ? "animate-spin" : ""
            }`}
          >
            <FiRefreshCw size={20} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Empty state */}
        {data?.followingCount === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center">
              <FiUserPlus size={32} className="text-cyan-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">No one followed yet</h2>
            <p className="text-gray-400 mb-6 max-w-sm mx-auto">
              Follow other smokers to see their check-ins here. Discover people with similar taste!
            </p>
            <Link
              href="/people"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all"
            >
              <FiUsers size={18} />
              Discover People
            </Link>
          </motion.div>
        )}

        {/* No checkins from followed users */}
        {data && data.followingCount > 0 && data.checkins.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center">
              <span className="text-4xl">🚬</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Nothing to show yet</h2>
            <p className="text-gray-400 mb-6 max-w-sm mx-auto">
              The people you follow haven&apos;t logged any smokes yet. Check back later or explore more people to follow!
            </p>
            <Link
              href="/people"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all"
            >
              <FiUserPlus size={18} />
              Find More People
            </Link>
          </motion.div>
        )}

        {/* Feed */}
        {data && data.checkins.length > 0 && (
          <div className="space-y-4">
            <AnimatePresence>
              {data.checkins.map((checkin, index) => (
                <CheckinCard 
                  key={checkin.id} 
                  checkin={checkin}
                  onLike={handleLike}
                />
              ))}
            </AnimatePresence>

            {/* Load more button */}
            {data.hasMore && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => loadFeed(data.checkins.length)}
                disabled={loadingMore}
                className="w-full py-4 glass rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                {loadingMore ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    <FiChevronDown size={20} />
                    Load More
                  </>
                )}
              </motion.button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
