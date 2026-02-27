"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  FiArrowLeft, 
  FiTrendingUp, 
  FiTrendingDown,
  FiHeart,
  FiMessageCircle,
  FiUsers,
  FiStar,
  FiAward,
  FiShare2
} from "react-icons/fi";
import Image from "next/image";

interface WeeklyWrapData {
  username: string;
  weekStart: number;
  weekEnd: number;
  stats: {
    smokesThisWeek: number;
    smokesLastWeek: number;
    weekChange: number;
    avgRating: number;
    totalLikesReceived: number;
    likesGiven: number;
    commentsGiven: number;
    likesReceived: number;
    commentsReceived: number;
    newFollowers: number;
  };
  topBrands: Array<{ name: string; count: number; avgRating: number }>;
  topFlavors: Array<{ name: string; count: number }>;
  vibe: { name: string; emoji: string };
  checkins: Array<{
    id: string;
    brand: string;
    product: string;
    rating: number;
    likes: number;
    image_url: string;
  }>;
}

export default function WeeklyWrapPage() {
  const [data, setData] = useState<WeeklyWrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/weekly-wrap")
      .then(res => res.json() as Promise<WeeklyWrapData & { error?: string }>)
      .then(d => {
        if (d.error) {
          router.push("/login");
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const formatDate = (ts: number) => {
    return new Date(ts * 1000).toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric" 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-fuchsia-400/30 border-t-fuchsia-400 rounded-full"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 flex items-center justify-center text-white">
        <p>Failed to load your weekly wrap</p>
      </div>
    );
  }

  const slides = [
    // Slide 1: Title
    <motion.div
      key="title"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4"
    >
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-8xl mb-6"
      >
        📊
      </motion.div>
      <h1 className="text-4xl md:text-5xl font-bold mb-2">Your Weekly Wrap</h1>
      <p className="text-xl text-fuchsia-300">
        {formatDate(data.weekStart)} - {formatDate(data.weekEnd)}
      </p>
      <p className="text-white/60 mt-4">Hey {data.username}! Let&apos;s see how your week went.</p>
    </motion.div>,

    // Slide 2: Smokes Count
    <motion.div
      key="smokes"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4"
    >
      <p className="text-xl text-fuchsia-300 mb-4">This week you logged</p>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="text-8xl md:text-9xl font-bold mb-4"
      >
        {data.stats.smokesThisWeek}
      </motion.div>
      <p className="text-2xl mb-6">
        {data.stats.smokesThisWeek === 1 ? "smoke" : "smokes"}
      </p>
      {data.stats.weekChange !== 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`flex items-center gap-2 text-lg ${
            data.stats.weekChange > 0 ? "text-green-400" : "text-amber-400"
          }`}
        >
          {data.stats.weekChange > 0 ? <FiTrendingUp /> : <FiTrendingDown />}
          <span>{Math.abs(data.stats.weekChange)}% vs last week</span>
        </motion.div>
      )}
      {data.stats.avgRating > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex items-center gap-2 text-amber-400"
        >
          <FiStar className="fill-amber-400" />
          <span>Avg rating: {data.stats.avgRating}/5</span>
        </motion.div>
      )}
    </motion.div>,

    // Slide 3: Top Brands
    <motion.div
      key="brands"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4"
    >
      <p className="text-xl text-fuchsia-300 mb-6">Your Top Brands</p>
      {data.topBrands.length > 0 ? (
        <div className="space-y-4 w-full max-w-md">
          {data.topBrands.map((brand, i) => (
            <motion.div
              key={brand.name}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.2 }}
              className="bg-white/10 backdrop-blur rounded-xl p-4 flex items-center gap-4"
            >
              <span className="text-3xl">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
              </span>
              <div className="flex-1 text-left">
                <p className="font-semibold">{brand.name}</p>
                <p className="text-sm text-white/60">
                  {brand.count}× smoked • {brand.avgRating}★
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-white/60">No brands logged this week</p>
      )}
    </motion.div>,

    // Slide 4: Social Stats
    <motion.div
      key="social"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4"
    >
      <p className="text-xl text-fuchsia-300 mb-6">Your Social Week</p>
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-pink-500/20 backdrop-blur rounded-xl p-4"
        >
          <FiHeart className="text-2xl mx-auto mb-2 text-pink-400" />
          <p className="text-2xl font-bold">{data.stats.likesGiven}</p>
          <p className="text-xs text-white/60">Likes Given</p>
        </motion.div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-pink-500/20 backdrop-blur rounded-xl p-4"
        >
          <FiHeart className="text-2xl mx-auto mb-2 text-pink-400 fill-pink-400" />
          <p className="text-2xl font-bold">{data.stats.likesReceived}</p>
          <p className="text-xs text-white/60">Likes Received</p>
        </motion.div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-500/20 backdrop-blur rounded-xl p-4"
        >
          <FiMessageCircle className="text-2xl mx-auto mb-2 text-blue-400" />
          <p className="text-2xl font-bold">{data.stats.commentsGiven}</p>
          <p className="text-xs text-white/60">Comments Made</p>
        </motion.div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-green-500/20 backdrop-blur rounded-xl p-4"
        >
          <FiUsers className="text-2xl mx-auto mb-2 text-green-400" />
          <p className="text-2xl font-bold">{data.stats.newFollowers}</p>
          <p className="text-xs text-white/60">New Followers</p>
        </motion.div>
      </div>
    </motion.div>,

    // Slide 5: Weekly Vibe
    <motion.div
      key="vibe"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4"
    >
      <p className="text-xl text-fuchsia-300 mb-4">Your Weekly Vibe</p>
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 10, -10, 0]
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="text-8xl mb-6"
      >
        {data.vibe.emoji}
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-4xl font-bold mb-4"
      >
        {data.vibe.name}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-white/60 max-w-md"
      >
        {data.vibe.name === "Zen Master" && "You're in the zone! 7+ smokes this week shows true dedication."}
        {data.vibe.name === "Weekend Warrior" && "A solid week of smoking! You know how to balance life and leisure."}
        {data.vibe.name === "Quality Over Quantity" && "High standards! Your avg rating of 4.5+ shows you pick only the best."}
        {data.vibe.name === "Explorer" && "Trying multiple brands! Your curiosity is paying off."}
        {data.vibe.name === "Social Butterfly" && "Spreading the love! Your engagement keeps the community alive."}
        {data.vibe.name === "Rising Star" && "People are noticing you! Keep up the great content."}
        {data.vibe.name === "Ghost Mode" && "Taking a break? We miss you! Log a smoke to get back in action."}
        {data.vibe.name === "Getting Started" && "Every journey starts somewhere. Keep logging those smokes!"}
      </motion.p>
    </motion.div>,

    // Slide 6: Highlights
    <motion.div
      key="highlights"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4"
    >
      <p className="text-xl text-fuchsia-300 mb-6">Week Highlights</p>
      {data.checkins.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-4 max-w-full px-2">
          {data.checkins.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="flex-shrink-0 w-32"
            >
              {c.image_url ? (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden mb-2">
                  <Image 
                    src={c.image_url} 
                    alt={c.brand}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-xl bg-white/10 flex items-center justify-center mb-2">
                  <span className="text-4xl">🚬</span>
                </div>
              )}
              <p className="text-xs font-medium truncate">{c.brand}</p>
              <div className="flex items-center justify-center gap-1 text-xs text-white/60">
                <FiStar className="text-amber-400 fill-amber-400" size={10} />
                {c.rating}
                {c.likes > 0 && (
                  <>
                    <span className="mx-1">•</span>
                    <FiHeart className="text-pink-400" size={10} />
                    {c.likes}
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-white/60">No check-ins to show</p>
      )}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8"
      >
        <Link 
          href="/dashboard"
          className="px-6 py-3 bg-gradient-to-r from-fuchsia-500 to-purple-600 rounded-full font-semibold inline-flex items-center gap-2 hover:opacity-90"
        >
          <FiAward />
          Keep the streak going!
        </Link>
      </motion.div>
    </motion.div>
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 text-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-4 flex items-center justify-between z-50">
        <button 
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20"
        >
          <FiArrowLeft />
        </button>
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                currentSlide === i ? "bg-fuchsia-400 w-6" : "bg-white/30"
              }`}
            />
          ))}
        </div>
        <button className="p-2 rounded-full bg-white/10 hover:bg-white/20">
          <FiShare2 />
        </button>
      </div>

      {/* Slides */}
      <AnimatePresence mode="wait">
        <div key={currentSlide} className="pt-16 pb-24">
          {slides[currentSlide]}
        </div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 flex justify-between">
        <button
          onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          className={`px-6 py-3 rounded-full font-semibold ${
            currentSlide === 0 
              ? "bg-white/5 text-white/30" 
              : "bg-white/10 hover:bg-white/20"
          }`}
        >
          Back
        </button>
        <button
          onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
          disabled={currentSlide === slides.length - 1}
          className={`px-6 py-3 rounded-full font-semibold ${
            currentSlide === slides.length - 1
              ? "bg-white/5 text-white/30"
              : "bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:opacity-90"
          }`}
        >
          {currentSlide === slides.length - 1 ? "Done" : "Next"}
        </button>
      </div>
    </div>
  );
}
