'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiUsers, FiHeart, FiChevronRight } from 'react-icons/fi';
import { getFlavorTag } from '@/lib/flavors';

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

export default function FlavorMatches() {
  const [data, setData] = useState<FlavorMatchesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
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

  if (loading) {
    return (
      <div className="glass rounded-xl p-4 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-40 mb-3"></div>
        <div className="space-y-2">
          <div className="h-12 bg-gray-700 rounded"></div>
          <div className="h-12 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  if (data.message) {
    return (
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <FiHeart className="text-pink-500" />
          <h3 className="font-semibold">Flavor Matches</h3>
        </div>
        <p className="text-gray-400 text-sm">{data.message}</p>
        <Link href="/check-in" className="inline-block mt-2 text-amber-500 text-sm hover:underline">
          Log your first check-in →
        </Link>
      </div>
    );
  }

  if (data.matches.length === 0) {
    return (
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <FiHeart className="text-pink-500" />
          <h3 className="font-semibold">Flavor Matches</h3>
        </div>
        <p className="text-gray-400 text-sm">
          No matches yet! Keep logging check-ins with flavor tags to find your smoke buddies.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FiHeart className="text-pink-500" />
          <h3 className="font-semibold">Flavor Matches</h3>
        </div>
        {data.totalMatches && data.totalMatches > 3 && (
          <span className="text-xs text-gray-400">{data.totalMatches} matches</span>
        )}
      </div>
      
      <p className="text-xs text-gray-400 mb-3">
        Smokers with similar taste preferences
      </p>

      <div className="space-y-2">
        {data.matches.slice(0, 3).map((match) => (
          <Link 
            key={match.id} 
            href={`/profile/${match.username}`}
            className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center overflow-hidden flex-shrink-0">
              {match.avatar_url ? (
                <img src={match.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold">
                  {(match.display_name || match.username)[0].toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">
                  {match.display_name || match.username}
                </span>
                <span className="text-xs bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded-full">
                  {match.match_score}% match
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                {match.shared_flavors.slice(0, 4).map((flavorId) => {
                  const flavor = getFlavorTag(flavorId);
                  return flavor ? (
                    <span key={flavorId} className="text-xs" title={flavor.label}>
                      {flavor.emoji}
                    </span>
                  ) : null;
                })}
                {match.shared_flavors.length > 4 && (
                  <span className="text-xs text-gray-500">+{match.shared_flavors.length - 4}</span>
                )}
              </div>
            </div>

            {/* Arrow */}
            <FiChevronRight className="text-gray-500" />
          </Link>
        ))}
      </div>

      {data.matches.length > 3 && (
        <Link 
          href="/flavor-matches"
          className="block text-center text-sm text-amber-500 hover:text-amber-400 mt-3 pt-3 border-t border-gray-700/50"
        >
          View all {data.totalMatches} matches →
        </Link>
      )}
    </div>
  );
}
