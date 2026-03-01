'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ZenSmoker {
  username: string;
  brand: string;
  rating: number;
  review: string | null;
  createdAt: number;
}

interface ZenMaster {
  username: string;
  count: number;
  avgRating: number;
  rank: number;
}

interface BreathingExercise {
  name: string;
  inhale: number;
  hold: number;
  exhale: number;
  cycles: number;
}

interface ZenData {
  isActive: boolean;
  timeInfo: {
    isActive: boolean;
    minutesRemaining?: number;
    phase?: string;
    hoursUntil?: number;
  };
  wisdom: string;
  breathingExercise: BreathingExercise;
  zenSmokers: ZenSmoker[];
  zenMasters: ZenMaster[];
  userStats: {
    zenCount: number;
    avgRating: number | null;
  };
  platformStats: {
    totalZenSmokes: number;
    practitioners: number;
    avgRating: number | null;
  };
}

type BreathPhase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'complete';

export default function SundayZenPage() {
  const router = useRouter();
  const [data, setData] = useState<ZenData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Breathing exercise state
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('idle');
  const [breathCount, setBreathCount] = useState(0);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [totalCycles] = useState(4);

  useEffect(() => {
    fetch('/api/sunday-zen')
      .then(res => {
        if (res.status === 401) {
          router.push('/');
          return null;
        }
        return res.json() as Promise<ZenData>;
      })
      .then(result => {
        if (result) setData(result);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const startBreathing = useCallback(() => {
    if (!data) return;
    setBreathPhase('inhale');
    setBreathCount(data.breathingExercise.inhale);
    setCurrentCycle(1);
  }, [data]);

  useEffect(() => {
    if (breathPhase === 'idle' || breathPhase === 'complete' || !data) return;

    const timer = setInterval(() => {
      setBreathCount(prev => {
        if (prev <= 1) {
          // Move to next phase
          if (breathPhase === 'inhale') {
            setBreathPhase('hold');
            return data.breathingExercise.hold;
          } else if (breathPhase === 'hold') {
            setBreathPhase('exhale');
            return data.breathingExercise.exhale;
          } else if (breathPhase === 'exhale') {
            if (currentCycle >= totalCycles) {
              setBreathPhase('complete');
              return 0;
            }
            setCurrentCycle(c => c + 1);
            setBreathPhase('inhale');
            return data.breathingExercise.inhale;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [breathPhase, currentCycle, totalCycles, data]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getBreathInstruction = () => {
    switch (breathPhase) {
      case 'inhale': return 'Breathe In...';
      case 'hold': return 'Hold...';
      case 'exhale': return 'Breathe Out...';
      case 'complete': return 'Namaste 🙏';
      default: return 'Start Breathing';
    }
  };

  const getBreathCircleSize = () => {
    if (breathPhase === 'inhale') return 'scale-125';
    if (breathPhase === 'hold') return 'scale-125';
    if (breathPhase === 'exhale') return 'scale-75';
    return 'scale-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🧘</div>
          <p className="text-emerald-300">Finding peace...</p>
        </div>
      </div>
    );
  }

  if (!data?.isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4">
        {/* Floating particles */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-emerald-400/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${5 + Math.random() * 5}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 5}s`
              }}
            />
          ))}
        </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
            50% { transform: translateY(-20px) rotate(180deg); opacity: 0.6; }
          }
        `}</style>

        <div className="max-w-md mx-auto pt-20 text-center relative z-10">
          <div className="text-6xl mb-4">🧘</div>
          <h1 className="text-2xl font-bold mb-2">Sunday Morning Zen</h1>
          <p className="text-slate-400 mb-6">A peaceful space for mindful mornings</p>
          
          <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm border border-emerald-500/20">
            <p className="text-slate-300 mb-2">The garden opens Sunday at 6 AM</p>
            <p className="text-4xl font-bold text-emerald-400">
              {data?.timeInfo.hoursUntil} hours
            </p>
            <p className="text-slate-400 text-sm mt-2">until the next session</p>
          </div>

          <div className="mt-8 bg-white/5 rounded-xl p-5 border border-emerald-500/10">
            <p className="text-slate-400 text-sm">Zen Hours</p>
            <p className="text-xl font-medium text-emerald-300 mt-1">Sunday 6:00 AM - 10:00 AM</p>
            <p className="text-slate-500 text-sm mt-2">A contemplative space for Sunday mornings</p>
          </div>

          <Link href="/dashboard" className="inline-block mt-8 text-slate-400 hover:text-white">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-emerald-950 to-teal-950 text-white">
      {/* Zen ripple effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute border border-emerald-400/20 rounded-full"
              style={{
                width: `${200 + i * 100}px`,
                height: `${200 + i * 100}px`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                animation: `ripple ${8 + i * 2}s ease-in-out infinite`,
                animationDelay: `${i * 1}s`
              }}
            />
          ))}
        </div>
        {/* Floating leaves/particles */}
        {[...Array(15)].map((_, i) => (
          <div
            key={`leaf-${i}`}
            className="absolute text-2xl"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-50px`,
              animation: `fall ${15 + Math.random() * 10}s linear infinite`,
              animationDelay: `${Math.random() * 15}s`
            }}
          >
            🍃
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes ripple {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.1; }
        }
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
      `}</style>

      <div className="relative z-10 max-w-md mx-auto p-4 pb-24">
        {/* Header */}
        <div className="text-center pt-8 mb-8">
          <div className="text-5xl mb-3">🧘</div>
          <h1 className="text-2xl font-bold">Sunday Morning Zen</h1>
          <p className="text-emerald-300 mt-1">{data.timeInfo.phase}</p>
          <p className="text-emerald-400/70 text-sm mt-2">
            {data.timeInfo.minutesRemaining} minutes of peace remaining
          </p>
        </div>

        {/* Daily Wisdom */}
        <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm border border-emerald-400/20 mb-6 text-center">
          <p className="text-emerald-300 text-xs uppercase tracking-wider mb-2">🪷 Daily Wisdom</p>
          <p className="text-xl font-medium text-white italic">"{data.wisdom}"</p>
        </div>

        {/* Breathing Exercise */}
        <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm border border-emerald-400/20 mb-6">
          <h2 className="font-semibold text-emerald-300 mb-4 text-center flex items-center justify-center gap-2">
            <span>🌬️</span> Mindful Breathing
          </h2>
          
          <div className="flex flex-col items-center">
            {/* Breathing circle */}
            <div 
              className={`w-32 h-32 rounded-full bg-emerald-500/20 border-2 border-emerald-400/50 flex items-center justify-center transition-transform duration-1000 ease-in-out ${getBreathCircleSize()}`}
            >
              <div className="text-center">
                {breathPhase !== 'idle' && breathPhase !== 'complete' && (
                  <p className="text-3xl font-bold text-emerald-400">{breathCount}</p>
                )}
                {breathPhase === 'complete' && <p className="text-3xl">🙏</p>}
                {breathPhase === 'idle' && <p className="text-3xl">☯️</p>}
              </div>
            </div>

            <p className="mt-4 text-emerald-200 font-medium">{getBreathInstruction()}</p>
            
            {breathPhase !== 'idle' && breathPhase !== 'complete' && (
              <p className="text-emerald-400/70 text-sm mt-1">
                Cycle {currentCycle} of {totalCycles}
              </p>
            )}

            {(breathPhase === 'idle' || breathPhase === 'complete') && (
              <button
                onClick={startBreathing}
                className="mt-4 px-6 py-2 bg-emerald-600/50 hover:bg-emerald-500/50 rounded-full text-emerald-100 transition-colors"
              >
                {breathPhase === 'complete' ? 'Practice Again' : 'Begin 4-7-8 Breathing'}
              </button>
            )}

            <p className="text-emerald-400/50 text-xs mt-3">
              Inhale 4s • Hold 7s • Exhale 8s
            </p>
          </div>
        </div>

        {/* Peaceful Smokers */}
        <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm border border-emerald-400/20 mb-6">
          <h2 className="font-semibold text-emerald-300 mb-4 flex items-center gap-2">
            <span>🪷</span> This Morning's Practitioners
          </h2>
          {data.zenSmokers.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-2">🕯️</div>
              <p className="text-emerald-200/70">The garden is quiet</p>
              <p className="text-emerald-300/50 text-sm mt-1">Be the first to find peace today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.zenSmokers.map((smoker, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div>
                    <Link href={`/u/${smoker.username}`} className="font-medium text-emerald-100 hover:text-emerald-300">
                      @{smoker.username}
                    </Link>
                    <p className="text-sm text-emerald-300/70">{smoker.brand}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400">{'⭐'.repeat(Math.round(smoker.rating || 0))}</p>
                    <p className="text-xs text-emerald-300/50">{formatTime(smoker.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Your Zen Stats */}
        <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm border border-emerald-400/20 mb-6">
          <h2 className="font-semibold text-emerald-300 mb-4 flex items-center gap-2">
            <span>☯️</span> Your Inner Peace
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <p className="text-3xl font-bold text-emerald-400">{data.userStats.zenCount}</p>
              <p className="text-xs text-emerald-300/70">Zen Sessions</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <p className="text-3xl font-bold text-emerald-400">
                {data.userStats.avgRating ? data.userStats.avgRating.toFixed(1) : '-'}
              </p>
              <p className="text-xs text-emerald-300/70">Avg Rating</p>
            </div>
          </div>
        </div>

        {/* Zen Masters */}
        <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm border border-emerald-400/20 mb-6">
          <h2 className="font-semibold text-emerald-300 mb-4 flex items-center gap-2">
            <span>🏆</span> Zen Masters
          </h2>
          {data.zenMasters.length === 0 ? (
            <p className="text-center text-emerald-200/70 py-4">No masters yet</p>
          ) : (
            <div className="space-y-2">
              {data.zenMasters.slice(0, 5).map((master) => (
                <div key={master.username} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {master.rank === 1 ? '🥇' : master.rank === 2 ? '🥈' : master.rank === 3 ? '🥉' : `#${master.rank}`}
                    </span>
                    <Link href={`/u/${master.username}`} className="font-medium text-emerald-100 hover:text-emerald-300">
                      @{master.username}
                    </Link>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-medium">{master.count} sessions</p>
                    <p className="text-xs text-emerald-300/50">
                      {master.avgRating ? `${master.avgRating.toFixed(1)}★ avg` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Platform Stats */}
        <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm border border-emerald-400/20 mb-6">
          <h2 className="font-semibold text-emerald-300 mb-4 flex items-center gap-2">
            <span>📊</span> Garden Statistics
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2">
              <p className="text-2xl font-bold text-emerald-400">{data.platformStats.totalZenSmokes}</p>
              <p className="text-xs text-emerald-300/70">Total Sessions</p>
            </div>
            <div className="p-2">
              <p className="text-2xl font-bold text-emerald-400">{data.platformStats.practitioners}</p>
              <p className="text-xs text-emerald-300/70">Practitioners</p>
            </div>
            <div className="p-2">
              <p className="text-2xl font-bold text-emerald-400">
                {data.platformStats.avgRating ? data.platformStats.avgRating.toFixed(1) : '-'}
              </p>
              <p className="text-xs text-emerald-300/70">Avg Rating</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link 
            href="/checkin" 
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl text-center transition-colors"
          >
            🧘 Log Zen Smoke
          </Link>
        </div>

        {/* Related Links */}
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
          <Link href="/sunday-sunrise" className="text-emerald-300/70 hover:text-emerald-300">
            🌅 Sunrise Service
          </Link>
          <Link href="/sunday-sanctuary" className="text-emerald-300/70 hover:text-emerald-300">
            🕊️ Sanctuary
          </Link>
          <Link href="/coffee" className="text-emerald-300/70 hover:text-emerald-300">
            ☕ Coffee Lounge
          </Link>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-emerald-300/70 hover:text-white text-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
