"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiPlus, FiTrash2, FiEdit2, FiPackage, FiDollarSign, FiClock, FiMinus } from "react-icons/fi";
import type { MeResponse } from "@/lib/types";

interface HumidorItem {
  id: string;
  brand: string;
  product: string | null;
  quantity: number;
  purchase_date: number | null;
  purchase_price: number | null;
  aging_since: number | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

interface HumidorStats {
  totalCigars: number;
  uniqueBrands: number;
  totalValue: number;
  agingCigars: number;
  oldestAgingDays: number | null;
  oldestAgingBrand: string | null;
}

export default function HumidorPage() {
  const [items, setItems] = useState<HumidorItem[]>([]);
  const [stats, setStats] = useState<HumidorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    brand: "",
    product: "",
    quantity: 1,
    purchasePrice: "",
    agingSince: false,
    notes: ""
  });
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  const loadData = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      const authData: MeResponse = await authRes.json();
      
      if (!authData.user) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/humidor");
      const data = await res.json() as { items?: HumidorItem[]; stats?: HumidorStats };
      setItems(data.items || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error("Load error:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand.trim() || adding) return;

    setAdding(true);
    try {
      const res = await fetch("/api/humidor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: formData.brand,
          product: formData.product || null,
          quantity: formData.quantity,
          purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
          agingSince: formData.agingSince ? Math.floor(Date.now() / 1000) : null,
          notes: formData.notes || null
        }),
      });

      if (res.ok) {
        setFormData({ brand: "", product: "", quantity: 1, purchasePrice: "", agingSince: false, notes: "" });
        setShowAddForm(false);
        loadData();
      }
    } catch (error) {
      console.error("Add error:", error);
    } finally {
      setAdding(false);
    }
  };

  const handleSmoke = async (item: HumidorItem) => {
    try {
      const res = await fetch("/api/humidor/smoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, quantity: 1 }),
      });

      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error("Smoke error:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/humidor?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== id));
        loadData();
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleQuantityUpdate = async (id: string, newQuantity: number) => {
    try {
      const res = await fetch("/api/humidor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, quantity: newQuantity }),
      });

      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  const formatAgingDays = (agingSince: number | null): string => {
    if (!agingSince) return "";
    const days = Math.floor((Date.now() / 1000 - agingSince) / 86400);
    if (days < 30) return `${days}d`;
    if (days < 365) return `${Math.floor(days / 30)}mo`;
    return `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}mo`;
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
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <FiArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-semibold flex items-center gap-2">
                <span className="text-xl">🗄️</span>
                My Humidor
              </h1>
              <p className="text-xs text-gray-400">{stats?.totalCigars || 0} cigars in stock</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition-all text-sm font-medium"
          >
            <FiPlus size={16} />
            Add Cigars
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Stats Banner */}
        {stats && stats.totalCigars > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-5 mb-6 border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/10"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-500">{stats.totalCigars}</div>
                <div className="text-xs text-gray-400">Total Cigars</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{stats.uniqueBrands}</div>
                <div className="text-xs text-gray-400">Brands</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {stats.totalValue > 0 ? `$${stats.totalValue.toFixed(0)}` : '-'}
                </div>
                <div className="text-xs text-gray-400">Est. Value</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">{stats.agingCigars}</div>
                <div className="text-xs text-gray-400">Aging</div>
              </div>
            </div>
            {stats.oldestAgingBrand && stats.oldestAgingDays && (
              <div className="mt-4 pt-4 border-t border-white/10 text-center">
                <span className="text-sm text-gray-400">
                  🕰️ Oldest aging: <span className="text-amber-400">{stats.oldestAgingBrand}</span> ({stats.oldestAgingDays} days)
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Add Form Modal */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
              onClick={() => setShowAddForm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md glass rounded-2xl p-6 border border-white/10"
              >
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FiPackage className="text-amber-500" />
                  Add to Humidor
                </h2>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Brand *</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder="e.g. Padron"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Vitola / Product</label>
                    <input
                      type="text"
                      value={formData.product}
                      onChange={(e) => setFormData(prev => ({ ...prev, product: e.target.value }))}
                      placeholder="e.g. 1964 Anniversary Maduro"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Quantity</label>
                      <input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                        min="1"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Price (each)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          value={formData.purchasePrice}
                          onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: e.target.value }))}
                          step="0.01"
                          placeholder="0.00"
                          className="w-full pl-7 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.agingSince}
                      onChange={(e) => setFormData(prev => ({ ...prev, agingSince: e.target.checked }))}
                      className="w-5 h-5 rounded border-white/10 bg-white/5 text-amber-500 focus:ring-amber-500/50"
                    />
                    <span className="text-sm">
                      <FiClock className="inline mr-1 text-purple-400" />
                      Start aging timer
                    </span>
                  </label>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any notes about this cigar..."
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none resize-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={adding || !formData.brand.trim()}
                      className="flex-1 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-medium transition-all disabled:opacity-50"
                    >
                      {adding ? "Adding..." : "Add to Humidor"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {items.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4">🗄️</div>
            <h2 className="text-xl font-semibold mb-2">Your Humidor is Empty</h2>
            <p className="text-gray-400 mb-6">
              Track your cigar inventory, aging, and value.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-medium transition-all"
            >
              Add Your First Cigars
            </button>
          </motion.div>
        )}

        {/* Items List */}
        <div className="space-y-3">
          <AnimatePresence>
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-4 border border-white/5 hover:border-amber-500/20 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link href={`/cigar/${encodeURIComponent(item.brand)}`}>
                      <h3 className="font-semibold hover:text-amber-500 transition-colors truncate">
                        {item.brand}
                      </h3>
                    </Link>
                    {item.product && (
                      <p className="text-sm text-gray-400 truncate">{item.product}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">
                        {item.quantity}x in stock
                      </span>
                      {item.purchase_price && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                          <FiDollarSign className="inline" size={10} />
                          {item.purchase_price.toFixed(2)} each
                        </span>
                      )}
                      {item.aging_since && (
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                          <FiClock className="inline mr-1" size={10} />
                          {formatAgingDays(item.aging_since)} aged
                        </span>
                      )}
                    </div>
                    {item.notes && (
                      <p className="text-xs text-gray-500 mt-2 italic">&quot;{item.notes}&quot;</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Quick quantity controls */}
                    <button
                      onClick={() => handleQuantityUpdate(item.id, item.quantity + 1)}
                      className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-green-400 transition-all"
                      title="Add one"
                    >
                      <FiPlus size={16} />
                    </button>
                    <button
                      onClick={() => handleSmoke(item)}
                      disabled={item.quantity <= 0}
                      className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-amber-400 transition-all disabled:opacity-30"
                      title="Smoke one"
                    >
                      <FiMinus size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-all"
                      title="Remove"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Footer Info */}
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center text-sm text-gray-500"
          >
            <p>💡 Tip: Use <FiMinus className="inline" /> to mark a cigar as smoked</p>
            <p className="mt-1">
              <Link href="/checkin" className="text-amber-500 hover:underline">
                Log a check-in
              </Link>
              {" "}to track your experience!
            </p>
          </motion.div>
        )}
      </div>
    </main>
  );
}
