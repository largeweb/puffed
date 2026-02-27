"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { FiArrowLeft, FiZap, FiGift, FiInfo, FiVolume2, FiVolumeX } from "react-icons/fi";

interface SlotSymbol {
  emoji: string;
  name: string;
  value: number;
}

interface Reel {
  position: number;
  symbol: SlotSymbol;
}

interface SpinResult {
  reels: Reel[];
  result: "jackpot" | "double" | "miss";
  message: string;
  points: number;
  brandSuggestion: string | null;
  player: string | null;
}

interface SlotsInfo {
  symbols: SlotSymbol[];
  payouts: {
    jackpot: string;
    double: string;
    miss: string;
  };
}

// All possible symbols for the spinning animation
const ALL_SYMBOLS = ["🚬", "☕", "🥃", "🌙", "⭐", "🔥", "💎", "🏆"];

function SpinningReel({ 
  finalSymbol, 
  isSpinning, 
  delay,
  onStop 
}: { 
  finalSymbol: string; 
  isSpinning: boolean;
  delay: number;
  onStop: () => void;
}) {
  const [displaySymbol, setDisplaySymbol] = useState(finalSymbol || "🚬");
  const [spinning, setSpinning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isSpinning) {
      setSpinning(true);
      let i = 0;
      intervalRef.current = setInterval(() => {
        setDisplaySymbol(ALL_SYMBOLS[i % ALL_SYMBOLS.length]);
        i++;
      }, 80);

      // Stop after delay
      setTimeout(() => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setDisplaySymbol(finalSymbol);
        setSpinning(false);
        onStop();
      }, 1000 + delay);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isSpinning, finalSymbol, delay, onStop]);

  return (
    <motion.div
      className={`
        w-24 h-28 sm:w-28 sm:h-32 
        flex items-center justify-center
        bg-gradient-to-b from-gray-800 to-gray-900
        rounded-xl border-4 
        ${spinning ? "border-amber-500 shadow-lg shadow-amber-500/50" : "border-gray-700"}
        transition-all duration-200
      `}
      animate={spinning ? { scale: [1, 1.02, 1] } : {}}
      transition={{ repeat: Infinity, duration: 0.2 }}
    >
      <motion.span 
        className="text-5xl sm:text-6xl"
        animate={spinning ? { y: [-2, 2, -2] } : {}}
        transition={{ repeat: Infinity, duration: 0.1 }}
      >
        {displaySymbol}
      </motion.span>
    </motion.div>
  );
}

export default function SlotsPage() {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [totalSpins, setTotalSpins] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [info, setInfo] = useState<SlotsInfo | null>(null);
  const [reelsStopped, setReelsStopped] = useState([false, false, false]);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    // Fetch slot info
    fetch("/api/slots")
      .then(r => r.json())
      .then(data => setInfo(data as SlotsInfo))
      .catch(console.error);
  }, []);

  const spin = async () => {
    if (spinning) return;
    
    setSpinning(true);
    setShowResult(false);
    setReelsStopped([false, false, false]);
    setResult(null);

    try {
      const res = await fetch("/api/slots", { method: "POST" });
      const data = await res.json() as SpinResult;
      
      // Set result but don't show yet (wait for reels to stop)
      setResult(data);
      setTotalSpins(prev => prev + 1);
      setTotalPoints(prev => prev + data.points);
    } catch (error) {
      console.error("Spin error:", error);
      setSpinning(false);
    }
  };

  const handleReelStop = (index: number) => {
    setReelsStopped(prev => {
      const newState = [...prev];
      newState[index] = true;
      
      // If all reels stopped, show result
      if (newState.every(Boolean)) {
        setSpinning(false);
        setTimeout(() => setShowResult(true), 200);
      }
      
      return newState;
    });
  };

  const getResultColor = (resultType: string) => {
    switch (resultType) {
      case "jackpot": return "from-amber-500 to-yellow-300";
      case "double": return "from-purple-500 to-pink-400";
      default: return "from-gray-500 to-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-gray-900 to-amber-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-md bg-black/40 border-b border-amber-500/20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="text-amber-400 hover:text-amber-300">
            <FiArrowLeft size={24} />
          </Link>
          <h1 className="text-lg font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
            🎰 Cigar Slots
          </h1>
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FiInfo size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Stats Banner */}
        <div className="flex justify-center gap-6 mb-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{totalSpins}</div>
            <div className="text-xs text-gray-500">Spins</div>
          </div>
          <div className="h-8 w-px bg-gray-700" />
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{totalPoints}</div>
            <div className="text-xs text-gray-500">Points</div>
          </div>
        </div>

        {/* Slot Machine */}
        <div className="bg-gradient-to-b from-gray-800/80 to-gray-900/90 rounded-3xl p-6 border-2 border-amber-500/30 shadow-2xl shadow-amber-500/10">
          {/* Machine Header */}
          <div className="text-center mb-6">
            <div className="inline-block bg-gradient-to-r from-amber-600 to-yellow-500 text-black font-bold px-6 py-2 rounded-full text-sm">
              🎰 CIGAR SLOTS 🎰
            </div>
          </div>

          {/* Reels Container */}
          <div className="bg-gray-950 rounded-2xl p-4 mb-6 border border-gray-800">
            <div className="flex justify-center gap-3 sm:gap-4">
              <SpinningReel
                finalSymbol={result?.reels[0]?.symbol.emoji || "🚬"}
                isSpinning={spinning}
                delay={0}
                onStop={() => handleReelStop(0)}
              />
              <SpinningReel
                finalSymbol={result?.reels[1]?.symbol.emoji || "☕"}
                isSpinning={spinning}
                delay={300}
                onStop={() => handleReelStop(1)}
              />
              <SpinningReel
                finalSymbol={result?.reels[2]?.symbol.emoji || "🥃"}
                isSpinning={spinning}
                delay={600}
                onStop={() => handleReelStop(2)}
              />
            </div>
          </div>

          {/* Result Display */}
          <AnimatePresence>
            {showResult && result && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-6"
              >
                <div className={`
                  text-center p-4 rounded-xl
                  ${result.result === "jackpot" ? "bg-gradient-to-r from-amber-600/30 to-yellow-500/30 border-2 border-amber-500" : ""}
                  ${result.result === "double" ? "bg-purple-600/20 border border-purple-500/50" : ""}
                  ${result.result === "miss" ? "bg-gray-800/50 border border-gray-700" : ""}
                `}>
                  <motion.p 
                    className={`text-xl font-bold bg-gradient-to-r ${getResultColor(result.result)} bg-clip-text text-transparent`}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.3 }}
                  >
                    {result.message}
                  </motion.p>
                  
                  {result.points > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="mt-2 text-green-400 font-bold"
                    >
                      +{result.points} points!
                    </motion.div>
                  )}

                  {result.brandSuggestion && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="mt-3 pt-3 border-t border-gray-700"
                    >
                      <p className="text-sm text-gray-400 mb-1">
                        <FiGift className="inline mr-1" />
                        Lucky suggestion:
                      </p>
                      <Link 
                        href={`/cigar/${encodeURIComponent(result.brandSuggestion)}`}
                        className="text-amber-400 font-semibold hover:text-amber-300 transition-colors"
                      >
                        {result.brandSuggestion} →
                      </Link>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spin Button */}
          <button
            onClick={spin}
            disabled={spinning}
            className={`
              w-full py-4 rounded-xl font-bold text-xl
              transition-all duration-200
              ${spinning 
                ? "bg-gray-700 text-gray-400 cursor-wait" 
                : "bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black active:scale-98"
              }
              shadow-lg shadow-amber-500/20
            `}
          >
            <span className="flex items-center justify-center gap-2">
              <FiZap className={spinning ? "animate-spin" : ""} />
              {spinning ? "Spinning..." : "PULL THE LEVER!"}
            </span>
          </button>
        </div>

        {/* Info Panel */}
        <AnimatePresence>
          {showInfo && info && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 overflow-hidden"
            >
              <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
                <h3 className="font-bold text-amber-400 mb-3">🎯 Symbol Values</h3>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {info.symbols.map((s) => (
                    <div key={s.name} className="text-center bg-gray-900/50 rounded-lg p-2">
                      <div className="text-2xl">{s.emoji}</div>
                      <div className="text-xs text-gray-500">{s.value}pts</div>
                    </div>
                  ))}
                </div>
                
                <h3 className="font-bold text-amber-400 mb-2">💰 Payouts</h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>🎰 <span className="text-amber-300">Triple Match:</span> {info.payouts.jackpot}</li>
                  <li>✨ <span className="text-purple-300">Double Match:</span> {info.payouts.double}</li>
                  <li>💨 <span className="text-gray-500">No Match:</span> {info.payouts.miss}</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tips */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Match 3 symbols for a jackpot! 🏆 Get brand suggestions on wins!
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Points are just for fun - no real money involved 😊
          </p>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <Link 
            href="/dashboard" 
            className="text-amber-400 hover:text-amber-300 text-sm"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
