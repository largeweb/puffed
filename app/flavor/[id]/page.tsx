"use client";

import { motion } from "framer-motion";
import { useState, useEffect, use } from "react";
import { FiStar, FiClock, FiWind, FiDroplet, FiSmile, FiHome, FiHeart, FiMessageCircle, FiSend, FiArrowLeft, FiSearch } from "react-icons/fi";
import Link from "next/link";
import { FLAVOR_TAGS, getFlavorTag } from "@/lib/flavors";
import type { Checkin, LikeResponse, Comment, CommentsResponse, CommentResponse } from "@/lib/types";
import ShareMenu from "@/components/ShareMenu";

interface CheckinWithLikes extends Checkin {
  like_count?: number;
  liked_by_me?: boolean;
  comment_count?: number;
}

interface FlavorResponse {
  flavor: { id: string; label: string; emoji: string };
  checkins: CheckinWithLikes[];
  total: number;
  error?: string;
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
          <Link href={`/cigar/${encodeURIComponent(checkin.brand)}`}>
            <h3 className="font-semibold text-lg hover:text-amber-500 transition-colors">{checkin.brand}</h3>
          </Link>
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
                    <Link
                      key={tagId}
                      href={`/flavor/${tagId}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs hover:bg-amber-500/20 transition-colors"
                    >
                      <span>{tag.emoji}</span>
                      <span>{tag.label}</span>
                    </Link>
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

export default function FlavorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: flavorId } = use(params);
  const [flavor, setFlavor] = useState<{ id: string; label: string; emoji: string } | null>(null);
  const [checkins, setCheckins] = useState<CheckinWithLikes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFlavor() {
      try {
        const res = await fetch(`/api/flavors/${flavorId}`);
        if (!res.ok) {
          setError("Flavor not found");
          setLoading(false);
          return;
        }
        const data: FlavorResponse = await res.json();
        setFlavor(data.flavor);
        setCheckins(data.checkins || []);
      } catch (err) {
        console.error("Load error:", err);
        setError("Failed to load");
      } finally {
        setLoading(false);
      }
    }
    loadFlavor();
  }, [flavorId]);

  // Get local flavor info while loading
  const localFlavor = getFlavorTag(flavorId);

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

  if (error || !flavor) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-4xl">🤷</p>
        <p className="text-gray-400">{error || "Flavor not found"}</p>
        <Link href="/discover" className="text-amber-500 hover:underline">
          Back to Discover
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/discover"
                className="p-2 -ml-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
              >
                <FiArrowLeft size={20} />
              </Link>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center text-2xl">
                {flavor.emoji}
              </div>
              <div>
                <h1 className="font-semibold">{flavor.label} Cigars</h1>
                <p className="text-xs text-gray-400">
                  {checkins.length} {checkins.length === 1 ? "smoke" : "smokes"} with this flavor
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link 
                href="/search"
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
              >
                <FiSearch size={20} />
              </Link>
              <Link 
                href="/dashboard"
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
              >
                <FiHome size={20} />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Other Flavors */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {FLAVOR_TAGS.map((f) => (
            <Link
              key={f.id}
              href={`/flavor/${f.id}`}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                f.id === flavorId
                  ? "bg-amber-500 text-black font-medium"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              <span>{f.emoji}</span>
              <span>{f.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Checkins */}
      <div className="max-w-2xl mx-auto px-4 py-2">
        {checkins.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-gray-400"
          >
            <p className="text-4xl mb-3">{flavor.emoji}</p>
            <p>No smokes with {flavor.label.toLowerCase()} notes yet</p>
            <p className="text-sm mt-2">Be the first to log one!</p>
            <Link 
              href="/dashboard"
              className="mt-4 inline-block px-4 py-2 bg-amber-500 text-black rounded-lg hover:bg-amber-400 transition-colors"
            >
              Log a Smoke
            </Link>
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
