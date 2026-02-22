"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FiArrowLeft, FiUsers, FiCheckCircle, FiHeart, FiUserPlus, FiMessageCircle, FiTrendingUp, FiActivity, FiRefreshCw } from "react-icons/fi";

interface AdminStats {
  overall: {
    total_users: number;
    total_checkins: number;
    total_likes: number;
    total_follows: number;
    total_comments: number;
    total_notifications: number;
  };
  today: {
    new_users: number;
    new_checkins: number;
    new_likes: number;
    new_follows: number;
    new_comments: number;
  };
  yesterday: {
    new_users: number;
    new_checkins: number;
    new_likes: number;
    new_follows: number;
    new_comments: number;
  };
  week: {
    new_users: number;
    new_checkins: number;
    new_likes: number;
    new_follows: number;
    new_comments: number;
  };
  dailyStats: Array<{
    date: string;
    users: number;
    checkins: number;
    likes: number;
    follows: number;
    comments: number;
  }>;
  recentActivity: Array<{
    type: 'signup' | 'checkin' | 'like' | 'follow' | 'comment';
    username: string;
    details: string;
    created_at: number;
  }>;
  topBrands: Array<{
    brand: string;
    count: number;
    avg_rating: number;
  }>;
  activeUsers: Array<{
    username: string;
    checkin_count: number;
  }>;
}

function StatCard({ title, value, icon: Icon, color, change, changeLabel }: { 
  title: string; 
  value: number; 
  icon: React.ElementType; 
  color: string;
  change?: number;
  changeLabel?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4"
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
        {change !== undefined && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            change > 0 ? 'bg-green-500/20 text-green-400' : 
            change < 0 ? 'bg-red-500/20 text-red-400' : 
            'bg-gray-500/20 text-gray-400'
          }`}>
            {change > 0 ? '+' : ''}{change} {changeLabel || 'today'}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold mb-1">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-400">{title}</p>
    </motion.div>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'signup': return { icon: '👤', color: 'text-blue-400' };
    case 'checkin': return { icon: '🚬', color: 'text-amber-400' };
    case 'like': return { icon: '❤️', color: 'text-pink-400' };
    case 'follow': return { icon: '👥', color: 'text-purple-400' };
    case 'comment': return { icon: '💬', color: 'text-green-400' };
    default: return { icon: '📌', color: 'text-gray-400' };
  }
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/stats");
      const data: AdminStats = await res.json();
      setStats(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => loadStats(true), 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full"
        />
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Failed to load stats</p>
      </main>
    );
  }

  // Calculate engagement rate
  const engagementRate = stats.overall.total_checkins > 0
    ? ((stats.overall.total_likes + stats.overall.total_comments + stats.overall.total_follows) / stats.overall.total_checkins * 100).toFixed(1)
    : '0';

  // Max value for chart scaling
  const maxDailyValue = Math.max(
    ...stats.dailyStats.map(d => Math.max(d.users, d.checkins, d.likes, d.follows, d.comments)),
    1
  );

  return (
    <main className="min-h-screen pb-12">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <FiArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-semibold flex items-center gap-2">
                📊 Admin Stats
              </h1>
              <p className="text-xs text-gray-400">
                {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Loading...'}
              </p>
            </div>
          </div>
          <button
            onClick={() => loadStats(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-50"
          >
            <FiRefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Users"
            value={stats.overall.total_users}
            icon={FiUsers}
            color="bg-blue-500/20 text-blue-400"
            change={stats.today.new_users}
          />
          <StatCard
            title="Check-ins"
            value={stats.overall.total_checkins}
            icon={FiCheckCircle}
            color="bg-amber-500/20 text-amber-400"
            change={stats.today.new_checkins}
          />
          <StatCard
            title="Likes"
            value={stats.overall.total_likes}
            icon={FiHeart}
            color="bg-pink-500/20 text-pink-400"
            change={stats.today.new_likes}
          />
          <StatCard
            title="Follows"
            value={stats.overall.total_follows}
            icon={FiUserPlus}
            color="bg-purple-500/20 text-purple-400"
            change={stats.today.new_follows}
          />
          <StatCard
            title="Comments"
            value={stats.overall.total_comments}
            icon={FiMessageCircle}
            color="bg-green-500/20 text-green-400"
            change={stats.today.new_comments}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500/20 text-orange-400">
                <FiTrendingUp size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold mb-1">{engagementRate}%</p>
            <p className="text-sm text-gray-400">Engagement Rate</p>
          </motion.div>
        </div>

        {/* Engagement Warning */}
        {stats.overall.total_likes === 0 && stats.overall.total_follows === 0 && stats.overall.total_comments === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-4 border border-red-500/30 bg-red-500/5"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-red-400 mb-1">Zero Engagement</h3>
                <p className="text-sm text-gray-400">
                  No likes, follows, or comments yet. Recent features shipped to address this:
                </p>
                <ul className="text-sm text-gray-500 mt-2 space-y-1">
                  <li>✓ Community Engagement Prompts on Dashboard</li>
                  <li>✓ Featured Check-in of the Day</li>
                  <li>✓ Enhanced Social Sharing buttons</li>
                  <li>✓ People to Follow suggestions</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* Period Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-5"
        >
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <FiActivity size={18} className="text-amber-500" />
            Activity by Period
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-white/5">
                  <th className="text-left py-2">Period</th>
                  <th className="text-right py-2">Users</th>
                  <th className="text-right py-2">Check-ins</th>
                  <th className="text-right py-2">Likes</th>
                  <th className="text-right py-2">Follows</th>
                  <th className="text-right py-2">Comments</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="py-3 font-medium">Today</td>
                  <td className="py-3 text-right">{stats.today.new_users}</td>
                  <td className="py-3 text-right">{stats.today.new_checkins}</td>
                  <td className="py-3 text-right">{stats.today.new_likes}</td>
                  <td className="py-3 text-right">{stats.today.new_follows}</td>
                  <td className="py-3 text-right">{stats.today.new_comments}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 font-medium">Yesterday</td>
                  <td className="py-3 text-right">{stats.yesterday.new_users}</td>
                  <td className="py-3 text-right">{stats.yesterday.new_checkins}</td>
                  <td className="py-3 text-right">{stats.yesterday.new_likes}</td>
                  <td className="py-3 text-right">{stats.yesterday.new_follows}</td>
                  <td className="py-3 text-right">{stats.yesterday.new_comments}</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium">This Week</td>
                  <td className="py-3 text-right">{stats.week.new_users}</td>
                  <td className="py-3 text-right">{stats.week.new_checkins}</td>
                  <td className="py-3 text-right">{stats.week.new_likes}</td>
                  <td className="py-3 text-right">{stats.week.new_follows}</td>
                  <td className="py-3 text-right">{stats.week.new_comments}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Daily Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-2xl p-5"
        >
          <h2 className="font-semibold mb-4">Last 7 Days</h2>
          <div className="flex items-end gap-2 h-32">
            {stats.dailyStats.map((day, i) => {
              const totalActivity = day.users + day.checkins + day.likes + day.follows + day.comments;
              const height = maxDailyValue > 0 ? (totalActivity / maxDailyValue) * 100 : 0;
              const isToday = i === stats.dailyStats.length - 1;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end h-24">
                    <div
                      className={`w-full max-w-8 rounded-t-lg transition-all ${
                        isToday ? 'bg-amber-500' : 'bg-white/20'
                      }`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                      title={`${day.date}: ${totalActivity} activities`}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="text-xs font-medium">{totalActivity}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white/20" /> Past days
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Today
            </span>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Brands */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-5"
          >
            <h2 className="font-semibold mb-4">🔥 Top Brands</h2>
            {stats.topBrands.length > 0 ? (
              <div className="space-y-3">
                {stats.topBrands.map((brand, i) => (
                  <div key={brand.brand} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-500 w-6">#{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium">{brand.brand}</p>
                      <p className="text-xs text-gray-500">
                        {brand.count} check-in{brand.count !== 1 ? 's' : ''} • {brand.avg_rating?.toFixed(1) || 'N/A'}★ avg
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No brands checked in yet</p>
            )}
          </motion.div>

          {/* Most Active Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass rounded-2xl p-5"
          >
            <h2 className="font-semibold mb-4">👑 Most Active Users</h2>
            {stats.activeUsers.length > 0 ? (
              <div className="space-y-3">
                {stats.activeUsers.map((user, i) => (
                  <div key={user.username} className="flex items-center gap-3">
                    <span className="text-lg">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">@{user.username}</p>
                      <p className="text-xs text-gray-500">
                        {user.checkin_count} check-in{user.checkin_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No users yet</p>
            )}
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-5"
        >
          <h2 className="font-semibold mb-4">📋 Recent Activity</h2>
          {stats.recentActivity.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.recentActivity.map((activity, i) => {
                const { icon, color } = getActivityIcon(activity.type);
                return (
                  <div key={`${activity.type}-${activity.created_at}-${i}`} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                    <span className="text-lg">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className={`font-medium ${color}`}>@{activity.username}</span>
                        {' '}{activity.details}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {getTimeAgo(activity.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No recent activity</p>
          )}
        </motion.div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pt-4">
          <p>🚬 Puffed Admin Dashboard</p>
          <p className="mt-1">Auto-refreshes every 60 seconds</p>
        </div>
      </div>
    </main>
  );
}
