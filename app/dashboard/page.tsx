"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiPlus, FiLogOut, FiStar, FiClock, FiWind, FiDroplet, FiSmile, FiCompass, FiCamera, FiX } from "react-icons/fi";
import Link from "next/link";
import type { User, Checkin, MeResponse, CheckinsResponse, UploadResponse } from "@/lib/types";

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-2xl transition-all ${
              star <= value ? "text-amber-500" : "text-gray-600"
            } hover:scale-110 active:scale-95`}
          >
            <FiStar fill={star <= value ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckinCard({ checkin }: { checkin: Checkin }) {
  const date = new Date(checkin.created_at * 1000);
  const timeAgo = getTimeAgo(date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5"
    >
      {/* Image */}
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

      <div className="mt-3 pt-3 border-t border-white/5 text-xs text-gray-500">
        {timeAgo}
      </div>
    </motion.div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return date.toLocaleDateString();
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // Form state
  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [drawRating, setDrawRating] = useState(0);
  const [burnRating, setBurnRating] = useState(0);
  const [aromaRating, setAromaRating] = useState(0);
  const [smokeTime, setSmokeTime] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        // Check auth
        const authRes = await fetch("/api/auth/me");
        const authData: MeResponse = await authRes.json();
        
        if (!authData.user) {
          router.push("/login");
          return;
        }
        
        setUser(authData.user);

        // Load check-ins
        const checkinsRes = await fetch("/api/checkins");
        const checkinsData: CheckinsResponse = await checkinsRes.json();
        setCheckins(checkinsData.checkins || []);
      } catch (error) {
        console.error("Load error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim()) return;

    setSubmitting(true);

    try {
      let imageUrl: string | undefined;

      // Upload image first if present
      if (imageFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", imageFile);
        
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (uploadRes.ok) {
          const uploadData: UploadResponse = await uploadRes.json();
          imageUrl = uploadData.imageUrl;
        }
        setUploading(false);
      }

      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand,
          product: product || undefined,
          rating: rating || undefined,
          review: review || undefined,
          drawRating: drawRating || undefined,
          burnRating: burnRating || undefined,
          aromaRating: aromaRating || undefined,
          smokeTimeMins: smokeTime ? parseInt(smokeTime) : undefined,
          imageUrl,
        }),
      });

      if (res.ok) {
        // Reload check-ins
        const checkinsRes = await fetch("/api/checkins");
        const checkinsData: CheckinsResponse = await checkinsRes.json();
        setCheckins(checkinsData.checkins || []);

        // Reset form
        setBrand("");
        setProduct("");
        setRating(0);
        setReview("");
        setDrawRating(0);
        setBurnRating(0);
        setAromaRating(0);
        setSmokeTime("");
        setImageFile(null);
        setImagePreview(null);
        setShowForm(false);
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setSubmitting(false);
      setUploading(false);
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

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <span className="text-lg">🚬</span>
            </div>
            <div>
              <h1 className="font-semibold">Puffed</h1>
              <p className="text-xs text-gray-400">@{user?.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/discover"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <FiCompass size={20} />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <FiLogOut size={20} />
            </button>
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
          <h2 className="text-sm text-gray-400 mb-2">Your Stats</h2>
          <div className="flex gap-6">
            <div>
              <p className="text-3xl font-bold text-amber-500">{checkins.length}</p>
              <p className="text-xs text-gray-400">Check-ins</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-500">
                {checkins.length > 0
                  ? (checkins.filter(c => c.rating).reduce((sum, c) => sum + (c.rating || 0), 0) / checkins.filter(c => c.rating).length || 0).toFixed(1)
                  : "0"}
              </p>
              <p className="text-xs text-gray-400">Avg Rating</p>
            </div>
          </div>
        </motion.div>

        {/* Check-ins */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent Smokes</h2>
        </div>

        {checkins.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-gray-400"
          >
            <p className="text-4xl mb-3">🚬</p>
            <p>No smokes logged yet</p>
            <p className="text-sm">Tap + to add your first check-in</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {checkins.map((checkin) => (
              <CheckinCard key={checkin.id} checkin={checkin} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <motion.button
        onClick={() => setShowForm(true)}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center shadow-lg ember-glow"
      >
        <FiPlus size={24} />
      </motion.button>

      {/* Check-in Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#1a1a1a] rounded-t-3xl sm:rounded-3xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Log a Smoke</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Photo (optional)</label>
                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                      <button
                        type="button"
                        onClick={clearImage}
                        className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-all"
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 w-full py-8 rounded-xl bg-white/5 border border-dashed border-white/20 cursor-pointer hover:border-amber-500/50 transition-all">
                      <FiCamera size={20} className="text-gray-400" />
                      <span className="text-gray-400">Add a photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Brand *</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    required
                    placeholder="e.g., Padron, Arturo Fuente"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Product / Line</label>
                  <input
                    type="text"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    placeholder="e.g., 1926 Serie, Opus X"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all"
                  />
                </div>

                <StarRating value={rating} onChange={setRating} label="Overall Rating" />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StarRating value={drawRating} onChange={setDrawRating} label="Draw" />
                  <StarRating value={burnRating} onChange={setBurnRating} label="Burn" />
                  <StarRating value={aromaRating} onChange={setAromaRating} label="Aroma" />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Smoke Time (minutes)</label>
                  <input
                    type="number"
                    value={smokeTime}
                    onChange={(e) => setSmokeTime(e.target.value)}
                    placeholder="e.g., 45"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Review / Notes</label>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    rows={3}
                    placeholder="How was it? Flavor notes, pairing..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || uploading || !brand.trim()}
                  className="w-full px-5 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold btn-glow transition-all active:scale-95 disabled:opacity-50"
                >
                  {uploading ? "Uploading image..." : submitting ? "Logging..." : "Log Smoke 🚬"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
