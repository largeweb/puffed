"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiShare2, FiRefreshCw, FiStar, FiClock, FiUsers, FiCompass, FiHeart, FiTrendingUp } from "react-icons/fi";

interface PersonalityData {
  username: string;
  title: string;
  emoji: string;
  description: string;
  traits: {
    timing: string;
    social: string;
    critic: string;
    explorer: string;
    primaryMood: string;
  };
  stats: {
    totalSmokes: number;
    avgRating: number;
    uniqueBrands: number;
    favoriteHour: number;
    topMood: string | null;
    topBrand: string | null;
  };
  funFacts: string[];
  color: string;
}

interface ErrorData {
  error: string;
  message?: string;
  currentCount?: number;
  needed?: number;
}

const TRAIT_LABELS: Record<string, Record<string, { label: string; emoji: string }>> = {
  timing: {
    early_bird: { label: 'Early Bird', emoji: '🌅' },
    night_owl: { label: 'Night Owl', emoji: '🦉' },
    all_day: { label: 'Any Time', emoji: '⏰' },
  },
  social: {
    solo: { label: 'Solo Smoker', emoji: '🧘' },
    social: { label: 'Social Butterfly', emoji: '🦋' },
    balanced: { label: 'Flexible', emoji: '⚖️' },
  },
  critic: {
    generous: { label: 'Generous', emoji: '😊' },
    balanced: { label: 'Fair', emoji: '⚖️' },
    critical: { label: 'Discerning', emoji: '🧐' },
  },
  explorer: {
    loyalist: { label: 'Brand Loyalist', emoji: '💎' },
    explorer: { label: 'Explorer', emoji: '🧭' },
    balanced: { label: 'Balanced', emoji: '⚖️' },
  },
};

export default function PersonalityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUsername = searchParams.get('user');
  
  const [personality, setPersonality] = useState<PersonalityData | null>(null);
  const [error, setError] = useState<ErrorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(true);

  useEffect(() => {
    fetchPersonality();
  }, [targetUsername]);

  const fetchPersonality = async () => {
    setLoading(true);
    setShowAnimation(true);
    try {
      const url = targetUsername 
        ? `/api/smoke-personality?username=${encodeURIComponent(targetUsername)}`
        : '/api/smoke-personality';
      const res = await fetch(url);
      const data = await res.json() as PersonalityData | ErrorData;
      
      if ('error' in data && data.error === 'not_enough_data') {
        setError(data as ErrorData);
        setPersonality(null);
      } else if ('error' in data) {
        setError(data as ErrorData);
        setPersonality(null);
      } else {
        setPersonality(data);
        setError(null);
        // Trigger reveal animation
        setTimeout(() => setShowAnimation(false), 2000);
      }
    } catch (err) {
      setError({ error: 'Failed to load personality' });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!personality) return;
    
    const shareUrl = `${window.location.origin}/personality?user=${encodeURIComponent(personality.username)}`;
    const shareText = `I'm "${personality.title}" ${personality.emoji} on Puffed! What's your smoke personality?`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${personality.title} - Smoke Personality`,
          text: shareText,
          url: shareUrl,
        });
        setShareStatus("Shared!");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Link copied!");
      setTimeout(() => setShareStatus(null), 2000);
    } catch {
      setShareStatus("Failed to copy");
      setTimeout(() => setShareStatus(null), 2000);
    }
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-4">
        <div className="max-w-md mx-auto pt-20">
          <motion.div 
            className="flex flex-col items-center justify-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="text-6xl"
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              🔮
            </motion.div>
            <p className="text-gray-400 text-lg">Analyzing your smoke patterns...</p>
            <motion.div 
              className="flex gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {['🌅', '🦉', '🦋', '🧭', '✨'].map((emoji, i) => (
                <motion.span
                  key={emoji}
                  className="text-2xl"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ 
                    delay: i * 0.15, 
                    duration: 0.6, 
                    repeat: Infinity,
                    repeatDelay: 0.5
                  }}
                >
                  {emoji}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (error?.error === 'not_enough_data') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-4">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8 pt-4">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
              <FiArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">Smoke Personality</h1>
          </div>

          <motion.div 
            className="bg-gray-800/50 rounded-2xl p-8 text-center border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-6xl mb-4">🔮</div>
            <h2 className="text-xl font-bold mb-2">Not Enough Data Yet</h2>
            <p className="text-gray-400 mb-6">
              Log at least {error.needed} smokes to unlock your smoke personality! 
              You currently have {error.currentCount || 0}.
            </p>
            <div className="flex justify-center gap-2 mb-6">
              {Array.from({ length: error.needed || 3 }).map((_, i) => (
                <div 
                  key={i}
                  className={`w-4 h-4 rounded-full ${
                    i < (error.currentCount || 0) 
                      ? 'bg-amber-500' 
                      : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
            <Link 
              href="/dashboard"
              className="inline-block px-6 py-3 bg-amber-500 hover:bg-amber-600 rounded-xl font-semibold transition-colors"
            >
              Log a Smoke
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!personality) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-4">
        <div className="max-w-md mx-auto pt-20 text-center">
          <p className="text-gray-400">Something went wrong. Please try again.</p>
          <button 
            onClick={fetchPersonality}
            className="mt-4 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isOwnProfile = !targetUsername;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-4 pb-20">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
              <FiArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">
              {isOwnProfile ? 'Your Smoke Personality' : `${personality.username}'s Personality`}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchPersonality}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Refresh"
            >
              <FiRefreshCw size={20} />
            </button>
            <button 
              onClick={handleShare}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Share"
            >
              <FiShare2 size={20} />
            </button>
          </div>
        </div>

        {shareStatus && (
          <motion.div 
            className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full text-sm z-50"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {shareStatus}
          </motion.div>
        )}

        {/* Main Personality Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key="personality-card"
            className={`bg-gradient-to-br ${personality.color} rounded-3xl p-6 mb-6 relative overflow-hidden`}
            initial={{ opacity: 0, scale: 0.9, rotateY: 180 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              rotateY: showAnimation ? 180 : 0 
            }}
            transition={{ 
              duration: 0.8, 
              type: "spring",
              stiffness: 100
            }}
          >
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-4 text-8xl">{personality.emoji.split(' ')[0]}</div>
              <div className="absolute bottom-4 left-4 text-6xl rotate-12">{personality.emoji.split(' ')[1] || '✨'}</div>
            </div>

            <div className="relative z-10">
              {/* Badge */}
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs uppercase tracking-wider text-white/70 bg-white/10 px-2 py-1 rounded-full">
                  Smoke Personality
                </span>
                <span className="text-4xl">{personality.emoji}</span>
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold text-white mb-2">
                {personality.title}
              </h2>

              {/* Username */}
              <p className="text-white/80 text-sm mb-4">
                @{personality.username}
              </p>

              {/* Description */}
              <p className="text-white/90 text-lg leading-relaxed">
                {personality.description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Traits Grid */}
        <motion.div 
          className="grid grid-cols-2 gap-3 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {Object.entries(personality.traits).map(([trait, value]) => {
            const traitInfo = TRAIT_LABELS[trait]?.[value];
            if (!traitInfo) return null;
            return (
              <motion.div
                key={trait}
                className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50"
                whileHover={{ scale: 1.02 }}
              >
                <div className="text-2xl mb-1">{traitInfo.emoji}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">
                  {trait.replace('_', ' ')}
                </div>
                <div className="text-white font-medium">{traitInfo.label}</div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Stats Bar */}
        <motion.div 
          className="bg-gray-800/60 rounded-xl p-4 mb-6 border border-gray-700/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-3">Your Stats</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-amber-400">{personality.stats.totalSmokes}</div>
              <div className="text-xs text-gray-500">Smokes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">{personality.stats.avgRating}</div>
              <div className="text-xs text-gray-500">Avg Rating</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">{personality.stats.uniqueBrands}</div>
              <div className="text-xs text-gray-500">Brands</div>
            </div>
          </div>
          
          {/* Additional Stats */}
          <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400 flex items-center gap-2">
                <FiClock className="text-amber-500" /> Peak Hour
              </span>
              <span className="text-white">{formatHour(personality.stats.favoriteHour)}</span>
            </div>
            {personality.stats.topBrand && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 flex items-center gap-2">
                  <FiHeart className="text-pink-500" /> Favorite
                </span>
                <span className="text-white">{personality.stats.topBrand}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Fun Facts */}
        {personality.funFacts.length > 0 && (
          <motion.div 
            className="bg-gray-800/60 rounded-xl p-4 mb-6 border border-gray-700/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-3">Fun Facts</h3>
            <ul className="space-y-3">
              {personality.funFacts.map((fact, i) => (
                <motion.li 
                  key={i}
                  className="text-gray-300 text-sm bg-gray-700/30 rounded-lg p-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                >
                  {fact}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* CTA */}
        {isOwnProfile && (
          <motion.div 
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <p className="text-gray-500 text-sm mb-3">
              Your personality evolves with every smoke you log!
            </p>
            <Link 
              href="/dashboard"
              className="inline-block px-6 py-3 bg-amber-500 hover:bg-amber-600 rounded-xl font-semibold transition-colors"
            >
              Log Another Smoke
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
