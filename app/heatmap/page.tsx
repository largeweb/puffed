"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { FiCalendar, FiZap, FiTrendingUp, FiAward, FiArrowLeft, FiStar, FiClock, FiTarget, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface DayData {
  date: string;
  count: number;
  avgRating: number | null;
}

interface HeatmapData {
  days: DayData[];
  stats: {
    totalDays: number;
    maxStreak: number;
    currentStreak: number;
    busiestDay: string | null;
    busiestDayCount: number;
    totalCheckins: number;
    avgPerActiveDay: number;
  };
}

interface UserInfo {
  username: string;
  avatar_url?: string;
  bio?: string;
}

export default function HeatmapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get("user");
  
  const [data, setData] = useState<HeatmapData | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"year" | "month">("year");

  useEffect(() => {
    const url = username ? `/api/smoke-heatmap?username=${username}` : "/api/smoke-heatmap";
    fetch(url)
      .then(r => r.json() as Promise<HeatmapData & { error?: string }>)
      .then(d => {
        if (!d.error) setData(d);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    
    // Get user info if viewing someone else's heatmap
    if (username) {
      fetch(`/api/user/${username}/profile`)
        .then(r => r.json() as Promise<{ error?: string; username?: string; avatar_url?: string; bio?: string }>)
        .then((d) => {
          if (!d.error) setUserInfo(d as { username: string; avatar_url?: string; bio?: string });
        })
        .catch(console.error);
    } else {
      fetch("/api/auth/me")
        .then(r => r.json() as Promise<{ user?: { username: string; avatar_url?: string; bio?: string } }>)
        .then((d) => {
          if (d.user) setUserInfo({ username: d.user.username, avatar_url: d.user.avatar_url, bio: d.user.bio });
        })
        .catch(console.error);
    }
  }, [username]);

  // Generate calendar grid for last 52 weeks
  const calendarData = useMemo(() => {
    if (!data) return [];
    
    const dayMap = new Map(data.days.map(d => [d.date, d]));
    const weeks: (DayData | null)[][] = [];
    
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - endDate.getDay());
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (52 * 7) + 1);
    
    let currentDate = new Date(startDate);
    let currentWeek: (DayData | null)[] = [];
    
    const startDay = currentDate.getDay();
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(null);
    }
    
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = dayMap.get(dateStr) || { date: dateStr, count: 0, avgRating: null };
      currentWeek.push(dayData);
      
      if (currentDate.getDay() === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }
    
    return weeks;
  }, [data]);

  // Generate monthly breakdown
  const monthlyData = useMemo(() => {
    if (!data) return [];
    
    const months: { month: string; year: number; days: number; smokes: number; avgRating: number | null }[] = [];
    const monthMap = new Map<string, { days: Set<string>; count: number; ratings: number[] }>();
    
    for (const day of data.days) {
      const date = new Date(day.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, { days: new Set(), count: 0, ratings: [] });
      }
      const m = monthMap.get(key)!;
      m.days.add(day.date);
      m.count += day.count;
      if (day.avgRating) m.ratings.push(day.avgRating);
    }
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (const [key, value] of monthMap.entries()) {
      const [year, month] = key.split('-').map(Number);
      months.push({
        month: monthNames[month],
        year,
        days: value.days.size,
        smokes: value.count,
        avgRating: value.ratings.length > 0 
          ? Math.round((value.ratings.reduce((a, b) => a + b, 0) / value.ratings.length) * 10) / 10 
          : null
      });
    }
    
    return months.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return monthNames.indexOf(b.month) - monthNames.indexOf(a.month);
    });
  }, [data]);

  const getIntensity = (count: number): string => {
    if (count === 0) return "bg-gray-800/50 hover:bg-gray-700/50";
    if (count === 1) return "bg-amber-900/60 hover:bg-amber-800/70";
    if (count === 2) return "bg-amber-700/70 hover:bg-amber-600/80";
    if (count === 3) return "bg-amber-500/80 hover:bg-amber-400/90";
    return "bg-amber-400 hover:bg-amber-300";
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const monthLabels = useMemo(() => {
    const labels: { month: string; offset: number }[] = [];
    let lastMonth = -1;
    calendarData.forEach((week, weekIndex) => {
      const firstDayOfWeek = week.find(d => d !== null);
      if (firstDayOfWeek) {
        const month = new Date(firstDayOfWeek.date).getMonth();
        if (month !== lastMonth) {
          labels.push({ month: months[month], offset: weekIndex });
          lastMonth = month;
        }
      }
    });
    return labels;
  }, [calendarData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-4 animate-pulse"></div>
          <div className="glass rounded-xl p-6 animate-pulse">
            <div className="h-48 bg-gray-700/50 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">No activity data available</p>
          <Link href="/dashboard" className="text-amber-400 mt-4 block">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-lg">
              <FiArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-bold text-lg flex items-center gap-2">
                <FiCalendar className="text-amber-400" />
                Smoke Heatmap
              </h1>
              {userInfo && (
                <p className="text-sm text-gray-400">
                  {username ? `@${userInfo.username}'s activity` : 'Your activity'}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setViewMode("year")}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${viewMode === "year" ? "bg-amber-500/20 text-amber-400" : "text-gray-400 hover:bg-gray-800"}`}
            >
              Year
            </button>
            <button 
              onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${viewMode === "month" ? "bg-amber-500/20 text-amber-400" : "text-gray-400 hover:bg-gray-800"}`}
            >
              Months
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-amber-400 mb-1">
              <FiZap size={24} className="mx-auto" />
            </div>
            <div className="text-2xl font-bold text-amber-400">{data.stats.currentStreak}</div>
            <div className="text-gray-400 text-sm">Current Streak</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-orange-400 mb-1">
              <FiAward size={24} className="mx-auto" />
            </div>
            <div className="text-2xl font-bold text-orange-400">{data.stats.maxStreak}</div>
            <div className="text-gray-400 text-sm">Best Streak</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-green-400 mb-1">
              <FiTrendingUp size={24} className="mx-auto" />
            </div>
            <div className="text-2xl font-bold text-green-400">{data.stats.avgPerActiveDay}</div>
            <div className="text-gray-400 text-sm">Avg Per Day</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-purple-400 mb-1">
              <FiTarget size={24} className="mx-auto" />
            </div>
            <div className="text-2xl font-bold text-purple-400">{data.stats.totalCheckins}</div>
            <div className="text-gray-400 text-sm">Total Smokes</div>
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-gray-400">Active on </span>
              <span className="text-white font-semibold">{data.stats.totalDays} days</span>
              <span className="text-gray-400"> in the last year</span>
            </div>
            {data.stats.busiestDay && (
              <div className="text-sm text-gray-400">
                Best day: <span className="text-amber-400">{new Date(data.stats.busiestDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <span className="text-amber-400 ml-1">({data.stats.busiestDayCount} smokes)</span>
              </div>
            )}
          </div>
        </motion.div>

        {viewMode === "year" && (
          <>
            {/* Full Heatmap */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-xl p-6 overflow-hidden"
            >
              {/* Month Labels */}
              <div className="relative mb-2 ml-8 h-4">
                {monthLabels.map((m, i) => (
                  <span 
                    key={i} 
                    className="absolute text-xs text-gray-500"
                    style={{ left: `${m.offset * 14}px` }}
                  >
                    {m.month}
                  </span>
                ))}
              </div>

              {/* Heatmap Grid */}
              <div className="flex gap-1 overflow-x-auto pb-4">
                {/* Day Labels */}
                <div className="flex flex-col gap-1 mr-2 text-xs text-gray-500 justify-around shrink-0">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>
                
                {/* Weeks */}
                <div className="flex gap-1">
                  {calendarData.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                      {week.map((day, dayIndex) => (
                        <motion.div
                          key={dayIndex}
                          whileHover={{ scale: 1.3 }}
                          className={`w-3.5 h-3.5 rounded-sm ${day ? getIntensity(day.count) : 'bg-transparent'} transition-all cursor-pointer`}
                          onMouseEnter={() => day && setHoveredDay(day)}
                          onMouseLeave={() => setHoveredDay(null)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tooltip */}
              {hoveredDay && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-3 bg-gray-800 rounded-lg inline-block"
                >
                  <div className="text-white font-medium">{formatDate(hoveredDay.date)}</div>
                  <div className="text-gray-400">
                    {hoveredDay.count === 0 ? (
                      "No smokes logged"
                    ) : (
                      <>
                        <span className="text-amber-400 font-semibold">{hoveredDay.count}</span> smoke{hoveredDay.count !== 1 ? 's' : ''}
                        {hoveredDay.avgRating && (
                          <span className="ml-2">
                            • Avg rating: <span className="text-amber-400">{hoveredDay.avgRating}★</span>
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Legend */}
              <div className="flex items-center justify-end gap-2 mt-4 text-sm text-gray-400">
                <span>Less</span>
                <div className="flex gap-1">
                  <div className="w-3.5 h-3.5 rounded-sm bg-gray-800/50"></div>
                  <div className="w-3.5 h-3.5 rounded-sm bg-amber-900/60"></div>
                  <div className="w-3.5 h-3.5 rounded-sm bg-amber-700/70"></div>
                  <div className="w-3.5 h-3.5 rounded-sm bg-amber-500/80"></div>
                  <div className="w-3.5 h-3.5 rounded-sm bg-amber-400"></div>
                </div>
                <span>More</span>
              </div>
            </motion.div>
          </>
        )}

        {viewMode === "month" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            {monthlyData.map((m, i) => (
              <motion.div
                key={`${m.year}-${m.month}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-semibold">{m.month} {m.year}</span>
                    <span className="text-gray-400 ml-2">• {m.days} active days</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-amber-400 font-bold text-lg">{m.smokes}</div>
                      <div className="text-gray-500 text-xs">smokes</div>
                    </div>
                    {m.avgRating && (
                      <div className="text-right">
                        <div className="text-yellow-400 font-bold text-lg flex items-center gap-1">
                          {m.avgRating} <FiStar size={14} />
                        </div>
                        <div className="text-gray-500 text-xs">avg</div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Progress bar showing activity density */}
                <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((m.days / 31) * 100, 100)}%` }}
                    transition={{ delay: i * 0.05 + 0.2, duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl p-4"
        >
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <FiAward className="text-yellow-400" /> Streaks & Milestones
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {data.stats.currentStreak >= 3 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-3">
                <span className="text-2xl">🔥</span>
                <div>
                  <div className="text-amber-400 font-semibold">{data.stats.currentStreak} Day Streak!</div>
                  <div className="text-gray-400 text-xs">Keep it going!</div>
                </div>
              </div>
            )}
            {data.stats.maxStreak >= 7 && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <div className="text-orange-400 font-semibold">Week Warrior</div>
                  <div className="text-gray-400 text-xs">{data.stats.maxStreak}+ day streak achieved</div>
                </div>
              </div>
            )}
            {data.stats.totalCheckins >= 50 && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 flex items-center gap-3">
                <span className="text-2xl">💨</span>
                <div>
                  <div className="text-purple-400 font-semibold">Half Century</div>
                  <div className="text-gray-400 text-xs">50+ smokes logged</div>
                </div>
              </div>
            )}
            {data.stats.totalDays >= 30 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-3">
                <span className="text-2xl">📅</span>
                <div>
                  <div className="text-green-400 font-semibold">Monthly Regular</div>
                  <div className="text-gray-400 text-xs">{data.stats.totalDays}+ active days</div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Back to Dashboard */}
        <Link 
          href="/dashboard" 
          className="block text-center text-amber-400 hover:text-amber-300 transition-colors py-4"
        >
          ← Back to Dashboard
        </Link>
      </main>
    </div>
  );
}
