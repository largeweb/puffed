"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiHome,
  FiSearch,
  FiStar,
  FiUsers,
  FiHash,
  FiAward,
  FiShare2,
  FiArrowRight,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";
import { GiCigarette } from "react-icons/gi";

interface BrandStats {
  brand: string;
  total_checkins: number;
  unique_smokers: number;
  avg_rating: number;
  five_star_count: number;
  recent_image: string | null;
  top_product: string | null;
  flavors: string[];
  recent_reviews: Array<{
    username: string;
    rating: number;
    review: string | null;
    product: string | null;
  }>;
}

interface ComparisonData {
  brandA: BrandStats | null;
  brandB: BrandStats | null;
  winners: {
    more_popular: string | null;
    higher_rated: string | null;
    more_smokers: string | null;
    more_five_stars: string | null;
  };
}

interface BrandSuggestion {
  brand: string;
  count: number;
  avg_rating: number;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [brandA, setBrandA] = useState(searchParams.get("a") || "");
  const [brandB, setBrandB] = useState(searchParams.get("b") || "");
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Autocomplete state
  const [suggestionsA, setSuggestionsA] = useState<BrandSuggestion[]>([]);
  const [suggestionsB, setSuggestionsB] = useState<BrandSuggestion[]>([]);
  const [showSuggestionsA, setShowSuggestionsA] = useState(false);
  const [showSuggestionsB, setShowSuggestionsB] = useState(false);
  
  const debouncedA = useDebounce(brandA, 300);
  const debouncedB = useDebounce(brandB, 300);

  // Fetch brand suggestions
  const fetchSuggestions = useCallback(async (query: string, setSuggestions: (s: BrandSuggestion[]) => void) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/brands?q=${encodeURIComponent(query)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.brands || []);
      }
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions(debouncedA, setSuggestionsA);
  }, [debouncedA, fetchSuggestions]);

  useEffect(() => {
    fetchSuggestions(debouncedB, setSuggestionsB);
  }, [debouncedB, fetchSuggestions]);

  // Load comparison from URL params
  useEffect(() => {
    const a = searchParams.get("a");
    const b = searchParams.get("b");
    if (a && b) {
      setBrandA(a);
      setBrandB(b);
      loadComparison(a, b);
    }
  }, [searchParams]);

  const loadComparison = async (a: string, b: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Comparison failed");
        setComparison(null);
      } else {
        const data = await res.json();
        setComparison(data);
      }
    } catch {
      setError("Failed to load comparison");
      setComparison(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = () => {
    if (!brandA.trim() || !brandB.trim()) {
      setError("Please select two brands to compare");
      return;
    }
    router.push(`/compare?a=${encodeURIComponent(brandA.trim())}&b=${encodeURIComponent(brandB.trim())}`);
  };

  const handleSwap = () => {
    const tempA = brandA;
    setBrandA(brandB);
    setBrandB(tempA);
    if (comparison) {
      router.push(`/compare?a=${encodeURIComponent(brandB)}&b=${encodeURIComponent(brandA)}`);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: `${comparison?.brandA?.brand} vs ${comparison?.brandB?.brand} - Puffed`,
        text: `Compare ${comparison?.brandA?.brand} and ${comparison?.brandB?.brand} on Puffed!`,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  const selectSuggestion = (brand: string, field: "a" | "b") => {
    if (field === "a") {
      setBrandA(brand);
      setShowSuggestionsA(false);
    } else {
      setBrandB(brand);
      setShowSuggestionsB(false);
    }
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <FiStar
            key={i}
            className={
              i < fullStars
                ? "fill-amber-400 text-amber-400"
                : i === fullStars && hasHalf
                ? "fill-amber-400/50 text-amber-400"
                : "text-amber-400/30"
            }
            size={14}
          />
        ))}
      </div>
    );
  };

  const renderBrandCard = (stats: BrandStats | null, isWinner: (category: string) => boolean, side: "left" | "right") => {
    if (!stats) {
      return (
        <div className="flex-1 p-4 bg-stone-800/30 rounded-xl border border-amber-900/20 text-center">
          <GiCigarette className="mx-auto text-amber-400/30 mb-2" size={40} />
          <p className="text-amber-200/60">Brand not found</p>
        </div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, x: side === "left" ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 space-y-4"
      >
        {/* Brand Header */}
        <Link href={`/cigar/${encodeURIComponent(stats.brand)}`}>
          <div className="p-4 bg-stone-800/50 rounded-xl border border-amber-900/30 hover:border-amber-700/50 transition-colors">
            {stats.recent_image ? (
              <img
                src={stats.recent_image}
                alt={stats.brand}
                className="w-full h-32 object-cover rounded-lg mb-3"
              />
            ) : (
              <div className="w-full h-32 bg-gradient-to-br from-amber-800/50 to-amber-950/50 rounded-lg mb-3 flex items-center justify-center">
                <GiCigarette className="text-amber-400/40" size={40} />
              </div>
            )}
            <h3 className="text-lg font-bold text-amber-100 text-center">{stats.brand}</h3>
            {stats.top_product && (
              <p className="text-sm text-amber-200/60 text-center">Top: {stats.top_product}</p>
            )}
          </div>
        </Link>

        {/* Stats */}
        <div className="space-y-3">
          {/* Rating */}
          <div className={`p-3 rounded-lg ${isWinner("higher_rated") ? "bg-green-900/30 border border-green-500/30" : "bg-stone-800/30 border border-amber-900/20"}`}>
            <div className="flex items-center justify-between">
              <span className="text-amber-200/70 text-sm flex items-center gap-2">
                <FiStar className="text-amber-400" size={14} />
                Rating
              </span>
              {isWinner("higher_rated") && <FiAward className="text-green-400" size={16} />}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {renderStars(stats.avg_rating)}
              <span className="text-amber-100 font-bold">{stats.avg_rating.toFixed(1)}</span>
            </div>
          </div>

          {/* Check-ins */}
          <div className={`p-3 rounded-lg ${isWinner("more_popular") ? "bg-green-900/30 border border-green-500/30" : "bg-stone-800/30 border border-amber-900/20"}`}>
            <div className="flex items-center justify-between">
              <span className="text-amber-200/70 text-sm flex items-center gap-2">
                <FiHash className="text-amber-400" size={14} />
                Check-ins
              </span>
              {isWinner("more_popular") && <FiAward className="text-green-400" size={16} />}
            </div>
            <p className="text-amber-100 font-bold text-lg mt-1">{stats.total_checkins}</p>
          </div>

          {/* Smokers */}
          <div className={`p-3 rounded-lg ${isWinner("more_smokers") ? "bg-green-900/30 border border-green-500/30" : "bg-stone-800/30 border border-amber-900/20"}`}>
            <div className="flex items-center justify-between">
              <span className="text-amber-200/70 text-sm flex items-center gap-2">
                <FiUsers className="text-amber-400" size={14} />
                Unique Smokers
              </span>
              {isWinner("more_smokers") && <FiAward className="text-green-400" size={16} />}
            </div>
            <p className="text-amber-100 font-bold text-lg mt-1">{stats.unique_smokers}</p>
          </div>

          {/* Five Stars */}
          <div className={`p-3 rounded-lg ${isWinner("more_five_stars") ? "bg-green-900/30 border border-green-500/30" : "bg-stone-800/30 border border-amber-900/20"}`}>
            <div className="flex items-center justify-between">
              <span className="text-amber-200/70 text-sm flex items-center gap-2">
                ⭐ 5-Star Reviews
              </span>
              {isWinner("more_five_stars") && <FiAward className="text-green-400" size={16} />}
            </div>
            <p className="text-amber-100 font-bold text-lg mt-1">{stats.five_star_count}</p>
          </div>

          {/* Flavors */}
          {stats.flavors.length > 0 && (
            <div className="p-3 rounded-lg bg-stone-800/30 border border-amber-900/20">
              <span className="text-amber-200/70 text-sm">Flavor Profile</span>
              <div className="flex flex-wrap gap-1 mt-2">
                {stats.flavors.map((f) => (
                  <Link
                    key={f}
                    href={`/flavor/${encodeURIComponent(f.toLowerCase())}`}
                    className="px-2 py-1 bg-amber-700/30 rounded text-xs text-amber-200 hover:bg-amber-600/40"
                  >
                    {f}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Reviews */}
          {stats.recent_reviews.length > 0 && (
            <div className="p-3 rounded-lg bg-stone-800/30 border border-amber-900/20">
              <span className="text-amber-200/70 text-sm">Recent Reviews</span>
              <div className="space-y-2 mt-2">
                {stats.recent_reviews.slice(0, 2).map((r, i) => (
                  <div key={i} className="text-xs">
                    <div className="flex items-center gap-2">
                      <Link href={`/user/${r.username}`} className="text-amber-400 hover:underline">
                        @{r.username}
                      </Link>
                      {renderStars(r.rating)}
                    </div>
                    {r.review && (
                      <p className="text-amber-200/60 mt-1 line-clamp-2">{r.review}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const isWinnerA = (category: keyof ComparisonData["winners"]) => {
    return comparison?.brandA && comparison.winners[category] === comparison.brandA.brand;
  };

  const isWinnerB = (category: keyof ComparisonData["winners"]) => {
    return comparison?.brandB && comparison.winners[category] === comparison.brandB.brand;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-black text-amber-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-stone-900/90 backdrop-blur-sm border-b border-amber-900/30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="text-amber-400 hover:text-amber-300">
            <FiHome size={24} />
          </Link>
          <h1 className="text-xl font-bold text-amber-100 flex items-center gap-2">
            🆚 Compare Brands
          </h1>
          <Link href="/search" className="text-amber-400 hover:text-amber-300">
            <FiSearch size={24} />
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Selection UI */}
        <div className="bg-stone-800/50 rounded-xl border border-amber-900/30 p-4 space-y-4">
          <div className="flex items-center gap-2">
            {/* Brand A Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={brandA}
                onChange={(e) => {
                  setBrandA(e.target.value);
                  setShowSuggestionsA(true);
                }}
                onFocus={() => setShowSuggestionsA(true)}
                onBlur={() => setTimeout(() => setShowSuggestionsA(false), 200)}
                placeholder="First brand..."
                className="w-full px-4 py-3 bg-stone-700/50 border border-amber-900/30 rounded-lg text-amber-50 placeholder-amber-400/40 focus:outline-none focus:border-amber-500/50"
              />
              {brandA && (
                <button
                  onClick={() => setBrandA("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400/60 hover:text-amber-400"
                >
                  <FiX size={16} />
                </button>
              )}
              {showSuggestionsA && suggestionsA.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-stone-800 border border-amber-900/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {suggestionsA.map((s) => (
                    <button
                      key={s.brand}
                      onClick={() => selectSuggestion(s.brand, "a")}
                      className="w-full px-4 py-2 text-left hover:bg-amber-900/30 text-amber-100 flex items-center justify-between"
                    >
                      <span>{s.brand}</span>
                      <span className="text-xs text-amber-400/60">{s.count} check-ins</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Swap Button */}
            <button
              onClick={handleSwap}
              className="p-3 bg-amber-700/30 rounded-lg text-amber-400 hover:bg-amber-600/40 transition-colors"
              title="Swap brands"
            >
              <FiRefreshCw size={18} />
            </button>

            {/* Brand B Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={brandB}
                onChange={(e) => {
                  setBrandB(e.target.value);
                  setShowSuggestionsB(true);
                }}
                onFocus={() => setShowSuggestionsB(true)}
                onBlur={() => setTimeout(() => setShowSuggestionsB(false), 200)}
                placeholder="Second brand..."
                className="w-full px-4 py-3 bg-stone-700/50 border border-amber-900/30 rounded-lg text-amber-50 placeholder-amber-400/40 focus:outline-none focus:border-amber-500/50"
              />
              {brandB && (
                <button
                  onClick={() => setBrandB("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400/60 hover:text-amber-400"
                >
                  <FiX size={16} />
                </button>
              )}
              {showSuggestionsB && suggestionsB.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-stone-800 border border-amber-900/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {suggestionsB.map((s) => (
                    <button
                      key={s.brand}
                      onClick={() => selectSuggestion(s.brand, "b")}
                      className="w-full px-4 py-2 text-left hover:bg-amber-900/30 text-amber-100 flex items-center justify-between"
                    >
                      <span>{s.brand}</span>
                      <span className="text-xs text-amber-400/60">{s.count} check-ins</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Compare Button */}
          <button
            onClick={handleCompare}
            disabled={!brandA.trim() || !brandB.trim() || loading}
            className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 rounded-lg font-semibold text-white flex items-center justify-center gap-2 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>Compare</span>
                <FiArrowRight size={18} />
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-lg text-red-200 text-center">
            {error}
          </div>
        )}

        {/* Comparison Results */}
        {comparison && (
          <>
            {/* Share Button */}
            <div className="flex justify-end">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-stone-800/50 rounded-lg text-amber-400 hover:bg-stone-700/50 transition-colors"
              >
                <FiShare2 size={16} />
                Share Comparison
              </button>
            </div>

            {/* VS Header */}
            <div className="text-center">
              <div className="inline-flex items-center gap-4 px-6 py-3 bg-gradient-to-r from-amber-900/50 via-stone-800/50 to-amber-900/50 rounded-full border border-amber-700/30">
                <span className="text-amber-100 font-semibold">{comparison.brandA?.brand || "?"}</span>
                <span className="text-2xl">🆚</span>
                <span className="text-amber-100 font-semibold">{comparison.brandB?.brand || "?"}</span>
              </div>
            </div>

            {/* Side by Side Comparison */}
            <div className="flex gap-4">
              {renderBrandCard(comparison.brandA, isWinnerA, "left")}
              {renderBrandCard(comparison.brandB, isWinnerB, "right")}
            </div>

            {/* Winner Summary */}
            {comparison.brandA && comparison.brandB && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gradient-to-r from-amber-900/30 to-stone-800/30 rounded-xl border border-amber-700/30 text-center"
              >
                <h3 className="text-lg font-semibold text-amber-100 mb-2">Summary</h3>
                <div className="flex flex-wrap justify-center gap-3 text-sm">
                  {Object.entries(comparison.winners).map(([key, winner]) => {
                    if (!winner) return null;
                    const labels: Record<string, string> = {
                      more_popular: "More Popular",
                      higher_rated: "Higher Rated",
                      more_smokers: "More Fans",
                      more_five_stars: "More 5-Stars",
                    };
                    return (
                      <span
                        key={key}
                        className="px-3 py-1 bg-green-900/40 rounded-full text-green-300 border border-green-500/30"
                      >
                        {labels[key]}: <strong>{winner}</strong>
                      </span>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Empty State */}
        {!comparison && !loading && !error && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🆚</div>
            <p className="text-amber-200/70 text-lg">Select two brands to compare</p>
            <p className="text-amber-400/50 text-sm mt-1">
              See ratings, popularity, flavors, and more side by side
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-amber-500 border-t-transparent" />
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}
