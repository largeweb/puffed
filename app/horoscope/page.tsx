"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  FiHome, FiRefreshCw, FiStar, FiClock, FiUser, 
  FiHeart, FiZap, FiMoon, FiSun, FiCheck
} from "react-icons/fi";

interface ZodiacSign {
  sign: string;
  symbol: string;
  name: string;
  dates: string;
  element?: string;
  elementTraits?: {
    trait: string;
    suggestion: string;
  };
}

interface DailyReading {
  prediction: string;
  luckyBrand: string;
  luckyFlavor: string;
  luckyTime: string;
  luckyNumber: number;
  dailyStars: number;
  compatibleSign: string;
  date: string;
}

interface CommunityStats {
  signUsers: number;
  recentCheckins: Array<{
    brand: string;
    rating: number;
    username: string;
  }>;
}

interface HoroscopeData {
  allSigns: ZodiacSign[];
  currentSign: ZodiacSign | null;
  userZodiac: string | null;
  username: string;
  dailyReading: DailyReading | null;
  personalInsights: {
    totalSmokes: number;
    avgRating: string | null;
    favBrand: string | null;
  };
  communityStats: CommunityStats | null;
}

const ELEMENT_COLORS = {
  Fire: "from-orange-500 to-red-600",
  Earth: "from-emerald-500 to-green-700",
  Air: "from-sky-400 to-blue-500",
  Water: "from-indigo-500 to-purple-600"
};

const ELEMENT_ICONS = {
  Fire: "🔥",
  Earth: "🌍",
  Air: "💨",
  Water: "🌊"
};

export default function HoroscopePage() {
  const router = useRouter();
  const [data, setData] = useState<HoroscopeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSignPicker, setShowSignPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [starPhase, setStarPhase] = useState(0);

  const fetchData = useCallback(async (sign?: string, showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const url = sign ? `/api/horoscope?sign=${sign}` : '/api/horoscope';
      const res = await fetch(url);
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const result = await res.json() as HoroscopeData;
      setData(result);
      // Show sign picker if user hasn't selected one yet
      if (!result.currentSign && !sign) {
        setShowSignPicker(true);
      }
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Twinkling star animation
  useEffect(() => {
    const interval = setInterval(() => {
      setStarPhase(p => (p + 1) % 100);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleSelectSign = async (sign: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/horoscope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sign })
      });
      if (res.ok) {
        setShowSignPicker(false);
        await fetchData(sign);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleViewSign = (sign: string) => {
    fetchData(sign);
    setShowSignPicker(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-indigo-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <FiStar className="text-4xl text-yellow-400" />
        </motion.div>
      </div>
    );
  }

  const element = data?.currentSign?.element as keyof typeof ELEMENT_COLORS | undefined;
  const elementColor = element ? ELEMENT_COLORS[element] : "from-purple-500 to-indigo-600";
  const elementIcon = element ? ELEMENT_ICONS[element] : "✨";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-indigo-950 relative overflow-hidden">
      {/* Animated stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${(i * 17) % 100}%`,
              top: `${(i * 23) % 100}%`,
              opacity: ((starPhase + i * 7) % 20) / 20 * 0.8 + 0.2
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-md border-b border-purple-500/20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard" 
              className="p-2 hover:bg-purple-800/50 rounded-full transition-colors"
            >
              <FiHome className="text-xl text-purple-300" />
            </Link>
            <div>
              <h1 className="font-bold text-lg text-white flex items-center gap-2">
                <span className="text-2xl">⭐</span> Smoke Horoscope
              </h1>
              <p className="text-xs text-purple-300">What the stars say about your smoke</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSignPicker(true)}
              className="p-2 hover:bg-purple-800/50 rounded-full transition-colors"
              title="Change Sign"
            >
              <FiUser className="text-xl text-purple-300" />
            </button>
            <button
              onClick={() => fetchData(data?.currentSign?.sign, true)}
              disabled={refreshing}
              className="p-2 hover:bg-purple-800/50 rounded-full transition-colors"
            >
              <FiRefreshCw className={`text-xl text-purple-300 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Sign Picker Modal */}
      <AnimatePresence>
        {showSignPicker && data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => data.currentSign && setShowSignPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto border border-purple-500/30"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-2 text-center">
                {data.userZodiac ? "View Another Sign" : "Select Your Zodiac Sign"}
              </h2>
              <p className="text-purple-300 text-sm text-center mb-4">
                {data.userZodiac 
                  ? "Explore readings for any sign" 
                  : "Tell us your sign to unlock your personalized smoke horoscope"
                }
              </p>
              
              <div className="grid grid-cols-3 gap-3">
                {data.allSigns.map(sign => (
                  <button
                    key={sign.sign}
                    onClick={() => data.userZodiac ? handleViewSign(sign.sign) : handleSelectSign(sign.sign)}
                    disabled={saving}
                    className={`p-3 rounded-xl border transition-all ${
                      data.userZodiac === sign.sign
                        ? "bg-purple-600 border-purple-400"
                        : "bg-slate-800 border-slate-700 hover:border-purple-500 hover:bg-slate-700"
                    }`}
                  >
                    <div className="text-3xl mb-1">{sign.symbol}</div>
                    <div className="text-sm font-medium text-white">{sign.name}</div>
                    <div className="text-xs text-purple-300 mt-0.5">{sign.dates.split(' - ')[0]}</div>
                    {data.userZodiac === sign.sign && (
                      <div className="mt-1">
                        <FiCheck className="inline text-green-400 text-sm" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {data.currentSign && (
                <button
                  onClick={() => setShowSignPicker(false)}
                  className="w-full mt-4 py-2 text-purple-300 hover:text-white transition-colors"
                >
                  Back to Reading
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6 relative z-10">
        {!data?.currentSign ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔮</div>
            <h2 className="text-xl font-bold text-white mb-2">Welcome, Cosmic Smoker</h2>
            <p className="text-purple-300 mb-6">Select your zodiac sign to reveal your personalized smoke horoscope</p>
            <button
              onClick={() => setShowSignPicker(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full text-white font-medium"
            >
              Choose Your Sign ✨
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Sign Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-gradient-to-br ${elementColor} rounded-2xl p-6 text-white relative overflow-hidden`}
            >
              <div className="absolute top-4 right-4 text-6xl opacity-20">
                {data.currentSign.symbol}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-5xl">{data.currentSign.symbol}</div>
                <div>
                  <h2 className="text-2xl font-bold">{data.currentSign.name}</h2>
                  <p className="text-white/80">{data.currentSign.dates}</p>
                  <p className="text-sm flex items-center gap-1 mt-1">
                    {elementIcon} {data.currentSign.element} Sign
                  </p>
                </div>
              </div>
              {data.currentSign.elementTraits && (
                <p className="mt-4 text-white/90 text-sm italic">
                  &ldquo;{data.currentSign.elementTraits.trait}&rdquo;
                </p>
              )}
            </motion.div>

            {/* Daily Reading */}
            {data.dailyReading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-purple-500/20"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <FiSun className="text-yellow-400" /> Today&apos;s Reading
                  </h3>
                  <span className="text-purple-300 text-sm">{data.dailyReading.date}</span>
                </div>
                
                {/* Star Rating */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <FiStar
                      key={i}
                      className={`text-xl ${i < data.dailyReading!.dailyStars ? "text-yellow-400 fill-yellow-400" : "text-slate-600"}`}
                    />
                  ))}
                  <span className="text-purple-300 text-sm ml-2">
                    {data.dailyReading.dailyStars === 5 ? "Exceptional Day!" : 
                     data.dailyReading.dailyStars === 4 ? "Great Day" : "Good Day"}
                  </span>
                </div>

                <p className="text-white/90 text-lg leading-relaxed mb-6">
                  {data.dailyReading.prediction}
                </p>

                {/* Lucky Items Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-700/50 rounded-xl p-3">
                    <p className="text-xs text-purple-300 uppercase tracking-wide mb-1">Lucky Brand</p>
                    <p className="font-medium text-white">{data.dailyReading.luckyBrand}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3">
                    <p className="text-xs text-purple-300 uppercase tracking-wide mb-1">Lucky Flavor</p>
                    <p className="font-medium text-white">{data.dailyReading.luckyFlavor}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3">
                    <p className="text-xs text-purple-300 uppercase tracking-wide mb-1">Best Time</p>
                    <p className="font-medium text-white text-sm">{data.dailyReading.luckyTime}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3">
                    <p className="text-xs text-purple-300 uppercase tracking-wide mb-1">Lucky Number</p>
                    <p className="font-medium text-white">{data.dailyReading.luckyNumber}</p>
                  </div>
                </div>

                {/* Compatibility */}
                <div className="mt-4 p-3 bg-purple-900/30 rounded-xl flex items-center justify-between">
                  <span className="text-purple-200 text-sm">
                    <FiHeart className="inline mr-1 text-pink-400" />
                    Today&apos;s Smoke Buddy Sign:
                  </span>
                  <span className="font-medium text-white">{data.dailyReading.compatibleSign}</span>
                </div>
              </motion.div>
            )}

            {/* Element Wisdom */}
            {data.currentSign.elementTraits && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-purple-500/20"
              >
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  {elementIcon} {data.currentSign.element} Element Wisdom
                </h3>
                <p className="text-purple-200">
                  {data.currentSign.elementTraits.suggestion}
                </p>
              </motion.div>
            )}

            {/* Personal Insights */}
            {data.personalInsights.totalSmokes > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-purple-500/20"
              >
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <FiZap className="text-yellow-400" /> Your Cosmic Profile
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">{data.personalInsights.totalSmokes}</p>
                    <p className="text-xs text-purple-300">Total Smokes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{data.personalInsights.avgRating || "-"}</p>
                    <p className="text-xs text-purple-300">Avg Rating</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white truncate">{data.personalInsights.favBrand || "-"}</p>
                    <p className="text-xs text-purple-300">Top Brand</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Community Stats */}
            {data.communityStats && data.communityStats.signUsers > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-purple-500/20"
              >
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <FiMoon className="text-purple-400" /> Fellow {data.currentSign.name} Smokers
                </h3>
                <p className="text-purple-200 text-sm mb-3">
                  {data.communityStats.signUsers} {data.currentSign.name} smokers in the community
                </p>
                
                {data.communityStats.recentCheckins.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-purple-300 uppercase tracking-wide">Recent Activity</p>
                    {data.communityStats.recentCheckins.map((checkin, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                        <div>
                          <span className="text-white font-medium">{checkin.username}</span>
                          <span className="text-purple-300 text-sm ml-2">smoked {checkin.brand}</span>
                        </div>
                        {checkin.rating && (
                          <span className="text-yellow-400 flex items-center gap-1">
                            <FiStar className="fill-yellow-400" /> {checkin.rating}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Quick Links */}
            <div className="flex gap-3 pt-4">
              <Link
                href="/dashboard"
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-center text-white font-medium transition-colors"
              >
                <FiHome className="inline mr-2" />
                Dashboard
              </Link>
              <Link
                href="/checkin"
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-center text-white font-medium"
              >
                <FiClock className="inline mr-2" />
                Log Smoke
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
