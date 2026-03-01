'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiArrowLeft, FiMusic, FiUsers, FiZap, FiStar,
  FiClock, FiHeart, FiVolume2
} from 'react-icons/fi';

interface PartyData {
  isPartyTime: boolean;
  partyTitle: string;
  partyVibe: string;
  djBooth: {
    nowPlaying: { brand: string; count: number; rating: number } | null;
    upNext: Array<{ brand: string; count: number }>;
  };
  vipList: Array<{
    username: string;
    title: string;
    checkins: number;
    vibe: string;
  }>;
  partyStats: {
    totalGuests: number;
    smokesTonight: number;
    peakHour: number;
    vibeLevel: string;
  };
  dancefloorBrands: Array<{ brand: string; count: number; emoji: string }>;
  lateNightSnacks: Array<{ emoji: string; text: string }>;
  closingTime: string;
}

export default function AfterPartyPage() {
  const [data, setData] = useState<PartyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [vibeUp, setVibeUp] = useState(false);
  const [beatDrop, setBeatDrop] = useState(false);

  useEffect(() => {
    fetch('/api/after-party')
      .then(res => res.json() as Promise<PartyData>)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const triggerVibe = () => {
    setVibeUp(true);
    setBeatDrop(true);
    setTimeout(() => setVibeUp(false), 1500);
    setTimeout(() => setBeatDrop(false), 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-fuchsia-950 flex items-center justify-center">
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-6xl"
        >
          🪩
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-fuchsia-950 flex items-center justify-center text-white">
        <p>The party is setting up...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-fuchsia-950 text-white relative overflow-hidden">
      {/* Disco lights effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            x: ['-50%', '150%'],
            opacity: [0.3, 0.7, 0.3]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 left-0 w-64 h-full bg-gradient-to-r from-transparent via-fuchsia-500/20 to-transparent blur-3xl"
        />
        <motion.div 
          animate={{ 
            x: ['150%', '-50%'],
            opacity: [0.3, 0.7, 0.3]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/3 left-0 w-64 h-full bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent blur-3xl"
        />
        <motion.div 
          animate={{ 
            x: ['-50%', '150%'],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          className="absolute top-2/3 left-0 w-64 h-full bg-gradient-to-r from-transparent via-yellow-500/15 to-transparent blur-3xl"
        />
      </div>

      {/* Disco ball */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute top-4 left-1/2 -translate-x-1/2 text-5xl"
      >
        🪩
      </motion.div>

      {/* Beat drop overlay */}
      <AnimatePresence>
        {beatDrop && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 3, opacity: [1, 0] }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <div className="text-9xl">🔥</div>
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
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <FiVolume2 className="text-fuchsia-400" />
          </motion.div>
          <span className="text-sm font-medium">LIVE</span>
          <span className="w-2 h-2 bg-fuchsia-500 rounded-full animate-pulse" />
        </div>
        <div className="text-xs text-white/40">
          <FiClock className="inline mr-1" />
          {data.closingTime}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 pb-24">
        {/* Party Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8 mt-8"
        >
          <motion.h1 
            animate={vibeUp ? { scale: [1, 1.1, 1], y: [0, -10, 0] } : {}}
            className="text-4xl md:text-5xl font-black mb-2 bg-gradient-to-r from-fuchsia-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent"
          >
            {data.partyTitle}
          </motion.h1>
          <p className="text-lg text-fuchsia-300">{data.partyVibe}</p>
        </motion.div>

        {/* Vibe Button */}
        <motion.div className="flex justify-center mb-8">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={triggerVibe}
            className="px-8 py-4 bg-gradient-to-r from-fuchsia-600 via-pink-600 to-cyan-600 rounded-full font-bold text-lg flex items-center gap-3 shadow-lg shadow-fuchsia-500/30"
          >
            <FiZap className="text-xl" />
            DROP THE BEAT
            <span className="text-2xl">🔥</span>
          </motion.button>
        </motion.div>

        {/* DJ Booth */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-fuchsia-900/40 to-purple-900/40 backdrop-blur rounded-2xl p-5 border border-fuchsia-500/30 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <FiMusic className="text-fuchsia-400 text-xl" />
            <h2 className="font-bold text-lg">DJ Booth</h2>
          </div>
          
          {data.djBooth.nowPlaying ? (
            <div className="mb-4">
              <p className="text-xs text-fuchsia-300 mb-1">NOW PLAYING</p>
              <motion.div
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="bg-black/30 rounded-xl p-4 border border-fuchsia-500/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🎧</span>
                    <div>
                      <p className="font-bold text-xl">{data.djBooth.nowPlaying.brand}</p>
                      <p className="text-sm text-white/60">
                        {data.djBooth.nowPlaying.count} plays • {data.djBooth.nowPlaying.rating}★
                      </p>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="text-4xl"
                  >
                    💿
                  </motion.div>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="bg-black/30 rounded-xl p-4 text-center mb-4">
              <p className="text-white/60">No tracks yet - log a smoke to get it spinning!</p>
            </div>
          )}
          
          {data.djBooth.upNext.length > 0 && (
            <div>
              <p className="text-xs text-white/40 mb-2">UP NEXT</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {data.djBooth.upNext.map((track, i) => (
                  <div 
                    key={track.brand}
                    className="flex-shrink-0 bg-white/5 rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="mr-1">{i === 0 ? '🎵' : '🎶'}</span>
                    {track.brand}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* VIP Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-yellow-900/30 to-amber-900/30 backdrop-blur rounded-2xl p-5 border border-yellow-500/30 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <FiStar className="text-yellow-400 text-xl" />
            <h2 className="font-bold text-lg">VIP Section</h2>
            <span className="text-xs bg-yellow-500/20 px-2 py-0.5 rounded-full text-yellow-300">EXCLUSIVE</span>
          </div>
          
          {data.vipList.length > 0 ? (
            <div className="space-y-3">
              {data.vipList.map((vip, i) => (
                <motion.div
                  key={vip.username}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center justify-between bg-black/20 rounded-xl p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{vip.vibe}</span>
                    <div>
                      <Link 
                        href={`/user/${vip.username}`}
                        className="font-bold hover:text-yellow-300"
                      >
                        @{vip.username}
                      </Link>
                      <p className="text-xs text-yellow-300/70">{vip.title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{vip.checkins}</p>
                    <p className="text-xs text-white/40">smokes</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-black/20 rounded-xl p-4 text-center">
              <p className="text-white/60">VIP list is empty - be the first to party!</p>
            </div>
          )}
        </motion.div>

        {/* Dance Floor */}
        {data.dancefloorBrands.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 backdrop-blur rounded-2xl p-5 border border-cyan-500/30 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <FiUsers className="text-cyan-400 text-xl" />
              <h2 className="font-bold text-lg">Dance Floor</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {data.dancefloorBrands.map((brand, i) => (
                <motion.div
                  key={brand.brand}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="bg-black/20 rounded-xl p-3 text-center"
                >
                  <span className="text-2xl block mb-1">{brand.emoji}</span>
                  <p className="font-medium text-sm truncate">{brand.brand}</p>
                  <p className="text-xs text-cyan-300">{brand.count} vibing</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Party Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 backdrop-blur rounded-2xl p-5 mb-6"
        >
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <FiHeart className="text-pink-400" />
            Party Stats
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-3xl font-black text-fuchsia-400">{data.partyStats.totalGuests}</p>
              <p className="text-xs text-white/60">Party Guests</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-cyan-400">{data.partyStats.smokesTonight}</p>
              <p className="text-xs text-white/60">Smokes Tonight</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-yellow-400">{data.partyStats.peakHour}:00</p>
              <p className="text-xs text-white/60">Peak Hour</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-pink-400">{data.partyStats.vibeLevel}</p>
              <p className="text-xs text-white/60">Vibe Level</p>
            </div>
          </div>
        </motion.div>

        {/* Late Night Snacks */}
        {data.lateNightSnacks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-r from-orange-900/30 to-red-900/30 backdrop-blur rounded-2xl p-5 border border-orange-500/20"
          >
            <h2 className="font-bold text-lg mb-3">🍕 Late Night Munchies</h2>
            <div className="space-y-2">
              {data.lateNightSnacks.map((snack, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span>{snack.emoji}</span>
                  <span className="text-white/80">{snack.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Not party time banner */}
      {!data.isPartyTime && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-20 left-0 right-0 mx-4 bg-fuchsia-900/90 backdrop-blur rounded-xl p-4 text-center z-20"
        >
          <div className="flex items-center justify-center gap-2 text-fuchsia-300">
            <FiClock />
            <span>The After Party runs Saturday 11 PM - 3 AM</span>
          </div>
          <p className="text-sm text-white/60 mt-1">Come back when the real party starts!</p>
        </motion.div>
      )}

      {/* Bottom nav spacer */}
      <div className="h-20" />
    </div>
  );
}
