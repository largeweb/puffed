"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FiClock, FiPlay, FiSquare, FiX, FiArrowLeft, FiAward, FiTrendingUp } from "react-icons/fi";

interface ActiveTimer {
  id: number;
  brand: string;
  product: string | null;
  started_at: number;
  notes: string | null;
}

interface Session {
  id: number;
  brand: string;
  product: string | null;
  started_at: number;
  ended_at: number;
  duration_seconds: number;
  checkin_id: number | null;
  rating: number | null;
}

interface BrandDuration {
  brand: string;
  sessions: number;
  avg_duration: number;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDurationReadable(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

export default function TimerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [brandDurations, setBrandDurations] = useState<BrandDuration[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [showStart, setShowStart] = useState(false);
  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadTimer();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeTimer) {
      const updateElapsed = () => {
        const now = Math.floor(Date.now() / 1000);
        setElapsed(now - activeTimer.started_at);
      };
      updateElapsed();
      intervalRef.current = setInterval(updateElapsed, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [activeTimer]);

  const loadTimer = async () => {
    try {
      const res = await fetch("/api/timer", { credentials: "include" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setActiveTimer(data.activeTimer);
      setRecentSessions(data.recentSessions || []);
      setBrandDurations(data.brandDurations || []);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const startTimer = async () => {
    if (!brand.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ brand: brand.trim(), product: product.trim() || null })
      });
      const data = await res.json();
      if (data.success) {
        setActiveTimer({
          id: data.timerId,
          brand: brand.trim(),
          product: product.trim() || null,
          started_at: data.startedAt,
          notes: null
        });
        setShowStart(false);
        setBrand("");
        setProduct("");
      }
    } catch (err) {
      console.error("Start error:", err);
    } finally {
      setSaving(false);
    }
  };

  const stopTimer = async () => {
    if (!activeTimer) return;
    setSaving(true);
    try {
      const res = await fetch("/api/timer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ timerId: activeTimer.id })
      });
      const data = await res.json();
      if (data.success) {
        // Redirect to log page with pre-filled brand and duration
        const params = new URLSearchParams({
          brand: activeTimer.brand,
          ...(activeTimer.product && { product: activeTimer.product }),
          duration: data.duration.toString(),
          timerId: activeTimer.id.toString()
        });
        router.push(`/log?${params.toString()}`);
      }
    } catch (err) {
      console.error("Stop error:", err);
    } finally {
      setSaving(false);
    }
  };

  const cancelTimer = async () => {
    if (!activeTimer) return;
    if (!confirm("Cancel this timer? The session won't be saved.")) return;
    
    try {
      await fetch("/api/timer", {
        method: "DELETE",
        credentials: "include"
      });
      setActiveTimer(null);
      setElapsed(0);
    } catch (err) {
      console.error("Cancel error:", err);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full"
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="p-2 rounded-lg glass hover:bg-white/10">
            <FiArrowLeft />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FiClock className="text-amber-500" />
              Smoke Timer
            </h1>
            <p className="text-gray-400 text-sm">Track your session duration</p>
          </div>
        </div>

        {/* Active Timer */}
        {activeTimer ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass rounded-2xl p-6 mb-6 text-center"
          >
            <div className="text-gray-400 mb-1">Now Smoking</div>
            <div className="text-xl font-semibold text-white mb-1">{activeTimer.brand}</div>
            {activeTimer.product && (
              <div className="text-gray-400 text-sm mb-4">{activeTimer.product}</div>
            )}
            
            {/* Timer Display */}
            <div className="my-8">
              <motion.div
                key={elapsed}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                className="text-6xl font-mono font-bold text-amber-500"
              >
                {formatDuration(elapsed)}
              </motion.div>
              <div className="text-gray-500 text-sm mt-2">
                Started at {new Date(activeTimer.started_at * 1000).toLocaleTimeString()}
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={cancelTimer}
                className="p-4 rounded-xl bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 transition"
              >
                <FiX size={24} />
              </button>
              <button
                onClick={stopTimer}
                disabled={saving}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold flex items-center gap-2 hover:from-red-400 hover:to-orange-400 transition disabled:opacity-50"
              >
                <FiSquare size={20} />
                {saving ? "Stopping..." : "Stop & Log"}
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Start New Timer */}
            {!showStart ? (
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={() => setShowStart(true)}
                className="w-full glass rounded-2xl p-8 mb-6 flex flex-col items-center gap-3 hover:bg-white/10 transition group"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center group-hover:scale-110 transition">
                  <FiPlay size={28} className="ml-1" />
                </div>
                <div className="text-lg font-semibold">Start Timer</div>
                <div className="text-gray-400 text-sm">Track how long your smoke takes</div>
              </motion.button>
            ) : (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="glass rounded-2xl p-6 mb-6"
              >
                <h3 className="text-lg font-semibold mb-4">What are you smoking?</h3>
                <input
                  type="text"
                  placeholder="Brand *"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-amber-500 focus:outline-none mb-3"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Product / Vitola (optional)"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-amber-500 focus:outline-none mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowStart(false)}
                    className="flex-1 p-3 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={startTimer}
                    disabled={!brand.trim() || saving}
                    className="flex-1 p-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:from-amber-400 hover:to-orange-400 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FiPlay size={18} />
                    {saving ? "Starting..." : "Start"}
                  </button>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Brand Averages */}
        {brandDurations.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-4 mb-6"
          >
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <FiTrendingUp className="text-amber-500" />
              Average Duration by Brand
            </h3>
            <div className="space-y-2">
              {brandDurations.map((bd, i) => (
                <div key={bd.brand} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div className="flex items-center gap-2">
                    {i === 0 && <FiAward className="text-amber-500" />}
                    <span className="text-white">{bd.brand}</span>
                    <span className="text-gray-500 text-sm">×{bd.sessions}</span>
                  </div>
                  <span className="text-amber-400 font-mono">
                    {formatDurationReadable(bd.avg_duration)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-4"
          >
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <FiClock className="text-amber-500" />
              Recent Sessions
            </h3>
            <div className="space-y-3">
              {recentSessions.map((session) => {
                const date = new Date(session.started_at * 1000);
                return (
                  <div key={session.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div>
                      <div className="text-white font-medium">{session.brand}</div>
                      <div className="text-gray-500 text-sm">
                        {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-amber-400 font-mono">
                        {formatDurationReadable(session.duration_seconds)}
                      </div>
                      {session.rating && (
                        <div className="text-yellow-500 text-sm">★ {session.rating}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!activeTimer && recentSessions.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <FiClock size={48} className="mx-auto mb-3 opacity-50" />
            <p>No sessions recorded yet</p>
            <p className="text-sm">Start a timer to track your smokes!</p>
          </div>
        )}
      </div>
    </main>
  );
}
