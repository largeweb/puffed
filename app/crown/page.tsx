'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiAward, FiTrendingUp, FiClock, FiStar, FiHeart, FiMessageCircle, FiCamera } from 'react-icons/fi';

interface CrownCandidate {
  userId: number;
  username: string;
  avatarUrl: string | null;
  checkins: number;
  avgRating: number;
  likesReceived: number;
  commentsReceived: number;
  photosPosted: number;
  score: number;
}

interface PastChampion {
  date: string;
  userId: number;
  username: string;
  avatarUrl: string | null;
  score: number;
  checkins: number;
  crownType: string;
}

interface TodayLeader {
  userId: number;
  username: string;
  avatarUrl: string | null;
  checkins: number;
  score: number;
}

interface CrownData {
  champion: CrownCandidate | null;
  crownType: string;
  runnerUp: CrownCandidate | null;
  honorable: CrownCandidate[];
  todayLeaders: TodayLeader[];
  pastChampions: PastChampion[];
  userCrownCount: number;
  isCurrentChampion: boolean;
  crownStats: {
    totalCrownings: number;
    mostCrowned: { username: string; count: number } | null;
    avgWinningScore: number;
  };
  yesterdayDate: string;
}

const CROWN_TYPES: Record<string, { emoji: string; title: string; color: string; desc: string }> = {
  popular: { emoji: '👑', title: 'Popular Crown', color: 'from-pink-500 to-rose-600', desc: 'Most loved by the community' },
  connoisseur: { emoji: '🎖️', title: 'Connoisseur Crown', color: 'from-amber-500 to-yellow-600', desc: 'Quality over quantity' },
  chronicler: { emoji: '📸', title: 'Chronicler Crown', color: 'from-purple-500 to-violet-600', desc: 'Visual storyteller' },
  dedicated: { emoji: '🔥', title: 'Dedication Crown', color: 'from-orange-500 to-red-600', desc: 'Passion and commitment' },
  social: { emoji: '💬', title: 'Social Crown', color: 'from-cyan-500 to-blue-600', desc: 'Conversation starter' },
  champion: { emoji: '🏆', title: 'Champion Crown', color: 'from-amber-400 to-amber-600', desc: 'All-around excellence' },
  empty: { emoji: '⭕', title: 'Unclaimed', color: 'from-gray-500 to-gray-600', desc: 'Throne awaits' }
};

function CrownIcon({ type, size = 'lg' }: { type: string; size?: 'sm' | 'md' | 'lg' }) {
  const crown = CROWN_TYPES[type] || CROWN_TYPES.champion;
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl'
  };
  return <span className={sizeClasses[size]}>{crown.emoji}</span>;
}

export default function CrownPage() {
  const router = useRouter();
  const [data, setData] = useState<CrownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'champion' | 'race' | 'history'>('champion');
  const [showCrownAnimation, setShowCrownAnimation] = useState(true);

  useEffect(() => {
    fetch('/api/daily-crown')
      .then(res => {
        if (res.status === 401) {
          router.push('/');
          return null;
        }
        return res.json() as Promise<CrownData>;
      })
      .then(result => {
        if (result) setData(result);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    // Disable animation after initial view
    const timer = setTimeout(() => setShowCrownAnimation(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 via-orange-900 to-red-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-6xl"
        >
          👑
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 via-orange-900 to-red-900 p-4 text-center text-white">
        <p>Could not load crown data</p>
        <Link href="/dashboard" className="text-amber-300 underline mt-4 block">Back to Dashboard</Link>
      </div>
    );
  }

  const { champion, crownType, runnerUp, honorable, todayLeaders, pastChampions, userCrownCount, isCurrentChampion, crownStats, yesterdayDate } = data;
  const crownInfo = CROWN_TYPES[crownType] || CROWN_TYPES.champion;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-900 via-orange-900 to-red-900 p-4 pb-20">
      {/* Floating sparkles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-yellow-400/30"
            initial={{ 
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
              y: -20,
              opacity: 0
            }}
            animate={{
              y: typeof window !== 'undefined' ? window.innerHeight + 20 : 800,
              opacity: [0, 1, 0],
              rotate: 360
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5
            }}
          >
            ✨
          </motion.div>
        ))}
      </div>

      <div className="max-w-lg mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard" className="text-white/70 hover:text-white flex items-center gap-2">
            <FiArrowLeft /> Back
          </Link>
          {userCrownCount > 0 && (
            <div className="bg-amber-500/20 px-3 py-1 rounded-full text-amber-300 text-sm">
              👑 {userCrownCount} crown{userCrownCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.8 }}
            className="text-7xl mb-4"
          >
            👑
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">The Crown</h1>
          <p className="text-white/60">Daily champion • One throne • Eternal glory</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white/10 rounded-xl p-1 mb-6">
          {(['champion', 'race', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab 
                  ? 'bg-amber-500 text-black' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {tab === 'champion' && '🏆 Champion'}
              {tab === 'race' && '🏁 Today\'s Race'}
              {tab === 'history' && '📜 History'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* CHAMPION TAB */}
          {activeTab === 'champion' && (
            <motion.div
              key="champion"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <p className="text-center text-white/50 text-sm mb-4">{yesterdayDate}</p>

              {champion ? (
                <>
                  {/* Champion Card */}
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className={`bg-gradient-to-br ${crownInfo.color} rounded-3xl p-6 text-center shadow-xl shadow-amber-500/20`}
                  >
                    <motion.div
                      animate={showCrownAnimation ? { 
                        y: [0, -10, 0],
                        rotate: [0, 5, -5, 0]
                      } : {}}
                      transition={{ duration: 2, repeat: showCrownAnimation ? Infinity : 0 }}
                      className="text-6xl mb-4"
                    >
                      {crownInfo.emoji}
                    </motion.div>
                    
                    <Link href={`/user/${champion.username}`}>
                      <div className="flex items-center justify-center gap-3 mb-3">
                        {champion.avatarUrl ? (
                          <img 
                            src={champion.avatarUrl} 
                            alt={champion.username}
                            className="w-16 h-16 rounded-full border-4 border-white/30"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                            {champion.username[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-1">@{champion.username}</h2>
                    </Link>
                    
                    <p className="text-white/80 mb-2">{crownInfo.title}</p>
                    <p className="text-white/60 text-sm italic">&ldquo;{crownInfo.desc}&rdquo;</p>
                    
                    <div className="mt-4 flex justify-center gap-4 text-sm">
                      <div className="bg-white/20 px-3 py-2 rounded-lg">
                        <div className="font-bold text-xl">{champion.score}</div>
                        <div className="text-white/70">Score</div>
                      </div>
                      <div className="bg-white/20 px-3 py-2 rounded-lg">
                        <div className="font-bold text-xl">{champion.checkins}</div>
                        <div className="text-white/70">Smokes</div>
                      </div>
                      <div className="bg-white/20 px-3 py-2 rounded-lg">
                        <div className="font-bold text-xl flex items-center gap-1">
                          <FiStar className="text-yellow-300" />
                          {champion.avgRating.toFixed(1)}
                        </div>
                        <div className="text-white/70">Avg</div>
                      </div>
                    </div>

                    {/* Activity breakdown */}
                    <div className="mt-4 flex justify-center gap-4 text-xs text-white/60">
                      <span className="flex items-center gap-1"><FiHeart /> {champion.likesReceived}</span>
                      <span className="flex items-center gap-1"><FiMessageCircle /> {champion.commentsReceived}</span>
                      <span className="flex items-center gap-1"><FiCamera /> {champion.photosPosted}</span>
                    </div>
                  </motion.div>

                  {/* Runner Up */}
                  {runnerUp && (
                    <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">🥈</div>
                        <Link href={`/user/${runnerUp.username}`} className="flex-1">
                          <div className="flex items-center gap-2">
                            {runnerUp.avatarUrl ? (
                              <img src={runnerUp.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                {runnerUp.username[0].toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="text-white font-medium">@{runnerUp.username}</div>
                              <div className="text-white/50 text-sm">Runner Up</div>
                            </div>
                          </div>
                        </Link>
                        <div className="text-amber-400 font-bold">{runnerUp.score} pts</div>
                      </div>
                    </div>
                  )}

                  {/* Honorable Mentions */}
                  {honorable.length > 0 && (
                    <div className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
                      <h3 className="text-white/70 text-sm font-medium mb-3">🎖️ Honorable Mentions</h3>
                      <div className="space-y-2">
                        {honorable.map((user, i) => (
                          <Link 
                            key={user.userId}
                            href={`/user/${user.username}`}
                            className="flex items-center justify-between py-2 hover:bg-white/5 rounded-lg px-2 transition"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-white/40 w-4">{i + 3}</span>
                              <span className="text-white">@{user.username}</span>
                            </div>
                            <span className="text-white/50">{user.score} pts</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-center border border-white/10">
                  <div className="text-5xl mb-4">⭕</div>
                  <h2 className="text-xl font-bold text-white mb-2">The Throne is Empty</h2>
                  <p className="text-white/60 mb-4">No one claimed the crown yesterday. Will you be the first today?</p>
                  <Link 
                    href="/check-in"
                    className="inline-block bg-amber-500 text-black font-semibold px-6 py-2 rounded-full hover:bg-amber-400 transition"
                  >
                    Log a Smoke 🚬
                  </Link>
                </div>
              )}

              {/* Crown Stats */}
              <div className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
                <h3 className="text-white/70 text-sm font-medium mb-3">📊 Crown Stats</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-400">{crownStats.totalCrownings}</div>
                    <div className="text-white/50 text-xs">Crownings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white truncate">
                      {crownStats.mostCrowned?.username || '-'}
                    </div>
                    <div className="text-white/50 text-xs">
                      Most Crowned ({crownStats.mostCrowned?.count || 0}x)
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-400">{crownStats.avgWinningScore}</div>
                    <div className="text-white/50 text-xs">Avg Score</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TODAY'S RACE TAB */}
          {activeTab === 'race' && (
            <motion.div
              key="race"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-4 border border-green-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <FiClock className="text-green-400" />
                  <span className="text-white font-medium">Today&apos;s Crown Race</span>
                </div>
                <p className="text-white/60 text-sm">Log smokes, get likes, and engage to climb the leaderboard. Winner crowned at midnight!</p>
              </div>

              {todayLeaders.length > 0 ? (
                <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10">
                  <h3 className="text-white/70 text-sm font-medium mb-4 flex items-center gap-2">
                    <FiTrendingUp className="text-green-400" /> Current Standings
                  </h3>
                  <div className="space-y-3">
                    {todayLeaders.map((leader, i) => (
                      <div 
                        key={leader.userId}
                        className={`flex items-center gap-3 p-3 rounded-xl ${
                          i === 0 ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30' : 'bg-white/5'
                        }`}
                      >
                        <div className="text-2xl">
                          {i === 0 && '🥇'}
                          {i === 1 && '🥈'}
                          {i === 2 && '🥉'}
                        </div>
                        <Link href={`/user/${leader.username}`} className="flex-1">
                          <div className="flex items-center gap-2">
                            {leader.avatarUrl ? (
                              <img src={leader.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
                                {leader.username[0].toUpperCase()}
                              </div>
                            )}
                            <span className="text-white font-medium">@{leader.username}</span>
                          </div>
                        </Link>
                        <div className="text-right">
                          <div className="text-amber-400 font-bold">{leader.score}</div>
                          <div className="text-white/50 text-xs">{leader.checkins} smokes</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-center border border-white/10">
                  <div className="text-5xl mb-4">🏁</div>
                  <h2 className="text-xl font-bold text-white mb-2">Race Hasn&apos;t Started</h2>
                  <p className="text-white/60 mb-4">Be the first to log a smoke today and take the lead!</p>
                  <Link 
                    href="/check-in"
                    className="inline-block bg-green-500 text-black font-semibold px-6 py-2 rounded-full hover:bg-green-400 transition"
                  >
                    Start the Race 🚬
                  </Link>
                </div>
              )}

              {/* How scoring works */}
              <div className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
                <h3 className="text-white/70 text-sm font-medium mb-3">🧮 How Scoring Works</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-white/70">
                    <span>🚬 Each smoke logged</span>
                    <span className="text-amber-400">+10 pts</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>⭐ Rating quality (avg × 5)</span>
                    <span className="text-amber-400">+5 pts/star</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>💬 Comments received</span>
                    <span className="text-amber-400">+5 pts</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>❤️ Likes received</span>
                    <span className="text-amber-400">+3 pts</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>📸 Photos posted</span>
                    <span className="text-amber-400">+2 pts</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h3 className="text-white/70 text-sm font-medium">📜 Recent Champions</h3>
              
              {pastChampions.length > 0 ? (
                <div className="space-y-3">
                  {pastChampions.map((champ, i) => (
                    <div 
                      key={i}
                      className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CrownIcon type={champ.crownType} size="sm" />
                          <Link href={`/user/${champ.username}`}>
                            <div>
                              <div className="text-white font-medium">@{champ.username}</div>
                              <div className="text-white/50 text-xs">{champ.date}</div>
                            </div>
                          </Link>
                        </div>
                        <div className="text-right">
                          <div className="text-amber-400 font-bold">{champ.score}</div>
                          <div className="text-white/50 text-xs">{champ.checkins} smokes</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center border border-white/10">
                  <p className="text-white/60">No champions recorded yet. History starts now!</p>
                </div>
              )}

              {/* Crown Types Legend */}
              <div className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
                <h3 className="text-white/70 text-sm font-medium mb-3">👑 Crown Types</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CROWN_TYPES).filter(([key]) => key !== 'empty').map(([key, info]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <span>{info.emoji}</span>
                      <span className="text-white/70">{info.title.replace(' Crown', '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Is Champion Badge */}
        {isCurrentChampion && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold py-3 px-4 rounded-2xl text-center shadow-xl"
          >
            👑 You are the reigning champion! 👑
          </motion.div>
        )}
      </div>

      {/* Add keyframes for crown animation */}
      <style jsx global>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.3); }
          50% { box-shadow: 0 0 40px rgba(245, 158, 11, 0.6); }
        }
      `}</style>
    </div>
  );
}
