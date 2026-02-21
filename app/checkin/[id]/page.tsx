"use client";

import { motion } from "framer-motion";
import { useState, useEffect, use } from "react";
import { FiStar, FiClock, FiWind, FiDroplet, FiSmile, FiArrowLeft, FiHeart, FiMessageCircle, FiSend, FiShare2 } from "react-icons/fi";
import Link from "next/link";
import type { Checkin, Comment, CommentsResponse, CommentResponse, LikeResponse } from "@/lib/types";

interface CheckinWithMeta extends Checkin {
  like_count?: number;
  liked_by_me?: boolean;
  comment_count?: number;
}

interface CheckinDetailResponse {
  checkin?: CheckinWithMeta;
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

export default function CheckinDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [checkin, setCheckin] = useState<CheckinWithMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  useEffect(() => {
    loadCheckin();
  }, [id]);

  async function loadCheckin() {
    try {
      const res = await fetch(`/api/checkin/${id}`);
      const data: CheckinDetailResponse = await res.json();
      if (data.error) {
        setError(data.error);
      } else if (data.checkin) {
        setCheckin(data.checkin);
        setLiked(data.checkin.liked_by_me || false);
        setLikeCount(data.checkin.like_count || 0);
        setCommentCount(data.checkin.comment_count || 0);
        loadComments();
      }
    } catch (err) {
      setError("Failed to load check-in");
    } finally {
      setLoading(false);
    }
  }

  async function loadComments() {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/comments?checkinId=${id}`);
      const data: CommentsResponse = await res.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error("Load comments error:", err);
    } finally {
      setLoadingComments(false);
    }
  }

  const handleLike = async () => {
    if (liking || !checkin) return;
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

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || posting || !checkin) return;
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

  const handleShare = async () => {
    if (!checkin) return;
    
    const shareUrl = `${window.location.origin}/checkin/${checkin.id}`;
    const shareText = checkin.rating 
      ? `I just smoked a ${checkin.brand}${checkin.product ? ` ${checkin.product}` : ''} and rated it ${checkin.rating}/5! 🚬`
      : `Check out this ${checkin.brand}${checkin.product ? ` ${checkin.product}` : ''} smoke session! 🚬`;
    
    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${checkin.brand} - Puffed`,
          text: shareText,
          url: shareUrl,
        });
        setShareStatus("Shared!");
      } catch (err) {
        // User cancelled or error - that's ok
        if ((err as Error).name !== "AbortError") {
          // Fall back to clipboard
          copyToClipboard(shareUrl);
        }
      }
    } else {
      // Fall back to clipboard on desktop
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Link copied!");
      setTimeout(() => setShareStatus(null), 2000);
    } catch (err) {
      setShareStatus("Failed to copy");
      setTimeout(() => setShareStatus(null), 2000);
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

  if (error || !checkin) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-4xl">🚬</p>
        <p className="text-gray-400">{error || "Check-in not found"}</p>
        <Link href="/discover" className="text-amber-500 hover:underline">
          ← Back to Discover
        </Link>
      </main>
    );
  }

  const date = new Date(checkin.created_at * 1000);
  const timeAgo = getTimeAgo(date);

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link 
            href="/discover"
            className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
          >
            <FiArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold">{checkin.brand}</h1>
            <p className="text-xs text-gray-400">by @{checkin.username}</p>
          </div>
          <button
            onClick={handleShare}
            className="relative p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-amber-500 transition-all"
            title="Share"
          >
            <FiShare2 size={20} />
            {shareStatus && (
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-amber-500 text-black px-2 py-1 rounded whitespace-nowrap"
              >
                {shareStatus}
              </motion.span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Main check-in content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5"
        >
          {/* User info */}
          <div className="flex items-center gap-2 mb-4 text-sm">
            <Link 
              href={`/user/${checkin.username}`}
              className="text-amber-500 hover:underline font-medium"
            >
              @{checkin.username}
            </Link>
            <span className="text-gray-500">•</span>
            <span className="text-gray-500">{timeAgo}</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-500">{date.toLocaleDateString()}</span>
          </div>

          {/* Image */}
          {checkin.image_url && (
            <div className="mb-4 rounded-xl overflow-hidden">
              <img 
                src={checkin.image_url} 
                alt={checkin.brand}
                className="w-full max-h-96 object-cover"
              />
            </div>
          )}

          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="font-bold text-2xl">{checkin.brand}</h2>
              {checkin.product && <p className="text-gray-400">{checkin.product}</p>}
            </div>
            {checkin.rating && (
              <div className="flex items-center gap-1 bg-amber-500/20 px-3 py-2 rounded-xl">
                <FiStar className="text-amber-500" fill="currentColor" size={20} />
                <span className="text-amber-500 font-bold text-xl">{checkin.rating}</span>
              </div>
            )}
          </div>

          {checkin.review && (
            <p className="text-gray-200 mb-4 text-lg leading-relaxed">{checkin.review}</p>
          )}

          {checkin.flavor_notes && (
            <p className="text-gray-400 italic mb-4">&quot;{checkin.flavor_notes}&quot;</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
            {checkin.draw_rating && (
              <span className="flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-lg">
                <FiWind /> Draw: {checkin.draw_rating}/5
              </span>
            )}
            {checkin.burn_rating && (
              <span className="flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-lg">
                <FiDroplet /> Burn: {checkin.burn_rating}/5
              </span>
            )}
            {checkin.aroma_rating && (
              <span className="flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-lg">
                <FiSmile /> Aroma: {checkin.aroma_rating}/5
              </span>
            )}
            {checkin.smoke_time_mins && (
              <span className="flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-lg">
                <FiClock /> {checkin.smoke_time_mins} min
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-white/5 flex items-center gap-2">
            <button
              onClick={handleLike}
              disabled={liking}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
                liked 
                  ? "text-red-400 bg-red-500/10" 
                  : "text-gray-400 hover:text-red-400 hover:bg-red-500/10"
              }`}
            >
              <FiHeart size={18} fill={liked ? "currentColor" : "none"} />
              <span>{likeCount > 0 ? likeCount : "Like"}</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all"
            >
              <FiShare2 size={18} />
              <span>Share</span>
            </button>
          </div>
        </motion.div>

        {/* Comments section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-5 mt-4"
        >
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <FiMessageCircle />
            Comments ({commentCount})
          </h3>

          {loadingComments ? (
            <div className="flex justify-center py-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full"
              />
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-4">
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No comments yet. Be the first!</p>
                ) : (
                  comments.map((comment) => {
                    const commentDate = new Date(comment.created_at * 1000);
                    return (
                      <div key={comment.id} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1 text-sm">
                          <Link 
                            href={`/user/${comment.username}`}
                            className="text-amber-500 hover:underline font-medium"
                          >
                            @{comment.username}
                          </Link>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-500 text-xs">{getTimeAgo(commentDate)}</span>
                        </div>
                        <p className="text-gray-300">{comment.text}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add comment form */}
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                />
                <button
                  type="submit"
                  disabled={posting || !newComment.trim()}
                  className="px-4 rounded-lg bg-amber-500 text-black disabled:opacity-50 transition-all hover:bg-amber-400 font-medium"
                >
                  <FiSend size={18} />
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </main>
  );
}
