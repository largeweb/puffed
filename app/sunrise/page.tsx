"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiHome, FiSun, FiClock, FiUsers, FiAward, FiMoon, FiSunrise } from "react-icons/fi";

interface NightOwl {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  checkedAt: number;
  timeAgo: string;
  imageUrl?: string;
}

interface SunriseStats {
  hoursUntilSunrise: number;
  minutesUntilSunrise: number;
  sunriseTime: string;
  isPreDawn: boolean;
  nightPhase: string;
  phaseEmoji: string;
  totalDawnWatchers: number;
  yourDawnWatches: number;
  tonightActiveCount: number;
}

interface DawnLeader {
  username: string;
  count: number;
  rank: number;
}

interface SunriseData {
  activeNightOwls: NightOwl[];
  stats: SunriseStats;
  dawnLeaders: DawnLeader[];
  motivationalMessage: string;
}

export default function SunrisePage() {
  const router = useRouter();
  const [data, setData] = useState<SunriseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/sunrise");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const result = await res.json() as SunriseData;
      setData(result);
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Live countdown ticker
  useEffect(() => {
    if (!data) return;
    
    const updateCountdown = () => {
      const now = new Date();
      // Calculate sunrise (approx 6:30 AM in winter, 5:30 AM in summer)
      const sunrise = new Date(now);
      const month = now.getMonth();
      const isSummer = month >= 4 && month <= 8;
      sunrise.setHours(isSummer ? 5 : 6, isSummer ? 45 : 45, 0, 0);
      
      // If we've passed sunrise, show 0
      if (now >= sunrise) {
        setCountdown({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const diff = sunrise.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown({ hours, minutes, seconds });
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-orange-950/20 to-rose-950/30 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="text-4xl"
        >
          🌅
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-orange-950/20 to-rose-950/30 flex items-center justify-center text-white">
        Failed to load
      </div>
    );
  }

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "🌅";
  };

  const isNearSunrise = countdown.hours === 0 && countdown.minutes < 30;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-orange-950/20 to-rose-950/30 relative overflow-hidden">
      {/* Animated horizon glow */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-orange-500/10 via-rose-500/5 to-transparent"
        animate={{
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      
      {/* Stars fading out effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${10 + Math.random() * 50}%`,
            }}
            animate={{
              opacity: isNearSunrise ? [0.1, 0.2, 0.1] : [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-lg mx-auto p-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-2">
          <Link href="/dashboard" className="text-white/60 hover:text-white">
            <FiHome size={24} />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>🌅</span> Sunrise Watch
            </h1>
            <p className="text-xs text-orange-300/70">Will you make it to dawn?</p>
          </div>
          <div className="w-6" />
        </div>

        {/* Night Phase */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <span className="text-3xl">{data.stats.phaseEmoji}</span>
          <p className="text-orange-200/80 font-medium mt-1">
            {data.stats.nightPhase}
          </p>
        </motion.div>

        {/* Countdown */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`rounded-2xl p-6 mb-6 border text-center ${
            isNearSunrise
              ? "bg-gradient-to-r from-orange-900/50 to-rose-900/50 border-orange-500/40"
              : "bg-gradient-to-r from-slate-900/50 to-orange-950/30 border-orange-500/20"
          }`}
        >
          {countdown.hours === 0 && countdown.minutes === 0 && countdown.seconds === 0 ? (
            <>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-5xl mb-3"
              >
                ☀️
              </motion.div>
              <p className="text-orange-200 text-xl font-bold">
                The Sun Has Risen!
              </p>
              <p className="text-orange-300/60 text-sm mt-1">
                You made it through the night
              </p>
            </>
          ) : (
            <>
              <p className="text-orange-300/70 text-sm mb-2">Sunrise in</p>
              <div className="flex justify-center gap-3 mb-3">
                <div className="text-center">
                  <motion.div
                    key={countdown.hours}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-4xl font-bold text-white"
                  >
                    {countdown.hours.toString().padStart(2, "0")}
                  </motion.div>
                  <p className="text-xs text-orange-400/60">hours</p>
                </div>
                <span className="text-2xl text-orange-400/50 mt-1">:</span>
                <div className="text-center">
                  <motion.div
                    key={countdown.minutes}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-4xl font-bold text-white"
                  >
                    {countdown.minutes.toString().padStart(2, "0")}
                  </motion.div>
                  <p className="text-xs text-orange-400/60">mins</p>
                </div>
                <span className="text-2xl text-orange-400/50 mt-1">:</span>
                <div className="text-center">
                  <motion.div
                    key={countdown.seconds}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-4xl font-bold text-orange-300"
                  >
                    {countdown.seconds.toString().padStart(2, "0")}
                  </motion.div>
                  <p className="text-xs text-orange-400/60">secs</p>
                </div>
              </div>
              <p className="text-orange-200/60 text-sm">
                Est. sunrise: {data.stats.sunriseTime}
              </p>
            </>
          )}
        </motion.div>

        {/* Motivational Message */}
        <div className="text-center mb-6">
          <p className="text-orange-200/70 italic text-sm">
            &quot;{data.motivationalMessage}&quot;
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-900/40 rounded-xl p-3 text-center border border-orange-500/10">
            <div className="text-xl font-bold text-orange-300">{data.stats.tonightActiveCount}</div>
            <div className="text-xs text-slate-500">Up Tonight</div>
          </div>
          <div className="bg-slate-900/40 rounded-xl p-3 text-center border border-orange-500/10">
            <div className="text-xl font-bold text-rose-300">{data.stats.totalDawnWatchers}</div>
            <div className="text-xs text-slate-500">Dawn Watches</div>
          </div>
          <div className="bg-slate-900/40 rounded-xl p-3 text-center border border-orange-500/10">
            <div className="text-xl font-bold text-yellow-300">{data.stats.yourDawnWatches}</div>
            <div className="text-xs text-slate-500">Your Sunrises</div>
          </div>
        </div>

        {/* Dawn Watch Leaders */}
        {data.dawnLeaders.length > 0 && (
          <div className="mb-6">
            <h2 className="text-orange-300/80 text-sm font-medium flex items-center gap-2 mb-3">
              <FiAward size={14} /> Dawn Watch Champions
            </h2>
            <div className="space-y-2">
              {data.dawnLeaders.slice(0, 5).map((leader, idx) => (
                <motion.div
                  key={leader.username}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-3 bg-slate-900/30 rounded-xl p-3 border border-orange-500/10"
                >
                  <span className="text-xl">{getRankEmoji(leader.rank)}</span>
                  <Link
                    href={`/user/${leader.username}`}
                    className="text-white font-medium hover:text-orange-300 transition-colors flex-1"
                  >
                    @{leader.username}
                  </Link>
                  <span className="text-orange-300 text-sm font-medium">
                    {leader.count} 🌅
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Currently Awake */}
        <div className="mb-6">
          <h2 className="text-orange-300/80 text-sm font-medium flex items-center gap-2 mb-3">
            <FiUsers size={14} /> Still Awake Tonight
          </h2>
          
          {data.activeNightOwls.length === 0 ? (
            <div className="text-center py-8">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-4xl mb-3"
              >
                🌙
              </motion.div>
              <p className="text-slate-500">The night is quiet...</p>
              <p className="text-xs text-slate-600 mt-1">
                Log a smoke to join the watch
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.activeNightOwls.map((owl, idx) => (
                <motion.div
                  key={`${owl.username}-${owl.checkedAt}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-slate-900/40 rounded-xl p-4 border border-orange-500/10"
                >
                  <div className="flex items-start gap-3">
                    {owl.imageUrl && (
                      <img
                        src={owl.imageUrl}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/user/${owl.username}`}
                          className="text-white font-medium hover:text-orange-300 transition-colors"
                        >
                          @{owl.username}
                        </Link>
                        <span className="text-xs text-slate-500">{owl.timeAgo}</span>
                      </div>
                      <p className="text-orange-200/80 text-sm mt-1">
                        {owl.brand}
                        {owl.product && ` - ${owl.product}`}
                      </p>
                      {owl.rating && (
                        <div className="mt-1">
                          <span className="text-yellow-400 text-xs">
                            {"★".repeat(Math.floor(owl.rating))}
                            {"☆".repeat(5 - Math.floor(owl.rating))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-slate-600">
            Stay awake, watch the stars fade 🌅
          </p>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800/50 p-4">
        <div className="max-w-lg mx-auto flex justify-around">
          <Link
            href="/nightcap"
            className="text-slate-500 hover:text-white transition-colors text-center"
          >
            <span className="text-xl">🌙</span>
            <p className="text-[10px] mt-0.5">Nightcap</p>
          </Link>
          <Link
            href="/insomnia"
            className="text-slate-500 hover:text-white transition-colors text-center"
          >
            <span className="text-xl">🦉</span>
            <p className="text-[10px] mt-0.5">Insomnia</p>
          </Link>
          <div className="text-orange-400 text-center">
            <span className="text-xl">🌅</span>
            <p className="text-[10px] mt-0.5">Sunrise</p>
          </div>
          <Link
            href="/coffee"
            className="text-slate-500 hover:text-white transition-colors text-center"
          >
            <span className="text-xl">☕</span>
            <p className="text-[10px] mt-0.5">Coffee</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
