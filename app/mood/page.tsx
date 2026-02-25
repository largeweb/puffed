'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiHeart, FiTrendingUp, FiClock, FiUsers, FiZap } from 'react-icons/fi';
import { MOOD_TAGS, getMoodTag } from '@/lib/moods';

interface MoodInsight {
  mood: string;
  emoji: string;
  label: string;
  count: number;
  percentage: number;
  topBrand: string | null;
  avgRating: number | null;
}

interface MoodShift {
  from: { mood: string; emoji: string; label: string };
  to: { mood: string; emoji: string; label: string };
}

interface MoodByTime {
  period: string;
  emoji: string;
  moods: { mood: string; emoji: string; label: string; count: number }[];
}

interface PlatformMood {
  mood: string;
  emoji: string;
  label: string;
  count: number;
  percentage: number;
}

interface MoodData {
  moods: MoodInsight[];
  totalWithMood: number;
  insight: string;
  moodShift: MoodShift | null;
  topMood: MoodInsight | null;
  recentMood: string | null;
  moodByTimeOfDay?: MoodByTime[];
  platformMoods?: PlatformMood[];
}

export default function MoodPage() {
  const [data, setData] = useState<MoodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'yours' | 'time' | 'community'>('yours');

  useEffect(() => {
    Promise.all([
      fetch('/api/mood-stats').then(r => r.json() as Promise<Partial<MoodData>>),
      fetch('/api/mood-analytics').then(r => r.json() as Promise<Partial<MoodData>>).catch(() => ({} as Partial<MoodData>))
    ])
      .then(([moodStats, analytics]) => {
        setData({ ...moodStats, ...analytics } as MoodData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-slate-900 to-black p-4">
        <div className="animate-pulse text-center py-20">
          <div className="text-4xl mb-4">🎭</div>
          <div className="text-purple-400">Analyzing your moods...</div>
        </div>
      </div>
    );
  }

  const { moods = [], totalWithMood = 0, insight, moodShift, topMood, moodByTimeOfDay = [], platformMoods = [] } = data || {};

  // Calculate max count for bar widths
  const maxCount = Math.max(...moods.map(m => m.count), 1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-slate-900 to-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-purple-900/80 backdrop-blur-md border-b border-purple-700/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/dashboard" className="text-purple-400 hover:text-purple-300">
            <FiArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-white flex items-center gap-2">
              🎭 Mood Analytics
            </h1>
            <p className="text-xs text-purple-400">How you feel when you smoke</p>
          </div>
          <Link href="/checkin" className="bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded-lg text-sm font-medium">
            Log Smoke
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Insight Banner */}
        {insight && (
          <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{topMood?.emoji || '🎭'}</div>
              <div>
                <p className="text-white font-medium">{insight}</p>
                {moodShift && (
                  <p className="text-sm text-purple-300 mt-1">
                    Recent shift: {moodShift.from.emoji} → {moodShift.to.emoji} {moodShift.to.label}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-purple-500/20">
            <div className="text-2xl font-bold text-purple-400">{totalWithMood}</div>
            <div className="text-xs text-slate-400">Moods Logged</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-purple-500/20">
            <div className="text-2xl font-bold text-purple-400">{moods.length}</div>
            <div className="text-xs text-slate-400">Different Moods</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-purple-500/20">
            <div className="text-2xl">{topMood?.emoji || '❓'}</div>
            <div className="text-xs text-slate-400">Top Mood</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('yours')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'yours' 
                ? 'bg-purple-600 text-white' 
                : 'bg-slate-800/50 text-slate-400 hover:text-white'
            }`}
          >
            <FiHeart size={16} /> Your Moods
          </button>
          <button
            onClick={() => setActiveTab('time')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'time' 
                ? 'bg-purple-600 text-white' 
                : 'bg-slate-800/50 text-slate-400 hover:text-white'
            }`}
          >
            <FiClock size={16} /> By Time
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'community' 
                ? 'bg-purple-600 text-white' 
                : 'bg-slate-800/50 text-slate-400 hover:text-white'
            }`}
          >
            <FiUsers size={16} /> Community
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'yours' && (
          <div className="space-y-4">
            {moods.length === 0 ? (
              <div className="bg-slate-800/50 rounded-xl p-8 text-center border border-purple-500/20">
                <div className="text-4xl mb-3">🎭</div>
                <p className="text-white font-medium mb-2">No moods logged yet!</p>
                <p className="text-sm text-slate-400 mb-4">
                  Start adding moods to your check-ins to see your emotional smoking patterns.
                </p>
                <Link 
                  href="/checkin"
                  className="inline-block bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Log Your First Mood
                </Link>
              </div>
            ) : (
              <>
                {/* Mood Distribution */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-purple-500/20">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <FiTrendingUp className="text-purple-400" /> Mood Distribution
                  </h3>
                  <div className="space-y-3">
                    {moods.map((mood) => {
                      const moodTag = getMoodTag(mood.mood);
                      return (
                        <div key={mood.mood} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{mood.emoji}</span>
                              <span className="text-white text-sm">{mood.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 text-sm">{mood.count}×</span>
                              <span className="text-purple-400 text-sm font-medium">{mood.percentage}%</span>
                            </div>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${moodTag?.color.split(' ')[0] || 'bg-purple-500'}`}
                              style={{ width: `${(mood.count / maxCount) * 100}%` }}
                            />
                          </div>
                          {mood.topBrand && (
                            <p className="text-xs text-slate-500">
                              Go-to brand: <span className="text-purple-400">{mood.topBrand}</span>
                              {mood.avgRating && <span className="ml-1">⭐ {mood.avgRating}</span>}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mood-Brand Combos */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-purple-500/20">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <FiZap className="text-purple-400" /> Mood-Brand Combos
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {moods.filter(m => m.topBrand).slice(0, 6).map((mood) => (
                      <div 
                        key={mood.mood}
                        className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{mood.emoji}</span>
                          <span className="text-sm text-slate-300">{mood.label}</span>
                        </div>
                        <div className="text-xs text-purple-400 truncate">
                          → {mood.topBrand}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'time' && (
          <div className="space-y-4">
            {moodByTimeOfDay.length === 0 ? (
              <div className="bg-slate-800/50 rounded-xl p-8 text-center border border-purple-500/20">
                <div className="text-4xl mb-3">⏰</div>
                <p className="text-white font-medium mb-2">Not enough data yet!</p>
                <p className="text-sm text-slate-400">
                  Keep logging moods to see how your smoking mood changes throughout the day.
                </p>
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-purple-500/20">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <FiClock className="text-purple-400" /> Mood by Time of Day
                </h3>
                <div className="space-y-4">
                  {moodByTimeOfDay.map((timeSlot) => (
                    <div key={timeSlot.period} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{timeSlot.emoji}</span>
                        <span className="text-white font-medium">{timeSlot.period}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 ml-7">
                        {timeSlot.moods.length > 0 ? (
                          timeSlot.moods.map((m) => (
                            <span 
                              key={m.mood}
                              className="px-2 py-1 bg-slate-700/50 rounded-full text-xs text-slate-300 flex items-center gap-1"
                            >
                              {m.emoji} {m.label} ({m.count})
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">No data yet</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time Tips */}
            <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-xl p-4 border border-purple-500/30">
              <h4 className="text-white font-medium mb-2">💡 Did you know?</h4>
              <p className="text-sm text-slate-300">
                Many cigar lovers find their mood influences their smoke choice. Morning smokes tend to be contemplative, 
                while evening sessions are often more social or celebratory!
              </p>
            </div>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="space-y-4">
            {platformMoods.length === 0 ? (
              <div className="bg-slate-800/50 rounded-xl p-8 text-center border border-purple-500/20">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-white font-medium mb-2">Community data loading...</p>
                <p className="text-sm text-slate-400">
                  See how your moods compare to the community!
                </p>
              </div>
            ) : (
              <>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-purple-500/20">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <FiUsers className="text-purple-400" /> Community Mood Vibe
                  </h3>
                  <div className="space-y-3">
                    {platformMoods.slice(0, 8).map((mood, i) => (
                      <div key={mood.mood} className="flex items-center gap-3">
                        <span className="text-lg w-8">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : mood.emoji}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-white text-sm">{mood.label}</span>
                            <span className="text-purple-400 text-sm">{mood.percentage}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                              style={{ width: `${mood.percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Your vs Community comparison */}
                {topMood && platformMoods.length > 0 && (
                  <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl p-4 border border-purple-500/30">
                    <h4 className="text-white font-medium mb-3">🔮 You vs Community</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-3xl mb-1">{topMood.emoji}</div>
                        <div className="text-sm text-white">{topMood.label}</div>
                        <div className="text-xs text-slate-400">Your top mood</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl mb-1">{platformMoods[0].emoji}</div>
                        <div className="text-sm text-white">{platformMoods[0].label}</div>
                        <div className="text-xs text-slate-400">Community favorite</div>
                      </div>
                    </div>
                    {topMood.mood === platformMoods[0].mood ? (
                      <p className="text-sm text-purple-300 text-center mt-3">
                        🎯 You&apos;re in sync with the community vibe!
                      </p>
                    ) : (
                      <p className="text-sm text-purple-300 text-center mt-3">
                        ✨ You march to your own rhythm!
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Browse All Moods */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-purple-500/20">
          <h3 className="font-semibold text-white mb-3">All Moods</h3>
          <div className="flex flex-wrap gap-2">
            {MOOD_TAGS.map((mood) => {
              const userMood = moods.find(m => m.mood === mood.id);
              return (
                <span 
                  key={mood.id}
                  className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1 ${
                    userMood 
                      ? mood.color
                      : 'bg-slate-700/50 text-slate-500'
                  }`}
                >
                  {mood.emoji} {mood.label}
                  {userMood && <span className="text-xs opacity-70">({userMood.count})</span>}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
