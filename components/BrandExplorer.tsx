"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiCompass, FiStar, FiTrendingUp, FiChevronRight } from "react-icons/fi";
import Link from "next/link";
import { getFlavorTag } from "@/lib/flavors";

interface ExplorerBrand {
  brand: string;
  totalCheckins: number;
  avgRating: number;
  matchingFlavors: string[];
  topProduct?: string;
  recentReview?: string;
}

interface BrandExplorerResponse {
  brands?: ExplorerBrand[];
  userTopFlavors?: string[];
  error?: string;
}

export default function BrandExplorer() {
  const [brands, setBrands] = useState<ExplorerBrand[]>([]);
  const [userFlavors, setUserFlavors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBrands() {
      try {
        const res = await fetch("/api/brand-explorer");
        const data: BrandExplorerResponse = await res.json();
        if (data.brands && data.brands.length > 0) {
          setBrands(data.brands);
        }
        if (data.userTopFlavors) {
          setUserFlavors(data.userTopFlavors);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadBrands();
  }, []);

  if (loading) {
    return (
      <div className="bg-zinc-900/60 rounded-xl p-4 animate-pulse">
        <div className="h-6 bg-zinc-800 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-zinc-800 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (brands.length === 0) {
    return null; // Don't render if no suggestions
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-emerald-900/40 to-zinc-900/60 rounded-xl p-4 border border-emerald-800/30"
    >
      <div className="flex items-center gap-2 mb-3">
        <FiCompass className="text-emerald-400" size={20} />
        <h3 className="text-lg font-semibold text-white">Brands to Explore</h3>
      </div>
      
      {userFlavors.length > 0 && (
        <p className="text-sm text-zinc-400 mb-4">
          Based on your love for{" "}
          {userFlavors.slice(0, 3).map((f, i) => {
            const tag = getFlavorTag(f);
            return (
              <span key={f}>
                {i > 0 && (i === userFlavors.slice(0, 3).length - 1 ? " & " : ", ")}
                <span className="text-emerald-400">
                  {tag?.emoji} {tag?.label || f}
                </span>
              </span>
            );
          })}
        </p>
      )}

      <div className="space-y-3">
        {brands.slice(0, 4).map((brand, index) => (
          <motion.div
            key={brand.brand}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link
              href={`/brand/${encodeURIComponent(brand.brand)}`}
              className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800/80 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white truncate">
                    {brand.brand}
                  </span>
                  {brand.matchingFlavors.length > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                      {brand.matchingFlavors.length} flavor match
                      {brand.matchingFlavors.length > 1 ? "es" : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400">
                  <span className="flex items-center gap-1">
                    <FiStar className="text-amber-400" size={14} />
                    {brand.avgRating.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-1">
                    <FiTrendingUp size={14} />
                    {brand.totalCheckins} check-in{brand.totalCheckins !== 1 ? "s" : ""}
                  </span>
                </div>
                {brand.matchingFlavors.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {brand.matchingFlavors.slice(0, 3).map((f) => {
                      const tag = getFlavorTag(f);
                      return (
                        <span
                          key={f}
                          className="text-xs px-1.5 py-0.5 bg-zinc-700/50 rounded text-zinc-300"
                        >
                          {tag?.emoji} {tag?.label || f}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <FiChevronRight
                className="text-zinc-500 group-hover:text-emerald-400 transition-colors flex-shrink-0 ml-2"
                size={20}
              />
            </Link>
          </motion.div>
        ))}
      </div>

      <Link
        href="/discover"
        className="flex items-center justify-center gap-2 mt-4 py-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        <span>Discover more brands</span>
        <FiChevronRight size={16} />
      </Link>
    </motion.div>
  );
}
