'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface LastCheckin {
  id: string;
  brand: string;
  product: string | null;
  category: string;
  rating: number | null;
}

export default function QuickRelog() {
  const router = useRouter();
  const [lastCheckin, setLastCheckin] = useState<LastCheckin | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch user's last check-in
    const fetchLastCheckin = async () => {
      try {
        const res = await fetch('/api/checkins?limit=1');
        const data: { checkins?: LastCheckin[] } = await res.json();
        if (data.checkins && data.checkins.length > 0) {
          setLastCheckin(data.checkins[0]);
        }
      } catch {
        // Silent fail - just don't show the component
      }
    };
    fetchLastCheckin();
  }, []);

  const handleQuickLog = async () => {
    if (!lastCheckin || isLogging) return;
    
    setIsLogging(true);
    setError(null);

    try {
      const response = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: lastCheckin.brand,
          product: lastCheckin.product,
          category: lastCheckin.category || 'cigar',
          // Don't copy rating/review - let them add fresh thoughts
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to log');
      }

      setSuccess(true);
      
      // Redirect to check-in page to add details
      setTimeout(() => {
        router.push('/history');
        router.refresh();
      }, 1000);
    } catch {
      setError('Failed to log - try again!');
      setIsLogging(false);
    }
  };

  // Don't show if no previous check-ins
  if (!lastCheckin) return null;

  // Show success state
  if (success) {
    return (
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="text-3xl">✅</div>
          <div>
            <h3 className="font-bold">Logged!</h3>
            <p className="text-white/90 text-sm">Enjoy your smoke 🔥</p>
          </div>
        </div>
      </div>
    );
  }

  const categoryEmoji = lastCheckin.category === 'cannabis' ? '🌿' : 
                        lastCheckin.category === 'hookah' ? '💨' :
                        lastCheckin.category === 'vape' ? '🌫️' : '🚬';

  return (
    <button
      onClick={handleQuickLog}
      disabled={isLogging}
      className="w-full text-left bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
    >
      <div className="flex items-center gap-3">
        <div className="text-3xl">
          {isLogging ? (
            <div className="animate-spin">🔄</div>
          ) : (
            <span className="animate-pulse">⚡</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full">
              🚀 QUICK LOG
            </span>
          </div>
          <h3 className="font-bold text-lg mt-1 truncate">
            {isLogging ? 'Logging...' : 'Same smoke again?'}
          </h3>
          <p className="text-white/90 text-sm truncate">
            {categoryEmoji} {lastCheckin.brand}
            {lastCheckin.product && ` - ${lastCheckin.product}`}
          </p>
        </div>
        <div className="flex-shrink-0">
          <div className="bg-white/20 rounded-full p-3 hover:bg-white/30 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-red-200 text-sm">{error}</p>
      )}
    </button>
  );
}
