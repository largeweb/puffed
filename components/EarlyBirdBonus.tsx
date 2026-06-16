"use client";

import { motion } from "framer-motion";
import { FiSunrise, FiCamera, FiCoffee, FiStar } from "react-icons/fi";
import Link from "next/link";

interface EarlyBirdBonusProps {
  userId?: string;
}

export default function EarlyBirdBonus({ userId }: EarlyBirdBonusProps) {
  const hour = new Date().getHours();
  
  // Only show between 5 AM and 8 AM
  if (hour < 5 || hour >= 8) return null;

  const messages = [
    "The early bird gets the best smoke.",
    "Dawn patrol deserves the finest leaf.",
    "First light, first puff — pure zen.",
    "Morning dew and aged tobacco.",
    "Quiet hours, quality smokes.",
  ];
  
  const message = messages[Math.floor(Math.random() * messages.length)];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/40 via-orange-800/30 to-yellow-700/20 border border-amber-500/30 p-5"
    >
      {/* Sunrise glow effect */}
      <motion.div
        className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-radial from-amber-400/30 via-orange-400/20 to-transparent rounded-full blur-2xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Stars fading with dawn */}
      <motion.div
        className="absolute top-3 left-8 text-yellow-300/40"
        animate={{ opacity: [0.3, 0.1, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <FiStar className="w-2 h-2" />
      </motion.div>
      <motion.div
        className="absolute top-6 right-16 text-yellow-300/30"
        animate={{ opacity: [0.2, 0.05, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, delay: 1 }}
      >
        <FiStar className="w-1.5 h-1.5" />
      </motion.div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <motion.div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center"
            animate={{ 
              boxShadow: [
                "0 0 15px rgba(245, 158, 11, 0.2)",
                "0 0 25px rgba(245, 158, 11, 0.4)",
                "0 0 15px rgba(245, 158, 11, 0.2)",
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <FiSunrise className="w-5 h-5 text-amber-400" />
          </motion.div>
          <div>
            <h3 className="font-semibold text-amber-100 flex items-center gap-2">
              Early Bird Bonus 🐦
            </h3>
            <p className="text-xs text-amber-300/70">
              {hour === 5 ? "The world sleeps" : hour === 6 ? "Dawn breaks" : "Golden hour"}
            </p>
          </div>
        </div>

        {/* Message */}
        <p className="text-amber-100/90 text-sm mb-4 italic">
          "{message}"
        </p>

        {/* Perks */}
        <div className="flex items-center gap-4 mb-4 text-xs text-amber-200/70">
          <div className="flex items-center gap-1.5">
            <FiCoffee className="w-3.5 h-3.5 text-amber-400" />
            <span>Morning ritual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FiStar className="w-3.5 h-3.5 text-amber-400" />
            <span>Peaceful moments</span>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/checkin"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/30 text-amber-100 text-sm font-medium hover:from-amber-500/30 hover:to-orange-500/30 transition-all"
        >
          <FiCamera className="w-4 h-4" />
          Log Your Morning Smoke
        </Link>
      </div>
    </motion.div>
  );
}
