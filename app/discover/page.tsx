"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { FiSearch, FiStar, FiClock, FiWind, FiDroplet, FiSmile, FiHome, FiHeart, FiTrendingUp, FiMessageCircle, FiSend, FiAward, FiUsers, FiUserPlus, FiUserCheck } from "react-icons/fi";
import Link from "next/link";
import type { Checkin, DiscoverResponse, LikeResponse, TrendingResponse, TrendingBrand, Comment, CommentsResponse, CommentResponse, SuggestedUser, SuggestedUsersResponse, FollowResponse } from "@/lib/types";
import ShareMenu from "@/components/ShareMenu";
import { FLAVOR_TAGS, getFlavorTag } from "@/lib/flavors";

interface CheckinWithLikes extends Checkin {
  like_count?: number;
  liked_by_me?: boolean;
  comment_count?: number;
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function CheckinCard({ checkin, onLike }: { checkin: CheckinWithLikes; onLike: (id: string) => void }) {
  const date = new Date(checkin.created_at * 1000);
  const timeAgo = getTimeAgo(date);
  const [liked, setLiked] = useState(checkin.liked_by_me || false);
  const [likeCount, setLikeCount] = useState(checkin.like_count || 0);
  const [liking, setLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(checkin.comment_count || 0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

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
        const data: LikeResponse = await res.json();
        setLiked(data.liked);
        setLikeCount(prev => data.liked ? prev + 1 : prev - 1);
      }
    } catch (err) {
      console.error("Like error:", err);
    } finally {
      setLiking(false);
    }
  };

  const loadComments = async () => {
    if (loadingComments) return;
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/comments?checkinId=${checkin.id}`);
      if (res.ok) {
        const data: CommentsResponse = await res.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error("Load comments error:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleComments = () => {
    if (!showComments && comments.length === 0) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinId: checkin.id, text: newComment.trim() }),
      });
      if (res.ok) {
        const data: CommentResponse = await res.json();
        if (data.comment) {
          setComments(prev => [...prev, data.comment!]);
          setCommentCount(prev => prev + 1);
          setNewComment("");
        }
      }
    } catch (err) {
      console.error("Post comment error:", err);
    } finally {
      setPosting(false);
    }
  };

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/checkin/${checkin.id}` : `/checkin/${checkin.id}`;
  const shareText = checkin.rating 
    ? `I just smoked a ${checkin.brand}${checkin.product ? ` ${checkin.product}` : ''} and rated it ${checkin.rating}/5! 🚬 #Puffed`
    : `Check out this ${checkin.brand}${checkin.product ? ` ${checkin.product}` : ''} smoke session! 🚬 #Puffed`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5"
    >
      {/* User info */}
      <div className="flex items-center gap-2 mb-3 text-sm">
        <Link 
          href={`/user/${checkin.username}`}
          className="text-amber-500 hover:underline font-medium"
        >
          @{checkin.username}
        </Link>
        <span className="text-gray-500">•</span>
        <span className="text-gray-500">{timeAgo}</span>
      </div>

      {/* Image */}
      {checkin.image_url && (
        <div className="mb-3 rounded-xl overflow-hidden">
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
        <p className="text-gray-300 text-sm mb-3">{checkin.review}</p>
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

      {/* Flavor tags */}
      {checkin.flavor_notes && (() => {
        try {
          const tags = JSON.parse(checkin.flavor_notes) as string[];
          if (tags.length > 0) {
            return (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.map(tagId => {
                  const tag = FLAVOR_TAGS.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <span
                      key={tagId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs"
                    >
                      <span>{tag.emoji}</span>
                      <span>{tag.label}</span>
                    </span>
                  );
                })}
              </div>
            );
          }
        } catch {
          return null;
        }
        return null;
      })()}

      {/* Like & Comment buttons */}
      <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
        <button
          onClick={handleLike}
          disabled={liking}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            liked 
              ? "text-red-400 bg-red-500/10" 
              : "text-gray-400 hover:text-red-400 hover:bg-red-500/10"
          }`}
        >
          <FiHeart size={16} fill={liked ? "currentColor" : "none"} />
          <span className="text-sm">{likeCount > 0 ? likeCount : "Like"}</span>
        </button>
        <button
          onClick={toggleComments}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            showComments 
              ? "text-amber-400 bg-amber-500/10" 
              : "text-gray-400 hover:text-amber-400 hover:bg-amber-500/10"
          }`}
        >
          <FiMessageCircle size={16} />
          <span className="text-sm">{commentCount > 0 ? commentCount : "Comment"}</span>
        </button>
        <ShareMenu
          url={shareUrl}
          text={shareText}
          title={`${checkin.brand} - Puffed`}
          className="ml-auto"
        />
      </div>

      {/* Comments section */}
      {showComments && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 pt-3 border-t border-white/5"
        >
          {loadingComments ? (
            <div className="flex justify-center py-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full"
              />
            </div>
          ) : (
            <>
              {/* Existing comments */}
              <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-2">No comments yet. Be the first!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2 text-sm">
                      <Link 
                        href={`/user/${comment.username}`}
                        className="text-amber-500 hover:underline font-medium flex-shrink-0"
                      >
                        @{comment.username}
                      </Link>
                      <p className="text-gray-300">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add comment form */}
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                />
                <button
                  type="submit"
                  disabled={posting || !newComment.trim()}
                  className="p-2 rounded-lg bg-amber-500 text-black disabled:opacity-50 transition-all hover:bg-amber-400"
                >
                  <FiSend size={16} />
                </button>
              </form>
            </>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

export default function DiscoverPage() {
  const [checkins, setCheckins] = useState<CheckinWithLikes[]>([]);
  const [trending, setTrending] = useState<TrendingBrand[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFeed();
    loadTrending();
    loadSuggestedUsers();
  }, []);

  async function loadFeed(query = "") {
    try {
      setSearching(true);
      const url = query 
        ? `/api/discover?q=${encodeURIComponent(query)}`
        : "/api/discover";
      const res = await fetch(url);
      const data: DiscoverResponse = await res.json();
      setCheckins(data.checkins || []);
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }

  async function loadTrending() {
    try {
      const res = await fetch("/api/trending");
      const data: TrendingResponse = await res.json();
      setTrending(data.trending || []);
    } catch (error) {
      console.error("Trending error:", error);
    }
  }

  async function loadSuggestedUsers() {
    try {
      const res = await fetch("/api/users/suggested");
      const data: SuggestedUsersResponse = await res.json();
      setSuggestedUsers(data.users || []);
      // Track which users are already followed
      const followedSet = new Set(
        (data.users || []).filter(u => u.is_following).map(u => u.username)
      );
      setFollowingUsers(followedSet);
    } catch (error) {
      console.error("Suggested users error:", error);
    }
  }

  async function handleFollow(username: string) {
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (res.ok) {
        const data: FollowResponse = await res.json();
        setFollowingUsers(prev => {
          const next = new Set(prev);
          if (data.following) {
            next.add(username);
          } else {
            next.delete(username);
          }
          return next;
        });
      }
    } catch (error) {
      console.error("Follow error:", error);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadFeed(searchQuery);
  };

  const handleLike = (checkinId: string) => {
    // Handled in CheckinCard
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

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <span className="text-lg">🚬</span>
              </div>
              <div>
                <h1 className="font-semibold">Discover</h1>
                <p className="text-xs text-gray-400">See what everyone's smoking</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link 
                href="/search"
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                title="Search"
              >
                <FiSearch size={20} />
              </Link>
              <Link 
                href="/leaderboard"
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-amber-500 transition-all"
                title="Leaderboard"
              >
                <FiAward size={20} />
              </Link>
              <Link 
                href="/dashboard"
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                title="Dashboard"
              >
                <FiHome size={20} />
              </Link>
            </div>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search brands, products, reviews..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all"
            />
          </form>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Trending Section */}
        {trending.length > 0 && !searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <FiTrendingUp className="text-amber-500" />
              <h2 className="font-semibold">Trending This Week</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {trending.map((brand, index) => (
                <Link
                  key={brand.brand}
                  href={`/cigar/${encodeURIComponent(brand.brand)}`}
                  className="flex-shrink-0 glass px-4 py-2 rounded-xl hover:border-amber-500/50 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🔥"}</span>
                    <div className="text-left">
                      <p className="font-medium text-sm">{brand.brand}</p>
                      <p className="text-xs text-gray-400">
                        {brand.checkin_count} {brand.checkin_count === 1 ? "smoke" : "smokes"}
                        {brand.avg_rating && ` • ${brand.avg_rating}★`}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* People to Follow Section */}
        {suggestedUsers.length > 0 && !searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <FiUsers className="text-amber-500" />
              <h2 className="font-semibold">People to Follow</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {suggestedUsers.map((user) => {
                const isFollowing = followingUsers.has(user.username);
                return (
                  <div
                    key={user.username}
                    className="flex-shrink-0 glass px-4 py-3 rounded-xl min-w-[160px]"
                  >
                    <Link 
                      href={`/user/${user.username}`}
                      className="block mb-2"
                    >
                      <p className="font-medium text-amber-500 hover:underline">@{user.username}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {user.checkin_count} {user.checkin_count === 1 ? "smoke" : "smokes"}
                        {user.follower_count > 0 && ` • ${user.follower_count} followers`}
                      </p>
                      {user.bio && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{user.bio}</p>
                      )}
                    </Link>
                    <button
                      onClick={() => handleFollow(user.username)}
                      className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                        isFollowing
                          ? "bg-amber-500/20 text-amber-500 hover:bg-red-500/20 hover:text-red-400"
                          : "bg-amber-500 text-black hover:bg-amber-400"
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <FiUserCheck size={14} />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <FiUserPlus size={14} />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Feed */}
        {searching ? (
          <div className="flex justify-center py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full"
            />
          </div>
        ) : checkins.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-gray-400"
          >
            <p className="text-4xl mb-3">🔍</p>
            <p>No smokes found</p>
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(""); loadFeed(); }}
                className="mt-2 text-amber-500 hover:underline text-sm"
              >
                Clear search
              </button>
            )}
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
                <CheckinCard checkin={checkin} onLike={handleLike} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
