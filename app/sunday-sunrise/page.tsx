'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface EarlyRiser {
  username: string;
  brand: string;
  rating: number;
  review: string | null;
  createdAt: number;
}

interface SunriseLeader {
  username: string;
  count: number;
  avgRating: number;
  rank: number;
}

interface SunriseData {
  isActive: boolean;
  timeInfo: {
    isActive: boolean;
    minutesRemaining?: number;
    phase?: string;
    hoursUntil?: number;
  };
  blessing: string;
  earlyRisers: EarlyRiser[];
  sunriseLeaders: SunriseLeader[];
  userStats: {
    sunriseCount: number;
    avgRating: number | null;
  };
  platformStats: {
    totalSunriseSmokes: number;
    uniqueRisers: number;
    avgRating: number | null;
  };
}

export default function SundaySunrisePage() {
  const router = useRouter();
  const [data, setData] = useState<SunriseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sunday-sunrise')
      .then(res => {
        if (res.status === 401) {
          router.push('/');
          return null;
        }
        return res.json() as Promise<SunriseData>;
      })
      .then(result => {
        if (result) setData(result);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 via-orange-900 to-amber-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">☀️</div>
          <p className="text-amber-300">Awaiting dawn...</p>
        </div>
      </div>
    );
  }

  if (!data?.isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4">
        {/* Stars background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 60}%`,
                animationDelay: `${Math.random() * 3}s`,
                opacity: Math.random() * 0.7 + 0.3
              }}
            />
          ))}
        </div>

        <div className="max-w-md mx-auto pt-20 text-center relative z-10">
          <div className="text-6xl mb-4">🌅</div>
          <h1 className="text-2xl font-bold mb-2">Sunday Sunrise Service</h1>
          <p className="text-slate-400 mb-6">The dawn devotional for early risers</p>
          
          <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm border border-white/10">
            <p className="text-slate-300 mb-2">Service begins Sunday at 5 AM</p>
            <p className="text-4xl font-bold text-amber-400">
              {data?.timeInfo.hoursUntil} hours
            </p>
            <p className="text-slate-400 text-sm mt-2">until the next service</p>
          </div>

          <div className="mt-8 bg-white/5 rounded-xl p-5 border border-white/10">
            <p className="text-slate-400 text-sm">Service Hours</p>
            <p className="text-xl font-medium text-amber-300 mt-1">Sunday 5:00 AM - 9:00 AM</p>
            <p className="text-slate-500 text-sm mt-2">A peaceful space for dawn reflection</p>
          </div>

          <Link href="/dashboard" className="inline-block mt-8 text-slate-400 hover:text-white">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const getPhaseEmoji = (phase: string) => {
    switch (phase) {
      case 'First Light': return '🌄';
      case 'Golden Hour': return '🌅';
      case 'Morning Glory': return '☀️';
      case 'Service Closing': return '🕊️';
      default: return '☀️';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 via-orange-900 to-amber-800 text-white">
      {/* Sunrise rays animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-1/2">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0 left-1/2 w-2 bg-gradient-to-t from-amber-400/30 to-transparent origin-bottom"
              style={{
                height: '100vh',
                transform: `translateX(-50%) rotate(${(i - 6) * 15}deg)`,
                opacity: 0.3 + (Math.sin(i) * 0.1)
              }}
            />
          ))}
        </div>
        {/* Sun glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-amber-400/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md mx-auto p-4 pb-24">
        {/* Header */}
        <div className="text-center pt-8 mb-8">
          <div className="text-5xl mb-3">{getPhaseEmoji(data.timeInfo.phase || 'Golden Hour')}</div>
          <h1 className="text-2xl font-bold">Sunday Sunrise Service</h1>
          <p className="text-amber-200 mt-1">{data.timeInfo.phase}</p>
          <p className="text-amber-300/70 text-sm mt-2">
            {data.timeInfo.minutesRemaining} minutes remaining
          </p>
        </div>

        {/* Morning Blessing */}
        <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm border border-amber-400/20 mb-6 text-center">
          <p className="text-amber-300 text-xs uppercase tracking-wider mb-2">Morning Blessing</p>
          <p className="text-xl font-medium text-white italic">"{data.blessing}"</p>
        </div>

        {/* Today's Early Risers */}
        <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm border border-amber-400/20 mb-6">
          <h2 className="font-semibold text-amber-300 mb-4 flex items-center gap-2">
            <span>🌄</span> This Morning's Congregation
          </h2>
          {data.earlyRisers.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-2">🕯️</div>
              <p className="text-amber-200/70">The chapel awaits its first visitor</p>
              <p className="text-amber-300/50 text-sm mt-1">Be the first to log a sunrise smoke</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.earlyRisers.map((riser, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div>
                    <Link href={`/u/${riser.username}`} className="font-medium text-amber-100 hover:text-amber-300">
                      @{riser.username}
                    </Link>
                    <p className="text-sm text-amber-300/70">{riser.brand}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-400">{'⭐'.repeat(Math.round(riser.rating || 0))}</p>
                    <p className="text-xs text-amber-300/50">{formatTime(riser.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Your Sunrise Stats */}
        <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm border border-amber-400/20 mb-6">
          <h2 className="font-semibold text-amber-300 mb-4 flex items-center gap-2">
            <span>🙏</span> Your Devotion
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <p className="text-3xl font-bold text-amber-400">{data.userStats.sunriseCount}</p>
              <p className="text-xs text-amber-300/70">Sunday Sunrises</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <p className="text-3xl font-bold text-amber-400">
                {data.userStats.avgRating ? data.userStats.avgRating.toFixed(1) : '-'}
              </p>
              <p className="text-xs text-amber-300/70">Avg Rating</p>
            </div>
          </div>
        </div>

        {/* Sunrise Service Leaders */}
        <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm border border-amber-400/20 mb-6">
          <h2 className="font-semibold text-amber-300 mb-4 flex items-center gap-2">
            <span>🏆</span> Dawn Devotees
          </h2>
          {data.sunriseLeaders.length === 0 ? (
            <p className="text-center text-amber-200/70 py-4">No leaders yet</p>
          ) : (
            <div className="space-y-2">
              {data.sunriseLeaders.slice(0, 5).map((leader) => (
                <div key={leader.username} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {leader.rank === 1 ? '🥇' : leader.rank === 2 ? '🥈' : leader.rank === 3 ? '🥉' : `#${leader.rank}`}
                    </span>
                    <Link href={`/u/${leader.username}`} className="font-medium text-amber-100 hover:text-amber-300">
                      @{leader.username}
                    </Link>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-400 font-medium">{leader.count} sunrises</p>
                    <p className="text-xs text-amber-300/50">
                      {leader.avgRating ? `${leader.avgRating.toFixed(1)}★ avg` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Platform Stats */}
        <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm border border-amber-400/20 mb-6">
          <h2 className="font-semibold text-amber-300 mb-4 flex items-center gap-2">
            <span>📊</span> Service Statistics
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2">
              <p className="text-2xl font-bold text-amber-400">{data.platformStats.totalSunriseSmokes}</p>
              <p className="text-xs text-amber-300/70">Total Services</p>
            </div>
            <div className="p-2">
              <p className="text-2xl font-bold text-amber-400">{data.platformStats.uniqueRisers}</p>
              <p className="text-xs text-amber-300/70">Devotees</p>
            </div>
            <div className="p-2">
              <p className="text-2xl font-bold text-amber-400">
                {data.platformStats.avgRating ? data.platformStats.avgRating.toFixed(1) : '-'}
              </p>
              <p className="text-xs text-amber-300/70">Avg Rating</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link 
            href="/checkin" 
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold py-3 rounded-xl text-center transition-colors"
          >
            🌅 Log Sunrise Smoke
          </Link>
        </div>

        {/* Related Links */}
        <div className="mt-6 flex justify-center gap-4 text-sm">
          <Link href="/sunday-sanctuary" className="text-amber-300/70 hover:text-amber-300">
            🕊️ Sunday Sanctuary
          </Link>
          <Link href="/coffee" className="text-amber-300/70 hover:text-amber-300">
            ☕ Coffee Lounge
          </Link>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-amber-300/70 hover:text-white text-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
