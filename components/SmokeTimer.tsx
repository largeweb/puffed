"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlay, FiPause, FiCheck, FiX, FiClock } from "react-icons/fi";
import Link from "next/link";

interface SmokeTimerProps {
  onComplete?: (durationMins: number) => void;
}

export default function SmokeTimer({ onComplete }: SmokeTimerProps) {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);

  // Check for existing timer in localStorage
  useEffect(() => {
    const savedTimer = localStorage.getItem("puffed_smoke_timer");
    if (savedTimer) {
      try {
        const { startTime, pausedAt } = JSON.parse(savedTimer);
        if (startTime) {
          const now = Date.now();
          const elapsed = pausedAt 
            ? Math.floor((pausedAt - startTime) / 1000)
            : Math.floor((now - startTime) / 1000);
          
          // Max 4 hours, otherwise clear stale timer
          if (elapsed < 14400) {
            setElapsedSeconds(elapsed);
            setIsActive(true);
            setIsPaused(!!pausedAt);
          } else {
            localStorage.removeItem("puffed_smoke_timer");
          }
        }
      } catch {
        localStorage.removeItem("puffed_smoke_timer");
      }
    }
  }, []);

  // Timer tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && !isPaused) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused]);

  const startTimer = useCallback(() => {
    const startTime = Date.now();
    localStorage.setItem("puffed_smoke_timer", JSON.stringify({ startTime }));
    setIsActive(true);
    setIsPaused(false);
    setElapsedSeconds(0);
  }, []);

  const pauseTimer = useCallback(() => {
    const saved = localStorage.getItem("puffed_smoke_timer");
    if (saved) {
      const data = JSON.parse(saved);
      data.pausedAt = Date.now();
      localStorage.setItem("puffed_smoke_timer", JSON.stringify(data));
    }
    setIsPaused(true);
  }, []);

  const resumeTimer = useCallback(() => {
    const saved = localStorage.getItem("puffed_smoke_timer");
    if (saved) {
      const data = JSON.parse(saved);
      // Adjust start time to account for pause
      const pauseDuration = Date.now() - data.pausedAt;
      data.startTime += pauseDuration;
      delete data.pausedAt;
      localStorage.setItem("puffed_smoke_timer", JSON.stringify(data));
    }
    setIsPaused(false);
  }, []);

  const finishSmoke = useCallback(() => {
    const durationMins = Math.round(elapsedSeconds / 60);
    localStorage.removeItem("puffed_smoke_timer");
    setShowPrompt(true);
    onComplete?.(durationMins);
  }, [elapsedSeconds, onComplete]);

  const cancelTimer = useCallback(() => {
    localStorage.removeItem("puffed_smoke_timer");
    setIsActive(false);
    setIsPaused(false);
    setElapsedSeconds(0);
  }, []);

  const dismissPrompt = useCallback(() => {
    setShowPrompt(false);
    setIsActive(false);
    setElapsedSeconds(0);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const durationMins = Math.round(elapsedSeconds / 60);

  // Post-smoke prompt
  if (showPrompt) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-2xl p-5 border border-green-500/30 bg-green-500/5"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">✅</span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-400 mb-1">Great smoke! 🚬</h3>
            <p className="text-sm text-gray-400 mb-3">
              {durationMins > 0 ? `${durationMins} minute session.` : "Quick session!"} Want to log it?
            </p>
            <div className="flex gap-2">
              <Link
                href={`/dashboard?autolog=true&duration=${durationMins}`}
                onClick={dismissPrompt}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-black font-medium text-sm hover:bg-amber-400 transition-all"
              >
                <FiCheck size={16} />
                Log It
              </Link>
              <button
                onClick={dismissPrompt}
                className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 text-sm hover:bg-white/10 transition-all"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Active timer
  if (isActive) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-2xl p-5 border border-amber-500/30 bg-amber-500/5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <motion.div
                animate={{ scale: isPaused ? 1 : [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: isPaused ? 0 : Infinity }}
                className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center"
              >
                <span className="text-2xl">🔥</span>
              </motion.div>
              {!isPaused && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500"
                />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-400">
                {isPaused ? "Paused" : "Smoking..."}
              </p>
              <p className="text-2xl font-bold text-amber-500 font-mono">
                {formatTime(elapsedSeconds)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isPaused ? (
              <button
                onClick={resumeTimer}
                className="p-3 rounded-xl bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition-all"
                title="Resume"
              >
                <FiPlay size={20} />
              </button>
            ) : (
              <button
                onClick={pauseTimer}
                className="p-3 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 transition-all"
                title="Pause"
              >
                <FiPause size={20} />
              </button>
            )}
            <button
              onClick={finishSmoke}
              className="p-3 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
              title="Finish & Log"
            >
              <FiCheck size={20} />
            </button>
            <button
              onClick={cancelTimer}
              className="p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
              title="Cancel"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Start button (collapsed state)
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={startTimer}
      className="w-full glass rounded-2xl p-4 border border-white/10 hover:border-amber-500/30 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-all">
          <FiClock className="text-amber-500" size={24} />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-white group-hover:text-amber-500 transition-colors">
            Smoking now?
          </h3>
          <p className="text-sm text-gray-400">
            Start a timer and log when you&apos;re done
          </p>
        </div>
        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500">
          <FiPlay size={18} />
        </div>
      </div>
    </motion.button>
  );
}
