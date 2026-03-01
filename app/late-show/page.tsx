'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiArrowLeft, FiTv, FiMic, FiMusic, FiUsers,
  FiStar, FiHeart, FiZap, FiClock
} from 'react-icons/fi';

interface ShowData {
  isShowtime: boolean;
  showTitle: string;
  showEmoji: string;
  host: {
    greeting: string;
    monologue: string[];
  };
  tonightsGuests: Array<{
    username: string;
    intro: string;
    checkins: number;
    topBrand: string;
  }>;
  topTen: {
    title: string;
    items: string[];
  };
  headlines: Array<{
    text: string;
    emoji: string;
  }>;
  musicalGuest: {
    brand: string;
    intro: string;
    stats: { checkins: number; avgRating: number };
  } | null;
  audienceStats: {
    totalViewers: number;
    activeNow: number;
    applause: number;
  };
  signOff: string;
}

export default function LateShowPage() {
  const [data, setData] = useState<ShowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [showApplause, setShowApplause] = useState(false);

  useEffect(() => {
    fetch('/api/late-show')
      .then(res => res.json() as Promise<ShowData>)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const triggerApplause = () => {
    setShowApplause(true);
    setTimeout(() => setShowApplause(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-6xl"
        >
          🎬
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 flex items-center justify-center text-white">
        <p>The show is experiencing technical difficulties...</p>
      </div>
    );
  }

  const segments = [
    // Opening
    <motion.div
      key="opening"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center"
    >
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-8xl mb-6"
      >
        {data.showEmoji}
      </motion.div>
      <motion.h1 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent"
      >
        {data.showTitle}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xl text-indigo-300"
      >
        {data.host.greeting}
      </motion.p>
      
      {/* Applause meter */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-8 flex items-center justify-center gap-3"
      >
        <button 
          onClick={triggerApplause}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-full font-semibold flex items-center gap-2 hover:scale-105 transition-transform"
        >
          👏 Applause!
        </button>
      </motion.div>
    </motion.div>,

    // Monologue
    <motion.div
      key="monologue"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-6">
        <FiMic className="text-3xl text-amber-400" />
        <h2 className="text-2xl font-bold">Tonight&apos;s Monologue</h2>
      </div>
      <div className="space-y-4">
        {data.host.monologue.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.5 }}
            className="bg-white/5 backdrop-blur rounded-xl p-4 border-l-4 border-amber-400"
          >
            <p className="text-lg">{line}</p>
          </motion.div>
        ))}
      </div>
      
      {/* Headlines ticker */}
      {data.headlines.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-8 bg-red-600/20 rounded-xl p-4"
        >
          <p className="text-xs text-red-400 mb-2 flex items-center gap-2">
            <span className="animate-pulse">●</span> BREAKING NEWS
          </p>
          <div className="space-y-2">
            {data.headlines.map((h, i) => (
              <p key={i} className="flex items-center gap-2">
                <span>{h.emoji}</span>
                <span>{h.text}</span>
              </p>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>,

    // Tonight's Guests
    <motion.div
      key="guests"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-6">
        <FiUsers className="text-3xl text-purple-400" />
        <h2 className="text-2xl font-bold">Tonight&apos;s Guests</h2>
      </div>
      {data.tonightsGuests.length > 0 ? (
        <div className="space-y-4">
          {data.tonightsGuests.map((guest, i) => (
            <motion.div
              key={guest.username}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.3 }}
              className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 backdrop-blur rounded-xl p-5 border border-purple-500/30"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">
                      {i === 0 ? "⭐" : i === 1 ? "🌟" : "✨"}
                    </span>
                    <Link 
                      href={`/user/${guest.username}`}
                      className="text-xl font-bold hover:text-purple-300"
                    >
                      @{guest.username}
                    </Link>
                  </div>
                  <p className="text-purple-300 italic">&ldquo;{guest.intro}&rdquo;</p>
                </div>
                <div className="text-right text-sm text-white/60">
                  <p>{guest.checkins} check-ins today</p>
                  <p className="text-amber-400">🚬 {guest.topBrand}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white/5 rounded-xl p-8 text-center">
          <p className="text-white/60">No guests tonight yet...</p>
          <p className="text-sm text-white/40 mt-2">Log a smoke to make an appearance!</p>
        </div>
      )}
    </motion.div>,

    // Top 10
    <motion.div
      key="topten"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-6">
        <FiStar className="text-3xl text-yellow-400" />
        <h2 className="text-2xl font-bold">{data.topTen.title}</h2>
      </div>
      <div className="bg-gradient-to-b from-yellow-500/10 to-amber-500/10 rounded-xl p-6 border border-yellow-500/20">
        {data.topTen.items.length > 0 ? (
          <div className="space-y-3">
            {data.topTen.items.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className={`p-3 rounded-lg ${
                  i === data.topTen.items.length - 1 
                    ? 'bg-yellow-500/30 text-yellow-100 font-bold text-lg' 
                    : 'bg-white/5'
                }`}
              >
                {item}
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-center text-white/60">No rankings yet this week</p>
        )}
      </div>
    </motion.div>,

    // Musical Guest
    <motion.div
      key="musical"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-6">
        <FiMusic className="text-3xl text-pink-400" />
        <h2 className="text-2xl font-bold">Musical Guest</h2>
      </div>
      {data.musicalGuest ? (
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="bg-gradient-to-br from-pink-500/20 to-fuchsia-500/20 rounded-xl p-8 border border-pink-500/30 text-center"
        >
          <p className="text-pink-300 italic mb-4">{data.musicalGuest.intro}</p>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-5xl font-bold mb-4 bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent"
          >
            🎸 {data.musicalGuest.brand} 🎸
          </motion.div>
          <div className="flex justify-center gap-8 text-white/60">
            <div>
              <p className="text-2xl font-bold text-pink-400">{data.musicalGuest.stats.checkins}</p>
              <p className="text-sm">Today&apos;s plays</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{data.musicalGuest.stats.avgRating}★</p>
              <p className="text-sm">Crowd rating</p>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="bg-white/5 rounded-xl p-8 text-center">
          <p className="text-4xl mb-4">🎤</p>
          <p className="text-white/60">No musical guest tonight</p>
          <p className="text-sm text-white/40">Log a smoke to get a brand featured!</p>
        </div>
      )}
    </motion.div>,

    // Sign Off
    <motion.div
      key="signoff"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-8xl mb-6"
      >
        🌙
      </motion.div>
      <h2 className="text-3xl font-bold mb-6">That&apos;s Our Show!</h2>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xl text-indigo-300 max-w-md mx-auto mb-8"
      >
        {data.signOff}
      </motion.p>
      
      {/* Audience stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="bg-white/5 rounded-xl p-6 max-w-md mx-auto"
      >
        <p className="text-sm text-white/60 mb-4">Tonight&apos;s Audience</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-bold">{data.audienceStats.totalViewers}</p>
            <p className="text-xs text-white/40">Total viewers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{data.audienceStats.activeNow}</p>
            <p className="text-xs text-white/40">Active today</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-pink-400">{data.audienceStats.applause}</p>
            <p className="text-xs text-white/40">👏 Applause</p>
          </div>
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="mt-8"
      >
        <Link 
          href="/dashboard"
          className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full font-semibold inline-flex items-center gap-2 hover:opacity-90"
        >
          <FiTv />
          Back to Dashboard
        </Link>
      </motion.div>
    </motion.div>
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white relative overflow-hidden">
      {/* Stage lights effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-32 h-[500px] bg-gradient-to-b from-amber-400/10 to-transparent rotate-12 blur-3xl" />
        <div className="absolute top-0 right-1/4 w-32 h-[500px] bg-gradient-to-b from-purple-400/10 to-transparent -rotate-12 blur-3xl" />
      </div>
      
      {/* Applause overlay */}
      <AnimatePresence>
        {showApplause && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.5, 1] }}
              className="text-9xl"
            >
              👏
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="relative z-10 p-4 flex items-center justify-between">
        <Link 
          href="/dashboard"
          className="p-2 rounded-full bg-white/10 hover:bg-white/20"
        >
          <FiArrowLeft />
        </Link>
        <div className="flex items-center gap-2">
          <FiTv className="text-amber-400" />
          <span className="text-sm font-medium">LIVE</span>
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </div>
        <div className="flex gap-2">
          {segments.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSegment(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                currentSegment === i ? "bg-amber-400 w-6" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 py-8 min-h-[70vh] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <div key={currentSegment}>
            {segments[currentSegment]}
          </div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="relative z-10 p-4 flex justify-between">
        <button
          onClick={() => setCurrentSegment(Math.max(0, currentSegment - 1))}
          disabled={currentSegment === 0}
          className={`px-6 py-3 rounded-full font-semibold ${
            currentSegment === 0 
              ? "bg-white/5 text-white/30" 
              : "bg-white/10 hover:bg-white/20"
          }`}
        >
          Previous
        </button>
        <button
          onClick={() => setCurrentSegment(Math.min(segments.length - 1, currentSegment + 1))}
          disabled={currentSegment === segments.length - 1}
          className={`px-6 py-3 rounded-full font-semibold ${
            currentSegment === segments.length - 1
              ? "bg-white/5 text-white/30"
              : "bg-gradient-to-r from-amber-500 to-yellow-600 hover:opacity-90"
          }`}
        >
          Next
        </button>
      </div>

      {/* Show timing */}
      {!data.isShowtime && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-20 left-0 right-0 mx-4 bg-indigo-900/90 backdrop-blur rounded-xl p-4 text-center z-20"
        >
          <div className="flex items-center justify-center gap-2 text-indigo-300">
            <FiClock />
            <span>Showtime is 8 PM - 2 AM</span>
          </div>
          <p className="text-sm text-white/60 mt-1">But you can still catch the rerun!</p>
        </motion.div>
      )}
    </div>
  );
}
