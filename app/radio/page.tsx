"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  FiHome, FiRefreshCw, FiRadio, FiMusic, FiDisc, 
  FiVolume2, FiUsers, FiTrendingUp, FiClock, FiPlay,
  FiSkipForward, FiStar
} from "react-icons/fi";

interface RadioTrack {
  id: string;
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  review?: string;
  imageUrl?: string;
  checkedAt: number;
  timeAgo: string;
  isLive: boolean;
  trackTitle: string;
  artistName: string;
}

interface RadioStats {
  listenersToday: number;
  tracksPlayedToday: number;
  topGenre: string;
  stationVibe: string;
  peakHour: number;
}

interface RadioData {
  nowPlaying: RadioTrack | null;
  upNext: RadioTrack[];
  recentlyPlayed: RadioTrack[];
  stats: RadioStats;
  djMessage: string;
  stationName: string;
  currentHour: number;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export default function RadioPage() {
  const router = useRouter();
  const [data, setData] = useState<RadioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visualizerBars, setVisualizerBars] = useState<number[]>([]);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/radio");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const result = await res.json() as RadioData;
      setData(result);
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Animated visualizer
  useEffect(() => {
    const interval = setInterval(() => {
      setVisualizerBars(Array.from({ length: 12 }, () => Math.random() * 100));
    }, 150);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-violet-950 to-fuchsia-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-violet-950 to-fuchsia-900 flex items-center justify-center text-white">
        <p>Failed to load radio</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-violet-950 to-fuchsia-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition">
            <FiHome className="w-5 h-5" />
          </Link>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <FiRadio className="w-5 h-5 text-fuchsia-400" />
              <h1 className="text-xl font-bold">{data.stationName}</h1>
            </div>
            <p className="text-sm text-purple-300">{data.stats.stationVibe}</p>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 hover:bg-white/10 rounded-lg transition disabled:opacity-50"
          >
            <FiRefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Audio Visualizer */}
        <motion.div 
          className="flex items-end justify-center gap-1 h-16 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {visualizerBars.map((height, i) => (
            <motion.div
              key={i}
              className="w-2 bg-gradient-to-t from-fuchsia-500 to-purple-400 rounded-t"
              animate={{ height: `${Math.max(10, height * 0.6)}%` }}
              transition={{ duration: 0.1 }}
            />
          ))}
        </motion.div>

        {/* DJ Message */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-xl p-4 mb-6 border border-purple-500/20"
        >
          <p className="text-sm text-purple-200 italic">
            🎙️ &quot;{data.djMessage}&quot;
          </p>
        </motion.div>

        {/* Now Playing */}
        {data.nowPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-fuchsia-600/30 to-purple-600/30 rounded-2xl p-6 mb-6 border border-fuchsia-500/30"
          >
            <div className="flex items-center gap-2 mb-4">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-3 h-3 bg-red-500 rounded-full"
              />
              <span className="text-sm font-medium text-fuchsia-300">
                {data.nowPlaying.isLive ? "LIVE NOW" : "NOW PLAYING"}
              </span>
            </div>

            <div className="flex items-start gap-4">
              {/* Album Art / Spinning Disc */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/30 flex-shrink-0"
              >
                {data.nowPlaying.imageUrl ? (
                  <img 
                    src={data.nowPlaying.imageUrl} 
                    alt="" 
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <FiDisc className="w-8 h-8 text-white" />
                )}
              </motion.div>

              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold truncate">{data.nowPlaying.trackTitle}</h2>
                <p className="text-fuchsia-300">
                  <Link 
                    href={`/profile/${data.nowPlaying.username}`}
                    className="hover:underline"
                  >
                    {data.nowPlaying.artistName}
                  </Link>
                </p>
                <p className="text-sm text-purple-300 mt-1">
                  {data.nowPlaying.brand}
                  {data.nowPlaying.product && ` • ${data.nowPlaying.product}`}
                </p>
                {data.nowPlaying.rating && (
                  <div className="flex items-center gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <FiStar 
                        key={i} 
                        className={`w-4 h-4 ${i < data.nowPlaying!.rating! ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`}
                      />
                    ))}
                  </div>
                )}
                {data.nowPlaying.review && (
                  <p className="text-sm text-purple-200 mt-2 line-clamp-2 italic">
                    &quot;{data.nowPlaying.review}&quot;
                  </p>
                )}
              </div>
            </div>
            
            <p className="text-xs text-purple-400 mt-4 text-right">
              {data.nowPlaying.timeAgo}
            </p>
          </motion.div>
        )}

        {/* Up Next */}
        {data.upNext.length > 0 && (
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
              <FiSkipForward className="w-5 h-5 text-purple-400" />
              Up Next
            </h3>
            <div className="space-y-2">
              {data.upNext.map((track, i) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/5 rounded-xl p-3 flex items-center gap-3 border border-purple-500/10"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-600/30 flex items-center justify-center flex-shrink-0">
                    {track.imageUrl ? (
                      <img src={track.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <FiMusic className="w-4 h-4 text-purple-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{track.trackTitle}</p>
                    <p className="text-sm text-purple-300 truncate">{track.artistName}</p>
                  </div>
                  <span className="text-xs text-purple-400">{track.timeAgo}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Station Stats */}
        <div className="bg-white/5 rounded-xl p-4 mb-6 border border-purple-500/20">
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
            <FiTrendingUp className="w-5 h-5 text-fuchsia-400" />
            Station Stats
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-fuchsia-400">{data.stats.listenersToday}</p>
              <p className="text-xs text-purple-300">Listeners Today</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">{data.stats.tracksPlayedToday}</p>
              <p className="text-xs text-purple-300">Tracks Played</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-fuchsia-300">{data.stats.topGenre}</p>
              <p className="text-xs text-purple-300">Station Genre</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-purple-300">{formatHour(data.stats.peakHour)}</p>
              <p className="text-xs text-purple-300">Peak Hour</p>
            </div>
          </div>
        </div>

        {/* Recently Played */}
        {data.recentlyPlayed.length > 0 && (
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
              <FiClock className="w-5 h-5 text-purple-400" />
              Recently Played
            </h3>
            <div className="space-y-2">
              {data.recentlyPlayed.map((track, i) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/5 rounded-lg p-3 flex items-center gap-3"
                >
                  <FiPlay className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{track.trackTitle}</p>
                    <p className="text-xs text-purple-300">{track.artistName}</p>
                  </div>
                  <span className="text-xs text-purple-400">{track.timeAgo}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!data.nowPlaying && data.upNext.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <FiRadio className="w-16 h-16 mx-auto text-purple-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">Station Quiet</h3>
            <p className="text-purple-300 mb-4">No one&apos;s smoking right now. Be the first!</p>
            <Link
              href="/checkin"
              className="inline-flex items-center gap-2 px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-full font-medium transition"
            >
              <FiMusic className="w-5 h-5" />
              Drop a Track
            </Link>
          </motion.div>
        )}

        {/* Footer Links */}
        <div className="flex justify-center gap-4 mt-8">
          <Link
            href="/checkin"
            className="flex items-center gap-2 px-4 py-2 bg-fuchsia-600/30 hover:bg-fuchsia-600/50 rounded-full text-sm transition"
          >
            <FiMusic className="w-4 h-4" />
            Add Track
          </Link>
          <Link
            href="/discover"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 rounded-full text-sm transition"
          >
            <FiUsers className="w-4 h-4" />
            Discover
          </Link>
        </div>
      </div>
    </div>
  );
}
