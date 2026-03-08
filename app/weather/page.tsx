"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileSidebar from "@/app/components/MobileSidebar";
import { useSidebar } from "@/hooks/useSidebar";
import {
  FiArrowLeft,
  FiCloud,
  FiSun,
  FiMenu,
  FiDroplet,
  FiWind,
  FiThermometer,
  FiRefreshCw,
  FiMapPin,
  FiClock,
  FiSearch,
} from "react-icons/fi";

interface WeatherData {
  temp_f: number;
  temp_c: number;
  condition: string;
  humidity: number;
  wind_mph: number;
  feels_like_f: number;
  is_day: boolean;
  location: string;
}

interface SmokingCondition {
  score: number;
  rating: "perfect" | "great" | "good" | "fair" | "poor" | "indoor";
  label: string;
  suggestion: string;
  emoji: string;
}

interface CigarSuggestion {
  type: string;
  strength: string;
  reason: string;
  examples: string[];
}

interface ForecastItem {
  time: string;
  temp_f: number;
  condition: string;
  rain_chance: number;
}

interface SmokeWeatherData {
  weather: WeatherData;
  smoking: SmokingCondition;
  suggestion: CigarSuggestion;
  forecast: ForecastItem[];
  error?: string;
}

const RATING_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  perfect: { bg: "from-emerald-500/20 to-green-600/20", text: "text-emerald-400", border: "border-emerald-500/30" },
  great: { bg: "from-green-500/20 to-teal-600/20", text: "text-green-400", border: "border-green-500/30" },
  good: { bg: "from-cyan-500/20 to-blue-600/20", text: "text-cyan-400", border: "border-cyan-500/30" },
  fair: { bg: "from-yellow-500/20 to-amber-600/20", text: "text-yellow-400", border: "border-yellow-500/30" },
  poor: { bg: "from-orange-500/20 to-red-600/20", text: "text-orange-400", border: "border-orange-500/30" },
  indoor: { bg: "from-gray-500/20 to-slate-600/20", text: "text-gray-400", border: "border-gray-500/30" },
};

function getWeatherIcon(condition: string, isDay: boolean): string {
  const c = condition.toLowerCase();
  if (c.includes("sun") || c.includes("clear")) return isDay ? "☀️" : "🌙";
  if (c.includes("cloud") && c.includes("part")) return isDay ? "⛅" : "☁️";
  if (c.includes("cloud") || c.includes("overcast")) return "☁️";
  if (c.includes("rain") || c.includes("shower")) return "🌧️";
  if (c.includes("thunder") || c.includes("storm")) return "⛈️";
  if (c.includes("snow")) return "❄️";
  if (c.includes("fog") || c.includes("mist")) return "🌫️";
  if (c.includes("wind")) return "💨";
  return isDay ? "🌤️" : "🌙";
}

export default function SmokeWeatherPage() {
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen, currentUser, unreadCount, handleLogout } = useSidebar();
  const [data, setData] = useState<SmokeWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const fetchWeather = async (loc?: string) => {
    try {
      const url = loc 
        ? `/api/smoke-weather?location=${encodeURIComponent(loc)}`
        : "/api/smoke-weather";
      const res = await fetch(url);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json: SmokeWeatherData = await res.json();
      setData(json);
      setLocation(json.weather.location);
    } catch (error) {
      console.error("Failed to load weather:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWeather(location);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setLoading(true);
      setSearchOpen(false);
      fetchWeather(searchInput.trim());
    }
  };

  const ratingColors = data?.smoking ? RATING_COLORS[data.smoking.rating] : RATING_COLORS.good;

  return (
    <>
      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        username={currentUser}
        unreadCount={unreadCount}
        onLogout={handleLogout}
      />
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-950 to-gray-900">
      {/* Header */}
      <header className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <FiMenu size={20} />
            <span>Menu</span>
          </button>
          <h1 className="text-lg font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            🌤️ Smoke Weather
          </h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={refreshing ? "animate-spin" : ""} size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <FiCloud className="text-5xl text-cyan-500" />
            </motion.div>
          </div>
        ) : data ? (
          <div className="space-y-5">
            {/* Location Bar */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-3"
            >
              {searchOpen ? (
                <form onSubmit={handleSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Enter city name..."
                    autoFocus
                    className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-500 rounded-lg text-white font-medium hover:bg-cyan-600 transition-colors"
                  >
                    Go
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchOpen(false)}
                    className="px-3 py-2 bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => {
                    setSearchInput(location);
                    setSearchOpen(true);
                  }}
                  className="w-full flex items-center justify-between text-left hover:bg-white/5 rounded-lg p-1 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FiMapPin className="text-cyan-400" />
                    <span className="font-medium">{data.weather.location}</span>
                  </div>
                  <FiSearch className="text-gray-500" size={16} />
                </button>
              )}
            </motion.div>

            {/* Main Weather Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative rounded-2xl p-6 border bg-gradient-to-br ${ratingColors.bg} ${ratingColors.border} overflow-hidden`}
            >
              {/* Weather Display */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-6xl mb-2">
                    {getWeatherIcon(data.weather.condition, data.weather.is_day)}
                  </div>
                  <p className="text-gray-400">{data.weather.condition}</p>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold text-white">
                    {data.weather.temp_f}°
                  </div>
                  <p className="text-gray-400 text-sm">
                    Feels like {data.weather.feels_like_f}°F
                  </p>
                </div>
              </div>

              {/* Weather Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <FiDroplet className="mx-auto text-blue-400 mb-1" />
                  <p className="text-lg font-semibold text-white">{data.weather.humidity}%</p>
                  <p className="text-xs text-gray-500">Humidity</p>
                </div>
                <div className="text-center">
                  <FiWind className="mx-auto text-gray-400 mb-1" />
                  <p className="text-lg font-semibold text-white">{data.weather.wind_mph} mph</p>
                  <p className="text-xs text-gray-500">Wind</p>
                </div>
                <div className="text-center">
                  <FiThermometer className="mx-auto text-orange-400 mb-1" />
                  <p className="text-lg font-semibold text-white">{data.weather.temp_c}°C</p>
                  <p className="text-xs text-gray-500">Celsius</p>
                </div>
              </div>

              {/* Smoking Score */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400">Outdoor Smoking Score</span>
                  <span className={`text-2xl font-bold ${ratingColors.text}`}>
                    {data.smoking.score}/100
                  </span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${data.smoking.score}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      data.smoking.score >= 70 ? "bg-gradient-to-r from-green-500 to-emerald-500" :
                      data.smoking.score >= 50 ? "bg-gradient-to-r from-yellow-500 to-amber-500" :
                      "bg-gradient-to-r from-orange-500 to-red-500"
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{data.smoking.emoji}</span>
                  <div>
                    <p className={`font-semibold ${ratingColors.text}`}>
                      {data.smoking.label}
                    </p>
                    <p className="text-sm text-gray-400">{data.smoking.suggestion}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Cigar Suggestion */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-5"
            >
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                🚬 Weather-Matched Cigar
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Style</span>
                  <span className="text-white font-medium">{data.suggestion.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Strength</span>
                  <span className="text-amber-400 font-medium">{data.suggestion.strength}</span>
                </div>
                <p className="text-sm text-gray-500 italic">&quot;{data.suggestion.reason}&quot;</p>
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-gray-500 mb-2">Try these:</p>
                  <div className="flex flex-wrap gap-2">
                    {data.suggestion.examples.map((cigar, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-sm"
                      >
                        {cigar}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Forecast */}
            {data.forecast.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-2xl p-5"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FiClock className="text-gray-400" />
                  Later Today
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {data.forecast.map((hour, i) => (
                    <div key={i} className="text-center p-3 bg-white/5 rounded-xl">
                      <p className="text-sm text-gray-400 mb-1">{hour.time}</p>
                      <p className="text-2xl mb-1">{getWeatherIcon(hour.condition, true)}</p>
                      <p className="font-semibold text-white">{hour.temp_f}°</p>
                      {hour.rain_chance > 20 && (
                        <p className="text-xs text-blue-400 mt-1">
                          💧 {hour.rain_chance}%
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 gap-3"
            >
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl text-amber-400 font-medium hover:bg-amber-500/30 transition-colors"
              >
                🚬 Log a Smoke
              </Link>
              <Link
                href="/smoke-spots"
                className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl text-cyan-400 font-medium hover:bg-cyan-500/30 transition-colors"
              >
                📍 Find Spots
              </Link>
            </motion.div>

            {/* Tips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center text-sm text-gray-600"
            >
              <p>💡 Ideal smoking: 60-80°F, low wind, no rain</p>
            </motion.div>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">
            <FiCloud className="mx-auto text-5xl text-gray-600 mb-4" />
            <p>Failed to load weather data</p>
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </main>
    </div>
    </>
  );
}
