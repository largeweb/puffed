'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FiRefreshCw, 
  FiStar, 
  FiArrowLeft,
  FiHeart,
  FiUser,
  FiExternalLink
} from 'react-icons/fi';

interface Recommendation {
  id: number;
  brand: string;
  product: string | null;
  rating: number;
  review: string | null;
  image_url: string | null;
  created_at: number;
  username: string;
  avatar_url: string | null;
  like_count: number;
}

interface RouletteResult {
  recommendation: Recommendation | null;
  source: string;
  message: string;
}

export default function RoulettePage() {
  const [result, setResult] = useState<RouletteResult | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    // Get current user
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          setUserId(data.user.id);
        }
      })
      .catch(() => {});
  }, []);
  
  const spin = async () => {
    setSpinning(true);
    setResult(null);
    
    // Dramatic pause for the spin effect
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const params = new URLSearchParams();
      params.set('minRating', '4');
      if (userId) params.set('userId', userId);
      
      const res = await fetch(`/api/rating-roulette?${params}`);
      const data = await res.json();
      setResult(data);
      setSpinCount(prev => prev + 1);
    } catch {
      setResult({
        recommendation: null,
        source: 'error',
        message: 'Something went wrong. Try again!'
      });
    } finally {
      setSpinning(false);
    }
  };
  
  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-gray-900 to-amber-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-md bg-black/40 border-b border-purple-500/20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="text-purple-400 hover:text-purple-300">
            <FiArrowLeft size={24} />
          </Link>
          <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-amber-400 bg-clip-text text-transparent">
            🎰 Rating Roulette
          </h1>
          <div className="w-6" />
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce">🎰</div>
          <h2 className="text-2xl font-bold mb-2">Discover Your Next Smoke</h2>
          <p className="text-gray-400">
            Spin the wheel and get a random highly-rated cigar from the community!
          </p>
          {spinCount > 0 && (
            <p className="text-sm text-purple-400 mt-2">
              Spins today: {spinCount}
            </p>
          )}
        </div>
        
        {/* Spin Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={spin}
            disabled={spinning}
            className={`
              relative px-8 py-4 rounded-2xl font-bold text-xl
              transition-all duration-300 transform
              ${spinning 
                ? 'bg-purple-800 text-purple-300 cursor-wait scale-95' 
                : 'bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 hover:scale-105 active:scale-95'
              }
              shadow-lg shadow-purple-500/30
            `}
          >
            <span className={`flex items-center gap-3 ${spinning ? 'opacity-50' : ''}`}>
              <FiRefreshCw 
                size={24} 
                className={spinning ? 'animate-spin' : ''} 
              />
              {spinning ? 'Spinning...' : 'Spin the Wheel!'}
            </span>
            
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400 to-amber-400 opacity-0 hover:opacity-20 transition-opacity" />
          </button>
        </div>
        
        {/* Result Card */}
        {result && (
          <div className={`
            transition-all duration-500 transform
            ${result.recommendation ? 'opacity-100 translate-y-0' : 'opacity-70'}
          `}>
            {result.recommendation ? (
              <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl overflow-hidden border border-purple-500/30 shadow-xl shadow-purple-500/10">
                {/* Success Header */}
                <div className="bg-gradient-to-r from-purple-600/30 to-amber-600/30 px-4 py-3 border-b border-purple-500/20">
                  <p className="text-center text-sm font-medium text-purple-200">
                    ✨ {result.message}
                  </p>
                </div>
                
                {/* Image */}
                {result.recommendation.image_url && (
                  <div className="relative aspect-video">
                    <Image
                      src={result.recommendation.image_url}
                      alt={result.recommendation.brand}
                      fill
                      className="object-cover"
                    />
                    {/* Rating Badge */}
                    <div className="absolute top-3 right-3 bg-amber-500 text-black px-3 py-1 rounded-full font-bold flex items-center gap-1">
                      <FiStar fill="currentColor" size={16} />
                      {result.recommendation.rating}
                    </div>
                  </div>
                )}
                
                {/* Content */}
                <div className="p-5">
                  {/* Brand & Product */}
                  <div className="mb-4">
                    <Link 
                      href={`/cigar/${encodeURIComponent(result.recommendation.brand)}`}
                      className="text-xl font-bold text-white hover:text-amber-400 transition-colors flex items-center gap-2"
                    >
                      {result.recommendation.brand}
                      <FiExternalLink size={16} className="text-gray-500" />
                    </Link>
                    {result.recommendation.product && (
                      <p className="text-amber-400">{result.recommendation.product}</p>
                    )}
                  </div>
                  
                  {/* Review */}
                  {result.recommendation.review && (
                    <p className="text-gray-300 mb-4 italic">
                      &ldquo;{result.recommendation.review}&rdquo;
                    </p>
                  )}
                  
                  {/* Meta */}
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <Link 
                      href={`/profile/${result.recommendation.username}`}
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      {result.recommendation.avatar_url ? (
                        <Image
                          src={result.recommendation.avatar_url}
                          alt={result.recommendation.username}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      ) : (
                        <FiUser className="w-6 h-6 p-1 bg-gray-700 rounded-full" />
                      )}
                      @{result.recommendation.username}
                    </Link>
                    
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <FiHeart size={14} className="text-pink-400" />
                        {result.recommendation.like_count}
                      </span>
                      <span>{formatDate(result.recommendation.created_at)}</span>
                    </div>
                  </div>
                  
                  {/* CTA */}
                  <div className="mt-4 pt-4 border-t border-gray-700 flex gap-3">
                    <Link
                      href={`/checkin/${result.recommendation.id}`}
                      className="flex-1 text-center py-2 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg text-purple-300 transition-colors"
                    >
                      View Check-in
                    </Link>
                    <button
                      onClick={spin}
                      disabled={spinning}
                      className="flex-1 py-2 bg-amber-600/30 hover:bg-amber-600/50 rounded-lg text-amber-300 transition-colors"
                    >
                      Spin Again
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-800/50 rounded-2xl border border-gray-700">
                <p className="text-xl text-gray-400">{result.message}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Try spinning again or log a smoke to help others discover!
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Tips Section */}
        {!result && !spinning && (
          <div className="mt-8 grid gap-4">
            <div className="bg-gray-800/40 rounded-xl p-4 border border-purple-500/20">
              <h3 className="font-bold text-purple-300 mb-2">🎯 How it works</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Finds highly-rated cigars (4+ stars)</li>
                <li>• Excludes your own check-ins</li>
                <li>• Random selection each spin</li>
                <li>• Discover cigars you might love!</li>
              </ul>
            </div>
            
            <div className="bg-gray-800/40 rounded-xl p-4 border border-amber-500/20">
              <h3 className="font-bold text-amber-300 mb-2">💡 Pro tip</h3>
              <p className="text-sm text-gray-400">
                Found something good? Tap the brand name to see all check-ins for that cigar and learn more!
              </p>
            </div>
          </div>
        )}
        
        {/* Stats Teaser */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Powered by community ratings from 36+ check-ins 🚬
          </p>
        </div>
      </div>
    </div>
  );
}
