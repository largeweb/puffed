'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiStar, FiUsers, FiZap, FiRefreshCw } from 'react-icons/fi';
import { MOOD_TAGS } from '@/lib/moods';

interface MoodMatch {
  brand: string;
  moodCount: number;
  avgRating: number | null;
  uniqueSmokers: number;
  sampleReview: string | null;
  sampleImage: string | null;
  products: string[];
  flavors: string[];
}

interface RecentSmoke {
  brand: string;
  rating: number;
  review: string | null;
  imageUrl: string | null;
  username: string;
  createdAt: number;
}

interface TopRated {
  brand: string;
  product: string | null;
  rating: number;
  review: string | null;
  imageUrl: string | null;
  username: string;
  createdAt: number;
}

interface MoodMatchData {
  mood: string;
  matches: MoodMatch[];
  stats: {
    totalCheckins: number;
    avgRating: number | null;
    uniqueUsers: number;
    uniqueBrands: number;
  } | null;
  recent: RecentSmoke[];
  topRated: TopRated[];
}

export default function MoodMatchPage() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [data, setData] = useState<MoodMatchData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMoodSelect = async (moodId: string) => {
    setSelectedMood(moodId);
    setLoading(true);
    
    try {
      const res = await fetch(`/api/mood-match?mood=${moodId}`);
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Failed to fetch mood matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedMoodTag = MOOD_TAGS.find(m => m.id === selectedMood);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-900 via-slate-900 to-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-pink-900/80 backdrop-blur-md border-b border-pink-700/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/dashboard" className="text-pink-400 hover:text-pink-300">
            <FiArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-white flex items-center gap-2">
              🎯 Mood Match
            </h1>
            <p className="text-xs text-pink-400">Find the perfect smoke for your vibe</p>
          </div>
          {selectedMood && (
            <button
              onClick={() => { setSelectedMood(null); setData(null); }}
              className="text-pink-400 hover:text-pink-300 p-2"
              title="Pick another mood"
            >
              <FiRefreshCw size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Mood Selector */}
        {!selectedMood && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="text-6xl mb-4 animate-pulse">🎯</div>
              <h2 className="text-2xl font-bold text-white mb-2">How are you feeling?</h2>
              <p className="text-pink-300/70">Pick your mood and we&apos;ll find the perfect cigar</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {MOOD_TAGS.map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => handleMoodSelect(mood.id)}
                  className={`p-4 rounded-xl border-2 border-white/10 hover:border-pink-500/50 
                    bg-gradient-to-br from-white/5 to-white/0 hover:from-pink-500/20 hover:to-purple-500/10
                    transition-all duration-200 transform hover:scale-105 active:scale-95
                    flex flex-col items-center gap-2 text-center`}
                >
                  <span className="text-3xl">{mood.emoji}</span>
                  <span className="font-medium text-white">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-bounce">{selectedMoodTag?.emoji || '🔍'}</div>
            <div className="text-pink-400">Finding your perfect match...</div>
          </div>
        )}

        {/* Results */}
        {selectedMood && data && !loading && (
          <div className="space-y-6">
            {/* Selected Mood Banner */}
            <div className="bg-gradient-to-r from-pink-600/30 to-purple-600/30 rounded-xl p-4 border border-pink-500/30">
              <div className="flex items-center gap-4">
                <span className="text-4xl">{selectedMoodTag?.emoji}</span>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Feeling {selectedMoodTag?.label}
                  </h2>
                  {data.stats && (
                    <p className="text-pink-300/70 text-sm">
                      {data.stats.totalCheckins} check-ins • {data.stats.uniqueUsers} smokers • {data.stats.uniqueBrands} brands
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Top Matches */}
            {data.matches.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FiZap className="text-amber-400" /> Perfect Matches
                </h3>
                
                {data.matches.map((match, idx) => (
                  <Link
                    key={match.brand}
                    href={`/cigar/${encodeURIComponent(match.brand)}`}
                    className="block bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 
                      hover:border-pink-500/30 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {/* Rank Badge */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold
                        ${idx === 0 ? 'bg-amber-500/30 text-amber-400' : 
                          idx === 1 ? 'bg-gray-400/30 text-gray-300' :
                          idx === 2 ? 'bg-orange-600/30 text-orange-400' :
                          'bg-white/10 text-white/60'}`}
                      >
                        {idx + 1}
                      </div>

                      {/* Match Image or Placeholder */}
                      {match.sampleImage ? (
                        <img 
                          src={match.sampleImage} 
                          alt={match.brand}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-pink-600/20 to-purple-600/20 
                          flex items-center justify-center text-2xl">
                          🚬
                        </div>
                      )}

                      {/* Match Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white truncate">{match.brand}</h4>
                        
                        <div className="flex flex-wrap gap-2 mt-1 text-sm">
                          {match.avgRating && (
                            <span className="flex items-center gap-1 text-amber-400">
                              <FiStar size={12} /> {match.avgRating}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-pink-400">
                            <FiUsers size={12} /> {match.uniqueSmokers} {match.uniqueSmokers === 1 ? 'smoker' : 'smokers'}
                          </span>
                          <span className="text-white/50">
                            {match.moodCount}× when {selectedMoodTag?.label.toLowerCase()}
                          </span>
                        </div>

                        {/* Flavors */}
                        {match.flavors.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {match.flavors.map((flavor) => (
                              <span key={flavor} className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                                {flavor}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Sample Review */}
                        {match.sampleReview && (
                          <p className="text-sm text-white/60 mt-2 line-clamp-2 italic">
                            &ldquo;{match.sampleReview}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-white mb-2">No matches yet</h3>
                <p className="text-pink-300/70 mb-4">
                  Be the first to log a smoke when feeling {selectedMoodTag?.label.toLowerCase()}!
                </p>
                <Link
                  href="/checkin"
                  className="inline-block bg-pink-600 hover:bg-pink-500 px-6 py-2 rounded-lg font-medium"
                >
                  Log a Smoke
                </Link>
              </div>
            )}

            {/* 5-Star Experiences */}
            {data.topRated.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  ⭐ 5-Star Experiences
                </h3>
                
                <div className="space-y-2">
                  {data.topRated.map((smoke, idx) => (
                    <div 
                      key={idx}
                      className="bg-gradient-to-r from-amber-500/10 to-transparent rounded-lg p-3 
                        border border-amber-500/20"
                    >
                      <div className="flex items-center gap-3">
                        {smoke.imageUrl && (
                          <img 
                            src={smoke.imageUrl} 
                            alt={smoke.brand}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{smoke.brand}</span>
                            <span className="text-amber-400">★★★★★</span>
                          </div>
                          <p className="text-sm text-white/50">by @{smoke.username}</p>
                        </div>
                      </div>
                      {smoke.review && (
                        <p className="text-sm text-white/70 mt-2 italic line-clamp-2">
                          &ldquo;{smoke.review}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {data.recent.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  🕐 Recent {selectedMoodTag?.label} Smokes
                </h3>
                
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  {data.recent.map((smoke, idx) => (
                    <div 
                      key={idx}
                      className="flex-none w-48 bg-white/5 rounded-xl p-3 border border-white/10"
                    >
                      {smoke.imageUrl && (
                        <img 
                          src={smoke.imageUrl} 
                          alt={smoke.brand}
                          className="w-full h-24 rounded-lg object-cover mb-2"
                        />
                      )}
                      <h4 className="font-medium text-white text-sm truncate">{smoke.brand}</h4>
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span>@{smoke.username}</span>
                        <span className="text-amber-400">★{smoke.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="bg-gradient-to-r from-pink-600/30 to-purple-600/30 rounded-xl p-6 text-center border border-pink-500/30">
              <h3 className="text-lg font-bold text-white mb-2">
                Light up your {selectedMoodTag?.label.toLowerCase()} vibe! 🔥
              </h3>
              <p className="text-pink-300/70 text-sm mb-4">
                Log your smoke and help others find their perfect match
              </p>
              <Link
                href="/checkin"
                className="inline-block bg-pink-600 hover:bg-pink-500 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Log a Smoke
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
