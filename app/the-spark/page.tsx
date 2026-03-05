'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SparkLeader {
  username: string;
  avatar_url: string | null;
  spark_count: number;
}

interface RecentSpark {
  username: string;
  avatar_url: string | null;
  brand: string;
  created_at: string;
  check_date: string;
}

interface FirstToday {
  username: string;
  avatar_url: string | null;
  brand: string;
  created_at: string;
}

export default function TheSparkPage() {
  const [spotOpen, setSpotOpen] = useState(true);
  const [firstToday, setFirstToday] = useState<FirstToday | null>(null);
  const [sparkLeaders, setSparkLeaders] = useState<SparkLeader[]>([]);
  const [recentSparks, setRecentSparks] = useState<RecentSpark[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    fetchSparkData();
    const interval = setInterval(fetchSparkData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Countdown to midnight
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown(`${hours}h ${minutes}m ${seconds}s`);
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchSparkData = async () => {
    try {
      const res = await fetch('/api/the-spark');
      const data = await res.json();
      setSpotOpen(data.spotOpen);
      setFirstToday(data.firstToday);
      setSparkLeaders(data.sparkLeaders || []);
      setRecentSparks(data.recentSparks || []);
    } catch (error) {
      console.error('Error fetching spark data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankEmoji = (index: number) => {
    const emojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    return emojis[index] || '⚡';
  };

  const getRankTitle = (count: number) => {
    if (count >= 30) return 'Spark Legend';
    if (count >= 20) return 'Morning Champion';
    if (count >= 10) return 'Early Riser';
    if (count >= 5) return 'Spark Chaser';
    return 'New Spark';
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-900/20 via-zinc-900 to-zinc-900 flex items-center justify-center">
        <div className="animate-pulse text-yellow-400 text-xl">⚡ Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-900/20 via-zinc-900 to-zinc-900 p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-yellow-400 mb-2">⚡ The Spark</h1>
          <p className="text-zinc-400">First smoke of the day gets the glory</p>
        </div>

        {/* Today's Status */}
        <div className={`rounded-2xl p-6 mb-6 ${spotOpen 
          ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 animate-pulse' 
          : 'bg-zinc-800/50 border border-zinc-700'}`}
        >
          {spotOpen ? (
            <div className="text-center">
              <div className="text-5xl mb-4">🔥</div>
              <h2 className="text-2xl font-bold text-yellow-400 mb-2">SPOT IS OPEN!</h2>
              <p className="text-zinc-300 mb-4">No one has sparked up today yet. Be the first!</p>
              <Link 
                href="/dashboard"
                className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-xl transition-colors"
              >
                ⚡ CLAIM THE SPARK
              </Link>
              <p className="text-sm text-zinc-500 mt-4">Resets in {countdown}</p>
            </div>
          ) : firstToday && (
            <div className="text-center">
              <div className="text-5xl mb-4">⚡</div>
              <h2 className="text-xl font-bold text-yellow-400 mb-2">Today&apos;s Spark</h2>
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center text-2xl">
                  {firstToday.avatar_url ? (
                    <img src={firstToday.avatar_url} alt="" className="w-12 h-12 rounded-full" />
                  ) : '👤'}
                </div>
                <div>
                  <Link href={`/user/${firstToday.username}`} className="font-bold text-white hover:text-yellow-400">
                    @{firstToday.username}
                  </Link>
                  <p className="text-sm text-zinc-400">{firstToday.brand}</p>
                </div>
              </div>
              <p className="text-sm text-zinc-500">Sparked at {formatTime(firstToday.created_at)}</p>
              <p className="text-xs text-zinc-600 mt-2">Next chance in {countdown}</p>
            </div>
          )}
        </div>

        {/* Spark Leaders */}
        <div className="bg-zinc-800/50 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">🏆 Hall of Sparks</h2>
          <p className="text-sm text-zinc-400 mb-4">Most first-of-day check-ins all time</p>
          
          {sparkLeaders.length > 0 ? (
            <div className="space-y-3">
              {sparkLeaders.map((leader, index) => (
                <div key={leader.username} className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl">
                  <span className="text-xl">{getRankEmoji(index)}</span>
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                    {leader.avatar_url ? (
                      <img src={leader.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                    ) : '👤'}
                  </div>
                  <div className="flex-1">
                    <Link href={`/user/${leader.username}`} className="font-semibold text-white hover:text-yellow-400">
                      @{leader.username}
                    </Link>
                    <p className="text-xs text-zinc-500">{getRankTitle(leader.spark_count)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-yellow-400 font-bold">{leader.spark_count}</span>
                    <p className="text-xs text-zinc-500">sparks</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-center py-4">No spark leaders yet. Be the first!</p>
          )}
        </div>

        {/* Recent Sparks */}
        <div className="bg-zinc-800/50 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">📅 Recent Sparks</h2>
          <p className="text-sm text-zinc-400 mb-4">First check-ins from the last 7 days</p>
          
          {recentSparks.length > 0 ? (
            <div className="space-y-3">
              {recentSparks.map((spark, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl">
                  <div className="text-2xl">⚡</div>
                  <div className="flex-1">
                    <Link href={`/user/${spark.username}`} className="font-semibold text-white hover:text-yellow-400">
                      @{spark.username}
                    </Link>
                    <p className="text-sm text-zinc-400">{spark.brand}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-300">{formatDate(spark.created_at)}</p>
                    <p className="text-xs text-zinc-500">{formatTime(spark.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-center py-4">No recent sparks yet.</p>
          )}
        </div>

        {/* Back link */}
        <div className="text-center mt-8">
          <Link href="/dashboard" className="text-zinc-400 hover:text-white">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
