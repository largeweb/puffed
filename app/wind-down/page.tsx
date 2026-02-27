'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiMoon, FiStar, FiClock, FiHeart, FiArrowLeft, FiSunrise } from 'react-icons/fi';

interface WindDownStats {
  tonightSmokes: number;
  tonightAvgRating: number;
  tonightTopBrand: string | null;
  tonightSmokers: number;
  yourTodaySmokes: number;
  yourTodayAvgRating: number;
  yourTodayBrands: string[];
  totalWindDownSmokes: number;
  yourWindDownSmokes: number;
  peakWindDownHour: number;
  recentCheckins: Array<{
    id: number;
    username: string;
    brand: string;
    product: string | null;
    rating: number;
    image_url: string | null;
    created_at: number;
  }>;
}

export default function WindDownPage() {
  const router = useRouter();
  const [stats, setStats] = useState<WindDownStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentHour = new Date().getHours();
  const isWindDownTime = currentHour >= 21 || currentHour < 0; // 9 PM - midnight

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/wind-down');
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch wind down stats');
        }
        const data = await res.json() as WindDownStats;
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [router]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  };

  const getTimeUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diffMs = midnight.getTime() - now.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return { hours, mins };
  };

  const timeUntilMidnight = getTimeUntilMidnight();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-center">
        <div className="animate-pulse text-indigo-300">Loading wind down...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white p-6">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white">
      {/* Header */}
      <div className="p-6 pb-4">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-indigo-300 hover:text-indigo-200 mb-4">
          <FiArrowLeft /> Back to Dashboard
        </Link>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-full bg-indigo-500/20">
            <FiMoon className="w-8 h-8 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Wind Down</h1>
            <p className="text-indigo-300">Close out your day peacefully</p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-8 space-y-6">
        {/* Time Status */}
        {isWindDownTime ? (
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-indigo-200 mb-2">
              <FiClock className="animate-pulse" />
              <span className="font-medium">Wind Down Time Active</span>
            </div>
            <p className="text-sm text-indigo-300/70">
              {timeUntilMidnight.hours}h {timeUntilMidnight.mins}m until midnight
            </p>
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <FiSunrise />
              <span className="font-medium">Wind Down Hours: 9 PM - Midnight</span>
            </div>
            <p className="text-sm text-slate-500">
              Come back in the evening to wind down with the community
            </p>
            <Link href="/nightcap" className="text-indigo-400 text-sm hover:underline mt-2 inline-block">
              Check out Nightcap Club for late nights →
            </Link>
          </div>
        )}

        {/* Tonight's Stats */}
        <div className="bg-slate-800/30 rounded-xl p-5 border border-indigo-500/20">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiStar className="text-indigo-400" /> Tonight&apos;s Wind Down
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-indigo-300">{stats?.tonightSmokes || 0}</div>
              <div className="text-xs text-indigo-400">smokes tonight</div>
            </div>
            <div className="bg-indigo-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-indigo-300">{stats?.tonightSmokers || 0}</div>
              <div className="text-xs text-indigo-400">winding down</div>
            </div>
            {stats?.tonightAvgRating && stats.tonightAvgRating > 0 && (
              <div className="bg-indigo-500/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-indigo-300">{stats.tonightAvgRating.toFixed(1)}⭐</div>
                <div className="text-xs text-indigo-400">avg rating</div>
              </div>
            )}
            {stats?.tonightTopBrand && (
              <div className="bg-indigo-500/10 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-indigo-300 truncate">{stats.tonightTopBrand}</div>
                <div className="text-xs text-indigo-400">top brand</div>
              </div>
            )}
          </div>
        </div>

        {/* Your Day Recap */}
        <div className="bg-slate-800/30 rounded-xl p-5 border border-purple-500/20">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiHeart className="text-purple-400" /> Your Day Recap
          </h2>
          {stats?.yourTodaySmokes && stats.yourTodaySmokes > 0 ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Smokes today</span>
                <span className="font-semibold text-purple-300">{stats.yourTodaySmokes}</span>
              </div>
              {stats.yourTodayAvgRating > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Average rating</span>
                  <span className="font-semibold text-purple-300">{stats.yourTodayAvgRating.toFixed(1)} ⭐</span>
                </div>
              )}
              {stats.yourTodayBrands && stats.yourTodayBrands.length > 0 && (
                <div>
                  <span className="text-slate-400 text-sm">Brands enjoyed:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {stats.yourTodayBrands.map((brand, i) => (
                      <span key={i} className="px-2 py-1 bg-purple-500/20 rounded-full text-xs text-purple-300">
                        {brand}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-400 mb-3">No smokes logged today</p>
              <Link 
                href="/checkin/new"
                className="inline-block px-4 py-2 bg-purple-500 rounded-lg text-sm font-medium hover:bg-purple-600 transition"
              >
                Log a wind-down smoke
              </Link>
            </div>
          )}
        </div>

        {/* Personal Wind Down Stats */}
        <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
          <h2 className="text-lg font-semibold mb-4">Your Wind Down History</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats?.yourWindDownSmokes || 0}</div>
              <div className="text-xs text-slate-400">wind down smokes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats?.totalWindDownSmokes || 0}</div>
              <div className="text-xs text-slate-400">community total</div>
            </div>
          </div>
          {stats?.peakWindDownHour !== undefined && stats.peakWindDownHour > 0 && (
            <div className="mt-4 text-center text-sm text-slate-400">
              Peak wind down hour: <span className="text-indigo-300">{formatHour(stats.peakWindDownHour)}</span>
            </div>
          )}
        </div>

        {/* Recent Wind Down Check-ins */}
        {stats?.recentCheckins && stats.recentCheckins.length > 0 && (
          <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
            <h2 className="text-lg font-semibold mb-4">Winding Down Now</h2>
            <div className="space-y-3">
              {stats.recentCheckins.map((checkin) => (
                <Link 
                  key={checkin.id}
                  href={`/checkin/${checkin.id}`}
                  className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition"
                >
                  {checkin.image_url ? (
                    <img 
                      src={checkin.image_url} 
                      alt={checkin.brand}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                      <FiMoon className="text-indigo-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{checkin.brand}</div>
                    <div className="text-sm text-slate-400">
                      @{checkin.username} • {checkin.rating}⭐ • {formatTime(checkin.created_at)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Good Night Message */}
        <div className="text-center py-6 border-t border-slate-700/50">
          <p className="text-slate-400 text-sm">
            🌙 Rest well, smoke better tomorrow
          </p>
          <Link href="/nightcap" className="text-indigo-400 text-sm hover:underline mt-2 inline-block">
            Staying up late? Join the Nightcap Club →
          </Link>
        </div>
      </div>
    </div>
  );
}
