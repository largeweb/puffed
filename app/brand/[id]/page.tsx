"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  FiArrowLeft, FiStar, FiUsers, FiHash, FiCalendar, 
  FiHeart, FiUser, FiImage, FiMessageCircle
} from "react-icons/fi";
import { FLAVOR_TAGS, getFlavorTag } from "@/lib/flavors";

interface BrandStats {
  totalCheckins: number;
  uniqueSmokers: number;
  avgRating: number | null;
  firstCheckin: number | null;
}

interface BrandCheckin {
  id: string;
  userId: string;
  username: string;
  brand: string;
  product: string | null;
  rating: number | null;
  review: string | null;
  imageUrl: string | null;
  flavorNotes: string | null;
  category: string | null;
  createdAt: number;
}

interface TopFlavor {
  flavor: string;
  count: number;
}

interface TopFan {
  userId: string;
  username: string;
  checkinCount: number;
  avgRating: number | null;
}

interface BrandDetailResponse {
  brand: string;
  stats: BrandStats;
  checkins: BrandCheckin[];
  topFlavors: TopFlavor[];
  topFans: TopFan[];
  error?: string;
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

export default function BrandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = decodeURIComponent(params.id as string);
  
  const [data, setData] = useState<BrandDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadBrand() {
      try {
        const res = await fetch(`/api/brand-detail?brand=${encodeURIComponent(brandId)}&limit=30`);
        const json = await res.json() as BrandDetailResponse;
        
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
      } catch (e) {
        setError("Failed to load brand details");
      } finally {
        setLoading(false);
      }
    }
    
    if (brandId) {
      loadBrand();
    }
  }, [brandId]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading brand details...</div>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4">
          <FiArrowLeft /> Back
        </button>
        <div className="text-center text-red-400 mt-8">{error || "Brand not found"}</div>
      </div>
    );
  }
  
  const { brand, stats, checkins, topFlavors, topFans } = data;
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold truncate">{brand}</h1>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/20 rounded-xl p-4 text-center border border-amber-700/20">
            <div className="text-2xl font-bold text-amber-400">{stats.totalCheckins}</div>
            <div className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-1">
              <FiHash className="w-3 h-3" /> Check-ins
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/20 rounded-xl p-4 text-center border border-blue-700/20">
            <div className="text-2xl font-bold text-blue-400">{stats.uniqueSmokers}</div>
            <div className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-1">
              <FiUsers className="w-3 h-3" /> Smokers
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-900/30 to-amber-900/20 rounded-xl p-4 text-center border border-yellow-700/20">
            <div className="text-2xl font-bold text-yellow-400">
              {stats.avgRating ? stats.avgRating.toFixed(1) : "—"}
            </div>
            <div className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-1">
              <FiStar className="w-3 h-3" /> Avg Rating
            </div>
          </div>
        </motion.div>
        
        {/* Top Flavors */}
        {topFlavors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 rounded-xl p-4 border border-white/10"
          >
            <h2 className="text-sm font-semibold text-gray-300 mb-3">🎨 Top Flavors</h2>
            <div className="flex flex-wrap gap-2">
              {topFlavors.map(({ flavor, count }) => {
                const tag = getFlavorTag(flavor);
                return (
                  <Link
                    key={flavor}
                    href={`/flavor/${flavor}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-sm transition-colors"
                  >
                    <span>{tag?.emoji || "🔸"}</span>
                    <span>{tag?.label || flavor}</span>
                    <span className="text-amber-400/60 text-xs">({count})</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
        
        {/* Top Fans */}
        {topFans.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white/5 rounded-xl p-4 border border-white/10"
          >
            <h2 className="text-sm font-semibold text-gray-300 mb-3">🏆 Top Fans</h2>
            <div className="space-y-2">
              {topFans.map((fan, idx) => (
                <Link
                  key={fan.userId}
                  href={`/profile/${fan.username}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🔸"}
                    </span>
                    <span className="text-white font-medium">@{fan.username}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span>{fan.checkinCount} smokes</span>
                    {fan.avgRating && (
                      <span className="flex items-center gap-1 text-yellow-500">
                        <FiStar className="w-3 h-3" /> {fan.avgRating}
                      </span>
                    )}
                  </div>
                </Link>
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
          <h2 className="text-sm font-semibold text-gray-300 mb-3">📝 Recent Check-ins</h2>
          <div className="space-y-3">
            {checkins.map((checkin) => (
              <Link
                key={checkin.id}
                href={`/checkin/${checkin.id}`}
                className="block bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-amber-400 font-medium">@{checkin.username}</span>
                      {checkin.rating && (
                        <span className="flex items-center gap-0.5 text-yellow-500 text-sm">
                          <FiStar className="w-3 h-3" fill="currentColor" /> {checkin.rating}
                        </span>
                      )}
                    </div>
                    {checkin.product && (
                      <p className="text-gray-300 text-sm mb-1">{checkin.product}</p>
                    )}
                    {checkin.review && (
                      <p className="text-gray-400 text-sm line-clamp-2">{checkin.review}</p>
                    )}
                    {checkin.flavorNotes && (() => {
                      try {
                        const tags = JSON.parse(checkin.flavorNotes) as string[];
                        if (tags.length > 0) {
                          return (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {tags.slice(0, 4).map(tagId => {
                                const tag = getFlavorTag(tagId);
                                return (
                                  <span
                                    key={tagId}
                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs"
                                  >
                                    {tag?.emoji} {tag?.label || tagId}
                                  </span>
                                );
                              })}
                              {tags.length > 4 && (
                                <span className="text-xs text-gray-500">+{tags.length - 4}</span>
                              )}
                            </div>
                          );
                        }
                      } catch {
                        return null;
                      }
                      return null;
                    })()}
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <FiCalendar className="w-3 h-3" />
                      {getTimeAgo(checkin.createdAt)}
                    </div>
                  </div>
                  {checkin.imageUrl && (
                    <div className="flex-shrink-0">
                      <img
                        src={checkin.imageUrl}
                        alt=""
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </Link>
            ))}
            
            {checkins.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No check-ins yet for this brand
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Log a Smoke CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Link href={`/checkin?brand=${encodeURIComponent(brand)}`}>
            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold flex items-center justify-center gap-2 transition-all">
              <FiHeart className="w-4 h-4" />
              Log a {brand} smoke
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
