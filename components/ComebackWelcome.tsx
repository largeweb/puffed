"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiHeart, FiPlus, FiX, FiStar } from "react-icons/fi";
import Link from "next/link";

interface ComebackData {
  daysSinceLastSmoke: number;
  lastBrand?: string;
  totalAllTime: number;
  streak: number;
}

const WELCOME_MESSAGES = [
  { threshold: 7, messages: [
    "We missed you! 💕",
    "Welcome back, friend! 🎉",
    "Good to see you again! ✨",
    "The lounge wasn't the same without you! 🛋️",
  ]},
  { threshold: 14, messages: [
    "It's been a while! We're glad you're back 💝",
    "Welcome home! We saved your seat 🪑",
    "The humidor's been waiting for you! 📦",
    "Back for more? We love to see it! 🔥",
  ]},
  { threshold: 30, messages: [
    "Long time no smoke! Welcome back legend 👑",
    "Look who's back! We never forgot you 💎",
    "A triumphant return! 🏆",
    "The prodigal smoker returns! 🎊",
  ]},
];

function getWelcomeMessage(days: number): string {
  const tier = WELCOME_MESSAGES.find(t => days <= t.threshold) || WELCOME_MESSAGES[WELCOME_MESSAGES.length - 1];
  const messages = tier.messages;
  // Deterministic selection based on current day
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000);
  return messages[dayOfYear % messages.length];
}

export default function ComebackWelcome() {
  const [data, setData] = useState<ComebackData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already dismissed today
    const dismissedAt = localStorage.getItem('comebackWelcomeDismissed');
    if (dismissedAt) {
      const dismissedDate = new Date(parseInt(dismissedAt));
      const now = new Date();
      // Reset dismissal after 24 hours
      if (now.getTime() - dismissedDate.getTime() < 24 * 60 * 60 * 1000) {
        setDismissed(true);
        setLoading(false);
        return;
      }
    }

    async function fetchData() {
      try {
        const res = await fetch('/api/weekly-momentum');
        if (res.ok) {
          const json = await res.json() as { momentum: ComebackData };
          setData(json.momentum);
        }
      } catch (e) {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('comebackWelcomeDismissed', Date.now().toString());
  };

  if (loading || dismissed || !data) return null;
  
  // Only show if inactive for 5+ days
  if (data.daysSinceLastSmoke < 5) return null;

  const welcomeMessage = getWelcomeMessage(data.daysSinceLastSmoke);
  const daysText = data.daysSinceLastSmoke === 1 ? 'day' : 'days';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: "spring", damping: 20 }}
        className="relative bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 rounded-2xl p-5 text-white shadow-xl overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.1, 0.15] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <FiX className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-start gap-4">
            <motion.div
              className="flex-shrink-0 p-3 bg-white/20 rounded-xl"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <FiHeart className="w-8 h-8" />
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold mb-1">{welcomeMessage}</h3>
              <p className="text-white/80 text-sm">
                It's been {data.daysSinceLastSmoke} {daysText} since your last smoke
                {data.lastBrand && <span> – <span className="font-medium">{data.lastBrand}</span></span>}
              </p>
              
              {data.totalAllTime > 0 && (
                <p className="text-white/70 text-xs mt-1">
                  You've logged {data.totalAllTime} smoke{data.totalAllTime !== 1 ? 's' : ''} total – let's keep it going!
                </p>
              )}
            </div>
          </div>

          {/* Quick action */}
          <div className="mt-4 flex gap-2">
            <Link
              href="/dashboard#log"
              className="flex-1 flex items-center justify-center gap-2 bg-white text-purple-600 font-semibold py-3 px-4 rounded-xl hover:bg-white/90 transition-colors"
            >
              <FiPlus className="w-5 h-5" />
              Log a Smoke
            </Link>
            
            {data.lastBrand && (
              <Link
                href={`/cigar/${encodeURIComponent(data.lastBrand)}`}
                className="flex items-center justify-center gap-2 bg-white/20 py-3 px-4 rounded-xl hover:bg-white/30 transition-colors"
              >
                <FiStar className="w-5 h-5" />
                View {data.lastBrand.split(' ')[0]}
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
