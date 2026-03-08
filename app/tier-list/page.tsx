"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiStar, FiShare2, FiRefreshCw, FiX, FiChevronDown, FiChevronUp, FiMenu } from "react-icons/fi";
import MobileSidebar from "@/app/components/MobileSidebar";
import { useSidebar } from "@/hooks/useSidebar";

interface TierListItem {
  brand: string;
  avgRating: number;
  checkinCount: number;
  lastSmoked: number;
  imageUrl: string | null;
}

interface TierListData {
  brands: TierListItem[];
  savedTiers: Record<string, string>;
  stats: {
    totalBrands: number;
    totalCheckins: number;
    tierBreakdown: Record<string, number>;
  };
}

const TIERS = [
  { id: 'S', label: 'S', color: 'from-amber-500 to-yellow-500', bgColor: 'bg-amber-500/20', borderColor: 'border-amber-500/50', textColor: 'text-amber-400', description: 'God Tier' },
  { id: 'A', label: 'A', color: 'from-green-500 to-emerald-500', bgColor: 'bg-green-500/20', borderColor: 'border-green-500/50', textColor: 'text-green-400', description: 'Excellent' },
  { id: 'B', label: 'B', color: 'from-blue-500 to-cyan-500', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/50', textColor: 'text-blue-400', description: 'Good' },
  { id: 'C', label: 'C', color: 'from-purple-500 to-violet-500', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/50', textColor: 'text-purple-400', description: 'Average' },
  { id: 'D', label: 'D', color: 'from-orange-500 to-red-500', bgColor: 'bg-orange-500/20', borderColor: 'border-orange-500/50', textColor: 'text-orange-400', description: 'Below Average' },
  { id: 'F', label: 'F', color: 'from-red-600 to-red-800', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/50', textColor: 'text-red-400', description: 'Never Again' },
];

function BrandChip({ 
  item, 
  onRemove,
  compact = false 
}: { 
  item: TierListItem; 
  onRemove?: () => void;
  compact?: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`glass rounded-lg ${compact ? 'px-2 py-1' : 'px-3 py-2'} flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-all group`}
    >
      {item.imageUrl && !compact && (
        <img src={item.imageUrl} alt="" className="w-6 h-6 rounded object-cover" />
      )}
      <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium truncate max-w-[120px]`}>
        {item.brand}
      </span>
      <div className="flex items-center gap-1 text-amber-500">
        <FiStar size={compact ? 10 : 12} fill="currentColor" />
        <span className={`${compact ? 'text-[10px]' : 'text-xs'}`}>{item.avgRating}</span>
      </div>
      {onRemove && (
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/20 rounded transition-all"
        >
          <FiX size={12} className="text-red-400" />
        </button>
      )}
    </motion.div>
  );
}

export default function TierListPage() {
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen, currentUser, unreadCount, handleLogout } = useSidebar();
  const [data, setData] = useState<TierListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<Record<string, string[]>>({
    S: [], A: [], B: [], C: [], D: [], F: []
  });
  const [unranked, setUnranked] = useState<TierListItem[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<TierListItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [showUnranked, setShowUnranked] = useState(true);

  useEffect(() => {
    loadTierList();
  }, []);

  const loadTierList = async () => {
    try {
      const res = await fetch("/api/tier-list");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json: TierListData = await res.json();
      setData(json);

      // Organize brands into tiers
      const newTiers: Record<string, string[]> = { S: [], A: [], B: [], C: [], D: [], F: [] };
      const unrankedBrands: TierListItem[] = [];

      for (const brand of json.brands) {
        const tier = json.savedTiers[brand.brand];
        if (tier && newTiers[tier]) {
          newTiers[tier].push(brand.brand);
        } else {
          unrankedBrands.push(brand);
        }
      }

      setTiers(newTiers);
      setUnranked(unrankedBrands);
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const assignToTier = async (brand: string, tier: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/tier-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, tier }),
      });

      if (res.ok) {
        // Update local state
        const newTiers = { ...tiers };
        
        // Remove from all tiers first
        for (const t of Object.keys(newTiers)) {
          newTiers[t] = newTiers[t].filter(b => b !== brand);
        }

        // Add to new tier
        if (tier && newTiers[tier]) {
          newTiers[tier].push(brand);
        }

        setTiers(newTiers);
        
        // Remove from unranked
        setUnranked(prev => prev.filter(b => b.brand !== brand));
        
        setSelectedBrand(null);
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const removeFromTier = async (brand: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/tier-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, tier: null }),
      });

      if (res.ok && data) {
        // Remove from tiers
        const newTiers = { ...tiers };
        for (const t of Object.keys(newTiers)) {
          newTiers[t] = newTiers[t].filter(b => b !== brand);
        }
        setTiers(newTiers);

        // Add back to unranked
        const brandData = data.brands.find(b => b.brand === brand);
        if (brandData) {
          setUnranked(prev => [...prev, brandData]);
        }
      }
    } catch (error) {
      console.error("Remove error:", error);
    } finally {
      setSaving(false);
    }
  };

  const getBrandData = (brand: string): TierListItem | null => {
    return data?.brands.find(b => b.brand === brand) || null;
  };

  const handleShare = async () => {
    const tierText = TIERS.map(t => {
      const brands = tiers[t.id];
      if (brands.length === 0) return null;
      return `${t.label}: ${brands.join(', ')}`;
    }).filter(Boolean).join('\n');

    const shareText = `🎮 My Smoke Tier List\n\n${tierText}\n\nMade with Puffed 🚬`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "My Smoke Tier List", text: shareText });
        setShareStatus("Shared!");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          copyToClipboard(shareText);
        }
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShareStatus("Copied!");
      setTimeout(() => setShareStatus(null), 2000);
    } catch {
      setShareStatus("Failed");
      setTimeout(() => setShareStatus(null), 2000);
    }
  };

  const totalRanked = Object.values(tiers).flat().length;

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
    <>
      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        username={currentUser}
        unreadCount={unreadCount}
        onLogout={handleLogout}
      />
    <main className="min-h-screen p-4 pb-24 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg glass hover:bg-white/10">
              <FiMenu size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                🎮 Brand Tier List
              </h1>
              <p className="text-gray-400 text-sm">Rank your brands from S to F</p>
            </div>
          </div>
          <button
            onClick={handleShare}
            className="relative p-2 rounded-lg glass hover:bg-white/10 text-gray-400 hover:text-amber-400"
          >
            <FiShare2 />
            {shareStatus && (
              <span className="absolute -bottom-8 right-0 text-xs bg-green-500 text-black px-2 py-0.5 rounded whitespace-nowrap">
                {shareStatus}
              </span>
            )}
          </button>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-xl p-4 mb-6"
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-amber-500">{totalRanked}</div>
              <div className="text-xs text-gray-400">Ranked</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">{unranked.length}</div>
              <div className="text-xs text-gray-400">Unranked</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{data?.stats.totalBrands || 0}</div>
              <div className="text-xs text-gray-400">Total Brands</div>
            </div>
          </div>
        </motion.div>

        {/* Tier Rows */}
        <div className="space-y-2 mb-6">
          {TIERS.map((tier, idx) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`glass rounded-xl overflow-hidden border ${tier.borderColor}`}
            >
              <div className="flex">
                {/* Tier Label */}
                <div className={`w-16 flex-shrink-0 flex flex-col items-center justify-center py-3 bg-gradient-to-br ${tier.color}`}>
                  <span className="text-2xl font-black text-white">{tier.label}</span>
                  <span className="text-[10px] text-white/70">{tier.description}</span>
                </div>

                {/* Brands in tier */}
                <div className="flex-1 p-2 min-h-[60px] flex flex-wrap gap-2 items-center">
                  <AnimatePresence mode="popLayout">
                    {tiers[tier.id].map(brand => {
                      const brandData = getBrandData(brand);
                      if (!brandData) return null;
                      return (
                        <BrandChip 
                          key={brand} 
                          item={brandData} 
                          onRemove={() => removeFromTier(brand)}
                        />
                      );
                    })}
                  </AnimatePresence>
                  {tiers[tier.id].length === 0 && (
                    <span className="text-sm text-gray-500 italic">
                      Tap a brand below to add
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Unranked Brands */}
        {unranked.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-xl p-4"
          >
            <button
              onClick={() => setShowUnranked(!showUnranked)}
              className="w-full flex items-center justify-between mb-3"
            >
              <h3 className="text-sm font-semibold text-gray-400">
                📦 Unranked Brands ({unranked.length})
              </h3>
              {showUnranked ? <FiChevronUp /> : <FiChevronDown />}
            </button>

            <AnimatePresence>
              {showUnranked && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2">
                    {unranked.map(item => (
                      <div key={item.brand} onClick={() => setSelectedBrand(item)}>
                        <BrandChip item={item} compact />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* No brands message */}
        {data?.brands.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Log some smokes first to build your tier list!</p>
            <Link
              href="/dashboard"
              className="inline-flex px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-semibold"
            >
              Log a Smoke →
            </Link>
          </div>
        )}

        {/* Tier Selection Modal */}
        <AnimatePresence>
          {selectedBrand && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedBrand(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="glass rounded-2xl p-6 max-w-sm w-full"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold mb-2">Rank "{selectedBrand.brand}"</h3>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                  <FiStar className="text-amber-500" fill="currentColor" />
                  <span>{selectedBrand.avgRating} avg</span>
                  <span>•</span>
                  <span>{selectedBrand.checkinCount} check-ins</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {TIERS.map(tier => (
                    <button
                      key={tier.id}
                      onClick={() => assignToTier(selectedBrand.brand, tier.id)}
                      disabled={saving}
                      className={`py-3 rounded-xl font-bold text-xl bg-gradient-to-br ${tier.color} hover:scale-105 transition-all disabled:opacity-50`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setSelectedBrand(null)}
                  className="w-full mt-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
    </>
  );
}
