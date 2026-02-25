"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiAward, FiLock, FiTrendingUp, FiStar, FiZap, FiHeart, FiUsers, FiMessageCircle, FiSun, FiMoon, FiCalendar, FiGift, FiTarget, FiCamera, FiShare2 } from "react-icons/fi";

interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  earned: boolean;
  earnedAt?: number;
  progress?: number | { current: number; target: number };
  target?: number;
  category?: string;
}

interface BadgesResponse {
  badges: Badge[];
  earned_count: number;
  total_count: number;
  error?: string;
}

interface BadgeRarity {
  badgeId: string;
  earnedCount: number;
  totalUsers: number;
  rarityPercent: number;
  tier: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

interface RarityResponse {
  totalUsers: number;
  rarities: Record<string, BadgeRarity>;
}

// Categorize badges for display
const BADGE_CATEGORIES = [
  { id: "activity", name: "Activity", icon: FiTrendingUp, color: "amber" },
  { id: "streaks", name: "Streaks", icon: FiZap, color: "orange" },
  { id: "social", name: "Social", icon: FiHeart, color: "pink" },
  { id: "time", name: "Time-Based", icon: FiSun, color: "purple" },
  { id: "exploration", name: "Exploration", icon: FiTarget, color: "cyan" },
  { id: "quality", name: "Quality", icon: FiStar, color: "yellow" },
  { id: "milestones", name: "Milestones", icon: FiAward, color: "green" },
];

// Badge category mapping
const BADGE_CATEGORY_MAP: Record<string, string> = {
  // Activity
  first_smoke: "activity",
  getting_started: "activity",
  regular: "activity",
  aficionado: "activity",
  legend: "activity",
  century_smoker: "activity",
  // Streaks
  three_day_streak: "streaks",
  week_streak: "streaks",
  month_streak: "streaks",
  comeback_kid: "streaks",
  phoenix: "streaks",
  // Social
  socialite: "social",
  beloved: "social",
  fan_favorite: "social",
  commentator: "social",
  conversation_starter: "social",
  influencer: "social",
  referral_rookie: "social",
  referral_pro: "social",
  referral_legend: "social",
  // Time-Based
  early_bird: "time",
  night_owl: "time",
  weekend_warrior: "time",
  midnight_club: "time",
  // Exploration
  explorer: "exploration",
  globetrotter: "exploration",
  brand_pioneer: "exploration",
  trailblazer: "exploration",
  brand_columbus: "exploration",
  // Quality
  five_star: "quality",
  critic: "quality",
  photographer: "quality",
  // Milestones
  first_love: "milestones",
  first_follower: "milestones",
};

// Rarity tier styling
const RARITY_STYLES: Record<string, { bg: string; text: string; border: string; label: string; icon: string }> = {
  common: { bg: "bg-gray-600/20", text: "text-gray-400", border: "border-gray-500/30", label: "Common", icon: "⚪" },
  uncommon: { bg: "bg-green-600/20", text: "text-green-400", border: "border-green-500/30", label: "Uncommon", icon: "🟢" },
  rare: { bg: "bg-blue-600/20", text: "text-blue-400", border: "border-blue-500/30", label: "Rare", icon: "🔵" },
  epic: { bg: "bg-purple-600/20", text: "text-purple-400", border: "border-purple-500/30", label: "Epic", icon: "🟣" },
  legendary: { bg: "bg-amber-600/20", text: "text-amber-400", border: "border-amber-500/50", label: "Legendary", icon: "🟡" },
};

function BadgeCard({ badge, rarity }: { badge: Badge; rarity?: BadgeRarity }) {
  // Handle progress which can be { current, target } object or just numbers
  const progressObj = typeof badge.progress === 'object' && badge.progress !== null
    ? badge.progress
    : badge.progress !== undefined && badge.target !== undefined
      ? { current: badge.progress, target: badge.target }
      : null;
  
  const progressPercent = progressObj 
    ? Math.min(100, (progressObj.current / progressObj.target) * 100) 
    : 0;

  const rarityStyle = rarity ? RARITY_STYLES[rarity.tier] : RARITY_STYLES.common;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative glass rounded-xl p-4 ${
        badge.earned 
          ? `${rarityStyle.border} ${rarityStyle.bg}` 
          : "border border-gray-700/50 opacity-60"
      }`}
    >
      {/* Rarity badge for earned */}
      {badge.earned && rarity && (
        <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${rarityStyle.bg} ${rarityStyle.text}`}>
          {rarity.rarityPercent}%
        </div>
      )}
      
      {/* Locked overlay for unearned */}
      {!badge.earned && (
        <div className="absolute top-2 right-2">
          <FiLock className="text-gray-500" size={14} />
        </div>
      )}
      
      {/* Badge emoji */}
      <div className={`text-4xl mb-3 ${badge.earned ? "" : "grayscale opacity-50"}`}>
        {badge.emoji}
      </div>
      
      {/* Badge name */}
      <h3 className={`font-semibold text-sm ${badge.earned ? "text-white" : "text-gray-400"}`}>
        {badge.name}
      </h3>
      
      {/* Rarity tier label */}
      {badge.earned && rarity && (
        <p className={`text-[10px] font-medium ${rarityStyle.text} mt-0.5`}>
          {rarityStyle.icon} {rarityStyle.label} • {rarity.earnedCount}/{rarity.totalUsers} users
        </p>
      )}
      
      {/* Description */}
      <p className="text-xs text-gray-500 mt-1">
        {badge.description}
      </p>
      
      {/* Rarity hint for unearned */}
      {!badge.earned && rarity && (
        <p className={`text-[10px] mt-2 ${rarityStyle.text}`}>
          {rarityStyle.icon} {rarityStyle.label} • {rarity.rarityPercent}% have this
        </p>
      )}
      
      {/* Progress bar for unearned */}
      {!badge.earned && progressObj && progressObj.target > 1 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{progressObj.current}/{progressObj.target}</span>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
            />
          </div>
        </div>
      )}
      
      {/* Earned date */}
      {badge.earned && badge.earnedAt && (
        <p className="text-xs text-amber-500/70 mt-2">
          ✓ Earned {new Date(badge.earnedAt * 1000).toLocaleDateString()}
        </p>
      )}
    </motion.div>
  );
}

function CategorySection({ 
  category, 
  badges,
  rarities,
}: { 
  category: typeof BADGE_CATEGORIES[0]; 
  badges: Badge[];
  rarities: Record<string, BadgeRarity>;
}) {
  const earnedCount = badges.filter(b => b.earned).length;
  const Icon = category.icon;
  
  const colorClasses: Record<string, string> = {
    amber: "from-amber-500 to-orange-500",
    orange: "from-orange-500 to-red-500",
    pink: "from-pink-500 to-rose-500",
    purple: "from-purple-500 to-indigo-500",
    cyan: "from-cyan-500 to-blue-500",
    yellow: "from-yellow-500 to-amber-500",
    green: "from-green-500 to-emerald-500",
  };
  
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorClasses[category.color]} flex items-center justify-center`}>
          <Icon className="text-white" size={16} />
        </div>
        <div>
          <h2 className="font-semibold text-white">{category.name}</h2>
          <p className="text-xs text-gray-500">{earnedCount}/{badges.length} unlocked</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {badges.map(badge => (
          <BadgeCard key={badge.id} badge={badge} rarity={rarities[badge.id]} />
        ))}
      </div>
    </div>
  );
}

export default function AchievementsPage() {
  const router = useRouter();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [rarities, setRarities] = useState<Record<string, BadgeRarity>>({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ earned: 0, total: 0 });

  useEffect(() => {
    loadBadges();
  }, []);

  async function loadBadges() {
    try {
      // Fetch badges and rarity data in parallel
      const [badgesRes, rarityRes] = await Promise.all([
        fetch("/api/badges"),
        fetch("/api/badge-rarity"),
      ]);
      
      if (badgesRes.status === 401) {
        router.push("/login");
        return;
      }
      
      const data: BadgesResponse = await badgesRes.json();
      
      // Transform badges to have progress object
      const allBadges: Badge[] = data.badges.map(b => ({
        id: b.id,
        name: b.name,
        description: b.description,
        emoji: b.emoji,
        earned: b.earned,
        earnedAt: b.earnedAt,
        progress: !b.earned && typeof b.progress === 'number' && typeof b.target === 'number'
          ? { current: b.progress, target: b.target }
          : undefined,
      }));
      
      setBadges(allBadges);
      setStats({
        earned: data.earned_count,
        total: data.total_count,
      });

      // Load rarity data
      if (rarityRes.ok) {
        const rarityData: RarityResponse = await rarityRes.json();
        setRarities(rarityData.rarities || {});
      }
    } catch (error) {
      console.error("Load badges error:", error);
    } finally {
      setLoading(false);
    }
  }

  // Group badges by category
  const badgesByCategory = BADGE_CATEGORIES.map(cat => ({
    category: cat,
    badges: badges
      .filter(b => (BADGE_CATEGORY_MAP[b.id] || "milestones") === cat.id)
      .sort((a, b) => (b.earned ? 1 : 0) - (a.earned ? 1 : 0)),
  })).filter(g => g.badges.length > 0);

  const completionPercent = stats.total > 0 ? Math.round((stats.earned / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/dashboard" 
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <FiArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              🏆 Achievement Showcase
            </h1>
            <p className="text-sm text-gray-400">Unlock badges by using Puffed</p>
          </div>
        </div>

        {/* Overall Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 mb-8 border border-amber-500/20"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Your Progress</h2>
              <p className="text-sm text-gray-400">
                {stats.earned} of {stats.total} achievements unlocked
              </p>
            </div>
            <div className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              {completionPercent}%
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-full"
            />
          </div>
          
          {/* Encouragement */}
          <p className="text-sm text-gray-500 mt-3">
            {completionPercent < 25 && "🚀 You're just getting started! Keep logging smokes to unlock more."}
            {completionPercent >= 25 && completionPercent < 50 && "💪 Nice progress! You're on your way to becoming a legend."}
            {completionPercent >= 50 && completionPercent < 75 && "🔥 Halfway there! You're a true aficionado."}
            {completionPercent >= 75 && completionPercent < 100 && "👑 Almost complete! You're among the elite."}
            {completionPercent === 100 && "🏆 LEGENDARY! You've unlocked everything!"}
          </p>
          
          {/* Rarity Legend */}
          <div className="mt-4 pt-4 border-t border-gray-700/50">
            <p className="text-xs text-gray-500 mb-2">Badge Rarity:</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-gray-600/20 text-gray-400">⚪ Common &gt;50%</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-green-600/20 text-green-400">🟢 Uncommon 25-50%</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-blue-600/20 text-blue-400">🔵 Rare 10-25%</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-purple-600/20 text-purple-400">🟣 Epic 5-10%</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-amber-600/20 text-amber-400">🟡 Legendary &lt;5%</span>
            </div>
          </div>
        </motion.div>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent" />
          </div>
        )}

        {/* Badge Categories */}
        {!loading && badgesByCategory.map(({ category, badges }, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <CategorySection category={category} badges={badges} rarities={rarities} />
          </motion.div>
        ))}

        {/* Empty state */}
        {!loading && badges.length === 0 && (
          <div className="text-center py-12">
            <FiAward className="mx-auto text-4xl text-gray-600 mb-4" />
            <p className="text-gray-400">No badges yet. Start logging smokes to earn achievements!</p>
            <Link 
              href="/dashboard" 
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 rounded-lg font-medium hover:bg-amber-600 transition-colors"
            >
              Log Your First Smoke
            </Link>
          </div>
        )}

        {/* Bottom CTA */}
        {!loading && stats.earned < stats.total && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-8 pb-8"
          >
            <p className="text-gray-500 mb-3">
              {stats.total - stats.earned} more achievements to unlock
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25"
            >
              <FiZap /> Keep Smoking
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
