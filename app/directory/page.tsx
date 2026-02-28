"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiHome,
  FiSearch,
  FiClock,
  FiStar,
  FiUsers,
  FiAward,
  FiTrendingUp,
  FiHeart,
  FiZap,
  FiMoon,
  FiSun,
  FiMusic,
  FiBook,
  FiCompass,
  FiTarget,
  FiGift,
} from "react-icons/fi";

interface Feature {
  name: string;
  path: string;
  emoji: string;
  description: string;
  category: "time-based" | "social" | "stats" | "games" | "discovery" | "personal";
  timing?: string;
}

const features: Feature[] = [
  // Time-Based Features
  { name: "Coffee Lounge", path: "/coffee", emoji: "☕", description: "Early morning smoking sessions (5-10 AM)", category: "time-based", timing: "5-10 AM" },
  { name: "Morning Brief", path: "/morning-brief", emoji: "📰", description: "Daily digest at coffee time", category: "time-based", timing: "Morning" },
  { name: "First Light", path: "/first-light", emoji: "☀️", description: "Who logs the first smoke each day?", category: "time-based" },
  { name: "Dawn Patrol", path: "/dawn-patrol", emoji: "🌅", description: "Pre-dawn smokers club", category: "time-based", timing: "4-6 AM" },
  { name: "Sunrise", path: "/sunrise", emoji: "🌄", description: "Watch the sunrise with fellow smokers", category: "time-based", timing: "6-8 AM" },
  { name: "Saturday Cartoons", path: "/saturday-cartoons", emoji: "📺", description: "Nostalgic Saturday morning vibes", category: "time-based", timing: "Sat 6AM-12PM" },
  { name: "Wake & Bake", path: "/wake-bake", emoji: "🌞", description: "Weekend morning ritual", category: "time-based", timing: "Weekend 5-10AM" },
  { name: "Happy Hour", path: "/happy-hour", emoji: "🍻", description: "After-work smoking sessions", category: "time-based", timing: "5-8 PM" },
  { name: "Thursday Hub", path: "/thursday-hub", emoji: "🗓️", description: "Weekend countdown & evening vibes", category: "time-based", timing: "Thursday" },
  { name: "TGIF", path: "/tgif", emoji: "🎉", description: "Friday celebration zone", category: "time-based", timing: "Friday" },
  { name: "Friday Night Live", path: "/friday-night-live", emoji: "🌙", description: "Friday night festivities", category: "time-based", timing: "Friday Night" },
  { name: "Weekend Kickoff", path: "/weekend-kickoff", emoji: "🚀", description: "Start your weekend right", category: "time-based", timing: "Friday-Saturday" },
  { name: "Weekend", path: "/weekend", emoji: "🌴", description: "Full weekend experience", category: "time-based", timing: "Sat-Sun" },
  { name: "Weekend Forecast", path: "/weekend-forecast", emoji: "📊", description: "Plan your weekend smokes", category: "time-based", timing: "Weekend" },
  { name: "Saturday Night", path: "/saturday-night", emoji: "🪩", description: "Saturday night fever", category: "time-based", timing: "Sat Night" },
  { name: "Wind Down", path: "/wind-down", emoji: "🌆", description: "Evening relaxation time", category: "time-based", timing: "Evening" },
  { name: "Twilight Zone", path: "/twilight-zone", emoji: "🌗", description: "The mysterious in-between hours", category: "time-based", timing: "Dusk" },
  { name: "Nightcap", path: "/nightcap", emoji: "🌙", description: "End your evening ritual", category: "time-based", timing: "8PM-4AM" },
  { name: "Goodnight Lounge", path: "/goodnight", emoji: "😴", description: "Last smoke before bed", category: "time-based", timing: "9PM-2AM" },
  { name: "Midnight Society", path: "/midnight-society", emoji: "🦇", description: "Midnight smokers secret club", category: "time-based", timing: "12-1 AM" },
  { name: "Witching Hour", path: "/witching-hour", emoji: "🕐", description: "The supernatural smoking hour", category: "time-based", timing: "3-4 AM" },
  { name: "The Void", path: "/void", emoji: "🕳️", description: "Ultra-minimal zen space", category: "time-based", timing: "12-4 AM" },
  { name: "Dead of Night Diary", path: "/dead-of-night", emoji: "📓", description: "Late night journaling", category: "time-based", timing: "2-5 AM" },
  { name: "Graveyard Shift", path: "/graveyard-shift", emoji: "☠️", description: "For the night shift workers", category: "time-based", timing: "Late Night" },
  
  // Social Features
  { name: "Discover", path: "/discover", emoji: "🔍", description: "Explore the community feed", category: "social" },
  { name: "Spread Love", path: "/spread-love", emoji: "💕", description: "Like and engage with the community", category: "social" },
  { name: "Shoutouts", path: "/shoutouts", emoji: "📣", description: "Give and receive shoutouts", category: "social" },
  { name: "Following", path: "/following", emoji: "👥", description: "Your personalized feed", category: "social" },
  { name: "People", path: "/people", emoji: "🧑‍🤝‍🧑", description: "Find people to follow", category: "social" },
  { name: "Conversations", path: "/conversations", emoji: "💬", description: "Community discussions", category: "social" },
  { name: "Smoke Council", path: "/council", emoji: "🏛️", description: "Weekly cabinet of distinguished smokers", category: "social" },
  { name: "Confessional", path: "/confessional", emoji: "🙏", description: "Anonymous smoking confessions", category: "social" },
  
  // Stats & Leaderboards
  { name: "Leaderboard", path: "/leaderboard", emoji: "🏆", description: "Top smokers rankings", category: "stats" },
  { name: "Brand Champions", path: "/champions", emoji: "👑", description: "Who owns each brand?", category: "stats" },
  { name: "Platform Pulse", path: "/pulse", emoji: "📈", description: "Real-time community stats", category: "stats" },
  { name: "My Stats", path: "/mystats", emoji: "📊", description: "Your personal smoking statistics", category: "stats" },
  { name: "Personal Bests", path: "/personal-bests", emoji: "🏅", description: "Your personal records", category: "stats" },
  { name: "Achievements", path: "/achievements", emoji: "🎖️", description: "Badges you've earned", category: "stats" },
  { name: "Awards", path: "/awards", emoji: "🏆", description: "Special recognitions", category: "stats" },
  { name: "Weekly Recap", path: "/weekly-recap", emoji: "📅", description: "Your week in review", category: "stats" },
  { name: "Monthly Recap", path: "/monthly-recap", emoji: "📆", description: "Your month in review", category: "stats" },
  { name: "Activity Streak", path: "/activity-streak", emoji: "🔥", description: "Track your smoking streaks", category: "stats" },
  { name: "Calendar", path: "/calendar", emoji: "📅", description: "Visual smoking calendar", category: "stats" },
  { name: "Smoke Score", path: "/smoke-score", emoji: "💯", description: "Your overall smoking score", category: "stats" },
  { name: "Records", path: "/records", emoji: "📜", description: "Platform-wide records", category: "stats" },
  { name: "Milestones", path: "/milestones", emoji: "🎯", description: "Track your progress milestones", category: "stats" },
  { name: "Victory Lap", path: "/victory-lap", emoji: "🏁", description: "Celebrate achievements", category: "stats" },
  { name: "You vs Community", path: "/you-vs-community", emoji: "⚔️", description: "Compare yourself to others", category: "stats" },
  
  // Games & Fun
  { name: "Smoke Bingo", path: "/bingo", emoji: "🎲", description: "Weekly challenge bingo card", category: "games" },
  { name: "Smoke Slots", path: "/slots", emoji: "🎰", description: "Spin for random recommendations", category: "games" },
  { name: "Brand Battle", path: "/battle", emoji: "🥊", description: "Weekly brand voting matchups", category: "games" },
  { name: "Smoke Fortune", path: "/fortune", emoji: "🥠", description: "Your smoking fortune", category: "games" },
  { name: "Smoke Roulette", path: "/roulette", emoji: "🎡", description: "Random smoking challenges", category: "games" },
  { name: "This or That", path: "/this-or-that", emoji: "🤔", description: "Quick preference polls", category: "games" },
  { name: "Trivia", path: "/trivia", emoji: "❓", description: "Test your cigar knowledge", category: "games" },
  { name: "Smoke Wishes", path: "/wishes", emoji: "🌟", description: "The 2 AM wishing well", category: "games" },
  { name: "Time Capsule", path: "/time-capsule", emoji: "📦", description: "Messages to your future self", category: "games" },
  { name: "Race", path: "/race", emoji: "🏃", description: "Compete in smoking races", category: "games" },
  { name: "Challenge", path: "/challenge", emoji: "💪", description: "Weekly smoking challenges", category: "games" },
  
  // Discovery
  { name: "Explore Brands", path: "/cigar", emoji: "🚬", description: "Browse all brands", category: "discovery" },
  { name: "Browse by Flavor", path: "/flavor", emoji: "👅", description: "Discover cigars by taste", category: "discovery" },
  { name: "Trending", path: "/search", emoji: "🔥", description: "What's hot right now", category: "discovery" },
  { name: "Pairing Guide", path: "/pairing-guide", emoji: "🥃", description: "Drink pairing suggestions", category: "discovery" },
  { name: "Smoke Radio", path: "/radio", emoji: "📻", description: "Your sessions as a live radio station", category: "discovery" },
  { name: "Smoke Cinema", path: "/cinema", emoji: "🎬", description: "Movie recommendations for smokers", category: "discovery" },
  { name: "Weather", path: "/weather", emoji: "🌤️", description: "Smoking weather conditions", category: "discovery" },
  { name: "Suggest", path: "/suggest", emoji: "💡", description: "Get personalized suggestions", category: "discovery" },
  { name: "Soulmate", path: "/soulmate", emoji: "💕", description: "Find your smoke soulmate", category: "discovery" },
  { name: "Twins", path: "/twins", emoji: "👯", description: "Users with similar taste", category: "discovery" },
  { name: "Flavor DNA", path: "/flavor-dna", emoji: "🧬", description: "Your unique flavor profile", category: "discovery" },
  { name: "Mood Match", path: "/mood-match", emoji: "🎭", description: "Cigars for your current mood", category: "discovery" },
  { name: "Spirit", path: "/spirit", emoji: "👻", description: "Your smoking spirit animal", category: "discovery" },
  { name: "Personality", path: "/personality", emoji: "🧠", description: "Your smoking personality type", category: "discovery" },
  
  // Personal
  { name: "Dashboard", path: "/dashboard", emoji: "🏠", description: "Your home base", category: "personal" },
  { name: "Log a Smoke", path: "/checkin", emoji: "✍️", description: "Record your current smoke", category: "personal" },
  { name: "Quick Smoke", path: "/dashboard", emoji: "⚡", description: "One-tap check-in", category: "personal" },
  { name: "Wishlist", path: "/wishlist", emoji: "📝", description: "Cigars you want to try", category: "personal" },
  { name: "Timer", path: "/timer", emoji: "⏱️", description: "Track your smoking time", category: "personal" },
  { name: "Goals", path: "/goals", emoji: "🎯", description: "Set and track smoking goals", category: "personal" },
  { name: "Tier List", path: "/tier-list", emoji: "📊", description: "Rank your favorite cigars", category: "personal" },
  { name: "Throwback", path: "/throwback", emoji: "📸", description: "On this day memories", category: "personal" },
  { name: "Notifications", path: "/notifications", emoji: "🔔", description: "Your activity notifications", category: "personal" },
  { name: "Settings", path: "/settings", emoji: "⚙️", description: "Customize your experience", category: "personal" },
];

const categories = [
  { id: "all", name: "All Features", emoji: "📚", color: "from-purple-500 to-pink-500" },
  { id: "time-based", name: "Time-Based", emoji: "⏰", color: "from-blue-500 to-cyan-500" },
  { id: "social", name: "Social", emoji: "👥", color: "from-pink-500 to-rose-500" },
  { id: "stats", name: "Stats & Ranks", emoji: "📊", color: "from-green-500 to-emerald-500" },
  { id: "games", name: "Games & Fun", emoji: "🎮", color: "from-yellow-500 to-orange-500" },
  { id: "discovery", name: "Discovery", emoji: "🔍", color: "from-indigo-500 to-purple-500" },
  { id: "personal", name: "Personal", emoji: "👤", color: "from-gray-500 to-slate-500" },
];

export default function DirectoryPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFeatures = features.filter((f) => {
    const matchesCategory = activeCategory === "all" || f.category === activeCategory;
    const matchesSearch = searchQuery === "" || 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryColor = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat?.color || "from-gray-500 to-slate-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-purple-600/90 via-pink-600/90 to-purple-600/90 backdrop-blur-sm border-b border-purple-400/30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/20 rounded-full">
            <FiHome className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <span className="font-bold text-white">Feature Directory</span>
          </div>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-2xl p-6 text-center border border-purple-400/30"
        >
          <div className="text-5xl mb-3">📚</div>
          <h1 className="text-2xl font-bold text-white mb-2">Puffed Directory</h1>
          <p className="text-purple-200 text-sm">
            Discover all {features.length}+ features and find your favorites
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search features..."
            className="w-full pl-12 pr-4 py-3 bg-white/10 border border-purple-400/30 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
          />
        </motion.div>

        {/* Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="overflow-x-auto -mx-4 px-4 pb-2"
        >
          <div className="flex gap-2 min-w-max">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeCategory === cat.id
                    ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                {cat.emoji} {cat.name}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Results Count */}
        <div className="text-sm text-purple-300/70">
          Showing {filteredFeatures.length} feature{filteredFeatures.length !== 1 ? "s" : ""}
          {activeCategory !== "all" && ` in ${categories.find(c => c.id === activeCategory)?.name}`}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <AnimatePresence mode="popLayout">
            {filteredFeatures.map((feature, i) => (
              <motion.div
                key={feature.path}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.02 }}
              >
                <Link
                  href={feature.path}
                  className={`block bg-gradient-to-r ${getCategoryColor(feature.category)}/20 hover:${getCategoryColor(feature.category)}/40 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all group`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      {feature.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white group-hover:text-purple-200 transition-colors">
                        {feature.name}
                      </div>
                      <div className="text-sm text-purple-300/70 truncate">
                        {feature.description}
                      </div>
                      {feature.timing && (
                        <div className="text-xs text-purple-400/60 mt-1 flex items-center gap-1">
                          <FiClock className="w-3 h-3" />
                          {feature.timing}
                        </div>
                      )}
                    </div>
                    <div className="text-purple-400 group-hover:translate-x-1 transition-transform">
                      →
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredFeatures.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-purple-300/50"
          >
            <div className="text-5xl mb-4">🔍</div>
            <p className="font-medium">No features found</p>
            <p className="text-sm mt-1">Try a different search or category</p>
          </motion.div>
        )}

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-purple-800/20 rounded-xl p-4 border border-purple-500/30"
        >
          <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
            <FiZap className="w-4 h-4" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/checkin"
              className="bg-gradient-to-r from-green-500/30 to-emerald-500/30 rounded-lg p-3 text-center hover:from-green-500/40 hover:to-emerald-500/40 transition-all border border-green-400/30"
            >
              <div className="text-2xl mb-1">✍️</div>
              <div className="text-sm font-medium text-white">Log Smoke</div>
            </Link>
            <Link
              href="/dashboard"
              className="bg-gradient-to-r from-blue-500/30 to-cyan-500/30 rounded-lg p-3 text-center hover:from-blue-500/40 hover:to-cyan-500/40 transition-all border border-blue-400/30"
            >
              <div className="text-2xl mb-1">🏠</div>
              <div className="text-sm font-medium text-white">Dashboard</div>
            </Link>
            <Link
              href="/discover"
              className="bg-gradient-to-r from-pink-500/30 to-rose-500/30 rounded-lg p-3 text-center hover:from-pink-500/40 hover:to-rose-500/40 transition-all border border-pink-400/30"
            >
              <div className="text-2xl mb-1">🔍</div>
              <div className="text-sm font-medium text-white">Discover</div>
            </Link>
            <Link
              href="/leaderboard"
              className="bg-gradient-to-r from-yellow-500/30 to-orange-500/30 rounded-lg p-3 text-center hover:from-yellow-500/40 hover:to-orange-500/40 transition-all border border-yellow-400/30"
            >
              <div className="text-2xl mb-1">🏆</div>
              <div className="text-sm font-medium text-white">Leaderboard</div>
            </Link>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center text-xs text-purple-400/50 pt-4">
          Puffed has {features.length}+ features to explore! 🚀
        </div>
      </main>
    </div>
  );
}
