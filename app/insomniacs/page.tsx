'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface InsomniacSession {
  id: number;
  username: string;
  brand: string;
  product: string | null;
  rating: number;
  created_at: string;
  review: string | null;
}

interface InsomniacStats {
  totalInsomniacSmokes: number;
  uniqueInsomniacs: number;
  averageRating: number;
  favoriteBrand: string | null;
  deepestHour: number;
  currentSmokers: InsomniacSession[];
  legends: Array<{
    username: string;
    count: number;
    avgHour: number;
  }>;
  personalStats: {
    insomniacSmokes: number;
    percentile: number;
    favoriteHour: number;
    latestEver: string | null;
  } | null;
}

export default function InsomniacsClub() {
  const [stats, setStats] = useState<InsomniacStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isInsomniacHours, setIsInsomniacHours] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      const hour = now.getHours();
      setIsInsomniacHours(hour >= 2 && hour < 5);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = currentTime.getHours();
    setIsInsomniacHours(hour >= 2 && hour < 5);
    fetch('/api/insomniacs')
      .then(r => r.json())
      .then((data: InsomniacStats) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getSleepDeprivationLevel = () => {
    const hour = currentTime.getHours();
    if (hour >= 2 && hour < 3) return { level: 'Mildly Delirious', emoji: '😵', message: "Sleep is for the weak" };
    if (hour >= 3 && hour < 4) return { level: 'Questionably Awake', emoji: '🫠', message: "Reality is optional" };
    if (hour >= 4 && hour < 5) return { level: 'Transcendently Tired', emoji: '👁️', message: "You've seen things" };
    return { level: 'Normal Hours', emoji: '😴', message: "Come back between 2-5 AM" };
  };

  const getTimeSinceSleep = () => {
    const now = currentTime;
    const hour = now.getHours();
    if (hour >= 2 && hour < 5) {
      const shouldveBeen = hour + 3;
      return `${shouldveBeen}+ hours`;
    }
    return null;
  };

  const sleepStatus = getSleepDeprivationLevel();
  const timeSinceSleep = getTimeSinceSleep();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-purple-300">Entering the void...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Trippy animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-20 animate-pulse"
            style={{
              width: Math.random() * 100 + 50,
              height: Math.random() * 100 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `radial-gradient(circle, ${['#a855f7', '#6366f1', '#8b5cf6', '#c084fc'][i % 4]}, transparent)`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Floating eyes effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={`eye-${i}`}
            className="absolute text-4xl animate-bounce opacity-30"
            style={{
              left: `${10 + (i * 12)}%`,
              top: `${Math.random() * 80}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          >
            👁️
          </div>
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 text-sm mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 mb-2">
            🌀 The Insomniac&apos;s Club
          </h1>
          <p className="text-purple-300/70">
            {isInsomniacHours 
              ? "Welcome, sleepless wanderer. You belong here."
              : "The club is closed. Return between 2-5 AM."
            }
          </p>
        </div>

        {/* Current Status */}
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-6 mb-6 border border-purple-500/30">
          <div className="text-center">
            <div className="text-6xl mb-3">{sleepStatus.emoji}</div>
            <div className="text-2xl font-bold text-purple-300 mb-1">{sleepStatus.level}</div>
            <div className="text-purple-400/70 italic">{sleepStatus.message}</div>
            {timeSinceSleep && (
              <div className="mt-4 text-sm text-purple-500">
                ⏰ Time since you should&apos;ve slept: <span className="text-pink-400 font-bold">{timeSinceSleep}</span>
              </div>
            )}
            <div className="mt-3 font-mono text-purple-300/50 text-xs">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </div>

        {isInsomniacHours && stats?.currentSmokers && stats.currentSmokers.length > 0 && (
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-6 mb-6 border border-purple-500/30">
            <h2 className="text-xl font-bold text-purple-300 mb-4 flex items-center gap-2">
              <span className="animate-pulse">👁️</span> Currently Haunting the Night
            </h2>
            <div className="space-y-3">
              {stats.currentSmokers.map((session) => (
                <div key={session.id} className="flex items-center gap-3 text-purple-200/80">
                  <span className="text-pink-400">@{session.username}</span>
                  <span className="text-purple-500/50">•</span>
                  <span>{session.brand}</span>
                  <span className="ml-auto text-yellow-400">{'⭐'.repeat(session.rating)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insomniac Legends */}
        {stats?.legends && stats.legends.length > 0 && (
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-6 mb-6 border border-purple-500/30">
            <h2 className="text-xl font-bold text-purple-300 mb-4">🏆 Insomniac Legends</h2>
            <p className="text-purple-400/60 text-sm mb-4">The ones who truly never sleep</p>
            <div className="space-y-3">
              {stats.legends.map((legend, i) => (
                <div key={legend.username} className="flex items-center gap-3 p-3 rounded-lg bg-purple-900/30">
                  <span className="text-2xl">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '💀'}
                  </span>
                  <div className="flex-1">
                    <div className="text-purple-200 font-medium">@{legend.username}</div>
                    <div className="text-xs text-purple-400/60">
                      Avg hour: {legend.avgHour.toFixed(0)}:00 AM
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-pink-400 font-bold">{legend.count}</div>
                    <div className="text-xs text-purple-400/50">insomniac smokes</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personal Stats */}
        {stats?.personalStats && (
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-6 mb-6 border border-pink-500/30">
            <h2 className="text-xl font-bold text-pink-300 mb-4">👤 Your Insomniac Profile</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-purple-900/30 rounded-lg">
                <div className="text-2xl font-bold text-pink-400">{stats.personalStats.insomniacSmokes}</div>
                <div className="text-xs text-purple-400/60">Insomniac Smokes</div>
              </div>
              <div className="text-center p-3 bg-purple-900/30 rounded-lg">
                <div className="text-2xl font-bold text-purple-400">Top {stats.personalStats.percentile}%</div>
                <div className="text-xs text-purple-400/60">Night Owl Ranking</div>
              </div>
              {stats.personalStats.favoriteHour > 0 && (
                <div className="text-center p-3 bg-purple-900/30 rounded-lg col-span-2">
                  <div className="text-xl font-bold text-purple-300">
                    {stats.personalStats.favoriteHour}:00 AM
                  </div>
                  <div className="text-xs text-purple-400/60">Your Peak Insomniac Hour</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Platform Stats */}
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30">
          <h2 className="text-xl font-bold text-purple-300 mb-4">📊 The Void&apos;s Statistics</h2>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-purple-900/30 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">{stats?.totalInsomniacSmokes || 0}</div>
              <div className="text-xs text-purple-400/60">Total 2-5 AM Smokes</div>
            </div>
            <div className="p-3 bg-purple-900/30 rounded-lg">
              <div className="text-2xl font-bold text-pink-400">{stats?.uniqueInsomniacs || 0}</div>
              <div className="text-xs text-purple-400/60">Club Members</div>
            </div>
            {stats?.deepestHour && (
              <div className="p-3 bg-purple-900/30 rounded-lg">
                <div className="text-2xl font-bold text-purple-300">{stats.deepestHour}:00 AM</div>
                <div className="text-xs text-purple-400/60">Most Popular Hour</div>
              </div>
            )}
            {stats?.favoriteBrand && (
              <div className="p-3 bg-purple-900/30 rounded-lg">
                <div className="text-lg font-bold text-purple-300 truncate">{stats.favoriteBrand}</div>
                <div className="text-xs text-purple-400/60">Favorite Brand</div>
              </div>
            )}
          </div>
        </div>

        {/* Insomniac Tips */}
        <div className="mt-6 bg-slate-900/60 rounded-xl p-4 border border-purple-500/20">
          <h3 className="text-purple-300 font-medium mb-2">💡 Insomniac Wisdom</h3>
          <div className="text-purple-400/70 text-sm space-y-2">
            <p>• Sleep is just a suggestion, not a requirement</p>
            <p>• The best ideas come at 3 AM (they&apos;re usually terrible)</p>
            <p>• Coffee is a valid breakfast at any hour</p>
            <p>• Your bed will still be there tomorrow... or today... time is fake</p>
          </div>
        </div>

        {/* Related Links */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Link href="/witching-hour" className="text-purple-400 hover:text-purple-300 text-sm bg-purple-900/30 px-3 py-1.5 rounded-full">
            🔮 Witching Hour
          </Link>
          <Link href="/last-call" className="text-purple-400 hover:text-purple-300 text-sm bg-purple-900/30 px-3 py-1.5 rounded-full">
            🍻 Last Call
          </Link>
          <Link href="/graveyard-shift" className="text-purple-400 hover:text-purple-300 text-sm bg-purple-900/30 px-3 py-1.5 rounded-full">
            ☠️ Graveyard Shift
          </Link>
        </div>
      </div>
    </div>
  );
}
