"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiArrowLeft, FiStar, FiAward, FiTrendingUp, FiCalendar, FiZap, FiHeart, FiMessageCircle } from "react-icons/fi";
import Link from "next/link";

interface WeekHighlight {
  id: number;
  brand: string;
  product?: string;
  rating?: number;
  image_url?: string;
  review?: string;
  likes: number;
  comments: number;
  created_at: number;
}

interface WeekendSuggestion {
  brand: string;
  product?: string;
  reason: string;
  avgRating: number;
  timesSmoked: number;
}

interface FridaySmoker {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  image_url?: string;
  created_at: number;
}

interface WeekendStats {
  weekCheckins: number;
  weekLikes: number;
  weekComments: number;
  bestRating: number;
  uniqueBrands: number;
  fridayCount: number;
  weekendStreak: number;
}

interface WeekendWarrior {
  username: string;
  fridayCount: number;
  avgRating: number;
  favoriteBrand: string | null;
}

interface PlatformStats {
  fridayCheckins: number;
  activeSmokers: number;
  avgRating: number;
  trendingBrand: string | null;
}

export default function WeekendKickoffPage() {
  const [loading, setLoading] = useState(true);
  const [isFriday, setIsFriday] = useState(false);
  const [fridaySmokers, setFridaySmokers] = useState<FridaySmoker[]>([]);
  const [userHighlights, setUserHighlights] = useState<WeekHighlight[]>([]);
  const [userStats, setUserStats] = useState<WeekendStats | null>(null);
  const [suggestions, setSuggestions] = useState<WeekendSuggestion[]>([]);
  const [warriors, setWarriors] = useState<WeekendWarrior[]>([]);
  const [platformStats, setPlatformStats] = useState<{
    fridayCheckins: number;
    activeSmokers: number;
    avgRating: number;
    trendingBrand: string | null;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"kickoff" | "warriors">("kickoff");

  useEffect(() => {
    fetchWeekendData();
  }, []);

  const fetchWeekendData = async () => {
    try {
      // Get user ID from localStorage if available
      const storedUser = localStorage.getItem("puffed_user");
      const userId = storedUser ? JSON.parse(storedUser).id : null;
      
      const url = userId 
        ? `/api/weekend-kickoff?userId=${userId}`
        : "/api/weekend-kickoff";
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json() as {
          isFriday: boolean;
          fridaySmokers?: FridaySmoker[];
          userHighlights?: WeekHighlight[];
          userStats?: WeekendStats;
          suggestions?: WeekendSuggestion[];
          warriors?: WeekendWarrior[];
          platformStats?: PlatformStats;
        };
        setIsFriday(data.isFriday);
        setFridaySmokers(data.fridaySmokers || []);
        setUserHighlights(data.userHighlights || []);
        setUserStats(data.userStats || null);
        setSuggestions(data.suggestions || []);
        setWarriors(data.warriors || []);
        setPlatformStats(data.platformStats || null);
      }
    } catch (error) {
      console.error("Error fetching weekend data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (timestamp: number) => {
    const diff = Math.floor(Date.now() / 1000) - timestamp;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Calculate countdown to 5 PM (Happy Hour)
  const getHappyHourCountdown = () => {
    const now = new Date();
    const happyHour = new Date();
    happyHour.setHours(17, 0, 0, 0);
    
    if (now >= happyHour) return null;
    
    const diff = happyHour.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  };

  const happyHourCountdown = getHappyHourCountdown();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-gray-900 to-teal-950 p-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="p-2 rounded-xl glass hover:bg-white/10 transition-colors">
            <FiArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              🎊 Weekend Kickoff
            </h1>
            <p className="text-gray-400 text-sm">TGIF! Let's celebrate the week</p>
          </div>
        </div>

        {/* Friday Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass rounded-2xl p-4 mb-6 ${
            isFriday 
              ? "bg-gradient-to-r from-green-500/20 to-teal-500/20 border border-green-500/30" 
              : "bg-gradient-to-r from-gray-500/10 to-gray-600/10"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isFriday ? (
                <>
                  <div className="text-4xl animate-bounce">🎉</div>
                  <div>
                    <p className="font-semibold text-green-400">It's Friday!</p>
                    <p className="text-sm text-gray-400">Time to kick off the weekend</p>
                  </div>
                </>
              ) : (
                <>
                  <FiCalendar className="text-gray-400" size={24} />
                  <div>
                    <p className="font-semibold text-gray-300">Weekend's Coming!</p>
                    <p className="text-sm text-gray-400">Check back on Friday for the party</p>
                  </div>
                </>
              )}
            </div>
            {happyHourCountdown && (
              <div className="text-right">
                <p className="text-xs text-gray-400">Happy Hour in</p>
                <p className="text-lg font-bold text-orange-400">
                  {happyHourCountdown.hours}h {happyHourCountdown.minutes}m
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* User's Week Highlights */}
        {userStats && userStats.weekCheckins > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-4 mb-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FiAward className="text-purple-400" /> Your Week in Smoke
            </h3>
            <div className="grid grid-cols-4 gap-2 text-center mb-4">
              <div>
                <p className="text-xl font-bold text-purple-400">{userStats.weekCheckins}</p>
                <p className="text-xs text-gray-400">Smokes</p>
              </div>
              <div>
                <p className="text-xl font-bold text-pink-400">{userStats.weekLikes}</p>
                <p className="text-xs text-gray-400">Likes</p>
              </div>
              <div>
                <p className="text-xl font-bold text-teal-400">{userStats.weekComments}</p>
                <p className="text-xs text-gray-400">Comments</p>
              </div>
              <div>
                <p className="text-xl font-bold text-yellow-400">{userStats.uniqueBrands}</p>
                <p className="text-xs text-gray-400">Brands</p>
              </div>
            </div>
            
            {userHighlights.length > 0 && (
              <div>
                <p className="text-sm text-gray-400 mb-2">🏆 Your Top Moments</p>
                <div className="space-y-2">
                  {userHighlights.map((h, i) => (
                    <Link
                      key={h.id}
                      href={`/checkin/${h.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      {h.image_url ? (
                        <img src={h.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          {["🥇", "🥈", "🥉"][i]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{h.brand}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          {h.rating && <span className="text-yellow-400">⭐ {h.rating}</span>}
                          {h.likes > 0 && (
                            <span className="flex items-center gap-1">
                              <FiHeart size={10} /> {h.likes}
                            </span>
                          )}
                          {h.comments > 0 && (
                            <span className="flex items-center gap-1">
                              <FiMessageCircle size={10} /> {h.comments}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Weekend Suggestions */}
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-4 mb-6"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FiZap className="text-yellow-400" /> Weekend Recommendations
            </h3>
            <p className="text-sm text-gray-400 mb-3">Based on your favorites</p>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10"
                >
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center text-lg">
                    {["🌟", "✨", "💫"][i]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-yellow-400">{s.brand}</p>
                    <p className="text-xs text-gray-400">{s.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-yellow-400 flex items-center gap-1">
                      <FiStar size={12} fill="currentColor" /> {s.avgRating.toFixed(1)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Platform Stats */}
        {platformStats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass rounded-2xl p-4 mb-6"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FiTrendingUp className="text-green-400" /> Friday Vibes
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Friday Smokes</p>
                <p className="font-semibold text-green-400 text-xl">{platformStats.fridayCheckins}</p>
              </div>
              <div>
                <p className="text-gray-400">Active Smokers</p>
                <p className="font-semibold text-teal-400 text-xl">{platformStats.activeSmokers}</p>
              </div>
              <div>
                <p className="text-gray-400">Avg Rating</p>
                <p className="font-semibold text-yellow-400">
                  {platformStats.avgRating > 0 ? `${platformStats.avgRating.toFixed(1)} ⭐` : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Trending Brand</p>
                <p className="font-semibold text-purple-400 truncate">
                  {platformStats.trendingBrand || "—"}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("kickoff")}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
              activeTab === "kickoff"
                ? "bg-green-500 text-black"
                : "glass text-gray-400 hover:text-white"
            }`}
          >
            🎊 Friday Feed
          </button>
          <button
            onClick={() => setActiveTab("warriors")}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
              activeTab === "warriors"
                ? "bg-green-500 text-black"
                : "glass text-gray-400 hover:text-white"
            }`}
          >
            ⚔️ Weekend Warriors
          </button>
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-400">Loading weekend vibes...</p>
          </div>
        ) : activeTab === "kickoff" ? (
          <div className="space-y-3">
            {fridaySmokers.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass rounded-2xl p-8 text-center"
              >
                <p className="text-4xl mb-3">🎊</p>
                <p className="text-gray-300 font-medium">No Friday smokes yet!</p>
                <p className="text-gray-500 text-sm mt-1">Be the first to kick off the weekend</p>
                <Link
                  href="/dashboard"
                  className="inline-block mt-4 px-6 py-2 bg-green-500 text-black font-semibold rounded-xl hover:bg-green-400 transition-colors"
                >
                  Log a Smoke
                </Link>
              </motion.div>
            ) : (
              fridaySmokers.map((smoker, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass rounded-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    {smoker.image_url ? (
                      <img
                        src={smoker.image_url}
                        alt={smoker.brand}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center text-xl">
                        🎊
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/user/${smoker.username}`}
                          className="font-semibold text-green-400 hover:underline"
                        >
                          {smoker.username}
                        </Link>
                        <span className="text-gray-500 text-xs">{getTimeAgo(smoker.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-300 truncate">
                        {smoker.brand}{smoker.product ? ` - ${smoker.product}` : ""}
                      </p>
                      {smoker.rating && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit mt-1">
                          <FiStar size={10} fill="currentColor" /> {smoker.rating}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {warriors.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass rounded-2xl p-8 text-center"
              >
                <p className="text-4xl mb-3">⚔️</p>
                <p className="text-gray-300 font-medium">No weekend warriors yet</p>
                <p className="text-gray-500 text-sm mt-1">Smoke on Fridays to earn your place!</p>
              </motion.div>
            ) : (
              warriors.map((warrior, index) => (
                <motion.div
                  key={warrior.username}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass rounded-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                      index === 0 ? "bg-yellow-500 text-black" :
                      index === 1 ? "bg-gray-400 text-black" :
                      index === 2 ? "bg-amber-700 text-white" :
                      "bg-gray-700 text-gray-300"
                    }`}>
                      {index < 3 ? ["🥇", "🥈", "🥉"][index] : index + 1}
                    </div>
                    <div className="flex-1">
                      <Link
                        href={`/user/${warrior.username}`}
                        className="font-semibold text-green-400 hover:underline"
                      >
                        {warrior.username}
                      </Link>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <span>⚔️ {warrior.fridayCount} Friday smokes</span>
                        {warrior.avgRating > 0 && (
                          <span className="flex items-center gap-1">
                            <FiStar size={10} className="text-yellow-400" fill="currentColor" />
                            {warrior.avgRating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {warrior.favoriteBrand && (
                        <p className="text-xs text-teal-400 mt-1">
                          Favorite: {warrior.favoriteBrand}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Footer Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center space-y-2"
        >
          <p className="text-gray-500 text-sm">
            🎊 Friday is the gateway to the weekend!
          </p>
          <div className="flex justify-center gap-4 text-sm">
            <Link href="/happy-hour" className="text-orange-400 hover:text-orange-300">
              🍻 Happy Hour →
            </Link>
            <Link href="/council" className="text-purple-400 hover:text-purple-300">
              🏛️ Smoke Council →
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
