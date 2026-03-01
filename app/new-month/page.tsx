'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MonthStats {
  lastMonthSmokes: number;
  lastMonthAvgRating: number;
  lastMonthTopBrand: string | null;
  lastMonthLikes: number;
  lastMonthComments: number;
  lastMonthBadges: number;
  thisMonthSmokes: number;
  monthlyLeaders: Array<{
    username: string;
    lastMonthCount: number;
    streak: number;
  }>;
  firstSmokersThisMonth: Array<{
    username: string;
    brand: string;
    created_at: number;
  }>;
  platformMonthlySmokes: number;
  daysInMonth: number;
  monthName: string;
  lastMonthName: string;
}

export default function NewMonthPage() {
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [intention, setIntention] = useState('');
  const [intentionSet, setIntentionSet] = useState(false);

  useEffect(() => {
    fetch('/api/new-month')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const now = new Date();
  const dayOfMonth = now.getDate();
  const hour = now.getHours();
  
  // New Month page is active on days 1-3 of each month
  const isActive = dayOfMonth <= 3;

  const getMonthEmoji = () => {
    const month = now.getMonth();
    const emojis = ['❄️', '💕', '🍀', '🌸', '🌺', '☀️', '🎆', '🏖️', '🍂', '🎃', '🦃', '🎄'];
    return emojis[month];
  };

  const getMonthVibes = () => {
    const month = now.getMonth();
    const vibes = [
      { name: 'Fresh Start January', theme: 'New year energy' },
      { name: 'February Love', theme: 'Month of connections' },
      { name: 'March Forward', theme: 'Spring awakening' },
      { name: 'April Showers', theme: 'Growth season begins' },
      { name: 'May Flowers', theme: 'Blooming possibilities' },
      { name: 'June Vibes', theme: 'Summer kickoff' },
      { name: 'July Heat', theme: 'Peak summer energy' },
      { name: 'August Blaze', theme: 'Late summer glow' },
      { name: 'September Reset', theme: 'Back to routine' },
      { name: 'October Spice', theme: 'Cozy season arrives' },
      { name: 'November Thanks', theme: 'Gratitude month' },
      { name: 'December Magic', theme: 'Holiday spirit' }
    ];
    return vibes[month];
  };

  const monthVibes = getMonthVibes();

  const handleIntention = () => {
    if (intention.trim()) {
      setIntentionSet(true);
      // Could save to API in future
    }
  };

  if (!isActive) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysUntil = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const nextMonthName = nextMonth.toLocaleDateString('en-US', { month: 'long' });
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-teal-900 to-emerald-950 text-white p-4">
        <div className="max-w-md mx-auto pt-20 text-center">
          <div className="text-6xl mb-4">🗓️</div>
          <h1 className="text-2xl font-bold mb-2">New Month Reset</h1>
          <p className="text-teal-300 mb-6">A fresh start awaits</p>
          <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
            <p className="text-teal-200 mb-2">Next reset opens</p>
            <p className="text-3xl font-bold text-teal-100">{nextMonthName} 1st</p>
            <p className="text-teal-300 text-sm mt-2">{daysUntil} days until fresh start</p>
          </div>
          <Link href="/dashboard" className="inline-block mt-6 text-teal-300 hover:text-white">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-teal-900 to-emerald-950 text-white">
      {/* Confetti effect for new month */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-20px`,
              animation: `confetti ${3 + Math.random() * 4}s linear infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          >
            <span className="text-xl">{['✨', '🎉', '🌟', '💫', '🎊'][i % 5]}</span>
          </div>
        ))}
      </div>

      <div className="relative z-10 max-w-md mx-auto p-4 pb-20">
        {/* Header */}
        <div className="text-center py-8">
          <div className="text-5xl mb-3">{getMonthEmoji()}</div>
          <h1 className="text-2xl font-bold mb-1">Happy New Month!</h1>
          <p className="text-teal-300">{monthVibes.name} • {monthVibes.theme}</p>
          {dayOfMonth === 1 && hour < 6 && (
            <div className="mt-2 inline-block bg-teal-500/30 text-teal-200 px-3 py-1 rounded-full text-sm">
              🌙 First hours of the month!
            </div>
          )}
        </div>

        {/* Last Month Recap */}
        {stats && stats.lastMonthSmokes > 0 && (
          <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm mb-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              📊 {stats.lastMonthName} Recap
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-teal-200">{stats.lastMonthSmokes}</p>
                <p className="text-xs text-teal-400">Total Smokes</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-teal-200">
                  {stats.lastMonthAvgRating ? stats.lastMonthAvgRating.toFixed(1) : '-'}⭐
                </p>
                <p className="text-xs text-teal-400">Avg Rating</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-teal-200">{stats.lastMonthLikes}</p>
                <p className="text-xs text-teal-400">Likes Received</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-teal-200">{stats.lastMonthComments}</p>
                <p className="text-xs text-teal-400">Comments</p>
              </div>
            </div>
            {stats.lastMonthTopBrand && (
              <div className="mt-3 text-center text-sm text-teal-300">
                Your go-to brand: <span className="text-white font-medium">{stats.lastMonthTopBrand}</span>
              </div>
            )}
          </div>
        )}

        {/* Monthly Intention */}
        <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm mb-4">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            🎯 Set Your Monthly Intention
          </h2>
          {!intentionSet ? (
            <>
              <p className="text-teal-300 text-sm mb-3">
                What do you want to explore or achieve this month?
              </p>
              <textarea
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                placeholder="This month I want to..."
                className="w-full bg-white/10 border border-teal-500/30 rounded-lg p-3 text-white placeholder-teal-400 resize-none h-24 focus:outline-none focus:border-teal-400"
              />
              <button
                onClick={handleIntention}
                disabled={!intention.trim()}
                className="mt-2 w-full bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:opacity-50 text-white rounded-lg py-2 transition-colors"
              >
                Set Intention 🚀
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">🌟</div>
              <p className="text-teal-200">Intention set! Make this month count.</p>
            </div>
          )}
        </div>

        {/* First Smokers This Month */}
        {stats && stats.firstSmokersThisMonth.length > 0 && (
          <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm mb-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              🏅 First to Light Up This Month
            </h2>
            <div className="space-y-2">
              {stats.firstSmokersThisMonth.slice(0, 5).map((smoker, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🎖️'}</span>
                    <Link href={`/user/${smoker.username}`} className="text-teal-200 hover:text-white">
                      @{smoker.username}
                    </Link>
                  </div>
                  <span className="text-sm text-teal-400">{smoker.brand}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly Leaders (from last month) */}
        {stats && stats.monthlyLeaders.length > 0 && (
          <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm mb-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              🏆 {stats.lastMonthName} Champions
            </h2>
            <div className="space-y-2">
              {stats.monthlyLeaders.slice(0, 5).map((leader, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🎖️'}</span>
                    <Link href={`/user/${leader.username}`} className="text-teal-200 hover:text-white">
                      @{leader.username}
                    </Link>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-medium">{leader.lastMonthCount}</span>
                    <span className="text-teal-400 text-sm ml-1">smokes</span>
                    {leader.streak >= 3 && (
                      <span className="text-orange-400 text-sm ml-2">🔥 {leader.streak}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fresh Start Tips */}
        <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm mb-4">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            💡 Fresh Start Ideas
          </h2>
          <div className="space-y-3">
            {getFreshStartTips().map((tip, i) => (
              <div key={i} className="flex items-start gap-3 bg-white/5 rounded-lg p-3">
                <span className="text-xl">{tip.emoji}</span>
                <div>
                  <p className="text-white font-medium">{tip.title}</p>
                  <p className="text-teal-300 text-sm">{tip.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Month Stats */}
        {stats && (
          <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm mb-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              📈 Platform Pulse
            </h2>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xl font-bold text-teal-200">{stats.platformMonthlySmokes}</p>
                <p className="text-xs text-teal-400">Smokes Last Month</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xl font-bold text-teal-200">{stats.daysInMonth}</p>
                <p className="text-xs text-teal-400">Days This Month</p>
              </div>
            </div>
            <div className="mt-3 text-center text-sm text-teal-300">
              {stats.thisMonthSmokes} {stats.thisMonthSmokes === 1 ? 'smoke' : 'smokes'} logged so far in {stats.monthName}!
            </div>
          </div>
        )}

        {/* Monthly Quote */}
        <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm mb-4 text-center">
          <div className="text-2xl mb-2">🌱</div>
          <p className="text-teal-200 italic">
            "{getMonthlyQuote()}"
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href="/checkin"
            className="flex-1 bg-teal-600 hover:bg-teal-500 text-white rounded-xl py-3 text-center transition-colors"
          >
            🗓️ First Smoke of {stats?.monthName || 'the Month'}
          </Link>
          <Link
            href="/dashboard"
            className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-4 py-3 transition-colors"
          >
            ←
          </Link>
        </div>

        {loading && (
          <div className="text-center py-8 text-teal-300">
            Loading your fresh start...
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function getFreshStartTips() {
  const tips = [
    { emoji: '🆕', title: 'Try a New Brand', description: 'Expand your horizons this month' },
    { emoji: '📸', title: 'Document More', description: 'Add photos to your check-ins' },
    { emoji: '🤝', title: 'Connect', description: 'Follow someone new and engage' },
    { emoji: '🎯', title: 'Set a Goal', description: 'How many 5-star smokes this month?' },
    { emoji: '📝', title: 'Write Reviews', description: 'Help the community discover great brands' },
  ];
  // Rotate tips based on month
  const month = new Date().getMonth();
  return tips.sort(() => (month % 3) - 1).slice(0, 3);
}

function getMonthlyQuote(): string {
  const quotes = [
    "Every month is a fresh start. Embrace it.",
    "New month, new possibilities, new smokes to discover.",
    "The secret to getting ahead is getting started.",
    "A new month is a blank canvas — paint it well.",
    "Fresh starts aren't just for January.",
    "What you do today shapes your month ahead.",
    "Begin with intention, end with satisfaction.",
    "Each month is a chance to write a new story.",
    "The best time to start was yesterday. The next best time is now.",
    "New month energy hits different. Use it."
  ];
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return quotes[dayOfYear % quotes.length];
}
