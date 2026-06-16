"use client";

import { motion } from "framer-motion";
import { FiFeather, FiSun, FiMoon } from "react-icons/fi";

const wisdomQuotes = [
  { text: "A good cigar is like a good friend—reliable, comforting, and never in a hurry.", author: "Unknown" },
  { text: "Cigars are not just about smoking; they're about savoring.", author: "Cigar Aficionado" },
  { text: "The slow burn of a fine cigar teaches patience better than any book.", author: "Unknown" },
  { text: "In the quiet company of a cigar, one finds clarity.", author: "Winston Churchill" },
  { text: "A cigar numbs sorrow and fills the solitary hours with a million gracious images.", author: "George Sand" },
  { text: "Smoking cigars is like falling in love. First, you are attracted by its shape; you stay for its flavor.", author: "Winston Churchill" },
  { text: "There's something meditative about the ritual—the cut, the light, the first draw.", author: "Unknown" },
  { text: "The best cigar is the one you're smoking right now.", author: "Old Saying" },
  { text: "Time moves differently when you're holding a cigar.", author: "Unknown" },
  { text: "Every cigar tells a story—of the land, the hands, the years.", author: "Unknown" },
  { text: "A cigar ought not to be smoked solely with the mouth, but with the hand, the eyes, and with the spirit.", author: "Zino Davidoff" },
  { text: "The cigar is the perfect complement to an elegant lifestyle.", author: "George Sand" },
  { text: "Sometimes a cigar is just a cigar. But sometimes it's the best part of your day.", author: "Modern Wisdom" },
  { text: "In smoke, we find our thoughts; in ash, we leave our worries.", author: "Unknown" },
];

export default function CigarWisdom() {
  const hour = new Date().getHours();
  
  // Show during contemplative hours: late night (11pm-5am) or early morning (5am-7am)
  const isLateNight = hour >= 23 || hour < 5;
  const isEarlyMorning = hour >= 5 && hour < 7;
  
  if (!isLateNight && !isEarlyMorning) return null;

  // Pick a quote based on day + hour for daily variety
  const day = new Date().getDate();
  const quoteIndex = (day * 7 + hour) % wisdomQuotes.length;
  const quote = wisdomQuotes[quoteIndex];

  const TimeIcon = isLateNight ? FiMoon : FiSun;
  const timeLabel = isLateNight ? "Midnight Wisdom" : "Dawn Reflections";
  const gradientClass = isLateNight 
    ? "from-slate-900 via-gray-900 to-zinc-900" 
    : "from-amber-950 via-orange-950 to-slate-900";
  const borderClass = isLateNight ? "border-slate-700/40" : "border-amber-800/40";
  const accentColor = isLateNight ? "text-slate-300" : "text-amber-300";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradientClass} p-5 border ${borderClass}`}
    >
      {/* Subtle smoke effect */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <motion.div
          className="absolute w-32 h-32 bg-white/10 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ top: "20%", left: "10%" }}
        />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity }}
          >
            <TimeIcon className={`w-4 h-4 ${accentColor}`} />
          </motion.div>
          <span className={`text-xs font-medium ${accentColor} uppercase tracking-wider`}>
            {timeLabel}
          </span>
        </div>

        <div className="flex gap-3">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex-shrink-0 mt-1"
          >
            <FiFeather className={`w-5 h-5 ${accentColor} opacity-60`} />
          </motion.div>
          <div>
            <motion.p 
              className="text-base text-gray-200 italic leading-relaxed mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              "{quote.text}"
            </motion.p>
            <motion.p 
              className="text-xs text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              — {quote.author}
            </motion.p>
          </div>
        </div>

        <motion.div 
          className="mt-4 pt-3 border-t border-white/5 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <span className="text-xs text-gray-600">
            🚬 A moment of quiet contemplation
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
