"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FiMoon, FiStar, FiHeart, FiCoffee, FiEdit3 } from "react-icons/fi";

export default function WindDownRitual() {
  const hour = new Date().getHours();
  
  // Only show between 10pm and 2am
  if (hour < 22 && hour >= 2) return null;

  const prompts = [
    { icon: FiStar, text: "What made today's smoke special?", color: "text-amber-400" },
    { icon: FiHeart, text: "Rate your day 1-10", color: "text-rose-400" },
    { icon: FiCoffee, text: "Tomorrow's first smoke?", color: "text-orange-400" },
    { icon: FiEdit3, text: "Log a late night puff", color: "text-purple-400" },
  ];

  // Pick prompt based on day + hour for variety
  const day = new Date().getDay();
  const promptIndex = (day + hour) % prompts.length;
  const prompt = prompts[promptIndex];
  const PromptIcon = prompt.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 p-5 border border-indigo-800/30"
    >
      {/* Stars background effect */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: 0.3 + Math.random() * 0.4,
            }}
            animate={{
              opacity: [0.3, 0.7, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <FiMoon className="w-5 h-5 text-indigo-300" />
          </motion.div>
          <h3 className="font-semibold text-indigo-200">Wind Down Ritual</h3>
          <span className="ml-auto text-xs text-indigo-400/60">Late Night</span>
        </div>

        <p className="text-sm text-indigo-300/80 mb-4">
          The night is quiet. Perfect time to reflect...
        </p>

        <Link href="/checkin">
          <motion.div 
            className="flex items-center gap-3 p-3 rounded-xl bg-indigo-900/30 border border-indigo-700/30 hover:border-indigo-600/50 transition-colors cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className={`p-2 rounded-lg bg-indigo-900/50 ${prompt.color}`}>
              <PromptIcon className="w-4 h-4" />
            </div>
            <span className="text-sm text-indigo-100">{prompt.text}</span>
          </motion.div>
        </Link>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-indigo-400/50">
          <span>🌙</span>
          <span>Night owls unite</span>
          <span>🦉</span>
        </div>
      </div>
    </motion.div>
  );
}
