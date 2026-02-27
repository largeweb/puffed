"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  FiHome, FiRefreshCw, FiStar, FiSun, FiTrendingUp, 
  FiUser, FiCoffee, FiMessageCircle, FiHeart, FiAward,
  FiCalendar, FiZap
} from "react-icons/fi";

interface YesterdayHighlight {
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  review?: string;
  imageUrl?: string;
  likes: number;
  comments: number;
}

interface TrendingBrand {
  brand: string;
  count: number;
  avgRating: number;
  trend: "up" | "stable" | "new";
}

interface FeaturedSmoker {
  username: string;
  totalCheckins: number;
  recentActivity: string;
  favoritesBrand?: string;
}

interface PersonalBrief {
  streak: number;
  yourTotal: number;
  yourYesterday: number;
  lastBrand?: string;
  streakAtRisk: boolean;
}

interface MorningBriefData {
  greeting: string;
  quote: string;
  fact: string;
  isFriday: boolean;
  isWeekend: boolean;
  dayOfWeek: number;
  yesterdayHighlights: YesterdayHighlight[];
  trendingBrands: TrendingBrand[];
  featuredSmoker: FeaturedSmoker | null;
  stats: {
    totalUsers: number;
    totalCheckins: number;
    yesterdayCheckins: number;
    activeYesterday: number;
    avgRatingYesterday: number | null;
  };
  personalBrief: PersonalBrief | null;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function MorningBriefPage() {
  const [data, setData] = useState<MorningBriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  const fetchBrief = useCallback(async () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem("puffed_user");
      const username = stored ? JSON.parse(stored).username : null;
      setCurrentUser(username);
      
      const url = username 
        ? `/api/morning-brief?username=${encodeURIComponent(username)}`
        : "/api/morning-brief";
      
      const res = await fetch(url);
      if (res.ok) {
        const briefData = await res.json();
        setData(briefData);
      }
    } catch (error) {
      console.error("Failed to fetch morning brief:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  const today = new Date();
  const dayName = DAYS[today.getDay()];
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="text-white/80 hover:text-white">
            <FiHome size={22} />
          </Link>
          <div className="flex items-center gap-2">
            <FiSun className="text-yellow-200" size={20} />
            <h1 className="text-lg font-bold text-white">Morning Brief</h1>
          </div>
          <button 
            onClick={fetchBrief}
            className="text-white/80 hover:text-white"
            disabled={loading}
          >
            <FiRefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-20">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <FiCoffee size={48} className="text-amber-500" />
            </motion.div>
            <p className="text-amber-700 mt-4">Brewing your morning brief...</p>
          </div>
        ) : data ? (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Greeting Card */}
              <motion.div 
                className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-6 text-white shadow-xl"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
              >
                <div className="flex items-center gap-2 text-amber-100 text-sm mb-2">
                  <FiCalendar size={14} />
                  <span>{dayName}, {dateStr}</span>
                  {data.isFriday && <span className="ml-2">🎉 TGIF!</span>}
                  {data.isWeekend && <span className="ml-2">🌴 Weekend!</span>}
                </div>
                <h2 className="text-2xl font-bold mb-3">
                  {data.greeting}{currentUser ? `, ${currentUser}` : ""}! ☕
                </h2>
                <p className="text-amber-50 italic text-sm leading-relaxed">
                  &ldquo;{data.quote}&rdquo;
                </p>
              </motion.div>

              {/* Personal Brief (if logged in) */}
              {data.personalBrief && (
                <motion.div 
                  className="bg-white rounded-xl p-5 shadow-md border border-amber-200"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <FiUser className="text-amber-500" />
                    Your Morning Status
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-amber-600">
                        {data.personalBrief.streak}🔥
                      </div>
                      <div className="text-xs text-gray-500">Streak</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {data.personalBrief.yourTotal}
                      </div>
                      <div className="text-xs text-gray-500">Total Smokes</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {data.personalBrief.yourYesterday}
                      </div>
                      <div className="text-xs text-gray-500">Yesterday</div>
                    </div>
                  </div>
                  {data.personalBrief.streakAtRisk && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
                      ⚠️ Your {data.personalBrief.streak}-day streak is at risk! Log a smoke today!
                    </div>
                  )}
                  {data.personalBrief.lastBrand && (
                    <div className="mt-3 text-sm text-gray-600 text-center">
                      Last smoke: <span className="font-medium">{data.personalBrief.lastBrand}</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Platform Pulse */}
              <motion.div 
                className="bg-white rounded-xl p-5 shadow-md border border-orange-200"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                  <FiZap className="text-orange-500" />
                  Platform Pulse
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-orange-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-orange-600">{data.stats.yesterdayCheckins}</div>
                    <div className="text-xs text-gray-500">Smokes Yesterday</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-amber-600">{data.stats.activeYesterday}</div>
                    <div className="text-xs text-gray-500">Active Smokers</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-yellow-600">{data.stats.totalUsers}</div>
                    <div className="text-xs text-gray-500">Community Size</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-orange-600">
                      {data.stats.avgRatingYesterday ? `${data.stats.avgRatingYesterday}⭐` : "—"}
                    </div>
                    <div className="text-xs text-gray-500">Avg Rating</div>
                  </div>
                </div>
              </motion.div>

              {/* Yesterday's Highlights */}
              {data.yesterdayHighlights.length > 0 && (
                <motion.div 
                  className="bg-white rounded-xl p-5 shadow-md border border-yellow-200"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                    <FiStar className="text-yellow-500" />
                    Recent Highlights
                  </h3>
                  <div className="space-y-3">
                    {data.yesterdayHighlights.slice(0, 3).map((highlight, i) => (
                      <div 
                        key={i}
                        className="flex items-start gap-3 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg"
                      >
                        {highlight.imageUrl ? (
                          <img 
                            src={highlight.imageUrl} 
                            alt={highlight.brand}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-amber-200 flex items-center justify-center text-xl">
                            🚬
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Link 
                              href={`/user/${highlight.username}`}
                              className="font-medium text-amber-800 hover:underline"
                            >
                              {highlight.username}
                            </Link>
                            {highlight.rating && (
                              <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">
                                {highlight.rating}⭐
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-700 truncate">
                            {highlight.brand} {highlight.product && `· ${highlight.product}`}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <FiHeart size={12} /> {highlight.likes}
                            </span>
                            <span className="flex items-center gap-1">
                              <FiMessageCircle size={12} /> {highlight.comments}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Trending Brands */}
              {data.trendingBrands.length > 0 && (
                <motion.div 
                  className="bg-white rounded-xl p-5 shadow-md border border-green-200"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                >
                  <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <FiTrendingUp className="text-green-500" />
                    Trending This Week
                  </h3>
                  <div className="space-y-2">
                    {data.trendingBrands.map((brand, i) => (
                      <Link
                        key={brand.brand}
                        href={`/cigar/${encodeURIComponent(brand.brand)}`}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-green-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-green-600">#{i + 1}</span>
                          <span className="font-medium text-gray-800">{brand.brand}</span>
                          {brand.trend === "up" && <span className="text-green-500">📈</span>}
                          {brand.trend === "new" && <span className="text-blue-500">🆕</span>}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">{brand.count} smokes</span>
                          <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-xs">
                            {brand.avgRating}⭐
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Featured Smoker */}
              {data.featuredSmoker && (
                <motion.div 
                  className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-5 text-white shadow-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FiAward className="text-yellow-300" />
                    Featured Smoker of the Day
                  </h3>
                  <Link 
                    href={`/user/${data.featuredSmoker.username}`}
                    className="flex items-center gap-4 p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                      👤
                    </div>
                    <div>
                      <div className="font-bold text-lg">{data.featuredSmoker.username}</div>
                      <div className="text-purple-200 text-sm">
                        {data.featuredSmoker.totalCheckins} total smokes · {data.featuredSmoker.recentActivity}
                      </div>
                      {data.featuredSmoker.favoritesBrand && (
                        <div className="text-purple-100 text-xs mt-1">
                          Loves: {data.featuredSmoker.favoritesBrand}
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              )}

              {/* Smoke Fact */}
              <motion.div 
                className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-200"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  💡 Smoke Fact of the Day
                </h3>
                <p className="text-blue-700 text-sm leading-relaxed">{data.fact}</p>
              </motion.div>

              {/* Quick Actions */}
              <motion.div 
                className="grid grid-cols-2 gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Link
                  href="/checkin"
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl p-4 text-center font-semibold shadow-lg hover:shadow-xl transition-shadow"
                >
                  🚬 Log a Smoke
                </Link>
                <Link
                  href="/discover"
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl p-4 text-center font-semibold shadow-lg hover:shadow-xl transition-shadow"
                >
                  🔍 Explore
                </Link>
              </motion.div>

              {/* Footer Links */}
              <div className="flex justify-center gap-4 text-sm pt-2">
                <Link href="/coffee" className="text-amber-600 hover:underline">☕ Coffee Lounge</Link>
                {data.isFriday && (
                  <Link href="/tgif" className="text-orange-600 hover:underline">🎉 TGIF Club</Link>
                )}
                <Link href="/pulse" className="text-blue-600 hover:underline">📈 Full Stats</Link>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center py-20 text-gray-500">
            Failed to load morning brief. Try refreshing.
          </div>
        )}
      </div>
    </main>
  );
}
