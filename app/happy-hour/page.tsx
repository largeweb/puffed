'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiArrowLeft, FiClock, FiAward, FiUsers, FiTrendingUp, FiStar } from 'react-icons/fi';

interface HappyHourSmoker {
  user_id: string;
  username: string;
  avatar_url: string | null;
  happy_hour_smokes: number;
  first_happy_hour_smoke: number;
}

interface HappyHourLeader {
  id: string;
  username: string;
  avatar_url: string | null;
  total_happy_hour_smokes: number;
  favorite_brand: string | null;
}

interface PopularBrand {
  brand: string;
  count: number;
  avg_rating: number;
}

interface HappyHourData {
  isHappyHour: boolean;
  currentHour: number;
  vibeText: string;
  todaySmokers: HappyHourSmoker[];
  todayCount: number;
  platformStats: {
    totalHappyHourSmokes: number;
    uniqueHappyHourSmokers: number;
    happyHourDays: number;
  };
  leaderboard: HappyHourLeader[];
  personalStats: {
    totalHappyHourSmokes: number;
    favoriteHappyHourBrand: string | null;
    percentile: number;
  } | null;
  popularBrands: PopularBrand[];
}

export default function HappyHourPage() {
  const router = useRouter();
  const [data, setData] = useState<HappyHourData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'leaderboard' | 'brands'>('today');

  useEffect(() => {
    fetch('/api/happy-hour')
      .then(res => res.json())
      .then((json: HappyHourData) => setData(json))
      .finally(() => setLoading(false));
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900/40 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-900/40 via-neutral-900 to-neutral-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-neutral-900/80 backdrop-blur-md border-b border-amber-700/30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-amber-400 hover:text-amber-300">
            <FiArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍻</span>
            <h1 className="text-xl font-bold text-amber-200">Happy Hour</h1>
          </div>
          {data?.isHappyHour && (
            <span className="ml-auto bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <span className="animate-pulse">●</span> LIVE
            </span>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Status Banner */}
        <div className={`rounded-xl p-4 text-center ${
          data?.isHappyHour 
            ? 'bg-gradient-to-r from-amber-600/30 to-yellow-600/30 border border-amber-500/30' 
            : 'bg-neutral-800/50 border border-neutral-700/30'
        }`}>
          <div className="text-4xl mb-2">
            {data?.isHappyHour ? '🍻' : '⏰'}
          </div>
          <p className="text-lg font-medium text-amber-200">
            {data?.vibeText}
          </p>
          {!data?.isHappyHour && data?.currentHour !== undefined && data.currentHour < 16 && (
            <div className="mt-2">
              <div className="text-3xl font-bold text-amber-400">
                {16 - data.currentHour}h
              </div>
              <p className="text-sm text-neutral-400">until Happy Hour 🎉</p>
            </div>
          )}
          <p className="text-xs text-neutral-500 mt-2">
            4pm - 7pm EST • The Golden Hour for Smoking
          </p>
        </div>

        {/* Personal Stats */}
        {data?.personalStats && data.personalStats.totalHappyHourSmokes > 0 && (
          <div className="bg-gradient-to-r from-amber-900/30 to-yellow-900/30 rounded-xl p-4 border border-amber-700/20">
            <h3 className="text-sm font-medium text-amber-300 mb-3 flex items-center gap-2">
              <FiStar /> Your Happy Hour Stats
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-2xl font-bold text-amber-200">{data.personalStats.totalHappyHourSmokes}</div>
                <div className="text-xs text-neutral-400">happy hours</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-200">top {data.personalStats.percentile}%</div>
                <div className="text-xs text-neutral-400">happy hour fan</div>
              </div>
              <div>
                <div className="text-lg font-bold text-amber-200 truncate">{data.personalStats.favoriteHappyHourBrand || '-'}</div>
                <div className="text-xs text-neutral-400">go-to brand</div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'today'
                ? 'bg-amber-600/30 text-amber-200 border border-amber-500/30'
                : 'bg-neutral-800/50 text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <FiClock className="inline mr-1" /> Today
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'leaderboard'
                ? 'bg-amber-600/30 text-amber-200 border border-amber-500/30'
                : 'bg-neutral-800/50 text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <FiAward className="inline mr-1" /> Leaders
          </button>
          <button
            onClick={() => setActiveTab('brands')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'brands'
                ? 'bg-amber-600/30 text-amber-200 border border-amber-500/30'
                : 'bg-neutral-800/50 text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <FiTrendingUp className="inline mr-1" /> Brands
          </button>
        </div>

        {/* Today's Happy Hour Smokers */}
        {activeTab === 'today' && (
          <div className="space-y-3">
            {data?.todaySmokers && data.todaySmokers.length > 0 ? (
              data.todaySmokers.map((smoker, idx) => (
                <Link
                  key={smoker.user_id}
                  href={`/profile/${smoker.username}`}
                  className="block bg-neutral-800/50 rounded-lg p-3 border border-neutral-700/30 hover:border-amber-500/30 transition-colors"
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
                        <div className="w-10 h-10 bg-amber-600/30 rounded-full flex items-center justify-center text-amber-300 font-bold">
                          {smoker.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-neutral-200">{smoker.username}</div>
                      <div className="text-xs text-neutral-500">
                        First puff at {formatTime(smoker.first_happy_hour_smoke)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-amber-300">{smoker.happy_hour_smokes}</div>
                      <div className="text-xs text-neutral-500">today</div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <span className="text-4xl mb-3 block">🍻</span>
                <p>No happy hour smokers yet today!</p>
                <p className="text-sm mt-1">Be the first to celebrate after work</p>
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
                  className="block bg-neutral-800/50 rounded-lg p-3 border border-neutral-700/30 hover:border-amber-500/30 transition-colors"
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
                      <div className="w-10 h-10 bg-amber-600/30 rounded-full flex items-center justify-center text-amber-300 font-bold">
                        {leader.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-neutral-200">{leader.username}</div>
                      {leader.favorite_brand && (
                        <div className="text-xs text-amber-400">Loves {leader.favorite_brand}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-amber-300">{leader.total_happy_hour_smokes}</div>
                      <div className="text-xs text-neutral-500">all-time</div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <span className="text-4xl mb-3 block">🏆</span>
                <p>No happy hour champions yet!</p>
                <p className="text-sm mt-1">Start logging during happy hour to appear here</p>
              </div>
            )}
          </div>
        )}

        {/* Popular Happy Hour Brands */}
        {activeTab === 'brands' && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-400 text-center mb-4">
              Top brands enjoyed during Happy Hour 🍻
            </p>
            {data?.popularBrands && data.popularBrands.length > 0 ? (
              data.popularBrands.map((brand, idx) => (
                <Link
                  key={brand.brand}
                  href={`/cigar/${encodeURIComponent(brand.brand)}`}
                  className="block bg-neutral-800/50 rounded-lg p-3 border border-neutral-700/30 hover:border-amber-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-center">
                      {idx < 3 ? (
                        <span className="text-xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                      ) : (
                        <span className="text-neutral-500 font-bold">#{idx + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-neutral-200">{brand.brand}</div>
                      <div className="text-xs text-neutral-500">{brand.count} happy hour check-ins</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-400">
                        <FiStar size={14} fill="currentColor" />
                        <span className="font-bold">{brand.avg_rating?.toFixed(1) || '-'}</span>
                      </div>
                      <div className="text-xs text-neutral-500">avg rating</div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <span className="text-4xl mb-3 block">🚬</span>
                <p>No happy hour brands tracked yet!</p>
                <p className="text-sm mt-1">Log smokes during happy hour to build the list</p>
              </div>
            )}
          </div>
        )}

        {/* Platform Stats */}
        <div className="bg-neutral-800/30 rounded-xl p-4 border border-neutral-700/20">
          <h3 className="text-sm font-medium text-amber-300 mb-3 flex items-center gap-2">
            <FiUsers /> Platform Happy Hour Stats
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xl font-bold text-amber-200">{data?.platformStats?.totalHappyHourSmokes || 0}</div>
              <div className="text-xs text-neutral-500">happy smokes</div>
            </div>
            <div>
              <div className="text-xl font-bold text-yellow-200">{data?.platformStats?.uniqueHappyHourSmokers || 0}</div>
              <div className="text-xs text-neutral-500">participants</div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-200">{data?.platformStats?.happyHourDays || 0}</div>
              <div className="text-xs text-neutral-500">days tracked</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        {data?.isHappyHour && (
          <Link
            href="/checkin"
            className="block w-full bg-gradient-to-r from-amber-600 to-yellow-600 text-white text-center py-3 rounded-xl font-medium hover:from-amber-500 hover:to-yellow-500 transition-all"
          >
            🍻 Log Your Happy Hour Smoke
          </Link>
        )}

        {/* Info Footer */}
        <div className="text-center text-xs text-neutral-500 py-4">
          <p>🍻 Happy Hour: 4pm - 7pm EST</p>
          <p className="mt-1">The golden hours for unwinding with a good smoke!</p>
        </div>
      </div>
    </div>
  );
}
