"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiCalendar, FiTrendingUp, FiAward, FiZap } from "react-icons/fi";
import type { SmokeCalendarResponse, SmokeCalendarDay } from "@/app/api/smoke-calendar/route";

// Get intensity level for a day (0-4)
function getIntensity(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

// Get color class based on intensity
function getColorClass(intensity: number): string {
  switch (intensity) {
    case 0: return "bg-gray-800/50 hover:bg-gray-700/50";
    case 1: return "bg-amber-900/60 hover:bg-amber-800/60";
    case 2: return "bg-amber-700/70 hover:bg-amber-600/70";
    case 3: return "bg-amber-500/80 hover:bg-amber-400/80";
    case 4: return "bg-amber-400 hover:bg-amber-300";
    default: return "bg-gray-800/50";
  }
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Calendar Cell Component
function CalendarCell({ 
  date, 
  dayData, 
  onHover 
}: { 
  date: string; 
  dayData: SmokeCalendarDay | null; 
  onHover: (data: { date: string; count: number; brands: string[] } | null) => void;
}) {
  const count = dayData?.count || 0;
  const intensity = getIntensity(count);
  
  return (
    <div
      className={`w-3 h-3 rounded-sm cursor-pointer transition-all ${getColorClass(intensity)}`}
      onMouseEnter={() => onHover(dayData ? { 
        date, 
        count: dayData.count, 
        brands: dayData.brands 
      } : { date, count: 0, brands: [] })}
      onMouseLeave={() => onHover(null)}
    />
  );
}

export default function CalendarPage() {
  const [data, setData] = useState<SmokeCalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number; brands: string[] } | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadCalendar() {
      try {
        const res = await fetch("/api/smoke-calendar?days=365");
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const json: SmokeCalendarResponse = await res.json();
        setData(json);
      } catch (error) {
        console.error("Load error:", error);
      } finally {
        setLoading(false);
      }
    }
    loadCalendar();
  }, [router]);

  // Build calendar grid (past 365 days, organized by week)
  const calendarGrid = useMemo(() => {
    if (!data) return [];

    // Create a map of date -> day data
    const dayMap = new Map<string, SmokeCalendarDay>();
    for (const day of data.days) {
      dayMap.set(day.date, day);
    }

    // Generate 52 weeks of data (plus partial week at start)
    const weeks: { date: string; dayData: SmokeCalendarDay | null }[][] = [];
    const today = new Date();
    
    // Start from 364 days ago (52 weeks)
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    
    // Adjust to start on Sunday
    while (startDate.getDay() !== 0) {
      startDate.setDate(startDate.getDate() - 1);
    }

    let currentWeek: { date: string; dayData: SmokeCalendarDay | null }[] = [];
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 1);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      currentWeek.push({
        date: dateStr,
        dayData: dayMap.get(dateStr) || null,
      });

      if (d.getDay() === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [data]);

  // Month labels
  const monthLabels = useMemo(() => {
    if (calendarGrid.length === 0) return [];
    
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    
    calendarGrid.forEach((week, weekIndex) => {
      const firstDay = week[0]?.date;
      if (firstDay) {
        const month = new Date(firstDay + 'T12:00:00').getMonth();
        if (month !== lastMonth) {
          const monthName = new Date(firstDay + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' });
          labels.push({ label: monthName, weekIndex });
          lastMonth = month;
        }
      }
    });
    
    return labels;
  }, [calendarGrid]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full"
        />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Failed to load calendar data</p>
      </main>
    );
  }

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  return (
    <main className="min-h-screen p-4 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="p-2 rounded-lg glass hover:bg-white/10">
            <FiArrowLeft />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FiCalendar className="text-amber-500" />
              Smoke Calendar
            </h1>
            <p className="text-gray-400 text-sm">Your smoking journey over the past year</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-xl p-4 text-center"
          >
            <div className="text-3xl font-bold text-amber-500">{data.totalSmokes}</div>
            <div className="text-sm text-gray-400">Total Smokes</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="glass rounded-xl p-4 text-center"
          >
            <div className="text-3xl font-bold text-green-500">{data.totalDays}</div>
            <div className="text-sm text-gray-400">Active Days</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-xl p-4 text-center"
          >
            <div className="text-3xl font-bold text-orange-500 flex items-center justify-center gap-1">
              {data.currentStreak}
              <FiZap className="text-lg" />
            </div>
            <div className="text-sm text-gray-400">Current Streak</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="glass rounded-xl p-4 text-center"
          >
            <div className="text-3xl font-bold text-purple-500 flex items-center justify-center gap-1">
              {data.longestStreak}
              <FiAward className="text-lg" />
            </div>
            <div className="text-sm text-gray-400">Best Streak</div>
          </motion.div>
        </div>

        {/* Most Productive Day */}
        {data.mostProductiveDay && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-xl p-4 mb-6 flex items-center gap-3"
          >
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <FiTrendingUp className="text-amber-500" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Most Active Day</div>
              <div className="font-semibold">{data.mostProductiveDay}s</div>
            </div>
          </motion.div>
        )}

        {/* Hover Tooltip */}
        {hoveredDay && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4 mb-4 border border-amber-500/30"
          >
            <div className="font-semibold text-amber-500">{formatDate(hoveredDay.date)}</div>
            <div className="text-gray-300">
              {hoveredDay.count === 0 
                ? "No smokes logged" 
                : `${hoveredDay.count} smoke${hoveredDay.count > 1 ? 's' : ''}`}
            </div>
            {hoveredDay.brands.length > 0 && (
              <div className="text-sm text-gray-400 mt-1">
                {hoveredDay.brands.join(', ')}
              </div>
            )}
          </motion.div>
        )}

        {/* Calendar Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass rounded-2xl p-4 overflow-x-auto"
        >
          {/* Month Labels */}
          <div className="flex mb-2 ml-8">
            {monthLabels.map((month, i) => (
              <div
                key={i}
                className="text-xs text-gray-500"
                style={{ 
                  position: 'relative',
                  left: `${month.weekIndex * 16 - (i > 0 ? monthLabels.slice(0, i).reduce((sum, m, idx) => sum + m.label.length * 6, 0) : 0)}px`,
                  marginRight: '4px'
                }}
              >
                {month.label}
              </div>
            ))}
          </div>

          {/* Grid with day labels */}
          <div className="flex">
            {/* Day labels */}
            <div className="flex flex-col gap-1 mr-2 pt-0.5">
              {dayLabels.map((label, i) => (
                <div key={i} className="h-3 text-xs text-gray-500 flex items-center">
                  {label}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="flex gap-1">
              {calendarGrid.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => (
                    <CalendarCell
                      key={day.date}
                      date={day.date}
                      dayData={day.dayData}
                      onHover={setHoveredDay}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-500">
            <span>Less</span>
            <div className={`w-3 h-3 rounded-sm ${getColorClass(0)}`} />
            <div className={`w-3 h-3 rounded-sm ${getColorClass(1)}`} />
            <div className={`w-3 h-3 rounded-sm ${getColorClass(2)}`} />
            <div className={`w-3 h-3 rounded-sm ${getColorClass(3)}`} />
            <div className={`w-3 h-3 rounded-sm ${getColorClass(4)}`} />
            <span>More</span>
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-semibold hover:from-amber-400 hover:to-orange-400 transition-all"
          >
            Log a Smoke →
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
