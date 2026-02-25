'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiStar, FiUser, FiClock, FiAward, FiCompass, FiTrendingUp } from 'react-icons/fi';

interface HiddenGem {
  brand: string;
  checkin_count: number;
  avg_rating: number;
  unique_smokers: number;
  last_smoked: number;
  discoverer: string;
}

interface AbandonedGem {
  brand: string;
  checkin_count: number;
  avg_rating: number;
  last_smoked: number;
  days_ago: number;
}

interface SoloDiscovery {
  brand: string;
  discoverer: string;
  rating: number;
  created_at: number;
  checkin_id: string;
}

interface GemsData {
  hiddenGems: HiddenGem[];
  abandonedGems: AbandonedGem[];
  soloDiscoveries: SoloDiscovery[];
}

export default function HiddenGemsPage() {
  const [data, setData] = useState<GemsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hidden' | 'abandoned' | 'solo'>('hidden');

  useEffect(() => {
    fetch('/api/hidden-gems')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatTimeAgo = (ms: number) => {
    const days = Math.floor((Date.now() - ms) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-slate-900 to-black p-4">
        <div className="animate-pulse text-center py-20">
          <div className="text-4xl mb-4">💎</div>
          <div className="text-emerald-400">Discovering hidden gems...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-slate-900 to-black text-white">
      {/* Header */}
      <div className="sticky top-0 bg-emerald-900/90 backdrop-blur-sm border-b border-emerald-700/50 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/discover" className="p-2 hover:bg-emerald-800/50 rounded-full">
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              💎 Hidden Gems
            </h1>
            <p className="text-sm text-emerald-300">Underrated cigars waiting to be discovered</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('hidden')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === 'hidden'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FiAward className="inline mr-1" /> Hidden Gems
          </button>
          <button
            onClick={() => setActiveTab('solo')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === 'solo'
                ? 'bg-purple-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FiCompass className="inline mr-1" /> Solo Discoveries
          </button>
          <button
            onClick={() => setActiveTab('abandoned')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === 'abandoned'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FiClock className="inline mr-1" /> Forgotten Favorites
          </button>
        </div>

        {/* Hidden Gems Tab */}
        {activeTab === 'hidden' && (
          <div className="space-y-4">
            <div className="bg-emerald-800/30 rounded-xl p-4 border border-emerald-600/30">
              <p className="text-emerald-300 text-sm">
                <FiTrendingUp className="inline mr-1" />
                High-rated cigars with only 1-3 check-ins. Quality over popularity!
              </p>
            </div>
            
            {data?.hiddenGems.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                No hidden gems found yet. Keep exploring!
              </div>
            ) : (
              <div className="space-y-3">
                {data?.hiddenGems.map((gem, i) => (
                  <Link
                    key={i}
                    href={`/cigar/${encodeURIComponent(gem.brand)}`}
                    className="block bg-slate-800/50 rounded-xl p-4 border border-emerald-600/20 hover:border-emerald-500/50 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          💎 {gem.brand}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <FiStar className="text-yellow-500" />
                            {gem.avg_rating.toFixed(1)}
                          </span>
                          <span>{gem.checkin_count} check-in{gem.checkin_count > 1 ? 's' : ''}</span>
                          <span className="flex items-center gap-1">
                            <FiUser className="w-3 h-3" />
                            {gem.unique_smokers}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-emerald-400">Discovered by</div>
                        <div className="text-sm font-medium">@{gem.discoverer}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Last smoked {formatTimeAgo(gem.last_smoked)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Solo Discoveries Tab */}
        {activeTab === 'solo' && (
          <div className="space-y-4">
            <div className="bg-purple-800/30 rounded-xl p-4 border border-purple-600/30">
              <p className="text-purple-300 text-sm">
                <FiCompass className="inline mr-1" />
                Cigars that only one person has tried. Be the second to discover them!
              </p>
            </div>
            
            {data?.soloDiscoveries.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                No solo discoveries yet. Try something unique!
              </div>
            ) : (
              <div className="space-y-3">
                {data?.soloDiscoveries.map((discovery, i) => (
                  <Link
                    key={i}
                    href={`/cigar/${encodeURIComponent(discovery.brand)}`}
                    className="block bg-slate-800/50 rounded-xl p-4 border border-purple-600/20 hover:border-purple-500/50 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          🗺️ {discovery.brand}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <FiStar className="text-yellow-500" />
                            {discovery.rating}
                          </span>
                          <span className="text-purple-400">Only 1 person has tried this!</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-purple-400">Pioneer</div>
                        <div className="text-sm font-medium">@{discovery.discoverer}</div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                        Be the 2nd to try it!
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Abandoned/Forgotten Favorites Tab */}
        {activeTab === 'abandoned' && (
          <div className="space-y-4">
            <div className="bg-amber-800/30 rounded-xl p-4 border border-amber-600/30">
              <p className="text-amber-300 text-sm">
                <FiClock className="inline mr-1" />
                Highly-rated cigars that haven&apos;t been smoked in over a week. Time to revisit!
              </p>
            </div>
            
            {data?.abandonedGems.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                No forgotten favorites yet. All gems are getting love!
              </div>
            ) : (
              <div className="space-y-3">
                {data?.abandonedGems.map((gem, i) => (
                  <Link
                    key={i}
                    href={`/cigar/${encodeURIComponent(gem.brand)}`}
                    className="block bg-slate-800/50 rounded-xl p-4 border border-amber-600/20 hover:border-amber-500/50 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          ⏳ {gem.brand}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <FiStar className="text-yellow-500" />
                            {gem.avg_rating.toFixed(1)}
                          </span>
                          <span>{gem.checkin_count} check-in{gem.checkin_count > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-amber-400 font-medium">
                          {Math.floor(gem.days_ago)} days dormant
                        </div>
                        <div className="text-xs text-slate-500">
                          Last: {formatTimeAgo(gem.last_smoked)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full">
                        🔥 Bring it back!
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-8 bg-gradient-to-r from-emerald-600/20 to-purple-600/20 rounded-xl p-6 text-center border border-emerald-500/30">
          <div className="text-2xl mb-2">🏆</div>
          <h3 className="font-bold text-lg mb-2">Discover Something New</h3>
          <p className="text-slate-300 text-sm mb-4">
            Try one of these hidden gems and share your experience with the community!
          </p>
          <Link
            href="/checkin/new"
            className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-2 rounded-full transition-colors"
          >
            Log a Smoke
          </Link>
        </div>
      </div>
    </div>
  );
}
