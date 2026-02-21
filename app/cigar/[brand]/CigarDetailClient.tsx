"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { 
  FiHome, 
  FiStar, 
  FiUsers, 
  FiHash, 
  FiHeart, 
  FiMessageCircle,
  FiArrowLeft,
  FiClock,
  FiTrendingUp
} from "react-icons/fi";
import { GiCigarette } from "react-icons/gi";
import type { LikeResponse } from "@/lib/types";
import { FLAVOR_TAGS, getFlavorTag } from "@/lib/flavors";

interface BrandStats {
  brand: string;
  total_checkins: number;
  avg_rating: number | null;
  unique_smokers: number;
  latest_checkin: number;
}

interface CheckinWithUser {
  id: string;
  user_id: string;
  username: string;
  brand: string;
  product: string | null;
  rating: number | null;
  review: string | null;
  flavor_notes: string | null;
  image_url: string | null;
  created_at: number;
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
}

interface CigarDetailData {
  brand: string;
  stats: BrandStats;
  checkins: CheckinWithUser[];
  products: { product: string; count: number; avg_rating: number | null }[];
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() / 1000) - timestamp);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

function CheckinCard({ checkin }: { checkin: CheckinWithUser }) {
  const [liked, setLiked] = useState(checkin.liked_by_me);
  const [likeCount, setLikeCount] = useState(checkin.like_count);
  const [liking, setLiking] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  return (
    <Link href={`/checkin/${checkin.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-stone-800/40 rounded-xl border border-amber-900/20 overflow-hidden hover:border-amber-700/40 transition-colors"
      >
        {checkin.image_url && (
          <div className="aspect-video relative overflow-hidden">
            <img
              src={checkin.image_url}
              alt={checkin.brand}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Link 
              href={`/user/${checkin.username}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 hover:opacity-80"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-amber-700 to-amber-900 rounded-full flex items-center justify-center">
                <span className="text-amber-100 text-sm font-bold">
                  {checkin.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-amber-200 font-medium">@{checkin.username}</span>
            </Link>
            <span className="text-amber-400/50 text-sm flex items-center gap-1">
              <FiClock size={12} />
              {getTimeAgo(checkin.created_at)}
            </span>
          </div>

          {checkin.product && (
            <p className="text-amber-100 font-medium mb-1">{checkin.product}</p>
          )}

          {checkin.rating && (
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <FiStar
                  key={star}
                  size={16}
                  className={star <= checkin.rating! ? "text-amber-400 fill-amber-400" : "text-amber-700/50"}
                />
              ))}
            </div>
          )}

          {checkin.review && (
            <p className="text-amber-200/80 text-sm line-clamp-2 mb-3">
              "{checkin.review}"
            </p>
          )}

          {/* Flavor tags */}
          {checkin.flavor_notes && (() => {
            try {
              const tags = JSON.parse(checkin.flavor_notes) as string[];
              if (tags.length > 0) {
                return (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {tags.map(tagId => {
                      const tag = FLAVOR_TAGS.find(t => t.id === tagId);
                      if (!tag) return null;
                      return (
                        <span
                          key={tagId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-700/30 text-amber-300 text-xs"
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

          <div className="flex items-center gap-4 pt-2 border-t border-amber-900/20">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 text-sm transition-colors ${
                liked ? "text-red-400" : "text-amber-400/60 hover:text-red-400"
              }`}
            >
              <FiHeart size={16} className={liked ? "fill-red-400" : ""} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>
            <span className="flex items-center gap-1 text-sm text-amber-400/60">
              <FiMessageCircle size={16} />
              {checkin.comment_count > 0 && <span>{checkin.comment_count}</span>}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default function CigarDetailClient({ initialData }: { initialData: CigarDetailData }) {
  const { brand, stats, checkins, products } = initialData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-black text-amber-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-stone-900/90 backdrop-blur-sm border-b border-amber-900/30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/discover" className="text-amber-400 hover:text-amber-300">
            <FiArrowLeft size={24} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-amber-100 truncate">{brand}</h1>
          </div>
          <Link href="/dashboard" className="text-amber-400 hover:text-amber-300">
            <FiHome size={22} />
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Brand Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-900/40 to-stone-800/40 rounded-2xl p-6 border border-amber-800/30"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-700 to-amber-900 rounded-2xl flex items-center justify-center">
              <GiCigarette className="text-amber-200" size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-amber-100">{brand}</h2>
              <p className="text-amber-400/60 text-sm">Cigar Brand</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-stone-800/50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                <FiHash size={16} />
              </div>
              <p className="text-2xl font-bold text-amber-100">{stats.total_checkins}</p>
              <p className="text-xs text-amber-400/60">Check-ins</p>
            </div>
            <div className="bg-stone-800/50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                <FiStar size={16} />
              </div>
              <p className="text-2xl font-bold text-amber-100">
                {stats.avg_rating ? stats.avg_rating.toFixed(1) : "—"}
              </p>
              <p className="text-xs text-amber-400/60">Avg Rating</p>
            </div>
            <div className="bg-stone-800/50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                <FiUsers size={16} />
              </div>
              <p className="text-2xl font-bold text-amber-100">{stats.unique_smokers}</p>
              <p className="text-xs text-amber-400/60">Smokers</p>
            </div>
          </div>
        </motion.div>

        {/* Products/Vitolas */}
        {products.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-lg font-semibold text-amber-300 mb-3 flex items-center gap-2">
              <FiTrendingUp size={18} />
              Products & Vitolas
            </h3>
            <div className="space-y-2">
              {products.map((product, idx) => (
                <div
                  key={product.product}
                  className="flex items-center justify-between p-3 bg-stone-800/40 rounded-xl border border-amber-900/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-900/30 rounded-lg flex items-center justify-center">
                      <span className="text-amber-400 text-sm font-bold">#{idx + 1}</span>
                    </div>
                    <span className="text-amber-100">{product.product}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {product.avg_rating && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <FiStar size={14} className="fill-amber-400" />
                        {product.avg_rating.toFixed(1)}
                      </span>
                    )}
                    <span className="text-amber-400/50">
                      {product.count} check-in{product.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Check-ins */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold text-amber-300 mb-3 flex items-center gap-2">
            <FiClock size={18} />
            Recent Check-ins
          </h3>
          {checkins.length === 0 ? (
            <div className="text-center py-12 bg-stone-800/20 rounded-xl">
              <GiCigarette className="mx-auto text-amber-400/30 mb-3" size={48} />
              <p className="text-amber-200/60">No check-ins yet</p>
              <p className="text-sm text-amber-400/40 mt-1">Be the first to log this cigar!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {checkins.map((checkin) => (
                <CheckinCard key={checkin.id} checkin={checkin} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
