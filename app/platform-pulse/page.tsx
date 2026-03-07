'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface HealthStatus {
  label: string;
  color: string;
  emoji: string;
}

interface Metrics {
  checkins: number;
  likes: number;
  comments: number;
  reactions: number;
  active_users: number;
}

interface Totals {
  users: number;
  checkins: number;
  likes: number;
  follows: number;
  comments: number;
  reactions: number;
}

interface LastActivity {
  created_at: string;
  username: string;
  brand: string;
}

export default function PlatformPulsePage() {
  const [healthScore, setHealthScore] = useState(0);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [today, setToday] = useState<Metrics | null>(null);
  const [yesterday, setYesterday] = useState<Metrics | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [streak, setStreak] = useState(0);
  const [lastActivity, setLastActivity] = useState<LastActivity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPulseData();
    const interval = setInterval(fetchPulseData, 120000); // Refresh every 2 minutes
    return () => clearInterval(interval);
  }, []);

  const fetchPulseData = async () => {
    try {
      const res = await fetch('/api/platform-pulse');
      const data: {
        healthScore?: number;
        healthStatus?: HealthStatus;
        today?: Metrics;
        yesterday?: Metrics;
        totals?: Totals;
        streak?: number;
        lastActivity?: LastActivity;
      } = await res.json();
      setHealthScore(data.healthScore || 0);
      setHealthStatus(data.healthStatus || null);
      setToday(data.today || null);
      setYesterday(data.yesterday || null);
      setTotals(data.totals || null);
      setStreak(data.streak || 0);
      setLastActivity(data.lastActivity || null);
    } catch (error) {
      console.error('Error fetching pulse data:', error);
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
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getTrend = (todayVal: number, yesterdayVal: number) => {
    if (todayVal > yesterdayVal) return { icon: '📈', color: 'text-green-400' };
    if (todayVal < yesterdayVal) return { icon: '📉', color: 'text-red-400' };
    return { icon: '➡️', color: 'text-zinc-400' };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-lime-500 to-green-500';
    if (score >= 40) return 'from-yellow-500 to-amber-500';
    if (score >= 20) return 'from-orange-500 to-amber-500';
    return 'from-red-500 to-orange-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900/20 via-zinc-900 to-zinc-900 flex items-center justify-center">
        <div className="animate-pulse text-blue-400 text-xl">📊 Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900/20 via-zinc-900 to-zinc-900 p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-400 mb-2">📊 Platform Pulse</h1>
          <p className="text-zinc-400">Real-time health monitor</p>
        </div>

        {/* Health Score */}
        <div className={`bg-gradient-to-r ${getScoreColor(healthScore)} rounded-2xl p-6 mb-6`}>
          <div className="text-center">
            <div className="text-6xl mb-2">{healthStatus?.emoji}</div>
            <div className="text-5xl font-bold text-white mb-2">{healthScore}</div>
            <div className="text-xl text-white/80">{healthStatus?.label}</div>
            <p className="text-sm text-white/60 mt-2">Platform Health Score</p>
          </div>
        </div>

        {/* Today's Metrics */}
        <div className="bg-zinc-800/50 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-blue-400 mb-4">📈 Today&apos;s Metrics</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl">🚬</span>
                {yesterday && (
                  <span className={getTrend(today?.checkins || 0, yesterday.checkins).color}>
                    {getTrend(today?.checkins || 0, yesterday.checkins).icon}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-white mt-2">{today?.checkins || 0}</div>
              <div className="text-sm text-zinc-400">Check-ins</div>
              {yesterday && (
                <div className="text-xs text-zinc-500">Yesterday: {yesterday.checkins}</div>
              )}
            </div>
            
            <div className="bg-zinc-900/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl">❤️</span>
                {yesterday && (
                  <span className={getTrend(today?.likes || 0, yesterday.likes).color}>
                    {getTrend(today?.likes || 0, yesterday.likes).icon}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-white mt-2">{today?.likes || 0}</div>
              <div className="text-sm text-zinc-400">Likes</div>
              {yesterday && (
                <div className="text-xs text-zinc-500">Yesterday: {yesterday.likes}</div>
              )}
            </div>
            
            <div className="bg-zinc-900/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl">💬</span>
                {yesterday && (
                  <span className={getTrend(today?.comments || 0, yesterday.comments).color}>
                    {getTrend(today?.comments || 0, yesterday.comments).icon}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-white mt-2">{today?.comments || 0}</div>
              <div className="text-sm text-zinc-400">Comments</div>
              {yesterday && (
                <div className="text-xs text-zinc-500">Yesterday: {yesterday.comments}</div>
              )}
            </div>
            
            <div className="bg-zinc-900/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl">👥</span>
                {yesterday && (
                  <span className={getTrend(today?.active_users || 0, yesterday.active_users).color}>
                    {getTrend(today?.active_users || 0, yesterday.active_users).icon}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-white mt-2">{today?.active_users || 0}</div>
              <div className="text-sm text-zinc-400">Active Users</div>
              {yesterday && (
                <div className="text-xs text-zinc-500">Yesterday: {yesterday.active_users}</div>
              )}
            </div>
          </div>
        </div>

        {/* Platform Totals */}
        <div className="bg-zinc-800/50 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-blue-400 mb-4">🏆 All-Time Totals</h2>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-zinc-900/50 rounded-xl">
              <div className="text-xl font-bold text-white">{totals?.users || 0}</div>
              <div className="text-xs text-zinc-400">Users</div>
            </div>
            <div className="text-center p-3 bg-zinc-900/50 rounded-xl">
              <div className="text-xl font-bold text-white">{totals?.checkins || 0}</div>
              <div className="text-xs text-zinc-400">Check-ins</div>
            </div>
            <div className="text-center p-3 bg-zinc-900/50 rounded-xl">
              <div className="text-xl font-bold text-white">{totals?.likes || 0}</div>
              <div className="text-xs text-zinc-400">Likes</div>
            </div>
            <div className="text-center p-3 bg-zinc-900/50 rounded-xl">
              <div className="text-xl font-bold text-white">{totals?.follows || 0}</div>
              <div className="text-xs text-zinc-400">Follows</div>
            </div>
            <div className="text-center p-3 bg-zinc-900/50 rounded-xl">
              <div className="text-xl font-bold text-white">{totals?.comments || 0}</div>
              <div className="text-xs text-zinc-400">Comments</div>
            </div>
            <div className="text-center p-3 bg-zinc-900/50 rounded-xl">
              <div className="text-xl font-bold text-white">{totals?.reactions || 0}</div>
              <div className="text-xs text-zinc-400">Reactions</div>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Streak */}
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <div className="text-3xl mb-2">🔥</div>
            <div className="text-2xl font-bold text-orange-400">{streak} days</div>
            <div className="text-sm text-zinc-400">Platform Streak</div>
          </div>
          
          {/* Last Activity */}
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <div className="text-3xl mb-2">⏱️</div>
            {lastActivity ? (
              <>
                <div className="text-lg font-bold text-white">{getTimeAgo(lastActivity.created_at)}</div>
                <div className="text-sm text-zinc-400">
                  @{lastActivity.username}
                </div>
              </>
            ) : (
              <div className="text-zinc-500">No activity yet</div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-zinc-800/50 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-blue-400 mb-4">⚡ Quick Links</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/the-spark" className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 p-3 rounded-xl text-center transition-colors">
              ⚡ The Spark
            </Link>
            <Link href="/the-porch" className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 p-3 rounded-xl text-center transition-colors">
              🪑 The Porch
            </Link>
            <Link href="/milestones" className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 p-3 rounded-xl text-center transition-colors">
              🏆 Milestones
            </Link>
            <Link href="/leaderboard" className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 p-3 rounded-xl text-center transition-colors">
              🏅 Leaderboard
            </Link>
          </div>
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
