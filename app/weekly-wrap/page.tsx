'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface WeeklyStats {
  thisWeek: {
    checkins: number;
    uniqueBrands: number;
    avgRating: number;
    likesReceived: number;
    likesGiven: number;
    commentsReceived: number;
    commentsGiven: number;
    followsGained: number;
    photos: number;
    topBrand: string | null;
    topFlavor: string | null;
    bestDay: string | null;
    streakMaintained: boolean;
  };
  lastWeek: {
    checkins: number;
    likesReceived: number;
  };
  highlights: Array<{
    id: string;
    brand: string;
    product: string | null;
    rating: number;
    likes: number;
    photo_url: string | null;
  }>;
  rank: {
    position: number;
    total: number;
    percentile: number;
  };
  funFacts: string[];
}

export default function WeeklyWrapPage() {
  const router = useRouter();
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetchWeeklyStats();
  }, []);

  const fetchWeeklyStats = async () => {
    try {
      const res = await fetch('/api/weekly-wrap');
      if (res.status === 401) {
        setError('signin');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to fetch');
      }
      const data = await res.json() as WeeklyStats;
      setStats(data);
    } catch (err) {
      console.error('Error fetching weekly stats:', err);
      setError('error');
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getChangeEmoji = (current: number, previous: number) => {
    if (current > previous) return '📈';
    if (current < previous) return '📉';
    return '➡️';
  };

  const getPercentileMessage = (percentile: number) => {
    if (percentile >= 90) return "You're in the top 10%! 🏆";
    if (percentile >= 75) return "Top quarter smoker! 🥇";
    if (percentile >= 50) return "Above average! 👍";
    return "Keep puffing! 💨";
  };

  // Get current week date range for display
  const getWeekRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - dayOfWeek);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${formatDate(startDate)} - ${formatDate(endDate)}, ${now.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900 flex items-center justify-center">
        <div className="animate-pulse text-white text-xl">Loading your week...</div>
      </div>
    );
  }

  if (error === 'signin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900 flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-bold text-white mb-4">📊 Weekly Wrap</h1>
        <p className="text-purple-200 mb-6">Sign in to see your week in review!</p>
        <Link href="/login" className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-semibold py-3 px-6 rounded-lg">
          Sign In
        </Link>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900 flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-bold text-white mb-4">📊 Weekly Wrap</h1>
        <p className="text-purple-200">No data available yet. Start smoking to see your stats!</p>
        <Link href="/log" className="mt-6 bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-semibold py-3 px-6 rounded-lg">
          Log a Smoke
        </Link>
      </div>
    );
  }

  const slides = [
    // Slide 1: Overview
    <div key="overview" className="text-center">
      <h2 className="text-4xl font-bold text-white mb-2">Your Week</h2>
      <p className="text-purple-200 mb-8">{getWeekRange()}</p>
      
      <div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-400 mb-4">
        {stats.thisWeek.checkins}
      </div>
      <p className="text-2xl text-purple-200 mb-6">smokes this week</p>
      
      <div className="flex justify-center gap-4 text-lg">
        <span className="text-purple-300">
          {getChangeEmoji(stats.thisWeek.checkins, stats.lastWeek.checkins)}
          {stats.thisWeek.checkins > stats.lastWeek.checkins ? ' +' : ' '}
          {stats.thisWeek.checkins - stats.lastWeek.checkins} from last week
        </span>
      </div>
    </div>,

    // Slide 2: Engagement
    <div key="engagement" className="text-center">
      <h2 className="text-3xl font-bold text-white mb-8">Social Impact 💜</h2>
      
      <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
        <div className="bg-white/10 rounded-xl p-4">
          <div className="text-4xl font-bold text-fuchsia-400">{stats.thisWeek.likesReceived}</div>
          <div className="text-purple-200">likes received</div>
        </div>
        <div className="bg-white/10 rounded-xl p-4">
          <div className="text-4xl font-bold text-purple-400">{stats.thisWeek.likesGiven}</div>
          <div className="text-purple-200">likes given</div>
        </div>
        <div className="bg-white/10 rounded-xl p-4">
          <div className="text-4xl font-bold text-pink-400">{stats.thisWeek.commentsReceived}</div>
          <div className="text-purple-200">comments</div>
        </div>
        <div className="bg-white/10 rounded-xl p-4">
          <div className="text-4xl font-bold text-violet-400">{stats.thisWeek.followsGained}</div>
          <div className="text-purple-200">new followers</div>
        </div>
      </div>
      
      <p className="text-purple-300 mt-6 text-lg">
        {getChangeEmoji(stats.thisWeek.likesReceived, stats.lastWeek.likesReceived)}
        {' '}
        {stats.thisWeek.likesReceived > stats.lastWeek.likesReceived 
          ? `${stats.thisWeek.likesReceived - stats.lastWeek.likesReceived} more likes than last week!`
          : 'Keep engaging to grow your reach!'}
      </p>
    </div>,

    // Slide 3: Favorites
    <div key="favorites" className="text-center">
      <h2 className="text-3xl font-bold text-white mb-8">Your Favorites 🌟</h2>
      
      <div className="space-y-6 max-w-md mx-auto">
        {stats.thisWeek.topBrand && (
          <div className="bg-white/10 rounded-xl p-6">
            <div className="text-purple-300 text-sm mb-1">TOP BRAND</div>
            <div className="text-2xl font-bold text-white">{stats.thisWeek.topBrand}</div>
          </div>
        )}
        
        {stats.thisWeek.topFlavor && (
          <div className="bg-white/10 rounded-xl p-6">
            <div className="text-purple-300 text-sm mb-1">FAVORITE FLAVOR</div>
            <div className="text-2xl font-bold text-fuchsia-400">{stats.thisWeek.topFlavor}</div>
          </div>
        )}
        
        {stats.thisWeek.bestDay && (
          <div className="bg-white/10 rounded-xl p-6">
            <div className="text-purple-300 text-sm mb-1">BEST DAY</div>
            <div className="text-2xl font-bold text-pink-400">{getDayName(stats.thisWeek.bestDay)}</div>
          </div>
        )}
        
        <div className="flex justify-center gap-4">
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-purple-400">{stats.thisWeek.uniqueBrands}</div>
            <div className="text-purple-200 text-sm">brands tried</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-fuchsia-400">{stats.thisWeek.avgRating.toFixed(1)}</div>
            <div className="text-purple-200 text-sm">avg rating</div>
          </div>
        </div>
      </div>
    </div>,

    // Slide 4: Ranking
    <div key="ranking" className="text-center">
      <h2 className="text-3xl font-bold text-white mb-8">Your Rank 🏆</h2>
      
      <div className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-2">
        #{stats.rank.position}
      </div>
      <p className="text-xl text-purple-200 mb-6">of {stats.rank.total} smokers this week</p>
      
      <div className="bg-white/10 rounded-xl p-6 max-w-sm mx-auto">
        <div className="text-5xl font-bold text-fuchsia-400 mb-2">
          Top {Math.max(1, 100 - stats.rank.percentile)}%
        </div>
        <p className="text-purple-300">{getPercentileMessage(stats.rank.percentile)}</p>
      </div>
      
      {stats.thisWeek.streakMaintained && (
        <div className="mt-6 text-green-400 text-lg">
          🔥 Streak maintained all week!
        </div>
      )}
    </div>,

    // Slide 5: Highlights (only if there are any)
    ...(stats.highlights.length > 0 ? [
      <div key="highlights" className="text-center">
        <h2 className="text-3xl font-bold text-white mb-6">Top Moments 📸</h2>
        
        <div className="space-y-4 max-w-md mx-auto">
          {stats.highlights.slice(0, 3).map((h, i) => (
            <Link key={h.id} href={`/smoke/${h.id}`} className="block bg-white/10 rounded-xl p-4 hover:bg-white/20 transition">
              <div className="flex items-center gap-4">
                <div className="text-2xl">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                </div>
                {h.photo_url && (
                  <img src={h.photo_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                )}
                <div className="text-left flex-1">
                  <div className="font-semibold text-white">{h.brand}</div>
                  {h.product && <div className="text-purple-300 text-sm">{h.product}</div>}
                  <div className="text-fuchsia-400">{'⭐'.repeat(h.rating)} · ❤️ {h.likes}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    ] : []),

    // Slide 6: Fun Facts (only if there are any)
    ...(stats.funFacts.length > 0 ? [
      <div key="funfacts" className="text-center">
        <h2 className="text-3xl font-bold text-white mb-8">Fun Facts 🎉</h2>
        
        <div className="space-y-4 max-w-md mx-auto">
          {stats.funFacts.map((fact, i) => (
            <div key={i} className="bg-white/10 rounded-xl p-4 text-lg text-purple-200">
              {fact}
            </div>
          ))}
        </div>
      </div>
    ] : []),

    // Final Slide
    <div key="final" className="text-center">
      <h2 className="text-4xl font-bold text-white mb-6">That&apos;s a Wrap! 🎬</h2>
      
      <div className="text-6xl mb-6">📊</div>
      
      <p className="text-xl text-purple-200 mb-8">
        See you next Sunday for your next Weekly Wrap!
      </p>
      
      <div className="flex flex-col gap-4 max-w-xs mx-auto">
        <Link href="/log" className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-semibold py-3 px-6 rounded-lg transition">
          Start Next Week Strong 💨
        </Link>
        <Link href="/dashboard" className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-lg transition">
          Back to Dashboard
        </Link>
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute text-4xl opacity-20 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 10}s`,
            }}
          >
            {['📊', '🎉', '💜', '✨', '🔥', '⭐'][Math.floor(Math.random() * 6)]}
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 flex justify-between items-center">
        <Link href="/dashboard" className="text-purple-300 hover:text-white transition">
          ← Dashboard
        </Link>
        <h1 className="text-xl font-bold text-white">📊 Weekly Wrap</h1>
        <div className="w-20"></div>
      </header>

      {/* Slide content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] p-6">
        <div className="w-full max-w-lg">
          {slides[currentSlide]}
        </div>
      </main>

      {/* Navigation dots */}
      <div className="relative z-10 flex justify-center gap-2 pb-4">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`w-3 h-3 rounded-full transition ${
              i === currentSlide ? 'bg-fuchsia-400' : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* Navigation arrows */}
      <div className="relative z-10 flex justify-between px-4 pb-8">
        <button
          onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          className={`text-3xl ${currentSlide === 0 ? 'opacity-30' : 'opacity-100 hover:scale-110'} transition`}
        >
          ◀️
        </button>
        <button
          onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
          disabled={currentSlide === slides.length - 1}
          className={`text-3xl ${currentSlide === slides.length - 1 ? 'opacity-30' : 'opacity-100 hover:scale-110'} transition`}
        >
          ▶️
        </button>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
        .animate-float {
          animation: float ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
