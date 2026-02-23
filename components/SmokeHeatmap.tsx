"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiCalendar, FiTrendingUp, FiZap } from "react-icons/fi";

interface HeatmapData {
  heatmap: Record<string, number>;
  stats: {
    currentStreak: number;
    longestStreak: number;
    totalSmokes: number;
    activeDays: number;
    avgPerActiveDay: number;
  };
}

interface SmokeHeatmapProps {
  username: string;
}

function getIntensityClass(count: number): string {
  if (count === 0) return "bg-white/5";
  if (count === 1) return "bg-amber-900/60";
  if (count === 2) return "bg-amber-700/70";
  if (count === 3) return "bg-amber-600/80";
  return "bg-amber-500"; // 4+
}

function getIntensityLabel(count: number): string {
  if (count === 0) return "No smokes";
  if (count === 1) return "1 smoke";
  return `${count} smokes`;
}

export default function SmokeHeatmap({ username }: SmokeHeatmapProps) {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  useEffect(() => {
    async function fetchHeatmap() {
      try {
        const res = await fetch(`/api/user/${encodeURIComponent(username)}/heatmap`);
        if (res.ok) {
          const result: HeatmapData = await res.json();
          setData(result);
        }
      } catch (err) {
        console.error("Failed to fetch heatmap:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHeatmap();
  }, [username]);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-4 mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded w-24 mb-3"></div>
          <div className="h-20 bg-white/5 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || Object.keys(data.heatmap).length === 0) {
    return null; // Don't show if no data
  }

  // Generate weeks for the past ~6 months (26 weeks)
  const weeks: { date: Date; dateStr: string; count: number }[][] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Start from 26 weeks ago, aligned to Sunday
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (26 * 7) - startDate.getDay());
  
  let currentWeek: { date: Date; dateStr: string; count: number }[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= today) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const count = data.heatmap[dateStr] || 0;
    
    currentWeek.push({
      date: new Date(currentDate),
      dateStr,
      count,
    });
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Month labels
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthLabels: { label: string; position: number }[] = [];
  let lastMonth = -1;
  
  weeks.forEach((week, weekIndex) => {
    const firstDayOfWeek = week[0]?.date;
    if (firstDayOfWeek) {
      const month = firstDayOfWeek.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ label: months[month], position: weekIndex });
        lastMonth = month;
      }
    }
  });

  const handleMouseEnter = (day: { date: Date; dateStr: string; count: number }, e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setHoveredDay({
      date: day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      count: day.count,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4 mb-6"
    >
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FiCalendar className="text-amber-500" size={14} />
          <span className="text-xs text-gray-400">Smoke Calendar</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {data.stats.currentStreak > 0 && (
            <div className="flex items-center gap-1 text-orange-400">
              <span>🔥</span>
              <span>{data.stats.currentStreak}d streak</span>
            </div>
          )}
          {data.stats.longestStreak > data.stats.currentStreak && (
            <div className="flex items-center gap-1 text-gray-500">
              <FiTrendingUp size={12} />
              <span>Best: {data.stats.longestStreak}d</span>
            </div>
          )}
        </div>
      </div>

      {/* Month labels */}
      <div className="relative mb-1 ml-3 h-3 overflow-hidden">
        {monthLabels.map((m, i) => (
          <span
            key={i}
            className="absolute text-[10px] text-gray-500"
            style={{ left: `${m.position * 11}px` }}
          >
            {m.label}
          </span>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-[2px] min-w-max">
          {/* Day labels */}
          <div className="flex flex-col gap-[2px] mr-1 text-[9px] text-gray-500">
            <span className="h-[10px]"></span>
            <span className="h-[10px] leading-[10px]">M</span>
            <span className="h-[10px]"></span>
            <span className="h-[10px] leading-[10px]">W</span>
            <span className="h-[10px]"></span>
            <span className="h-[10px] leading-[10px]">F</span>
            <span className="h-[10px]"></span>
          </div>
          
          {/* Weeks */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[2px]">
              {week.map((day, dayIndex) => (
                <div
                  key={day.dateStr}
                  className={`w-[10px] h-[10px] rounded-[2px] cursor-pointer transition-all hover:ring-1 hover:ring-white/40 ${getIntensityClass(day.count)}`}
                  onMouseEnter={(e) => handleMouseEnter(day, e)}
                  onMouseLeave={() => setHoveredDay(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <span>Less</span>
          <div className="w-[10px] h-[10px] rounded-[2px] bg-white/5"></div>
          <div className="w-[10px] h-[10px] rounded-[2px] bg-amber-900/60"></div>
          <div className="w-[10px] h-[10px] rounded-[2px] bg-amber-700/70"></div>
          <div className="w-[10px] h-[10px] rounded-[2px] bg-amber-600/80"></div>
          <div className="w-[10px] h-[10px] rounded-[2px] bg-amber-500"></div>
          <span>More</span>
        </div>
        <div className="text-[10px] text-gray-500">
          {data.stats.totalSmokes} smokes in {data.stats.activeDays} days
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 px-2 py-1 text-xs bg-gray-900 border border-white/20 rounded-lg shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{ left: hoveredDay.x, top: hoveredDay.y }}
        >
          <div className="font-medium text-white">{getIntensityLabel(hoveredDay.count)}</div>
          <div className="text-gray-400">{hoveredDay.date}</div>
        </div>
      )}
    </motion.div>
  );
}
