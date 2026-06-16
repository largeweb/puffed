'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiHeart, FiUsers, FiCheck } from 'react-icons/fi';
import { getFlavorTag, FLAVOR_TAGS } from '@/lib/flavors';
import PageWrapper from '@/components/PageWrapper';

interface FlavorMatchUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  shared_flavors: string[];
  match_score: number;
  total_checkins: number;
}

interface FlavorMatchesData {
  matches: FlavorMatchUser[];
  userFlavors: string[];
  totalMatches?: number;
  message?: string;
}

export default function FlavorMatchesPage() {
  const [data, setData] = useState<FlavorMatchesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setError('Please log in to see your flavor matches');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/flavor-matches', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            setError('Please log in to see your flavor matches');
            setLoading(false);
            return;
          }
          throw new Error('Failed to fetch matches');
        }

        const result: FlavorMatchesData = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading matches');
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, []);

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/discover" className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FiHeart className="text-pink-500" />
              Flavor Matches
            </h1>
            <p className="text-gray-400 text-sm">Find smokers with similar tastes</p>
          </div>
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="glass rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-24"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-gray-400">{error}</p>
            <Link href="/login" className="inline-block mt-4 text-amber-500 hover:underline">
              Log in →
            </Link>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Your Flavor Profile */}
            {data.userFlavors && data.userFlavors.length > 0 && (
              <div className="glass rounded-xl p-4 mb-6">
                <h2 className="font-semibold mb-3">Your Flavor Profile</h2>
                <div className="flex flex-wrap gap-2">
                  {FLAVOR_TAGS.map((flavor) => {
                    const isYours = data.userFlavors.includes(flavor.id);
                    return (
                      <span 
                        key={flavor.id}
                        className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 ${
                          isYours 
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                            : 'bg-gray-800/50 text-gray-500'
                        }`}
                      >
                        {flavor.emoji} {flavor.label}
                        {isYours && <FiCheck className="w-3 h-3" />}
                      </span>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Based on {data.userFlavors.length} flavors from your check-ins
                </p>
              </div>
            )}

            {/* Matches */}
            {data.message ? (
              <div className="glass rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiUsers className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-gray-400">{data.message}</p>
                <Link href="/check-in" className="inline-block mt-4 btn-primary px-6 py-2">
                  Log a Check-in
                </Link>
              </div>
            ) : data.matches.length === 0 ? (
              <div className="glass rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiUsers className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="font-semibold mb-2">No matches yet!</h3>
                <p className="text-gray-400 text-sm">
                  Keep logging check-ins with flavor tags to find your smoke buddies.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-400 mb-4">
                  Found {data.totalMatches || data.matches.length} smokers with similar taste
                </p>

                {data.matches.map((match, index) => (
                  <Link 
                    key={match.id} 
                    href={`/profile/${match.username}`}
                    className="glass rounded-xl p-4 flex items-center gap-4 hover:border-pink-500/30 transition-all"
                  >
                    {/* Rank */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center text-sm font-bold text-pink-400">
                      #{index + 1}
                    </div>

                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {match.avatar_url ? (
                        <img src={match.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-xl font-bold">
                          {(match.display_name || match.username)[0].toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">
                          {match.display_name || match.username}
                        </span>
                        <span className="text-sm bg-gradient-to-r from-pink-500 to-purple-500 text-white px-2 py-0.5 rounded-full font-medium">
                          {match.match_score}% match
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">@{match.username} · {match.total_checkins} check-ins</p>
                      
                      {/* Shared flavors */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {match.shared_flavors.map((flavorId) => {
                          const flavor = getFlavorTag(flavorId);
                          return flavor ? (
                            <span 
                              key={flavorId} 
                              className="text-xs bg-gray-800 px-2 py-0.5 rounded-full"
                            >
                              {flavor.emoji} {flavor.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Tip */}
            <div className="mt-6 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <p className="text-sm text-amber-400">
                💡 <strong>Pro tip:</strong> Add more flavor tags to your check-ins to improve your match accuracy!
              </p>
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
