"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiHome, FiRefreshCw, FiShare2, FiStar, FiMoon, FiSun, FiUsers, FiHeart } from "react-icons/fi";

interface SpiritAnimal {
  animal: string;
  emoji: string;
  title: string;
  description: string;
  traits: string[];
  smokingStyle: string;
  powerMove: string;
  weakness: string;
  compatibility: string[];
  rarity: "common" | "uncommon" | "rare" | "legendary";
}

interface SpiritData {
  spiritAnimal: SpiritAnimal;
  personalized: boolean;
  stats?: {
    totalSmokes: number;
    uniqueBrands: number;
    nightSmokes: number;
    engagementScore: number;
  };
  insight?: string;
  message?: string;
}

const rarityColors = {
  common: "from-slate-500 to-slate-600",
  uncommon: "from-emerald-500 to-teal-600",
  rare: "from-blue-500 to-purple-600",
  legendary: "from-amber-500 via-orange-500 to-red-600"
};

const rarityGlow = {
  common: "shadow-slate-500/30",
  uncommon: "shadow-emerald-500/30",
  rare: "shadow-purple-500/40",
  legendary: "shadow-amber-500/50"
};

export default function SpiritSmokerPage() {
  const router = useRouter();
  const [data, setData] = useState<SpiritData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchSpirit();
  }, []);

  const fetchSpirit = async () => {
    setLoading(true);
    setRevealed(false);
    setRevealing(false);
    try {
      const res = await fetch("/api/spirit-smoker");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const json = await res.json() as SpiritData;
      setData(json);
      
      // Start reveal animation after short delay
      setTimeout(() => {
        setRevealing(true);
        setTimeout(() => {
          setRevealed(true);
          setRevealing(false);
        }, 2000);
      }, 500);
    } catch (err) {
      console.error("Failed to fetch spirit:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!data?.spiritAnimal) return;
    
    const text = `${data.spiritAnimal.emoji} I'm ${data.spiritAnimal.title}!\n\n"${data.spiritAnimal.description}"\n\nDiscover your Spirit Smoker on Puffed! 🔮`;
    
    if (navigator.share) {
      try {
        await navigator.share({ text, url: "https://puffed.pages.dev/spirit" });
        setShareStatus("Shared!");
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      setShareStatus("Copied!");
    }
    setTimeout(() => setShareStatus(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-6xl"
        >
          🔮
        </motion.div>
      </div>
    );
  }

  const spirit = data?.spiritAnimal;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black text-white">
      {/* Mystical stars background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-indigo-950/80 backdrop-blur-sm border-b border-purple-800/30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 hover:bg-purple-900/30 rounded-lg">
            <FiHome className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent flex items-center gap-2">
            🔮 Spirit Smoker
          </h1>
          <button 
            onClick={fetchSpirit}
            className="p-2 -mr-2 hover:bg-purple-900/30 rounded-lg"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 relative z-10">
        {/* Mystical orb animation during reveal */}
        <AnimatePresence>
          {revealing && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm"
            >
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  ease: "easeInOut",
                }}
                className="text-9xl"
              >
                🔮
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spirit Card */}
        {spirit && revealed && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-6"
          >
            {/* Main spirit card */}
            <div className={`relative rounded-2xl p-6 bg-gradient-to-br ${rarityColors[spirit.rarity]} shadow-2xl ${rarityGlow[spirit.rarity]}`}>
              {/* Rarity badge */}
              <div className="absolute top-4 right-4">
                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  spirit.rarity === "legendary" ? "bg-white/20 text-yellow-200" :
                  spirit.rarity === "rare" ? "bg-white/20 text-purple-200" :
                  spirit.rarity === "uncommon" ? "bg-white/20 text-emerald-200" :
                  "bg-white/10 text-slate-200"
                }`}>
                  {spirit.rarity}
                </span>
              </div>

              {/* Spirit emoji and title */}
              <div className="text-center mb-6">
                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [-5, 5, -5]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="text-8xl mb-4"
                >
                  {spirit.emoji}
                </motion.div>
                <h2 className="text-3xl font-bold text-white drop-shadow-lg">
                  {spirit.title}
                </h2>
              </div>

              {/* Description */}
              <p className="text-white/90 text-center text-lg italic mb-6">
                "{spirit.description}"
              </p>

              {/* Traits */}
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {spirit.traits.map((trait) => (
                  <span key={trait} className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    {trait}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats (if personalized) */}
            {data?.personalized && data.stats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-4 gap-2"
              >
                <div className="bg-purple-900/40 rounded-xl p-3 text-center">
                  <div className="text-2xl">🚬</div>
                  <div className="text-lg font-bold">{data.stats.totalSmokes}</div>
                  <div className="text-xs text-purple-300">Smokes</div>
                </div>
                <div className="bg-purple-900/40 rounded-xl p-3 text-center">
                  <div className="text-2xl">🏷️</div>
                  <div className="text-lg font-bold">{data.stats.uniqueBrands}</div>
                  <div className="text-xs text-purple-300">Brands</div>
                </div>
                <div className="bg-purple-900/40 rounded-xl p-3 text-center">
                  <div className="text-2xl">🌙</div>
                  <div className="text-lg font-bold">{data.stats.nightSmokes}</div>
                  <div className="text-xs text-purple-300">Night</div>
                </div>
                <div className="bg-purple-900/40 rounded-xl p-3 text-center">
                  <div className="text-2xl">💕</div>
                  <div className="text-lg font-bold">{data.stats.engagementScore}</div>
                  <div className="text-xs text-purple-300">Social</div>
                </div>
              </motion.div>
            )}

            {/* Insight */}
            {data?.insight && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-indigo-900/30 rounded-xl p-4 border border-purple-700/30"
              >
                <p className="text-purple-200 text-center">
                  ✨ {data.insight}
                </p>
              </motion.div>
            )}

            {/* Details cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-4"
            >
              {/* Smoking Style */}
              <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <FiStar className="w-5 h-5 text-amber-400" />
                  <span className="font-semibold text-purple-200">Smoking Style</span>
                </div>
                <p className="text-white/80">{spirit.smokingStyle}</p>
              </div>

              {/* Power Move */}
              <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">⚡</span>
                  <span className="font-semibold text-purple-200">Power Move</span>
                </div>
                <p className="text-white/80">{spirit.powerMove}</p>
              </div>

              {/* Weakness */}
              <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">😅</span>
                  <span className="font-semibold text-purple-200">Weakness</span>
                </div>
                <p className="text-white/80">{spirit.weakness}</p>
              </div>

              {/* Compatible Spirits */}
              <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <FiUsers className="w-5 h-5 text-pink-400" />
                  <span className="font-semibold text-purple-200">Compatible Spirits</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {spirit.compatibility.map((c) => (
                    <span key={c} className="px-3 py-1 bg-pink-900/40 rounded-full text-sm">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Share button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex justify-center"
            >
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-semibold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg"
              >
                <FiShare2 className="w-5 h-5" />
                {shareStatus || "Share Your Spirit"}
              </button>
            </motion.div>

            {/* Not logged in message */}
            {!data?.personalized && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center"
              >
                <p className="text-purple-300 mb-4">{data?.message}</p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 rounded-full font-semibold hover:bg-purple-500 transition-colors"
                >
                  Log in to discover your true spirit
                </Link>
              </motion.div>
            )}

            {/* Discover more link */}
            <div className="text-center pt-4">
              <Link
                href="/fortune"
                className="text-purple-400 hover:text-purple-300 text-sm flex items-center justify-center gap-2"
              >
                🥠 Also try: Your Smoke Fortune →
              </Link>
            </div>
          </motion.div>
        )}

        {/* Pre-reveal teaser */}
        {spirit && !revealed && !revealing && (
          <div className="text-center py-20">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-7xl mb-6"
            >
              🔮
            </motion.div>
            <h2 className="text-2xl font-bold text-purple-200 mb-4">
              Divining Your Spirit...
            </h2>
            <p className="text-purple-400">
              The smoke whispers your true nature...
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
