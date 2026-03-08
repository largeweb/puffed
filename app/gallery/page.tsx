"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FiHome, FiCamera, FiHeart, FiMessageCircle, FiStar, FiClock, FiTrendingUp, FiZap, FiMenu } from "react-icons/fi";
import MobileSidebar from "@/app/components/MobileSidebar";
import { useSidebar } from "@/hooks/useSidebar";

interface GalleryItem {
  id: string;
  user_id: string;
  username: string;
  brand: string;
  product: string | null;
  rating: number | null;
  image_url: string;
  created_at: number;
  like_count: number;
  comment_count: number;
  reaction_count: number;
}

interface GalleryResponse {
  photos: GalleryItem[];
  total: number;
  limit: number;
  offset: number;
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() / 1000) - timestamp);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function GalleryPage() {
  const { sidebarOpen, setSidebarOpen, currentUser, unreadCount, handleLogout } = useSidebar();
  const [photos, setPhotos] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"recent" | "liked" | "top">("recent");
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchGallery() {
      setLoading(true);
      try {
        const res = await fetch(`/api/gallery?sort=${sort}&limit=50`);
        if (res.ok) {
          const data: GalleryResponse = await res.json();
          setPhotos(data.photos || []);
          setTotal(data.total || 0);
        }
      } catch (error) {
        console.error("Gallery fetch error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchGallery();
  }, [sort]);

  return (
    <>
      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        username={currentUser}
        unreadCount={unreadCount}
        onLogout={handleLogout}
      />
    <div className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-black text-amber-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-stone-900/90 backdrop-blur-sm border-b border-amber-900/30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="text-amber-400 hover:text-amber-300 p-1">
              <FiMenu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <FiCamera className="text-amber-500" size={20} />
              <h1 className="text-lg font-semibold">Photo Gallery</h1>
            </div>
          </div>
          <span className="text-sm text-amber-400/60">{total} photos</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Sort Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSort("recent")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              sort === "recent"
                ? "bg-amber-500 text-stone-900"
                : "bg-stone-800/60 text-amber-400 hover:bg-stone-800"
            }`}
          >
            <FiClock size={14} />
            Recent
          </button>
          <button
            onClick={() => setSort("liked")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              sort === "liked"
                ? "bg-amber-500 text-stone-900"
                : "bg-stone-800/60 text-amber-400 hover:bg-stone-800"
            }`}
          >
            <FiHeart size={14} />
            Most Liked
          </button>
          <button
            onClick={() => setSort("top")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              sort === "top"
                ? "bg-amber-500 text-stone-900"
                : "bg-stone-800/60 text-amber-400 hover:bg-stone-800"
            }`}
          >
            <FiTrendingUp size={14} />
            Top Engaged
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-square bg-stone-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Photo Grid */}
        {!loading && photos.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"
          >
            {photos.map((photo, idx) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.02 }}
                className="relative aspect-square group cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.image_url}
                  alt={photo.brand}
                  className="w-full h-full object-cover rounded-xl"
                  loading="lazy"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-sm font-medium truncate">{photo.brand}</p>
                    <div className="flex items-center gap-3 text-xs text-amber-300/80 mt-1">
                      {photo.like_count > 0 && (
                        <span className="flex items-center gap-1">
                          <FiHeart size={12} /> {photo.like_count}
                        </span>
                      )}
                      {photo.comment_count > 0 && (
                        <span className="flex items-center gap-1">
                          <FiMessageCircle size={12} /> {photo.comment_count}
                        </span>
                      )}
                      {photo.rating && (
                        <span className="flex items-center gap-1">
                          <FiStar size={12} className="fill-amber-400" /> {photo.rating}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Engagement badge */}
                {(photo.like_count > 0 || photo.reaction_count > 0) && (
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 text-xs">
                    <FiHeart size={10} className="text-red-400" />
                    <span>{photo.like_count + photo.reaction_count}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && photos.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <FiCamera size={48} className="mx-auto text-amber-500/30 mb-4" />
            <h2 className="text-xl font-semibold text-amber-300 mb-2">No Photos Yet</h2>
            <p className="text-amber-400/60 mb-6">Be the first to share a photo of your smoke!</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-stone-900 font-semibold rounded-xl hover:bg-amber-400 transition-colors"
            >
              <FiCamera size={18} />
              Log a Smoke
            </Link>
          </motion.div>
        )}
      </div>

      {/* Photo Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-2xl w-full bg-stone-900 rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image */}
              <div className="relative">
                <img
                  src={selectedPhoto.image_url}
                  alt={selectedPhoto.brand}
                  className="w-full max-h-[60vh] object-contain bg-black"
                />
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Link
                      href={`/cigar/${encodeURIComponent(selectedPhoto.brand)}`}
                      className="text-lg font-semibold text-amber-100 hover:text-amber-400 transition-colors"
                      onClick={() => setSelectedPhoto(null)}
                    >
                      {selectedPhoto.brand}
                    </Link>
                    {selectedPhoto.product && (
                      <p className="text-sm text-amber-400/60">{selectedPhoto.product}</p>
                    )}
                  </div>
                  {selectedPhoto.rating && (
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 rounded-lg">
                      <FiStar className="text-amber-400 fill-amber-400" size={16} />
                      <span className="text-amber-400 font-semibold">{selectedPhoto.rating}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Link
                    href={`/user/${selectedPhoto.username}`}
                    className="flex items-center gap-2 text-sm text-amber-300/80 hover:text-amber-300 transition-colors"
                    onClick={() => setSelectedPhoto(null)}
                  >
                    <div className="w-6 h-6 bg-gradient-to-br from-amber-700 to-amber-900 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-amber-100">
                        {selectedPhoto.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    @{selectedPhoto.username}
                    <span className="text-amber-400/50">• {getTimeAgo(selectedPhoto.created_at)}</span>
                  </Link>

                  <div className="flex items-center gap-3 text-sm text-amber-400/60">
                    {selectedPhoto.like_count > 0 && (
                      <span className="flex items-center gap-1">
                        <FiHeart size={14} /> {selectedPhoto.like_count}
                      </span>
                    )}
                    {selectedPhoto.comment_count > 0 && (
                      <span className="flex items-center gap-1">
                        <FiMessageCircle size={14} /> {selectedPhoto.comment_count}
                      </span>
                    )}
                    {selectedPhoto.reaction_count > 0 && (
                      <span className="flex items-center gap-1">
                        <FiZap size={14} /> {selectedPhoto.reaction_count}
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  href={`/checkin/${selectedPhoto.id}`}
                  className="block mt-4 text-center px-4 py-2.5 bg-amber-500 text-stone-900 font-semibold rounded-xl hover:bg-amber-400 transition-colors"
                  onClick={() => setSelectedPhoto(null)}
                >
                  View Full Check-in →
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
