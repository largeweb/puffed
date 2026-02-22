"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiPlus, FiTrash2, FiCheck, FiBookmark, FiSearch } from "react-icons/fi";
import type { WishlistItem, WishlistResponse, MeResponse } from "@/lib/types";

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const router = useRouter();

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

        // Load wishlist
        const wishlistRes = await fetch("/api/wishlist");
        const wishlistData: WishlistResponse = await wishlistRes.json();
        setWishlist(wishlistData.wishlist || []);
      } catch (error) {
        console.error("Load error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand.trim() || adding) return;

    setAdding(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: newBrand, notes: newNotes }),
      });

      if (res.ok) {
        const data = await res.json() as { id: string; brand: string };
        setWishlist(prev => [{
          id: data.id,
          brand: data.brand,
          notes: newNotes || null,
          created_at: Math.floor(Date.now() / 1000),
          smoked: false
        }, ...prev]);
        setNewBrand("");
        setNewNotes("");
        setShowAddForm(false);
      }
    } catch (error) {
      console.error("Add error:", error);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const res = await fetch(`/api/wishlist?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setWishlist(prev => prev.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error("Remove error:", error);
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

  const pendingItems = wishlist.filter(item => !item.smoked);
  const completedItems = wishlist.filter(item => item.smoked);

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <FiArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-semibold flex items-center gap-2">
                <FiBookmark className="text-amber-500" />
                Want to Try
              </h1>
              <p className="text-xs text-gray-400">{pendingItems.length} brands on your list</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition-all text-sm font-medium"
          >
            <FiPlus size={16} />
            Add Brand
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 mb-6 border border-amber-500/20"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">📋</span>
            </div>
            <div>
              <h2 className="font-semibold text-amber-500 mb-1">Your Smoke Bucket List</h2>
              <p className="text-sm text-gray-400">
                Save brands you want to try. When you log a check-in for something on your list, 
                we&apos;ll celebrate your achievement! 🎉
              </p>
            </div>
          </div>
        </motion.div>

        {/* Add Form Modal */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
              onClick={() => setShowAddForm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#1a1a1a] rounded-2xl p-6"
              >
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <FiPlus className="text-amber-500" />
                  Add to Wishlist
                </h2>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Brand Name *</label>
                    <input
                      type="text"
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      placeholder="e.g., Padron 1964"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500 focus:outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Notes (optional)</label>
                    <textarea
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Why do you want to try this?"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500 focus:outline-none transition-all resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={adding || !newBrand.trim()}
                      className="flex-1 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-all disabled:opacity-50"
                    >
                      {adding ? "Adding..." : "Add to List"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {wishlist.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <span className="text-6xl mb-4 block">📝</span>
            <h3 className="text-xl font-semibold mb-2">Your wishlist is empty</h3>
            <p className="text-gray-400 mb-6">
              Start building your smoke bucket list!<br />
              Add brands you&apos;ve been wanting to try.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-all"
            >
              <FiPlus size={18} />
              Add Your First Brand
            </button>
          </motion.div>
        )}

        {/* Pending Items */}
        {pendingItems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
              <FiBookmark size={14} />
              Brands to Try ({pendingItems.length})
            </h2>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {pendingItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="glass rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <Link
                          href={`/cigar/${encodeURIComponent(item.brand)}`}
                          className="font-semibold text-lg hover:text-amber-500 transition-colors"
                        >
                          {item.brand}
                        </Link>
                        {item.notes && (
                          <p className="text-sm text-gray-400 mt-1">{item.notes}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Added {new Date(item.created_at * 1000).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/search?q=${encodeURIComponent(item.brand)}`}
                          className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-amber-500 transition-all"
                          title="Search check-ins"
                        >
                          <FiSearch size={18} />
                        </Link>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all"
                          title="Remove from list"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Completed Items */}
        {completedItems.length > 0 && (
          <div>
            <h2 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
              <FiCheck size={14} className="text-green-400" />
              Completed ({completedItems.length})
            </h2>
            <div className="space-y-3">
              {completedItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass rounded-xl p-4 border border-green-500/20"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <FiCheck className="text-green-400" />
                      </div>
                      <div>
                        <Link
                          href={`/cigar/${encodeURIComponent(item.brand)}`}
                          className="font-semibold hover:text-amber-500 transition-colors"
                        >
                          {item.brand}
                        </Link>
                        <p className="text-xs text-green-400">You&apos;ve tried this one! 🎉</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-all"
                      title="Remove from list"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Discover Prompt */}
        {wishlist.length > 0 && wishlist.length < 5 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"
          >
            <p className="text-sm text-blue-400">
              💡 <span className="font-medium">Tip:</span> Browse the{" "}
              <Link href="/discover" className="underline hover:no-underline">
                Discover page
              </Link>{" "}
              to find popular brands to add to your list!
            </p>
          </motion.div>
        )}
      </div>
    </main>
  );
}
