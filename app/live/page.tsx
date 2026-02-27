"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiClock, FiUsers, FiTrendingUp, FiZap } from "react-icons/fi";

interface ActiveSmoker {
  id: number;
  brand: string;
  product: string | null;
  rating: number;
  review: string | null;
  image_url: string | null;
  created_at: number;
  category: string | null;
  username: string;
  avatar_url: string | null;
  seconds_ago: number;
}

interface RecentSmoker {
  id: number;
  brand: string;
  product: string | null;
  rating: number;
  created_at: number;
  category: string | null;
  username: string;
  avatar_url: string | null;
  seconds_ago: number;
}

interface LiveData {
  activeSmokers: ActiveSmoker[];
  recentSmokers: RecentSmoker[];
  stats: {
    activeCount: number;
    recentCount: number;
    todayTotal: number;
    peakHour: number | null;
    peakHourCount: number;
    hotBrand: string | null;
    hotBrandCount: number;
  };
  timestamp: number;
}

function formatTimeAgo(seconds: number): string {
  if (seconds < 60) return "just now";
  if (seconds < 120) return "1 min ago";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 7200) return "1 hour ago";
  return `${Math.floor(seconds / 3600)} hours ago`;
}

function getCategoryEmoji(category: string | null): string {
  switch (category) {
    case "cigar": return "🚬";
    case "cannabis": return "🌿";
    case "hookah": return "💨";
    case "vape": return "🌫️";
    default: return "🚬";
  }
}

function formatHour(hour: number | null): string {
  if (hour === null) return "—";
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h} ${ampm}`;
}

export default function LiveSmokersPage() {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/live-smokers");
      if (res.ok) {
        const json = await res.json() as LiveData;
        setData(json);
        setLastRefresh(new Date());
      }
    } catch (e) {
      console.error("Failed to fetch live data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-green-900 to-emerald-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="text-green-300 hover:text-white transition-colors">
            <FiArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <span className="relative">
                <span className="animate-pulse">🟢</span>
              </span>
              Live Smokers
            </h1>
            <p className="text-green-300 text-sm">See who&apos;s smoking right now</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin text-4xl mb-4">🟢</div>
            <p className="text-green-300">Loading live activity...</p>
          </div>
        ) : data ? (
          <>
            {/* Live Stats Banner */}
            <div className="bg-gradient-to-r from-green-800/50 to-emerald-800/50 rounded-2xl p-6 mb-6 border border-green-600/30">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-green-400 flex items-center justify-center gap-1">
                    <span className="animate-pulse">●</span>
                    {data.stats.activeCount}
                  </div>
                  <div className="text-green-300 text-xs">Smoking Now</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-300">{data.stats.recentCount}</div>
                  <div className="text-green-300/70 text-xs">Last 2 Hours</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{data.stats.todayTotal}</div>
                  <div className="text-green-300/70 text-xs">Today Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-400">{formatHour(data.stats.peakHour)}</div>
                  <div className="text-green-300/70 text-xs">Peak Hour</div>
                </div>
              </div>
              
              {data.stats.hotBrand && (
                <div className="mt-4 pt-4 border-t border-green-600/30 text-center">
                  <span className="text-green-300 text-sm">🔥 Hot Right Now: </span>
                  <span className="text-white font-semibold">{data.stats.hotBrand}</span>
                  <span className="text-green-400 text-sm ml-1">({data.stats.hotBrandCount} smokes)</span>
                </div>
              )}
            </div>

            {/* Active Smokers (Last Hour) */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FiZap className="text-green-400" />
                Smoking Right Now
                <span className="text-green-400 text-sm font-normal">(last hour)</span>
              </h2>
              
              {data.activeSmokers.length > 0 ? (
                <div className="space-y-4">
                  {data.activeSmokers.map((smoker) => (
                    <div
                      key={smoker.id}
                      className="bg-green-800/40 rounded-xl p-4 border border-green-600/30 hover:border-green-500/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-green-700 flex items-center justify-center text-xl">
                            {smoker.avatar_url ? (
                              <img src={smoker.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              "🧑"
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-green-900 animate-pulse" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Link href={`/user/${smoker.username}`} className="font-semibold text-white hover:text-green-300">
                              @{smoker.username}
                            </Link>
                            <span className="text-green-400 text-xs flex items-center gap-1">
                              <FiClock size={10} />
                              {formatTimeAgo(smoker.seconds_ago)}
                            </span>
                          </div>
                          <div className="text-green-200 mt-1">
                            <span className="mr-1">{getCategoryEmoji(smoker.category)}</span>
                            <Link href={`/cigar/${encodeURIComponent(smoker.brand)}`} className="font-medium hover:text-white">
                              {smoker.brand}
                            </Link>
                            {smoker.product && (
                              <span className="text-green-300/70"> · {smoker.product}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-amber-400">{"⭐".repeat(smoker.rating)}</span>
                          </div>
                          {smoker.review && (
                            <p className="text-green-300/80 text-sm mt-2 italic">&quot;{smoker.review.slice(0, 100)}{smoker.review.length > 100 ? "..." : ""}&quot;</p>
                          )}
                        </div>
                        {smoker.image_url && (
                          <div className="w-16 h-16 rounded-lg overflow-hidden">
                            <img src={smoker.image_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-green-800/30 rounded-xl p-8 text-center border border-green-600/20">
                  <div className="text-4xl mb-3">😴</div>
                  <p className="text-green-300">No one&apos;s smoking right now</p>
                  <p className="text-green-400/70 text-sm mt-1">Be the first to light up!</p>
                  <Link href="/checkin" className="inline-block mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors">
                    Log a Smoke
                  </Link>
                </div>
              )}
            </div>

            {/* Recently Active (1-2 Hours) */}
            {data.recentSmokers.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <FiClock className="text-green-300/70" />
                  Recently Active
                  <span className="text-green-400/70 text-sm font-normal">(1-2 hours ago)</span>
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.recentSmokers.map((smoker) => (
                    <div
                      key={smoker.id}
                      className="bg-green-800/20 rounded-lg p-3 border border-green-600/20"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-700/50 flex items-center justify-center text-sm">
                          {smoker.avatar_url ? (
                            <img src={smoker.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            "🧑"
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link href={`/user/${smoker.username}`} className="font-medium text-white hover:text-green-300 text-sm truncate block">
                            @{smoker.username}
                          </Link>
                          <div className="text-green-300/70 text-xs truncate">
                            {getCategoryEmoji(smoker.category)} {smoker.brand}
                          </div>
                        </div>
                        <div className="text-green-400/50 text-xs">{formatTimeAgo(smoker.seconds_ago)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Refresh indicator */}
            {lastRefresh && (
              <div className="mt-8 text-center text-green-400/50 text-xs">
                Auto-refreshes every 30s · Last: {lastRefresh.toLocaleTimeString()}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-green-300">
            Failed to load live data
          </div>
        )}
      </div>
    </div>
  );
}
