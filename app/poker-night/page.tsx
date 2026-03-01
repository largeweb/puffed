"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  FiHome,
  FiRefreshCw,
  FiAward,
  FiUsers,
  FiStar,
} from "react-icons/fi";

interface Phase {
  hour: number;
  phase: string;
  emoji: string;
  desc: string;
  blind: number;
}

interface Card {
  suit: string;
  value: string;
  color: string;
}

interface Player {
  id: number;
  username: string;
  brand: string;
  product: string | null;
  rating: number;
  photoUrl: string | null;
  review: string | null;
  time: string;
  card: Card;
}

interface LeaderboardEntry {
  username: string;
  chips: number;
  avgRating: number;
  biggestWin: number;
  topBrand: string | null;
}

interface HandCard {
  brand: string;
  rating: number;
  card: Card;
}

interface PokerData {
  isPokerTime: boolean;
  isPokerDay: boolean;
  currentHour: number;
  dayOfWeek: number;
  timeMessage: string;
  tableStatus: string;
  currentPhase: Phase;
  allPhases: Phase[];
  currentPlayers: Player[];
  leaderboard: LeaderboardEntry[];
  pot: {
    totalHands: number;
    uniquePlayers: number;
    avgRating: number;
    royalFlushes: number;
  };
  myChipStack: {
    chips: number;
    avgRating: number;
    biggestWin: number;
    username: string | null;
    rank: number;
  } | null;
  myHand: HandCard[];
  wisdom: string;
}

export default function PokerNightPage() {
  const [data, setData] = useState<PokerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"hand" | "table" | "chips">("table");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/poker-night");
      if (res.ok) {
        const result = (await res.json()) as PokerData;
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch poker data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getTableGradient = (status: string) => {
    switch (status) {
      case "dealing":
        return "from-emerald-900 via-green-900 to-teal-900";
      case "waiting":
        return "from-slate-900 via-emerald-950 to-gray-900";
      case "after-hours":
        return "from-gray-900 via-slate-900 to-zinc-900";
      case "closed":
        return "from-slate-900 via-gray-900 to-zinc-900";
      default:
        return "from-emerald-900 via-green-900 to-teal-900";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 flex items-center justify-center">
        <motion.div
          animate={{ rotateY: [0, 180, 360] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-6xl"
        >
          🃏
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 flex items-center justify-center text-white">
        <p>Failed to load poker data</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getTableGradient(data.tableStatus)} text-white relative overflow-hidden`}>
      {/* Card patterns in background */}
      {data.isPokerTime && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-4xl"
              style={{
                left: `${(i % 4) * 33 + 10}%`,
                top: `${Math.floor(i / 4) * 35 + 5}%`,
              }}
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            >
              {["♠", "♥", "♦", "♣"][i % 4]}
            </motion.div>
          ))}
        </div>
      )}

      {/* Green felt table effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-800/20 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 p-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition">
            <FiHome className="w-5 h-5" />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold flex items-center gap-2 justify-center">
              <span className="text-3xl">🃏</span> Poker Night
            </h1>
            <p className="text-xs text-emerald-300 mt-1">Friday & Saturday • 7 PM - 2 AM</p>
          </div>
          <button
            onClick={fetchData}
            className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="relative z-10 p-4 pb-24 max-w-lg mx-auto space-y-6">
        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl ${
            data.isPokerTime
              ? "bg-gradient-to-r from-emerald-500/40 to-green-500/40 border border-emerald-400/30"
              : "bg-black/40 border border-gray-600/30"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl">{data.isPokerTime ? data.currentPhase.emoji : "🎴"}</span>
            <div className="flex-1">
              <h2 className="font-bold text-lg">
                {data.isPokerTime ? data.currentPhase.phase : "Table Closed"}
              </h2>
              <p className="text-sm text-emerald-200">{data.timeMessage}</p>
              {data.isPokerTime && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded-full">
                    Blinds: {data.currentPhase.blind}🪙
                  </span>
                  <span className="text-xs text-gray-400">{data.currentPhase.desc}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Blinds Timeline */}
        {data.isPokerTime && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="overflow-x-auto pb-2"
          >
            <div className="flex gap-2 min-w-max">
              {data.allPhases.map((phase) => (
                <div
                  key={phase.hour}
                  className={`px-3 py-2 rounded-xl text-center min-w-[80px] transition-all ${
                    phase.hour === data.currentHour
                      ? "bg-emerald-500/50 border-2 border-emerald-300 scale-105"
                      : phase.hour < data.currentHour || (data.currentHour < 7 && phase.hour >= 19)
                      ? "bg-gray-800/50 opacity-50"
                      : "bg-black/30"
                  }`}
                >
                  <span className="text-xl">{phase.emoji}</span>
                  <p className="text-[10px] font-medium mt-1">{phase.phase}</p>
                  <p className="text-[10px] text-yellow-400">{phase.blind}🪙</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* The Pot - Community Stats */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-yellow-600/30 to-amber-600/30 border border-yellow-500/30"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="text-2xl">💰</span> The Pot
            </h3>
            <span className="text-2xl font-bold text-yellow-300">{data.pot.totalHands} 🪙</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <p className="text-lg font-bold text-emerald-300">{data.pot.uniquePlayers}</p>
              <p className="text-xs text-gray-400">Players</p>
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-300">{data.pot.avgRating}</p>
              <p className="text-xs text-gray-400">Avg Rating</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-400">{data.pot.royalFlushes}</p>
              <p className="text-xs text-gray-400">Royal Flushes</p>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-black/30 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("hand")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              activeTab === "hand"
                ? "bg-emerald-500/50 text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            🎴 Your Hand
          </button>
          <button
            onClick={() => setActiveTab("table")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              activeTab === "table"
                ? "bg-emerald-500/50 text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            <FiUsers className="inline mr-1" /> Table
          </button>
          <button
            onClick={() => setActiveTab("chips")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              activeTab === "chips"
                ? "bg-emerald-500/50 text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            <FiAward className="inline mr-1" /> Chips
          </button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "hand" && (
            <motion.div
              key="hand"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Your Chip Stack */}
              {data.myChipStack && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border border-emerald-400/30">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <span className="text-xl">🪙</span> Your Chip Stack
                  </h3>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-2xl font-bold text-yellow-300">{data.myChipStack.chips}</p>
                      <p className="text-xs text-gray-400">Chips</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-300">#{data.myChipStack.rank}</p>
                      <p className="text-xs text-gray-400">Rank</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-400">{data.myChipStack.avgRating}</p>
                      <p className="text-xs text-gray-400">Avg</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-400">
                        {data.myChipStack.biggestWin === 5 ? "♥" : data.myChipStack.biggestWin}
                      </p>
                      <p className="text-xs text-gray-400">Best</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Your Cards */}
              <div>
                <h3 className="text-sm font-semibold text-emerald-300 mb-3">🎴 Your Hand (Recent Poker Night Smokes)</h3>
                {data.myHand.length > 0 ? (
                  <div className="flex gap-3 justify-center flex-wrap">
                    {data.myHand.map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, rotateY: 180 }}
                        animate={{ opacity: 1, rotateY: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="w-20 h-28 bg-white rounded-lg shadow-lg flex flex-col items-center justify-center relative overflow-hidden"
                      >
                        <span className={`text-3xl ${h.card.color}`}>{h.card.suit}</span>
                        <span className="text-2xl font-bold text-gray-800">{h.card.value}</span>
                        <span className="absolute bottom-1 text-[8px] text-gray-500 px-1 truncate max-w-full">
                          {h.brand.slice(0, 10)}
                        </span>
                        <span className={`absolute top-1 left-1 text-sm ${h.card.color}`}>{h.card.suit}</span>
                        <span className={`absolute bottom-1 right-1 text-sm ${h.card.color} rotate-180`}>{h.card.suit}</span>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-black/20 text-center">
                    <span className="text-4xl block mb-2">🎴</span>
                    <p className="text-gray-400">No cards in your hand yet</p>
                    <p className="text-xs text-gray-500 mt-1">Log a smoke during poker hours to deal in!</p>
                  </div>
                )}
              </div>

              {/* Card Legend */}
              <div className="p-3 rounded-xl bg-black/20 text-xs">
                <p className="text-gray-400 mb-2">Card Suits by Rating:</p>
                <div className="flex justify-around">
                  <span className="text-red-500">♥ 5★</span>
                  <span className="text-red-400">♦ 4★</span>
                  <span className="text-gray-300">♣ 3★</span>
                  <span className="text-gray-400">♠ 1-2★</span>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "table" && (
            <motion.div
              key="table"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Current Players at the Table */}
              <div>
                <h3 className="text-sm font-semibold text-emerald-300 mb-3">
                  {data.isPokerTime ? "🎰 At the Table Tonight" : "🃏 Recent Poker Night Players"}
                </h3>
                {data.currentPlayers.length > 0 ? (
                  <div className="space-y-3">
                    {data.currentPlayers.map((player, i) => (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-3 rounded-xl bg-black/30 flex items-start gap-3"
                      >
                        {/* Player's card */}
                        <div className="w-12 h-16 bg-white rounded-lg flex flex-col items-center justify-center flex-shrink-0 shadow-md">
                          <span className={`text-lg ${player.card.color}`}>{player.card.suit}</span>
                          <span className="text-sm font-bold text-gray-800">{player.card.value}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/profile/${player.username}`}
                              className="font-medium hover:text-emerald-300 transition"
                            >
                              {player.username}
                            </Link>
                            <span className="text-xs text-gray-500">{player.time}</span>
                          </div>
                          <p className="text-sm text-gray-300">
                            {player.brand}
                            {player.product && ` - ${player.product}`}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {[...Array(5)].map((_, j) => (
                              <FiStar
                                key={j}
                                className={`w-3 h-3 ${
                                  j < player.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-600"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-black/20 text-center">
                    <span className="text-4xl block mb-2">🪑</span>
                    <p className="text-gray-400">Table is empty</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {data.isPokerTime ? "Be the first to take a seat!" : "Check back during poker hours"}
                    </p>
                  </div>
                )}
              </div>

              {/* Poker Wisdom */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/20">
                <p className="text-xs text-purple-300 mb-1">🎴 Poker Wisdom</p>
                <p className="text-sm italic">&quot;{data.wisdom}&quot;</p>
              </div>
            </motion.div>
          )}

          {activeTab === "chips" && (
            <motion.div
              key="chips"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Chip Leaderboard */}
              <div>
                <h3 className="text-sm font-semibold text-emerald-300 mb-3">🏆 High Rollers</h3>
                {data.leaderboard.length > 0 ? (
                  <div className="space-y-2">
                    {data.leaderboard.map((entry, i) => (
                      <div
                        key={entry.username}
                        className={`p-3 rounded-xl flex items-center gap-3 ${
                          i === 0
                            ? "bg-gradient-to-r from-yellow-500/40 to-amber-500/40 border border-yellow-400/30"
                            : i === 1
                            ? "bg-gradient-to-r from-gray-400/20 to-gray-500/20"
                            : i === 2
                            ? "bg-gradient-to-r from-amber-700/20 to-amber-800/20"
                            : "bg-black/20"
                        }`}
                      >
                        <span className="text-2xl w-8 text-center">
                          {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                        </span>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/profile/${entry.username}`}
                            className="font-medium hover:text-emerald-300 transition"
                          >
                            {entry.username}
                          </Link>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            {entry.topBrand && <span>🎯 {entry.topBrand}</span>}
                            <span>⭐ {entry.avgRating}</span>
                            {entry.biggestWin === 5 && <span className="text-red-400">♥ Royal</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-yellow-300 text-lg">{entry.chips}</p>
                          <p className="text-xs text-gray-500">chips</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-black/20 text-center">
                    <span className="text-4xl block mb-2">🪙</span>
                    <p className="text-gray-400">No high rollers yet</p>
                    <p className="text-xs text-gray-500 mt-1">Be the first to stack chips!</p>
                  </div>
                )}
              </div>

              {/* Stats explanation */}
              <div className="p-3 rounded-xl bg-black/20 text-xs text-gray-400">
                <p className="mb-1">💡 How chips work:</p>
                <p>Every poker night smoke = 1 chip. 5-star ratings are Royal Flushes! Top the leaderboard to become the house champion.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Link
            href="/checkin"
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-center font-semibold hover:from-emerald-400 hover:to-green-400 transition"
          >
            🃏 Deal Me In
          </Link>
          <Link
            href="/bonfire"
            className="py-3 px-4 rounded-xl bg-black/40 hover:bg-black/60 transition"
          >
            🔥
          </Link>
        </div>

        {/* Related Links */}
        <div className="flex gap-2 justify-center text-sm flex-wrap">
          <Link href="/saturday-night" className="text-emerald-300 hover:text-emerald-200">
            🌃 Saturday Night
          </Link>
          <span className="text-gray-600">•</span>
          <Link href="/nightcap" className="text-emerald-300 hover:text-emerald-200">
            🌙 Nightcap
          </Link>
          <span className="text-gray-600">•</span>
          <Link href="/speakeasy" className="text-emerald-300 hover:text-emerald-200">
            🎭 Speakeasy
          </Link>
        </div>
      </main>
    </div>
  );
}
