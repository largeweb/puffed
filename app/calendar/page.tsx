"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { FiHome, FiCalendar, FiTrendingUp, FiAward, FiZap, FiStar, FiInfo } from "react-icons/fi";
import { GiCigarette } from "react-icons/gi";
import Link from "next/link";

interface CalendarDay {
  date: string;
  count: number;
  brands: string[];
}

interface CalendarStats {
  totalDays: number;
  totalCheckins: number;
  longestStreak: number;
  currentStreak: number;
  mostActiveDay: string;
  mostActiveCount: number;
}

interface CalendarResponse {
  days: CalendarDay[];
  stats: CalendarStats;
}

// Get intensity level (0-4) based on count
function getIntensity(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

// Get color based on intensity
function getColor(intensity: number): string {
  const colors = [
    "bg-stone-800/50", // 0 - no activity
    "bg-amber-900/60", // 1 - light
    "bg-amber-700/70", // 2 - medium-light  
    "bg-amber-500/80", // 3 - medium
    "bg-amber-400",    // 4 - high
  ];
  return colors[intensity];
}

// Generate array of dates for last N weeks
function generateCalendarGrid(weeks: number = 52): { date: Date; dateStr: string }[] {
  const dates: { date: Date; dateStr: string }[] = [];
  const today = new Date();
  
  // Find the start (Sunday of the earliest week)
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (weeks * 7) + 1);
  // Align to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());
  
  // Generate all dates
  const current = new Date(startDate);
  while (current <= today) {
    dates.push({
      date: new Date(current),
      dateStr: current.toISOString().split('T')[0],
    });
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
}

export default function CalendarPage() {
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCalendar() {
      try {
        const res = await fetch("/api/calendar");
        if (res.ok) {
          const json: CalendarResponse = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Calendar fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCalendar();
  }, []);

  // Create lookup map for quick access
  const dayMap = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    if (data?.days) {
      for (const day of data.days) {
        map.set(day.date, day);
      }
    }
    return map;
  }, [data]);

  // Generate calendar grid (52 weeks)
  const calendarDates = useMemo(() => generateCalendarGrid(52), []);

  // Group by weeks for rendering
  const weeks = useMemo(() => {
    const result: { date: Date; dateStr: string }[][] = [];
    let currentWeek: { date: Date; dateStr: string }[] = [];
    
    for (const d of calendarDates) {
      currentWeek.push(d);
      if (d.date.getDay() === 6) { // Saturday = end of week
        result.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      result.push(currentWeek);
    }
    
    return result;
  }, [calendarDates]);

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    
    weeks.forEach((week, weekIndex) => {
      const firstDay = week[0];
      if (firstDay && firstDay.date.getMonth() !== lastMonth) {
        lastMonth = firstDay.date.getMonth();
        labels.push({
          month: firstDay.date.toLocaleDateString('en-US', { month: 'short' }),
          weekIndex,
        });
      }
    });
    
    return labels;
  }, [weeks]);

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-black text-amber-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-stone-900/90 backdrop-blur-sm border-b border-amber-900/30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="text-amber-400 hover:text-amber-300">
            <FiHome size={24} />
          </Link>
          <h1 className="text-xl font-bold text-amber-100 flex items-center gap-2">
            <FiCalendar /> Smoke Calendar
          </h1>
          <Link href="/mystats" className="text-amber-400 hover:text-amber-300">
            <FiTrendingUp size={24} />
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Stats Cards */}
        {data?.stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-stone-800/40 rounded-xl p-4 border border-amber-900/20"
            >
              <div className="flex items-center gap-2 text-amber-400/70 text-sm">
                <FiZap size={16} />
                Current Streak
              </div>
              <div className="text-2xl font-bold text-amber-100 mt-1">
                {data.stats.currentStreak} <span className="text-sm text-amber-400/60">days</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-stone-800/40 rounded-xl p-4 border border-amber-900/20"
            >
              <div className="flex items-center gap-2 text-amber-400/70 text-sm">
                <FiAward size={16} />
                Longest Streak
              </div>
              <div className="text-2xl font-bold text-amber-100 mt-1">
                {data.stats.longestStreak} <span className="text-sm text-amber-400/60">days</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-stone-800/40 rounded-xl p-4 border border-amber-900/20"
            >
              <div className="flex items-center gap-2 text-amber-400/70 text-sm">
                <FiCalendar size={16} />
                Active Days
              </div>
              <div className="text-2xl font-bold text-amber-100 mt-1">
                {data.stats.totalDays} <span className="text-sm text-amber-400/60">days</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-stone-800/40 rounded-xl p-4 border border-amber-900/20"
            >
              <div className="flex items-center gap-2 text-amber-400/70 text-sm">
                <GiCigarette size={16} />
                Total Smokes
              </div>
              <div className="text-2xl font-bold text-amber-100 mt-1">
                {data.stats.totalCheckins}
              </div>
            </motion.div>
          </div>
        )}

        {/* Calendar Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-stone-800/30 rounded-2xl p-4 sm:p-6 border border-amber-900/20 overflow-x-auto"
        >
          <div className="text-sm text-amber-200/60 mb-4 flex items-center gap-2">
            <FiInfo size={14} />
            Your smoking activity over the last year
          </div>

          {/* Month labels */}
          <div className="flex mb-2 ml-10 text-xs text-amber-400/50">
            {monthLabels.map((label, i) => (
              <div
                key={`${label.month}-${i}`}
                className="flex-shrink-0"
                style={{ 
                  width: `${(weeks.length > label.weekIndex + 1 ? 
                    (monthLabels[i + 1]?.weekIndex || weeks.length) - label.weekIndex : 
                    4) * 14}px`,
                  paddingLeft: i === 0 ? '0' : '4px'
                }}
              >
                {label.month}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-[2px] text-xs text-amber-400/40 pr-2">
              {dayLabels.map((day, i) => (
                <div key={day} className="h-[12px] leading-[12px]" style={{ visibility: i % 2 === 1 ? 'visible' : 'hidden' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="flex gap-[2px]">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[2px]">
                  {week.map(({ dateStr, date }) => {
                    const dayData = dayMap.get(dateStr);
                    const intensity = getIntensity(dayData?.count || 0);
                    const isFuture = date > new Date();
                    
                    return (
                      <motion.div
                        key={dateStr}
                        className={`w-[12px] h-[12px] rounded-[2px] cursor-pointer transition-all ${
                          isFuture ? 'bg-stone-900/50' : getColor(intensity)
                        } ${hoveredDate === dateStr ? 'ring-1 ring-amber-300' : ''}`}
                        onMouseEnter={() => {
                          setHoveredDate(dateStr);
                          if (dayData) setSelectedDay(dayData);
                        }}
                        onMouseLeave={() => {
                          setHoveredDate(null);
                          setSelectedDay(null);
                        }}
                        onClick={() => {
                          if (dayData) setSelectedDay(dayData);
                        }}
                        whileHover={{ scale: 1.3 }}
                        title={`${formatDate(dateStr)}: ${dayData?.count || 0} check-ins`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-amber-400/50">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((intensity) => (
              <div
                key={intensity}
                className={`w-[12px] h-[12px] rounded-[2px] ${getColor(intensity)}`}
              />
            ))}
            <span>More</span>
          </div>
        </motion.div>

        {/* Selected Day Details */}
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-stone-800/40 rounded-xl p-4 border border-amber-500/30"
          >
            <div className="text-amber-300 font-medium mb-2">
              {formatDate(selectedDay.date)}
            </div>
            <div className="flex items-center gap-2 text-amber-100 mb-3">
              <GiCigarette className="text-amber-400" />
              <span className="text-lg font-bold">{selectedDay.count}</span>
              <span className="text-amber-200/60">check-in{selectedDay.count !== 1 ? 's' : ''}</span>
            </div>
            {selectedDay.brands.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedDay.brands.map((brand) => (
                  <Link
                    key={brand}
                    href={`/cigar/${encodeURIComponent(brand)}`}
                    className="px-3 py-1 bg-amber-900/30 rounded-full text-sm text-amber-200 hover:bg-amber-800/40 transition-colors"
                  >
                    {brand}
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Most Active Day */}
        {data?.stats?.mostActiveDay && data.stats.mostActiveCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-amber-900/30 to-amber-950/30 rounded-xl p-4 border border-amber-700/30"
          >
            <div className="flex items-center gap-2 text-amber-300 text-sm mb-2">
              <FiStar className="text-amber-400" />
              Your Best Day
            </div>
            <div className="text-amber-100">
              <span className="font-semibold">{formatDate(data.stats.mostActiveDay)}</span>
              <span className="text-amber-200/60"> — {data.stats.mostActiveCount} check-ins!</span>
            </div>
          </motion.div>
        )}

        {/* CTA for empty state */}
        {data && data.stats.totalCheckins === 0 && (
          <div className="text-center py-8">
            <GiCigarette className="mx-auto text-amber-400/30 mb-3" size={48} />
            <p className="text-amber-200/60">No smokes logged yet</p>
            <Link
              href="/dashboard"
              className="inline-block mt-4 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-medium transition-colors"
            >
              Log your first smoke!
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
