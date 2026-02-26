'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiArrowLeft, FiCoffee, FiAward, FiUsers, FiTrendingUp, FiClock } from 'react-icons/fi';

interface LunchSmoker {
  user_id: string;
  username: string;
  avatar_url: string | null;
  lunch_smokes: number;
  first_lunch_smoke: number;
}

interface LunchLeader {
  id: string;
  username: string;
  avatar_url: string | null;
  total_lunch_smokes: number;
}

interface LunchData {
  isLunchTime: boolean;
  currentHour: number;
  vibeText: string;
  todaySmokers: LunchSmoker[];
  todayCount: number;
  platformStats: {
    totalLunchSmokes: number;
    uniqueLunchSmokers: number;
    lunchDays: number;
  };
  leaderboard: LunchLeader[];
  personalStats: {
    totalLunchSmokes: number;
    favoriteLunchBrand: string | null;
    percentile: number;
  } | null;
}

export default function LunchLoungePage() {
  const router = useRouter();
  const [data, setData] = useState<LunchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'leaderboard'>('today');

  useEffect(() => {
    fetch('/api/lunch-lounge')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-900/40 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-900/40 via-neutral-900 to-neutral-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-neutral-900/80 backdrop-blur-md border-b border-orange-700/30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-orange-400 hover:text-orange-300">
            <FiArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍴</span>
            <h1 className="text-xl font-bold text-orange-200">Lunch Break Lounge</h1>
          </div>
          {data?.isLunchTime && (
            <span className="ml-auto bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <span className="animate-pulse">●</span> LIVE
            </span>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Status Banner */}
        <div className={`rounded-xl p-4 text-center ${
          data?.isLunchTime 
            ? 'bg-gradient-to-r from-orange-600/30 to-amber-600/30 border border-orange-500/30' 
            : 'bg-neutral-800/50 border border-neutral-700/30'
        }`}>
          <div className="text-3xl mb-2">
            {data?.isLunchTime ? '🍴' : '⏰'}
          </div>
          <p className="text-lg font-medium text-orange-200">
            {data?.isLunchTime ? data.vibeText : 'Lunch hours: 11am - 2pm'}
          </p>
          {!data?.isLunchTime && (
            <p className="text-sm text-neutral-400 mt-1">
              Come back during lunch for the full experience!
            </p>
          )}
        </div>

        {/* Personal Stats */}
        {data?.personalStats && data.personalStats.totalLunchSmokes > 0 && (
          <div className="bg-gradient-to-r from-orange-900/30 to-amber-900/30 rounded-xl p-4 border border-orange-700/20">
            <h3 className="text-sm font-medium text-orange-300 mb-3 flex items-center gap-2">
              <FiCoffee /> Your Lunch Stats
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-2xl font-bold text-orange-200">{data.personalStats.totalLunchSmokes}</div>
                <div className="text-xs text-neutral-400">lunch smokes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-200">top {data.personalStats.percentile}%</div>
                <div className="text-xs text-neutral-400">lunch smoker</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-200 truncate">{data.personalStats.favoriteLunchBrand || '-'}</div>
                <div className="text-xs text-neutral-400">go-to brand</div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'today'
                ? 'bg-orange-600/30 text-orange-200 border border-orange-500/30'
                : 'bg-neutral-800/50 text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <FiClock className="inline mr-1" /> Today's Lunchers
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'leaderboard'
                ? 'bg-orange-600/30 text-orange-200 border border-orange-500/30'
                : 'bg-neutral-800/50 text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <FiAward className="inline mr-1" /> Leaderboard
          </button>
        </div>

        {/* Today's Smokers */}
        {activeTab === 'today' && (
          <div className="space-y-3">
            {data?.todaySmokers && data.todaySmokers.length > 0 ? (
              data.todaySmokers.map((smoker, idx) => (
                <Link
                  key={smoker.user_id}
                  href={`/profile/${smoker.username}`}
                  className="block bg-neutral-800/50 rounded-lg p-3 border border-neutral-700/30 hover:border-orange-500/30 transition-colors"
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
                        <div className="w-10 h-10 bg-orange-600/30 rounded-full flex items-center justify-center text-orange-300 font-bold">
                          {smoker.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-neutral-200">{smoker.username}</div>
                      <div className="text-xs text-neutral-500">
                        First puff at {formatTime(smoker.first_lunch_smoke)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-orange-300">{smoker.lunch_smokes}</div>
                      <div className="text-xs text-neutral-500">today</div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <span className="text-4xl mb-3 block">🍴</span>
                <p>No lunch smokers yet today!</p>
                <p className="text-sm mt-1">Be the first to take a lunch break puff</p>
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
                  href={`/profile/${leader.username}`}
                  className="block bg-neutral-800/50 rounded-lg p-3 border border-neutral-700/30 hover:border-orange-500/30 transition-colors"
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
                      <div className="w-10 h-10 bg-orange-600/30 rounded-full flex items-center justify-center text-orange-300 font-bold">
                        {leader.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-neutral-200">{leader.username}</div>
                      <div className="text-xs text-orange-400">Lunch Break Regular</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-orange-300">{leader.total_lunch_smokes}</div>
                      <div className="text-xs text-neutral-500">all-time</div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <span className="text-4xl mb-3 block">🏆</span>
                <p>No lunch break champions yet!</p>
                <p className="text-sm mt-1">Start logging during lunch to appear here</p>
              </div>
            )}
          </div>
        )}

        {/* Platform Stats */}
        <div className="bg-neutral-800/30 rounded-xl p-4 border border-neutral-700/20">
          <h3 className="text-sm font-medium text-orange-300 mb-3 flex items-center gap-2">
            <FiTrendingUp /> Platform Lunch Stats
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xl font-bold text-orange-200">{data?.platformStats?.totalLunchSmokes || 0}</div>
              <div className="text-xs text-neutral-500">lunch smokes</div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-200">{data?.platformStats?.uniqueLunchSmokers || 0}</div>
              <div className="text-xs text-neutral-500">lunchers</div>
            </div>
            <div>
              <div className="text-xl font-bold text-orange-200">{data?.platformStats?.lunchDays || 0}</div>
              <div className="text-xs text-neutral-500">days tracked</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        {data?.isLunchTime && (
          <Link
            href="/checkin"
            className="block w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white text-center py-3 rounded-xl font-medium hover:from-orange-500 hover:to-amber-500 transition-all"
          >
            🍴 Log Your Lunch Break Smoke
          </Link>
        )}
      </div>
    </div>
  );
}
