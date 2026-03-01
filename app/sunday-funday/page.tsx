"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FiArrowLeft, FiClock, FiLock, FiStar, FiUsers, FiZap, FiSun } from "react-icons/fi";

interface FundayUser {
  username: string;
  lastSmoke: string;
  sundaySmokes: number;
  fundaySmokes: number;
  isActive: boolean;
}

interface FundayData {
  isSunday: boolean;
  isFundayTime: boolean;
  currentHour: number;
  loungeOpen: boolean;
  fundayers: FundayUser[];
  stats: {
    totalFundaySmokes: number;
    yourFundaySmokes: number;
    fundayPercentile: number;
    favoriteFundayBrand: string | null;
    fundayRegulars: number;
    avgFundayRating: number;
  };
  vibes: {
    message: string;
    emoji: string;
  };
  activities: string[];
  hoursLeft: number;
}

export default function SundayFundayPage() {
  const [data, setData] = useState<FundayData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/sunday-funday");
      const json = (await res.json()) as FundayData;
      setData(json);
    } catch (err) {
      console.error("Failed to fetch funday data:", err);
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
      <main className="min-h-screen bg-gradient-to-br from-yellow-600 via-orange-500 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-bounce text-6xl mb-4">🎉</div>
          <p className="text-white/80">Getting the party started...</p>
        </div>
      </main>
    );
  }

  // Closed state
  if (!data?.loungeOpen) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="max-w-lg mx-auto p-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
          >
            <FiArrowLeft />
            <span>Back to Dashboard</span>
          </Link>

          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎉</div>

            <FiLock className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <h1 className="text-3xl font-bold text-white mb-2">Sunday Funday</h1>
            <p className="text-gray-400 mb-6">
              {data?.isSunday
                ? "Opens at 11 AM — the midday celebration!"
                : "Come back on Sunday for funday vibes!"}
            </p>

            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
              <FiClock className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-gray-500 text-sm">Open Sundays 11 AM - 6 PM</p>
              <p className="text-gray-600 text-xs mt-1">
                Maximize the last day of your weekend!
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-600 via-orange-500 to-pink-500 relative overflow-hidden">
      {/* Confetti animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
              fontSize: `${20 + Math.random() * 20}px`,
              opacity: 0.6,
            }}
          >
            {["🎉", "🎊", "✨", "🌟", "🎈", "🎁"][Math.floor(Math.random() * 6)]}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(10deg);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

      <div className="max-w-lg mx-auto p-4 relative z-10">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-white/80 hover:text-white mb-6"
        >
          <FiArrowLeft />
          <span>Back to Dashboard</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-2">🎉</div>
          <h1 className="text-3xl font-bold text-white mb-1">Sunday Funday!</h1>
          <p className="text-white/80">Make the most of your weekend!</p>
        </div>

        {/* Countdown */}
        {data.hoursLeft > 0 && (
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-6 text-center border border-white/20">
            <FiClock className="w-6 h-6 mx-auto mb-2 text-white" />
            <p className="text-white/80 text-sm">Hours left of funday</p>
            <p className="text-3xl font-bold text-white">{data.hoursLeft}h</p>
            <p className="text-white/60 text-xs mt-1">Until Monday reality hits 😅</p>
          </div>
        )}

        {/* Vibes */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-6 text-center border border-white/20">
          <span className="text-4xl">{data.vibes.emoji}</span>
          <p className="text-white font-medium mt-2">{data.vibes.message}</p>
        </div>

        {/* Activity suggestions */}
        {data.activities.length > 0 && (
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-6 border border-white/20">
            <div className="flex items-center gap-2 mb-3">
              <FiZap className="text-yellow-300" />
              <h2 className="text-white font-semibold">Funday Activity Ideas</h2>
            </div>
            <div className="space-y-2">
              {data.activities.map((activity, idx) => (
                <div
                  key={idx}
                  className="bg-white/10 rounded-lg px-3 py-2 text-white/90 text-sm"
                >
                  {activity}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Who's having fun */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-6 border border-white/20">
          <div className="flex items-center gap-2 mb-3">
            <FiUsers className="text-white" />
            <h2 className="text-white font-semibold">Who&apos;s Having Fun</h2>
          </div>
          {data.fundayers.length > 0 ? (
            <div className="space-y-2">
              {data.fundayers.slice(0, 8).map((user, idx) => (
                <Link
                  key={user.username}
                  href={`/user/${user.username}`}
                  className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2 hover:bg-white/20 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {idx === 0 ? "🥳" : idx === 1 ? "🎊" : idx === 2 ? "🎈" : "🎉"}
                    </span>
                    <span className="text-white font-medium">@{user.username}</span>
                    {user.isActive && (
                      <span className="text-xs bg-green-500/30 text-green-300 px-2 py-0.5 rounded-full">
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-300 text-sm font-medium">
                      {user.fundaySmokes} funday 💨
                    </p>
                    <p className="text-white/50 text-xs">{user.sundaySmokes} total Sun</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-white/60 text-center py-4">
              No one&apos;s logged a funday smoke yet — be first! 🎉
            </p>
          )}
        </div>

        {/* Funday Legends */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-6 border border-white/20">
          <div className="flex items-center gap-2 mb-3">
            <FiStar className="text-yellow-300" />
            <h2 className="text-white font-semibold">Funday Legends</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-300">
                {data.stats.totalFundaySmokes}
              </p>
              <p className="text-white/60 text-xs">Total Funday Smokes</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-pink-300">
                {data.stats.fundayRegulars}
              </p>
              <p className="text-white/60 text-xs">Funday Regulars</p>
            </div>
          </div>
        </div>

        {/* Your stats */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-6 border border-white/20">
          <div className="flex items-center gap-2 mb-3">
            <FiSun className="text-yellow-300" />
            <h2 className="text-white font-semibold">Your Funday Stats</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">
                {data.stats.yourFundaySmokes}
              </p>
              <p className="text-white/60 text-xs">Your Funday Smokes</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-300">
                {data.stats.fundayPercentile > 0
                  ? `Top ${data.stats.fundayPercentile}%`
                  : "—"}
              </p>
              <p className="text-white/60 text-xs">Funday Percentile</p>
            </div>
            {data.stats.favoriteFundayBrand && (
              <div className="col-span-2 bg-white/10 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-orange-300">
                  {data.stats.favoriteFundayBrand}
                </p>
                <p className="text-white/60 text-xs">Your Funday Favorite</p>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/dashboard"
          className="block bg-white text-orange-600 rounded-xl py-3 text-center font-bold text-lg hover:bg-yellow-100 transition shadow-lg"
        >
          Log a Funday Smoke! 🎉
        </Link>

        {/* Platform stats */}
        <div className="mt-6 text-center text-white/50 text-xs">
          <p>
            Avg Funday Rating: ⭐{" "}
            {data.stats.avgFundayRating?.toFixed(1) || "—"}
          </p>
          <p className="mt-1">Make it count — Monday&apos;s coming! 😅</p>
        </div>
      </div>
    </main>
  );
}
