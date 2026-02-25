"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { FiHome, FiSearch, FiStar, FiArrowRight, FiTrendingUp } from "react-icons/fi";
import Link from "next/link";
import { DRINK_TAGS, getDrinkTag } from "@/lib/drinks";

interface DrinkStat {
  drink_id: string;
  count: number;
  unique_brands?: number;
  avg_rating: number | null;
}

interface BrandWithPairings {
  brand: string;
  pairing_count: number;
  unique_drinks: number;
  avg_rating: number | null;
}

interface PerfectPairing {
  brand: string;
  drink_id: string;
  count: number;
  avg_rating: number;
}

interface PairingGuideData {
  stats: {
    total_pairings: number;
    unique_drinks: number;
    unique_brands: number;
  };
  top_drinks: DrinkStat[];
  brands_with_data: BrandWithPairings[];
  perfect_pairings: PerfectPairing[];
  your_favorites: DrinkStat[];
}

interface BrandDetailData {
  brand: string;
  total_pairings: number;
  pairings: Array<{
    drink_id: string;
    count: number;
    percentage: number;
    avg_rating: number | null;
  }>;
}

interface DrinkDetailData {
  drink: string;
  total_smokes: number;
  unique_brands: number;
  brands: Array<{
    brand: string;
    count: number;
    avg_rating: number | null;
  }>;
}

function DrinkBadge({ drinkId, size = "md" }: { drinkId: string; size?: "sm" | "md" | "lg" }) {
  const drink = getDrinkTag(drinkId);
  if (!drink) return null;
  
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-2",
  };
  
  const bgColor = drink.category === 'coffee' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                  drink.category === 'alcohol' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                  'bg-gray-500/20 text-gray-400 border-gray-500/30';
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border ${bgColor} ${sizeClasses[size]}`}>
      {drink.emoji} {drink.name}
    </span>
  );
}

export default function PairingGuidePage() {
  const [data, setData] = useState<PairingGuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedDrink, setSelectedDrink] = useState<string | null>(null);
  const [brandDetail, setBrandDetail] = useState<BrandDetailData | null>(null);
  const [drinkDetail, setDrinkDetail] = useState<DrinkDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/pairing-guide");
        if (res.ok) {
          setData(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch pairing guide:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const loadBrandDetail = async (brand: string) => {
    setSelectedBrand(brand);
    setSelectedDrink(null);
    setDrinkDetail(null);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/pairing-guide?brand=${encodeURIComponent(brand)}`);
      if (res.ok) {
        setBrandDetail(await res.json());
      }
    } catch (error) {
      console.error("Failed to load brand detail:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const loadDrinkDetail = async (drinkId: string) => {
    setSelectedDrink(drinkId);
    setSelectedBrand(null);
    setBrandDetail(null);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/pairing-guide?drink=${encodeURIComponent(drinkId)}`);
      if (res.ok) {
        setDrinkDetail(await res.json());
      }
    } catch (error) {
      console.error("Failed to load drink detail:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const clearSelection = () => {
    setSelectedBrand(null);
    setSelectedDrink(null);
    setBrandDetail(null);
    setDrinkDetail(null);
  };

  // Filter drinks by search
  const filteredDrinks = DRINK_TAGS.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black p-4 pb-20">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <Link href="/dashboard" className="glass p-2 rounded-xl hover:bg-white/10 transition-colors">
          <FiHome className="text-xl" />
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          🥃 Pairing Guide
        </h1>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">Loading pairing data...</p>
        </div>
      ) : !data ? (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-gray-400">No pairing data available yet.</p>
          <p className="text-sm text-gray-500 mt-2">Start logging drinks with your smokes!</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-lg mx-auto">
          {/* Stats Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-5 bg-gradient-to-br from-purple-900/30 to-amber-900/20 border border-purple-500/30"
          >
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-400">{data.stats.total_pairings}</div>
                <div className="text-xs text-gray-400">Pairings Logged</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-400">{data.stats.unique_drinks}</div>
                <div className="text-xs text-gray-400">Drinks Tried</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-400">{data.stats.unique_brands}</div>
                <div className="text-xs text-gray-400">Brands Paired</div>
              </div>
            </div>
          </motion.div>

          {/* Detail View (if selected) */}
          {(selectedBrand || selectedDrink) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {selectedBrand ? `🚬 ${selectedBrand}` : selectedDrink && getDrinkTag(selectedDrink) ? `${getDrinkTag(selectedDrink)!.emoji} ${getDrinkTag(selectedDrink)!.name}` : ''}
                </h3>
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  ← Back
                </button>
              </div>

              {loadingDetail ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : brandDetail ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">
                    {brandDetail.total_pairings} pairings logged for this brand
                  </p>
                  {brandDetail.pairings.length === 0 ? (
                    <p className="text-gray-500 text-sm">No pairing data yet. Be the first!</p>
                  ) : (
                    <div className="space-y-2">
                      {brandDetail.pairings.map((p, i) => {
                        const drink = getDrinkTag(p.drink_id);
                        return (
                          <motion.div
                            key={p.drink_id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{drink?.emoji || '🥤'}</span>
                              <div>
                                <div className="font-medium">{drink?.name || p.drink_id}</div>
                                <div className="text-xs text-gray-400">{p.count} times ({p.percentage}%)</div>
                              </div>
                            </div>
                            {p.avg_rating && (
                              <div className="flex items-center gap-1 text-amber-400">
                                <FiStar size={14} />
                                <span className="text-sm">{p.avg_rating}</span>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : drinkDetail ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">
                    {drinkDetail.total_smokes} smokes with {drinkDetail.unique_brands} different brands
                  </p>
                  {drinkDetail.brands.length === 0 ? (
                    <p className="text-gray-500 text-sm">No pairings found. Try this drink!</p>
                  ) : (
                    <div className="space-y-2">
                      {drinkDetail.brands.map((b, i) => (
                        <motion.div
                          key={b.brand}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10"
                          onClick={() => loadBrandDetail(b.brand)}
                        >
                          <div>
                            <div className="font-medium">{b.brand}</div>
                            <div className="text-xs text-gray-400">{b.count} pairings</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {b.avg_rating && (
                              <div className="flex items-center gap-1 text-amber-400">
                                <FiStar size={14} />
                                <span className="text-sm">{b.avg_rating}</span>
                              </div>
                            )}
                            <FiArrowRight className="text-gray-500" size={14} />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </motion.div>
          )}

          {/* Main content (when no selection) */}
          {!selectedBrand && !selectedDrink && (
            <>
              {/* Your Favorites */}
              {data.your_favorites.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass rounded-2xl p-5"
                >
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    💜 Your Go-To Drinks
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {data.your_favorites.map((d) => {
                      const drink = getDrinkTag(d.drink_id);
                      return (
                        <button
                          key={d.drink_id}
                          onClick={() => loadDrinkDetail(d.drink_id)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 transition-colors"
                        >
                          <span>{drink?.emoji || '🥤'}</span>
                          <span className="text-sm">{drink?.name || d.drink_id}</span>
                          <span className="text-xs text-gray-400">×{d.count}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Perfect Pairings */}
              {data.perfect_pairings.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="glass rounded-2xl p-5"
                >
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    ⭐ Perfect Pairings
                    <span className="text-xs text-gray-400 font-normal">(Top Rated)</span>
                  </h3>
                  <div className="space-y-2">
                    {data.perfect_pairings.slice(0, 5).map((p, i) => {
                      const drink = getDrinkTag(p.drink_id);
                      return (
                        <motion.div
                          key={`${p.brand}-${p.drink_id}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + i * 0.05 }}
                          className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-purple-500/10 cursor-pointer hover:from-amber-500/20 hover:to-purple-500/20"
                          onClick={() => loadBrandDetail(p.brand)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{drink?.emoji || '🥤'}</span>
                            <div>
                              <div className="font-medium text-sm">{p.brand}</div>
                              <div className="text-xs text-gray-400">+ {drink?.name || p.drink_id}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-lg">
                            <FiStar className="text-amber-400" size={12} />
                            <span className="text-sm text-amber-400">{p.avg_rating}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Browse by Drink */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass rounded-2xl p-5"
              >
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  🔍 Browse by Drink
                </h3>
                
                {/* Search */}
                <div className="relative mb-4">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search drinks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500/50 focus:outline-none text-sm"
                  />
                </div>

                {/* Popular drinks */}
                {data.top_drinks.length > 0 && !searchQuery && (
                  <div className="mb-4">
                    <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                      <FiTrendingUp size={12} /> Most Popular
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {data.top_drinks.slice(0, 6).map((d) => {
                        const drink = getDrinkTag(d.drink_id);
                        return (
                          <button
                            key={d.drink_id}
                            onClick={() => loadDrinkDetail(d.drink_id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
                          >
                            <span>{drink?.emoji}</span>
                            <span>{drink?.name || d.drink_id}</span>
                            <span className="text-xs text-gray-500">({d.count})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* All drinks (or filtered) */}
                <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                  {(searchQuery ? filteredDrinks : DRINK_TAGS).map((drink) => (
                    <button
                      key={drink.id}
                      onClick={() => loadDrinkDetail(drink.id)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
                        drink.category === 'coffee' ? 'bg-amber-500/10 hover:bg-amber-500/20' :
                        drink.category === 'alcohol' ? 'bg-purple-500/10 hover:bg-purple-500/20' :
                        'bg-gray-500/10 hover:bg-gray-500/20'
                      }`}
                    >
                      <span className="text-2xl">{drink.emoji}</span>
                      <span className="text-xs text-center">{drink.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Brands with Pairing Data */}
              {data.brands_with_data.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="glass rounded-2xl p-5"
                >
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    🚬 Brands with Pairing Data
                  </h3>
                  <div className="space-y-2">
                    {data.brands_with_data.slice(0, 8).map((b, i) => (
                      <motion.div
                        key={b.brand}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10"
                        onClick={() => loadBrandDetail(b.brand)}
                      >
                        <div>
                          <div className="font-medium">{b.brand}</div>
                          <div className="text-xs text-gray-400">
                            {b.pairing_count} pairings • {b.unique_drinks} drinks
                          </div>
                        </div>
                        <FiArrowRight className="text-gray-500" />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center py-4"
              >
                <p className="text-sm text-gray-400 mb-2">
                  Pairing data grows with every check-in!
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-amber-500 text-white font-medium hover:opacity-90"
                >
                  Log a Smoke with Pairing
                </Link>
              </motion.div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
