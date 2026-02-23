"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FiActivity, FiUsers, FiTrendingUp, FiHeart, FiHome, 
  FiAward, FiZap, FiStar, FiMessageCircle, FiUserPlus,
  FiClock, FiTarget
} from "react-icons/fi";
import { getFlavorTag } from "@/lib/flavors";

interface PulseData {
  totalUsers: number;
  totalCheckins: number;
  totalLikes: number;
  totalFollows: number;
  totalComments: number;
  totalReactions: number;
  uniqueBrands: number;
  
  weekUsers: number;
  weekCheckins: number;
  weekLikes: number;
  weekFollows: number;
  
  userGrowthPercent: number;
  checkinGrowthPercent: number;
  
  milestones: {
    type: 'users' | 'checkins' | 'brands' | 'likes';
    value: number;
    reached: boolean;
    label: string;
  }[];
  
  hotBrands: {
    brand: string;
    weekCount: number;
    trend: 'up' | 'same' | 'down' | 'new';
  }[];
  
  newMembers: {
    username: string;
    joinedAgo: string;
    checkinCount: number;
  }[];
  
  activityPulse: {
    type: 'checkin' | 'like' | 'follow' | 'comment' | 'reaction';
    count: number;
    label: string;
  }[];
  
  avgRating: number;
  topFlavor: string | null;
  mostActiveHour: number;
}

const TREND_ICONS = {
  up: '📈',
  down: '📉',
  same: '➡️',
  new: '🆕'
};

const MILESTONE_ICONS = {
  users: '👥',
  checkins: '🚬',
  brands: '🏷️',
  likes: '❤️'
};

function StatCard({ 
  icon, 
  label, 
  value, 
  weekValue, 
  growth, 
  color = "amber" 
}: { 
  icon: React.ReactNode;
  label: string;
  value: number;
  weekValue?: number;
  growth?: number;
  color?: string;
}) {
  const colorClasses = {
    amber: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
    pink: "from-pink-500/20 to-pink-600/10 border-pink-500/30",
    cyan: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
    green: "from-green-500/20 to-green-600/10 border-green-500/30",
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
  }[color] || "from-amber-500/20 to-amber-600/10 border-amber-500/30";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-gradient-to-br ${colorClasses} border rounded-2xl p-4`}
    >
      <div className="flex items-center gap-2 text-gray-400 mb-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value.toLocaleString()}</div>
      {weekValue !== undefined && (
        <div className="flex items-center gap-2 mt-1 text-sm">
          <span className="text-gray-400">+{weekValue} this week</span>
          {growth !== undefined && growth !== 0 && (
            <span className={growth > 0 ? "text-green-400" : "text-red-400"}>
              {growth > 0 ? "↑" : "↓"}{Math.abs(growth)}%
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

function MilestoneProgress({ milestones, totalUsers, totalCheckins, uniqueBrands, totalLikes }: { 
  milestones: PulseData['milestones'];
  totalUsers: number;
  totalCheckins: number;
  uniqueBrands: number;
  totalLikes: number;
}) {
  // Find next milestone for each type
  const nextMilestones = ['users', 'checkins', 'brands', 'likes'].map(type => {
    const typeMilestones = milestones.filter(m => m.type === type);
    const next = typeMilestones.find(m => !m.reached);
    const current = type === 'users' ? totalUsers : 
                   type === 'checkins' ? totalCheckins : 
                   type === 'brands' ? uniqueBrands : totalLikes;
    return next ? { ...next, current, type } : null;
  }).filter(Boolean);

  if (nextMilestones.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5"
    >
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <FiTarget className="text-purple-400" />
        Next Milestones
      </h3>
      <div className="space-y-4">
        {nextMilestones.map((m: any) => {
          const progress = Math.min(100, (m.current / m.value) * 100);
          return (
            <div key={`${m.type}-${m.value}`}>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-1">
                  {MILESTONE_ICONS[m.type as keyof typeof MILESTONE_ICONS]} {m.label}
                </span>
                <span className="text-gray-400">{m.current}/{m.value}</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function PulsePage() {
  const [data, setData] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPulse() {
      try {
        const res = await fetch("/api/pulse");
        if (res.ok) {
          setData(await res.json());
        }
      } catch (error) {
        console.error("Failed to load pulse:", error);
      } finally {
        setLoading(false);
      }
    }
    loadPulse();
  }, []);

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse flex items-center gap-2">
              <FiActivity className="text-2xl text-amber-500 animate-spin" />
              <span className="text-gray-400">Loading pulse...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <div className="max-w-4xl mx-auto text-center py-20">
          <p className="text-gray-400">Failed to load pulse data</p>
        </div>
      </div>
    );
  }

  const topFlavor = data.topFlavor ? getFlavorTag(data.topFlavor) : null;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10"
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
              <FiHome size={20} />
            </Link>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FiActivity className="text-pink-500" />
              Platform Pulse
            </h1>
            <div className="w-10" />
          </div>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Hero Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-pink-500/20 via-purple-500/10 to-cyan-500/20 border border-pink-500/30 rounded-3xl p-6"
        >
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-2">🔥 Puffed is Growing</h2>
            <p className="text-gray-400">Real-time community stats</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-4xl font-bold text-pink-400">{data.totalUsers}</div>
              <div className="text-sm text-gray-400">smokers</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-amber-400">{data.totalCheckins}</div>
              <div className="text-sm text-gray-400">smokes logged</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-400">{data.uniqueBrands}</div>
              <div className="text-sm text-gray-400">unique brands</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400">{data.totalLikes + data.totalReactions}</div>
              <div className="text-sm text-gray-400">engagements</div>
            </div>
          </div>
        </motion.div>

        {/* This Week Activity */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard 
            icon={<FiUsers size={16} />}
            label="New Smokers"
            value={data.weekUsers}
            color="pink"
          />
          <StatCard 
            icon={<FiZap size={16} />}
            label="Smokes Logged"
            value={data.weekCheckins}
            color="amber"
          />
          <StatCard 
            icon={<FiHeart size={16} />}
            label="Likes Given"
            value={data.weekLikes}
            color="pink"
          />
          <StatCard 
            icon={<FiUserPlus size={16} />}
            label="New Follows"
            value={data.weekFollows}
            color="cyan"
          />
        </div>

        {/* Milestone Progress */}
        <MilestoneProgress 
          milestones={data.milestones}
          totalUsers={data.totalUsers}
          totalCheckins={data.totalCheckins}
          uniqueBrands={data.uniqueBrands}
          totalLikes={data.totalLikes}
        />

        {/* 24h Activity Pulse */}
        {data.activityPulse.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-5"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              Last 24 Hours
            </h3>
            <div className="flex flex-wrap gap-3">
              {data.activityPulse.map((a, i) => (
                <div 
                  key={i}
                  className="bg-white/5 rounded-xl px-4 py-2 flex items-center gap-2"
                >
                  <span className="text-2xl font-bold text-amber-400">{a.count}</span>
                  <span className="text-gray-400 text-sm">{a.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Hot Brands */}
          {data.hotBrands.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass rounded-2xl p-5"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FiTrendingUp className="text-orange-400" />
                Hot This Week
              </h3>
              <div className="space-y-3">
                {data.hotBrands.map((brand, i) => (
                  <Link 
                    key={brand.brand}
                    href={`/cigar/${encodeURIComponent(brand.brand)}`}
                    className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🚬'}</span>
                      <span className="font-medium">{brand.brand}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">{brand.weekCount} logs</span>
                      <span>{TREND_ICONS[brand.trend]}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* New Members */}
          {data.newMembers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass rounded-2xl p-5"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FiUserPlus className="text-green-400" />
                Welcome New Smokers
              </h3>
              <div className="space-y-3">
                {data.newMembers.map((member) => (
                  <Link 
                    key={member.username}
                    href={`/user/${member.username}`}
                    className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">👋</span>
                      <div>
                        <span className="font-medium">@{member.username}</span>
                        <span className="text-gray-500 text-sm ml-2">joined {member.joinedAgo}</span>
                      </div>
                    </div>
                    <span className="text-sm text-gray-400">
                      {member.checkinCount} smoke{member.checkinCount !== 1 ? 's' : ''}
                    </span>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Platform Vibe */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiStar className="text-amber-400" />
            Platform Vibe
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-amber-500/10 rounded-xl p-4">
              <div className="text-2xl mb-1">⭐</div>
              <div className="text-xl font-bold text-amber-400">{data.avgRating || '—'}</div>
              <div className="text-xs text-gray-400">avg rating</div>
            </div>
            {topFlavor && (
              <div className="bg-cyan-500/10 rounded-xl p-4">
                <div className="text-2xl mb-1">{topFlavor.emoji}</div>
                <div className="text-xl font-bold text-cyan-400">{topFlavor.label}</div>
                <div className="text-xs text-gray-400">top flavor</div>
              </div>
            )}
            <div className="bg-purple-500/10 rounded-xl p-4">
              <div className="text-2xl mb-1">🕐</div>
              <div className="text-xl font-bold text-purple-400">{formatHour(data.mostActiveHour)}</div>
              <div className="text-xs text-gray-400">peak hour</div>
            </div>
          </div>
        </motion.div>

        {/* Join CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-6 text-center"
        >
          <h3 className="text-xl font-bold mb-2">Be Part of the Community</h3>
          <p className="text-gray-400 mb-4">Join {data.totalUsers} smokers sharing their journey</p>
          <div className="flex gap-3 justify-center">
            <Link 
              href="/login" 
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors"
            >
              Sign Up Free
            </Link>
            <Link 
              href="/discover" 
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
            >
              Explore First
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
