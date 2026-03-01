"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FiArrowLeft, FiClock, FiLock, FiAward, FiStar, FiUsers } from "react-icons/fi";
import { GiChampagneGlass } from "react-icons/gi";

interface BrunchUser {
  username: string;
  lastSmoke: string;
  sundaySmokes: number;
  brunchSmokes: number;
  isActive: boolean;
}

interface BrunchData {
  isSunday: boolean;
  isBrunchTime: boolean;
  currentHour: number;
  loungeOpen: boolean;
  brunchers: BrunchUser[];
  stats: {
    totalBrunchSmokes: number;
    yourBrunchSmokes: number;
    brunchPercentile: number;
    favoriteBrunchBrand: string | null;
    brunchRegulars: number;
    avgBrunchRating: number;
  };
  vibes: {
    message: string;
    emoji: string;
  };
  specials: string[];
}

export default function SundayBrunchPage() {
  const [data, setData] = useState<BrunchData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/brunch");
      const json = await res.json() as BrunchData;
      setData(json);
    } catch (err) {
      console.error("Failed to fetch brunch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-rose-950 via-amber-950 to-orange-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-bounce text-6xl mb-4">🥂</div>
          <p className="text-rose-300">Setting the table...</p>
        </div>
      </main>
    );
  }

  // Closed state
  if (!data?.loungeOpen) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="max-w-lg mx-auto p-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
            <FiArrowLeft />
            <span>Back to Dashboard</span>
          </Link>

          <div className="text-center py-16">
            <div className="text-6xl mb-4">🥂</div>
            <h1 className="text-2xl font-bold text-white mb-2">Sunday Brunch</h1>
            <div className="flex items-center justify-center gap-2 text-gray-400 mb-6">
              <FiLock className="text-lg" />
              <span>Sundays Only • 10 AM - 3 PM</span>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <p className="text-gray-300 mb-4">
                {data?.vibes?.message || "The Sunday Brunch is an exclusive weekly gathering."}
              </p>
              <div className="text-sm text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <FiClock />
                  Opens: Sundays 10 AM - 3 PM EST
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-4">
                {!data?.isSunday 
                  ? "Mark your calendar! See you Sunday for mimosas & smokes. 🍾"
                  : data?.currentHour < 10
                    ? "Brunch starts at 10 AM. Sleep in a little longer! 😴"
                    : "Brunch is over for today. Same time next week? 🥂"
                }
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const { brunchers, stats, vibes, specials } = data;

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-950 via-amber-950 to-orange-950 relative overflow-hidden">
      {/* Champagne bubbles animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-amber-200/10 animate-float"
            style={{
              width: `${8 + Math.random() * 12}px`,
              height: `${8 + Math.random() * 12}px`,
              left: `${Math.random() * 100}%`,
              bottom: `-20px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${6 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <div className="max-w-lg mx-auto p-4 relative z-10">
        {/* Header */}
        <Link href="/dashboard" className="flex items-center gap-2 text-rose-300 hover:text-white mb-6 transition-colors">
          <FiArrowLeft />
          <span>Back to Dashboard</span>
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-900/50 rounded-full border border-rose-700/50 mb-4">
            <GiChampagneGlass className="text-amber-400 animate-pulse" />
            <span className="text-rose-300 text-sm">Brunch is Served</span>
            <span className="text-rose-400 text-xs">{data.currentHour > 12 ? data.currentHour - 12 : data.currentHour}:00 {data.currentHour >= 12 ? "PM" : "AM"}</span>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            Sunday Brunch 🥂
          </h1>
          <p className="text-rose-300/80 text-lg">
            {vibes.emoji} {vibes.message}
          </p>
        </div>

        {/* Daily Specials */}
        {specials.length > 0 && (
          <div className="bg-gradient-to-r from-amber-900/30 to-rose-900/30 rounded-xl border border-amber-700/30 p-4 mb-6">
            <h3 className="text-amber-300 font-semibold mb-3 flex items-center gap-2">
              <span>✨</span> Today&apos;s Specials
            </h3>
            <ul className="space-y-2">
              {specials.map((special, i) => (
                <li key={i} className="text-rose-200/90 text-sm">{special}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Your Stats */}
        {stats.yourBrunchSmokes > 0 && (
          <div className="bg-gradient-to-r from-rose-900/40 to-amber-900/40 rounded-xl border border-rose-700/50 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-rose-400 text-sm">Your brunch smokes</p>
                <p className="text-2xl font-bold text-white">{stats.yourBrunchSmokes}</p>
              </div>
              {stats.brunchPercentile > 0 && (
                <div className="text-right">
                  <p className="text-rose-400 text-sm">Brunch Regular rank</p>
                  <p className="text-lg font-semibold text-amber-300">
                    Top {100 - stats.brunchPercentile}%
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Platform Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-rose-900/30 rounded-xl p-4 text-center border border-rose-800/30">
            <GiChampagneGlass className="text-amber-400 text-xl mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{stats.totalBrunchSmokes}</p>
            <p className="text-rose-400 text-xs">Brunch smokes</p>
          </div>
          <div className="bg-rose-900/30 rounded-xl p-4 text-center border border-rose-800/30">
            <FiUsers className="text-rose-400 text-xl mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{stats.brunchRegulars}</p>
            <p className="text-rose-400 text-xs">Regulars</p>
          </div>
          <div className="bg-rose-900/30 rounded-xl p-4 text-center border border-rose-800/30">
            <FiStar className="text-yellow-400 text-xl mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{stats.avgBrunchRating || "—"}</p>
            <p className="text-rose-400 text-xs">Avg rating</p>
          </div>
        </div>

        {/* Favorite Brunch Brand */}
        {stats.favoriteBrunchBrand && (
          <div className="bg-amber-900/20 rounded-lg p-3 mb-6 border border-amber-800/30 text-center">
            <span className="text-amber-400 text-sm">🏆 Favorite brunch brand: </span>
            <span className="text-white font-medium">{stats.favoriteBrunchBrand}</span>
          </div>
        )}

        {/* Brunchers */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiAward className="text-rose-400" />
            <h2 className="text-lg font-semibold text-white">Today&apos;s Brunch Crowd</h2>
          </div>

          {brunchers.length === 0 ? (
            <div className="text-center py-8 bg-rose-900/20 rounded-xl border border-rose-800/30">
              <div className="text-4xl mb-4">🍾</div>
              <h3 className="text-lg text-white mb-2">First to brunch!</h3>
              <p className="text-rose-400 text-sm">
                Pop the cork and log a smoke to start the party.
              </p>
              <Link
                href="/checkin"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors"
              >
                <GiChampagneGlass />
                Log a Smoke
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {brunchers.map((guest, i) => (
                <div
                  key={guest.username}
                  className="flex items-center gap-4 bg-rose-900/20 rounded-xl border border-rose-800/30 p-4 hover:border-rose-700/50 transition-colors"
                >
                  <div className="text-2xl">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🥂"}
                  </div>
                  <div className="flex-1">
                    <Link
                      href={`/user/${guest.username}`}
                      className="font-medium text-rose-300 hover:text-white transition-colors"
                    >
                      @{guest.username}
                    </Link>
                    <p className="text-rose-500 text-sm">
                      {guest.brunchSmokes} brunch smoke{guest.brunchSmokes !== 1 ? "s" : ""} all-time
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm ${guest.isActive ? "text-green-400" : "text-rose-400"}`}>
                      {guest.isActive ? "🟢 Active" : guest.lastSmoke}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-rose-800/40 to-amber-800/40 rounded-xl border border-rose-600/50 p-6 text-center">
          <p className="text-rose-200 mb-3">
            Grab a mimosa and log your Sunday smoke 🍾
          </p>
          <Link
            href="/checkin"
            className="inline-flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg transition-colors"
          >
            <GiChampagneGlass />
            Log a Smoke Now
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pt-8 border-t border-rose-800/30">
          <p className="text-rose-500 text-sm">
            Sunday Brunch • Sundays 10 AM - 3 PM EST
          </p>
        </div>
      </div>

      {/* Bubble animation keyframes */}
      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.3;
          }
          100% {
            transform: translateY(-100vh) scale(0.5);
            opacity: 0;
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </main>
  );
}
