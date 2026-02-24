"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FiSun, FiArrowLeft, FiClock, FiLock, FiCoffee, FiAward } from "react-icons/fi";

interface EarlyBirdUser {
  username: string;
  lastSmoke: string;
  morningSmokes: number;
  isActive: boolean;
}

interface MorningData {
  isMorningTime: boolean;
  currentHour: number;
  loungeOpen: boolean;
  earlyBirds: EarlyBirdUser[];
  stats: {
    totalMorningSmokes: number;
    yourMorningSmokes: number;
    earlyBirdPercentile: number;
    mostActiveHour: number;
    morningRisers: number;
  };
  vibes: {
    message: string;
    emoji: string;
  };
}

export default function MorningCoffeePage() {
  const [data, setData] = useState<MorningData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/morning-coffee");
      const json = await res.json() as MorningData;
      setData(json);
    } catch (err) {
      console.error("Failed to fetch morning data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-amber-950 via-orange-950 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-bounce text-6xl mb-4">☕</div>
          <p className="text-amber-300">Brewing...</p>
        </div>
      </main>
    );
  }

  // Closed state (not morning hours)
  if (!data?.loungeOpen) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="max-w-lg mx-auto p-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
            <FiArrowLeft />
            <span>Back to Dashboard</span>
          </Link>

          <div className="text-center py-16">
            <div className="text-6xl mb-4">☕</div>
            <h1 className="text-2xl font-bold text-white mb-2">Morning Coffee</h1>
            <div className="flex items-center justify-center gap-2 text-gray-400 mb-6">
              <FiLock className="text-lg" />
              <span>Opens at 5 AM</span>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <p className="text-gray-300 mb-4">
                The Morning Coffee lounge is for early risers.
              </p>
              <div className="text-sm text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <FiClock />
                  Open: 5 AM - 10 AM EST
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-4">
                Set your alarm and join the dawn patrol for your morning smoke! 🌅
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const { earlyBirds, stats, vibes } = data;

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-950 via-orange-950 to-gray-950">
      <div className="max-w-lg mx-auto p-4">
        {/* Header */}
        <Link href="/dashboard" className="flex items-center gap-2 text-amber-300 hover:text-white mb-6 transition-colors">
          <FiArrowLeft />
          <span>Back to Dashboard</span>
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-900/50 rounded-full border border-amber-700/50 mb-4">
            <FiSun className="text-amber-400 animate-pulse" />
            <span className="text-amber-300 text-sm">Lounge Open</span>
            <span className="text-amber-500 text-xs">{data.currentHour}:00 AM</span>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            Morning Coffee ☕
          </h1>
          <p className="text-amber-300/80 text-lg">
            {vibes.emoji} {vibes.message}
          </p>
        </div>

        {/* Your Stats */}
        {stats.yourMorningSmokes > 0 && (
          <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 rounded-xl border border-amber-700/50 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-400 text-sm">Your morning smokes</p>
                <p className="text-2xl font-bold text-white">{stats.yourMorningSmokes}</p>
              </div>
              {stats.earlyBirdPercentile > 0 && (
                <div className="text-right">
                  <p className="text-amber-400 text-sm">Early Bird rank</p>
                  <p className="text-lg font-semibold text-amber-300">
                    Top {100 - stats.earlyBirdPercentile}%
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Platform Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-amber-900/30 rounded-xl p-4 text-center border border-amber-800/30">
            <FiCoffee className="text-amber-400 text-xl mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{stats.totalMorningSmokes}</p>
            <p className="text-amber-500 text-xs">Morning smokes</p>
          </div>
          <div className="bg-amber-900/30 rounded-xl p-4 text-center border border-amber-800/30">
            <FiSun className="text-orange-400 text-xl mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{stats.morningRisers}</p>
            <p className="text-amber-500 text-xs">Early risers</p>
          </div>
          <div className="bg-amber-900/30 rounded-xl p-4 text-center border border-amber-800/30">
            <FiClock className="text-yellow-400 text-xl mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{stats.mostActiveHour} AM</p>
            <p className="text-amber-500 text-xs">Peak hour</p>
          </div>
        </div>

        {/* Early Birds */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiAward className="text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Early Birds This Morning</h2>
          </div>

          {earlyBirds.length === 0 ? (
            <div className="text-center py-8 bg-amber-900/20 rounded-xl border border-amber-800/30">
              <div className="text-4xl mb-4">🌅</div>
              <h3 className="text-lg text-white mb-2">Be the first today!</h3>
              <p className="text-amber-400 text-sm">
                Log a morning smoke to claim your spot on the dawn patrol.
              </p>
              <Link
                href="/checkin"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
              >
                <FiCoffee />
                Log a Smoke
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {earlyBirds.map((bird, i) => (
                <div
                  key={bird.username}
                  className="flex items-center gap-4 bg-amber-900/20 rounded-xl border border-amber-800/30 p-4 hover:border-amber-700/50 transition-colors"
                >
                  <div className="text-2xl">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "☕"}
                  </div>
                  <div className="flex-1">
                    <Link
                      href={`/user/${bird.username}`}
                      className="font-medium text-amber-300 hover:text-white transition-colors"
                    >
                      @{bird.username}
                    </Link>
                    <p className="text-amber-500 text-sm">
                      {bird.morningSmokes} morning smoke{bird.morningSmokes !== 1 ? "s" : ""} total
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm ${bird.isActive ? "text-green-400" : "text-amber-500"}`}>
                      {bird.isActive ? "🟢 Active" : bird.lastSmoke}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-amber-800/40 to-orange-800/40 rounded-xl border border-amber-600/50 p-6 text-center">
          <p className="text-amber-200 mb-3">
            Rise and grind! Log your morning smoke.
          </p>
          <Link
            href="/checkin"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors"
          >
            <FiCoffee />
            Log a Smoke Now
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pt-8 border-t border-amber-800/30">
          <p className="text-amber-500 text-sm">
            Morning Coffee Lounge • 5 AM - 10 AM EST
          </p>
        </div>
      </div>
    </main>
  );
}
