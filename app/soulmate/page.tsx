'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiArrowLeft, FiHeart, FiUserPlus, FiUserCheck, FiStar, FiTrendingUp, FiUsers } from 'react-icons/fi';

interface SoulmateMatch {
  id: string;
  username: string;
  avatar_url: string | null;
  checkin_count: number;
  compatibility: number;
  sharedBrands: string[];
  ratingDiff: number;
  isFollowing: boolean;
}

interface SoulmateData {
  soulmates: SoulmateMatch[];
  yourTopBrands: string[];
  totalUsersCompared: number;
  personalStats: {
    uniqueBrands: number;
    avgRating: number;
    totalCheckins: number;
  } | null;
  message?: string;
}

export default function SoulmatePage() {
  const router = useRouter();
  const [data, setData] = useState<SoulmateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/soulmate');
        if (res.ok) {
          const json = await res.json() as SoulmateData;
          setData(json);
          // Initialize following state
          const following = new Set<string>();
          json.soulmates?.forEach(s => {
            if (s.isFollowing) following.add(s.id);
          });
          setFollowingIds(following);
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleFollow = async (userId: string) => {
    setFollowLoading(userId);
    try {
      const isFollowing = followingIds.has(userId);
      const res = await fetch(`/api/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        setFollowingIds(prev => {
          const next = new Set(prev);
          if (isFollowing) {
            next.delete(userId);
          } else {
            next.add(userId);
          }
          return next;
        });
      }
    } finally {
      setFollowLoading(null);
    }
  };

  const getCompatibilityColor = (score: number) => {
    if (score >= 90) return 'text-pink-400';
    if (score >= 80) return 'text-rose-400';
    if (score >= 70) return 'text-red-400';
    return 'text-orange-400';
  };

  const getCompatibilityEmoji = (score: number) => {
    if (score >= 95) return '💕';
    if (score >= 90) return '❤️';
    if (score >= 80) return '💗';
    if (score >= 70) return '💖';
    return '💛';
  };

  const getCompatibilityLabel = (score: number) => {
    if (score >= 95) return 'Perfect Match!';
    if (score >= 90) return 'Soulmates';
    if (score >= 80) return 'Great Match';
    if (score >= 70) return 'Good Match';
    return 'Potential Match';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-900/40 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">💘</div>
          <div className="text-pink-300">Finding your cigar soulmates...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-900/40 via-neutral-900 to-neutral-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-neutral-900/80 backdrop-blur-md border-b border-pink-700/30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-pink-400 hover:text-pink-300">
            <FiArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💘</span>
            <h1 className="text-xl font-bold text-pink-200">Cigar Soulmates</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-pink-600/30 to-rose-600/30 rounded-xl p-5 text-center border border-pink-500/30">
          <div className="text-5xl mb-3">💘</div>
          <h2 className="text-xl font-bold text-pink-200 mb-2">Find Your Taste Twin</h2>
          <p className="text-sm text-pink-300/80">
            Discover smokers who rate cigars just like you do
          </p>
        </div>

        {/* Your Profile Summary */}
        {data?.personalStats && (
          <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700/30">
            <h3 className="text-sm font-medium text-pink-300 mb-3 flex items-center gap-2">
              <FiStar /> Your Taste Profile
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center mb-4">
              <div>
                <div className="text-2xl font-bold text-pink-200">{data.personalStats.uniqueBrands}</div>
                <div className="text-xs text-neutral-400">brands tried</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-rose-200">{data.personalStats.avgRating}⭐</div>
                <div className="text-xs text-neutral-400">avg rating</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-pink-200">{data.personalStats.totalCheckins}</div>
                <div className="text-xs text-neutral-400">check-ins</div>
              </div>
            </div>
            {data.yourTopBrands.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.yourTopBrands.map(brand => (
                  <span key={brand} className="bg-pink-600/20 text-pink-300 text-xs px-2 py-1 rounded-full">
                    {brand}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message if no data */}
        {data?.message && (
          <div className="bg-neutral-800/50 rounded-xl p-6 text-center border border-neutral-700/30">
            <span className="text-4xl mb-3 block">🔍</span>
            <p className="text-neutral-300">{data.message}</p>
            <Link
              href="/checkin"
              className="inline-block mt-4 bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-500 transition-colors"
            >
              Log Your First Smoke
            </Link>
          </div>
        )}

        {/* Soulmate Matches */}
        {data?.soulmates && data.soulmates.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-pink-300 flex items-center gap-2">
                <FiHeart /> Your Soulmates ({data.soulmates.length})
              </h3>
              <span className="text-xs text-neutral-500">
                {data.totalUsersCompared} users compared
              </span>
            </div>

            {data.soulmates.map((soulmate, idx) => (
              <div
                key={soulmate.id}
                className={`bg-neutral-800/50 rounded-xl p-4 border transition-colors ${
                  idx === 0 
                    ? 'border-pink-500/50 bg-gradient-to-r from-pink-900/20 to-rose-900/20' 
                    : 'border-neutral-700/30 hover:border-pink-500/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <Link href={`/user/${soulmate.username}`} className="relative flex-shrink-0">
                    {idx === 0 && (
                      <span className="absolute -top-2 -right-2 text-xl z-10">💕</span>
                    )}
                    {soulmate.avatar_url ? (
                      <Image
                        src={soulmate.avatar_url}
                        alt={soulmate.username}
                        width={50}
                        height={50}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-[50px] h-[50px] bg-pink-600/30 rounded-full flex items-center justify-center text-pink-300 font-bold text-xl">
                        {soulmate.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/user/${soulmate.username}`} className="font-bold text-neutral-200 hover:text-pink-300 transition-colors">
                        {soulmate.username}
                      </Link>
                      {idx === 0 && (
                        <span className="bg-pink-600/30 text-pink-300 text-xs px-2 py-0.5 rounded-full">
                          #1 Match
                        </span>
                      )}
                    </div>

                    {/* Compatibility Score */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getCompatibilityEmoji(soulmate.compatibility)}</span>
                      <div>
                        <span className={`text-2xl font-bold ${getCompatibilityColor(soulmate.compatibility)}`}>
                          {soulmate.compatibility}%
                        </span>
                        <span className="text-xs text-neutral-400 ml-2">
                          {getCompatibilityLabel(soulmate.compatibility)}
                        </span>
                      </div>
                    </div>

                    {/* Shared Brands */}
                    {soulmate.sharedBrands.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs text-neutral-500 mr-2">Both enjoy:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {soulmate.sharedBrands.map(brand => (
                            <span key={brand} className="bg-neutral-700/50 text-neutral-300 text-xs px-2 py-0.5 rounded">
                              {brand}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span>{soulmate.checkin_count} check-ins</span>
                      <span>Avg diff: ±{soulmate.ratingDiff}⭐</span>
                    </div>
                  </div>

                  {/* Follow Button */}
                  <button
                    onClick={() => handleFollow(soulmate.id)}
                    disabled={followLoading === soulmate.id}
                    className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                      followingIds.has(soulmate.id)
                        ? 'bg-pink-600/30 text-pink-300'
                        : 'bg-neutral-700/50 text-neutral-300 hover:bg-pink-600/30 hover:text-pink-300'
                    }`}
                  >
                    {followLoading === soulmate.id ? (
                      <div className="w-5 h-5 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
                    ) : followingIds.has(soulmate.id) ? (
                      <FiUserCheck size={20} />
                    ) : (
                      <FiUserPlus size={20} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Soulmates Found */}
        {data?.soulmates && data.soulmates.length === 0 && !data.message && (
          <div className="bg-neutral-800/50 rounded-xl p-6 text-center border border-neutral-700/30">
            <span className="text-4xl mb-3 block">🔍</span>
            <p className="text-neutral-300 mb-2">No strong matches yet!</p>
            <p className="text-sm text-neutral-500">
              As more users join and log smokes, we&apos;ll find your cigar soulmates.
            </p>
            <Link
              href="/people"
              className="inline-block mt-4 bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-500 transition-colors"
            >
              Discover People
            </Link>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-neutral-800/30 rounded-xl p-4 border border-neutral-700/20">
          <h3 className="text-sm font-medium text-pink-300 mb-3 flex items-center gap-2">
            <FiTrendingUp /> How Soulmate Matching Works
          </h3>
          <ul className="space-y-2 text-sm text-neutral-400">
            <li className="flex items-start gap-2">
              <span className="text-pink-400">1.</span>
              <span>We compare your ratings with other smokers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-400">2.</span>
              <span>Higher compatibility = similar ratings on same brands</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-400">3.</span>
              <span>Follow your soulmates to see what they&apos;re smoking!</span>
            </li>
          </ul>
        </div>

        {/* Discover More */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/people"
            className="bg-neutral-800/50 rounded-xl p-4 text-center border border-neutral-700/30 hover:border-pink-500/30 transition-colors"
          >
            <FiUsers className="mx-auto text-pink-400 mb-2" size={24} />
            <span className="text-sm text-neutral-300">Discover People</span>
          </Link>
          <Link
            href="/twins"
            className="bg-neutral-800/50 rounded-xl p-4 text-center border border-neutral-700/30 hover:border-pink-500/30 transition-colors"
          >
            <span className="text-2xl mb-2 block">👯</span>
            <span className="text-sm text-neutral-300">Taste Twins</span>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-neutral-500 py-4">
          <p>💘 Find smokers who share your taste</p>
          <p className="mt-1">The more you rate, the better your matches!</p>
        </div>
      </div>
    </div>
  );
}
