"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiArrowLeft, FiClock, FiCalendar, FiUsers, FiTrendingUp, FiStar, FiZap, FiSunset } from "react-icons/fi";

interface ActiveSmoker {
  username: string;
  brand: string;
  rating: number | null;
  minutesAgo: number;
  avatar_url: string | null;
}

interface HotTake {
  id: string;
  username: string;
  take: string;
  upvotes: number;
  downvotes: number;
}

interface ThursdayData {
  isThursday: boolean;
  dayName: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  hoursUntilWeekend: number;
  activeSmokersTonight: ActiveSmoker[];
  hotTakesToday: HotTake[];
  tonightsPick: {
    brand: string;
    reason: string;
    checkinsTonight: number;
    avgRating: number | null;
  } | null;
  communityMood: {
    avgRating: number | null;
    totalCheckinsToday: number;
    topBrandToday: string | null;
    vibeEmoji: string;
    vibeText: string;
  };
  thursdayStats: {
    allTimeThursdayCheckins: number;
    avgThursdayRating: number | null;
    favoriteThursdayBrand: string | null;
  };
}

export default function ThursdayHubPage() {
  const [data, setData] = useState<ThursdayData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/thursday-hub");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json() as ThursdayData;
      setData(json);
    } catch (err) {
      console.error("Failed to fetch Thursday hub:", err);
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
      <main className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-950 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">🍻</div>
          <p className="text-violet-300">Loading Thursday vibes...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>Failed to load Thursday Hub</p>
          <Link href="/dashboard" className="text-violet-400 hover:text-violet-300 mt-2 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const { isThursday, dayName, timeOfDay, hoursUntilWeekend, activeSmokersTonight, hotTakesToday, tonightsPick, communityMood, thursdayStats } = data;

  // Different messaging based on whether it's actually Thursday
  const getHeaderEmoji = () => {
    if (!isThursday) return "📅";
    if (timeOfDay === "evening" || timeOfDay === "night") return "🌆";
    if (timeOfDay === "afternoon") return "☀️";
    return "🌅";
  };

  const getHeaderText = () => {
    if (!isThursday) {
      return `It's ${dayName}... but Thursday vibes never die!`;
    }
    if (timeOfDay === "evening") return "Thursday Evening Session";
    if (timeOfDay === "night") return "Thursday Night Mode";
    if (timeOfDay === "afternoon") return "Thursday Afternoon";
    return "Thursday Morning Start";
  };

  const getSubheadText = () => {
    if (hoursUntilWeekend === 0) return "🎉 The weekend is HERE!";
    if (hoursUntilWeekend <= 2) return "🔥 Weekend countdown: almost there!";
    if (hoursUntilWeekend <= 24) return `⏰ ${hoursUntilWeekend} hours until weekend`;
    return `📅 ${Math.floor(hoursUntilWeekend / 24)}d ${hoursUntilWeekend % 24}h to the weekend`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-950 to-gray-950">
      <div className="max-w-lg mx-auto p-4">
        {/* Header */}
        <Link href="/dashboard" className="flex items-center gap-2 text-violet-300 hover:text-white mb-6 transition-colors">
          <FiArrowLeft />
          <span>Back to Dashboard</span>
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-900/50 rounded-full border border-violet-700/50 mb-4">
            <FiSunset className="text-violet-400" />
            <span className="text-violet-300 text-sm capitalize">{dayName} {timeOfDay}</span>
            {isThursday && <span className="text-xs bg-violet-600/50 px-2 py-0.5 rounded-full">🔥 LIVE</span>}
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            {getHeaderEmoji()} Thursday Hub
          </h1>
          <p className="text-violet-300/80 text-lg mb-2">
            {getHeaderText()}
          </p>
          <p className="text-violet-400/60 text-sm">
            {getSubheadText()}
          </p>
        </div>

        {/* Community Mood Card */}
        <div className="bg-gradient-to-r from-violet-900/40 to-purple-900/40 rounded-xl border border-violet-700/50 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FiZap className="text-violet-400" />
            <h2 className="text-white font-semibold">Community Mood</h2>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{communityMood.vibeEmoji}</span>
              <div>
                <p className="text-white font-medium">{communityMood.vibeText}</p>
                <p className="text-violet-400 text-sm">
                  {communityMood.totalCheckinsToday} check-in{communityMood.totalCheckinsToday !== 1 ? "s" : ""} today
                </p>
              </div>
            </div>
            {communityMood.avgRating && (
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-400">
                  {communityMood.avgRating}⭐
                </p>
                <p className="text-violet-400 text-xs">avg rating</p>
              </div>
            )}
          </div>

          {communityMood.topBrandToday && (
            <div className="mt-3 pt-3 border-t border-violet-700/30">
              <p className="text-violet-300 text-sm">
                🔥 Top brand today: <span className="text-white font-medium">{communityMood.topBrandToday}</span>
              </p>
            </div>
          )}
        </div>

        {/* Tonight's Pick */}
        {tonightsPick && (
          <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl border border-amber-700/40 p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <FiStar className="text-amber-400" />
              <h2 className="text-white font-semibold">Tonight&apos;s Pick</h2>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-white">{tonightsPick.brand}</p>
                <p className="text-amber-300/80 text-sm">{tonightsPick.reason}</p>
              </div>
              <div className="text-right">
                {tonightsPick.avgRating && (
                  <p className="text-lg font-semibold text-yellow-400">{tonightsPick.avgRating}⭐</p>
                )}
                <p className="text-amber-400 text-xs">{tonightsPick.checkinsTonight} tonight</p>
              </div>
            </div>
            
            <Link 
              href="/checkin" 
              className="mt-3 block text-center bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 rounded-lg py-2 transition-colors"
            >
              Log this brand →
            </Link>
          </div>
        )}

        {/* Active Smokers Tonight */}
        <div className="bg-gray-900/50 rounded-xl border border-violet-700/30 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FiUsers className="text-green-400" />
              <h2 className="text-white font-semibold">Active Tonight</h2>
            </div>
            {activeSmokersTonight.length > 0 && (
              <span className="flex items-center gap-1 text-green-400 text-sm">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {activeSmokersTonight.length} smoking
              </span>
            )}
          </div>

          {activeSmokersTonight.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400">No one smoking right now</p>
              <p className="text-violet-400 text-sm mt-1">Be the first to light up tonight! 🔥</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSmokersTonight.slice(0, 5).map((smoker, i) => (
                <Link 
                  key={`${smoker.username}-${i}`}
                  href={`/user/${smoker.username}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-violet-900/20 transition-colors"
                >
                  {smoker.avatar_url ? (
                    <Image 
                      src={smoker.avatar_url} 
                      alt={smoker.username}
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-9 h-9 bg-violet-800 rounded-full flex items-center justify-center text-violet-300 font-medium">
                      {smoker.username[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{smoker.username}</p>
                    <p className="text-violet-400 text-sm truncate">{smoker.brand}</p>
                  </div>
                  <div className="text-right">
                    {smoker.rating && (
                      <p className="text-yellow-400 text-sm">{smoker.rating}⭐</p>
                    )}
                    <p className="text-gray-500 text-xs">
                      {smoker.minutesAgo === 0 ? "now" : `${smoker.minutesAgo}m`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Hot Takes (if any) */}
        {hotTakesToday.length > 0 && (
          <div className="bg-gradient-to-r from-rose-900/30 to-pink-900/30 rounded-xl border border-rose-700/40 p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <FiTrendingUp className="text-rose-400" />
              <h2 className="text-white font-semibold">Hot Takes This Week 🔥</h2>
            </div>
            
            <div className="space-y-3">
              {hotTakesToday.slice(0, 3).map((take) => (
                <div key={take.id} className="bg-rose-900/20 rounded-lg p-3">
                  <p className="text-white text-sm mb-2">&ldquo;{take.take}&rdquo;</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-rose-300">@{take.username}</span>
                    <span className="text-gray-400">
                      👍 {take.upvotes} | 👎 {take.downvotes}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thursday Stats */}
        <div className="bg-gray-900/50 rounded-xl border border-violet-700/30 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FiCalendar className="text-violet-400" />
            <h2 className="text-white font-semibold">All-Time Thursday Stats</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-violet-300">{thursdayStats.allTimeThursdayCheckins}</p>
              <p className="text-gray-500 text-xs">Thursday smokes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400">
                {thursdayStats.avgThursdayRating || "—"}
              </p>
              <p className="text-gray-500 text-xs">avg rating</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white truncate">
                {thursdayStats.favoriteThursdayBrand || "—"}
              </p>
              <p className="text-gray-500 text-xs">fave brand</p>
            </div>
          </div>
        </div>

        {/* Thursday CTA */}
        <div className="text-center pb-8">
          <Link
            href="/checkin"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-violet-900/50"
          >
            <FiClock />
            Log Your Thursday Smoke
          </Link>
          <p className="text-violet-400/60 text-sm mt-3">
            Make Thursdays count! 🍻
          </p>
        </div>
      </div>
    </main>
  );
}
