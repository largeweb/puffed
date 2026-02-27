"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  FiArrowLeft, 
  FiSun,
  FiTrendingUp,
  FiCalendar,
  FiUsers
} from "react-icons/fi";

interface Prediction {
  type: string;
  emoji: string;
  title: string;
  value: string | number;
  description: string;
}

interface BrandStat {
  brand: string;
  count: number;
  avgRating: number;
}

interface ForecastData {
  predictions: Prediction[];
  topWeekendBrands: BrandStat[];
  weekendStats: {
    avgSmokesPerWeekend: number;
    weekendRate: number;
    totalWeekendSmokes: number;
    saturdaySmokes: number;
    sundaySmokes: number;
  };
  activeSmokers: Array<{ username: string }>;
  isFriday: boolean;
  isWeekend: boolean;
}

export default function WeekendForecastPage() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  const router = useRouter();

  useEffect(() => {
    fetch("/api/weekend-forecast")
      .then(res => res.json() as Promise<ForecastData & { error?: string }>)
      .then(d => {
        if (d.error) {
          router.push("/login");
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const revealCard = (index: number) => {
    setRevealedCards(prev => new Set([...prev, index]));
  };

  const revealAll = () => {
    if (data) {
      setRevealedCards(new Set(data.predictions.map((_, i) => i)));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-950 to-indigo-950 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-violet-400/30 border-t-violet-400 rounded-full"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-950 to-indigo-950 flex flex-col items-center justify-center text-white p-4">
        <p className="mb-4">Failed to load your forecast</p>
        <Link href="/dashboard" className="text-violet-400 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-950 to-indigo-950 text-white">
      {/* Floating stars background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            initial={{ 
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400), 
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              opacity: 0.3
            }}
            animate={{ 
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.5, 1]
            }}
            transition={{ 
              duration: 2 + Math.random() * 2, 
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      <div className="relative max-w-lg mx-auto p-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
          <button
            onClick={revealAll}
            className="text-violet-400 hover:text-violet-300 text-sm"
          >
            Reveal All
          </button>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div 
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-7xl mb-4"
          >
            🔮
          </motion.div>
          <h1 className="text-3xl font-bold mb-2">Weekend Forecast</h1>
          <p className="text-violet-300/80">
            {data.isFriday ? "TGIF! Here's what your weekend looks like..." :
             data.isWeekend ? "Weekend in progress! Check your predictions..." :
             "Preview your upcoming weekend..."}
          </p>
        </motion.div>

        {/* Predictions Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {data.predictions.map((prediction, index) => {
            const isRevealed = revealedCards.has(index);
            return (
              <motion.div
                key={prediction.type}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => revealCard(index)}
                className={`relative cursor-pointer transition-all duration-500 ${
                  prediction.type === 'smoke_count' || prediction.type === 'vibe' 
                    ? 'col-span-2' : ''
                }`}
              >
                <motion.div
                  animate={{ rotateY: isRevealed ? 180 : 0 }}
                  transition={{ duration: 0.6 }}
                  style={{ transformStyle: 'preserve-3d' }}
                  className="relative"
                >
                  {/* Card Back (hidden content) */}
                  <div 
                    className={`absolute inset-0 rounded-2xl p-4 ${
                      isRevealed ? 'invisible' : 'visible'
                    } bg-gradient-to-br from-violet-600/30 to-purple-600/30 backdrop-blur border border-violet-500/30 flex flex-col items-center justify-center min-h-[120px]`}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-4xl mb-2"
                    >
                      ✨
                    </motion.div>
                    <p className="text-sm text-violet-300">Tap to reveal</p>
                    <p className="text-xs text-white/60 mt-1">{prediction.title}</p>
                  </div>

                  {/* Card Front (revealed content) */}
                  <div 
                    className={`rounded-2xl p-4 ${
                      isRevealed ? 'visible' : 'invisible'
                    } bg-gradient-to-br from-white/10 to-white/5 backdrop-blur border border-white/10 min-h-[120px]`}
                    style={{ transform: 'rotateY(180deg)' }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{prediction.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-violet-300 uppercase tracking-wide">
                          {prediction.title}
                        </p>
                        <p className="text-xl font-bold mt-1 truncate">
                          {prediction.value}
                        </p>
                        <p className="text-xs text-white/60 mt-1">
                          {prediction.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Weekend Stats */}
        {data.weekendStats.totalWeekendSmokes > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <FiCalendar className="text-violet-400" />
              <h2 className="font-semibold">Your Weekend History</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-violet-400">
                  {data.weekendStats.avgSmokesPerWeekend}
                </div>
                <div className="text-xs text-white/60">Avg/Weekend</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {data.weekendStats.saturdaySmokes}
                </div>
                <div className="text-xs text-white/60">Saturday</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-indigo-400">
                  {data.weekendStats.sundaySmokes}
                </div>
                <div className="text-xs text-white/60">Sunday</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Top Weekend Brands */}
        {data.topWeekendBrands.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <FiTrendingUp className="text-violet-400" />
              <h2 className="font-semibold">Weekend Favorites</h2>
            </div>
            <div className="space-y-2">
              {data.topWeekendBrands.map((brand, i) => (
                <div 
                  key={brand.brand}
                  className="flex items-center gap-3 bg-white/5 rounded-xl p-3"
                >
                  <span className="text-xl">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{brand.brand}</p>
                    <p className="text-xs text-white/60">
                      {brand.count}× • {brand.avgRating.toFixed(1)}★
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Active Smokers */}
        {data.activeSmokers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <FiUsers className="text-violet-400" />
              <h2 className="font-semibold">Active This Week</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.activeSmokers.map(user => (
                <Link
                  key={user.username}
                  href={`/user/${user.username}`}
                  className="px-3 py-1 bg-white/10 rounded-full text-sm hover:bg-white/20 transition-colors"
                >
                  @{user.username}
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <p className="text-white/60 text-sm mb-4">
            {data.isFriday 
              ? "Start your weekend right! 🎉" 
              : "Make your forecast come true!"}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity"
          >
            <FiSun className="w-5 h-5" />
            Log a Smoke
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
