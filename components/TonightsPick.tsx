"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getFlavorTag } from "@/lib/flavors";

interface PickData {
  suggestion: {
    brand: string;
    brandSlug: string;
    cigar?: string;
    avgRating: number;
    checkinCount: number;
    topFlavors: string[];
    reason: string;
  } | null;
  timeContext: string;
  greeting: string;
  icon: string;
}

export default function TonightsPick() {
  const [data, setData] = useState<PickData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/tonights-pick");
      if (res.ok) {
        const json: PickData = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Tonight's pick error:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl p-4 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
        <div className="h-16 bg-white/10 rounded" />
      </div>
    );
  }

  if (!data || !data.suggestion || dismissed) {
    return null;
  }

  const { suggestion, timeContext, greeting, icon } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4 overflow-hidden relative"
    >
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -z-10" />
      
      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 transition-colors"
        aria-label="Dismiss"
      >
        ✕
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="font-semibold text-sm">{greeting}</h3>
          <p className="text-xs text-gray-400">{timeContext}</p>
        </div>
      </div>

      {/* Suggestion Card */}
      <Link
        href={`/brand/${suggestion.brandSlug}`}
        className="block group"
      >
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-xl p-3 border border-amber-500/20"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
                {suggestion.brand}
              </h4>
              {suggestion.cigar && (
                <p className="text-xs text-gray-400">{suggestion.cigar}</p>
              )}
            </div>
            <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded-full">
              <span className="text-amber-400 text-sm">★</span>
              <span className="text-xs font-semibold text-amber-300">
                {suggestion.avgRating.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Flavors */}
          {suggestion.topFlavors.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {suggestion.topFlavors.slice(0, 4).map(id => {
                const tag = getFlavorTag(id);
                if (!tag) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/5 text-[10px] text-gray-300"
                  >
                    {tag.emoji} {tag.label}
                  </span>
                );
              })}
            </div>
          )}

          {/* Reason */}
          <p className="text-xs text-gray-400 italic">
            "{suggestion.reason}"
          </p>

          {/* Stats */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
            <span className="text-[10px] text-gray-500">
              Based on {suggestion.checkinCount} of your check-ins
            </span>
            <span className="text-xs text-amber-400 group-hover:text-amber-300 transition-colors">
              View brand →
            </span>
          </div>
        </motion.div>
      </Link>

      {/* Quick action */}
      <div className="flex items-center justify-center mt-3">
        <Link
          href="/checkin"
          className="text-xs text-gray-400 hover:text-amber-400 transition-colors"
        >
          Light it up? Log a check-in →
        </Link>
      </div>
    </motion.div>
  );
}
