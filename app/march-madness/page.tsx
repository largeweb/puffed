'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Matchup {
  id: number;
  round: number;
  position: number;
  brand1: string;
  brand2: string;
  votes1: number;
  votes2: number;
  winner: string | null;
  endTime: number;
  userVote: string | null;
}

interface BracketStats {
  currentRound: number;
  totalVotes: number;
  activeMatchups: Matchup[];
  completedMatchups: Matchup[];
  upcomingMatchups: Matchup[];
  champion: string | null;
  topVoters: Array<{ username: string; votes: number; correct: number }>;
  personalStats: {
    totalVotes: number;
    correctPicks: number;
    accuracy: number;
  } | null;
}

const ROUND_NAMES = ['', 'Round of 16', 'Elite Eight', 'Final Four', 'Championship', 'Champion'];

export default function MarchMadnessPage() {
  const [stats, setStats] = useState<BracketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<number | null>(null);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    fetch('/api/march-madness')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleVote = async (matchupId: number, brand: string) => {
    setVoting(matchupId);
    try {
      const res = await fetch('/api/march-madness/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchupId, brand }),
      });
      if (res.ok) {
        // Refresh stats
        const data = await fetch('/api/march-madness').then(r => r.json());
        setStats(data);
        setConfetti(true);
        setTimeout(() => setConfetti(false), 2000);
      }
    } catch (error) {
      console.error('Vote error:', error);
    }
    setVoting(null);
  };

  const now = new Date();
  const dayOfMarch = now.getMonth() === 2 ? now.getDate() : 0;
  const isMarch = now.getMonth() === 2;

  const getProgressEmoji = (votes1: number, votes2: number) => {
    const total = votes1 + votes2;
    if (total === 0) return '🔥';
    const ratio = votes1 / total;
    if (ratio > 0.7) return '🏀💨';
    if (ratio < 0.3) return '💨🏀';
    return '⚔️';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-orange-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🏀</div>
          <p className="text-orange-200 text-xl">Loading brackets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-orange-800 relative overflow-hidden">
      {/* Basketball court lines background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 border-white rounded-full" />
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-full bg-white" />
        <div className="absolute top-1/2 left-0 transform -translate-y-1/2 w-full h-1 bg-white" />
      </div>

      {/* Confetti effect */}
      {confetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
            >
              {['🏀', '🔥', '💨', '⭐'][Math.floor(Math.random() * 4)]}
            </div>
          ))}
        </div>
      )}

      <div className="relative z-10 p-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-4">
          <Link href="/dashboard" className="text-orange-300 hover:text-orange-200 text-sm mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">
            🏀 March Madness 🏀
          </h1>
          <p className="text-orange-200 text-lg">
            Brand Battle Bracket Tournament
          </p>
          {isMarch && (
            <div className="mt-2 text-orange-300">
              Day {dayOfMarch} of March • {stats?.currentRound ? ROUND_NAMES[stats.currentRound] : 'Opening Round'}
            </div>
          )}
        </div>

        {!isMarch ? (
          <div className="bg-orange-950/50 backdrop-blur-sm rounded-2xl p-8 text-center border border-orange-800/50">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-bold text-white mb-2">Coming in March!</h2>
            <p className="text-orange-200">
              The brand battle tournament begins March 1st. 16 brands enter, one champion emerges!
            </p>
          </div>
        ) : (
          <>
            {/* Tournament Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-orange-950/50 backdrop-blur-sm rounded-xl p-4 text-center border border-orange-800/50">
                <div className="text-3xl mb-1">🗳️</div>
                <div className="text-2xl font-bold text-white">{stats?.totalVotes || 0}</div>
                <div className="text-orange-300 text-sm">Total Votes</div>
              </div>
              <div className="bg-orange-950/50 backdrop-blur-sm rounded-xl p-4 text-center border border-orange-800/50">
                <div className="text-3xl mb-1">🏆</div>
                <div className="text-2xl font-bold text-white">{ROUND_NAMES[stats?.currentRound || 1]}</div>
                <div className="text-orange-300 text-sm">Current Round</div>
              </div>
              <div className="bg-orange-950/50 backdrop-blur-sm rounded-xl p-4 text-center border border-orange-800/50">
                <div className="text-3xl mb-1">⚔️</div>
                <div className="text-2xl font-bold text-white">{stats?.activeMatchups?.length || 0}</div>
                <div className="text-orange-300 text-sm">Active Matchups</div>
              </div>
              <div className="bg-orange-950/50 backdrop-blur-sm rounded-xl p-4 text-center border border-orange-800/50">
                <div className="text-3xl mb-1">✅</div>
                <div className="text-2xl font-bold text-white">{stats?.completedMatchups?.length || 0}</div>
                <div className="text-orange-300 text-sm">Decided</div>
              </div>
            </div>

            {/* Champion Banner */}
            {stats?.champion && (
              <div className="bg-gradient-to-r from-yellow-600 to-amber-500 rounded-2xl p-6 text-center mb-6 shadow-lg">
                <div className="text-5xl mb-2">👑🏀🏆</div>
                <h2 className="text-3xl font-bold text-white mb-1">2026 CHAMPION</h2>
                <div className="text-4xl font-bold text-yellow-100">{stats.champion}</div>
                <p className="text-yellow-200 mt-2">Crowned the best brand of March Madness!</p>
              </div>
            )}

            {/* Active Matchups */}
            {stats?.activeMatchups && stats.activeMatchups.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  🔥 Vote Now
                </h2>
                <div className="space-y-4">
                  {stats.activeMatchups.map((matchup) => {
                    const total = matchup.votes1 + matchup.votes2;
                    const pct1 = total > 0 ? Math.round((matchup.votes1 / total) * 100) : 50;
                    const pct2 = total > 0 ? Math.round((matchup.votes2 / total) * 100) : 50;
                    
                    return (
                      <div
                        key={matchup.id}
                        className="bg-orange-950/60 backdrop-blur-sm rounded-2xl p-5 border border-orange-800/50"
                      >
                        <div className="text-center text-orange-300 text-sm mb-3">
                          {ROUND_NAMES[matchup.round]} • Matchup #{matchup.position}
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {/* Brand 1 */}
                          <button
                            onClick={() => !matchup.userVote && handleVote(matchup.id, matchup.brand1)}
                            disabled={!!matchup.userVote || voting === matchup.id}
                            className={`flex-1 p-4 rounded-xl transition-all ${
                              matchup.userVote === matchup.brand1
                                ? 'bg-green-600/50 border-2 border-green-400'
                                : matchup.userVote
                                ? 'bg-orange-900/50 opacity-60'
                                : 'bg-orange-800/50 hover:bg-orange-700/50 cursor-pointer'
                            }`}
                          >
                            <div className="text-2xl mb-2">🚬</div>
                            <div className="font-bold text-white text-lg">{matchup.brand1}</div>
                            <div className="text-orange-300 text-sm mt-1">
                              {matchup.votes1} votes ({pct1}%)
                            </div>
                            {matchup.userVote === matchup.brand1 && (
                              <div className="text-green-400 text-sm mt-1">✓ Your pick</div>
                            )}
                          </button>

                          {/* VS */}
                          <div className="text-3xl">
                            {getProgressEmoji(matchup.votes1, matchup.votes2)}
                          </div>

                          {/* Brand 2 */}
                          <button
                            onClick={() => !matchup.userVote && handleVote(matchup.id, matchup.brand2)}
                            disabled={!!matchup.userVote || voting === matchup.id}
                            className={`flex-1 p-4 rounded-xl transition-all ${
                              matchup.userVote === matchup.brand2
                                ? 'bg-green-600/50 border-2 border-green-400'
                                : matchup.userVote
                                ? 'bg-orange-900/50 opacity-60'
                                : 'bg-orange-800/50 hover:bg-orange-700/50 cursor-pointer'
                            }`}
                          >
                            <div className="text-2xl mb-2">🚬</div>
                            <div className="font-bold text-white text-lg">{matchup.brand2}</div>
                            <div className="text-orange-300 text-sm mt-1">
                              {matchup.votes2} votes ({pct2}%)
                            </div>
                            {matchup.userVote === matchup.brand2 && (
                              <div className="text-green-400 text-sm mt-1">✓ Your pick</div>
                            )}
                          </button>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-4 h-3 bg-orange-900/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
                            style={{ width: `${pct1}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completed Matchups */}
            {stats?.completedMatchups && stats.completedMatchups.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  ✅ Results
                </h2>
                <div className="space-y-3">
                  {stats.completedMatchups.map((matchup) => (
                    <div
                      key={matchup.id}
                      className="bg-orange-950/40 backdrop-blur-sm rounded-xl p-4 border border-orange-800/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className={`flex-1 ${matchup.winner === matchup.brand1 ? 'text-green-400' : 'text-orange-400/60'}`}>
                          {matchup.winner === matchup.brand1 && '🏆 '}
                          {matchup.brand1} ({matchup.votes1})
                        </div>
                        <div className="text-orange-500 mx-2">vs</div>
                        <div className={`flex-1 text-right ${matchup.winner === matchup.brand2 ? 'text-green-400' : 'text-orange-400/60'}`}>
                          {matchup.brand2} ({matchup.votes2})
                          {matchup.winner === matchup.brand2 && ' 🏆'}
                        </div>
                      </div>
                      {matchup.userVote && (
                        <div className={`text-center text-sm mt-2 ${
                          matchup.userVote === matchup.winner ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {matchup.userVote === matchup.winner ? '✓ You picked correctly!' : '✗ Better luck next round'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Voters Leaderboard */}
            {stats?.topVoters && stats.topVoters.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  🎯 Top Bracket Pickers
                </h2>
                <div className="bg-orange-950/40 backdrop-blur-sm rounded-xl border border-orange-800/30 overflow-hidden">
                  {stats.topVoters.slice(0, 5).map((voter, idx) => (
                    <div
                      key={voter.username}
                      className={`flex items-center justify-between p-4 ${
                        idx !== stats.topVoters.length - 1 ? 'border-b border-orange-800/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏀'}
                        </span>
                        <span className="text-white font-medium">{voter.username}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold">{voter.correct}/{voter.votes} correct</div>
                        <div className="text-orange-300 text-sm">
                          {voter.votes > 0 ? Math.round((voter.correct / voter.votes) * 100) : 0}% accuracy
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Personal Stats */}
            {stats?.personalStats && (
              <div className="bg-orange-950/40 backdrop-blur-sm rounded-xl p-5 border border-orange-800/30 mb-8">
                <h3 className="text-lg font-bold text-white mb-3">📊 Your Bracket</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-white">{stats.personalStats.totalVotes}</div>
                    <div className="text-orange-300 text-sm">Votes Cast</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">{stats.personalStats.correctPicks}</div>
                    <div className="text-orange-300 text-sm">Correct Picks</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">{stats.personalStats.accuracy}%</div>
                    <div className="text-orange-300 text-sm">Accuracy</div>
                  </div>
                </div>
              </div>
            )}

            {/* Call to Action */}
            <div className="text-center mt-8 pb-8">
              <Link
                href="/battle"
                className="inline-block bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 px-8 rounded-full hover:from-orange-400 hover:to-red-400 transition-all shadow-lg"
              >
                🥊 Daily Brand Battle
              </Link>
              <p className="text-orange-300 text-sm mt-3">
                Vote in the weekly brand battle too!
              </p>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall 2s ease-in forwards;
        }
      `}</style>
    </div>
  );
}
