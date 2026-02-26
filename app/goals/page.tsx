'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiTarget, FiUsers, FiArrowLeft, FiTrendingUp, FiCheckCircle } from 'react-icons/fi';

interface CommunityGoal {
  id: string;
  name: string;
  description: string;
  icon: string;
  target: number;
  current: number;
  category: 'checkins' | 'social' | 'discovery' | 'engagement';
}

interface GoalsData {
  goals: CommunityGoal[];
  summary: {
    completedGoals: number;
    totalGoals: number;
    overallProgress: number;
    daysRemaining: number;
    encouragement: string;
    weekStart: string;
    weekEnd: string;
  };
  contributors: {
    totalUsers: number;
    newThisWeek: number;
  };
}

const categoryColors = {
  checkins: 'from-amber-500 to-orange-500',
  social: 'from-pink-500 to-rose-500',
  discovery: 'from-cyan-500 to-blue-500',
  engagement: 'from-purple-500 to-violet-500',
};

const categoryBgColors = {
  checkins: 'bg-amber-500/20 border-amber-500/30',
  social: 'bg-pink-500/20 border-pink-500/30',
  discovery: 'bg-cyan-500/20 border-cyan-500/30',
  engagement: 'bg-purple-500/20 border-purple-500/30',
};

export default function CommunityGoalsPage() {
  const [data, setData] = useState<GoalsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/community-goals')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Loading community goals...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-zinc-400">Failed to load goals</div>
      </div>
    );
  }

  const { goals, summary, contributors } = data;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6">
        <div className="max-w-lg mx-auto">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 text-sm">
            <FiArrowLeft /> Back to Dashboard
          </Link>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <FiTarget className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Community Goals</h1>
              <p className="text-white/80 text-sm">Together we achieve more 🤝</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Overall Progress Card */}
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FiTrendingUp className="text-emerald-400" />
              <span className="font-semibold">This Week&apos;s Progress</span>
            </div>
            <span className="text-sm text-zinc-400">{summary.daysRemaining} days left</span>
          </div>
          
          {/* Big progress ring */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-zinc-800"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="url(#progressGradient)"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${summary.overallProgress * 3.52} 352`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{summary.overallProgress}%</span>
                <span className="text-xs text-zinc-400">{summary.completedGoals}/{summary.totalGoals} done</span>
              </div>
            </div>
          </div>
          
          {/* Encouragement */}
          <p className="text-center text-emerald-400 font-medium">{summary.encouragement}</p>
          
          {/* Contributors */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <FiUsers className="text-cyan-400" />
              <span>{contributors.totalUsers} contributors</span>
            </div>
            {contributors.newThisWeek > 0 && (
              <div className="text-sm text-emerald-400">
                +{contributors.newThisWeek} new this week!
              </div>
            )}
          </div>
        </div>

        {/* Individual Goals */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>🎯</span> Weekly Goals
          </h2>
          
          {goals.map((goal) => {
            const progress = Math.min((goal.current / goal.target) * 100, 100);
            const isComplete = goal.current >= goal.target;
            
            return (
              <div 
                key={goal.id}
                className={`relative overflow-hidden rounded-xl border p-4 ${categoryBgColors[goal.category]}`}
              >
                {/* Completion badge */}
                {isComplete && (
                  <div className="absolute top-3 right-3">
                    <FiCheckCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                )}
                
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{goal.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold">{goal.name}</h3>
                    <p className="text-sm text-zinc-400">{goal.description}</p>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full bg-gradient-to-r ${categoryColors[goal.category]} transition-all duration-500`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                
                {/* Stats */}
                <div className="flex items-center justify-between text-sm">
                  <span className={isComplete ? 'text-emerald-400 font-medium' : 'text-zinc-400'}>
                    {goal.current} / {goal.target}
                  </span>
                  <span className={isComplete ? 'text-emerald-400' : 'text-zinc-500'}>
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border border-emerald-500/30 rounded-xl p-4 text-center">
          <p className="text-sm text-zinc-300 mb-3">
            Every smoke, like, and comment helps the community reach our goals! 🌟
          </p>
          <Link 
            href="/checkin"
            className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full font-medium hover:opacity-90 transition"
          >
            Log a Smoke 🚬
          </Link>
        </div>

        {/* Week info */}
        <p className="text-center text-xs text-zinc-500">
          Week: {new Date(summary.weekStart).toLocaleDateString()} - {new Date(summary.weekEnd).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
