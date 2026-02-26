'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FiArrowLeft, FiTrendingUp, FiTrendingDown, FiMinus,
  FiStar, FiUsers, FiTarget, FiAlertCircle, FiCheck,
  FiCoffee, FiSun, FiMoon
} from 'react-icons/fi';
import { GiCigar } from 'react-icons/gi';

interface DigestData {
  greeting: string;
  timeEmoji: string;
  streak: {
    current: number;
    longest: number;
    atRisk: boolean;
  };
  today: {
    yourSmokes: number;
    communitySmokes: number;
    activeUsers: number;
  };
  weekComparison: {
    thisWeek: number;
    lastWeek: number;
    change: number;
    percentChange: number;
  };
  ratingTrend: {
    thisWeekAvg: number | null;
    lastWeekAvg: number | null;
    change: number;
  };
  morningSmokers: Array<{
    username: string;
    brand: string;
    timeAgo: string;
  }>;
  suggestion: {
    brand: string;
    reason: string;
  } | null;
  featured: {
    id: number;
    brand: string;
    product: string | null;
    rating: number;
    imageUrl: string;
    username: string;
    likes: number;
  } | null;
  weeklyGoal: {
    target: number;
    current: number;
    progress: number;
  };
  dayOfWeek: string;
  date: string;
}

export default function DailyDigestPage() {
  const router = useRouter();
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDigest();
  }, []);

  const fetchDigest = async () => {
    try {
      const res = await fetch('/api/daily-digest');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setDigest(data);
      }
    } catch (error) {
      console.error('Failed to fetch digest:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="animate-spin text-4xl">📋</div>
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 p-4">
        <p className="text-center text-gray-600 mt-8">Could not load your digest</p>
      </div>
    );
  }

  const getTrendIcon = (change: number) => {
    if (change > 0) return <FiTrendingUp className="text-green-500" />;
    if (change < 0) return <FiTrendingDown className="text-red-500" />;
    return <FiMinus className="text-gray-400" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-500 text-white px-4 py-6">
        <div className="max-w-md mx-auto">
          <Link href="/dashboard" className="inline-flex items-center text-white/80 hover:text-white mb-4">
            <FiArrowLeft className="mr-2" /> Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{digest.timeEmoji}</span>
            <div>
              <h1 className="text-2xl font-bold">{digest.greeting}</h1>
              <p className="text-white/80 text-sm">{digest.dayOfWeek}, {digest.date}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Streak Status */}
        <div className={`rounded-2xl p-4 ${digest.streak.atRisk ? 'bg-red-50 border-2 border-red-200' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔥</span>
              <div>
                <p className="font-semibold text-gray-800">
                  {digest.streak.current > 0 ? `${digest.streak.current} Day Streak` : 'No Active Streak'}
                </p>
                <p className="text-sm text-gray-500">Best: {digest.streak.longest} days</p>
              </div>
            </div>
            {digest.streak.atRisk && (
              <div className="flex items-center gap-1 text-red-600 text-sm font-medium animate-pulse">
                <FiAlertCircle /> At Risk!
              </div>
            )}
            {digest.today.yourSmokes > 0 && (
              <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                <FiCheck /> Safe
              </div>
            )}
          </div>
          {digest.streak.atRisk && (
            <Link 
              href="/checkin/new"
              className="mt-3 block w-full text-center bg-red-500 text-white py-2 rounded-lg font-medium hover:bg-red-600 transition"
            >
              Log a smoke to save your streak!
            </Link>
          )}
        </div>

        {/* Weekly Progress */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FiTarget className="text-amber-500" />
            <h2 className="font-semibold text-gray-800">Weekly Goal</h2>
          </div>
          <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${digest.weeklyGoal.progress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            <span className="font-semibold">{digest.weeklyGoal.current}</span> of {digest.weeklyGoal.target} smokes this week
            {digest.weeklyGoal.progress >= 100 && <span className="ml-2 text-green-600">🎉 Goal reached!</span>}
          </p>
        </div>

        {/* Week Comparison */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            📊 This Week vs Last Week
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-amber-50 rounded-xl">
              <p className="text-2xl font-bold text-amber-600">{digest.weekComparison.thisWeek}</p>
              <p className="text-xs text-gray-500">This Week</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-gray-600">{digest.weekComparison.lastWeek}</p>
              <p className="text-xs text-gray-500">Last Week</p>
            </div>
          </div>
          <div className={`mt-3 flex items-center justify-center gap-2 ${getTrendColor(digest.weekComparison.change)}`}>
            {getTrendIcon(digest.weekComparison.change)}
            <span className="font-medium">
              {digest.weekComparison.change > 0 ? '+' : ''}{digest.weekComparison.change} smokes
              ({digest.weekComparison.percentChange > 0 ? '+' : ''}{digest.weekComparison.percentChange}%)
            </span>
          </div>
        </div>

        {/* Rating Trend */}
        {digest.ratingTrend.thisWeekAvg !== null && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FiStar className="text-yellow-500" /> Rating Trend
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-amber-600">{digest.ratingTrend.thisWeekAvg}</p>
                <p className="text-xs text-gray-500">Avg this week</p>
              </div>
              {digest.ratingTrend.lastWeekAvg !== null && (
                <div className={`flex items-center gap-1 ${getTrendColor(digest.ratingTrend.change)}`}>
                  {getTrendIcon(digest.ratingTrend.change)}
                  <span>{digest.ratingTrend.change > 0 ? '+' : ''}{digest.ratingTrend.change} from last week</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Smokers */}
        {digest.morningSmokers.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FiCoffee className="text-orange-500" /> Smoking Now
            </h2>
            <div className="space-y-2">
              {digest.morningSmokers.map((smoker, i) => (
                <Link 
                  key={i}
                  href={`/user/${smoker.username}`}
                  className="flex items-center justify-between p-2 hover:bg-amber-50 rounded-lg transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">🟢</span>
                    <span className="font-medium">{smoker.username}</span>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-gray-700">{smoker.brand}</p>
                    <p className="text-gray-400 text-xs">{smoker.timeAgo}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Today's Suggestion */}
        {digest.suggestion && (
          <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-4">
            <h2 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              💡 Today&apos;s Suggestion
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-amber-700">{digest.suggestion.brand}</p>
                <p className="text-sm text-gray-600">{digest.suggestion.reason}</p>
              </div>
              <Link 
                href={`/checkin/new?brand=${encodeURIComponent(digest.suggestion.brand)}`}
                className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition"
              >
                Log it
              </Link>
            </div>
          </div>
        )}

        {/* Featured Check-in */}
        {digest.featured && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <h2 className="font-semibold flex items-center gap-2">
                ⭐ Featured Today
              </h2>
            </div>
            <Link href={`/checkin/${digest.featured.id}`} className="block">
              {digest.featured.imageUrl && (
                <img 
                  src={digest.featured.imageUrl} 
                  alt={digest.featured.brand}
                  className="w-full h-40 object-cover"
                />
              )}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-800">{digest.featured.brand}</p>
                  <div className="flex items-center gap-1 text-yellow-500">
                    {'★'.repeat(digest.featured.rating)}
                    <span className="text-gray-300">{'★'.repeat(5 - digest.featured.rating)}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">by @{digest.featured.username}</p>
                <p className="text-xs text-gray-400 mt-1">{digest.featured.likes} likes</p>
              </div>
            </Link>
          </div>
        )}

        {/* Community Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <FiUsers className="text-blue-500" /> Community Today
          </h2>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded-xl">
              <p className="text-2xl font-bold text-blue-600">{digest.today.communitySmokes}</p>
              <p className="text-xs text-gray-500">Check-ins</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <p className="text-2xl font-bold text-green-600">{digest.today.activeUsers}</p>
              <p className="text-xs text-gray-500">Active Smokers</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link 
            href="/checkin/new"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-xl font-semibold hover:opacity-90 transition"
          >
            <GiCigar /> Log a Smoke
          </Link>
          <Link 
            href="/discover"
            className="flex items-center justify-center gap-2 bg-white border-2 border-amber-200 text-amber-700 py-4 rounded-xl font-semibold hover:bg-amber-50 transition"
          >
            🔍 Discover
          </Link>
        </div>
      </div>
    </div>
  );
}
