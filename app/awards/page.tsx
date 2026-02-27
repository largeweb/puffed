"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiAward, FiCalendar, FiTrendingUp } from "react-icons/fi";

interface Award {
  id: string;
  title: string;
  emoji: string;
  description: string;
  value?: string | number;
  tier: 'gold' | 'silver' | 'bronze' | 'special';
}

interface AwardsResponse {
  awards: Award[];
  weekStart: string;
  totalCheckinsThisWeek: number;
}

const tierColors = {
  gold: 'from-yellow-400 via-amber-300 to-yellow-500 text-yellow-900',
  silver: 'from-gray-300 via-slate-200 to-gray-400 text-gray-800',
  bronze: 'from-orange-400 via-amber-600 to-orange-500 text-orange-900',
  special: 'from-purple-400 via-fuchsia-400 to-purple-500 text-purple-900'
};

const tierBorders = {
  gold: 'border-yellow-400 shadow-yellow-400/30',
  silver: 'border-gray-300 shadow-gray-400/30',
  bronze: 'border-orange-400 shadow-orange-400/30',
  special: 'border-purple-400 shadow-purple-400/30'
};

const tierGlow = {
  gold: 'shadow-[0_0_20px_rgba(251,191,36,0.4)]',
  silver: 'shadow-[0_0_20px_rgba(156,163,175,0.4)]',
  bronze: 'shadow-[0_0_20px_rgba(251,146,60,0.4)]',
  special: 'shadow-[0_0_20px_rgba(192,132,252,0.4)]'
};

export default function AwardsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [awards, setAwards] = useState<Award[]>([]);
  const [weekStart, setWeekStart] = useState<string>("");
  const [totalCheckins, setTotalCheckins] = useState(0);

  useEffect(() => {
    loadAwards();
  }, []);

  const loadAwards = async () => {
    try {
      const res = await fetch("/api/smoke-awards");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/");
          return;
        }
        throw new Error("Failed to load");
      }
      const data: AwardsResponse = await res.json();
      setAwards(data.awards);
      setWeekStart(data.weekStart);
      setTotalCheckins(data.totalCheckinsThisWeek);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatWeekRange = (startDate: string) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const goldAwards = awards.filter(a => a.tier === 'gold');
  const silverAwards = awards.filter(a => a.tier === 'silver');
  const bronzeAwards = awards.filter(a => a.tier === 'bronze');

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-amber-950/20 to-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-gray-900/80 border-b border-amber-800/30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <FiArrowLeft className="text-xl" />
            </Link>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <FiAward className="text-amber-400" />
                Smoke Awards
              </h1>
              <p className="text-xs text-gray-400">Your Weekly Achievements</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Week Banner */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-amber-600/30 to-orange-600/30 rounded-xl p-4 border border-amber-500/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FiCalendar className="text-2xl text-amber-400" />
                  <div>
                    <p className="text-sm text-amber-300/80">This Week</p>
                    <p className="font-bold">{weekStart ? formatWeekRange(weekStart) : '...'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-amber-300/80">Total Smokes</p>
                  <p className="text-2xl font-bold text-amber-400">{totalCheckins}</p>
                </div>
              </div>
            </motion.div>

            {awards.length === 0 ? (
              /* No Awards Yet */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-xl font-bold text-gray-300 mb-2">No Awards Yet</h2>
                <p className="text-gray-500 mb-6">
                  Log some smokes this week to earn your first awards!
                </p>
                <Link 
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-lg font-medium transition-colors"
                >
                  <FiTrendingUp /> Start Logging
                </Link>
              </motion.div>
            ) : (
              <>
                {/* Trophy Count */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex justify-center gap-6"
                >
                  <div className="text-center">
                    <span className="text-3xl">🥇</span>
                    <p className="font-bold text-yellow-400">{goldAwards.length}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-3xl">🥈</span>
                    <p className="font-bold text-gray-300">{silverAwards.length}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-3xl">🥉</span>
                    <p className="font-bold text-orange-400">{bronzeAwards.length}</p>
                  </div>
                </motion.div>

                {/* Awards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {awards.map((award, index) => (
                    <motion.div
                      key={award.id}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      className={`relative overflow-hidden rounded-xl border-2 ${tierBorders[award.tier]} ${tierGlow[award.tier]}`}
                    >
                      {/* Gradient Background */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${tierColors[award.tier]} opacity-10`} />
                      
                      {/* Content */}
                      <div className="relative p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-4xl">{award.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white truncate">{award.title}</h3>
                              {award.tier === 'gold' && <span className="text-xs">🥇</span>}
                              {award.tier === 'silver' && <span className="text-xs">🥈</span>}
                              {award.tier === 'bronze' && <span className="text-xs">🥉</span>}
                            </div>
                            <p className="text-sm text-gray-400 truncate">{award.description}</p>
                            {award.value && (
                              <p className={`text-lg font-bold mt-1 ${
                                award.tier === 'gold' ? 'text-yellow-400' :
                                award.tier === 'silver' ? 'text-gray-300' :
                                award.tier === 'bronze' ? 'text-orange-400' :
                                'text-purple-400'
                              }`}>
                                {award.value}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Shine Effect for Gold */}
                      {award.tier === 'gold' && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                          initial={{ x: '-100%' }}
                          animate={{ x: '200%' }}
                          transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            repeatDelay: 3
                          }}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Motivational Footer */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center py-6"
                >
                  <p className="text-gray-500 text-sm">
                    {goldAwards.length >= 3 
                      ? "🏆 Legendary week! You're on fire!" 
                      : goldAwards.length >= 1 
                        ? "⭐ Great work! Keep chasing gold!"
                        : "📈 Keep logging to earn gold awards!"}
                  </p>
                </motion.div>
              </>
            )}

            {/* Quick Links */}
            <div className="flex gap-3 justify-center pt-4">
              <Link
                href="/achievements"
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                🏅 All-Time Badges
              </Link>
              <Link
                href="/mystats"
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                📊 My Stats
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
