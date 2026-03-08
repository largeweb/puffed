'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiMenu } from 'react-icons/fi';
import MobileSidebar from '@/app/components/MobileSidebar';
import { useSidebar } from '@/hooks/useSidebar';

interface PorchSmoker {
  id: number;
  username: string;
  avatar_url: string | null;
  brand: string;
  product?: string;
  rating?: number;
  review?: string;
  image_url?: string;
  created_at: string;
  like_count: number;
  comment_count: number;
}

interface Stats {
  currentCount: number;
  todayVisits: number;
  uniqueSmokersToday: number;
  peakHour: string | null;
  peakCount: number;
}

export default function ThePorchPage() {
  const { sidebarOpen, setSidebarOpen, currentUser, unreadCount, handleLogout } = useSidebar();
  const [onPorch, setOnPorch] = useState<PorchSmoker[]>([]);
  const [recentlyLeft, setRecentlyLeft] = useState<PorchSmoker[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPorchData();
    const interval = setInterval(fetchPorchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPorchData = async () => {
    try {
      const res = await fetch('/api/the-porch');
      const data: { onPorch?: PorchSmoker[]; recentlyLeft?: PorchSmoker[]; stats?: Stats } = await res.json();
      setOnPorch(data.onPorch || []);
      setRecentlyLeft(data.recentlyLeft || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error fetching porch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m ago`;
  };

  const getStatusEmoji = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffMins < 10) return '🔥'; // Just lit
    if (diffMins < 30) return '💨'; // Smoking
    if (diffMins < 45) return '🚬'; // Wrapping up
    return '☁️'; // Lingering
  };

  const getStatusText = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffMins < 10) return 'Just lit up';
    if (diffMins < 30) return 'Smoking';
    if (diffMins < 45) return 'Wrapping up';
    return 'Lingering';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900/20 via-zinc-900 to-zinc-900 flex items-center justify-center">
        <div className="animate-pulse text-amber-400 text-xl">🪑 Loading...</div>
      </div>
    );
  }

  return (
    <>
      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        username={currentUser}
        unreadCount={unreadCount}
        onLogout={handleLogout}
      />
    <div className="min-h-screen bg-gradient-to-b from-amber-900/20 via-zinc-900 to-zinc-900 p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white">
            <FiMenu size={24} />
          </button>
          <div className="w-10" />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-400 mb-2">🪑 The Porch</h1>
          <p className="text-zinc-400">See who&apos;s smoking right now</p>
          <p className="text-xs text-zinc-500 mt-1">Auto-refreshes every 30 seconds</p>
        </div>

        {/* Current Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-amber-400">{stats?.currentCount || 0}</div>
            <div className="text-xs text-zinc-400">On Porch Now</div>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{stats?.todayVisits || 0}</div>
            <div className="text-xs text-zinc-400">Today&apos;s Visits</div>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{stats?.uniqueSmokersToday || 0}</div>
            <div className="text-xs text-zinc-400">Unique Smokers</div>
          </div>
        </div>

        {/* On the Porch Now */}
        <div className="bg-zinc-800/50 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-amber-400">🔥 On the Porch</h2>
            <span className="text-sm text-zinc-400">Last hour</span>
          </div>
          
          {onPorch.length > 0 ? (
            <div className="space-y-4">
              {onPorch.map((smoker) => (
                <div key={smoker.id} className="bg-zinc-900/50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{getStatusEmoji(smoker.created_at)}</div>
                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                      {smoker.avatar_url ? (
                        <img src={smoker.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                      ) : '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/user/${smoker.username}`} className="font-semibold text-white hover:text-amber-400">
                          @{smoker.username}
                        </Link>
                        <span className="text-xs text-zinc-500">{getStatusText(smoker.created_at)}</span>
                      </div>
                      <p className="text-amber-400">{smoker.brand}</p>
                      {smoker.product && <p className="text-sm text-zinc-400">{smoker.product}</p>}
                      {smoker.review && (
                        <p className="text-sm text-zinc-300 mt-1 line-clamp-2">&quot;{smoker.review}&quot;</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                        <span>{getTimeAgo(smoker.created_at)}</span>
                        {smoker.like_count > 0 && <span>❤️ {smoker.like_count}</span>}
                        {smoker.comment_count > 0 && <span>💬 {smoker.comment_count}</span>}
                        {smoker.rating && <span>⭐ {smoker.rating}</span>}
                      </div>
                    </div>
                    {smoker.image_url && (
                      <img 
                        src={smoker.image_url} 
                        alt="" 
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🪑</div>
              <p className="text-zinc-400">The porch is empty right now</p>
              <p className="text-sm text-zinc-500 mt-1">Be the first to spark up!</p>
              <Link 
                href="/dashboard"
                className="inline-block mt-4 bg-amber-500 hover:bg-amber-400 text-black font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Log a Smoke
              </Link>
            </div>
          )}
        </div>

        {/* Recently Left */}
        {recentlyLeft.length > 0 && (
          <div className="bg-zinc-800/50 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-zinc-400 mb-4">👋 Recently Left</h2>
            <p className="text-sm text-zinc-500 mb-4">1-2 hours ago</p>
            
            <div className="space-y-3">
              {recentlyLeft.map((smoker) => (
                <div key={smoker.id} className="flex items-center gap-3 p-3 bg-zinc-900/30 rounded-xl opacity-60">
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                    {smoker.avatar_url ? (
                      <img src={smoker.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                    ) : '👤'}
                  </div>
                  <div className="flex-1">
                    <Link href={`/user/${smoker.username}`} className="font-semibold text-zinc-300 hover:text-white">
                      @{smoker.username}
                    </Link>
                    <p className="text-sm text-zinc-500">{smoker.brand}</p>
                  </div>
                  <span className="text-xs text-zinc-500">{getTimeAgo(smoker.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Porch Tips */}
        <div className="bg-zinc-800/30 rounded-xl p-4 text-center">
          <p className="text-sm text-zinc-400">
            💡 <span className="text-zinc-300">Porch Etiquette:</span> Share what you&apos;re smoking and enjoy the company!
          </p>
        </div>

        {/* Back link */}
        <div className="text-center mt-8">
          <Link href="/dashboard" className="text-zinc-400 hover:text-white">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
