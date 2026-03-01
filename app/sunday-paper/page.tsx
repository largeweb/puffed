'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiHome, FiRefreshCw, FiCoffee, FiStar, FiTrendingUp, FiUsers, FiBookOpen, FiAward } from 'react-icons/fi';

interface Headline {
  type: 'checkin' | 'follow' | 'streak' | 'milestone';
  title: string;
  subtitle: string;
  time: string;
}

interface ClassifiedAd {
  username: string;
  brand: string;
  rating: number;
  seeking?: string;
}

interface SportsScore {
  username: string;
  stat: string;
  value: number;
  rank: number;
}

interface SundayPaperData {
  isSunday: boolean;
  isPaperTime: boolean;
  currentHour: number;
  countdownMessage: string;
  edition: string;
  masthead: {
    date: string;
    weather: string;
    motto: string;
  };
  frontPage: {
    leadStory: Headline;
    headlines: Headline[];
  };
  sportsSection: {
    weekendMVP: SportsScore | null;
    leaderboard: SportsScore[];
    streakWatch: { username: string; streak: number }[];
  };
  lifestyleSection: {
    topRated: { brand: string; rating: number; checkins: number }[];
    trending: { brand: string; change: number }[];
    flavorOfTheWeek: string | null;
  };
  classifieds: ClassifiedAd[];
  comicsSection: {
    dailyJoke: string;
    funFact: string;
    todaysPuzzle: string;
  };
  stats: {
    totalReaders: number;
    sundaySmokes: number;
    avgSundayRating: number;
    yourSundaySmokes: number;
  };
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export default function SundayPaperPage() {
  const router = useRouter();
  const [data, setData] = useState<SundayPaperData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'front' | 'sports' | 'lifestyle' | 'classifieds' | 'comics'>('front');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/sunday-paper');
      if (res.ok) {
        const json = await res.json() as SundayPaperData;
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch sunday paper:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120000); // refresh every 2 min
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-200 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-6xl"
        >
          📰
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-200 flex items-center justify-center">
        <p className="text-stone-600">Failed to load the paper</p>
      </div>
    );
  }

  const sections = [
    { id: 'front', label: 'Front Page', icon: '📰' },
    { id: 'sports', label: 'Sports', icon: '🏆' },
    { id: 'lifestyle', label: 'Lifestyle', icon: '🎨' },
    { id: 'classifieds', label: 'Classifieds', icon: '📋' },
    { id: 'comics', label: 'Comics', icon: '😄' },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-200">
      {/* Newspaper texture overlay */}
      <div className="fixed inset-0 opacity-5 pointer-events-none" 
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.1\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")' }} 
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-stone-100/95 backdrop-blur-sm border-b-2 border-stone-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="text-stone-600 hover:text-stone-900">
            <FiHome className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📰</span>
            <h1 className="text-xl font-serif font-bold text-stone-800">The Sunday Paper</h1>
          </div>
          <button onClick={() => fetchData()} className="text-stone-600 hover:text-stone-900">
            <FiRefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Masthead */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center border-b-4 border-double border-stone-800 pb-4"
        >
          <h2 className="text-5xl font-serif font-black text-stone-900 tracking-tight">
            THE PUFFED TIMES
          </h2>
          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-stone-600 font-serif">
            <span>{data.masthead.date}</span>
            <span>•</span>
            <span>{data.masthead.weather}</span>
            <span>•</span>
            <span className="italic">&quot;{data.masthead.motto}&quot;</span>
          </div>
          <p className="text-xs text-stone-500 mt-1">{data.edition}</p>
        </motion.div>

        {/* Not Sunday Message */}
        {!data.isSunday && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-amber-100 border-2 border-amber-300 rounded-lg p-6 text-center"
          >
            <p className="text-4xl mb-3">📅</p>
            <h3 className="text-xl font-serif font-bold text-stone-800 mb-2">
              The Sunday Paper comes out on... Sunday!
            </h3>
            <p className="text-stone-600">{data.countdownMessage}</p>
          </motion.div>
        )}

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-3"
        >
          <div className="bg-white rounded-lg p-3 text-center border border-stone-200 shadow-sm">
            <p className="text-2xl font-bold text-stone-800">{data.stats.totalReaders}</p>
            <p className="text-xs text-stone-500">Readers</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-stone-200 shadow-sm">
            <p className="text-2xl font-bold text-amber-600">{data.stats.sundaySmokes}</p>
            <p className="text-xs text-stone-500">Sunday Smokes</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-stone-200 shadow-sm">
            <p className="text-2xl font-bold text-yellow-600">⭐ {data.stats.avgSundayRating}</p>
            <p className="text-xs text-stone-500">Avg Rating</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-stone-200 shadow-sm">
            <p className="text-2xl font-bold text-green-600">{data.stats.yourSundaySmokes}</p>
            <p className="text-xs text-stone-500">Your Sundays</p>
          </div>
        </motion.div>

        {/* Section Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded-lg font-serif text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                activeSection === section.id
                  ? 'bg-stone-800 text-white'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              <span>{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>

        {/* Section Content */}
        <AnimatePresence mode="wait">
          {activeSection === 'front' && (
            <motion.div
              key="front"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Lead Story */}
              {data.frontPage.leadStory && (
                <div className="bg-white rounded-lg p-6 border-2 border-stone-800 shadow-lg">
                  <div className="text-xs text-red-600 font-bold uppercase tracking-wider mb-2">
                    BREAKING
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-stone-900 mb-2">
                    {data.frontPage.leadStory.title}
                  </h3>
                  <p className="text-stone-600">{data.frontPage.leadStory.subtitle}</p>
                  <p className="text-xs text-stone-400 mt-3">{data.frontPage.leadStory.time}</p>
                </div>
              )}

              {/* Other Headlines */}
              <div className="grid md:grid-cols-2 gap-4">
                {data.frontPage.headlines.map((headline, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white rounded-lg p-4 border border-stone-200 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">
                        {headline.type === 'checkin' && '🚬'}
                        {headline.type === 'follow' && '👥'}
                        {headline.type === 'streak' && '🔥'}
                        {headline.type === 'milestone' && '🎉'}
                      </span>
                      <div>
                        <h4 className="font-serif font-semibold text-stone-800">{headline.title}</h4>
                        <p className="text-sm text-stone-500">{headline.subtitle}</p>
                        <p className="text-xs text-stone-400 mt-1">{headline.time}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {data.frontPage.headlines.length === 0 && !data.frontPage.leadStory && (
                <div className="bg-white rounded-lg p-8 text-center border border-stone-200">
                  <p className="text-4xl mb-3">📝</p>
                  <p className="text-stone-500 font-serif">No breaking news yet today...</p>
                  <p className="text-sm text-stone-400 mt-2">Be the first to make headlines!</p>
                </div>
              )}
            </motion.div>
          )}

          {activeSection === 'sports' && (
            <motion.div
              key="sports"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <h3 className="text-xl font-serif font-bold text-stone-800 border-b-2 border-stone-800 pb-2">
                🏆 SPORTS SECTION
              </h3>

              {/* Weekend MVP */}
              {data.sportsSection.weekendMVP && (
                <div className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg p-6 border-2 border-yellow-400">
                  <div className="text-xs text-yellow-700 font-bold uppercase mb-2">Weekend MVP</div>
                  <div className="flex items-center gap-4">
                    <span className="text-5xl">🏅</span>
                    <div>
                      <h4 className="text-2xl font-serif font-bold text-stone-900">
                        {data.sportsSection.weekendMVP.username}
                      </h4>
                      <p className="text-stone-600">
                        {data.sportsSection.weekendMVP.stat}: {data.sportsSection.weekendMVP.value}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Leaderboard */}
              <div className="bg-white rounded-lg p-4 border border-stone-200">
                <h4 className="font-serif font-semibold text-stone-800 mb-3 flex items-center gap-2">
                  <FiAward className="w-4 h-4" /> Weekend Standings
                </h4>
                <div className="space-y-2">
                  {data.sportsSection.leaderboard.map((player, idx) => (
                    <div
                      key={player.username}
                      className={`flex items-center justify-between p-2 rounded ${
                        idx === 0 ? 'bg-yellow-50' : idx === 1 ? 'bg-stone-50' : idx === 2 ? 'bg-orange-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-center font-bold text-stone-600">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                        </span>
                        <Link href={`/user/${player.username}`} className="text-stone-800 hover:text-amber-600">
                          {player.username}
                        </Link>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-stone-800">{player.value}</span>
                        <span className="text-xs text-stone-500 ml-1">{player.stat}</span>
                      </div>
                    </div>
                  ))}
                  {data.sportsSection.leaderboard.length === 0 && (
                    <p className="text-center text-stone-400 py-4">No weekend activity yet</p>
                  )}
                </div>
              </div>

              {/* Streak Watch */}
              {data.sportsSection.streakWatch.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h4 className="font-serif font-semibold text-red-800 mb-3">🔥 Streak Watch</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.sportsSection.streakWatch.map((s) => (
                      <div key={s.username} className="bg-white px-3 py-1 rounded-full border border-red-300 text-sm">
                        <Link href={`/user/${s.username}`} className="text-red-700 font-medium">
                          {s.username}
                        </Link>
                        <span className="text-red-500 ml-1">🔥{s.streak}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeSection === 'lifestyle' && (
            <motion.div
              key="lifestyle"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <h3 className="text-xl font-serif font-bold text-stone-800 border-b-2 border-stone-800 pb-2">
                🎨 LIFESTYLE & CULTURE
              </h3>

              {/* Top Rated Brands */}
              <div className="bg-white rounded-lg p-4 border border-stone-200">
                <h4 className="font-serif font-semibold text-stone-800 mb-3">⭐ Critics&apos; Choice</h4>
                <div className="space-y-2">
                  {data.lifestyleSection.topRated.map((brand, idx) => (
                    <div key={brand.brand} className="flex items-center justify-between">
                      <Link href={`/cigar/${encodeURIComponent(brand.brand)}`} className="text-stone-800 hover:text-amber-600">
                        {brand.brand}
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-500">{'⭐'.repeat(Math.round(brand.rating))}</span>
                        <span className="text-xs text-stone-400">({brand.checkins})</span>
                      </div>
                    </div>
                  ))}
                  {data.lifestyleSection.topRated.length === 0 && (
                    <p className="text-stone-400 text-center py-2">No ratings yet</p>
                  )}
                </div>
              </div>

              {/* Trending */}
              <div className="bg-white rounded-lg p-4 border border-stone-200">
                <h4 className="font-serif font-semibold text-stone-800 mb-3">📈 Trending This Week</h4>
                <div className="flex flex-wrap gap-2">
                  {data.lifestyleSection.trending.map((brand) => (
                    <Link
                      key={brand.brand}
                      href={`/cigar/${encodeURIComponent(brand.brand)}`}
                      className="bg-green-50 px-3 py-1 rounded-full border border-green-300 text-sm text-green-700 hover:bg-green-100"
                    >
                      {brand.brand} <span className="text-green-500">+{brand.change}</span>
                    </Link>
                  ))}
                  {data.lifestyleSection.trending.length === 0 && (
                    <p className="text-stone-400">No trending brands yet</p>
                  )}
                </div>
              </div>

              {/* Flavor of the Week */}
              {data.lifestyleSection.flavorOfTheWeek && (
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4 border border-purple-200">
                  <h4 className="font-serif font-semibold text-purple-800 mb-2">👅 Flavor of the Week</h4>
                  <p className="text-2xl font-bold text-purple-700">{data.lifestyleSection.flavorOfTheWeek}</p>
                </div>
              )}
            </motion.div>
          )}

          {activeSection === 'classifieds' && (
            <motion.div
              key="classifieds"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <h3 className="text-xl font-serif font-bold text-stone-800 border-b-2 border-stone-800 pb-2">
                📋 CLASSIFIEDS
              </h3>

              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <p className="text-sm text-stone-600 font-serif italic mb-4">
                  Community members looking for smoking buddies with similar tastes...
                </p>
                <div className="grid gap-3">
                  {data.classifieds.map((ad, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border border-stone-200">
                      <div className="flex items-center justify-between">
                        <Link href={`/user/${ad.username}`} className="font-medium text-stone-800 hover:text-amber-600">
                          @{ad.username}
                        </Link>
                        <span className="text-xs text-stone-400">{'⭐'.repeat(ad.rating)} avg</span>
                      </div>
                      <p className="text-sm text-stone-600 mt-1">
                        Loves: <span className="font-medium">{ad.brand}</span>
                      </p>
                      {ad.seeking && (
                        <p className="text-xs text-amber-600 mt-1">Seeking: {ad.seeking}</p>
                      )}
                    </div>
                  ))}
                  {data.classifieds.length === 0 && (
                    <p className="text-center text-stone-400 py-4">No classifieds this week</p>
                  )}
                </div>
              </div>

              <div className="text-center">
                <Link
                  href="/twins"
                  className="inline-block px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Find Your Smoke Twin →
                </Link>
              </div>
            </motion.div>
          )}

          {activeSection === 'comics' && (
            <motion.div
              key="comics"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <h3 className="text-xl font-serif font-bold text-stone-800 border-b-2 border-stone-800 pb-2">
                😄 COMICS & PUZZLES
              </h3>

              {/* Daily Joke */}
              <div className="bg-gradient-to-r from-pink-100 to-orange-100 rounded-lg p-6 border border-pink-200">
                <h4 className="font-serif font-semibold text-stone-800 mb-3">😂 Joke of the Day</h4>
                <p className="text-lg text-stone-700 font-serif">{data.comicsSection.dailyJoke}</p>
              </div>

              {/* Fun Fact */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-serif font-semibold text-blue-800 mb-2">💡 Did You Know?</h4>
                <p className="text-stone-700">{data.comicsSection.funFact}</p>
              </div>

              {/* Puzzle */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="font-serif font-semibold text-green-800 mb-2">🧩 Sunday Puzzle</h4>
                <p className="text-stone-700 font-mono">{data.comicsSection.todaysPuzzle}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap gap-2 justify-center pt-6 border-t border-stone-300"
        >
          <Link
            href="/sunday-sunrise"
            className="px-4 py-2 bg-orange-100 rounded-full text-orange-700 text-sm hover:bg-orange-200 transition-colors"
          >
            🌅 Sunday Sunrise
          </Link>
          <Link
            href="/brunch"
            className="px-4 py-2 bg-amber-100 rounded-full text-amber-700 text-sm hover:bg-amber-200 transition-colors"
          >
            🥞 Brunch Club
          </Link>
          <Link
            href="/coffee"
            className="px-4 py-2 bg-stone-200 rounded-full text-stone-700 text-sm hover:bg-stone-300 transition-colors"
          >
            ☕ Coffee Lounge
          </Link>
          <Link
            href="/weekend-recap"
            className="px-4 py-2 bg-purple-100 rounded-full text-purple-700 text-sm hover:bg-purple-200 transition-colors"
          >
            📊 Weekend Recap
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
