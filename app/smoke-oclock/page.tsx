"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FiHome, FiRefreshCw, FiClock, FiSun, FiMoon, FiCalendar } from "react-icons/fi";

interface HourData {
  hour: number;
  count: number;
  percentage: number;
}

interface SmokeOClockData {
  hourlyDistribution: HourData[];
  peakHour: number | null;
  peakHourCount: number;
  amCount: number;
  pmCount: number;
  amPercent: number;
  smokerType: string;
  smokerTypeEmoji: string;
  smokerTypeLabel: string;
  smokerTypeDescription: string;
  weekdayCount: number;
  weekendCount: number;
  favoriteDay: string | null;
  favoriteDayCount: number;
  earliestEver: { hour: number; minute: number; brand: string } | null;
  latestEver: { hour: number; minute: number; brand: string } | null;
  mostConsistentHour: number | null;
  platformPeakHour: number | null;
  youVsPlatform: 'earlier' | 'later' | 'same' | 'unknown';
  totalCheckins: number;
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function formatTime(hour: number, minute: number): string {
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const m = minute.toString().padStart(2, '0');
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${m} ${ampm}`;
}

function ClockVisualization({ hourlyData, peakHour }: { hourlyData: HourData[]; peakHour: number | null }) {
  const maxCount = Math.max(...hourlyData.map(h => h.count), 1);
  
  return (
    <div className="relative w-64 h-64 mx-auto">
      {/* Clock face */}
      <div className="absolute inset-0 rounded-full border-2 border-white/20 bg-gradient-to-br from-zinc-900/80 to-black/80" />
      
      {/* Hour markers and bars */}
      {hourlyData.map((data, i) => {
        const angle = (i * 15) - 90; // 15 degrees per hour, starting from 12 o'clock
        const radians = (angle * Math.PI) / 180;
        const barHeight = (data.count / maxCount) * 50; // Max 50px height
        const isPeak = i === peakHour;
        
        // Position for the bar (towards center from edge)
        const outerRadius = 115;
        const x = Math.cos(radians) * outerRadius;
        const y = Math.sin(radians) * outerRadius;
        
        return (
          <div key={i} className="absolute" style={{ 
            left: '50%', 
            top: '50%',
            transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${angle + 90}deg)`,
          }}>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: barHeight }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              className={`w-2 rounded-full origin-bottom ${
                isPeak 
                  ? 'bg-gradient-to-t from-amber-500 to-yellow-400 shadow-lg shadow-amber-500/50' 
                  : data.count > 0 
                    ? 'bg-gradient-to-t from-amber-500/60 to-orange-400/60' 
                    : 'bg-white/10'
              }`}
              style={{ 
                minHeight: data.count > 0 ? '4px' : '2px',
                transformOrigin: 'bottom center',
              }}
            />
            {/* Hour label */}
            {(i % 3 === 0) && (
              <div 
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-gray-500"
                style={{ transform: `translateX(-50%) rotate(${-(angle + 90)}deg)` }}
              >
                {formatHour(i)}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 flex items-center justify-center">
          <FiClock className="text-2xl text-amber-400" />
        </div>
      </div>
    </div>
  );
}

function AMPMGauge({ amPercent }: { amPercent: number }) {
  return (
    <div className="relative h-6 rounded-full overflow-hidden bg-white/5">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${amPercent}%` }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-400 rounded-l-full"
      />
      <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-medium">
        <span className="flex items-center gap-1">
          <FiSun className="text-amber-400" /> AM {amPercent}%
        </span>
        <span className="flex items-center gap-1">
          PM {100 - amPercent}% <FiMoon className="text-purple-400" />
        </span>
      </div>
    </div>
  );
}

export default function SmokeOClockPage() {
  const [data, setData] = useState<SmokeOClockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/smoke-oclock");
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch smoke o'clock data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black p-4 pb-20">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <Link href="/dashboard" className="glass p-2 rounded-xl hover:bg-white/10 transition-colors">
          <FiHome className="text-xl" />
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          🕐 Smoke O&apos;Clock
        </h1>
        <button 
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="glass p-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          <FiRefreshCw className={`text-xl ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">Analyzing your smoking patterns...</p>
        </div>
      ) : !data || data.totalCheckins === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <span className="text-5xl mb-4 block">🕐</span>
          <h2 className="text-xl font-bold mb-2">No Data Yet</h2>
          <p className="text-gray-400 mb-4">Log some smokes to see your timing patterns!</p>
          <Link
            href="/checkin"
            className="inline-block px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            🚬 Log a Smoke
          </Link>
        </div>
      ) : (
        <div className="space-y-6 max-w-md mx-auto">
          {/* Smoker Type Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 text-center bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/30"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl mb-3"
            >
              {data.smokerTypeEmoji}
            </motion.div>
            <h2 className="text-xl font-bold text-amber-400 mb-1">
              {data.smokerTypeLabel}
            </h2>
            <p className="text-sm text-gray-400">
              {data.smokerTypeDescription}
            </p>
          </motion.div>

          {/* Clock Visualization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold mb-4 text-center">Your Smoking Clock</h3>
            <ClockVisualization 
              hourlyData={data.hourlyDistribution} 
              peakHour={data.peakHour}
            />
            {data.peakHour !== null && (
              <div className="text-center mt-4">
                <p className="text-gray-400 text-sm">Peak hour</p>
                <p className="text-xl font-bold text-amber-400">
                  {formatHour(data.peakHour)}
                </p>
                <p className="text-xs text-gray-500">
                  {data.peakHourCount} smoke{data.peakHourCount !== 1 ? 's' : ''} at this hour
                </p>
              </div>
            )}
          </motion.div>

          {/* AM vs PM */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-5"
          >
            <h3 className="text-sm font-medium text-gray-400 mb-3">AM vs PM</h3>
            <AMPMGauge amPercent={data.amPercent} />
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">{data.amCount}</div>
                <div className="text-xs text-gray-500">Morning smokes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{data.pmCount}</div>
                <div className="text-xs text-gray-500">Evening smokes</div>
              </div>
            </div>
          </motion.div>

          {/* Day of Week */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-5"
          >
            <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <FiCalendar /> Weekday vs Weekend
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400">{data.weekdayCount}</div>
                <div className="text-xs text-gray-500">Weekday smokes</div>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-pink-400">{data.weekendCount}</div>
                <div className="text-xs text-gray-500">Weekend smokes</div>
              </div>
            </div>
            {data.favoriteDay && (
              <div className="text-center mt-4 text-sm">
                <span className="text-gray-400">Your favorite day: </span>
                <span className="text-white font-medium">{data.favoriteDay}</span>
                <span className="text-gray-500"> ({data.favoriteDayCount} smokes)</span>
              </div>
            )}
          </motion.div>

          {/* Fun Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-2xl p-5"
          >
            <h3 className="text-sm font-medium text-gray-400 mb-3">🎯 Fun Stats</h3>
            <div className="space-y-3">
              {data.earliestEver && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-2">
                    <span>🌅</span> Earliest smoke
                  </span>
                  <div className="text-right">
                    <span className="font-medium text-amber-400">
                      {formatTime(data.earliestEver.hour, data.earliestEver.minute)}
                    </span>
                    <span className="text-xs text-gray-500 block">{data.earliestEver.brand}</span>
                  </div>
                </div>
              )}
              {data.latestEver && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-2">
                    <span>🌙</span> Latest smoke
                  </span>
                  <div className="text-right">
                    <span className="font-medium text-purple-400">
                      {formatTime(data.latestEver.hour, data.latestEver.minute)}
                    </span>
                    <span className="text-xs text-gray-500 block">{data.latestEver.brand}</span>
                  </div>
                </div>
              )}
              {data.mostConsistentHour !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-2">
                    <span>⏰</span> Most consistent hour
                  </span>
                  <span className="font-medium text-green-400">
                    {formatHour(data.mostConsistentHour)}
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Platform Comparison */}
          {data.youVsPlatform !== 'unknown' && data.platformPeakHour !== null && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass rounded-2xl p-5 bg-gradient-to-br from-purple-900/10 to-pink-900/10"
            >
              <h3 className="text-sm font-medium text-gray-400 mb-3">📊 vs The Community</h3>
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-2">
                  Platform peak hour: <span className="text-white">{formatHour(data.platformPeakHour)}</span>
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5">
                  {data.youVsPlatform === 'earlier' && (
                    <>
                      <span className="text-amber-400">🌅</span>
                      <span className="text-sm">You smoke earlier than most!</span>
                    </>
                  )}
                  {data.youVsPlatform === 'later' && (
                    <>
                      <span className="text-purple-400">🦉</span>
                      <span className="text-sm">You smoke later than most!</span>
                    </>
                  )}
                  {data.youVsPlatform === 'same' && (
                    <>
                      <span className="text-green-400">✨</span>
                      <span className="text-sm">You&apos;re in sync with the community!</span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Total */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-sm text-gray-500"
          >
            Based on {data.totalCheckins} total smoke{data.totalCheckins !== 1 ? 's' : ''}
          </motion.div>
        </div>
      )}
    </div>
  );
}
