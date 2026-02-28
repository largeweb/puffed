'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FiArrowLeft, FiMusic, FiUsers, FiStar, FiHeart,
  FiZap, FiAward, FiClock, FiTrendingUp
} from 'react-icons/fi';

interface SaturdayData {
  isPartyTime: boolean;
  partyHoursLeft: number;
  currentSmokers: Array<{
    username: string;
    brand: string;
    time: string;
    rating: number;
  }>;
  saturdayLegends: Array<{
    username: string;
    saturdaySmokes: number;
    avgRating: number;
  }>;
  tonightStats: {
    totalSmokes: number;
    activeSmokers: number;
    topBrand: string;
    avgRating: number;
  };
  allTimeSaturday: {
    totalSmokes: number;
    peakHour: number;
    recordSmokes: number;
    recordDate: string;
  };
}

export default function SaturdayNightPage() {
  const [data, setData] = useState<SaturdayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulsePhase, setPulsePhase] = useState(0);

  useEffect(() => {
    fetch('/api/saturday-night')
      .then(res => res.json() as Promise<SaturdayData>)
      .then((data) => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Animated pulse for party vibes
  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase(p => (p + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-fuchsia-900 to-black flex items-center justify-center">
        <div className="animate-pulse text-fuchsia-300 text-xl">🎉 Loading the party...</div>
      </div>
    );
  }

  const hour = new Date().getHours();
  const isSaturday = new Date().getDay() === 6;
  const isPartyHours = hour >= 20 || hour < 4; // 8 PM - 4 AM

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-fuchsia-900 to-black text-white">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full blur-3xl opacity-20"
            style={{
              width: `${150 + i * 50}px`,
              height: `${150 + i * 50}px`,
              background: `hsl(${280 + i * 20 + pulsePhase}, 80%, 50%)`,
              left: `${10 + i * 12}%`,
              top: `${20 + Math.sin((pulsePhase + i * 45) * Math.PI / 180) * 10}%`,
              transform: `scale(${1 + Math.sin((pulsePhase + i * 30) * Math.PI / 180) * 0.2})`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="text-fuchsia-300 hover:text-white transition-colors">
            <FiArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span className="text-4xl animate-bounce">💜</span>
              Saturday Night Social
            </h1>
            <p className="text-fuchsia-300 mt-1">Where the weekend comes alive</p>
          </div>
        </div>

        {/* Party Status Banner */}
        <div className={`rounded-2xl p-6 mb-6 ${
          isSaturday && isPartyHours 
            ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 animate-pulse'
            : 'bg-purple-800/50'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-2xl font-bold">
                {isSaturday && isPartyHours ? (
                  <>
                    <FiZap className="text-yellow-300" />
                    PARTY MODE ACTIVE
                  </>
                ) : isSaturday ? (
                  <>
                    <FiClock className="text-fuchsia-300" />
                    Party starts at 8 PM
                  </>
                ) : (
                  <>
                    <FiStar className="text-fuchsia-300" />
                    See you Saturday!
                  </>
                )}
              </div>
              {data?.isPartyTime && data.partyHoursLeft > 0 && (
                <p className="text-fuchsia-200 mt-1">
                  {data.partyHoursLeft}h of party vibes remaining
                </p>
              )}
            </div>
            <div className="text-6xl">
              {isSaturday && isPartyHours ? '🎉' : isSaturday ? '✨' : '📅'}
            </div>
          </div>
        </div>

        {/* Tonight's Stats */}
        {data?.tonightStats && (
          <div className="bg-purple-800/40 backdrop-blur rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-fuchsia-400" />
              Tonight&apos;s Party Stats
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-700/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-fuchsia-300">
                  {data.tonightStats.totalSmokes}
                </div>
                <div className="text-sm text-purple-300">Smokes Tonight</div>
              </div>
              <div className="bg-purple-700/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-fuchsia-300">
                  {data.tonightStats.activeSmokers}
                </div>
                <div className="text-sm text-purple-300">Party People</div>
              </div>
              <div className="bg-purple-700/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-fuchsia-300">
                  {data.tonightStats.topBrand || '—'}
                </div>
                <div className="text-sm text-purple-300">Top Brand</div>
              </div>
              <div className="bg-purple-700/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-fuchsia-300">
                  ⭐ {data.tonightStats.avgRating?.toFixed(1) || '—'}
                </div>
                <div className="text-sm text-purple-300">Avg Rating</div>
              </div>
            </div>
          </div>
        )}

        {/* Who's Smoking Now */}
        {data?.currentSmokers && data.currentSmokers.length > 0 && (
          <div className="bg-purple-800/40 backdrop-blur rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FiUsers className="text-fuchsia-400" />
              Who&apos;s at the Party
              <span className="ml-2 px-2 py-1 bg-green-500 text-xs rounded-full animate-pulse">
                LIVE
              </span>
            </h2>
            <div className="space-y-3">
              {data.currentSmokers.map((smoker, i) => (
                <Link
                  key={i}
                  href={`/user/${smoker.username}`}
                  className="flex items-center justify-between bg-purple-700/30 rounded-xl p-4 hover:bg-purple-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-fuchsia-500/30 flex items-center justify-center text-xl">
                      🎭
                    </div>
                    <div>
                      <div className="font-semibold">{smoker.username}</div>
                      <div className="text-sm text-purple-300">{smoker.brand}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-fuchsia-300">
                      {'⭐'.repeat(Math.round(smoker.rating))}
                    </div>
                    <div className="text-xs text-purple-400">{smoker.time}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Saturday Legends */}
        {data?.saturdayLegends && data.saturdayLegends.length > 0 && (
          <div className="bg-purple-800/40 backdrop-blur rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FiAward className="text-fuchsia-400" />
              Saturday Night Legends
            </h2>
            <div className="space-y-3">
              {data.saturdayLegends.map((legend, i) => (
                <Link
                  key={i}
                  href={`/user/${legend.username}`}
                  className="flex items-center justify-between bg-purple-700/30 rounded-xl p-4 hover:bg-purple-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🎭'}
                    </div>
                    <div className="font-semibold">{legend.username}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-fuchsia-300 font-bold">
                      {legend.saturdaySmokes} Sat smokes
                    </div>
                    <div className="text-xs text-purple-400">
                      ⭐ {legend.avgRating?.toFixed(1)} avg
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All-Time Saturday Stats */}
        {data?.allTimeSaturday && (
          <div className="bg-purple-800/40 backdrop-blur rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FiStar className="text-fuchsia-400" />
              Saturday Night Records
            </h2>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-purple-700/30 rounded-xl p-4">
                <div className="text-2xl font-bold text-fuchsia-300">
                  {data.allTimeSaturday.totalSmokes}
                </div>
                <div className="text-sm text-purple-300">Total Sat Smokes</div>
              </div>
              <div className="bg-purple-700/30 rounded-xl p-4">
                <div className="text-2xl font-bold text-fuchsia-300">
                  {data.allTimeSaturday.peakHour}:00
                </div>
                <div className="text-sm text-purple-300">Peak Hour</div>
              </div>
            </div>
          </div>
        )}

        {/* Party Vibes */}
        <div className="bg-gradient-to-r from-fuchsia-600/30 to-purple-600/30 rounded-2xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <FiMusic className="text-fuchsia-400" />
            <span className="text-lg font-semibold">Party Vibes</span>
          </div>
          <p className="text-purple-200 mb-4">
            Saturday nights are for celebration. Light up something special! 🎉
          </p>
          <Link
            href="/checkin"
            className="inline-block px-6 py-3 bg-fuchsia-500 hover:bg-fuchsia-400 rounded-xl font-semibold transition-colors"
          >
            <FiHeart className="inline mr-2" />
            Join the Party
          </Link>
        </div>

        {/* Quick Links */}
        <div className="mt-6 flex justify-center gap-4 text-sm">
          <Link href="/nightcap" className="text-purple-400 hover:text-white transition-colors">
            🌙 Nightcap Club
          </Link>
          <Link href="/midnight-society" className="text-purple-400 hover:text-white transition-colors">
            🦇 Midnight Society
          </Link>
          <Link href="/radio" className="text-purple-400 hover:text-white transition-colors">
            📻 Smoke Radio
          </Link>
        </div>
      </div>
    </div>
  );
}
