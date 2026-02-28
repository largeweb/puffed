'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiAward, FiCalendar, FiTrendingUp, FiUser } from 'react-icons/fi';

interface AwardWinner {
  username: string;
  value: number | string;
  subtitle?: string;
}

interface Award {
  id: string;
  title: string;
  emoji: string;
  description: string;
  winner: AwardWinner | null;
}

interface AwardsData {
  awards: Award[];
  userAwards: string[];
  weekStart: string;
  weekEnd: string;
  totalAwards: number;
  claimedAwards: number;
}

export default function SmokeAwardsPage() {
  const [data, setData] = useState<AwardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('puffed_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserId(parsed.id);
      } catch {}
    }
  }, []);

  useEffect(() => {
    const fetchAwards = async () => {
      try {
        const params = userId ? `?userId=${userId}` : '';
        const res = await fetch(`/api/smoke-awards${params}`);
        const json = await res.json() as AwardsData;
        setData(json);
      } catch (err) {
        console.error('Failed to load awards:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAwards();
  }, [userId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-yellow-900 to-orange-900 flex items-center justify-center">
        <div className="text-amber-200 text-xl animate-pulse">Loading awards...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-yellow-900 to-orange-900 flex items-center justify-center">
        <div className="text-amber-200 text-xl">Failed to load awards</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-yellow-900 to-orange-900">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-6xl opacity-10 animate-pulse">🏆</div>
        <div className="absolute top-40 right-20 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '0.5s' }}>⭐</div>
        <div className="absolute bottom-40 left-20 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}>🎖️</div>
        <div className="absolute bottom-20 right-10 text-6xl opacity-10 animate-pulse" style={{ animationDelay: '1.5s' }}>👑</div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="text-amber-200 hover:text-white transition-colors">
            <FiArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <FiAward className="text-yellow-400" />
              Smoke Awards
            </h1>
            <p className="text-amber-200/80 text-sm">Weekly superlatives</p>
          </div>
        </div>

        {/* Week Info Card */}
        <div className="bg-amber-800/30 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-amber-600/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-200">
              <FiCalendar />
              <span className="font-medium">
                Week of {formatDate(data.weekStart)} - {formatDate(data.weekEnd)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-yellow-400">
              <FiTrendingUp />
              <span className="font-bold">{data.claimedAwards}/{data.totalAwards}</span>
              <span className="text-amber-200/60 text-sm">claimed</span>
            </div>
          </div>
        </div>

        {/* User's Awards Banner */}
        {data.userAwards.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-2xl p-4 mb-6 border border-yellow-400/40">
            <div className="flex items-center gap-2 text-yellow-300 mb-2">
              <span className="text-xl">🎉</span>
              <span className="font-bold">You won {data.userAwards.length} award{data.userAwards.length > 1 ? 's' : ''} this week!</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.awards.filter(a => data.userAwards.includes(a.id)).map(award => (
                <span key={award.id} className="bg-yellow-400/20 px-3 py-1 rounded-full text-yellow-200 text-sm">
                  {award.emoji} {award.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Awards Grid */}
        <div className="grid gap-4">
          {data.awards.map((award, index) => (
            <div
              key={award.id}
              className={`
                relative overflow-hidden rounded-2xl p-4 border transition-all duration-300
                ${award.winner 
                  ? 'bg-gradient-to-r from-amber-800/50 to-yellow-900/50 border-amber-500/40 hover:border-yellow-400/60' 
                  : 'bg-gray-800/30 border-gray-600/30 opacity-60'
                }
              `}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Award Badge */}
              <div className="flex items-start gap-4">
                <div className={`
                  w-16 h-16 rounded-xl flex items-center justify-center text-3xl
                  ${award.winner 
                    ? 'bg-gradient-to-br from-yellow-400/20 to-amber-500/20' 
                    : 'bg-gray-700/30'
                  }
                `}>
                  {award.emoji}
                </div>
                
                <div className="flex-1">
                  <h3 className={`font-bold text-lg ${award.winner ? 'text-white' : 'text-gray-400'}`}>
                    {award.title}
                  </h3>
                  <p className={`text-sm ${award.winner ? 'text-amber-200/70' : 'text-gray-500'}`}>
                    {award.description}
                  </p>
                  
                  {award.winner ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Link 
                        href={`/user/${award.winner.username}`}
                        className="flex items-center gap-1.5 bg-amber-600/30 hover:bg-amber-600/50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <FiUser size={14} className="text-yellow-400" />
                        <span className="text-yellow-200 font-medium">{award.winner.username}</span>
                      </Link>
                      {award.winner.subtitle && (
                        <span className="text-amber-300/60 text-sm">{award.winner.subtitle}</span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-gray-500 text-sm italic">
                      No winner yet this week
                    </div>
                  )}
                </div>

                {/* Rank indicator for top awards */}
                {index < 3 && award.winner && (
                  <div className={`
                    absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold
                    ${index === 0 ? 'bg-yellow-400 text-yellow-900' : 
                      index === 1 ? 'bg-gray-300 text-gray-700' : 
                      'bg-amber-600 text-amber-100'}
                  `}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-amber-200/60 text-sm">
            Awards reset every Monday. Keep smoking to climb the ranks! 🚬
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <Link 
              href="/leaderboard"
              className="text-amber-300 hover:text-white transition-colors text-sm flex items-center gap-1"
            >
              <FiTrendingUp /> View Leaderboard
            </Link>
            <Link 
              href="/achievements"
              className="text-amber-300 hover:text-white transition-colors text-sm flex items-center gap-1"
            >
              <FiAward /> View Badges
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
