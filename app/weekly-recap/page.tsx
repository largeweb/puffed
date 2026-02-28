'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiArrowLeft, FiShare2, FiStar, FiHeart, FiMessageCircle, FiUsers, FiClock, FiTrendingUp, FiTag } from 'react-icons/fi';

interface WeeklyRecap {
  weekStats: {
    checkins: number;
    uniqueBrands: number;
    avgRating: number | null;
    totalSmokeTime: number;
    topBrand: string | null;
    topBrandCount: number;
    newBrands: string[];
  };
  engagement: {
    likesReceived: number;
    reactionsReceived: number;
    commentsReceived: number;
    newFollowers: number;
  };
  topCheckin: {
    id: string;
    brand: string;
    rating: number | null;
    imageUrl: string | null;
    likes: number;
    reactions: number;
    comments: number;
  } | null;
  highlights: string[];
  shareText: string;
  isSunday: boolean;
}

export default function WeeklyRecapPage() {
  const router = useRouter();
  const [recap, setRecap] = useState<WeeklyRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/weekly-recap', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json() as Promise<WeeklyRecap & { error?: string }>;
      })
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setRecap(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Please log in to see your recap');
        setLoading(false);
      });
  }, [router]);

  const handleShare = async () => {
    if (!recap) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Week on Puffed',
          text: recap.shareText,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(recap.shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !recap) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
        <div className="max-w-lg mx-auto pt-8">
          <Link href="/dashboard" className="text-white/70 hover:text-white flex items-center gap-2 mb-6">
            <FiArrowLeft /> Back to Dashboard
          </Link>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center">
            <p className="text-white/70">{error || 'Could not load your weekly recap'}</p>
            <Link href="/login" className="text-pink-400 hover:text-pink-300 mt-4 inline-block">
              Log in to see your recap →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { weekStats, engagement, topCheckin, highlights } = recap;
  const totalEngagement = engagement.likesReceived + engagement.reactionsReceived + engagement.commentsReceived;

  // Get current week date range
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  const dateRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4 pb-20">
      <div className="max-w-lg mx-auto pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard" className="text-white/70 hover:text-white flex items-center gap-2">
            <FiArrowLeft /> Back
          </Link>
          <button
            onClick={handleShare}
            className="text-white/70 hover:text-white flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg transition"
          >
            <FiShare2 /> {copied ? 'Copied!' : 'Share'}
          </button>
        </div>

        {/* Title Card */}
        <div className="bg-gradient-to-r from-pink-500/30 to-purple-500/30 backdrop-blur rounded-2xl p-6 mb-6 text-center border border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/confetti.svg')] opacity-10"></div>
          <h1 className="text-3xl font-bold text-white mb-2">📊 Weekly Recap</h1>
          <p className="text-white/70">{dateRange}</p>
          <p className="text-white/50 text-sm mt-2">Your smoking week in review</p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 text-center border border-white/10">
            <div className="text-4xl font-bold text-white mb-1">{weekStats.checkins}</div>
            <div className="text-white/60 text-sm">Smokes Logged</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 text-center border border-white/10">
            <div className="text-4xl font-bold text-yellow-400 flex items-center justify-center gap-1 mb-1">
              <FiStar className="w-6 h-6" />
              {weekStats.avgRating?.toFixed(1) || '-'}
            </div>
            <div className="text-white/60 text-sm">Avg Rating</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center border border-white/10">
            <div className="text-2xl font-bold text-white">{weekStats.uniqueBrands}</div>
            <div className="text-white/60 text-xs">Brands</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center border border-white/10">
            <div className="text-2xl font-bold text-green-400">{weekStats.newBrands.length}</div>
            <div className="text-white/60 text-xs">New Tried</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center border border-white/10">
            <div className="text-2xl font-bold text-blue-400 flex items-center justify-center gap-1">
              <FiClock className="w-4 h-4" />
              {weekStats.totalSmokeTime || 0}
            </div>
            <div className="text-white/60 text-xs">Minutes</div>
          </div>
        </div>

        {/* Top Brand */}
        {weekStats.topBrand && (
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur rounded-2xl p-5 mb-4 border border-amber-500/30">
            <div className="flex items-center gap-3">
              <div className="text-3xl">👑</div>
              <div>
                <div className="text-white/70 text-sm">Most Smoked</div>
                <div className="text-white font-semibold text-lg">{weekStats.topBrand}</div>
                <div className="text-white/50 text-sm">{weekStats.topBrandCount} times this week</div>
              </div>
            </div>
          </div>
        )}

        {/* New Brands */}
        {weekStats.newBrands.length > 0 && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-5 mb-4 border border-white/10">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <FiTag className="text-green-400" /> New Brands Tried
            </h3>
            <div className="flex flex-wrap gap-2">
              {weekStats.newBrands.map((brand, idx) => (
                <span key={idx} className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm border border-green-500/30">
                  ✨ {brand}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Social Stats */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-5 mb-4 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">💕</span> Social Activity
          </h3>
          
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-pink-500/20 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-pink-400 flex items-center justify-center gap-1">
                <FiHeart className="w-4 h-4" />
                {engagement.likesReceived}
              </div>
              <div className="text-white/60 text-xs">Likes</div>
            </div>
            <div className="bg-orange-500/20 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-orange-400">
                {engagement.reactionsReceived}
              </div>
              <div className="text-white/60 text-xs">Reactions</div>
            </div>
            <div className="bg-blue-500/20 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-blue-400 flex items-center justify-center gap-1">
                <FiMessageCircle className="w-4 h-4" />
                {engagement.commentsReceived}
              </div>
              <div className="text-white/60 text-xs">Comments</div>
            </div>
            <div className="bg-purple-500/20 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-purple-400 flex items-center justify-center gap-1">
                <FiUsers className="w-4 h-4" />
                {engagement.newFollowers}
              </div>
              <div className="text-white/60 text-xs">Followers</div>
            </div>
          </div>

          {totalEngagement > 0 && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 px-4 py-2 rounded-full">
                <FiTrendingUp className="text-pink-400" />
                <span className="text-white/80">{totalEngagement} total interactions</span>
              </div>
            </div>
          )}
        </div>

        {/* Top Check-in */}
        {topCheckin && (topCheckin.likes > 0 || topCheckin.reactions > 0 || topCheckin.comments > 0) && (
          <Link href={`/checkin/${topCheckin.id}`} className="block">
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur rounded-2xl p-5 mb-4 border border-yellow-500/30 hover:border-yellow-500/50 transition">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                🏆 Top Check-in This Week
              </h3>
              <div className="flex gap-4">
                {topCheckin.imageUrl && (
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                    <Image 
                      src={topCheckin.imageUrl} 
                      alt={topCheckin.brand}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-white font-medium">{topCheckin.brand}</div>
                  {topCheckin.rating && (
                    <div className="flex items-center gap-1 text-yellow-400 text-sm mt-1">
                      <FiStar className="w-3 h-3" />
                      {topCheckin.rating}/5
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="text-pink-400">❤️ {topCheckin.likes}</span>
                    <span className="text-orange-400">🔥 {topCheckin.reactions}</span>
                    <span className="text-blue-400">💬 {topCheckin.comments}</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Highlights */}
        {highlights.length > 0 && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-5 mb-4 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-3">✨ Highlights</h3>
            <ul className="space-y-2">
              {highlights.map((highlight, idx) => (
                <li key={idx} className="text-white/80 text-sm flex items-start gap-2">
                  <span className="text-lg leading-none">{highlight.split(' ')[0]}</span>
                  <span>{highlight.split(' ').slice(1).join(' ')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty State */}
        {weekStats.checkins === 0 && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-4 text-center border border-white/10">
            <div className="text-4xl mb-3">🚬</div>
            <p className="text-white/70 mb-4">No smokes logged this week yet!</p>
            <Link 
              href="/check-in" 
              className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold py-2 px-6 rounded-full hover:opacity-90 transition"
            >
              Log Your First Smoke
            </Link>
          </div>
        )}

        {/* CTA */}
        {weekStats.checkins > 0 && (
          <div className="text-center mt-6">
            <Link 
              href="/check-in" 
              className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold py-3 px-8 rounded-full hover:opacity-90 transition"
            >
              Keep the Streak Going 🔥
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-white/40 text-sm mt-8">
          📊 Your weekly recap • Updates every Sunday
        </div>
      </div>
    </div>
  );
}
