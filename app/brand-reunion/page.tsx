"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiClock, FiStar, FiRepeat, FiHeart, FiPlus, FiCalendar } from "react-icons/fi";

interface MissedBrand {
  brand: string;
  lastSmokedAt: number;
  daysSince: number;
  totalSmokes: number;
  avgRating: number | null;
  bestRating: number | null;
  lastProduct: string | null;
  lastImageUrl: string | null;
}

interface BrandReunionResponse {
  missedBrands: MissedBrand[];
  stats: {
    totalBrands: number;
    oldestMiss: string | null;
    longestAway: number;
  };
}

function formatDaysAgo(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return "1 month ago";
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`;
}

function getMissLevel(days: number): { label: string; color: string; bgColor: string; emoji: string } {
  if (days >= 90) return { label: "Long Lost", color: "text-red-400", bgColor: "bg-red-500/20", emoji: "😢" };
  if (days >= 30) return { label: "Missing You", color: "text-orange-400", bgColor: "bg-orange-500/20", emoji: "🥺" };
  if (days >= 14) return { label: "It's Been a While", color: "text-amber-400", bgColor: "bg-amber-500/20", emoji: "🤔" };
  return { label: "Recent Memory", color: "text-yellow-400", bgColor: "bg-yellow-500/20", emoji: "💭" };
}

function BrandCard({ brand, index }: { brand: MissedBrand; index: number }) {
  const missLevel = getMissLevel(brand.daysSince);
  const router = useRouter();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass rounded-xl overflow-hidden"
    >
      {/* Image or Gradient Header */}
      <div className="relative h-24">
        {brand.lastImageUrl ? (
          <img 
            src={brand.lastImageUrl} 
            alt={brand.brand}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-900/50 to-orange-900/50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        
        {/* Miss Level Badge */}
        <div className={`absolute top-2 right-2 ${missLevel.bgColor} px-2 py-1 rounded-lg flex items-center gap-1`}>
          <span>{missLevel.emoji}</span>
          <span className={`text-xs font-medium ${missLevel.color}`}>{missLevel.label}</span>
        </div>
        
        {/* Brand Name */}
        <div className="absolute bottom-2 left-3 right-3">
          <h3 className="font-bold text-lg text-white truncate">{brand.brand}</h3>
          {brand.lastProduct && (
            <p className="text-gray-300 text-sm truncate">{brand.lastProduct}</p>
          )}
        </div>
      </div>
      
      {/* Stats */}
      <div className="p-4 space-y-3">
        {/* Last Smoked */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <FiClock size={14} />
            <span>Last smoked</span>
          </div>
          <span className={`font-medium ${missLevel.color}`}>{formatDaysAgo(brand.daysSince)}</span>
        </div>
        
        {/* Total Smokes */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <FiRepeat size={14} />
            <span>Times smoked</span>
          </div>
          <span className="text-white font-medium">{brand.totalSmokes}x</span>
        </div>
        
        {/* Rating */}
        {brand.avgRating && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <FiStar size={14} />
              <span>Your rating</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-amber-400 font-medium">{brand.avgRating}</span>
              <FiStar size={12} className="text-amber-400" fill="currentColor" />
              {brand.bestRating && brand.bestRating > brand.avgRating && (
                <span className="text-gray-500 text-xs">(best: {brand.bestRating})</span>
              )}
            </div>
          </div>
        )}
        
        {/* Action Button */}
        <Link 
          href={`/dashboard?brand=${encodeURIComponent(brand.brand)}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-lg font-medium transition-all mt-2"
        >
          <FiPlus size={16} />
          <span>Smoke Again</span>
        </Link>
      </div>
    </motion.div>
  );
}

export default function BrandReunionPage() {
  const [data, setData] = useState<BrandReunionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/brand-reunion")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((d) => {
        if (d && !d.error) setData(d);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

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
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <FiArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <span className="text-2xl">💔</span> Brand Reunion
              </h1>
              <p className="text-gray-400 text-sm">Brands waiting for you to come back</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Banner */}
        {data && data.stats.totalBrands > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-rose-500/20 via-pink-500/20 to-orange-500/20 rounded-xl p-4 border border-pink-500/30"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500/20 rounded-lg">
                  <FiHeart className="text-pink-400" size={20} />
                </div>
                <div>
                  <p className="text-gray-300 text-sm">You've tried</p>
                  <p className="text-white font-bold text-lg">{data.stats.totalBrands} brands total</p>
                </div>
              </div>
              {data.stats.oldestMiss && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <FiCalendar className="text-red-400" size={20} />
                  </div>
                  <div>
                    <p className="text-gray-300 text-sm">Longest absence</p>
                    <p className="text-white font-bold">{data.stats.longestAway} days from {data.stats.oldestMiss}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {data && data.missedBrands.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">All Caught Up!</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              You&apos;ve been smoking all your favorite brands recently. 
              Keep exploring and building your collection!
            </p>
            <Link 
              href="/discover"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-semibold hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              Discover New Brands →
            </Link>
          </motion.div>
        )}

        {/* Missed Brands Grid */}
        {data && data.missedBrands.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>🔄</span> Time for a Reunion
              </h2>
              <span className="text-gray-500 text-sm">{data.missedBrands.length} brands</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.missedBrands.map((brand, index) => (
                <BrandCard key={brand.brand} brand={brand} index={index} />
              ))}
            </div>
          </>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center pt-4"
        >
          <Link 
            href="/dashboard" 
            className="text-amber-400 hover:text-amber-300 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
