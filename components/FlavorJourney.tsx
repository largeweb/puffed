"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FLAVOR_TAGS, getFlavorTag } from "@/lib/flavors";

interface FlavorCount {
  id: string;
  count: number;
}

interface FlavorJourneyData {
  topFlavors: FlavorCount[];
  totalCheckins: number;
  checkinsWithFlavors: number;
  unexploredFlavors: string[];
  recentFlavors: string[];
  flavorDiversity: number;
}

export default function FlavorJourney() {
  const [data, setData] = useState<FlavorJourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/my-flavor-journey");
      if (res.ok) {
        const json: FlavorJourneyData = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Flavor journey error:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl p-4 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
        <div className="h-12 bg-white/10 rounded" />
      </div>
    );
  }

  // Don't show if user has no check-ins with flavors
  if (!data || data.checkinsWithFlavors === 0) {
    return null;
  }

  const maxCount = data.topFlavors[0]?.count || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎨</span>
          <div>
            <h3 className="font-semibold text-sm">Your Flavor Journey</h3>
            <p className="text-xs text-gray-400">
              {data.flavorDiversity}% of flavors explored
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
        >
          {expanded ? "Less" : "More"}
        </button>
      </div>

      {/* Diversity Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${data.flavorDiversity}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-full"
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-500">
          <span>Beginner</span>
          <span>Explorer</span>
          <span>Connoisseur</span>
        </div>
      </div>

      {/* Top Flavors */}
      <div className="space-y-2 mb-4">
        {data.topFlavors.slice(0, expanded ? 6 : 3).map((flavor, idx) => {
          const tag = getFlavorTag(flavor.id);
          if (!tag) return null;
          
          const percentage = (flavor.count / maxCount) * 100;
          
          return (
            <Link
              key={flavor.id}
              href={`/flavor/${flavor.id}`}
              className="block group"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{tag.emoji}</span>
                <span className="text-xs text-gray-300 group-hover:text-amber-400 transition-colors">
                  {tag.label}
                </span>
                <span className="text-[10px] text-gray-500 ml-auto">
                  {flavor.count}x
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className={`h-full rounded-full ${
                    idx === 0 ? "bg-amber-500" :
                    idx === 1 ? "bg-amber-500/80" :
                    idx === 2 ? "bg-amber-500/60" :
                    "bg-amber-500/40"
                  }`}
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Expanded Section */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border-t border-white/10 pt-3 space-y-3"
        >
          {/* Recent Flavors */}
          {data.recentFlavors.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">🕐 Recently tasted</p>
              <div className="flex flex-wrap gap-1.5">
                {data.recentFlavors.map(id => {
                  const tag = getFlavorTag(id);
                  if (!tag) return null;
                  return (
                    <Link
                      key={id}
                      href={`/flavor/${id}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20 transition-all"
                    >
                      {tag.emoji} {tag.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unexplored Flavors */}
          {data.unexploredFlavors.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">✨ Unexplored flavors</p>
              <div className="flex flex-wrap gap-1.5">
                {data.unexploredFlavors.slice(0, 6).map(id => {
                  const tag = getFlavorTag(id);
                  if (!tag) return null;
                  return (
                    <Link
                      key={id}
                      href={`/flavor/${id}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-gray-400 text-xs hover:bg-amber-500/10 hover:text-amber-400 transition-all border border-dashed border-gray-600"
                    >
                      {tag.emoji} {tag.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-[10px] text-gray-500 pt-2 border-t border-white/5">
            <span>{data.checkinsWithFlavors} of {data.totalCheckins} check-ins have flavor tags</span>
            <Link href="/history" className="text-amber-400 hover:underline">
              View history →
            </Link>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
