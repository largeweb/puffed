'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SanctuaryStats {
  weekSmokes: number;
  weekAvgRating: number;
  weekTopBrand: string | null;
  weekLikesReceived: number;
  weekCommentsReceived: number;
  sundaySmokes: number;
  sundayLeaders: Array<{
    username: string;
    count: number;
    avgRating: number;
  }>;
  todaySmokers: Array<{
    username: string;
    brand: string;
    created_at: number;
  }>;
  platformSundaySmokes: number;
  mostReflectiveHour: number;
  sundayTopBrand: string | null;
}

export default function SundaySanctuaryPage() {
  const [stats, setStats] = useState<SanctuaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [gratitude, setGratitude] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch('/api/sunday-sanctuary')
      .then(res => res.json() as Promise<SanctuaryStats>)
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const now = new Date();
  const hour = now.getHours();
  const isSunday = now.getDay() === 0;
  
  // Sunday sanctuary is available all day Sunday
  const isActive = isSunday;

  const getTimeOfDay = () => {
    if (hour < 6) return { period: 'Early Morning', emoji: '🌙', vibe: 'The quiet before dawn' };
    if (hour < 12) return { period: 'Morning', emoji: '☀️', vibe: 'Fresh Sunday morning energy' };
    if (hour < 17) return { period: 'Afternoon', emoji: '🌤️', vibe: 'Lazy Sunday afternoon' };
    if (hour < 21) return { period: 'Evening', emoji: '🌅', vibe: 'Sunday evening reflection' };
    return { period: 'Night', emoji: '🌙', vibe: 'Sunday night wind down' };
  };

  const timeInfo = getTimeOfDay();

  const handleGratitude = () => {
    if (gratitude.trim()) {
      setSubmitted(true);
      // Could save to API in future
    }
  };

  if (!isActive) {
    const nextSunday = new Date();
    nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()));
    nextSunday.setHours(0, 0, 0, 0);
    const hoursUntil = Math.ceil((nextSunday.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-900 to-indigo-950 text-white p-4">
        <div className="max-w-md mx-auto pt-20 text-center">
          <div className="text-6xl mb-4">🕊️</div>
          <h1 className="text-2xl font-bold mb-2">Sunday Sanctuary</h1>
          <p className="text-purple-300 mb-6">A peaceful space for reflection</p>
          <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
            <p className="text-purple-200 mb-2">The sanctuary opens on Sunday</p>
            <p className="text-3xl font-bold text-purple-100">{hoursUntil} hours</p>
            <p className="text-purple-300 text-sm mt-2">until next Sunday</p>
          </div>
          <Link href="/dashboard" className="inline-block mt-6 text-purple-300 hover:text-white">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-900 to-indigo-950 text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-purple-400/10"
            style={{
              width: `${Math.random() * 200 + 50}px`,
              height: `${Math.random() * 200 + 50}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${15 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-md mx-auto p-4 pb-20">
        {/* Header */}
        <div className="text-center py-8">
          <div className="text-5xl mb-3">🕊️</div>
          <h1 className="text-2xl font-bold mb-1">Sunday Sanctuary</h1>
          <p className="text-purple-300">{timeInfo.emoji} {timeInfo.vibe}</p>
        </div>

        {/* Week in Review */}
        {stats && stats.weekSmokes > 0 && (
          <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm mb-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              📊 Your Week in Review
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-200">{stats.weekSmokes}</p>
                <p className="text-xs text-purple-400">Smokes This Week</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-200">
                  {stats.weekAvgRating ? stats.weekAvgRating.toFixed(1) : '-'}⭐
                </p>
                <p className="text-xs text-purple-400">Avg Rating</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-200">{stats.weekLikesReceived}</p>
                <p className="text-xs text-purple-400">Likes Received</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-200">{stats.weekCommentsReceived}</p>
                <p className="text-xs text-purple-400">Comments</p>
              </div>
            </div>
            {stats.weekTopBrand && (
              <div className="mt-3 text-center text-sm text-purple-300">
                Your top brand: <span className="text-white font-medium">{stats.weekTopBrand}</span>
              </div>
            )}
          </div>
        )}

        {/* Gratitude Moment */}
        <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm mb-4">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            🙏 Sunday Gratitude
          </h2>
          {!submitted ? (
            <>
              <p className="text-purple-300 text-sm mb-3">
                Take a moment to reflect. What are you grateful for this week?
              </p>
              <textarea
                value={gratitude}
                onChange={(e) => setGratitude(e.target.value)}
                placeholder="I'm grateful for..."
                className="w-full bg-white/10 border border-purple-500/30 rounded-lg p-3 text-white placeholder-purple-400 resize-none h-24 focus:outline-none focus:border-purple-400"
              />
              <button
                onClick={handleGratitude}
                disabled={!gratitude.trim()}
                className="mt-2 w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:opacity-50 text-white rounded-lg py-2 transition-colors"
              >
                Save Reflection
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">✨</div>
              <p className="text-purple-200">Beautiful reflection. Carry this gratitude into the week ahead.</p>
            </div>
          )}
        </div>

        {/* Today's Sanctuary Smokers */}
        {stats && stats.todaySmokers.length > 0 && (
          <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm mb-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              🕊️ In the Sanctuary Today
            </h2>
            <div className="space-y-2">
              {stats.todaySmokers.slice(0, 5).map((smoker, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                  <Link href={`/user/${smoker.username}`} className="text-purple-200 hover:text-white">
                    @{smoker.username}
                  </Link>
                  <span className="text-sm text-purple-400">{smoker.brand}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sunday Seekers Leaderboard */}
        {stats && stats.sundayLeaders.length > 0 && (
          <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm mb-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              🏆 Sunday Seekers
            </h2>
            <p className="text-purple-300 text-sm mb-3">Who finds peace on Sundays?</p>
            <div className="space-y-2">
              {stats.sundayLeaders.slice(0, 5).map((leader, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🕊️'}</span>
                    <Link href={`/user/${leader.username}`} className="text-purple-200 hover:text-white">
                      @{leader.username}
                    </Link>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-medium">{leader.count}</span>
                    <span className="text-purple-400 text-sm ml-1">Sunday smokes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Platform Sunday Stats */}
        {stats && (
          <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm mb-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              📈 Sunday Stats
            </h2>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xl font-bold text-purple-200">{stats.platformSundaySmokes}</p>
                <p className="text-xs text-purple-400">Total Sunday Smokes</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xl font-bold text-purple-200">
                  {stats.mostReflectiveHour !== null ? `${stats.mostReflectiveHour}:00` : '-'}
                </p>
                <p className="text-xs text-purple-400">Peak Sunday Hour</p>
              </div>
            </div>
            {stats.sundayTopBrand && (
              <div className="mt-3 text-center text-sm text-purple-300">
                Sunday favorite: <span className="text-white font-medium">{stats.sundayTopBrand}</span>
              </div>
            )}
          </div>
        )}

        {/* Peaceful Quotes */}
        <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm mb-4">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            💭 Sunday Wisdom
          </h2>
          <div className="text-center">
            <p className="text-purple-200 italic text-lg">
              "{getWisdom()}"
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href="/checkin"
            className="flex-1 bg-purple-600 hover:bg-purple-500 text-white rounded-xl py-3 text-center transition-colors"
          >
            🕊️ Log a Sunday Smoke
          </Link>
          <Link
            href="/dashboard"
            className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-4 py-3 transition-colors"
          >
            ←
          </Link>
        </div>

        {loading && (
          <div className="text-center py-8 text-purple-300">
            Finding your inner peace...
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.1); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

function getWisdom(): string {
  const wisdoms = [
    "Sunday is the golden clasp that binds together the volume of the week.",
    "Rest is not idleness; it is the prelude to the week ahead.",
    "Take rest; a field that has rested gives a bountiful crop.",
    "Sunday clears away the rust of the whole week.",
    "In the quiet of Sunday, we find ourselves.",
    "A Sunday well spent brings a week of content.",
    "Slow down and enjoy life. It's not only the scenery you miss by going too fast.",
    "Sometimes the most productive thing you can do is relax.",
    "Sunday is the day to reflect on all the blessings of the past week.",
    "Give yourself permission to slow down this Sunday."
  ];
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return wisdoms[dayOfYear % wisdoms.length];
}
