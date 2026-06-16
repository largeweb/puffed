'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRefreshCw, FiStar, FiUsers, FiChevronRight } from 'react-icons/fi';
import Link from 'next/link';

interface RouletteResult {
  brand: string;
  avgRating: number;
  checkinCount: number;
  topFlavors: string[];
}

// Top brands with their data (curated list)
const TOP_CIGARS: RouletteResult[] = [
  { brand: "Arturo Fuente", avgRating: 4.5, checkinCount: 12, topFlavors: ["Cedar", "Cream", "Earth"] },
  { brand: "Padron", avgRating: 4.8, checkinCount: 8, topFlavors: ["Chocolate", "Coffee", "Spice"] },
  { brand: "My Father", avgRating: 4.6, checkinCount: 6, topFlavors: ["Pepper", "Leather", "Cocoa"] },
  { brand: "Oliva", avgRating: 4.3, checkinCount: 10, topFlavors: ["Earth", "Pepper", "Wood"] },
  { brand: "Davidoff", avgRating: 4.7, checkinCount: 5, topFlavors: ["Cream", "Cedar", "Honey"] },
  { brand: "Rocky Patel", avgRating: 4.2, checkinCount: 9, topFlavors: ["Leather", "Coffee", "Spice"] },
  { brand: "Ashton", avgRating: 4.4, checkinCount: 7, topFlavors: ["Cedar", "Vanilla", "Cream"] },
  { brand: "Montecristo", avgRating: 4.5, checkinCount: 11, topFlavors: ["Earth", "Nuts", "Wood"] },
  { brand: "Romeo y Julieta", avgRating: 4.3, checkinCount: 8, topFlavors: ["Cedar", "Spice", "Leather"] },
  { brand: "Liga Privada", avgRating: 4.9, checkinCount: 4, topFlavors: ["Chocolate", "Coffee", "Earth"] },
  { brand: "Perdomo", avgRating: 4.1, checkinCount: 6, topFlavors: ["Cream", "Toast", "Vanilla"] },
  { brand: "CAO", avgRating: 4.0, checkinCount: 5, topFlavors: ["Pepper", "Cocoa", "Wood"] },
];

export default function CigarRoulette() {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<RouletteResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const spin = useCallback(() => {
    if (spinning) return;
    
    setSpinning(true);
    setShowResult(false);
    setResult(null);

    // Random delay for suspense (1.5-2.5 seconds)
    const spinTime = 1500 + Math.random() * 1000;
    
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * TOP_CIGARS.length);
      setResult(TOP_CIGARS[randomIndex]);
      setSpinning(false);
      setShowResult(true);
    }, spinTime);
  }, [spinning]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-amber-900/40 via-orange-900/30 to-yellow-900/20 border border-amber-700/40 rounded-2xl p-5 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎰</span>
          <h3 className="text-lg font-bold text-amber-100">Cigar Roulette</h3>
        </div>
        <span className="text-xs text-amber-400/70 bg-amber-900/30 px-2 py-1 rounded-full">
          Try something new!
        </span>
      </div>

      {/* Spin Button / Result */}
      <AnimatePresence mode="wait">
        {!showResult ? (
          <motion.div
            key="spinner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-4"
          >
            <motion.button
              onClick={spin}
              disabled={spinning}
              whileHover={!spinning ? { scale: 1.05 } : {}}
              whileTap={!spinning ? { scale: 0.95 } : {}}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                spinning 
                  ? 'bg-gradient-to-br from-amber-600 to-orange-600 cursor-wait' 
                  : 'bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 cursor-pointer'
              }`}
            >
              <motion.div
                animate={spinning ? { rotate: 360 } : { rotate: 0 }}
                transition={spinning ? { duration: 0.5, repeat: Infinity, ease: "linear" } : {}}
              >
                <FiRefreshCw className={`text-3xl text-white ${spinning ? '' : ''}`} />
              </motion.div>
              
              {/* Glow effect */}
              {spinning && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-amber-400/20"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.button>
            
            <p className="text-amber-300/80 text-sm mt-3">
              {spinning ? "Finding your perfect smoke..." : "Tap to spin!"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="py-2"
          >
            {result && (
              <div className="space-y-3">
                {/* Brand name with celebration */}
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                    className="text-3xl mb-2"
                  >
                    🎉
                  </motion.div>
                  <h4 className="text-xl font-bold text-amber-100">{result.brand}</h4>
                </div>

                {/* Stats */}
                <div className="flex justify-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-amber-300">
                    <FiStar className="text-amber-400" />
                    <span>{result.avgRating.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-300/70">
                    <FiUsers />
                    <span>{result.checkinCount} check-ins</span>
                  </div>
                </div>

                {/* Flavors */}
                <div className="flex flex-wrap justify-center gap-1.5">
                  {result.topFlavors.map((flavor) => (
                    <span
                      key={flavor}
                      className="text-xs px-2 py-0.5 bg-amber-800/50 text-amber-200 rounded-full"
                    >
                      {flavor}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={spin}
                    className="flex-1 py-2 bg-amber-800/50 hover:bg-amber-700/50 text-amber-200 rounded-lg text-sm transition-colors"
                  >
                    Spin Again
                  </button>
                  <Link
                    href={`/brand/${encodeURIComponent(result.brand)}`}
                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm flex items-center justify-center gap-1 transition-colors"
                  >
                    View Brand <FiChevronRight />
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
