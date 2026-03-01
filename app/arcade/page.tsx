"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  FiHome,
  FiRefreshCw,
  FiAward,
  FiTrendingUp,
  FiTarget,
  FiZap,
} from "react-icons/fi";

interface HighScore {
  category: string;
  icon: string;
  score: number;
  rank: number;
  maxRank: number;
  description: string;
}

interface ArcadeChampion {
  username: string;
  totalScore: number;
  topCategory: string;
  badges: number;
}

interface ArcadeData {
  isArcadeOpen: boolean;
  currentHour: number;
  myScores: HighScore[];
  myTotalScore: number;
  myRank: number;
  champions: ArcadeChampion[];
  todaysChallenges: Array<{
    name: string;
    icon: string;
    target: number;
    current: number;
    points: number;
  }>;
  arcadeStats: {
    totalPlayers: number;
    totalGamesPlayed: number;
    highestScore: number;
    topPlayer: string | null;
  };
  username: string | null;
}

// Retro scanline effect
function Scanlines() {
  return (
    <div 
      className="absolute inset-0 pointer-events-none opacity-10"
      style={{
        background: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0, 0, 0, 0.3) 2px,
          rgba(0, 0, 0, 0.3) 4px
        )`,
      }}
    />
  );
}

// Pixel border component
function PixelBorder({ children, color = "cyan" }: { children: React.ReactNode; color?: string }) {
  const colorClasses: Record<string, string> = {
    cyan: "border-cyan-500 shadow-cyan-500/30",
    pink: "border-pink-500 shadow-pink-500/30",
    yellow: "border-yellow-500 shadow-yellow-500/30",
    green: "border-green-500 shadow-green-500/30",
    purple: "border-purple-500 shadow-purple-500/30",
  };
  
  return (
    <div className={`border-4 ${colorClasses[color]} shadow-lg rounded-lg bg-black/50 backdrop-blur-sm`}>
      {children}
    </div>
  );
}

// Animated score display
function ScoreDisplay({ score, label }: { score: number; label: string }) {
  const [displayScore, setDisplayScore] = useState(0);
  
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = score / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [score]);
  
  return (
    <div className="text-center">
      <div className="font-mono text-4xl md:text-5xl font-bold text-cyan-400 tracking-wider">
        {displayScore.toLocaleString()}
      </div>
      <div className="text-xs text-cyan-600 uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}

export default function ArcadePage() {
  const [data, setData] = useState<ArcadeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"scores" | "champions" | "challenges">("scores");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/arcade");
      if (res.ok) {
        const result = (await res.json()) as ArcadeData;
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch arcade data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ 
            opacity: [0.5, 1, 0.5],
            scale: [0.95, 1.05, 0.95],
          }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-5xl font-mono text-cyan-400"
        >
          INSERT COIN
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-mono">
        <p>GAME OVER - LOAD FAILED</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-white relative overflow-hidden">
      {/* Retro effects */}
      <Scanlines />
      
      {/* Neon glow background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            <FiHome size={24} />
          </Link>
          <motion.h1 
            className="text-2xl font-bold font-mono flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-400 to-yellow-400"
            animate={{ 
              textShadow: [
                "0 0 10px rgba(34, 211, 238, 0.5)",
                "0 0 20px rgba(236, 72, 153, 0.5)",
                "0 0 10px rgba(34, 211, 238, 0.5)",
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span>🕹️</span> SMOKE ARCADE
          </motion.h1>
          <button
            onClick={fetchData}
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <FiRefreshCw size={20} />
          </button>
        </div>

        {/* Main Score Display */}
        {data.username && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <PixelBorder color="cyan">
              <div className="p-6">
                <div className="text-center mb-4">
                  <div className="text-xs text-cyan-600 uppercase tracking-widest mb-2">
                    PLAYER: @{data.username}
                  </div>
                  <ScoreDisplay score={data.myTotalScore} label="TOTAL SCORE" />
                </div>
                
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-cyan-900/50">
                  <div className="text-center">
                    <div className="text-2xl font-mono font-bold text-yellow-400">
                      #{data.myRank}
                    </div>
                    <div className="text-xs text-slate-500">RANK</div>
                  </div>
                  <div className="w-px h-8 bg-cyan-900/50" />
                  <div className="text-center">
                    <div className="text-2xl font-mono font-bold text-pink-400">
                      {data.myScores.length}
                    </div>
                    <div className="text-xs text-slate-500">GAMES</div>
                  </div>
                  <div className="w-px h-8 bg-cyan-900/50" />
                  <div className="text-center">
                    <div className="text-2xl font-mono font-bold text-green-400">
                      {data.myScores.filter(s => s.rank === 1).length}
                    </div>
                    <div className="text-xs text-slate-500">HIGH SCORES</div>
                  </div>
                </div>
              </div>
            </PixelBorder>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 my-6">
          {[
            { id: "scores", label: "MY SCORES", icon: FiTrendingUp },
            { id: "champions", label: "CHAMPIONS", icon: FiAward },
            { id: "challenges", label: "DAILY", icon: FiTarget },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-mono text-sm transition-all border-2 ${
                activeTab === tab.id
                  ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
                  : "text-slate-500 border-slate-800 hover:text-cyan-400 hover:border-cyan-900"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* My Scores */}
          {activeTab === "scores" && (
            <motion.div
              key="scores"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              {!data.username ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎮</div>
                  <p className="text-cyan-400 font-mono">INSERT COIN TO PLAY</p>
                  <Link href="/join" className="text-pink-400 hover:underline text-sm mt-2 block">
                    Sign up to track your scores
                  </Link>
                </div>
              ) : data.myScores.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🕹️</div>
                  <p className="text-cyan-400 font-mono">NO GAMES PLAYED</p>
                  <p className="text-slate-500 text-sm mt-2">Log a smoke to start earning points!</p>
                </div>
              ) : (
                data.myScores.map((score, i) => (
                  <motion.div
                    key={score.category}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <PixelBorder color={score.rank === 1 ? "yellow" : score.rank <= 3 ? "pink" : "cyan"}>
                      <div className="p-4 flex items-center gap-4">
                        <div className="text-3xl">{score.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white">
                              {score.category}
                            </span>
                            {score.rank === 1 && (
                              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-mono">
                                #1
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {score.description}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-2xl font-bold text-cyan-400">
                            {score.score.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-600">
                            Rank {score.rank}/{score.maxRank}
                          </div>
                        </div>
                      </div>
                    </PixelBorder>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* Champions */}
          {activeTab === "champions" && (
            <motion.div
              key="champions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              <div className="text-center mb-6">
                <motion.div
                  animate={{ 
                    y: [0, -5, 0],
                    rotateZ: [-2, 2, -2],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-4xl mb-2"
                >
                  🏆
                </motion.div>
                <p className="text-sm text-pink-400 font-mono">HALL OF CHAMPIONS</p>
              </div>
              
              {data.champions.map((champ, i) => (
                <motion.div
                  key={champ.username}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <PixelBorder color={i === 0 ? "yellow" : i === 1 ? "pink" : i === 2 ? "purple" : "cyan"}>
                    <div className="p-4 flex items-center gap-4">
                      <div className="text-2xl font-mono font-bold w-10 text-center">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </div>
                      <div className="flex-1">
                        <Link
                          href={`/user/${champ.username}`}
                          className="font-mono font-bold text-white hover:text-cyan-400 transition-colors"
                        >
                          @{champ.username}
                        </Link>
                        <div className="text-xs text-slate-500 mt-1">
                          Best at: {champ.topCategory} • {champ.badges} badges
                        </div>
                      </div>
                      <div className="font-mono text-xl font-bold text-cyan-400">
                        {champ.totalScore.toLocaleString()}
                      </div>
                    </div>
                  </PixelBorder>
                </motion.div>
              ))}
              
              {/* Arcade stats */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="bg-slate-900/50 border border-cyan-900/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-mono font-bold text-green-400">
                    {data.arcadeStats.totalPlayers}
                  </div>
                  <div className="text-xs text-slate-500">PLAYERS</div>
                </div>
                <div className="bg-slate-900/50 border border-pink-900/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-mono font-bold text-pink-400">
                    {data.arcadeStats.totalGamesPlayed}
                  </div>
                  <div className="text-xs text-slate-500">GAMES PLAYED</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Daily Challenges */}
          {activeTab === "challenges" && (
            <motion.div
              key="challenges"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-6">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-4xl mb-2"
                >
                  <FiZap className="inline text-yellow-400" size={40} />
                </motion.div>
                <p className="text-sm text-yellow-400 font-mono">TODAY&apos;S CHALLENGES</p>
              </div>
              
              {data.todaysChallenges.map((challenge, i) => (
                <motion.div
                  key={challenge.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <PixelBorder color="yellow">
                    <div className="p-4 flex items-center gap-4">
                      <div className="text-3xl">{challenge.icon}</div>
                      <div className="flex-1">
                        <div className="font-mono font-bold text-white">
                          {challenge.name}
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 mt-2">
                          <motion.div
                            className="bg-gradient-to-r from-yellow-500 to-green-500 h-2 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(challenge.current / challenge.target) * 100}%` }}
                            transition={{ delay: 0.5 + i * 0.1 }}
                          />
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {challenge.current}/{challenge.target}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-lg font-bold text-yellow-400">
                          +{challenge.points}
                        </div>
                        <div className="text-xs text-slate-600">PTS</div>
                      </div>
                    </div>
                  </PixelBorder>
                </motion.div>
              ))}
              
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-4 mt-6">
                <p className="text-sm text-purple-300 font-mono text-center">
                  🎮 Complete challenges to earn bonus points!
                  <br />
                  <span className="text-slate-500">New challenges every day at midnight</span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* How Scoring Works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 pt-6 border-t border-cyan-900/30"
        >
          <PixelBorder color="purple">
            <div className="p-4">
              <h3 className="font-mono font-bold text-purple-400 mb-3 flex items-center gap-2">
                📊 HOW TO SCORE
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="text-slate-400">🚬 Each smoke: <span className="text-cyan-400">+10</span></div>
                <div className="text-slate-400">🗺️ New brand: <span className="text-cyan-400">+25</span></div>
                <div className="text-slate-400">⭐ Quality avg: <span className="text-cyan-400">x20</span></div>
                <div className="text-slate-400">🦉 Night smoke: <span className="text-cyan-400">+15</span></div>
                <div className="text-slate-400">🌅 Morning: <span className="text-cyan-400">+15</span></div>
                <div className="text-slate-400">💬 Social: <span className="text-cyan-400">+5</span></div>
                <div className="text-slate-400">❤️ Popularity: <span className="text-cyan-400">+8</span></div>
                <div className="text-slate-400">🏆 Badge: <span className="text-cyan-400">+50</span></div>
              </div>
            </div>
          </PixelBorder>
        </motion.div>

        {/* Related Pages */}
        <div className="mt-6 pt-4">
          <p className="text-xs text-slate-600 font-mono mb-3">MORE GAMES:</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/bingo"
              className="text-sm bg-slate-900/50 px-3 py-2 rounded-lg text-cyan-400 hover:text-white hover:bg-cyan-900/30 transition-colors font-mono border border-cyan-900/50"
            >
              🎲 BINGO
            </Link>
            <Link
              href="/roulette"
              className="text-sm bg-slate-900/50 px-3 py-2 rounded-lg text-pink-400 hover:text-white hover:bg-pink-900/30 transition-colors font-mono border border-pink-900/50"
            >
              🎰 ROULETTE
            </Link>
            <Link
              href="/leaderboard"
              className="text-sm bg-slate-900/50 px-3 py-2 rounded-lg text-yellow-400 hover:text-white hover:bg-yellow-900/30 transition-colors font-mono border border-yellow-900/50"
            >
              🏆 LEADERBOARD
            </Link>
            <Link
              href="/achievements"
              className="text-sm bg-slate-900/50 px-3 py-2 rounded-lg text-green-400 hover:text-white hover:bg-green-900/30 transition-colors font-mono border border-green-900/50"
            >
              🎖️ ACHIEVEMENTS
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
