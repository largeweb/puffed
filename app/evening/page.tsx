"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FiSunset, FiArrowLeft, FiClock, FiLock, FiAward } from "react-icons/fi";

interface EveningSmoker {
  username: string;
  lastSmoke: string;
  eveningSmokes: number;
  isActive: boolean;
}

interface EveningData {
  isEveningTime: boolean;
  currentHour: number;
  loungeOpen: boolean;
  eveningSmokers: EveningSmoker[];
  stats: {
    totalEveningSmokes: number;
    yourEveningSmokes: number;
    sunsetPercentile: number;
    mostActiveHour: number;
    eveningRegulars: number;
  };
  vibes: {
    message: string;
    emoji: string;
  };
}

export default function EveningLoungePage() {
  const [data, setData] = useState<EveningData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/evening-lounge");
      const json = await res.json() as EveningData;
      setData(json);
    } catch (err) {
      console.error("Failed to fetch evening data:", err);
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
      <main className="min-h-screen bg-gradient-to-br from-orange-950 via-purple-950 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-bounce text-6xl mb-4">🌅</div>
          <p className="text-orange-300">Loading sunset...</p>
        </div>
      </main>
    );
  }

  // Closed state (not evening hours)
  if (!data?.loungeOpen) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="max-w-lg mx-auto p-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
            <FiArrowLeft />
            <span>Back to Dashboard</span>
          </Link>

          <div className="text-center py-16">
            <div className="text-6xl mb-4">🌅</div>
            <h1 className="text-2xl font-bold text-white mb-2">Sunset Lounge</h1>
            <div className="flex items-center justify-center gap-2 text-gray-400 mb-6">
              <FiLock className="text-lg" />
              <span>Opens at 6 PM</span>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <p className="text-gray-300 mb-4">
                The Sunset Lounge is for evening wind-down.
              </p>
              <div className="text-sm text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <FiClock />
                  Open: 6 PM - 10 PM EST
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-4">
                Come back after work for the golden hour smoke session! 🌇
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const { eveningSmokers, stats, vibes } = data;

  // Convert 24h to 12h format for display
  const displayHour = data.currentHour > 12 ? data.currentHour - 12 : data.currentHour;

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-950 via-purple-950 to-gray-950">
      <div className="max-w-lg mx-auto p-4">
        {/* Header */}
        <Link href="/dashboard" className="flex items-center gap-2 text-orange-300 hover:text-white mb-6 transition-colors">
          <FiArrowLeft />
          <span>Back to Dashboard</span>
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-900/50 rounded-full border border-orange-700/50 mb-4">
            <FiSunset className="text-orange-400 animate-pulse" />
            <span className="text-orange-300 text-sm">Lounge Open</span>
            <span className="text-orange-500 text-xs">{displayHour}:00 PM</span>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            Sunset Lounge 🌅
          </h1>
          <p className="text-orange-300/80 text-lg">
            {vibes.emoji} {vibes.message}
          </p>
        </div>

        {/* Your Stats */}
        {stats.yourEveningSmokes > 0 && (
          <div className="bg-gradient-to-r from-orange-900/40 to-purple-900/40 rounded-xl border border-orange-700/50 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-400 text-sm">Your evening smokes</p>
                <p className="text-2xl font-bold text-white">{stats.yourEveningSmokes}</p>
              </div>
              {stats.sunsetPercentile > 0 && (
                <div className="text-right">
                  <p className="text-orange-400 text-sm">Sunset rank</p>
                  <p className="text-lg font-semibold text-orange-300">
                    Top {100 - stats.sunsetPercentile}%
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Platform Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-orange-900/30 rounded-xl p-4 text-center border border-orange-800/30">
            <div className="text-orange-400 text-xl mx-auto mb-1">🌇</div>
            <p className="text-xl font-bold text-white">{stats.totalEveningSmokes}</p>
            <p className="text-orange-500 text-xs">Evening smokes</p>
          </div>
          <div className="bg-purple-900/30 rounded-xl p-4 text-center border border-purple-800/30">
            <div className="text-purple-400 text-xl mx-auto mb-1">👥</div>
            <p className="text-xl font-bold text-white">{stats.eveningRegulars}</p>
            <p className="text-purple-500 text-xs">Regulars</p>
          </div>
          <div className="bg-pink-900/30 rounded-xl p-4 text-center border border-pink-800/30">
            <FiClock className="text-pink-400 text-xl mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{stats.mostActiveHour > 12 ? stats.mostActiveHour - 12 : stats.mostActiveHour} PM</p>
            <p className="text-pink-500 text-xs">Peak hour</p>
          </div>
        </div>

        {/* Evening Smokers */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiAward className="text-orange-400" />
            <h2 className="text-lg font-semibold text-white">Sunset Crew Tonight</h2>
          </div>

          {eveningSmokers.length === 0 ? (
            <div className="text-center py-8 bg-orange-900/20 rounded-xl border border-orange-800/30">
              <div className="text-4xl mb-4">🌇</div>
              <h3 className="text-lg text-white mb-2">First one here!</h3>
              <p className="text-orange-400 text-sm">
                Log an evening smoke to claim your spot at sunset.
              </p>
              <Link
                href="/checkin"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
              >
                <FiSunset />
                Log a Smoke
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {eveningSmokers.map((smoker, i) => (
                <div
                  key={smoker.username}
                  className="flex items-center gap-4 bg-orange-900/20 rounded-xl border border-orange-800/30 p-4 hover:border-orange-700/50 transition-colors"
                >
                  <div className="text-2xl">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🌅"}
                  </div>
                  <div className="flex-1">
                    <Link
                      href={`/user/${smoker.username}`}
                      className="font-medium text-orange-300 hover:text-white transition-colors"
                    >
                      @{smoker.username}
                    </Link>
                    <p className="text-orange-500 text-sm">
                      {smoker.eveningSmokes} evening smoke{smoker.eveningSmokes !== 1 ? "s" : ""} total
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm ${smoker.isActive ? "text-green-400" : "text-orange-500"}`}>
                      {smoker.isActive ? "🟢 Active" : smoker.lastSmoke}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-orange-800/40 to-purple-800/40 rounded-xl border border-orange-600/50 p-6 text-center">
          <p className="text-orange-200 mb-3">
            Unwind from the day. Light one up at sunset.
          </p>
          <Link
            href="/checkin"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors"
          >
            <FiSunset />
            Log a Smoke Now
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pt-8 border-t border-orange-800/30">
          <p className="text-orange-500 text-sm">
            Sunset Lounge • 6 PM - 10 PM EST
          </p>
        </div>
      </div>
    </main>
  );
}
