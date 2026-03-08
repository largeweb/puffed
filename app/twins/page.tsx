"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { FiUsers, FiClock, FiArrowLeft, FiUserPlus, FiCheck, FiSun, FiMoon, FiStar, FiMenu } from "react-icons/fi";
import Link from "next/link";
import MobileSidebar from "@/app/components/MobileSidebar";
import { useSidebar } from "@/hooks/useSidebar";

interface SmokeTwin {
  id: string;
  username: string;
  bio: string | null;
  checkin_count: number;
  similarity_score: number;
  peak_hour: number;
  peak_hour_label: string;
  common_hours: string[];
  is_following: boolean;
}

interface MyProfile {
  peakHour: number;
  peakHourLabel: string;
  category: string;
  totalSmokes: number;
  hourlyDistribution: number[];
}

interface TwinsResponse {
  twins: SmokeTwin[];
  myProfile: MyProfile;
}

function getMatchLevel(score: number): { label: string; color: string; emoji: string } {
  if (score >= 80) return { label: "Perfect Match", color: "text-pink-400", emoji: "💕" };
  if (score >= 60) return { label: "Great Match", color: "text-green-400", emoji: "🔥" };
  if (score >= 40) return { label: "Good Match", color: "text-blue-400", emoji: "👍" };
  return { label: "Similar", color: "text-gray-400", emoji: "🤝" };
}

function HourlyChart({ distribution, label }: { distribution: number[]; label: string }) {
  const max = Math.max(...distribution, 1);
  
  return (
    <div className="bg-gray-800/50 rounded-xl p-4">
      <h4 className="text-sm text-gray-400 mb-3">{label}</h4>
      <div className="flex items-end gap-1 h-16">
        {distribution.map((count, hour) => (
          <div
            key={hour}
            className="flex-1 min-w-0 relative group"
          >
            <div
              className={`w-full rounded-t transition-all ${
                count > 0 ? 'bg-gradient-to-t from-cyan-500 to-cyan-400' : 'bg-gray-700'
              }`}
              style={{ height: `${Math.max((count / max) * 100, count > 0 ? 10 : 2)}%` }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-gray-900 text-xs px-2 py-1 rounded whitespace-nowrap">
                {hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour-12}p`}: {count}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>12a</span>
        <span>6a</span>
        <span>12p</span>
        <span>6p</span>
        <span>12a</span>
      </div>
    </div>
  );
}

function TwinCard({ twin, onFollow }: { twin: SmokeTwin; onFollow: (id: string) => void }) {
  const [following, setFollowing] = useState(twin.is_following);
  const [loading, setLoading] = useState(false);
  const match = getMatchLevel(twin.similarity_score);

  const handleFollow = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: twin.id }),
      });
      if (res.ok) {
        setFollowing(!following);
        onFollow(twin.id);
      }
    } catch (error) {
      console.error("Follow error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl p-4 border border-cyan-500/20"
    >
      <div className="flex items-start justify-between mb-3">
        <Link href={`/user/${twin.username}`} className="flex-1">
          <h3 className="font-bold text-lg text-white hover:text-cyan-400 transition-colors">
            {twin.username}
          </h3>
          {twin.bio && (
            <p className="text-sm text-gray-400 line-clamp-1">{twin.bio}</p>
          )}
        </Link>
        <button
          onClick={handleFollow}
          disabled={loading}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            following
              ? 'bg-gray-700 text-gray-300'
              : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90'
          }`}
        >
          {loading ? '...' : following ? (
            <span className="flex items-center gap-1"><FiCheck /> Following</span>
          ) : (
            <span className="flex items-center gap-1"><FiUserPlus /> Follow</span>
          )}
        </button>
      </div>

      {/* Match Score */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative w-14 h-14">
          <svg className="w-14 h-14 -rotate-90">
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-gray-700"
            />
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="url(#matchGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${twin.similarity_score * 1.5} 150`}
            />
            <defs>
              <linearGradient id="matchGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
            {twin.similarity_score}%
          </span>
        </div>
        <div>
          <span className={`text-lg font-semibold ${match.color}`}>
            {match.emoji} {match.label}
          </span>
          <p className="text-sm text-gray-400">
            Peak smoking: {twin.peak_hour_label}
          </p>
        </div>
      </div>

      {/* Common Hours */}
      {twin.common_hours.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-gray-500">You both smoke around:</span>
          {twin.common_hours.map((hour) => (
            <span
              key={hour}
              className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full text-xs"
            >
              {hour}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between text-sm text-gray-400">
        <span>{twin.checkin_count} check-ins</span>
        <Link
          href={`/user/${twin.username}`}
          className="text-cyan-400 hover:underline"
        >
          View Profile →
        </Link>
      </div>
    </motion.div>
  );
}

export default function SmokeTwinsPage() {
  const { sidebarOpen, setSidebarOpen, currentUser, unreadCount, handleLogout } = useSidebar();
  const [data, setData] = useState<TwinsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTwins();
  }, []);

  const fetchTwins = async () => {
    try {
      const res = await fetch("/api/smoke-twins");
      if (!res.ok) throw new Error("Failed to load");
      const data: TwinsResponse = await res.json();
      setData(data);
    } catch (err) {
      setError("Failed to find your smoke twins");
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = (id: string) => {
    if (data) {
      setData({
        ...data,
        twins: data.twins.map(t =>
          t.id === id ? { ...t, is_following: !t.is_following } : t
        )
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black p-4">
        <div className="max-w-md mx-auto text-center py-20">
          <p className="text-gray-400">{error}</p>
          <Link href="/dashboard" className="text-cyan-400 hover:underline mt-4 inline-block">
            ← Back to Dashboard
          </Link>
        </div>
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20 border-b border-gray-800">
        <div className="max-w-lg mx-auto px-4 py-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-4"
          >
            <FiMenu className="mr-2" size={20} /> Menu
          </button>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-4xl">👯</span>
              Smoke Time Twins
            </h1>
            <p className="text-gray-400 mt-2">
              Find people who smoke at the same times as you
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Your Profile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl p-4 border border-cyan-500/30"
        >
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <FiClock className="text-cyan-400" /> Your Smoking Schedule
          </h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">
                {data.myProfile.category.split(' ')[0]}
              </div>
              <div className="text-sm text-gray-400">You're a</div>
              <div className="text-cyan-400 font-semibold">
                {data.myProfile.category.split(' ').slice(1).join(' ')}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">
                {data.myProfile.peakHourLabel}
              </div>
              <div className="text-sm text-gray-400">Peak Hour</div>
              <div className="text-cyan-400 font-semibold">
                {data.myProfile.totalSmokes} total smokes
              </div>
            </div>
          </div>

          {data.myProfile.hourlyDistribution && (
            <HourlyChart
              distribution={data.myProfile.hourlyDistribution}
              label="Your 24-Hour Smoke Pattern"
            />
          )}
        </motion.div>

        {/* Twins List */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FiUsers className="text-cyan-400" />
            Your Smoke Twins
            <span className="text-sm font-normal text-gray-400">
              ({data.twins.length} found)
            </span>
          </h2>

          {data.twins.length === 0 ? (
            <div className="bg-gray-800/50 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No twins found yet
              </h3>
              <p className="text-gray-400 text-sm">
                Log more smokes to find people with similar schedules!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.twins.map((twin, index) => (
                <motion.div
                  key={twin.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <TwinCard twin={twin} onFollow={handleFollow} />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="bg-gray-800/30 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-400">
            💡 <strong className="text-gray-300">Tip:</strong> Smoke twins share similar
            schedules — great for finding buddies who're online when you are!
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
