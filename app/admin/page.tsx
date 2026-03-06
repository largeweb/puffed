"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiUsers, FiActivity, FiHeart, FiTrendingUp, FiAlertCircle, FiRefreshCw, FiZap, FiSend, FiBell, FiUserPlus, FiMessageSquare } from "react-icons/fi";

interface PlatformStats {
  overview: {
    total_users: number;
    total_checkins: number;
    unique_brands: number;
    checkins_per_user: number;
  };
  engagement: {
    total_likes: number;
    total_comments: number;
    total_reactions: number;
    total_follows: number;
  };
  recent_24h: {
    checkins: number;
    active_users: number;
  };
  weekly: {
    checkins: number;
    likes: number;
    follows: number;
    new_users: number;
  };
  health: {
    users_with_active_streaks: number;
    engagement_rate: number;
  };
  top_users: Array<{
    username: string;
    checkins: number;
    likes_received: number;
  }>;
  generated_at: string;
}

interface ActionResult {
  action: string;
  success: boolean;
  message: string;
  details?: string;
}

const ADMIN_KEY = "puffed-admin-2026";

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [actionResults, setActionResults] = useState<ActionResult[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform-stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data: PlatformStats = await res.json();
      setStats(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (action: string, endpoint: string) => {
    setActionLoading(action);
    try {
      // First GET to preview
      const previewRes = await fetch(`${endpoint}?key=${ADMIN_KEY}`);
      const previewData = await previewRes.json() as {
        eligibleCount?: number;
        count?: number;
        users?: { username: string }[];
        at_risk_users?: { username: string }[];
        success?: boolean;
        message?: string;
        sent?: number;
        sent_count?: number;
      };
      
      let result: ActionResult;
      
      if (previewData.eligibleCount === 0 || previewData.count === 0 || 
          (Array.isArray(previewData.users) && previewData.users.length === 0) ||
          (Array.isArray(previewData.at_risk_users) && previewData.at_risk_users.length === 0)) {
        result = {
          action,
          success: true,
          message: "No users need this notification",
          details: "All caught up! ✨"
        };
      } else {
        // Run the action
        const postRes = await fetch(`${endpoint}?key=${ADMIN_KEY}`, { method: "POST" });
        const postData = await postRes.json() as {
          success?: boolean;
          message?: string;
          sent?: number;
          sent_count?: number;
          users?: { username: string }[];
        };
        
        result = {
          action,
          success: postData.success || postRes.ok,
          message: postData.message || `Sent to ${postData.sent || postData.sent_count || 0} users`,
          details: postData.users ? postData.users.map((u) => u.username).join(", ") : undefined
        };
      }
      
      setActionResults(prev => [result, ...prev.slice(0, 4)]);
    } catch (err) {
      setActionResults(prev => [{
        action,
        success: false,
        message: err instanceof Error ? err.message : "Action failed"
      }, ...prev.slice(0, 4)]);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-white flex items-center justify-center">
        <div className="animate-spin text-4xl">🚬</div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-white flex items-center justify-center">
        <div className="text-center">
          <FiAlertCircle className="text-red-500 text-4xl mx-auto mb-4" />
          <p className="text-red-400">{error}</p>
          <button 
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-amber-600 rounded-lg hover:bg-amber-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              📊 Puffed Admin Dashboard
            </h1>
            <p className="text-gray-400 mt-1">
              CEO-level platform overview
            </p>
          </div>
          <Link
            href="/admin/messages"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            <FiMessageSquare />
            Messages
          </Link>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {stats && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<FiUsers className="text-blue-400" />}
                label="Total Users"
                value={stats.overview.total_users}
                color="blue"
              />
              <StatCard
                icon={<FiActivity className="text-amber-400" />}
                label="Total Check-ins"
                value={stats.overview.total_checkins}
                color="amber"
              />
              <StatCard
                icon={<span className="text-green-400">🚬</span>}
                label="Unique Brands"
                value={stats.overview.unique_brands}
                color="green"
              />
              <StatCard
                icon={<FiTrendingUp className="text-purple-400" />}
                label="Avg Check-ins/User"
                value={stats.overview.checkins_per_user}
                color="purple"
              />
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-violet-900/20 to-purple-900/20 rounded-xl p-6 mb-8 border border-violet-800/30">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FiZap className="text-violet-400" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ActionButton
                  icon={<FiSend />}
                  label="Win Back"
                  description="Re-engage inactive users"
                  loading={actionLoading === "win-back"}
                  onClick={() => runAction("win-back", "/api/admin/win-back")}
                />
                <ActionButton
                  icon={<FiBell />}
                  label="Streak Alert"
                  description="Remind at-risk streaks"
                  loading={actionLoading === "streak"}
                  onClick={() => runAction("streak", "/api/admin/streak-reminder")}
                />
                <ActionButton
                  icon={<FiUserPlus />}
                  label="First Smoke"
                  description="Nudge new signups"
                  loading={actionLoading === "first-smoke"}
                  onClick={() => runAction("first-smoke", "/api/admin/first-smoke-nudge")}
                />
                <ActionButton
                  icon={<FiHeart />}
                  label="Warm Up"
                  description="Auto-engage content"
                  loading={actionLoading === "warm-up"}
                  onClick={() => runAction("warm-up", "/api/admin/warm-up")}
                />
              </div>
              
              {/* Action Results */}
              {actionResults.length > 0 && (
                <div className="mt-4 pt-4 border-t border-violet-800/30 space-y-2">
                  {actionResults.map((result, i) => (
                    <div 
                      key={i} 
                      className={`text-sm p-2 rounded ${
                        result.success ? 'bg-green-900/20 text-green-300' : 'bg-red-900/20 text-red-300'
                      }`}
                    >
                      <span className="font-medium">{result.action}:</span> {result.message}
                      {result.details && <span className="text-gray-400 ml-2">({result.details})</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Engagement Stats */}
            <div className="bg-zinc-900/50 rounded-xl p-6 mb-8 border border-zinc-800">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FiHeart className="text-pink-400" />
                Engagement Metrics
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MiniStat label="Total Likes" value={stats.engagement.total_likes} emoji="❤️" />
                <MiniStat label="Total Comments" value={stats.engagement.total_comments} emoji="💬" />
                <MiniStat label="Total Reactions" value={stats.engagement.total_reactions} emoji="🎭" />
                <MiniStat label="Total Follows" value={stats.engagement.total_follows} emoji="👥" />
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <p className="text-gray-400">
                  Engagement Rate: <span className="text-white font-semibold">{stats.health.engagement_rate}%</span>
                  <span className="text-xs ml-2 text-gray-500">(likes + comments per check-in)</span>
                </p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Last 24 Hours */}
              <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 rounded-xl p-6 border border-amber-800/30">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  🔥 Last 24 Hours
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">New Check-ins</span>
                    <span className="font-semibold text-amber-400">{stats.recent_24h.checkins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Users</span>
                    <span className="font-semibold text-amber-400">{stats.recent_24h.active_users}</span>
                  </div>
                </div>
              </div>

              {/* This Week */}
              <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 rounded-xl p-6 border border-cyan-800/30">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  📅 This Week
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Check-ins</span>
                    <span className="font-semibold text-cyan-400">{stats.weekly.checkins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">New Users</span>
                    <span className="font-semibold text-cyan-400">{stats.weekly.new_users}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Likes</span>
                    <span className="font-semibold text-cyan-400">{stats.weekly.likes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">New Follows</span>
                    <span className="font-semibold text-cyan-400">{stats.weekly.follows}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Users */}
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                🏆 Top Users
              </h2>
              <div className="space-y-3">
                {stats.top_users.map((user, i) => (
                  <div key={user.username} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-zinc-500'}`}>
                        #{i + 1}
                      </span>
                      <span className="font-medium">@{user.username}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>{user.checkins} 🚬</span>
                      <span>{user.likes_received} ❤️</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Health Indicators */}
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                🏥 Platform Health
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-sm">Active Streaks</p>
                  <p className="text-2xl font-bold text-green-400">{stats.health.users_with_active_streaks}</p>
                  <p className="text-xs text-gray-500">Users with 2+ day streaks this week</p>
                </div>
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-sm">Last Updated</p>
                  <p className="text-lg font-medium">{lastRefresh.toLocaleTimeString()}</p>
                  <p className="text-xs text-gray-500">{lastRefresh.toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <p className="text-center text-gray-600 text-sm mt-8">
          Puffed Admin Dashboard • {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

function ActionButton({ 
  icon, 
  label, 
  description, 
  loading, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  description: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="p-4 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg transition text-left disabled:opacity-50 group"
    >
      <div className="flex items-center gap-2 text-violet-400 mb-1 group-hover:text-violet-300">
        {loading ? <FiRefreshCw className="animate-spin" /> : icon}
        <span className="font-medium">{label}</span>
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </button>
  );
}

function StatCard({ icon, label, value, color }: { 
  icon: React.ReactNode; 
  label: string; 
  value: number | string;
  color: string;
}) {
  const bgColors: Record<string, string> = {
    blue: "from-blue-900/20 to-blue-800/10 border-blue-800/30",
    amber: "from-amber-900/20 to-amber-800/10 border-amber-800/30",
    green: "from-green-900/20 to-green-800/10 border-green-800/30",
    purple: "from-purple-900/20 to-purple-800/10 border-purple-800/30",
  };

  return (
    <div className={`bg-gradient-to-br ${bgColors[color] || bgColors.blue} rounded-xl p-4 border`}>
      <div className="flex items-center gap-2 text-gray-400 mb-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function MiniStat({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
      <span className="text-2xl">{emoji}</span>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
