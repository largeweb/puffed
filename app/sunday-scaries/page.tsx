'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/AuthContext';

interface ScariesData {
  countdown: {
    hoursToMonday: number;
    minutesToMonday: number;
    weekendProgress: number; // % of weekend consumed
  };
  yourWeekend: {
    totalSmokes: number;
    avgRating: number;
    bestSmoke: {
      brand: string;
      product: string;
      rating: number;
    } | null;
    socialStats: {
      likesGiven: number;
      likesReceived: number;
      commentsLeft: number;
    };
  };
  supportGroup: Array<{
    username: string;
    lastCheckIn: string;
    copingMethod: string;
  }>;
  copingTips: string[];
  communityMood: {
    total: number;
    anxious: number;
    relaxed: number;
    denial: number;
  };
  survivalBadge: string | null;
}

export default function SundayScariesPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ScariesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    fetch('/api/sunday-scaries')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (data?.copingTips?.length) {
      const interval = setInterval(() => {
        setTipIndex(i => (i + 1) % data.copingTips.length);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [data]);

  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  
  // Only show full experience on Sunday 4 PM - Monday 2 AM
  const isScariesTime = (day === 0 && hour >= 16) || (day === 1 && hour < 2);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-purple-300 text-xl">😰 Gathering support group...</div>
      </div>
    );
  }

  if (!isScariesTime) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-800 via-slate-900 to-slate-800 text-white p-6">
        <div className="max-w-2xl mx-auto text-center py-20">
          <div className="text-8xl mb-6">😌</div>
          <h1 className="text-3xl font-bold mb-4">No Scaries Right Now</h1>
          <p className="text-slate-400 mb-8">
            The Sunday Scaries Support Group meets Sundays from 4 PM until Monday 2 AM.
          </p>
          <p className="text-slate-500 mb-8">
            {day === 0 && hour < 16 
              ? "Enjoy your Sunday! We'll be here when the dread sets in. 😅"
              : "You survived Monday! The next meeting is this Sunday."}
          </p>
          <Link href="/dashboard" className="text-purple-400 hover:text-purple-300">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const getMoodEmoji = (mood: string) => {
    switch (mood) {
      case 'anxious': return '😰';
      case 'relaxed': return '😌';
      case 'denial': return '🙈';
      default: return '🤔';
    }
  };

  const getPhaseMessage = () => {
    if (!data) return '';
    const hoursLeft = data.countdown.hoursToMonday;
    if (hoursLeft > 8) return "Early warning signs detected...";
    if (hoursLeft > 5) return "The dread is setting in...";
    if (hoursLeft > 2) return "Peak scaries time. You're not alone.";
    return "Almost there. You've got this! 💪";
  };

  const getCopingMethods = () => [
    "Having one more smoke",
    "Pretending it's still Saturday",
    "Making a to-do list (and ignoring it)",
    "Watching 'just one more' episode",
    "Scrolling this app",
    "Stress-smoking",
    "Manifesting a snow day",
    "Planning next weekend already",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900 text-white">
      {/* Animated worry lines background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-10">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute h-px bg-purple-400"
            style={{
              top: `${5 + i * 5}%`,
              left: '-10%',
              right: '-10%',
              animation: `worry ${3 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes worry {
          0%, 100% { transform: translateX(0) scaleX(1); opacity: 0.3; }
          50% { transform: translateX(10px) scaleX(1.1); opacity: 0.6; }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce">😰</div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Sunday Scaries Support Group
          </h1>
          <p className="text-purple-300">{getPhaseMessage()}</p>
        </div>

        {/* Monday Countdown */}
        {data && (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 mb-6 border border-purple-500/30">
            <h2 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
              ⏰ Monday Approaches
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-red-400">
                  {data.countdown.hoursToMonday}h {data.countdown.minutesToMonday}m
                </div>
                <div className="text-slate-400 text-sm">until Monday 9 AM</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-amber-400">
                  {data.countdown.weekendProgress}%
                </div>
                <div className="text-slate-400 text-sm">of weekend consumed</div>
              </div>
            </div>
            
            {/* Weekend progress bar */}
            <div className="mt-4 h-3 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 via-amber-500 to-red-500 transition-all duration-1000"
                style={{ width: `${data.countdown.weekendProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Friday 5 PM ✨</span>
              <span>Now 😰</span>
              <span>Monday 9 AM 💀</span>
            </div>
          </div>
        )}

        {/* Your Weekend Achievements */}
        {data?.yourWeekend && user && (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 mb-6 border border-green-500/30">
            <h2 className="text-lg font-semibold text-green-300 mb-4 flex items-center gap-2">
              🏆 Your Weekend Wins
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              Focus on what you accomplished, not what's coming!
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{data.yourWeekend.totalSmokes}</div>
                <div className="text-xs text-slate-400">Smokes logged</div>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-amber-400">
                  {data.yourWeekend.avgRating > 0 ? data.yourWeekend.avgRating.toFixed(1) : '-'}
                </div>
                <div className="text-xs text-slate-400">Avg rating</div>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-pink-400">{data.yourWeekend.socialStats.likesReceived}</div>
                <div className="text-xs text-slate-400">Likes received</div>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">{data.yourWeekend.socialStats.likesGiven}</div>
                <div className="text-xs text-slate-400">Likes given</div>
              </div>
            </div>

            {data.yourWeekend.bestSmoke && (
              <div className="bg-green-900/30 rounded-xl p-4 border border-green-500/30">
                <div className="text-sm text-green-300 mb-1">🌟 Weekend Highlight</div>
                <div className="font-semibold">{data.yourWeekend.bestSmoke.brand}</div>
                <div className="text-sm text-slate-400">{data.yourWeekend.bestSmoke.product}</div>
                <div className="text-amber-400 mt-1">
                  {'⭐'.repeat(data.yourWeekend.bestSmoke.rating)}
                </div>
              </div>
            )}

            {data.survivalBadge && (
              <div className="mt-4 text-center">
                <span className="inline-block bg-purple-600/50 px-4 py-2 rounded-full text-sm">
                  🎖️ {data.survivalBadge}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Community Mood Check */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 mb-6 border border-pink-500/30">
          <h2 className="text-lg font-semibold text-pink-300 mb-4 flex items-center gap-2">
            💭 How Are You Feeling?
          </h2>
          
          <div className="grid grid-cols-3 gap-3 mb-6">
            {['anxious', 'relaxed', 'denial'].map(mood => (
              <button
                key={mood}
                onClick={() => setSelectedMood(mood)}
                className={`p-4 rounded-xl transition-all ${
                  selectedMood === mood 
                    ? 'bg-purple-600 scale-105' 
                    : 'bg-slate-700/50 hover:bg-slate-700'
                }`}
              >
                <div className="text-3xl mb-1">{getMoodEmoji(mood)}</div>
                <div className="text-sm capitalize">{mood}</div>
                {data && (
                  <div className="text-xs text-slate-400 mt-1">
                    {mood === 'anxious' && data.communityMood.anxious}
                    {mood === 'relaxed' && data.communityMood.relaxed}
                    {mood === 'denial' && data.communityMood.denial} others
                  </div>
                )}
              </button>
            ))}
          </div>

          {selectedMood && (
            <div className="text-center text-slate-300 animate-pulse">
              {selectedMood === 'anxious' && "Deep breaths. One smoke at a time. 🫁"}
              {selectedMood === 'relaxed' && "Teach us your ways, zen master! 🧘"}
              {selectedMood === 'denial' && "It's still Saturday in your heart. 🙈"}
            </div>
          )}
        </div>

        {/* Coping Tips */}
        {data?.copingTips && data.copingTips.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 mb-6 border border-amber-500/30">
            <h2 className="text-lg font-semibold text-amber-300 mb-4 flex items-center gap-2">
              💡 Coping Wisdom
            </h2>
            <div className="min-h-[60px] flex items-center justify-center">
              <p className="text-xl text-center text-slate-200 italic">
                "{data.copingTips[tipIndex]}"
              </p>
            </div>
            <div className="flex justify-center gap-1 mt-4">
              {data.copingTips.map((_, i) => (
                <div 
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === tipIndex ? 'bg-amber-400 scale-125' : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Support Group - Who's Here */}
        {data?.supportGroup && data.supportGroup.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 mb-6 border border-blue-500/30">
            <h2 className="text-lg font-semibold text-blue-300 mb-4 flex items-center gap-2">
              🤝 Also In The Trenches
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              Fellow smokers coping with the Sunday Scaries tonight
            </p>
            
            <div className="space-y-3">
              {data.supportGroup.map((member, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-700/30 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg">
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <Link href={`/user/${member.username}`} className="font-medium hover:text-blue-300">
                      {member.username}
                    </Link>
                    <div className="text-sm text-slate-400">
                      Coping via: {member.copingMethod}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Survival Action */}
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur rounded-2xl p-6 mb-6 border border-purple-400/30 text-center">
          <div className="text-4xl mb-3">🚬</div>
          <h3 className="text-xl font-bold mb-2">The Best Cure for Sunday Scaries?</h3>
          <p className="text-slate-300 mb-4">A good smoke and good company.</p>
          <Link 
            href="/checkin/new"
            className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-full font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Log a Coping Smoke
          </Link>
        </div>

        {/* Footer encouragement */}
        <div className="text-center text-slate-400 text-sm">
          <p>Remember: Every Sunday leads to a Friday. You've survived 100% of Mondays so far. 💪</p>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <Link href="/dashboard" className="text-purple-400 hover:text-purple-300">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
