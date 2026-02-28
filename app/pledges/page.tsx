"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiHome,
  FiRefreshCw,
  FiTarget,
  FiCheck,
  FiPlus,
  FiX,
  FiAward,
  FiUsers,
  FiTrendingUp,
} from "react-icons/fi";

interface PledgeType {
  id: string;
  emoji: string;
  label: string;
  desc: string;
}

interface Pledge {
  id: number;
  user_id: number;
  username: string;
  pledge_type: string;
  emoji: string;
  label: string;
  completed: boolean;
  created_at: number;
}

interface LeaderboardEntry {
  username: string;
  completed: number;
  total: number;
}

interface PledgesData {
  isWeekend: boolean;
  weekendStart: string;
  weekendEnd: string;
  pledgeTypes: PledgeType[];
  pledges: Pledge[];
  myPledges: Pledge[];
  stats: {
    totalPledges: number;
    completedPledges: number;
    completionRate: number;
    uniqueUsers: number;
  };
  leaderboard: LeaderboardEntry[];
}

export default function WeekendPledgesPage() {
  const router = useRouter();
  const [data, setData] = useState<PledgesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"my" | "community" | "leaderboard">("my");
  const [showPledgeModal, setShowPledgeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/weekend-pledges");
      if (res.ok) {
        const json: PledgesData = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Failed to fetch pledges:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const makePledge = async (pledgeType: string) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/weekend-pledges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pledgeType }),
      });
      if (res.ok) {
        setShowPledgeModal(false);
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to make pledge");
      }
    } catch (error) {
      console.error("Failed to make pledge:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const removePledge = async (pledgeType: string) => {
    if (!confirm("Remove this pledge?")) return;
    try {
      await fetch(`/api/weekend-pledges?type=${pledgeType}`, { method: "DELETE" });
      fetchData();
    } catch (error) {
      console.error("Failed to remove pledge:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-teal-900 to-cyan-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <FiTarget className="w-12 h-12 text-emerald-400" />
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-teal-900 to-cyan-950 p-4">
        <div className="text-center text-emerald-300 py-12">
          Failed to load pledges. Please try again.
        </div>
      </div>
    );
  }

  const myPledgedTypes = new Set(data.myPledges.map((p) => p.pledge_type));
  const availablePledges = data.pledgeTypes.filter((pt) => !myPledgedTypes.has(pt.id));

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-teal-900 to-cyan-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-emerald-950/90 backdrop-blur-sm border-b border-emerald-800/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 text-emerald-400 hover:text-emerald-300"
          >
            <FiHome className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-emerald-100 flex items-center gap-2">
            <FiTarget className="w-5 h-5" />
            Weekend Pledges
          </h1>
          <button
            onClick={fetchData}
            className="p-2 text-emerald-400 hover:text-emerald-300"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Weekend Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {data.isWeekend ? (
            <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl p-6 border border-emerald-500/30">
              <div className="text-4xl mb-2">🎯</div>
              <h2 className="text-xl font-bold text-emerald-100 mb-1">
                Weekend in Progress!
              </h2>
              <p className="text-emerald-300/80 text-sm">
                {data.weekendStart} → {data.weekendEnd}
              </p>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl p-6 border border-amber-500/30">
              <div className="text-4xl mb-2">📅</div>
              <h2 className="text-xl font-bold text-amber-100 mb-1">
                Coming Up: Next Weekend
              </h2>
              <p className="text-amber-300/80 text-sm">
                Set your pledges now for {data.weekendStart}!
              </p>
            </div>
          )}
        </motion.div>

        {/* Community Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-2"
        >
          <div className="bg-emerald-900/30 rounded-xl p-3 text-center border border-emerald-800/30">
            <div className="text-2xl font-bold text-emerald-100">{data.stats.totalPledges}</div>
            <div className="text-xs text-emerald-400">Pledges</div>
          </div>
          <div className="bg-emerald-900/30 rounded-xl p-3 text-center border border-emerald-800/30">
            <div className="text-2xl font-bold text-green-400">{data.stats.completedPledges}</div>
            <div className="text-xs text-emerald-400">Done</div>
          </div>
          <div className="bg-emerald-900/30 rounded-xl p-3 text-center border border-emerald-800/30">
            <div className="text-2xl font-bold text-cyan-400">{data.stats.completionRate}%</div>
            <div className="text-xs text-emerald-400">Rate</div>
          </div>
          <div className="bg-emerald-900/30 rounded-xl p-3 text-center border border-emerald-800/30">
            <div className="text-2xl font-bold text-teal-400">{data.stats.uniqueUsers}</div>
            <div className="text-xs text-emerald-400">Users</div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex bg-emerald-900/30 rounded-xl p-1 border border-emerald-800/30">
          {[
            { id: "my", label: "My Pledges", icon: FiTarget },
            { id: "community", label: "Community", icon: FiUsers },
            { id: "leaderboard", label: "Leaders", icon: FiAward },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-emerald-600 text-white shadow-lg"
                  : "text-emerald-400 hover:text-emerald-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* My Pledges Tab */}
        {activeTab === "my" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Make a Pledge Button */}
            {availablePledges.length > 0 && (
              <button
                onClick={() => setShowPledgeModal(true)}
                className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl text-white font-semibold hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg"
              >
                <FiPlus className="w-5 h-5" />
                Make a Pledge
              </button>
            )}

            {data.myPledges.length === 0 ? (
              <div className="text-center py-12 text-emerald-400/80">
                <FiTarget className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pledges yet!</p>
                <p className="text-sm mt-1">Set your weekend goals above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.myPledges.map((pledge) => (
                  <motion.div
                    key={pledge.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-4 p-4 rounded-xl border ${
                      pledge.completed
                        ? "bg-green-900/30 border-green-500/50"
                        : "bg-emerald-900/30 border-emerald-700/30"
                    }`}
                  >
                    <div className="text-3xl">{pledge.emoji}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-emerald-100">{pledge.label}</div>
                      <div className="text-sm text-emerald-400/80">
                        {pledge.completed ? (
                          <span className="text-green-400 flex items-center gap-1">
                            <FiCheck className="w-4 h-4" /> Completed!
                          </span>
                        ) : (
                          "In progress..."
                        )}
                      </div>
                    </div>
                    {pledge.completed ? (
                      <div className="text-3xl">✅</div>
                    ) : (
                      <button
                        onClick={() => removePledge(pledge.pledge_type)}
                        className="p-2 text-emerald-500 hover:text-red-400 transition-colors"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Progress Summary */}
            {data.myPledges.length > 0 && (
              <div className="bg-emerald-900/20 rounded-xl p-4 border border-emerald-800/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-emerald-300 text-sm">Your Progress</span>
                  <span className="text-emerald-100 font-bold">
                    {data.myPledges.filter((p) => p.completed).length} / {data.myPledges.length}
                  </span>
                </div>
                <div className="h-3 bg-emerald-900/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(data.myPledges.filter((p) => p.completed).length / data.myPledges.length) * 100}%`,
                    }}
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Community Tab */}
        {activeTab === "community" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {data.pledges.length === 0 ? (
              <div className="text-center py-12 text-emerald-400/80">
                <FiUsers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pledges yet this weekend</p>
                <p className="text-sm mt-1">Be the first to set a goal!</p>
              </div>
            ) : (
              data.pledges.map((pledge) => (
                <motion.div
                  key={pledge.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-3 p-4 rounded-xl border ${
                    pledge.completed
                      ? "bg-green-900/20 border-green-500/30"
                      : "bg-emerald-900/20 border-emerald-800/30"
                  }`}
                >
                  <div className="text-2xl">{pledge.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/profile/${pledge.username}`}
                      className="font-medium text-emerald-100 hover:text-cyan-400 transition-colors"
                    >
                      {pledge.username}
                    </Link>
                    <div className="text-sm text-emerald-400/80 truncate">{pledge.label}</div>
                  </div>
                  {pledge.completed && (
                    <div className="flex items-center gap-1 text-green-400 text-sm">
                      <FiCheck className="w-4 h-4" />
                      <span>Done</span>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === "leaderboard" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {data.leaderboard.length === 0 ? (
              <div className="text-center py-12 text-emerald-400/80">
                <FiAward className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pledges completed yet</p>
                <p className="text-sm mt-1">Be the first to lead!</p>
              </div>
            ) : (
              data.leaderboard.map((entry, index) => (
                <motion.div
                  key={entry.username}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 bg-emerald-900/30 rounded-xl border border-emerald-800/30"
                >
                  <div className="text-2xl font-bold text-emerald-400 w-8 text-center">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                  </div>
                  <Link
                    href={`/profile/${entry.username}`}
                    className="flex-1 font-medium text-emerald-100 hover:text-cyan-400 transition-colors"
                  >
                    {entry.username}
                  </Link>
                  <div className="text-right">
                    <div className="text-green-400 font-bold">{entry.completed} ✓</div>
                    <div className="text-xs text-emerald-400/80">of {entry.total}</div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {/* Quick Links */}
        <div className="flex flex-wrap gap-2 justify-center pt-4">
          <Link
            href="/saturday-cartoons"
            className="flex items-center gap-1 px-3 py-2 bg-emerald-900/30 rounded-lg text-emerald-400 hover:text-emerald-300 text-sm border border-emerald-800/30"
          >
            📺 Saturday Cartoons
          </Link>
          <Link
            href="/weekend-scoreboard"
            className="flex items-center gap-1 px-3 py-2 bg-emerald-900/30 rounded-lg text-emerald-400 hover:text-emerald-300 text-sm border border-emerald-800/30"
          >
            🏆 Weekend Scoreboard
          </Link>
          <Link
            href="/bingo"
            className="flex items-center gap-1 px-3 py-2 bg-emerald-900/30 rounded-lg text-emerald-400 hover:text-emerald-300 text-sm border border-emerald-800/30"
          >
            🎲 Smoke Bingo
          </Link>
        </div>
      </main>

      {/* Pledge Modal */}
      <AnimatePresence>
        {showPledgeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowPledgeModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-gradient-to-b from-emerald-900 to-emerald-950 rounded-2xl border border-emerald-700/50 max-h-[80vh] overflow-hidden"
            >
              <div className="p-4 border-b border-emerald-800/50 flex items-center justify-between">
                <h3 className="text-lg font-bold text-emerald-100">Choose Your Pledge</h3>
                <button
                  onClick={() => setShowPledgeModal(false)}
                  className="p-2 text-emerald-400 hover:text-emerald-300"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
                {availablePledges.map((pledge) => (
                  <button
                    key={pledge.id}
                    onClick={() => makePledge(pledge.id)}
                    disabled={submitting}
                    className="w-full flex items-center gap-4 p-4 bg-emerald-800/30 hover:bg-emerald-700/40 rounded-xl text-left transition-colors disabled:opacity-50 border border-emerald-700/30"
                  >
                    <div className="text-3xl">{pledge.emoji}</div>
                    <div>
                      <div className="font-semibold text-emerald-100">{pledge.label}</div>
                      <div className="text-sm text-emerald-400/80">{pledge.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
