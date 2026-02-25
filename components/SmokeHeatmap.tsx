"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { FiCalendar, FiZap, FiTrendingUp, FiAward } from "react-icons/fi";

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

interface Props {
  username?: string;
}

export default function SmokeHeatmap({ username }: Props) {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);

  useEffect(() => {
    const url = username ? `/api/smoke-heatmap?username=${username}` : "/api/smoke-heatmap";
    fetch(url)
      .then(r => r.json() as Promise<HeatmapData & { error?: string }>)
      .then(d => {
        if (!d.error) setData(d);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [username]);

  // Generate calendar grid for last 52 weeks
  const calendarData = useMemo(() => {
    if (!data) return [];
    
    const dayMap = new Map(data.days.map(d => [d.date, d]));
    const weeks: (DayData | null)[][] = [];
    
    // Start from today and go back 52 weeks
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - endDate.getDay()); // Go to Sunday of current week
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (52 * 7) + 1); // 52 weeks back
    
    let currentDate = new Date(startDate);
    let currentWeek: (DayData | null)[] = [];
    
    // Pad first week if it doesn't start on Sunday
    const startDay = currentDate.getDay();
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(null);
    }
    
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = dayMap.get(dateStr) || { date: dateStr, count: 0, avgRating: null };
      currentWeek.push(dayData);
      
      if (currentDate.getDay() === 6) { // Saturday - end of week
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Add remaining days
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }
    
    return weeks;
  }, [data]);

  const getIntensity = (count: number): string => {
    if (count === 0) return "bg-gray-800/50";
    if (count === 1) return "bg-amber-900/60";
    if (count === 2) return "bg-amber-700/70";
    if (count === 3) return "bg-amber-500/80";
    return "bg-amber-400"; // 4+
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-4 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-24 bg-gray-700/50 rounded"></div>
      </div>
    );
  }

  if (!data) return null;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Calculate month labels based on weeks
  const monthLabels: { month: string; offset: number }[] = [];
  let lastMonth = -1;
  calendarData.forEach((week, weekIndex) => {
    const firstDayOfWeek = week.find(d => d !== null);
    if (firstDayOfWeek) {
      const month = new Date(firstDayOfWeek.date).getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ month: months[month], offset: weekIndex });
        lastMonth = month;
      }
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FiCalendar className="text-amber-400" />
          <span className="font-semibold text-white">Smoke Calendar</span>
        </div>
        <div className="text-xs text-gray-400">
          {data.stats.totalCheckins} smokes in {data.stats.totalDays} days
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-amber-500/10 rounded-lg p-2 text-center">
          <div className="text-amber-400 text-lg font-bold">{data.stats.currentStreak}</div>
          <div className="text-gray-400 text-xs">Current</div>
        </div>
        <div className="bg-orange-500/10 rounded-lg p-2 text-center">
          <div className="text-orange-400 text-lg font-bold">{data.stats.maxStreak}</div>
          <div className="text-gray-400 text-xs">Best Streak</div>
        </div>
        <div className="bg-green-500/10 rounded-lg p-2 text-center">
          <div className="text-green-400 text-lg font-bold">{data.stats.avgPerActiveDay}</div>
          <div className="text-gray-400 text-xs">Avg/Day</div>
        </div>
        <div className="bg-purple-500/10 rounded-lg p-2 text-center">
          <div className="text-purple-400 text-lg font-bold">{data.stats.busiestDayCount}</div>
          <div className="text-gray-400 text-xs">Max Day</div>
        </div>
      </div>

      {/* Month Labels */}
      <div className="flex mb-1 text-xs text-gray-500 pl-6 overflow-hidden">
        {monthLabels.map((m, i) => (
          <div 
            key={i} 
            className="absolute"
            style={{ marginLeft: `${m.offset * 11 + 24}px` }}
          >
            {m.month}
          </div>
        ))}
      </div>

      {/* Heatmap Grid */}
      <div className="flex gap-0.5 overflow-x-auto pb-2 relative">
        {/* Day Labels */}
        <div className="flex flex-col gap-0.5 mr-1 text-xs text-gray-500 justify-around">
          <span>Mon</span>
          <span></span>
          <span>Wed</span>
          <span></span>
          <span>Fri</span>
          <span></span>
          <span></span>
        </div>
        
        {/* Weeks */}
        <div className="flex gap-0.5">
          {calendarData.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-0.5">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`w-2.5 h-2.5 rounded-sm ${day ? getIntensity(day.count) : 'bg-transparent'} transition-all cursor-pointer hover:ring-1 hover:ring-amber-400`}
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
        <div className="mt-2 p-2 bg-gray-800 rounded-lg text-sm">
          <div className="text-white font-medium">{formatDate(hoveredDay.date)}</div>
          <div className="text-gray-400">
            {hoveredDay.count === 0 ? (
              "No smokes"
            ) : (
              <>
                {hoveredDay.count} smoke{hoveredDay.count !== 1 ? 's' : ''}
                {hoveredDay.avgRating && ` • Avg: ${hoveredDay.avgRating}★`}
              </>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2 text-xs text-gray-400">
        <span>Less</span>
        <div className="w-2.5 h-2.5 rounded-sm bg-gray-800/50"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-amber-900/60"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-amber-700/70"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-amber-500/80"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-amber-400"></div>
        <span>More</span>
      </div>
    </motion.div>
  );
}
