'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiArrowLeft, FiCoffee, FiAward, FiUsers, FiTrendingUp, FiClock, FiZap, FiSun } from 'react-icons/fi';

interface AfternoonSmoker {
  user_id: string;
  username: string;
  avatar_url: string | null;
  afternoon_smokes: number;
  first_afternoon_smoke: number;
}

interface AfternoonLeader {
  id: string;
  username: string;
  avatar_url: string | null;
  total_afternoon_smokes: number;
  favorite_brand: string | null;
}

interface AfternoonData {
  isAfternoonBreak: boolean;
  currentHour: number;
  vibeText: string;
  isWeekday: boolean;
  productivityTip: string;
  todaySmokers: AfternoonSmoker[];
  todayCount: number;
  platformStats: {
    totalAfternoonSmokes: number;
    uniqueAfternoonSmokers: number;
    afternoonDays: number;
  };
  leaderboard: AfternoonLeader[];
  personalStats: {
    totalAfternoonSmokes: number;
    favoriteAfternoonBrand: string | null;
    percentile: number;
  } | null;
}

export default function AfternoonBreakPage() {
  const router = useRouter();
  const [data, setData] = useState<AfternoonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'leaderboard'>('today');

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/afternoon-break');
        if (res.ok) {
          const json = await res.json() as AfternoonData;
          setData(json);
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-900/40 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-900/40 via-neutral-900 to-neutral-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-neutral-900/80 backdrop-blur-md border-b border-teal-700/30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-teal-400 hover:text-teal-300">
            <FiArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">☕</span>
            <h1 className="text-xl font-bold text-teal-200">Afternoon Break</h1>
          </div>
          {data?.isAfternoonBreak && (
            <span className="ml-auto bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <span className="animate-pulse">●</span> LIVE
            </span>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Status Banner */}
        <div className={`rounded-xl p-4 text-center ${
          data?.isAfternoonBreak 
            ? 'bg-gradient-to-r from-teal-600/30 to-cyan-600/30 border border-teal-500/30' 
            : 'bg-neutral-800/50 border border-neutral-700/30'
        }`}>
          <div className="text-4xl mb-2">
            {data?.isAfternoonBreak ? '☕' : '⏰'}
          </div>
          <p className="text-lg font-medium text-teal-200">
            {data?.vibeText}
          </p>
          {!data?.isAfternoonBreak && data?.currentHour !== undefined && data.currentHour < 14 && (
            <div className="mt-2">
              <div className="text-3xl font-bold text-teal-400">
                {14 - data.currentHour}h
              </div>
              <p className="text-sm text-neutral-400">until Afternoon Break ☕</p>
            </div>
          )}
          <p className="text-xs text-neutral-500 mt-2">
            2pm - 4pm EST • The Post-Lunch Reset
          </p>
        </div>

        {/* Productivity Tip */}
        {data?.productivityTip && (
          <div className="bg-gradient-to-r from-cyan-900/20 to-teal-900/20 rounded-xl p-4 border border-cyan-700/20">
            <div className="flex items-start gap-3">
              <FiZap className="text-cyan-400 mt-1 flex-shrink-0" size={20} />
              <div>
                <h3 className="text-sm font-medium text-cyan-300 mb-1">Break Wisdom</h3>
                <p className="text-sm text-neutral-300">{data.productivityTip}</p>
              </div>
            </div>
          </div>
        )}

        {/* Personal Stats */}
        {data?.personalStats && data.personalStats.totalAfternoonSmokes > 0 && (
          <div className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 rounded-xl p-4 border border-teal-700/20">
            <h3 className="text-sm font-medium text-teal-300 mb-3 flex items-center gap-2">
              <FiSun /> Your Afternoon Stats
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-2xl font-bold text-teal-200">{data.personalStats.totalAfternoonSmokes}</div>
                <div className="text-xs text-neutral-400">afternoon breaks</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-cyan-200">top {data.personalStats.percentile}%</div>
                <div className="text-xs text-neutral-400">break taker</div>
              </div>
              <div>
                <div className="text-lg font-bold text-teal-200 truncate">{data.personalStats.favoriteAfternoonBrand || '-'}</div>
                <div className="text-xs text-neutral-400">go-to brand</div>
              </div>
            </div>
          </div>
        )}

        {/* Weekday Badge */}
        {data?.isWeekday && data?.isAfternoonBreak && (
          <div className="bg-gradient-to-r from-emerald-900/20 to-teal-900/20 rounded-lg p-3 border border-emerald-700/20 text-center">
            <span className="text-emerald-400 text-sm">
              💼 Weekday Break Mode • You&apos;ve earned this!
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'today'
                ? 'bg-teal-600/30 text-teal-200 border border-teal-500/30'
                : 'bg-neutral-800/50 text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <FiClock className="inline mr-1" /> Today&apos;s Breakers
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'leaderboard'
                ? 'bg-teal-600/30 text-teal-200 border border-teal-500/30'
                : 'bg-neutral-800/50 text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <FiAward className="inline mr-1" /> Leaderboard
          </button>
        </div>

        {/* Today's Afternoon Smokers */}
        {activeTab === 'today' && (
          <div className="space-y-3">
            {data?.todaySmokers && data.todaySmokers.length > 0 ? (
              data.todaySmokers.map((smoker, idx) => (
                <Link
                  key={smoker.user_id}
                  href={`/user/${smoker.username}`}
                  className="block bg-neutral-800/50 rounded-lg p-3 border border-neutral-700/30 hover:border-teal-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {idx < 3 && (
                        <span className="absolute -top-1 -left-1 text-sm">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                        </span>
                      )}
                      {smoker.avatar_url ? (
                        <Image
                          src={smoker.avatar_url}
                          alt={smoker.username}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-teal-600/30 rounded-full flex items-center justify-center text-teal-300 font-bold">
                          {smoker.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-neutral-200">{smoker.username}</div>
                      <div className="text-xs text-neutral-500">
                        Break started at {formatTime(smoker.first_afternoon_smoke)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-teal-300">{smoker.afternoon_smokes}</div>
                      <div className="text-xs text-neutral-500">today</div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <span className="text-4xl mb-3 block">☕</span>
                <p>No afternoon breakers yet today!</p>
                <p className="text-sm mt-1">Be the first to take a 2pm-4pm break</p>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-3">
            {data?.leaderboard && data.leaderboard.length > 0 ? (
              data.leaderboard.map((leader, idx) => (
                <Link
                  key={leader.id}
                  href={`/user/${leader.username}`}
                  className="block bg-neutral-800/50 rounded-lg p-3 border border-neutral-700/30 hover:border-teal-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-center">
                      {idx < 3 ? (
                        <span className="text-xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                      ) : (
                        <span className="text-neutral-500 font-bold">#{idx + 1}</span>
                      )}
                    </div>
                    {leader.avatar_url ? (
                      <Image
                        src={leader.avatar_url}
                        alt={leader.username}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-teal-600/30 rounded-full flex items-center justify-center text-teal-300 font-bold">
                        {leader.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-neutral-200">{leader.username}</div>
                      {leader.favorite_brand && (
                        <div className="text-xs text-teal-400">Loves {leader.favorite_brand}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-teal-300">{leader.total_afternoon_smokes}</div>
                      <div className="text-xs text-neutral-500">all-time</div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <span className="text-4xl mb-3 block">🏆</span>
                <p>No afternoon break champions yet!</p>
                <p className="text-sm mt-1">Start logging during 2-4pm to appear here</p>
              </div>
            )}
          </div>
        )}

        {/* Platform Stats */}
        <div className="bg-neutral-800/30 rounded-xl p-4 border border-neutral-700/20">
          <h3 className="text-sm font-medium text-teal-300 mb-3 flex items-center gap-2">
            <FiTrendingUp /> Platform Afternoon Stats
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xl font-bold text-teal-200">{data?.platformStats?.totalAfternoonSmokes || 0}</div>
              <div className="text-xs text-neutral-500">break smokes</div>
            </div>
            <div>
              <div className="text-xl font-bold text-cyan-200">{data?.platformStats?.uniqueAfternoonSmokers || 0}</div>
              <div className="text-xs text-neutral-500">breakers</div>
            </div>
            <div>
              <div className="text-xl font-bold text-teal-200">{data?.platformStats?.afternoonDays || 0}</div>
              <div className="text-xs text-neutral-500">days tracked</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        {data?.isAfternoonBreak && (
          <Link
            href="/checkin"
            className="block w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-center py-3 rounded-xl font-medium hover:from-teal-500 hover:to-cyan-500 transition-all"
          >
            ☕ Log Your Afternoon Break Smoke
          </Link>
        )}

        {/* Info Footer */}
        <div className="text-center text-xs text-neutral-500 py-4">
          <p>☕ Afternoon Break: 2pm - 4pm EST</p>
          <p className="mt-1">Beat the post-lunch slump with a quality smoke!</p>
        </div>
      </div>
    </div>
  );
}
