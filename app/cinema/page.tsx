"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  FiHome, FiRefreshCw, FiFilm, FiTv, FiClock, FiStar,
  FiPlay, FiUsers, FiZap, FiMoon, FiSun, FiCoffee
} from "react-icons/fi";

interface Movie {
  title: string;
  year: number;
  genre: string;
  runtime: string;
  vibe: string;
  pairingNote: string;
  category: string;
}

interface CommunityPick {
  title: string;
  watchers: number;
  category: string;
}

interface ActiveSmoker {
  id: number;
  username: string;
  brand: string;
  rating?: number;
  image_url?: string;
  created_at: number;
}

interface UserStats {
  username: string;
  totalSmokes: number;
  avgRating: string | null;
  suggestedGenre: string;
}

interface SpecialEvent {
  active: boolean;
  name: string | null;
  emoji: string | null;
  message: string | null;
}

interface CategorizedPicks {
  [key: string]: Movie[];
}

interface CinemaData {
  currentTime: {
    hour: number;
    dayOfWeek: number;
    isWeekend: boolean;
    vibe: string;
  };
  recommendations: Movie[];
  communityPick: CommunityPick;
  allCategories: string[];
  categorizedPicks: CategorizedPicks;
  activeNow: ActiveSmoker[];
  userStats: UserStats | null;
  specialEvent: SpecialEvent;
}

const CATEGORY_LABELS: { [key: string]: { label: string; emoji: string; color: string } } = {
  lateNight: { label: "Late Night", emoji: "🌙", color: "from-indigo-600 to-purple-600" },
  chill: { label: "Chill Vibes", emoji: "😌", color: "from-teal-500 to-emerald-500" },
  classic: { label: "Classics", emoji: "🎬", color: "from-amber-500 to-orange-500" },
  action: { label: "Action", emoji: "💥", color: "from-red-500 to-rose-500" },
  documentaries: { label: "Documentaries", emoji: "📽️", color: "from-blue-500 to-cyan-500" },
  tvBinge: { label: "TV Binge", emoji: "📺", color: "from-violet-500 to-fuchsia-500" },
};

export default function SmokeCinemaPage() {
  const [data, setData] = useState<CinemaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchCinema = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/smoke-cinema", { credentials: "include" });
      if (res.ok) {
        const json = await res.json() as CinemaData;
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch cinema:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCinema();
  }, [fetchCinema, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="text-5xl"
        >
          🎬
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 flex items-center justify-center text-white">
        <p>Failed to load cinema. Try again later!</p>
      </div>
    );
  }

  const { currentTime, recommendations, communityPick, categorizedPicks, activeNow, userStats, specialEvent } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 text-white pb-20">
      {/* Film grain overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-5 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4xIi8+PC9zdmc+')]" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="p-2 rounded-full hover:bg-slate-800 transition-colors">
            <FiHome className="w-5 h-5 text-slate-300" />
          </Link>
          <div className="flex items-center gap-2">
            <FiFilm className="w-5 h-5 text-amber-400" />
            <span className="font-bold">Smoke Cinema</span>
          </div>
          <button 
            onClick={handleRefresh}
            className="p-2 rounded-full hover:bg-slate-800 transition-colors"
          >
            <FiRefreshCw className="w-5 h-5 text-slate-300" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              rotateY: [0, 10, 0, -10, 0]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="text-6xl"
          >
            🎬
          </motion.div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
            Smoke Cinema
          </h1>
          <p className="text-slate-400 text-lg">{currentTime.vibe}</p>
          
          {/* Special Event Banner */}
          {specialEvent.active && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-full"
            >
              <span className="text-xl">{specialEvent.emoji}</span>
              <span className="font-medium text-amber-300">{specialEvent.name}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300">{specialEvent.message}</span>
            </motion.div>
          )}
        </motion.section>

        {/* Community Pick */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl p-5 border border-amber-500/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <FiUsers className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-amber-300">Community Pick</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold">{communityPick.title}</p>
              <p className="text-slate-400 text-sm">{communityPick.category}</p>
            </div>
            <div className="flex items-center gap-1 text-amber-400">
              <FiZap className="w-4 h-4" />
              <span className="font-medium">{communityPick.watchers} watching now</span>
            </div>
          </div>
        </motion.section>

        {/* Tonight's Recommendations */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <FiStar className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-bold">Tonight&apos;s Picks</h2>
          </div>
          <div className="space-y-3">
            {recommendations.map((movie, idx) => {
              const catInfo = CATEGORY_LABELS[movie.category] || { label: movie.category, emoji: "🎬", color: "from-slate-500 to-slate-600" };
              return (
                <motion.div
                  key={movie.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-amber-500/30 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-bold group-hover:text-amber-400 transition-colors">
                          {movie.title}
                        </h3>
                        <span className="text-slate-500 text-sm">{movie.year}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full bg-gradient-to-r ${catInfo.color} text-white`}>
                          {catInfo.emoji} {catInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        <span>{movie.genre}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <FiClock className="w-3 h-3" />
                          {movie.runtime}
                        </span>
                      </div>
                      <p className="text-slate-300 italic">&ldquo;{movie.vibe}&rdquo;</p>
                      <p className="text-sm text-amber-400/80">
                        🚬 {movie.pairingNote}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-white shadow-lg shadow-amber-500/25"
                      >
                        <FiPlay className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Browse by Category */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FiTv className="w-5 h-5 text-purple-400" />
            Browse Categories
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORY_LABELS).map(([key, info]) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                className={`px-4 py-2 rounded-full border transition-all ${
                  selectedCategory === key
                    ? `bg-gradient-to-r ${info.color} text-white border-transparent`
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-500"
                }`}
              >
                {info.emoji} {info.label}
              </motion.button>
            ))}
          </div>

          <AnimatePresence>
            {selectedCategory && categorizedPicks[selectedCategory] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {categorizedPicks[selectedCategory].map((movie, idx) => (
                  <motion.div
                    key={movie.title}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{movie.title} <span className="text-slate-500">({movie.year})</span></p>
                        <p className="text-sm text-slate-400">{movie.genre} • {movie.runtime}</p>
                      </div>
                      <p className="text-xs text-amber-400/70">{movie.pairingNote}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Smoking Right Now */}
        {activeNow.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold flex items-center gap-2">
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-green-500 rounded-full"
              />
              Smoking Right Now
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {activeNow.map((smoker) => (
                <Link
                  key={smoker.id}
                  href={`/user/${smoker.username}`}
                  className="flex-shrink-0 bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 hover:border-green-500/30 transition-all min-w-[140px]"
                >
                  <p className="font-medium text-green-400">@{smoker.username}</p>
                  <p className="text-sm text-slate-300 truncate">{smoker.brand}</p>
                  {smoker.rating && (
                    <p className="text-xs text-amber-400 mt-1">⭐ {smoker.rating}/5</p>
                  )}
                </Link>
              ))}
            </div>
            <p className="text-center text-sm text-slate-500">
              Perfect time to watch something together! 🍿
            </p>
          </motion.section>
        )}

        {/* User Stats */}
        {userStats && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/50"
          >
            <h2 className="font-bold mb-3">Your Smoke Profile</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-amber-400">{userStats.totalSmokes}</p>
                <p className="text-sm text-slate-400">Total Smokes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">{userStats.avgRating || "—"}</p>
                <p className="text-sm text-slate-400">Avg Rating</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-400">
              Based on your style, we recommend: <span className="text-amber-300 font-medium">
                {CATEGORY_LABELS[userStats.suggestedGenre]?.label || "Chill Vibes"}
              </span> {CATEGORY_LABELS[userStats.suggestedGenre]?.emoji || "😌"}
            </p>
          </motion.section>
        )}

        {/* Tips Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-5 border border-slate-700/50"
        >
          <h2 className="font-bold mb-3 flex items-center gap-2">
            💡 Cinema Tips
          </h2>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              Match your cigar length to the movie runtime
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              Documentaries pair well with contemplative smokes
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              Action movies call for bolder, quicker smokes
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              Classic films deserve your finest stick
            </li>
          </ul>
        </motion.section>

        {/* Footer Links */}
        <div className="flex justify-center gap-4 pt-4">
          <Link 
            href="/radio" 
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50 hover:border-purple-500/30 transition-all text-sm"
          >
            📻 Smoke Radio
          </Link>
          <Link 
            href="/nightcap" 
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50 hover:border-indigo-500/30 transition-all text-sm"
          >
            🌙 Nightcap Club
          </Link>
        </div>
      </main>
    </div>
  );
}
