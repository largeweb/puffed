"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { FiStar, FiClock, FiWind, FiDroplet, FiSmile, FiArrowLeft, FiHeart, FiMessageCircle, FiSend, FiEdit2, FiX, FiCheck } from "react-icons/fi";
import Link from "next/link";
import type { Checkin, Comment, CommentsResponse, CommentResponse, LikeResponse } from "@/lib/types";
import ShareMenu from "@/components/ShareMenu";
import { FLAVOR_TAGS, getFlavorTag } from "@/lib/flavors";

export interface CheckinWithMeta extends Checkin {
  like_count?: number;
  liked_by_me?: boolean;
  comment_count?: number;
  is_owner?: boolean;
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

interface Props {
  initialCheckin: CheckinWithMeta;
}

export default function CheckinClient({ initialCheckin }: Props) {
  const [checkin, setCheckin] = useState<CheckinWithMeta>(initialCheckin);
  const [liked, setLiked] = useState(initialCheckin.liked_by_me || false);
  const [likeCount, setLikeCount] = useState(initialCheckin.like_count || 0);
  const [liking, setLiking] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(initialCheckin.comment_count || 0);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editRating, setEditRating] = useState(checkin.rating || 0);
  const [editReview, setEditReview] = useState(checkin.review || "");
  const [editDrawRating, setEditDrawRating] = useState(checkin.draw_rating || 0);
  const [editBurnRating, setEditBurnRating] = useState(checkin.burn_rating || 0);
  const [editAromaRating, setEditAromaRating] = useState(checkin.aroma_rating || 0);
  const [editSmokeTime, setEditSmokeTime] = useState(checkin.smoke_time_mins || 0);
  const [editFlavors, setEditFlavors] = useState<string[]>(() => {
    try {
      return checkin.flavor_notes ? JSON.parse(checkin.flavor_notes) : [];
    } catch { return []; }
  });

  useEffect(() => {
    loadComments();
  }, [checkin.id]);

  async function loadComments() {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/comments?checkinId=${checkin.id}`);
      const data: CommentsResponse = await res.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error("Load comments error:", err);
    } finally {
      setLoadingComments(false);
    }
  }

  const startEditing = () => {
    setEditRating(checkin.rating || 0);
    setEditReview(checkin.review || "");
    setEditDrawRating(checkin.draw_rating || 0);
    setEditBurnRating(checkin.burn_rating || 0);
    setEditAromaRating(checkin.aroma_rating || 0);
    setEditSmokeTime(checkin.smoke_time_mins || 0);
    try {
      setEditFlavors(checkin.flavor_notes ? JSON.parse(checkin.flavor_notes) : []);
    } catch { setEditFlavors([]); }
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/checkins?id=${checkin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: editRating || null,
          review: editReview || null,
          drawRating: editDrawRating || null,
          burnRating: editBurnRating || null,
          aromaRating: editAromaRating || null,
          smokeTimeMins: editSmokeTime || null,
          flavorNotes: editFlavors.length > 0 ? JSON.stringify(editFlavors) : null,
        }),
      });
      if (res.ok) {
        // Update local state
        setCheckin({
          ...checkin,
          rating: editRating || undefined,
          review: editReview || undefined,
          draw_rating: editDrawRating || undefined,
          burn_rating: editBurnRating || undefined,
          aroma_rating: editAromaRating || undefined,
          smoke_time_mins: editSmokeTime || undefined,
          flavor_notes: editFlavors.length > 0 ? JSON.stringify(editFlavors) : undefined,
        });
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Edit error:", err);
    } finally {
      setEditSaving(false);
    }
  };

  const toggleFlavor = (flavorId: string) => {
    setEditFlavors(prev => 
      prev.includes(flavorId) 
        ? prev.filter(f => f !== flavorId)
        : [...prev, flavorId]
    );
  };

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

  const date = new Date(checkin.created_at * 1000);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/checkin/${checkin.id}` : `/checkin/${checkin.id}`;
  const shareText = checkin.rating 
    ? `I just smoked a ${checkin.brand}${checkin.product ? ` ${checkin.product}` : ''} and rated it ${checkin.rating}/5! 🚬 #Puffed`
    : `Check out this ${checkin.brand}${checkin.product ? ` ${checkin.product}` : ''} smoke session! 🚬 #Puffed`;
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
          {checkin.is_owner && !isEditing && (
            <button
              onClick={startEditing}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-amber-400 transition-all"
              title="Edit check-in"
            >
              <FiEdit2 size={18} />
            </button>
          )}
          <ShareMenu
            url={shareUrl}
            text={shareText}
            title={`${checkin.brand} - Puffed`}
            iconOnly
            className="p-2 hover:bg-white/5"
          />
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
            {!isEditing && checkin.rating && (
              <div className="flex items-center gap-1 bg-amber-500/20 px-3 py-2 rounded-xl">
                <FiStar className="text-amber-500" fill="currentColor" size={20} />
                <span className="text-amber-500 font-bold text-xl">{checkin.rating}</span>
              </div>
            )}
          </div>

          {/* Edit Mode */}
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="edit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Overall Rating */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Overall Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setEditRating(star)}
                        className={`text-2xl transition-all ${
                          star <= editRating ? "text-amber-500" : "text-gray-600"
                        } hover:scale-110`}
                      >
                        <FiStar fill={star <= editRating ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Review */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Review</label>
                  <textarea
                    value={editReview}
                    onChange={(e) => setEditReview(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none"
                    placeholder="How was your smoke?"
                  />
                </div>

                {/* Flavor Tags */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Flavors</label>
                  <div className="flex flex-wrap gap-2">
                    {FLAVOR_TAGS.map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleFlavor(tag.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                          editFlavors.includes(tag.id)
                            ? "bg-amber-500/30 text-amber-300 ring-1 ring-amber-500/50"
                            : "bg-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                      >
                        <span>{tag.emoji}</span>
                        <span>{tag.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Secondary Ratings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Draw</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setEditDrawRating(star)}
                          className={`text-lg transition-all ${
                            star <= editDrawRating ? "text-blue-400" : "text-gray-600"
                          }`}
                        >
                          <FiStar fill={star <= editDrawRating ? "currentColor" : "none"} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Burn</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setEditBurnRating(star)}
                          className={`text-lg transition-all ${
                            star <= editBurnRating ? "text-orange-400" : "text-gray-600"
                          }`}
                        >
                          <FiStar fill={star <= editBurnRating ? "currentColor" : "none"} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Aroma</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setEditAromaRating(star)}
                          className={`text-lg transition-all ${
                            star <= editAromaRating ? "text-purple-400" : "text-gray-600"
                          }`}
                        >
                          <FiStar fill={star <= editAromaRating ? "currentColor" : "none"} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Smoke Time (min)</label>
                    <input
                      type="number"
                      value={editSmokeTime || ""}
                      onChange={(e) => setEditSmokeTime(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Save/Cancel buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={editSaving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-amber-500 text-black font-semibold disabled:opacity-50 hover:bg-amber-400 transition-all"
                  >
                    {editSaving ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-black border-t-transparent rounded-full"
                      />
                    ) : (
                      <>
                        <FiCheck /> Save Changes
                      </>
                    )}
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={editSaving}
                    className="px-4 py-3 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 transition-all"
                  >
                    <FiX />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {checkin.review && (
                  <p className="text-gray-200 mb-4 text-lg leading-relaxed">{checkin.review}</p>
                )}

                {/* Flavor tags */}
                {checkin.flavor_notes && (() => {
                  try {
                    const tags = JSON.parse(checkin.flavor_notes) as string[];
                    if (tags.length > 0) {
                      return (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {tags.map(tagId => {
                            const tag = FLAVOR_TAGS.find(t => t.id === tagId);
                            if (!tag) return null;
                            return (
                              <span
                                key={tagId}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-400 text-sm"
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
                    // Fall back to showing raw text if not JSON
                    return <p className="text-gray-400 italic mb-4">&quot;{checkin.flavor_notes}&quot;</p>;
                  }
                  return null;
                })()}

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
              </motion.div>
            )}
          </AnimatePresence>

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
            <ShareMenu
              url={shareUrl}
              text={shareText}
              title={`${checkin.brand} - Puffed`}
              className="px-4 py-2"
            />
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
