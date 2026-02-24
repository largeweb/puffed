"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FiArrowLeft, FiHome, FiClock, FiUsers, FiTrendingUp, FiAward, FiZap, FiChevronDown, FiChevronUp } from "react-icons/fi";
import type { BrandBattleResponse } from "@/app/api/brand-battle/route";
import type { PastBattle, BattleHistoryResponse } from "@/app/api/brand-battle/history/route";

function getTimeRemaining(endsAt: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = endsAt - now;
  if (diff <= 0) return "Ended";
  
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  
  if (days > 0) return `${days}d ${hours}h left`;
  
  const minutes = Math.floor((diff % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m left`;
  
  return `${minutes}m left`;
}

export default function BrandBattlePage() {
  const [battle, setBattle] = useState<BrandBattleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pastBattles, setPastBattles] = useState<PastBattle[]>([]);
  const [historyStats, setHistoryStats] = useState<BattleHistoryResponse['stats'] | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadBattle();
    loadHistory();
  }, []);

  async function loadBattle() {
    try {
      const res = await fetch("/api/brand-battle");
      if (res.ok) {
        const data: BrandBattleResponse = await res.json();
        setBattle(data);
      }
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/brand-battle/history");
      if (res.ok) {
        const data: BattleHistoryResponse = await res.json();
        setPastBattles(data.pastBattles);
        setHistoryStats(data.stats);
      }
    } catch (error) {
      console.error("Load history error:", error);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function castVote(brand: string) {
    if (voting || !battle) return;
    
    setVoting(true);
    try {
      const res = await fetch("/api/brand-battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand })
      });
      
      if (res.ok) {
        // Trigger confetti for first-time vote
        if (!battle.userVote) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2000);
        }
        await loadBattle();
      }
    } catch (error) {
      console.error("Vote error:", error);
    } finally {
      setVoting(false);
    }
  }

  const getPercentage = (votes: number, total: number) => {
    if (total === 0) return 50;
    return Math.round((votes / total) * 100);
  };

  const isWinning = (votes: number, otherVotes: number) => votes > otherVotes;

  return (
    <main className="min-h-screen pb-20">
      {/* Confetti overlay */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-6xl"
            >
              🥊🎉
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 -ml-2 hover:bg-white/10 rounded-full">
              <FiArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-bold text-lg flex items-center gap-2">
                <span className="text-2xl">🥊</span>
                Brand Battle
              </h1>
              <p className="text-xs text-gray-400">
                Vote for your champion!
              </p>
            </div>
          </div>
          <Link href="/" className="p-2 hover:bg-white/10 rounded-full text-gray-400">
            <FiHome size={20} />
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            <div className="glass rounded-xl p-8 animate-pulse">
              <div className="h-8 bg-white/10 rounded w-1/2 mx-auto mb-8" />
              <div className="flex justify-between gap-4">
                <div className="flex-1 h-32 bg-white/10 rounded-xl" />
                <div className="flex-1 h-32 bg-white/10 rounded-xl" />
              </div>
            </div>
          </div>
        )}

        {/* Battle UI */}
        {!loading && battle && (
          <>
            {/* Timer banner */}
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <FiClock className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-red-400 font-medium">Week {battle.weekNumber}</p>
                    <p className="text-xs text-gray-400">
                      {getTimeRemaining(battle.endsAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <FiUsers size={16} />
                  <span className="text-sm">{battle.totalVotes} votes</span>
                </div>
              </div>
            </div>

            {/* VS Section */}
            <div className="text-center mb-4">
              <span className="text-xs text-gray-500 uppercase tracking-wider">This week&apos;s matchup</span>
            </div>

            {/* Battle Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Brand A */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => castVote(battle.brandA)}
                disabled={voting}
                className={`relative overflow-hidden rounded-xl p-6 transition-all ${
                  battle.userVote === battle.brandA
                    ? "ring-2 ring-red-500 bg-gradient-to-br from-red-500/20 to-red-600/10"
                    : "glass hover:bg-white/5"
                }`}
              >
                {isWinning(battle.votesA, battle.votesB) && battle.totalVotes > 0 && (
                  <div className="absolute top-2 right-2">
                    <span className="text-yellow-400 text-lg">👑</span>
                  </div>
                )}
                <div className="text-4xl mb-3">🔴</div>
                <h3 className="font-bold text-lg text-white mb-2">{battle.brandA}</h3>
                <div className="text-3xl font-bold text-red-400 mb-1">
                  {getPercentage(battle.votesA, battle.totalVotes)}%
                </div>
                <p className="text-sm text-gray-400">{battle.votesA} votes</p>
                
                {battle.userVote === battle.brandA && (
                  <div className="absolute bottom-2 left-2">
                    <span className="text-xs bg-red-500/30 text-red-300 px-2 py-1 rounded-full">
                      Your pick
                    </span>
                  </div>
                )}
              </motion.button>

              {/* Brand B */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => castVote(battle.brandB)}
                disabled={voting}
                className={`relative overflow-hidden rounded-xl p-6 transition-all ${
                  battle.userVote === battle.brandB
                    ? "ring-2 ring-blue-500 bg-gradient-to-br from-blue-500/20 to-blue-600/10"
                    : "glass hover:bg-white/5"
                }`}
              >
                {isWinning(battle.votesB, battle.votesA) && battle.totalVotes > 0 && (
                  <div className="absolute top-2 right-2">
                    <span className="text-yellow-400 text-lg">👑</span>
                  </div>
                )}
                <div className="text-4xl mb-3">🔵</div>
                <h3 className="font-bold text-lg text-white mb-2">{battle.brandB}</h3>
                <div className="text-3xl font-bold text-blue-400 mb-1">
                  {getPercentage(battle.votesB, battle.totalVotes)}%
                </div>
                <p className="text-sm text-gray-400">{battle.votesB} votes</p>
                
                {battle.userVote === battle.brandB && (
                  <div className="absolute bottom-2 left-2">
                    <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-1 rounded-full">
                      Your pick
                    </span>
                  </div>
                )}
              </motion.button>
            </div>

            {/* Progress bar */}
            {battle.totalVotes > 0 && (
              <div className="mb-6">
                <div className="h-4 rounded-full overflow-hidden bg-gray-800 flex">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${getPercentage(battle.votesA, battle.totalVotes)}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="bg-gradient-to-r from-red-500 to-red-600 h-full"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${getPercentage(battle.votesB, battle.totalVotes)}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-full"
                  />
                </div>
              </div>
            )}

            {/* VS Badge */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">VS</span>
              </div>
            </div>

            {/* Voter lists */}
            {(battle.votersA.length > 0 || battle.votersB.length > 0) && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass rounded-xl p-4">
                  <p className="text-xs text-red-400 font-medium mb-2">Team {battle.brandA}</p>
                  <div className="flex flex-wrap gap-1">
                    {battle.votersA.map((voter) => (
                      <Link
                        key={voter}
                        href={`/user/${voter}`}
                        className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-300 hover:bg-red-500/20"
                      >
                        @{voter}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="glass rounded-xl p-4">
                  <p className="text-xs text-blue-400 font-medium mb-2">Team {battle.brandB}</p>
                  <div className="flex flex-wrap gap-1">
                    {battle.votersB.map((voter) => (
                      <Link
                        key={voter}
                        href={`/user/${voter}`}
                        className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
                      >
                        @{voter}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Info section */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-start gap-3">
                <FiZap className="text-amber-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-300">
                    <strong className="text-amber-400">Brand Battle</strong> pits two legendary brands against each other every week.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Vote for your favorite! You can change your vote anytime before the battle ends.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA for non-voters */}
            {!battle.userVote && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-center"
              >
                <p className="text-gray-400 text-sm">
                  Tap a brand above to cast your vote! 🥊
                </p>
              </motion.div>
            )}

            {/* Share section */}
            {battle.userVote && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
              >
                <div className="flex items-center gap-3">
                  <FiAward className="text-amber-400" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-400 font-medium">You voted for {battle.userVote}!</p>
                    <p className="text-xs text-gray-400">
                      Check back to see if your pick wins
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Past Battles Section */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full glass rounded-xl p-4 flex items-center justify-between hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🏆</span>
                <div className="text-left">
                  <h3 className="font-medium text-white">Battle History</h3>
                  <p className="text-xs text-gray-400">
                    {historyStats?.totalBattles || 0} past battles • {historyStats?.totalVotes || 0} total votes
                  </p>
                </div>
              </div>
              {showHistory ? (
                <FiChevronUp className="text-gray-400" />
              ) : (
                <FiChevronDown className="text-gray-400" />
              )}
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  {loadingHistory ? (
                    <div className="glass rounded-xl mt-3 p-8 text-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full mx-auto"
                      />
                    </div>
                  ) : pastBattles.length === 0 ? (
                    <div className="glass rounded-xl mt-3 p-6 text-center">
                      <p className="text-gray-400">No past battles yet.</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Be one of the first to vote in this week&apos;s battle!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 mt-3">
                      {/* Stats Summary */}
                      {historyStats && (historyStats.mostVotedBattle || historyStats.biggestLandslide) && (
                        <div className="grid grid-cols-2 gap-3">
                          {historyStats.mostVotedBattle && (
                            <div className="glass rounded-xl p-3 border border-purple-500/20">
                              <p className="text-xs text-purple-400 font-medium mb-1">Most Voted</p>
                              <p className="text-sm text-white font-bold">
                                {historyStats.mostVotedBattle.brandA} vs {historyStats.mostVotedBattle.brandB}
                              </p>
                              <p className="text-xs text-gray-400">
                                {historyStats.mostVotedBattle.totalVotes} votes
                              </p>
                            </div>
                          )}
                          {historyStats.biggestLandslide && historyStats.biggestLandslide.winner && (
                            <div className="glass rounded-xl p-3 border border-amber-500/20">
                              <p className="text-xs text-amber-400 font-medium mb-1">Biggest Win</p>
                              <p className="text-sm text-white font-bold">
                                {historyStats.biggestLandslide.winner}
                              </p>
                              <p className="text-xs text-gray-400">
                                +{historyStats.biggestLandslide.winMargin} margin
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Past battle cards */}
                      {pastBattles.map((pastBattle, idx) => (
                        <motion.div
                          key={pastBattle.weekNumber}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="glass rounded-xl p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Week {pastBattle.weekNumber}</span>
                              <span className="text-xs text-gray-600">•</span>
                              <span className="text-xs text-gray-500">{pastBattle.dateRange}</span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {pastBattle.totalVotes} votes
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Brand A */}
                            <div className={`flex-1 p-3 rounded-lg ${
                              pastBattle.winner === pastBattle.brandA 
                                ? 'bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30' 
                                : 'bg-white/5'
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                {pastBattle.winner === pastBattle.brandA && (
                                  <span className="text-amber-400">👑</span>
                                )}
                                <p className={`font-medium text-sm ${
                                  pastBattle.winner === pastBattle.brandA ? 'text-amber-400' : 'text-gray-300'
                                }`}>
                                  {pastBattle.brandA}
                                </p>
                              </div>
                              <p className="text-xs text-gray-400">{pastBattle.votesA} votes</p>
                            </div>

                            {/* VS */}
                            <div className="text-xs text-gray-500 font-bold">VS</div>

                            {/* Brand B */}
                            <div className={`flex-1 p-3 rounded-lg ${
                              pastBattle.winner === pastBattle.brandB 
                                ? 'bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30' 
                                : 'bg-white/5'
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                {pastBattle.winner === pastBattle.brandB && (
                                  <span className="text-amber-400">👑</span>
                                )}
                                <p className={`font-medium text-sm ${
                                  pastBattle.winner === pastBattle.brandB ? 'text-amber-400' : 'text-gray-300'
                                }`}>
                                  {pastBattle.brandB}
                                </p>
                              </div>
                              <p className="text-xs text-gray-400">{pastBattle.votesB} votes</p>
                            </div>
                          </div>

                          {/* Result indicator */}
                          {pastBattle.winner ? (
                            <div className="mt-3 text-center">
                              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
                                🏆 {pastBattle.winner} wins by {pastBattle.winMargin}!
                              </span>
                            </div>
                          ) : (
                            <div className="mt-3 text-center">
                              <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded-full">
                                🤝 Tie game!
                              </span>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </main>
  );
}
