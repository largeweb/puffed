'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiArrowLeft, FiAward, FiTrendingUp, FiStar } from 'react-icons/fi';

interface Legend {
  id: string;
  username: string;
  avatar_url: string | null;
  value: number;
  label: string;
}

interface LegendCategory {
  title: string;
  icon: string;
  description: string;
  legends: Legend[];
}

interface LegendsData {
  categories: LegendCategory[];
  records: {
    longestStreak: number;
    mostCheckins: number;
    topBrand: string;
    totalBrands: number;
    totalFiveStars: number;
  };
}

export default function LegendsPage() {
  const router = useRouter();
  const [data, setData] = useState<LegendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/legends');
        if (res.ok) {
          const json = await res.json() as LegendsData;
          setData(json);
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getMedalEmoji = (idx: number) => {
    if (idx === 0) return '🥇';
    if (idx === 1) return '🥈';
    if (idx === 2) return '🥉';
    return `#${idx + 1}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900/40 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🏛️</div>
          <div className="text-amber-300">Loading the Hall of Fame...</div>
        </div>
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
            <span className="text-2xl">🏛️</span>
            <h1 className="text-xl font-bold text-amber-200">Smoke Legends</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-amber-600/30 to-yellow-600/30 rounded-xl p-5 text-center border border-amber-500/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/trophy-pattern.png')] opacity-5" />
          <div className="relative z-10">
            <div className="text-5xl mb-3">🏛️</div>
            <h2 className="text-xl font-bold text-amber-200 mb-2">Hall of Fame</h2>
            <p className="text-sm text-amber-300/80">
              Celebrating the greatest smokers in our community
            </p>
          </div>
        </div>

        {/* Platform Records */}
        {data?.records && (
          <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl p-4 border border-amber-700/20">
            <h3 className="text-sm font-medium text-amber-300 mb-3 flex items-center gap-2">
              <FiAward /> Platform Records
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">🔥</div>
                <div className="text-xl font-bold text-amber-200">{data.records.longestStreak}</div>
                <div className="text-xs text-neutral-400">longest streak</div>
              </div>
              <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">👑</div>
                <div className="text-xl font-bold text-amber-200">{data.records.mostCheckins}</div>
                <div className="text-xs text-neutral-400">most check-ins</div>
              </div>
              <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">🎯</div>
                <div className="text-xl font-bold text-amber-200">{data.records.totalFiveStars}</div>
                <div className="text-xs text-neutral-400">5-star reviews</div>
              </div>
              <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">🧭</div>
                <div className="text-xl font-bold text-amber-200">{data.records.totalBrands}</div>
                <div className="text-xs text-neutral-400">brands discovered</div>
              </div>
            </div>
            {data.records.topBrand && data.records.topBrand !== 'N/A' && (
              <div className="mt-3 bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-lg p-3 text-center">
                <div className="text-xs text-neutral-400 mb-1">Most Popular Brand</div>
                <div className="text-lg font-bold text-amber-200">🏆 {data.records.topBrand}</div>
              </div>
            )}
          </div>
        )}

        {/* Category Quick Nav */}
        {data?.categories && data.categories.length > 0 && (
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-2 pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === null
                    ? 'bg-amber-600/30 text-amber-200 border border-amber-500/30'
                    : 'bg-neutral-800/50 text-neutral-400 hover:text-neutral-300'
                }`}
              >
                All
              </button>
              {data.categories.map(cat => (
                <button
                  key={cat.title}
                  onClick={() => setSelectedCategory(cat.title)}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === cat.title
                      ? 'bg-amber-600/30 text-amber-200 border border-amber-500/30'
                      : 'bg-neutral-800/50 text-neutral-400 hover:text-neutral-300'
                  }`}
                >
                  {cat.icon} {cat.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Legend Categories */}
        {data?.categories && (
          <div className="space-y-6">
            {data.categories
              .filter(cat => selectedCategory === null || cat.title === selectedCategory)
              .map((category, catIdx) => (
              <div key={category.title} className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{category.icon}</div>
                  <div>
                    <h3 className="text-lg font-bold text-amber-200">{category.title}</h3>
                    <p className="text-xs text-neutral-400">{category.description}</p>
                  </div>
                </div>

                {/* Top Legend (Featured) */}
                {category.legends[0] && (
                  <Link
                    href={`/user/${category.legends[0].username}`}
                    className="block bg-gradient-to-r from-amber-600/20 to-yellow-600/20 rounded-xl p-4 border border-amber-500/30 hover:border-amber-400/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute -top-2 -left-2 text-2xl">🥇</div>
                        {category.legends[0].avatar_url ? (
                          <Image
                            src={category.legends[0].avatar_url}
                            alt={category.legends[0].username}
                            width={60}
                            height={60}
                            className="rounded-full object-cover border-2 border-amber-500/50"
                          />
                        ) : (
                          <div className="w-[60px] h-[60px] bg-amber-600/30 rounded-full flex items-center justify-center text-amber-300 font-bold text-2xl border-2 border-amber-500/50">
                            {category.legends[0].username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-amber-400 mb-1">Champion</div>
                        <div className="font-bold text-xl text-amber-200">{category.legends[0].username}</div>
                        <div className="text-sm text-amber-300/80">{category.legends[0].label}</div>
                      </div>
                      <div className="text-4xl text-amber-400 font-bold">
                        {category.legends[0].value}
                      </div>
                    </div>
                  </Link>
                )}

                {/* Runner-ups */}
                {category.legends.slice(1).length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {category.legends.slice(1).map((legend, idx) => (
                      <Link
                        key={legend.id}
                        href={`/user/${legend.username}`}
                        className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700/30 hover:border-amber-500/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getMedalEmoji(idx + 1)}</span>
                          {legend.avatar_url ? (
                            <Image
                              src={legend.avatar_url}
                              alt={legend.username}
                              width={32}
                              height={32}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-amber-600/30 rounded-full flex items-center justify-center text-amber-300 font-bold text-sm">
                              {legend.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-neutral-200 truncate text-sm">
                            {legend.username}
                          </span>
                        </div>
                        <div className="text-sm text-amber-400">{legend.label}</div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Divider between categories */}
                {catIdx < data.categories.filter(cat => selectedCategory === null || cat.title === selectedCategory).length - 1 && (
                  <div className="border-t border-neutral-700/30 my-4" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* No Data State */}
        {(!data?.categories || data.categories.length === 0) && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🏛️</div>
            <h3 className="text-xl font-bold text-amber-200 mb-2">Hall Awaits Its Heroes</h3>
            <p className="text-neutral-400 mb-6">
              Start logging smokes to become a legend!
            </p>
            <Link
              href="/checkin"
              className="inline-block bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-500 transition-colors"
            >
              Log Your First Smoke
            </Link>
          </div>
        )}

        {/* CTA */}
        <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 rounded-xl p-4 text-center border border-amber-700/20">
          <FiTrendingUp className="mx-auto text-amber-400 mb-2" size={24} />
          <p className="text-sm text-amber-200 mb-1">Want to be a legend?</p>
          <p className="text-xs text-neutral-400 mb-3">
            Keep logging, exploring brands, and engaging with the community!
          </p>
          <Link
            href="/checkin"
            className="inline-block bg-amber-600/80 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            🔥 Log a Smoke
          </Link>
        </div>

        {/* Footer Links */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/leaderboard"
            className="bg-neutral-800/50 rounded-xl p-4 text-center border border-neutral-700/30 hover:border-amber-500/30 transition-colors"
          >
            <FiAward className="mx-auto text-amber-400 mb-2" size={24} />
            <span className="text-sm text-neutral-300">Leaderboards</span>
          </Link>
          <Link
            href="/achievements"
            className="bg-neutral-800/50 rounded-xl p-4 text-center border border-neutral-700/30 hover:border-amber-500/30 transition-colors"
          >
            <FiStar className="mx-auto text-amber-400 mb-2" size={24} />
            <span className="text-sm text-neutral-300">Achievements</span>
          </Link>
        </div>

        {/* Info Footer */}
        <div className="text-center text-xs text-neutral-500 py-4">
          <p>🏛️ Smoke Legends - Hall of Fame</p>
          <p className="mt-1">Where the greatest smokers are immortalized</p>
        </div>
      </div>
    </div>
  );
}
