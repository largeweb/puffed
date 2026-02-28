"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FiCloud, FiSun, FiWind, FiDroplet, FiActivity, 
  FiAlertTriangle, FiUsers, FiArrowLeft, FiTrendingUp,
  FiClock, FiThermometer
} from "react-icons/fi";

interface WeekendWeather {
  isWeekend: boolean;
  hoursRemaining: number;
  currentCondition: string;
  currentEmoji: string;
  currentTemp: number;
  currentDescription: string;
  forecast: {
    period: string;
    condition: string;
    emoji: string;
    prediction: string;
  }[];
  windDirection: string;
  windSpeed: string;
  trendingBrands: { brand: string; velocity: number }[];
  humidity: number;
  socialActivity: string;
  pressure: string;
  activityLevel: string;
  activeSmokers: number;
  recentSmokers: string[];
  weekendStats: {
    totalCheckins: number;
    totalSmokers: number;
    peakHour: number;
    avgRating: number;
  };
  alerts: {
    type: string;
    emoji: string;
    message: string;
  }[];
}

function formatHour(hour: number): string {
  const ampm = hour < 12 ? "AM" : "PM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${ampm}`;
}

export default function WeekendWeatherPage() {
  const [weather, setWeather] = useState<WeekendWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadWeather();
    
    // Update time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  async function loadWeather() {
    try {
      const res = await fetch("/api/weekend-weather");
      const data = await res.json();
      setWeather(data);
    } catch (error) {
      console.error("Failed to load weather:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-900 via-blue-900 to-indigo-950 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading weather data...</div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-900 via-blue-900 to-indigo-950 flex items-center justify-center">
        <div className="text-white text-xl">Weather data unavailable</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-900 via-blue-900 to-indigo-950">
      {/* Animated clouds background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: ["0%", "100%"] }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 left-0 w-32 h-12 bg-white/5 rounded-full blur-xl"
        />
        <motion.div
          animate={{ x: ["0%", "100%"] }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear", delay: 10 }}
          className="absolute top-40 left-0 w-48 h-16 bg-white/3 rounded-full blur-2xl"
        />
        <motion.div
          animate={{ x: ["0%", "100%"] }}
          transition={{ duration: 150, repeat: Infinity, ease: "linear", delay: 30 }}
          className="absolute top-60 left-0 w-40 h-14 bg-white/4 rounded-full blur-xl"
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard" className="text-sky-300 hover:text-sky-200 flex items-center gap-2">
            <FiArrowLeft /> Dashboard
          </Link>
          <div className="text-sky-300 text-sm">
            {currentTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </div>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            🌤️ Weekend Weather Report
          </h1>
          <p className="text-sky-300">
            {weather.isWeekend 
              ? `${weather.hoursRemaining} hours of weekend remaining`
              : "Check back during the weekend!"}
          </p>
        </motion.div>

        {/* Current Conditions - Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-sky-800/60 to-blue-900/60 rounded-3xl p-8 border border-sky-500/30 mb-6 text-center"
        >
          <div className="text-6xl mb-4">{weather.currentEmoji}</div>
          <h2 className="text-2xl font-bold text-white mb-2">{weather.currentCondition}</h2>
          <p className="text-sky-200 mb-4">{weather.currentDescription}</p>
          
          {/* Temperature gauge */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <FiThermometer className="text-orange-400" size={24} />
            <div className="w-48 h-4 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${weather.currentTemp}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(to right, 
                    ${weather.currentTemp < 40 ? "#60a5fa" : 
                      weather.currentTemp < 60 ? "#34d399" :
                      weather.currentTemp < 80 ? "#fbbf24" : "#ef4444"}
                    , ${weather.currentTemp < 40 ? "#3b82f6" : 
                      weather.currentTemp < 60 ? "#10b981" :
                      weather.currentTemp < 80 ? "#f59e0b" : "#dc2626"})`
                }}
              />
            </div>
            <span className="text-white font-bold">{weather.currentTemp}°</span>
          </div>
          <p className="text-sky-300 text-sm">Activity Temperature</p>
        </motion.div>

        {/* Weather Alerts */}
        {weather.alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3 mb-6"
          >
            {weather.alerts.map((alert, idx) => (
              <div 
                key={idx}
                className="bg-amber-500/20 border border-amber-500/40 rounded-xl p-4 flex items-center gap-3"
              >
                <span className="text-2xl">{alert.emoji}</span>
                <div>
                  <div className="text-amber-300 text-xs font-bold uppercase">{alert.type}</div>
                  <div className="text-white">{alert.message}</div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Weather Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Wind (Trending) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-900/60 rounded-2xl p-5 border border-sky-800/50"
          >
            <div className="flex items-center gap-2 text-sky-400 mb-3">
              <FiWind size={20} />
              <span className="font-semibold">Wind</span>
            </div>
            <div className="text-white font-bold mb-1">{weather.windDirection}</div>
            <div className="text-sky-300 text-sm">{weather.windSpeed}</div>
            {weather.trendingBrands.length > 1 && (
              <div className="mt-3 space-y-1">
                {weather.trendingBrands.slice(1).map((brand) => (
                  <div key={brand.brand} className="text-sky-400 text-xs flex items-center gap-1">
                    <FiTrendingUp size={12} />
                    {brand.brand} ({brand.velocity})
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Humidity (Social) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-900/60 rounded-2xl p-5 border border-sky-800/50"
          >
            <div className="flex items-center gap-2 text-cyan-400 mb-3">
              <FiDroplet size={20} />
              <span className="font-semibold">Humidity</span>
            </div>
            <div className="text-white font-bold mb-1">{weather.humidity}%</div>
            <div className="text-cyan-300 text-sm">{weather.socialActivity}</div>
          </motion.div>

          {/* Pressure (Activity) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-900/60 rounded-2xl p-5 border border-sky-800/50"
          >
            <div className="flex items-center gap-2 text-purple-400 mb-3">
              <FiActivity size={20} />
              <span className="font-semibold">Pressure</span>
            </div>
            <div className="text-white font-bold mb-1">{weather.pressure}</div>
            <div className="text-purple-300 text-sm">{weather.activityLevel}</div>
          </motion.div>

          {/* Active Now */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-900/60 rounded-2xl p-5 border border-sky-800/50"
          >
            <div className="flex items-center gap-2 text-green-400 mb-3">
              <FiUsers size={20} />
              <span className="font-semibold">Active Now</span>
            </div>
            <div className="text-white font-bold mb-1">
              {weather.activeSmokers} {weather.activeSmokers === 1 ? "smoker" : "smokers"}
            </div>
            {weather.recentSmokers.length > 0 ? (
              <div className="text-green-300 text-sm truncate">
                {weather.recentSmokers.join(", ")}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">No recent activity</div>
            )}
          </motion.div>
        </div>

        {/* Forecast */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-900/60 rounded-2xl p-5 border border-sky-800/50 mb-6"
        >
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <FiClock className="text-sky-400" />
            Forecast
          </h3>
          <div className="space-y-4">
            {weather.forecast.map((f, idx) => (
              <div key={idx} className="flex items-start gap-4 p-3 bg-sky-900/30 rounded-xl">
                <div className="text-3xl">{f.emoji}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white">{f.period}</span>
                    <span className="text-sky-300 text-sm">{f.condition}</span>
                  </div>
                  <p className="text-sky-200 text-sm">{f.prediction}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Weekend Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-indigo-900/60 to-purple-900/60 rounded-2xl p-5 border border-purple-500/30 mb-6"
        >
          <h3 className="font-bold text-white mb-4">📊 Weekend Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{weather.weekendStats.totalCheckins}</div>
              <div className="text-purple-300 text-sm">Total Check-ins</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{weather.weekendStats.totalSmokers}</div>
              <div className="text-purple-300 text-sm">Active Smokers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {weather.weekendStats.avgRating > 0 
                  ? weather.weekendStats.avgRating.toFixed(1) + "⭐"
                  : "N/A"}
              </div>
              <div className="text-purple-300 text-sm">Avg Rating</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {formatHour(weather.weekendStats.peakHour)}
              </div>
              <div className="text-purple-300 text-sm">Peak Hour</div>
            </div>
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap gap-3 justify-center"
        >
          <Link
            href="/weekend-scoreboard"
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-full text-sm font-medium transition-colors"
          >
            🏆 Scoreboard
          </Link>
          <Link
            href="/pledges"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-sm font-medium transition-colors"
          >
            🎯 Pledges
          </Link>
          <Link
            href="/saturday-cartoons"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-full text-sm font-medium transition-colors"
          >
            📺 Cartoons
          </Link>
          <Link
            href="/live"
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-full text-sm font-medium transition-colors"
          >
            🔴 Live
          </Link>
        </motion.div>

        {/* Footer */}
        <div className="text-center mt-8 text-sky-400/60 text-sm">
          Weather updates every visit • Powered by Puff Data
        </div>
      </div>
    </div>
  );
}
