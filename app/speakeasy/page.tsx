"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiHome,
  FiRefreshCw,
  FiLock,
  FiKey,
  FiStar,
  FiUsers,
  FiAward,
  FiClock,
} from "react-icons/fi";

interface EliteMember {
  username: string;
  totalSmokes: number;
  avgRating: number;
  signatureBrand: string | null;
}

interface SecretPick {
  brand: string;
  product: string | null;
  avgRating: number;
  eliteCount: number;
}

interface RecentElite {
  username: string;
  brand: string;
  product: string | null;
  rating: number;
  review: string | null;
  created_at: string;
}

interface SpeakeasyData {
  hasAccess: boolean;
  checkinsNeeded?: number;
  currentCheckins?: number;
  myMembership?: {
    rank: string;
    checkins: number;
    memberSince: string;
    secretName: string;
  };
  eliteMembers?: EliteMember[];
  secretPicks?: SecretPick[];
  recentElite?: RecentElite[];
  stats?: {
    totalMembers: number;
    memberCheckins: number;
    avgRating: number;
  };
  todayPassword?: string;
  todayQuote?: string;
}

export default function SpeakeasyPage() {
  const router = useRouter();
  const [data, setData] = useState<SpeakeasyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [knockCount, setKnockCount] = useState(0);
  const [doorOpening, setDoorOpening] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/speakeasy");
      if (res.ok) {
        const result = (await res.json()) as SpeakeasyData;
        setData(result);
      }
    } catch (err) {
      console.error("Failed to fetch speakeasy data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleKnock = () => {
    if (knockCount < 3) {
      setKnockCount(knockCount + 1);
      if (knockCount === 2) {
        setDoorOpening(true);
        setTimeout(() => setDoorOpening(false), 2000);
      }
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getRankEmoji = (rank: string) => {
    switch (rank) {
      case "Connoisseur":
        return "👑";
      case "Regular":
        return "🎩";
      case "Member":
        return "🥃";
      default:
        return "🚬";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-amber-950/20 to-zinc-950 flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-amber-500/50 text-6xl"
        >
          🥃
        </motion.div>
      </div>
    );
  }

  // Access denied - show locked door
  if (!data?.hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-amber-950/20 to-zinc-950 p-4">
        {/* Header */}
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Link href="/dashboard" className="text-amber-500/60 hover:text-amber-500">
              <FiHome size={20} />
            </Link>
            <h1 className="text-amber-500/40 text-sm tracking-[0.3em] uppercase">Unknown Location</h1>
            <div className="w-5" />
          </div>

          {/* Locked Door */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div
              className="bg-gradient-to-b from-amber-900/30 to-amber-950/50 border-2 border-amber-800/30 rounded-t-3xl p-8 text-center cursor-pointer"
              onClick={handleKnock}
            >
              {/* Door frame decoration */}
              <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-r from-transparent via-amber-700/20 to-transparent" />

              <motion.div
                animate={knockCount > 0 ? { scale: [1, 0.95, 1] } : {}}
                transition={{ duration: 0.2 }}
                className="mb-6"
              >
                <FiLock className="mx-auto text-amber-600/60" size={64} />
              </motion.div>

              <h2 className="text-amber-500 text-2xl font-serif mb-2">The Speakeasy</h2>
              <p className="text-amber-500/40 text-sm mb-6 italic">
                &quot;Some doors only open for those who&apos;ve proven themselves.&quot;
              </p>

              {/* Knock indicator */}
              <div className="flex justify-center gap-2 mb-6">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      i < knockCount ? "bg-amber-500" : "bg-amber-900/30"
                    }`}
                    animate={i < knockCount ? { scale: [1, 1.3, 1] } : {}}
                  />
                ))}
              </div>

              <p className="text-amber-500/60 text-xs">Tap to knock...</p>
            </div>

            {/* Entry requirements */}
            <div className="bg-zinc-900/80 border-2 border-t-0 border-amber-800/30 rounded-b-xl p-6">
              <div className="flex items-center gap-2 text-amber-500/80 mb-3">
                <FiKey size={16} />
                <span className="text-sm">Membership Requirements</span>
              </div>

              <div className="bg-amber-950/30 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-amber-500/60 text-sm">Your Check-ins</span>
                  <span className="text-amber-400 font-mono">
                    {data?.currentCheckins || 0} / 5
                  </span>
                </div>
                <div className="h-2 bg-amber-950/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${((data?.currentCheckins || 0) / 5) * 100}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>

              <p className="text-amber-500/40 text-xs text-center">
                {(data?.checkinsNeeded || 0) > 0
                  ? `Log ${data?.checkinsNeeded} more smoke${(data?.checkinsNeeded || 0) > 1 ? "s" : ""} to unlock access`
                  : "Verifying membership..."}
              </p>

              <Link
                href="/checkin"
                className="block mt-4 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/40 text-amber-400 text-center py-3 rounded-lg transition-colors"
              >
                Log a Smoke 🚬
              </Link>
            </div>
          </motion.div>

          <AnimatePresence>
            {doorOpening && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
              >
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-amber-500 text-xl font-serif italic"
                >
                  &quot;Not yet, friend. Earn your way in.&quot;
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Access granted - show speakeasy interior
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-amber-950/20 to-zinc-950 p-4">
      {/* Art deco corner decorations */}
      <div className="fixed top-0 left-0 w-32 h-32 opacity-20 pointer-events-none">
        <div className="absolute top-4 left-4 w-16 h-0.5 bg-gradient-to-r from-amber-500 to-transparent" />
        <div className="absolute top-4 left-4 w-0.5 h-16 bg-gradient-to-b from-amber-500 to-transparent" />
      </div>
      <div className="fixed top-0 right-0 w-32 h-32 opacity-20 pointer-events-none">
        <div className="absolute top-4 right-4 w-16 h-0.5 bg-gradient-to-l from-amber-500 to-transparent" />
        <div className="absolute top-4 right-4 w-0.5 h-16 bg-gradient-to-b from-amber-500 to-transparent" />
      </div>

      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard" className="text-amber-500/60 hover:text-amber-500">
            <FiHome size={20} />
          </Link>
          <h1 className="text-amber-500 text-lg tracking-[0.2em] font-serif">THE SPEAKEASY</h1>
          <button onClick={fetchData} className="text-amber-500/60 hover:text-amber-500">
            <FiRefreshCw size={18} />
          </button>
        </div>

        {/* Welcome card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-900/30 to-zinc-900/50 border border-amber-700/30 rounded-xl p-6 mb-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-amber-500/60 text-xs uppercase tracking-wider">Welcome back,</p>
              <h2 className="text-amber-400 text-2xl font-serif">
                {data.myMembership?.secretName || "Member"}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-2xl">{getRankEmoji(data.myMembership?.rank || "")}</span>
              <p className="text-amber-500/60 text-xs">{data.myMembership?.rank}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-amber-950/30 rounded-lg p-3 text-center">
              <p className="text-amber-400 text-xl font-mono">{data.myMembership?.checkins}</p>
              <p className="text-amber-500/50 text-xs">Check-ins</p>
            </div>
            <div className="bg-amber-950/30 rounded-lg p-3 text-center">
              <p className="text-amber-400 text-sm font-mono">{data.myMembership?.memberSince}</p>
              <p className="text-amber-500/50 text-xs">Member Since</p>
            </div>
          </div>

          {/* Today's password */}
          <div className="border-t border-amber-800/30 pt-4">
            <p className="text-amber-500/40 text-xs uppercase tracking-wider mb-1">
              Today&apos;s Password
            </p>
            <p className="text-amber-400 font-serif text-lg italic">&quot;{data.todayPassword}&quot;</p>
          </div>
        </motion.div>

        {/* Quote of the day */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/50 border border-amber-800/20 rounded-xl p-5 mb-6 text-center"
        >
          <p className="text-amber-500/70 text-sm italic font-serif leading-relaxed">
            &quot;{data.todayQuote}&quot;
          </p>
        </motion.div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-zinc-900/60 border border-amber-800/20 rounded-lg p-3 text-center">
            <FiUsers className="mx-auto text-amber-500/60 mb-1" size={18} />
            <p className="text-amber-400 font-mono">{data.stats?.totalMembers}</p>
            <p className="text-amber-500/40 text-[10px]">Members</p>
          </div>
          <div className="bg-zinc-900/60 border border-amber-800/20 rounded-lg p-3 text-center">
            <FiAward className="mx-auto text-amber-500/60 mb-1" size={18} />
            <p className="text-amber-400 font-mono">{data.stats?.memberCheckins}</p>
            <p className="text-amber-500/40 text-[10px]">Elite Smokes</p>
          </div>
          <div className="bg-zinc-900/60 border border-amber-800/20 rounded-lg p-3 text-center">
            <FiStar className="mx-auto text-amber-500/60 mb-1" size={18} />
            <p className="text-amber-400 font-mono">{data.stats?.avgRating?.toFixed(1)}</p>
            <p className="text-amber-500/40 text-[10px]">Avg Rating</p>
          </div>
        </div>

        {/* Elite Members */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-900/60 border border-amber-800/20 rounded-xl p-5 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🎩</span>
            <h3 className="text-amber-500 font-serif">The Inner Circle</h3>
          </div>

          <div className="space-y-3">
            {(data.eliteMembers || []).slice(0, 5).map((member, i) => (
              <div
                key={member.username}
                className="flex items-center justify-between bg-amber-950/20 rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-amber-500/60 font-mono text-sm w-5">
                    {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                  </span>
                  <div>
                    <p className="text-amber-400 text-sm">{member.username}</p>
                    <p className="text-amber-500/40 text-xs">
                      {member.signatureBrand || "Various"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-amber-400 font-mono text-sm">{member.totalSmokes}</p>
                  <p className="text-amber-500/40 text-xs">
                    ⭐ {member.avgRating?.toFixed(1)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Secret Picks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-zinc-900/60 border border-amber-800/20 rounded-xl p-5 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🔮</span>
            <h3 className="text-amber-500 font-serif">The Secret List</h3>
          </div>
          <p className="text-amber-500/40 text-xs mb-4 italic">
            Top picks from the elite — you won&apos;t find these on any public list.
          </p>

          <div className="space-y-3">
            {(data.secretPicks || []).map((pick, i) => (
              <div
                key={`${pick.brand}-${pick.product}`}
                className="flex items-center justify-between bg-amber-950/20 rounded-lg p-3"
              >
                <div>
                  <p className="text-amber-400 text-sm">{pick.brand}</p>
                  {pick.product && (
                    <p className="text-amber-500/40 text-xs">{pick.product}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-sm">
                    ⭐ {pick.avgRating?.toFixed(1)}
                  </span>
                  <span className="text-amber-500/30 text-xs">
                    ({pick.eliteCount})
                  </span>
                </div>
              </div>
            ))}
            {(!data.secretPicks || data.secretPicks.length === 0) && (
              <p className="text-amber-500/40 text-sm text-center py-4 italic">
                The list is being curated...
              </p>
            )}
          </div>
        </motion.div>

        {/* Recent Elite Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-zinc-900/60 border border-amber-800/20 rounded-xl p-5 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <FiClock className="text-amber-500/60" size={16} />
            <h3 className="text-amber-500 font-serif">Members Lounge</h3>
          </div>

          <div className="space-y-3">
            {(data.recentElite || []).slice(0, 5).map((activity, i) => (
              <div
                key={`${activity.username}-${activity.created_at}`}
                className="border-b border-amber-800/10 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-amber-400 text-sm">{activity.username}</span>
                  <span className="text-amber-500/40 text-xs">
                    {formatTime(activity.created_at)}
                  </span>
                </div>
                <p className="text-amber-500/60 text-xs">
                  {activity.brand}
                  {activity.product && ` - ${activity.product}`}
                  <span className="ml-2">⭐ {activity.rating}</span>
                </p>
                {activity.review && (
                  <p className="text-amber-500/40 text-xs mt-1 italic line-clamp-2">
                    &quot;{activity.review}&quot;
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-amber-500/30 text-xs italic font-serif">
            What happens in the Speakeasy, stays in the Speakeasy.
          </p>
        </div>
      </div>
    </div>
  );
}
