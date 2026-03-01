'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CheckIn {
  id: number;
  brand: string;
  product: string | null;
  rating: number;
  review: string | null;
  photo_url: string | null;
  created_at: number;
  username: string;
  like_count: number;
  comment_count: number;
}

interface LastCallStats {
  tonightCount: number;
  tonightSmokers: string[];
  allTimeLastCallers: { username: string; count: number }[];
  avgRating: number;
  topBrand: string | null;
  platformLastCalls: number;
  closingTimeHour: number;
}

export default function LastCallPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [stats, setStats] = useState<LastCallStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLastCallTime, setIsLastCallTime] = useState(false);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hour = now.getHours();
      // Last Call hours: 11 PM - 2 AM
      setIsLastCallTime(hour >= 23 || hour < 2);
      
      if (hour < 23 && hour >= 2) {
        // Calculate countdown to 11 PM
        const target = new Date(now);
        target.setHours(23, 0, 0, 0);
        const diff = target.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown(`${hours}h ${mins}m until Last Call`);
      }
    };
    
    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/last-call');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setCheckins(data.checkins || []);
        setStats(data.stats || null);
      } catch (err) {
        setError('Failed to load Last Call data');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const getTimeVibes = () => {
    const hour = new Date().getHours();
    if (hour === 23) return { emoji: '🍻', vibe: 'Last Call!', desc: 'One more before closing time' };
    if (hour === 0) return { emoji: '🌙', vibe: 'Midnight Hour', desc: 'The night is still young' };
    if (hour === 1) return { emoji: '🌃', vibe: 'After Hours', desc: 'The dedicated few remain' };
    return { emoji: '🌌', vibe: 'Night Owls Only', desc: 'Burning the midnight oil' };
  };

  const vibes = getTimeVibes();

  return (
    <div className="min-h-screen p-4 pb-24">
      {/* Animated bar lights effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-2 h-32 bg-amber-500/20 blur-xl animate-pulse" />
        <div className="absolute top-0 right-1/3 w-2 h-24 bg-orange-500/20 blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-0 left-1/2 w-2 h-28 bg-yellow-500/20 blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-0 right-1/4 w-2 h-20 bg-amber-400/20 blur-xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white">
          ← Back
        </button>
        <Link href="/dashboard" className="text-amber-400 hover:text-amber-300 text-sm">
          Dashboard
        </Link>
      </div>

      {/* Hero */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">🍻</div>
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-transparent bg-clip-text">
          Last Call
        </h1>
        <p className="text-zinc-400">
          {isLastCallTime ? 'One more smoke before the night ends' : countdown}
        </p>
        {isLastCallTime && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full">
            <span className="text-lg">{vibes.emoji}</span>
            <span className="text-amber-400 font-medium">{vibes.vibe}</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-400 text-sm">{vibes.desc}</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-zinc-500">Loading last call data...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-400">{error}</div>
      ) : (
        <>
          {/* Tonight's Last Callers */}
          {stats && stats.tonightSmokers.length > 0 && (
            <div className="bg-zinc-900/60 border border-amber-500/20 rounded-xl p-4 mb-6">
              <h2 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
                <span>🥃</span> Tonight&apos;s Last Callers
              </h2>
              <div className="flex flex-wrap gap-2">
                {stats.tonightSmokers.map((username, i) => (
                  <Link
                    key={username}
                    href={`/user/${username}`}
                    className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-300 text-sm hover:bg-amber-500/20"
                  >
                    {i === 0 && '🥇 '}{username}
                  </Link>
                ))}
              </div>
              <div className="mt-3 text-sm text-zinc-500">
                {stats.tonightCount} smoke{stats.tonightCount !== 1 ? 's' : ''} logged during last call tonight
              </div>
            </div>
          )}

          {/* Recent Last Call Check-ins */}
          {checkins.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                <span>🚬</span> Recent Last Call Smokes
              </h2>
              <div className="space-y-3">
                {checkins.slice(0, 5).map((checkin) => (
                  <Link
                    key={checkin.id}
                    href={`/checkin/${checkin.id}`}
                    className="block bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 hover:border-amber-500/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {checkin.photo_url && (
                        <img
                          src={checkin.photo_url}
                          alt={checkin.brand}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-amber-400 font-medium">@{checkin.username}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-amber-500 text-sm">
                            {'⭐'.repeat(Math.round(checkin.rating))}
                          </span>
                        </div>
                        <div className="text-white font-medium truncate">
                          {checkin.brand} {checkin.product && `- ${checkin.product}`}
                        </div>
                        {checkin.review && (
                          <p className="text-zinc-400 text-sm mt-1 line-clamp-2">{checkin.review}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                          <span>❤️ {checkin.like_count}</span>
                          <span>💬 {checkin.comment_count}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Last Call Legends */}
          {stats && stats.allTimeLastCallers.length > 0 && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 mb-6">
              <h2 className="text-lg font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                <span>🏆</span> Last Call Legends
              </h2>
              <div className="space-y-2">
                {stats.allTimeLastCallers.slice(0, 5).map((user, i) => (
                  <Link
                    key={user.username}
                    href={`/user/${user.username}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🍺'}
                      </span>
                      <span className="text-white">@{user.username}</span>
                    </div>
                    <span className="text-amber-400 text-sm">{user.count} last calls</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Platform Stats */}
          {stats && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 mb-6">
              <h2 className="text-lg font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                <span>📊</span> Last Call Stats
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">{stats.platformLastCalls}</div>
                  <div className="text-xs text-zinc-500">Total Last Calls</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">{stats.avgRating.toFixed(1)}⭐</div>
                  <div className="text-xs text-zinc-500">Avg Rating</div>
                </div>
                {stats.topBrand && (
                  <div className="col-span-2 text-center">
                    <div className="text-lg font-bold text-yellow-400">{stats.topBrand}</div>
                    <div className="text-xs text-zinc-500">Most Popular Last Call Brand</div>
                  </div>
                )}
                <div className="col-span-2 text-center">
                  <div className="text-lg font-bold text-amber-300">
                    {stats.closingTimeHour === 0 ? '12' : stats.closingTimeHour > 12 ? stats.closingTimeHour - 12 : stats.closingTimeHour}
                    {stats.closingTimeHour >= 12 ? ' AM' : ' PM'}
                  </div>
                  <div className="text-xs text-zinc-500">Peak Last Call Hour</div>
                </div>
              </div>
            </div>
          )}

          {/* No data state */}
          {checkins.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🍻</div>
              <p className="text-zinc-400 mb-4">No last call smokes yet tonight</p>
              <p className="text-zinc-500 text-sm mb-6">
                Be the first to log a smoke during last call (11 PM - 2 AM)!
              </p>
              <Link
                href="/checkin"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
              >
                🚬 Log Your Last Call Smoke
              </Link>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex flex-col gap-3 mt-6">
            <Link
              href="/checkin"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
            >
              🍻 Log Last Call Smoke
            </Link>
            <div className="flex gap-3">
              <Link
                href="/nightcap"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors text-sm"
              >
                🌙 Nightcap
              </Link>
              <Link
                href="/goodnight"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors text-sm"
              >
                😴 Goodnight
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Bottom bar glow effect */}
      <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 opacity-60" />
    </div>
  );
}
