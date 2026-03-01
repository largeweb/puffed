"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  FiHome,
  FiRefreshCw,
  FiStar,
  FiClock,
  FiZap,
  FiEye,
  FiHeart,
  FiTrendingUp,
} from "react-icons/fi";

interface OracleData {
  isAuthenticated: boolean;
  username: string | null;
  predictedNextSmoke: {
    brand: string;
    confidence: number;
    reasoning: string;
  } | null;
  smokeFortune: {
    title: string;
    message: string;
    luckyBrand: string | null;
    luckyNumber: number;
    luckyTime: string;
    aura: string;
  };
  smokerProfile: {
    archetype: string;
    emoji: string;
    description: string;
    traits: string[];
  } | null;
  brandCompatibility: {
    brand: string;
    compatibility: number;
    reason: string;
  }[];
  mysticalStats: {
    totalSmokes: number;
    favoriteHour: number | null;
    dominantMood: string | null;
    smokingAura: string;
    spiritualLevel: number;
  };
  communityPrediction: {
    trendingBrand: string | null;
    communityMood: string;
    activeEnergy: string;
    moonPhase: string;
  };
  dailyCard: {
    name: string;
    emoji: string;
    meaning: string;
    advice: string;
  };
}

const AURA_GRADIENTS: Record<string, string> = {
  golden: "from-yellow-600 via-amber-500 to-orange-500",
  pink: "from-pink-600 via-rose-500 to-red-400",
  green: "from-emerald-600 via-green-500 to-teal-400",
  blue: "from-blue-600 via-cyan-500 to-sky-400",
  purple: "from-purple-600 via-violet-500 to-indigo-400",
  orange: "from-orange-600 via-amber-500 to-yellow-400",
  amber: "from-amber-600 via-yellow-500 to-orange-400",
  cyan: "from-cyan-600 via-teal-500 to-emerald-400",
};

export default function OraclePage() {
  const [data, setData] = useState<OracleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"fortune" | "profile" | "cosmic">("fortune");
  const [revealedCard, setRevealedCard] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/oracle");
      if (res.ok) {
        const result = (await res.json()) as OracleData;
        setData(result);
      }
    } catch (error) {
      console.error("Failed to consult the oracle:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatHour = (hour: number | null): string => {
    if (hour === null) return "Unknown";
    if (hour === 0) return "Midnight";
    if (hour === 12) return "Noon";
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-violet-950 flex items-center justify-center">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
            opacity: [0.5, 1, 0.5] 
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-6xl"
        >
          🔮
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-violet-950 flex items-center justify-center text-white">
        <p>The spirits are unclear...</p>
      </div>
    );
  }

  const auraGradient = AURA_GRADIENTS[data.smokeFortune.aura] || AURA_GRADIENTS.purple;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-violet-950 text-white relative overflow-hidden">
      {/* Mystical background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Stars */}
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
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
        
        {/* Floating orbs */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`orb-${i}`}
            className="absolute w-32 h-32 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 blur-3xl"
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + i * 20}%`,
            }}
            animate={{
              x: [0, 30, 0],
              y: [0, -20, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 p-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition">
            <FiHome className="w-5 h-5" />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold flex items-center gap-2 justify-center">
              <motion.span 
                className="text-3xl"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                🔮
              </motion.span>
              The Oracle
            </h1>
            <p className="text-xs text-purple-300 mt-1">Mystical Smoke Insights</p>
          </div>
          <button
            onClick={() => { setRevealedCard(false); fetchData(); }}
            className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="relative z-10 p-4 pb-24 max-w-lg mx-auto space-y-6">
        {/* Cosmic Status */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-black/30 border border-purple-500/20 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{data.communityPrediction.moonPhase.split(" ")[0]}</span>
              <div>
                <p className="text-sm font-medium">{data.communityPrediction.moonPhase.split(" ").slice(1).join(" ")}</p>
                <p className="text-xs text-purple-300">{data.communityPrediction.activeEnergy}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-purple-400">Community Vibe</p>
              <p className="text-sm font-medium">{data.communityPrediction.communityMood}</p>
            </div>
          </div>
        </motion.div>

        {/* Daily Card - Tap to Reveal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          onClick={() => setRevealedCard(true)}
          className={`p-6 rounded-2xl cursor-pointer transition-all duration-500 ${
            revealedCard 
              ? "bg-gradient-to-br from-purple-600/40 to-pink-600/40 border border-purple-400/30" 
              : "bg-black/40 border border-purple-500/20 hover:border-purple-400/40"
          }`}
        >
          <AnimatePresence mode="wait">
            {!revealedCard ? (
              <motion.div
                key="hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, rotateY: 90 }}
                className="text-center py-4"
              >
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-5xl mb-3"
                >
                  🎴
                </motion.div>
                <p className="text-lg font-medium">Daily Smoke Card</p>
                <p className="text-sm text-purple-300 mt-1">Tap to reveal your destiny</p>
              </motion.div>
            ) : (
              <motion.div
                key="revealed"
                initial={{ opacity: 0, rotateY: -90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                className="text-center"
              >
                <span className="text-5xl block mb-3">{data.dailyCard.emoji}</span>
                <h3 className="text-xl font-bold">{data.dailyCard.name}</h3>
                <p className="text-sm text-purple-200 mt-1">{data.dailyCard.meaning}</p>
                <div className="mt-4 p-3 rounded-xl bg-black/30">
                  <p className="text-xs text-purple-300 mb-1">Today&apos;s Guidance</p>
                  <p className="text-sm font-medium">&quot;{data.dailyCard.advice}&quot;</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-black/30 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("fortune")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              activeTab === "fortune"
                ? "bg-purple-500/50 text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            🌟 Fortune
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              activeTab === "profile"
                ? "bg-purple-500/50 text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            <FiEye className="inline mr-1" /> Profile
          </button>
          <button
            onClick={() => setActiveTab("cosmic")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              activeTab === "cosmic"
                ? "bg-purple-500/50 text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            <FiZap className="inline mr-1" /> Cosmic
          </button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "fortune" && (
            <motion.div
              key="fortune"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Fortune Card */}
              <div className={`p-5 rounded-2xl bg-gradient-to-br ${auraGradient} relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative z-10">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <span className="text-2xl">✨</span> {data.smokeFortune.title}
                  </h3>
                  <p className="text-sm mt-2 leading-relaxed">{data.smokeFortune.message}</p>
                </div>
              </div>

              {/* Lucky Elements */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-black/30 text-center">
                  <p className="text-2xl mb-1">🎲</p>
                  <p className="text-lg font-bold text-purple-300">{data.smokeFortune.luckyNumber}</p>
                  <p className="text-xs text-gray-400">Lucky #</p>
                </div>
                <div className="p-3 rounded-xl bg-black/30 text-center">
                  <p className="text-2xl mb-1">⏰</p>
                  <p className="text-sm font-bold text-purple-300">{data.smokeFortune.luckyTime}</p>
                  <p className="text-xs text-gray-400">Lucky Time</p>
                </div>
                <div className="p-3 rounded-xl bg-black/30 text-center">
                  <p className="text-2xl mb-1">🚬</p>
                  <p className="text-sm font-bold text-purple-300 truncate">
                    {data.smokeFortune.luckyBrand || "Any"}
                  </p>
                  <p className="text-xs text-gray-400">Lucky Brand</p>
                </div>
              </div>

              {/* Prediction (logged in users) */}
              {data.predictedNextSmoke && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-indigo-400/20">
                  <div className="flex items-center gap-2 mb-2">
                    <FiTrendingUp className="text-indigo-300" />
                    <h4 className="font-semibold">Next Smoke Prediction</h4>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold">{data.predictedNextSmoke.brand}</p>
                      <p className="text-xs text-gray-400">{data.predictedNextSmoke.reasoning}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-indigo-300">{data.predictedNextSmoke.confidence}%</p>
                      <p className="text-xs text-gray-400">confidence</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Brand Compatibility */}
              {data.brandCompatibility.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                    <FiHeart /> Brand Compatibility
                  </h4>
                  {data.brandCompatibility.map((brand, i) => (
                    <div
                      key={brand.brand}
                      className="p-3 rounded-xl bg-black/30 flex items-center gap-3"
                    >
                      <span className="text-xl">{i === 0 ? "💜" : i === 1 ? "💙" : "💚"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{brand.brand}</p>
                        <p className="text-xs text-gray-400">{brand.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-300">{brand.compatibility}%</p>
                        <p className="text-xs text-gray-500">match</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {data.isAuthenticated && data.smokerProfile ? (
                <>
                  {/* Smoker Archetype */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-600/40 to-purple-600/40 border border-violet-400/30">
                    <div className="text-center">
                      <span className="text-5xl block mb-2">{data.smokerProfile.emoji}</span>
                      <h3 className="text-xl font-bold">{data.smokerProfile.archetype}</h3>
                      <p className="text-sm text-purple-200 mt-2">{data.smokerProfile.description}</p>
                      <div className="flex justify-center gap-2 mt-3 flex-wrap">
                        {data.smokerProfile.traits.map((trait) => (
                          <span
                            key={trait}
                            className="px-2 py-1 rounded-full bg-purple-500/30 text-xs"
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Mystical Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-black/30 text-center">
                      <p className="text-3xl font-bold text-purple-300">{data.mysticalStats.totalSmokes}</p>
                      <p className="text-xs text-gray-400">Total Sessions</p>
                    </div>
                    <div className="p-4 rounded-xl bg-black/30 text-center">
                      <p className="text-3xl font-bold text-violet-300">Lv.{data.mysticalStats.spiritualLevel}</p>
                      <p className="text-xs text-gray-400">Spiritual Level</p>
                    </div>
                  </div>

                  {/* Aura & Favorite Hour */}
                  <div className="p-4 rounded-xl bg-black/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-400">Your Aura</span>
                      <span className="font-medium text-purple-300">{data.mysticalStats.smokingAura}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">
                        <FiClock className="inline mr-1" /> Sacred Hour
                      </span>
                      <span className="font-medium">{formatHour(data.mysticalStats.favoriteHour)}</span>
                    </div>
                  </div>

                  {/* Spiritual Progress */}
                  <div className="p-4 rounded-xl bg-black/30">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-400">Spiritual Progress</span>
                      <span className="text-sm text-purple-300">{data.mysticalStats.spiritualLevel}/10</span>
                    </div>
                    <div className="h-2 bg-purple-900/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${data.mysticalStats.spiritualLevel * 10}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {data.mysticalStats.spiritualLevel < 10 
                        ? `${(data.mysticalStats.spiritualLevel + 1) * 5 - data.mysticalStats.totalSmokes} more sessions to next level`
                        : "You have reached enlightenment! 🧘"}
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-8 rounded-2xl bg-black/30 text-center">
                  <span className="text-5xl block mb-4">🔐</span>
                  <h3 className="text-lg font-bold mb-2">Unlock Your Profile</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Log in and start your smoking journey to reveal your mystical profile.
                  </p>
                  <Link
                    href="/login"
                    className="inline-block px-6 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 transition"
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "cosmic" && (
            <motion.div
              key="cosmic"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Moon Phase Details */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-800/80 to-indigo-900/80 border border-indigo-400/20">
                <div className="text-center">
                  <span className="text-6xl block mb-2">
                    {data.communityPrediction.moonPhase.split(" ")[0]}
                  </span>
                  <h3 className="text-lg font-bold">
                    {data.communityPrediction.moonPhase.split(" ").slice(1).join(" ")}
                  </h3>
                  <p className="text-sm text-indigo-200 mt-2">
                    The moon influences your smoking experience. Embrace its energy.
                  </p>
                </div>
              </div>

              {/* Energy Status */}
              <div className="p-4 rounded-xl bg-black/30">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⚡</span>
                  <div>
                    <p className="font-medium">{data.communityPrediction.activeEnergy}</p>
                    <p className="text-xs text-gray-400">Current cosmic energy</p>
                  </div>
                </div>
              </div>

              {/* Community Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-black/30 text-center">
                  <span className="text-3xl block mb-1">👥</span>
                  <p className="font-medium">{data.communityPrediction.communityMood}</p>
                  <p className="text-xs text-gray-400">Community Mood</p>
                </div>
                <div className="p-4 rounded-xl bg-black/30 text-center">
                  <span className="text-3xl block mb-1">🔥</span>
                  <p className="font-medium truncate">
                    {data.communityPrediction.trendingBrand || "None"}
                  </p>
                  <p className="text-xs text-gray-400">Trending Brand</p>
                </div>
              </div>

              {/* Cosmic Advice */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-400/20">
                <div className="flex items-start gap-3">
                  <FiStar className="w-5 h-5 text-purple-300 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-purple-300 mb-1">Cosmic Wisdom</p>
                    <p className="text-sm">
                      {data.communityPrediction.activeEnergy.includes("Night") 
                        ? "The night holds secrets. Let your smoke carry your thoughts to the stars."
                        : data.communityPrediction.activeEnergy.includes("Morning") || data.communityPrediction.activeEnergy.includes("Rising")
                        ? "Fresh energy flows through you. Start your day with intention."
                        : data.communityPrediction.activeEnergy.includes("Golden")
                        ? "The golden hour blesses all who smoke within it. Savor this moment."
                        : data.communityPrediction.activeEnergy.includes("Midnight")
                        ? "Between worlds, between thoughts. The midnight smoke reveals truths."
                        : "The universe aligns in your favor. Trust your instincts."}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Link
            href="/checkin"
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-center font-semibold hover:from-purple-400 hover:to-pink-400 transition"
          >
            🔮 Embrace Your Destiny
          </Link>
          <Link
            href="/fortune"
            className="py-3 px-4 rounded-xl bg-black/40 hover:bg-black/60 transition"
          >
            🥠
          </Link>
        </div>

        {/* Related Links */}
        <div className="flex gap-2 justify-center text-sm flex-wrap">
          <Link href="/fortune" className="text-purple-300 hover:text-purple-200">
            🥠 Fortune
          </Link>
          <span className="text-gray-600">•</span>
          <Link href="/daily-prompt" className="text-purple-300 hover:text-purple-200">
            💭 Daily Prompt
          </Link>
          <span className="text-gray-600">•</span>
          <Link href="/vibe-check" className="text-purple-300 hover:text-purple-200">
            ✨ Vibe Check
          </Link>
        </div>
      </main>
    </div>
  );
}
