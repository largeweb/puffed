"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiUsers, FiChevronUp, FiChevronDown, FiMinus, FiShare2 } from "react-icons/fi";

interface ComparisonStat {
  label: string;
  emoji: string;
  yours: number | string;
  community: number | string;
  yoursFormatted: string;
  communityFormatted: string;
  comparison: "higher" | "lower" | "same" | "different";
  insight: string;
}

interface YouVsCommunityData {
  comparisons: ComparisonStat[];
  summary: {
    title: string;
    description: string;
    emoji: string;
  };
  error?: string;
}

function ComparisonCard({ stat, index }: { stat: ComparisonStat; index: number }) {
  const getComparisonIcon = () => {
    switch (stat.comparison) {
      case "higher":
        return <FiChevronUp className="text-green-400" />;
      case "lower":
        return <FiChevronDown className="text-amber-400" />;
      case "different":
        return <span className="text-purple-400 text-sm">≠</span>;
      default:
        return <FiMinus className="text-gray-400" />;
    }
  };

  const getComparisonColor = () => {
    switch (stat.comparison) {
      case "higher":
        return "from-green-500/20 to-emerald-600/20 border-green-500/30";
      case "lower":
        return "from-amber-500/20 to-orange-600/20 border-amber-500/30";
      case "different":
        return "from-purple-500/20 to-indigo-600/20 border-purple-500/30";
      default:
        return "from-gray-500/20 to-gray-600/20 border-gray-500/30";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${getComparisonColor()} border p-5`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{stat.emoji}</span>
          <h3 className="font-semibold">{stat.label}</h3>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          {getComparisonIcon()}
        </div>
      </div>

      {/* Comparison Bars */}
      <div className="space-y-3">
        {/* You */}
        <div className="flex items-center gap-3">
          <div className="w-12 text-xs text-gray-400">You</div>
          <div className="flex-1 bg-white/5 rounded-full h-8 flex items-center px-3">
            <span className="font-semibold text-white">{stat.yoursFormatted}</span>
          </div>
        </div>

        {/* Community */}
        <div className="flex items-center gap-3">
          <div className="w-12 text-xs text-gray-400">Avg</div>
          <div className="flex-1 bg-white/5 rounded-full h-8 flex items-center px-3 opacity-70">
            <span className="font-medium text-gray-300">{stat.communityFormatted}</span>
          </div>
        </div>
      </div>

      {/* Insight */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <p className="text-sm text-gray-300">{stat.insight}</p>
      </div>
    </motion.div>
  );
}

export default function YouVsCommunityPage() {
  const router = useRouter();
  const [data, setData] = useState<YouVsCommunityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/you-vs-community")
      .then(r => r.json() as Promise<YouVsCommunityData>)
      .then(d => {
        if (d.error) {
          if (d.error === "Not authenticated" || d.error === "Session expired") {
            router.push("/login");
            return;
          }
        }
        setData(d);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const handleShare = async () => {
    if (!data) return;
    
    const shareText = `${data.summary.emoji} My Puffed Profile: ${data.summary.title}\n\n${data.summary.description}\n\nCompare yourself at puffed.pages.dev/you-vs-community`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Puffed Profile",
          text: shareText,
          url: window.location.href,
        });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
        <div className="max-w-2xl mx-auto">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-6 animate-pulse"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass rounded-2xl p-5 animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-700/50 rounded mb-2"></div>
                <div className="h-8 bg-gray-700/50 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
        <div className="max-w-2xl mx-auto text-center pt-20">
          <p className="text-gray-400">Failed to load comparison data</p>
          <Link href="/dashboard" className="text-amber-500 hover:underline mt-4 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 glass border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <FiArrowLeft />
            </button>
            <div>
              <h1 className="font-bold text-lg flex items-center gap-2">
                <FiUsers className="text-cyan-400" />
                You vs Community
              </h1>
            </div>
          </div>
          <button
            onClick={handleShare}
            className="relative p-2 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            <FiShare2 />
            {shareStatus && (
              <span className="absolute -bottom-8 right-0 text-xs bg-green-500 text-black px-2 py-0.5 rounded whitespace-nowrap">
                {shareStatus}
              </span>
            )}
          </button>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-3xl p-6 mb-8 text-center bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30"
        >
          <div className="text-5xl mb-4">{data.summary.emoji}</div>
          <h2 className="text-2xl font-bold mb-2">{data.summary.title}</h2>
          <p className="text-gray-300">{data.summary.description}</p>
        </motion.div>

        {/* Stats Legend */}
        <div className="flex items-center justify-center gap-6 mb-6 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
            <span>Above avg</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
            <span>Below avg</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500/50"></div>
            <span>Different</span>
          </div>
        </div>

        {/* Comparison Cards */}
        <div className="space-y-4">
          {data.comparisons.map((stat, index) => (
            <ComparisonCard key={stat.label} stat={stat} index={index} />
          ))}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center text-sm text-gray-500"
        >
          <p>Based on your smoking history vs. community averages</p>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          <Link
            href="/mystats"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm"
          >
            📊 My Full Stats
          </Link>
          <Link
            href="/leaderboard"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm"
          >
            🏆 Leaderboard
          </Link>
          <Link
            href="/personality"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm"
          >
            🧬 My Personality
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
