"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiHome, FiRefreshCw, FiAward, FiCalendar, FiStar, FiZap } from "react-icons/fi";
import confetti from "canvas-confetti";

interface BingoCell {
  id: string;
  challenge: string;
  emoji: string;
  completed: boolean;
  completedAt?: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface BingoCard {
  weekStart: number;
  weekEnd: number;
  cells: BingoCell[];
  completedCount: number;
  bingoLines: number;
  hasBingo: boolean;
  hasBlackout: boolean;
}

const difficultyColors = {
  easy: 'from-green-500/20 to-green-600/20 border-green-500/30',
  medium: 'from-amber-500/20 to-amber-600/20 border-amber-500/30',
  hard: 'from-red-500/20 to-red-600/20 border-red-500/30',
};

const difficultyGlows = {
  easy: 'shadow-green-500/20',
  medium: 'shadow-amber-500/20',
  hard: 'shadow-red-500/20',
};

function BingoGrid({ cells, onCellClick }: { cells: BingoCell[]; onCellClick: (cell: BingoCell) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2 max-w-md mx-auto">
      {cells.map((cell, index) => (
        <motion.button
          key={cell.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.02 }}
          onClick={() => onCellClick(cell)}
          className={`
            relative aspect-square rounded-lg border-2 p-1 transition-all duration-300
            ${cell.completed 
              ? 'bg-gradient-to-br from-fuchsia-500/30 to-purple-600/30 border-fuchsia-400/50 shadow-lg shadow-fuchsia-500/20' 
              : `bg-gradient-to-br ${difficultyColors[cell.difficulty]} ${difficultyGlows[cell.difficulty]}`
            }
            hover:scale-105 active:scale-95
          `}
        >
          <div className="h-full flex flex-col items-center justify-center">
            <span className="text-xl sm:text-2xl">{cell.emoji}</span>
            {cell.completed && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-fuchsia-500/10 rounded-lg" />
                <span className="text-3xl sm:text-4xl opacity-70">✓</span>
              </motion.div>
            )}
          </div>
          {cell.id === 'free' && (
            <span className="absolute bottom-0.5 text-[8px] sm:text-[10px] font-bold text-fuchsia-300 left-0 right-0 text-center">
              FREE
            </span>
          )}
        </motion.button>
      ))}
    </div>
  );
}

function ChallengeModal({ cell, onClose }: { cell: BingoCell; onClose: () => void }) {
  const difficultyLabels = {
    easy: { label: 'Easy', color: 'text-green-400' },
    medium: { label: 'Medium', color: 'text-amber-400' },
    hard: { label: 'Hard', color: 'text-red-400' },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className={`
          bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-sm w-full
          border-2 ${cell.completed ? 'border-fuchsia-500/50' : 'border-gray-700'}
        `}
      >
        <div className="text-center">
          <span className="text-6xl mb-4 block">{cell.emoji}</span>
          <h3 className="text-xl font-bold text-white mb-2">{cell.challenge}</h3>
          
          {cell.id !== 'free' && (
            <p className={`text-sm ${difficultyLabels[cell.difficulty].color} mb-4`}>
              {difficultyLabels[cell.difficulty].label} Challenge
            </p>
          )}
          
          {cell.completed ? (
            <div className="bg-fuchsia-500/20 rounded-xl p-4 border border-fuchsia-500/30">
              <span className="text-fuchsia-300 font-semibold">✓ Completed!</span>
              {cell.completedAt && (
                <p className="text-sm text-gray-400 mt-1">
                  {new Date(cell.completedAt * 1000).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <span className="text-gray-400">Not yet completed</span>
              <p className="text-sm text-gray-500 mt-1">
                Complete this challenge to mark it off!
              </p>
            </div>
          )}
          
          <button
            onClick={onClose}
            className="mt-6 px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-full text-white transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SmokeBingoPage() {
  const router = useRouter();
  const [card, setCard] = useState<BingoCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCell, setSelectedCell] = useState<BingoCell | null>(null);
  const [celebratedBingo, setCelebratedBingo] = useState(false);

  const fetchCard = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/smoke-bingo");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const data = await res.json() as BingoCard;
      setCard(data);
      
      // Celebrate bingo!
      if (data.hasBingo && !celebratedBingo) {
        setCelebratedBingo(true);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#e879f9', '#a855f7', '#6366f1'],
        });
      }
    } catch (error) {
      console.error("Failed to load bingo card:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, celebratedBingo]);

  useEffect(() => {
    fetchCard();
    // Refresh every 2 minutes
    const interval = setInterval(() => fetchCard(), 120000);
    return () => clearInterval(interval);
  }, [fetchCard]);

  const formatDateRange = (start: number, end: number) => {
    const startDate = new Date(start * 1000);
    const endDate = new Date(end * 1000);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
  };

  const getDaysLeft = (end: number) => {
    const now = Date.now() / 1000;
    const days = Math.ceil((end - now) / 86400);
    return days;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-fuchsia-950/20 to-black text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-2/3"></div>
            <div className="aspect-square bg-gray-700/50 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-fuchsia-950/20 to-black text-white p-4">
        <div className="max-w-lg mx-auto text-center py-20">
          <p className="text-gray-400">Failed to load bingo card</p>
          <Link href="/dashboard" className="text-fuchsia-400 underline mt-4 inline-block">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const daysLeft = getDaysLeft(card.weekEnd);
  const progress = (card.completedCount / 25) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-fuchsia-950/20 to-black text-white p-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard"
            className="p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
          >
            <FiHome className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
            🎰 Smoke Bingo
          </h1>
          <button
            onClick={() => fetchCard(true)}
            disabled={refreshing}
            className="p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
          >
            <FiRefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Week Info */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 rounded-xl p-4 mb-6 border border-fuchsia-500/20"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-gray-300">
              <FiCalendar className="w-4 h-4" />
              <span className="text-sm">{formatDateRange(card.weekStart, card.weekEnd)}</span>
            </div>
            <span className="text-sm text-fuchsia-300 font-medium">
              {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-500"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>{card.completedCount}/25 completed</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </motion.div>

        {/* Bingo Status */}
        {card.hasBingo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-fuchsia-500/20 to-purple-600/20 rounded-xl p-4 mb-6 border border-fuchsia-400/30 text-center"
          >
            <div className="flex items-center justify-center gap-2">
              <FiZap className="w-5 h-5 text-fuchsia-400" />
              <span className="text-xl font-bold text-fuchsia-300">
                {card.hasBlackout ? '🎉 BLACKOUT!' : `BINGO! x${card.bingoLines}`}
              </span>
              <FiZap className="w-5 h-5 text-fuchsia-400" />
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {card.hasBlackout 
                ? 'You completed every challenge this week!' 
                : `You have ${card.bingoLines} complete line${card.bingoLines > 1 ? 's' : ''}!`
              }
            </p>
          </motion.div>
        )}

        {/* Bingo Grid */}
        <BingoGrid cells={card.cells} onCellClick={setSelectedCell} />

        {/* Legend */}
        <div className="mt-6 bg-gray-800/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Challenge Difficulty</h3>
          <div className="flex justify-around text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gradient-to-br from-green-500/40 to-green-600/40 border border-green-500/50"></div>
              <span className="text-green-400">Easy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gradient-to-br from-amber-500/40 to-amber-600/40 border border-amber-500/50"></div>
              <span className="text-amber-400">Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gradient-to-br from-red-500/40 to-red-600/40 border border-red-500/50"></div>
              <span className="text-red-400">Hard</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gradient-to-br from-fuchsia-500/40 to-purple-600/40 border border-fuchsia-500/50"></div>
              <span className="text-fuchsia-400">Done</span>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-4 text-center text-xs text-gray-500">
          <p>Tap any cell to see details • New card every Monday</p>
          <p className="mt-1">Get 5 in a row for BINGO! 🎰</p>
        </div>
      </div>

      {/* Challenge Modal */}
      <AnimatePresence>
        {selectedCell && (
          <ChallengeModal cell={selectedCell} onClose={() => setSelectedCell(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
