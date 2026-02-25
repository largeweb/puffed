"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  FiRefreshCw,
  FiTarget,
  FiTrendingUp,
  FiUsers,
  FiStar,
  FiZap,
  FiArrowLeft,
} from "react-icons/fi";
import { GiCigar } from "react-icons/gi";

interface BrandOption {
  brand: string;
  source: "personal" | "trending" | "community";
  userRating?: number;
  avgRating?: number;
  checkinCount?: number;
}

interface RouletteData {
  brands: BrandOption[];
  winner: BrandOption;
  totalOptions: number;
  hasPersonalBrands: boolean;
}

export default function RoulettePage() {
  const [data, setData] = useState<RouletteData | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finalWinner, setFinalWinner] = useState<BrandOption | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch("/api/brand-roulette");
      if (!res.ok) throw new Error("Failed to fetch");
      const result: RouletteData = await res.json();
      setData(result);
      setError(null);
    } catch {
      setError("Failed to load brands");
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const spin = () => {
    if (!data || data.brands.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setShowResult(false);
    setFinalWinner(null);

    // Determine winner upfront
    const winner = data.winner;

    // Spin animation: fast at first, then slow down
    let spinCount = 0;
    const totalSpins = 20 + Math.floor(Math.random() * 10); // 20-30 spins
    let delay = 50; // Start fast

    const doSpin = () => {
      setCurrentIndex((prev) => (prev + 1) % data.brands.length);
      spinCount++;

      if (spinCount < totalSpins) {
        // Gradually slow down
        if (spinCount > totalSpins * 0.6) {
          delay = Math.min(delay + 30, 400);
        } else if (spinCount > totalSpins * 0.3) {
          delay = Math.min(delay + 10, 150);
        }
        spinIntervalRef.current = setTimeout(doSpin, delay);
      } else {
        // Land on winner
        const winnerIndex = data.brands.findIndex(
          (b) => b.brand.toLowerCase() === winner.brand.toLowerCase()
        );
        setCurrentIndex(winnerIndex >= 0 ? winnerIndex : 0);
        setFinalWinner(winner);
        setIsSpinning(false);
        setTimeout(() => setShowResult(true), 300);
      }
    };

    doSpin();
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "personal":
        return <FiTarget className="w-4 h-4" />;
      case "trending":
        return <FiTrendingUp className="w-4 h-4" />;
      case "community":
        return <FiUsers className="w-4 h-4" />;
      default:
        return <GiCigar className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "personal":
        return "Your Favorite";
      case "trending":
        return "Trending Now";
      case "community":
        return "Community Pick";
      default:
        return "Suggested";
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "personal":
        return "text-amber-400";
      case "trending":
        return "text-green-400";
      case "community":
        return "text-pink-400";
      default:
        return "text-gray-400";
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 p-4">
        <div className="max-w-md mx-auto pt-8 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchBrands}
            className="mt-4 px-4 py-2 bg-purple-600 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/30 to-gray-900 p-4">
      <div className="max-w-md mx-auto pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-white transition"
          >
            <FiArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">🎰</span> Brand Roulette
          </h1>
          <button
            onClick={fetchBrands}
            className="text-gray-400 hover:text-white transition"
            disabled={isSpinning}
          >
            <FiRefreshCw
              className={`w-5 h-5 ${isSpinning ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Subtitle */}
        <p className="text-gray-400 text-center mb-8">
          Can&apos;t decide? Let fate choose your next smoke! 🎲
        </p>

        {/* Roulette Display */}
        <div className="relative mb-8">
          {/* Slot Machine Frame */}
          <div className="bg-gradient-to-b from-purple-800/50 to-purple-900/50 rounded-2xl p-6 border-4 border-purple-500/50 shadow-2xl shadow-purple-500/20">
            {/* Display Window */}
            <div className="bg-gray-900 rounded-xl p-4 mb-6 min-h-[120px] flex items-center justify-center relative overflow-hidden">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 animate-pulse" />

              {data && data.brands.length > 0 ? (
                <div
                  className={`text-center z-10 transition-all duration-100 ${
                    isSpinning ? "scale-90 opacity-80" : "scale-100"
                  }`}
                >
                  <div className="text-3xl mb-2">
                    <GiCigar
                      className={`inline-block ${
                        isSpinning ? "animate-bounce" : ""
                      }`}
                    />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {data.brands[currentIndex]?.brand || "?"}
                  </p>
                  {!isSpinning && data.brands[currentIndex] && (
                    <p
                      className={`text-sm mt-1 flex items-center justify-center gap-1 ${getSourceColor(
                        data.brands[currentIndex].source
                      )}`}
                    >
                      {getSourceIcon(data.brands[currentIndex].source)}
                      {getSourceLabel(data.brands[currentIndex].source)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Loading brands...</p>
              )}
            </div>

            {/* Spin Button */}
            <button
              onClick={spin}
              disabled={isSpinning || !data || data.brands.length === 0}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                isSpinning
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg hover:shadow-purple-500/50"
              }`}
            >
              {isSpinning ? (
                <>
                  <FiRefreshCw className="w-5 h-5 animate-spin" />
                  Spinning...
                </>
              ) : (
                <>
                  <FiZap className="w-5 h-5" />
                  SPIN THE WHEEL
                </>
              )}
            </button>
          </div>

          {/* Side Decorations */}
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-4xl">
            🎯
          </div>
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 text-4xl">
            🎯
          </div>
        </div>

        {/* Result Card */}
        {showResult && finalWinner && (
          <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-xl p-6 border border-green-500/30 mb-6 animate-fade-in">
            <div className="text-center">
              <p className="text-green-400 text-sm font-medium mb-2">
                🎉 THE WHEEL HAS SPOKEN! 🎉
              </p>
              <h2 className="text-3xl font-bold text-white mb-3">
                {finalWinner.brand}
              </h2>
              <div
                className={`flex items-center justify-center gap-2 text-sm ${getSourceColor(
                  finalWinner.source
                )}`}
              >
                {getSourceIcon(finalWinner.source)}
                <span>{getSourceLabel(finalWinner.source)}</span>
              </div>
              {(finalWinner.userRating || finalWinner.avgRating) && (
                <div className="flex items-center justify-center gap-1 mt-2 text-amber-400">
                  <FiStar className="w-4 h-4 fill-current" />
                  <span>
                    {finalWinner.userRating || finalWinner.avgRating} rating
                  </span>
                </div>
              )}
              {/* Actions */}
              <div className="flex gap-3 mt-4">
                <Link
                  href={`/cigar/${encodeURIComponent(finalWinner.brand)}`}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition"
                >
                  View Brand
                </Link>
                <Link
                  href={`/checkin?brand=${encodeURIComponent(
                    finalWinner.brand
                  )}`}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white text-sm font-medium transition"
                >
                  Log It! 🔥
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Brand Pool Preview */}
        {data && data.brands.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h3 className="text-gray-400 text-sm font-medium mb-3 flex items-center gap-2">
              <GiCigar className="w-4 h-4" />
              In the Wheel ({data.totalOptions} brands)
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.brands.slice(0, 12).map((brand, i) => (
                <span
                  key={i}
                  className={`text-xs px-2 py-1 rounded-full ${
                    brand.source === "personal"
                      ? "bg-amber-900/50 text-amber-300"
                      : brand.source === "trending"
                      ? "bg-green-900/50 text-green-300"
                      : "bg-pink-900/50 text-pink-300"
                  }`}
                >
                  {brand.brand}
                </span>
              ))}
              {data.brands.length > 12 && (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-400">
                  +{data.brands.length - 12} more
                </span>
              )}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Your brands
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                Trending
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-pink-400" />
                Community
              </span>
            </div>
          </div>
        )}

        {/* Fun Footer */}
        <p className="text-center text-gray-500 text-xs mt-6">
          &quot;Fortune favors the bold smoker&quot; 🎰✨
        </p>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
