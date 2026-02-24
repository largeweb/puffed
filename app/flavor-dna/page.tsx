"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { FiHome, FiShare2, FiCopy, FiCheck, FiUser, FiActivity } from "react-icons/fi";
import Link from "next/link";

interface FlavorData {
  id: string;
  label: string;
  emoji: string;
  count: number;
  percentage: number;
}

interface PersonalityData {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

interface FlavorDNAData {
  username: string;
  totalSmokes: number;
  smokesWithFlavors: number;
  topFlavors: FlavorData[];
  personality: PersonalityData;
  flavorDiversity: number;
  radarData: Array<{ flavor: string; value: number }>;
  error?: string;
}

// Personality color themes
const PERSONALITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  bold_earthy: { bg: "from-amber-900/30 to-stone-900/30", border: "border-amber-600/50", text: "text-amber-400" },
  sweet_smooth: { bg: "from-yellow-900/30 to-orange-900/30", border: "border-yellow-500/50", text: "text-yellow-400" },
  complex_spicy: { bg: "from-red-900/30 to-orange-900/30", border: "border-red-500/50", text: "text-red-400" },
  classic_woody: { bg: "from-emerald-900/30 to-teal-900/30", border: "border-emerald-500/50", text: "text-emerald-400" },
  rich_indulgent: { bg: "from-purple-900/30 to-pink-900/30", border: "border-purple-500/50", text: "text-purple-400" },
  fresh_bright: { bg: "from-cyan-900/30 to-blue-900/30", border: "border-cyan-500/50", text: "text-cyan-400" },
  adventurous: { bg: "from-indigo-900/30 to-violet-900/30", border: "border-indigo-500/50", text: "text-indigo-400" },
};

function RadarChart({ data }: { data: Array<{ flavor: string; value: number }> }) {
  const size = 280;
  const center = size / 2;
  const maxRadius = (size / 2) - 40;
  const levels = 5;

  // Filter to only show flavors with values > 0 or top 8 by label
  const activeData = data.filter(d => d.value > 0);
  const displayData = activeData.length >= 4 ? activeData : data.slice(0, 8);
  
  const angleStep = (2 * Math.PI) / displayData.length;

  const getPoint = (index: number, value: number) => {
    const angle = (index * angleStep) - (Math.PI / 2);
    const radius = (value / 100) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  // Create polygon points
  const polygonPoints = displayData.map((d, i) => {
    const point = getPoint(i, d.value);
    return `${point.x},${point.y}`;
  }).join(" ");

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* Background circles */}
      {Array.from({ length: levels }, (_, i) => {
        const r = ((i + 1) / levels) * maxRadius;
        return (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
        );
      })}

      {/* Axis lines */}
      {displayData.map((_, i) => {
        const point = getPoint(i, 100);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={point.x}
            y2={point.y}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      <motion.polygon
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        points={polygonPoints}
        fill="rgba(245, 158, 11, 0.3)"
        stroke="rgb(245, 158, 11)"
        strokeWidth="2"
      />

      {/* Data points */}
      {displayData.map((d, i) => {
        const point = getPoint(i, d.value);
        return (
          <motion.circle
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * i, duration: 0.3 }}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="rgb(245, 158, 11)"
          />
        );
      })}

      {/* Labels */}
      {displayData.map((d, i) => {
        const point = getPoint(i, 120);
        return (
          <motion.text
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 + i * 0.05 }}
            x={point.x}
            y={point.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs fill-gray-400"
            style={{ fontSize: "10px" }}
          >
            {d.flavor}
          </motion.text>
        );
      })}
    </svg>
  );
}

function FlavorBar({ flavor, index }: { flavor: FlavorData; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-center gap-3"
    >
      <span className="text-2xl">{flavor.emoji}</span>
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium">{flavor.label}</span>
          <span className="text-gray-400">{flavor.percentage}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${flavor.percentage}%` }}
            transition={{ delay: 0.3 + index * 0.1, duration: 0.6 }}
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function FlavorDNAPage() {
  const [data, setData] = useState<FlavorDNAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/flavor-dna");
        if (res.ok) {
          setData(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch flavor DNA:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleShare = async () => {
    if (!data) return;
    
    const shareUrl = `${window.location.origin}/flavor-dna?user=${data.username}`;
    const shareText = `${data.personality.emoji} My Flavor DNA: "${data.personality.name}" - ${data.topFlavors.slice(0, 3).map(f => f.emoji).join("")} Check out my cigar flavor profile on Puffed!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${data.username}'s Flavor DNA - Puffed`,
          text: shareText,
          url: shareUrl,
        });
        setShareStatus("Shared!");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setShareStatus("Link copied!");
      setTimeout(() => {
        setCopied(false);
        setShareStatus(null);
      }, 2000);
    } catch {
      setShareStatus("Failed");
      setTimeout(() => setShareStatus(null), 2000);
    }
  };

  const colors = data?.personality?.id 
    ? PERSONALITY_COLORS[data.personality.id] || PERSONALITY_COLORS.adventurous
    : PERSONALITY_COLORS.adventurous;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black p-4 pb-20">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <Link href="/dashboard" className="glass p-2 rounded-xl hover:bg-white/10 transition-colors">
          <FiHome className="text-xl" />
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          🧬 Flavor DNA
        </h1>
        {data && (
          <button 
            onClick={handleShare}
            className="glass p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            {copied ? <FiCheck className="text-xl text-green-400" /> : <FiShare2 className="text-xl" />}
          </button>
        )}
      </header>

      {shareStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glass px-4 py-2 rounded-xl text-sm"
        >
          {shareStatus}
        </motion.div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">Analyzing your flavor profile...</p>
        </div>
      ) : data?.error ? (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-gray-400">{data.error}</p>
          <Link href="/dashboard" className="text-amber-400 mt-4 inline-block hover:underline">
            Back to Dashboard
          </Link>
        </div>
      ) : data?.smokesWithFlavors === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">🧬</div>
          <h2 className="text-xl font-bold mb-2">No Flavor Data Yet!</h2>
          <p className="text-gray-400 mb-4">
            Start tagging flavors on your check-ins to discover your unique Flavor DNA
          </p>
          <Link 
            href="/dashboard" 
            className="inline-block px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Log a Smoke
          </Link>
        </div>
      ) : data && (
        <div className="space-y-6 max-w-md mx-auto">
          {/* Personality Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass rounded-2xl p-6 bg-gradient-to-br ${colors.bg} border ${colors.border}`}
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="text-6xl mb-3"
              >
                {data.personality.emoji}
              </motion.div>
              <h2 className={`text-2xl font-bold ${colors.text} mb-2`}>
                {data.personality.name}
              </h2>
              <p className="text-gray-300 text-sm">
                {data.personality.description}
              </p>
            </div>

            {/* Username */}
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-sm text-gray-400">
              <FiUser />
              <span>@{data.username}</span>
            </div>
          </motion.div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-xl p-4 text-center"
            >
              <div className="text-2xl font-bold text-amber-400">{data.totalSmokes}</div>
              <div className="text-xs text-gray-400">Total Smokes</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-xl p-4 text-center"
            >
              <div className="text-2xl font-bold text-orange-400">{data.smokesWithFlavors}</div>
              <div className="text-xs text-gray-400">With Flavors</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-xl p-4 text-center"
            >
              <div className="text-2xl font-bold text-yellow-400">{data.flavorDiversity}%</div>
              <div className="text-xs text-gray-400">Diversity</div>
            </motion.div>
          </div>

          {/* Radar Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold mb-4 text-center flex items-center justify-center gap-2">
              <FiActivity /> Flavor Radar
            </h3>
            <RadarChart data={data.radarData} />
          </motion.div>

          {/* Top Flavors */}
          {data.topFlavors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass rounded-2xl p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Your Top Flavors</h3>
              <div className="space-y-4">
                {data.topFlavors.map((flavor, index) => (
                  <FlavorBar key={flavor.id} flavor={flavor} index={index} />
                ))}
              </div>
            </motion.div>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center pt-4"
          >
            <Link
              href="/discover"
              className="text-amber-400 hover:underline text-sm"
            >
              Discover cigars matching your flavor profile →
            </Link>
          </motion.div>
        </div>
      )}
    </div>
  );
}
