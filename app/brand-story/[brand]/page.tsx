"use client";

export const runtime = "edge";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft,
  FiShare2,
  FiStar,
  FiCalendar,
  FiClock,
  FiTrendingUp,
  FiTrendingDown,
  FiMinus,
  FiHeart,
  FiAward,
  FiDroplet,
  FiSmile,
} from "react-icons/fi";
import { GiCigar } from "react-icons/gi";

interface BrandStoryData {
  brand: string;
  firstSmoke: {
    date: string;
    daysAgo: number;
    rating?: number;
  };
  totalSmokes: number;
  avgRating: number | null;
  ratingTrend: "up" | "down" | "stable" | "unknown";
  favoriteTimeOfDay: string;
  favoriteDay: string;
  highestRated: number | null;
  lowestRated: number | null;
  fiveStarCount: number;
  mostRecentSmoke: {
    date: string;
    daysAgo: number;
    rating?: number;
  };
  flavorProfile: string[];
  drinkPairings: string[];
  moodWhenSmoking: string[];
  percentile: number;
  shareText: string;
}

const FLAVOR_EMOJIS: Record<string, string> = {
  cedar: "🌲",
  leather: "🪶",
  pepper: "🌶️",
  coffee: "☕",
  chocolate: "🍫",
  earth: "🌍",
  cream: "🥛",
  nuts: "🥜",
  spice: "🫚",
  wood: "🪵",
  honey: "🍯",
  cocoa: "🍫",
  vanilla: "🍦",
  citrus: "🍊",
  toast: "🍞",
  smoke: "💨",
};

const MOOD_EMOJIS: Record<string, string> = {
  relaxed: "😌",
  focused: "🎯",
  celebratory: "🎉",
  contemplative: "🤔",
  social: "👥",
  stressed: "😤",
  happy: "😊",
  tired: "😴",
};

const DRINK_EMOJIS: Record<string, string> = {
  coffee: "☕",
  whiskey: "🥃",
  beer: "🍺",
  wine: "🍷",
  rum: "🍹",
  cognac: "🥃",
  tea: "🍵",
  water: "💧",
  cola: "🥤",
  bourbon: "🥃",
};

export default function BrandStoryPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const resolvedParams = use(params);
  const brand = decodeURIComponent(resolvedParams.brand);
  const [data, setData] = useState<BrandStoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadStory() {
      try {
        const res = await fetch(`/api/brand-story/${encodeURIComponent(brand)}`);
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (res.status === 404) {
          setError("No history with this brand yet");
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error("Failed to load");
        const json: BrandStoryData = await res.json();
        setData(json);
      } catch (err) {
        console.error("Load error:", err);
        setError("Failed to load brand story");
      } finally {
        setLoading(false);
      }
    }
    loadStory();
  }, [brand, router]);

  const handleShare = async () => {
    if (!data) return;

    const shareUrl = `${window.location.origin}/cigar/${encodeURIComponent(brand)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `My ${brand} Story - Puffed`,
          text: data.shareText,
          url: shareUrl,
        });
        setShareStatus("Shared!");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          copyToClipboard(data.shareText + "\n" + shareUrl);
        }
      }
    } else {
      copyToClipboard(data.shareText + "\n" + shareUrl);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShareStatus("Copied!");
      setTimeout(() => setShareStatus(null), 2000);
    } catch {
      setShareStatus("Failed");
      setTimeout(() => setShareStatus(null), 2000);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <FiTrendingUp className="text-green-400" />;
      case "down":
        return <FiTrendingDown className="text-red-400" />;
      case "stable":
        return <FiMinus className="text-gray-400" />;
      default:
        return null;
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case "up":
        return "Loving it more";
      case "down":
        return "Cooling off";
      case "stable":
        return "Consistent love";
      default:
        return "";
    }
  };

  const getTimeOfDayEmoji = (time: string) => {
    switch (time) {
      case "morning":
        return "🌅";
      case "afternoon":
        return "☀️";
      case "evening":
        return "🌆";
      case "night":
        return "🌙";
      default:
        return "⏰";
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-indigo-900/20 to-gray-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"
        />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 via-indigo-900/20 to-gray-900 p-4">
        <div className="max-w-md mx-auto pt-8 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8"
          >
            <FiArrowLeft /> Back
          </Link>
          <div className="text-6xl mb-4">📖</div>
          <h1 className="text-xl font-bold text-white mb-2">{brand}</h1>
          <p className="text-gray-400 mb-6">{error || "No story yet"}</p>
          <Link
            href={`/checkin?brand=${encodeURIComponent(brand)}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl text-white font-medium transition"
          >
            <GiCigar /> Start Your Story
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-indigo-900/20 to-gray-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <FiArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-semibold flex items-center gap-2">
                <span className="text-2xl">📖</span>
                My {data.brand} Story
              </h1>
              <p className="text-xs text-gray-400">Your personal history</p>
            </div>
          </div>
          <button
            onClick={handleShare}
            className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-all text-sm"
          >
            <FiShare2 size={16} />
            Share
            {shareStatus && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-green-500 text-black px-2 py-1 rounded whitespace-nowrap">
                {shareStatus}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl overflow-hidden"
        >
          {/* Gradient Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 text-center">
            <div className="text-5xl mb-3">
              <GiCigar />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{data.brand}</h2>
            <p className="text-white/80">
              {data.totalSmokes} smoke{data.totalSmokes !== 1 ? "s" : ""} logged
            </p>
          </div>

          {/* Stats Grid */}
          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {data.avgRating && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-2xl font-bold text-amber-500">
                  <FiStar className="fill-current" />
                  {data.avgRating}
                </div>
                <p className="text-xs text-gray-500">Avg Rating</p>
              </div>
            )}
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-400">
                {data.fiveStarCount}
              </div>
              <p className="text-xs text-gray-500">5-Star Smokes</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-400">
                #{Math.ceil((100 - data.percentile) / 10) || 1}
              </div>
              <p className="text-xs text-gray-500">Your Top Brand</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {data.firstSmoke.daysAgo}
              </div>
              <p className="text-xs text-gray-500">Days Since First</p>
            </div>
          </div>

          {/* Rating Trend */}
          {data.ratingTrend !== "unknown" && (
            <div className="px-6 pb-6">
              <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-800/50">
                {getTrendIcon(data.ratingTrend)}
                <span className="text-sm text-gray-300">
                  {getTrendText(data.ratingTrend)}
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <FiCalendar className="text-indigo-400" />
            Your Timeline
          </h3>
          <div className="space-y-4">
            {/* First Smoke */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <span className="text-xl">🌟</span>
              </div>
              <div>
                <p className="font-medium text-white">First Smoke</p>
                <p className="text-sm text-gray-400">
                  {formatDate(data.firstSmoke.date)}
                  {data.firstSmoke.rating && (
                    <span className="ml-2 text-amber-400">
                      ⭐ {data.firstSmoke.rating}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {data.firstSmoke.daysAgo} days ago
                </p>
              </div>
            </div>

            {/* Middle Summary */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                <span className="text-xl">🔥</span>
              </div>
              <div>
                <p className="font-medium text-white">The Journey</p>
                <p className="text-sm text-gray-400">
                  {data.totalSmokes} total smokes
                  {data.highestRated && (
                    <span>
                      {" "}
                      • Best: ⭐{data.highestRated}
                      {data.lowestRated !== data.highestRated && (
                        <span> • Low: ⭐{data.lowestRated}</span>
                      )}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Most Recent */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center shrink-0">
                <span className="text-xl">✨</span>
              </div>
              <div>
                <p className="font-medium text-white">Last Smoke</p>
                <p className="text-sm text-gray-400">
                  {formatDate(data.mostRecentSmoke.date)}
                  {data.mostRecentSmoke.rating && (
                    <span className="ml-2 text-amber-400">
                      ⭐ {data.mostRecentSmoke.rating}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {data.mostRecentSmoke.daysAgo === 0
                    ? "Today"
                    : data.mostRecentSmoke.daysAgo === 1
                    ? "Yesterday"
                    : `${data.mostRecentSmoke.daysAgo} days ago`}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Smoking Patterns */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <FiClock className="text-purple-400" />
            Your Pattern
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-3xl mb-1">
                {getTimeOfDayEmoji(data.favoriteTimeOfDay)}
              </p>
              <p className="text-sm text-gray-400">Favorite Time</p>
              <p className="font-medium text-white capitalize">
                {data.favoriteTimeOfDay}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-3xl mb-1">📆</p>
              <p className="text-sm text-gray-400">Favorite Day</p>
              <p className="font-medium text-white">{data.favoriteDay}</p>
            </div>
          </div>
        </motion.div>

        {/* Flavor Profile */}
        {data.flavorProfile.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-6"
          >
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <FiHeart className="text-red-400" />
              Flavor Notes
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.flavorProfile.map((flavor) => (
                <span
                  key={flavor}
                  className="px-3 py-2 rounded-full bg-amber-500/20 text-amber-300 text-sm flex items-center gap-1"
                >
                  <span>
                    {FLAVOR_EMOJIS[flavor.toLowerCase()] || "🌿"}
                  </span>
                  {flavor}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Drink Pairings */}
        {data.drinkPairings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass rounded-2xl p-6"
          >
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <FiDroplet className="text-cyan-400" />
              Your Go-To Pairings
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.drinkPairings.map((drink) => (
                <span
                  key={drink}
                  className="px-3 py-2 rounded-full bg-cyan-500/20 text-cyan-300 text-sm flex items-center gap-1"
                >
                  <span>{DRINK_EMOJIS[drink.toLowerCase()] || "🥤"}</span>
                  {drink}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Mood */}
        {data.moodWhenSmoking.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-2xl p-6"
          >
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <FiSmile className="text-yellow-400" />
              Your Mood
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.moodWhenSmoking.map((mood) => (
                <span
                  key={mood}
                  className="px-3 py-2 rounded-full bg-yellow-500/20 text-yellow-300 text-sm flex items-center gap-1"
                >
                  <span>{MOOD_EMOJIS[mood.toLowerCase()] || "😊"}</span>
                  {mood}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 gap-3"
        >
          <Link
            href={`/cigar/${encodeURIComponent(data.brand)}`}
            className="glass rounded-xl p-4 text-center hover:bg-white/5 transition-all group"
          >
            <span className="text-2xl">📊</span>
            <p className="text-sm font-medium mt-2 group-hover:text-indigo-400 transition-colors">
              View Brand Stats
            </p>
          </Link>
          <Link
            href={`/checkin?brand=${encodeURIComponent(data.brand)}`}
            className="rounded-xl p-4 text-center bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 transition-all group"
          >
            <span className="text-2xl">🔥</span>
            <p className="text-sm font-medium mt-2 text-white">
              Log Another
            </p>
          </Link>
        </motion.div>

        {/* Share Card Promo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-all"
          >
            <FiShare2 />
            Share Your Story
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Show off your {data.brand} journey!
          </p>
        </motion.div>
      </div>

      <style jsx>{`
        .glass {
          background: rgba(17, 24, 39, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </main>
  );
}
