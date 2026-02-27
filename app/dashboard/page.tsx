"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiPlus, FiLogOut, FiStar, FiClock, FiWind, FiDroplet, FiSmile, FiCompass, FiCamera, FiX, FiTrash2, FiSettings, FiBell, FiAward, FiShare2, FiSearch, FiBarChart2, FiBookmark, FiZap, FiLayers, FiCalendar, FiUsers, FiActivity, FiRss, FiTarget, FiMoon, FiMapPin, FiHeart } from "react-icons/fi";
import Link from "next/link";
import type { User, Checkin, MeResponse, CheckinsResponse, UploadResponse, NotificationCountResponse, BadgesResponse, Badge, StreakResponse, WeeklyInsights, FeedResponse, Activity, ActivityResponse, DailyPrompt, PromptResponse, DailyPromptResponse, RecentBrand, RecentBrandsResponse, ActiveSmoker, ActiveSmokersResponse, WeeklyRecap, WeeklyGoal, WeeklyGoalsResponse, BrandOfWeek, FlavorRecommendation, FlavorRecsResponse, OnboardingTask, OnboardingResponse, CommunityMilestonesResponse, LoungeResponse, NightOwlUser, NightThought, NightThoughtsResponse, MorningCoffeeResponse, EarlyBirdUser, OnThisDayResponse, OnThisDayMemory, SuggestedUser, SuggestedFollowsResponse, CommunityChallenge, DailyPollData, EveningLoungeResponse, EveningSmoker, TonightsPick, DailyTip, DailyChallengeData } from "@/lib/types";
import { FiRepeat } from "react-icons/fi";
import { FiTrendingUp, FiTrendingDown, FiMinus, FiMenu } from "react-icons/fi";
import MobileSidebar from "../components/MobileSidebar";
import { FLAVOR_TAGS, getFlavorTag } from "@/lib/flavors";
import { MOOD_TAGS } from "@/lib/moods";
import { DRINK_TAGS, getDrinkTag } from "@/lib/drinks";
import { SMOKE_SPOTS, getSmokeSpot } from "@/lib/smoke-spots";
import type { SmokeMood, SmokeSpot } from "@/lib/types";
import { BrandAutocomplete } from "@/components/BrandAutocomplete";
import { InstallBanner } from "@/components/InstallBanner";
import SmokeHeatmap from "@/components/SmokeHeatmap";

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-2xl transition-all ${
              star <= value ? "text-amber-500" : "text-gray-600"
            } hover:scale-110 active:scale-95`}
          >
            <FiStar fill={star <= value ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckinCard({ checkin, onDelete }: { checkin: Checkin; onDelete?: (id: string) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const date = new Date(checkin.created_at * 1000);
  const timeAgo = getTimeAgo(date);
  
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/checkin/${checkin.id}`;
    const shareText = checkin.rating 
      ? `I just smoked a ${checkin.brand}${checkin.product ? ` ${checkin.product}` : ''} and rated it ${checkin.rating}/5! 🚬`
      : `Check out this ${checkin.brand}${checkin.product ? ` ${checkin.product}` : ''} smoke session! 🚬`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${checkin.brand} - Puffed`,
          text: shareText,
          url: shareUrl,
        });
        setShareStatus("Shared!");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Link copied!");
      setTimeout(() => setShareStatus(null), 2000);
    } catch {
      setShareStatus("Failed");
      setTimeout(() => setShareStatus(null), 2000);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      // Reset after 3 seconds if not confirmed
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/checkins?id=${checkin.id}`, { method: "DELETE" });
      if (res.ok && onDelete) {
        onDelete(checkin.id);
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="glass rounded-2xl p-5"
    >
      {/* Image */}
      {checkin.image_url && (
        <div className="mb-3 -mx-5 -mt-5 rounded-t-2xl overflow-hidden">
          <img 
            src={checkin.image_url} 
            alt={checkin.brand}
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">{checkin.brand}</h3>
          {checkin.product && <p className="text-gray-400 text-sm">{checkin.product}</p>}
        </div>
        <div className="flex items-center gap-2">
          {checkin.rating && (
            <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-lg">
              <FiStar className="text-amber-500" fill="currentColor" />
              <span className="text-amber-500 font-semibold">{checkin.rating}</span>
            </div>
          )}
          <button
            onClick={handleShare}
            className="relative p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-green-400 transition-all"
            title="Share"
          >
            <FiShare2 size={16} />
            {shareStatus && (
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs bg-green-500 text-black px-2 py-0.5 rounded whitespace-nowrap">
                {shareStatus}
              </span>
            )}
          </button>
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`p-2 rounded-lg transition-all ${
                confirmDelete 
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
                  : "hover:bg-white/5 text-gray-500 hover:text-gray-300"
              }`}
              title={confirmDelete ? "Tap again to confirm" : "Delete check-in"}
            >
              <FiTrash2 size={16} className={deleting ? "animate-pulse" : ""} />
            </button>
          )}
        </div>
      </div>

      {checkin.review && (
        <p className="text-gray-300 text-sm mb-3">{checkin.review}</p>
      )}

      {/* Mood badge */}
      {checkin.mood && (() => {
        const moodTag = MOOD_TAGS.find(m => m.id === checkin.mood);
        if (!moodTag) return null;
        return (
          <div className="mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${moodTag.color}`}>
              {moodTag.emoji} {moodTag.label}
            </span>
          </div>
        );
      })()}

      {/* Drink pairing badge */}
      {checkin.drink_pairing && (() => {
        const drinkTag = getDrinkTag(checkin.drink_pairing);
        if (!drinkTag) return null;
        return (
          <div className="mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
              drinkTag.category === 'coffee' ? 'bg-amber-500/20 text-amber-400' :
              drinkTag.category === 'alcohol' ? 'bg-purple-500/20 text-purple-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {drinkTag.emoji} {drinkTag.name}
            </span>
          </div>
        );
      })()}

      {/* Smoke spot badge */}
      {checkin.smoke_spot && (() => {
        const spotTag = getSmokeSpot(checkin.smoke_spot);
        if (!spotTag) return null;
        return (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-cyan-500/20 text-cyan-400">
              {spotTag.emoji} {spotTag.label}
            </span>
          </div>
        );
      })()}

      {/* Category badge */}
      {checkin.category && checkin.category !== 'cigar' && (
        <div className="mb-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
            checkin.category === 'cannabis' ? 'bg-green-500/20 text-green-400' :
            checkin.category === 'hookah' ? 'bg-blue-500/20 text-blue-400' :
            'bg-purple-500/20 text-purple-400'
          }`}>
            {checkin.category === 'cannabis' ? '🌿' : checkin.category === 'hookah' ? '💨' : '🌫️'}
            {checkin.category.charAt(0).toUpperCase() + checkin.category.slice(1)}
          </span>
        </div>
      )}

      {/* Cannabis info */}
      {checkin.category === 'cannabis' && (
        <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-2">
          {checkin.strain_name && (
            <span className="flex items-center gap-1 text-green-400">
              🌿 {checkin.strain_name}
            </span>
          )}
          {checkin.strain_type && (
            <span className={`px-2 py-0.5 rounded-full ${
              checkin.strain_type === 'indica' ? 'bg-purple-500/20 text-purple-400' :
              checkin.strain_type === 'sativa' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-green-500/20 text-green-400'
            }`}>
              {checkin.strain_type === 'indica' ? '😴' : checkin.strain_type === 'sativa' ? '⚡' : '🔄'} {checkin.strain_type}
            </span>
          )}
          {checkin.thc_percent && (
            <span>THC: {checkin.thc_percent}%</span>
          )}
          {checkin.effects && (
            <span className="text-green-400/70">✨ {checkin.effects}</span>
          )}
        </div>
      )}

      {/* Cigar info */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-400">
        {checkin.draw_rating && (
          <span className="flex items-center gap-1">
            <FiWind /> Draw: {checkin.draw_rating}/5
          </span>
        )}
        {checkin.burn_rating && (
          <span className="flex items-center gap-1">
            <FiDroplet /> Burn: {checkin.burn_rating}/5
          </span>
        )}
        {checkin.aroma_rating && (
          <span className="flex items-center gap-1">
            <FiSmile /> Aroma: {checkin.aroma_rating}/5
          </span>
        )}
        {checkin.smoke_time_mins && (
          <span className="flex items-center gap-1">
            <FiClock /> {checkin.smoke_time_mins} min
          </span>
        )}
      </div>

      {/* Flavor tags */}
      {checkin.flavor_notes && (() => {
        try {
          const tags = JSON.parse(checkin.flavor_notes) as string[];
          if (tags.length > 0) {
            return (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.map(tagId => {
                  const tag = FLAVOR_TAGS.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <span
                      key={tagId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs"
                    >
                      <span>{tag.emoji}</span>
                      <span>{tag.label}</span>
                    </span>
                  );
                })}
              </div>
            );
          }
        } catch {
          return null;
        }
        return null;
      })()}

      <div className="mt-3 pt-3 border-t border-white/5 text-xs text-gray-500">
        {timeAgo}
      </div>
    </motion.div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return date.toLocaleDateString();
}

function getTimeSinceLastSmoke(timestamp: number | null | undefined): { text: string; emoji: string; urgency: 'fresh' | 'normal' | 'overdue' } {
  if (!timestamp) return { text: "No smokes yet", emoji: "🆕", urgency: 'normal' };
  
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  const hours = Math.floor(seconds / 3600);
  const days = Math.floor(hours / 24);
  
  if (seconds < 3600) { // Less than 1 hour
    const mins = Math.floor(seconds / 60);
    return { text: mins <= 1 ? "Just now" : `${mins}m ago`, emoji: "🔥", urgency: 'fresh' };
  }
  if (hours < 6) {
    return { text: `${hours}h ago`, emoji: "🚬", urgency: 'fresh' };
  }
  if (hours < 24) {
    return { text: `${hours}h ago`, emoji: "⏰", urgency: 'normal' };
  }
  if (days === 1) {
    return { text: "Yesterday", emoji: "📅", urgency: 'normal' };
  }
  if (days < 3) {
    return { text: `${days} days ago`, emoji: "💭", urgency: 'normal' };
  }
  if (days < 7) {
    return { text: `${days} days ago`, emoji: "🤔", urgency: 'overdue' };
  }
  return { text: `${days} days ago`, emoji: "😶", urgency: 'overdue' };
}

function getGreeting(username?: string): { message: string; emoji: string; subtext: string } {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  const name = username ? `, ${username}` : '';
  
  // Weekend vibes
  if (day === 0 || day === 6) {
    if (hour < 12) {
      return { message: `Weekend morning${name}`, emoji: "☀️", subtext: "Perfect time for a leisurely smoke" };
    }
    return { message: `Happy weekend${name}`, emoji: "🎉", subtext: "Enjoying some downtime?" };
  }
  
  // Weekday greetings by time
  if (hour < 5) {
    return { message: `Night owl${name}?`, emoji: "🦉", subtext: "Late night smoke session" };
  }
  if (hour < 9) {
    return { message: `Good morning${name}`, emoji: "🌅", subtext: "Rise and shine! Ready for that first smoke?" };
  }
  if (hour < 12) {
    return { message: `Morning${name}`, emoji: "☕", subtext: "Mid-morning break time" };
  }
  if (hour < 14) {
    return { message: `Hey${name}`, emoji: "🌤️", subtext: "Lunchtime smoke?" };
  }
  if (hour < 17) {
    return { message: `Good afternoon${name}`, emoji: "😎", subtext: "Afternoon smoke break" };
  }
  if (hour < 20) {
    return { message: `Good evening${name}`, emoji: "🌆", subtext: "Winding down with a smoke?" };
  }
  return { message: `Night${name}`, emoji: "🌙", subtext: "One more before bed?" };
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [badgeStats, setBadgeStats] = useState({ earned: 0, total: 0 });
  const [streak, setStreak] = useState({ current: 0, best: 0, active: false, freezeAvailable: true, freezeUsedToday: false });
  const [freezing, setFreezing] = useState(false);
  const [insights, setInsights] = useState<WeeklyInsights | null>(null);
  const [followingFeed, setFollowingFeed] = useState<Checkin[]>([]);
  const [followStats, setFollowStats] = useState({ following: 0, followers: 0 });
  const [communityActivity, setCommunityActivity] = useState<Activity[]>([]);
  const [recentBrands, setRecentBrands] = useState<RecentBrand[]>([]);
  const [dailyPrompt, setDailyPrompt] = useState<DailyPrompt | null>(null);
  const [promptResponses, setPromptResponses] = useState<PromptResponse[]>([]);
  const [hasRespondedToPrompt, setHasRespondedToPrompt] = useState(false);
  const [activeSmokers, setActiveSmokers] = useState<ActiveSmoker[]>([]);
  const [activeSmokersStats, setActiveSmokersStats] = useState({ activeNow: 0, smokersToday: 0, checkinsToday: 0 });
  const [weeklyRecap, setWeeklyRecap] = useState<WeeklyRecap | null>(null);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>([]);
  const [goalsCompleted, setGoalsCompleted] = useState(0);
  const [brandOfWeek, setBrandOfWeek] = useState<BrandOfWeek | null>(null);
  const [flavorRecs, setFlavorRecs] = useState<FlavorRecommendation[]>([]);
  const [userTopFlavors, setUserTopFlavors] = useState<string[]>([]);
  const [quickSmoking, setQuickSmoking] = useState<string | null>(null); // brand being quick-smoked
  const [quickSmokeSuccess, setQuickSmokeSuccess] = useState<string | null>(null);
  const [onboardingTasks, setOnboardingTasks] = useState<OnboardingTask[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingProgress, setOnboardingProgress] = useState({ completed: 0, total: 0 });
  const [communityMilestones, setCommunityMilestones] = useState<CommunityMilestonesResponse | null>(null);
  const [loungeData, setLoungeData] = useState<LoungeResponse | null>(null);
  const [morningData, setMorningData] = useState<MorningCoffeeResponse | null>(null);
  const [eveningData, setEveningData] = useState<EveningLoungeResponse | null>(null);
  const [midweekData, setMidweekData] = useState<{ isWednesday: boolean; weekProgress: number; communityStats: { smokesThisWeek: number; activeSmokersThisWeek: number }; motivationalMessage: string } | null>(null);
  const [firstSmokeData, setFirstSmokeData] = useState<{ claimed: boolean; winner?: { username: string; brand: string; time: string; timeAgo: string }; totalSmokesToday: number; dayOfWeek: string } | null>(null);
  const [nightThoughts, setNightThoughts] = useState<NightThought[]>([]);
  const [newThought, setNewThought] = useState("");
  const [submittingThought, setSubmittingThought] = useState(false);
  const [memories, setMemories] = useState<OnThisDayMemory[]>([]);
  const [suggestedFollows, setSuggestedFollows] = useState<SuggestedUser[]>([]);
  const [followingUser, setFollowingUser] = useState<string | null>(null);
  const [communityChallenge, setCommunityChallenge] = useState<CommunityChallenge | null>(null);
  const [dailyPoll, setDailyPoll] = useState<DailyPollData | null>(null);
  const [pollVoting, setPollVoting] = useState(false);
  const [tonightsPick, setTonightsPick] = useState<TonightsPick | null>(null);
  const [dailyTip, setDailyTip] = useState<DailyTip | null>(null);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallengeData | null>(null);
  const [communityGoals, setCommunityGoals] = useState<{ goals: { id: string; name: string; icon: string; target: number; current: number }[]; summary: { overallProgress: number; completedGoals: number; totalGoals: number; daysRemaining: number; encouragement: string } } | null>(null);
  const router = useRouter();

  // Quick Smoke handler - one-tap to log your go-to brand
  const handleQuickSmoke = async (brandName: string, productName?: string | null) => {
    if (quickSmoking) return; // Prevent double-tap
    
    setQuickSmoking(brandName);
    try {
      const res = await fetch("/api/quick-smoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          brand: brandName, 
          product: productName || undefined 
        }),
      });
      
      if (res.ok) {
        const data: { message?: string } = await res.json();
        setQuickSmokeSuccess(data.message || `⚡ Logged ${brandName}!`);
        // Refresh checkins
        const checkinsRes = await fetch("/api/checkins");
        if (checkinsRes.ok) {
          const checkinsData: CheckinsResponse = await checkinsRes.json();
          setCheckins(checkinsData.checkins || []);
        }
        // Update streak
        const streakRes = await fetch("/api/streak");
        if (streakRes.ok) {
          const streakData: StreakResponse = await streakRes.json();
          setStreak({ 
            current: streakData.currentStreak || 0, 
            best: streakData.bestStreak || 0, 
            active: streakData.streakActive || false,
            freezeAvailable: streakData.freezeAvailable ?? true,
            freezeUsedToday: streakData.freezeUsedToday ?? false
          });
        }
        // Clear success message after 3 seconds
        setTimeout(() => setQuickSmokeSuccess(null), 3000);
      } else {
        console.error("Quick smoke failed");
      }
    } catch (error) {
      console.error("Quick smoke error:", error);
    } finally {
      setQuickSmoking(null);
    }
  };

  // Submit a night thought
  const handleSubmitThought = async () => {
    if (!newThought.trim() || submittingThought) return;
    
    setSubmittingThought(true);
    try {
      const res = await fetch("/api/night-thoughts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thought: newThought.trim() }),
      });
      
      if (res.ok) {
        const data = await res.json() as { thought?: NightThought };
        if (data.thought) {
          setNightThoughts(prev => [data.thought!, ...prev]);
        }
        setNewThought("");
      } else {
        const errorData = await res.json() as { error?: string };
        alert(errorData.error || "Failed to share thought");
      }
    } catch (error) {
      console.error("Error submitting thought:", error);
    } finally {
      setSubmittingThought(false);
    }
  };

  // Form state
  const [category, setCategory] = useState<'cigar' | 'cannabis' | 'hookah' | 'vape' | 'snus'>('cigar');
  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  // Cigar fields
  const [drawRating, setDrawRating] = useState(0);
  const [burnRating, setBurnRating] = useState(0);
  const [aromaRating, setAromaRating] = useState(0);
  const [smokeTime, setSmokeTime] = useState("");
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  // Cannabis fields
  const [strainName, setStrainName] = useState("");
  const [strainType, setStrainType] = useState<'indica' | 'sativa' | 'hybrid' | ''>('');
  const [effects, setEffects] = useState("");
  const [thcPercent, setThcPercent] = useState("");
  // Mood (all categories)
  const [selectedMood, setSelectedMood] = useState<SmokeMood | ''>('');
  // Drink pairing
  const [selectedDrink, setSelectedDrink] = useState<string>('');
  // Smoke spot
  const [selectedSpot, setSelectedSpot] = useState<string>('');
  // Image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Success state for post-checkin celebration
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastCheckin, setLastCheckin] = useState<Checkin | null>(null);
  const [newlyEarnedBadges, setNewlyEarnedBadges] = useState<Badge[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        // Check auth
        const authRes = await fetch("/api/auth/me");
        const authData: MeResponse = await authRes.json();
        
        if (!authData.user) {
          router.push("/login");
          return;
        }
        
        setUser(authData.user);

        // Load check-ins
        const checkinsRes = await fetch("/api/checkins");
        const checkinsData: CheckinsResponse = await checkinsRes.json();
        setCheckins(checkinsData.checkins || []);

        // Load notification count
        const notifRes = await fetch("/api/notifications?countOnly=true");
        const notifData: NotificationCountResponse = await notifRes.json();
        setUnreadCount(notifData.unread_count || 0);

        // Load badges
        const badgesRes = await fetch("/api/badges");
        const badgesData: BadgesResponse = await badgesRes.json();
        setBadges(badgesData.badges || []);
        setBadgeStats({ earned: badgesData.earned_count || 0, total: badgesData.total_count || 0 });

        // Load streak
        const streakRes = await fetch("/api/streak");
        const streakData: StreakResponse = await streakRes.json();
        setStreak({ 
          current: streakData.currentStreak || 0, 
          best: streakData.bestStreak || 0,
          active: streakData.streakActive || false,
          freezeAvailable: streakData.freezeAvailable ?? true,
          freezeUsedToday: streakData.freezeUsedToday ?? false
        });

        // Load weekly insights
        const insightsRes = await fetch("/api/insights");
        if (insightsRes.ok) {
          const insightsData: WeeklyInsights = await insightsRes.json();
          setInsights(insightsData);
        }

        // Load following feed (check-ins from people you follow)
        const feedRes = await fetch("/api/feed?limit=5");
        if (feedRes.ok) {
          const feedData: FeedResponse = await feedRes.json();
          // Filter out user's own check-ins for the following feed
          const followingOnly = (feedData.checkins || []).filter(c => c.user_id !== authData.user?.id);
          setFollowingFeed(followingOnly);
          if (feedData.stats) {
            setFollowStats(feedData.stats);
          }
        }

        // Load community activity (global feed)
        const activityRes = await fetch("/api/activity?limit=10");
        if (activityRes.ok) {
          const activityData: ActivityResponse = await activityRes.json();
          // Filter out user's own activity
          const otherActivity = (activityData.activities || []).filter(a => a.user_id !== authData.user?.id);
          setCommunityActivity(otherActivity);
        }

        // Load daily prompt
        const promptRes = await fetch("/api/daily-prompt");
        if (promptRes.ok) {
          const promptData: DailyPromptResponse = await promptRes.json();
          setDailyPrompt(promptData.prompt);
          setPromptResponses(promptData.responses || []);
          setHasRespondedToPrompt(promptData.hasResponded);
        }

        // Load recent brands for quick re-log
        const recentBrandsRes = await fetch("/api/recent-brands?limit=5");
        if (recentBrandsRes.ok) {
          const recentBrandsData: RecentBrandsResponse = await recentBrandsRes.json();
          setRecentBrands(recentBrandsData.brands || []);
        }

        // Load active smokers (who's smoking now)
        const activeSmokersRes = await fetch("/api/active-smokers?hours=2&limit=8");
        if (activeSmokersRes.ok) {
          const activeSmokersData: ActiveSmokersResponse = await activeSmokersRes.json();
          setActiveSmokers(activeSmokersData.smokers || []);
          setActiveSmokersStats(activeSmokersData.stats || { activeNow: 0, smokersToday: 0, checkinsToday: 0 });
        }

        // Load late night lounge (only shows during night hours)
        const loungeRes = await fetch("/api/late-night-lounge");
        if (loungeRes.ok) {
          const loungeResData: LoungeResponse = await loungeRes.json();
          setLoungeData(loungeResData);
          
          // If lounge is open, also fetch night thoughts
          if (loungeResData.loungeOpen) {
            const thoughtsRes = await fetch("/api/night-thoughts");
            if (thoughtsRes.ok) {
              const thoughtsData: NightThoughtsResponse = await thoughtsRes.json();
              setNightThoughts(thoughtsData.thoughts || []);
            }
          }
        }

        // Load morning coffee (shows 5 AM - 10 AM)
        const morningRes = await fetch("/api/morning-coffee");
        if (morningRes.ok) {
          const morningResData: MorningCoffeeResponse = await morningRes.json();
          setMorningData(morningResData);
        }

        // Load evening lounge (shows 6 PM - 10 PM)
        const eveningRes = await fetch("/api/evening-lounge");
        if (eveningRes.ok) {
          const eveningResData: EveningLoungeResponse = await eveningRes.json();
          setEveningData(eveningResData);
        }

        // Load midweek momentum (Wednesday celebration)
        const midweekRes = await fetch("/api/midweek-momentum");
        if (midweekRes.ok) {
          const midweekResData = await midweekRes.json() as { isWednesday: boolean; weekProgress: number; communityStats: { smokesThisWeek: number; activeSmokersThisWeek: number }; motivationalMessage: string };
          setMidweekData(midweekResData);
        }

        // Load first smoke today data
        const firstSmokeRes = await fetch("/api/first-smoke-today");
        if (firstSmokeRes.ok) {
          const firstSmokeResData = await firstSmokeRes.json() as { claimed: boolean; winner?: { username: string; brand: string; time: string; timeAgo: string }; totalSmokesToday: number; dayOfWeek: string };
          setFirstSmokeData(firstSmokeResData);
        }

        // Load "On This Day" memories
        const memoriesRes = await fetch("/api/on-this-day");
        if (memoriesRes.ok) {
          const memoriesData: OnThisDayResponse = await memoriesRes.json();
          setMemories(memoriesData.memories || []);
        }

        // Load weekly recap (shows on weekends)
        const recapRes = await fetch("/api/weekly-recap");
        if (recapRes.ok) {
          const recapData: WeeklyRecap = await recapRes.json();
          setWeeklyRecap(recapData);
        }

        // Load weekly goals (Monday motivation!)
        const goalsRes = await fetch("/api/weekly-goals");
        if (goalsRes.ok) {
          const goalsData: WeeklyGoalsResponse = await goalsRes.json();
          setWeeklyGoals(goalsData.goals || []);
          setGoalsCompleted(goalsData.totalCompleted || 0);
        }

        // Load brand of the week challenge
        const bowRes = await fetch("/api/brand-of-week");
        if (bowRes.ok) {
          const bowData: BrandOfWeek = await bowRes.json();
          setBrandOfWeek(bowData);
        }

        // Load community challenge
        const challengeRes = await fetch("/api/community-challenge");
        if (challengeRes.ok) {
          const challengeData: CommunityChallenge = await challengeRes.json();
          setCommunityChallenge(challengeData);
        }

        // Load daily poll
        const pollRes = await fetch("/api/daily-poll");
        if (pollRes.ok) {
          const pollData: DailyPollData = await pollRes.json();
          setDailyPoll(pollData);
        }

        // Load tonight's pick (personalized recommendation)
        const pickRes = await fetch("/api/tonights-pick");
        if (pickRes.ok) {
          const pickData: TonightsPick = await pickRes.json();
          setTonightsPick(pickData);
        }

        // Load daily challenge
        const dailyChallengeRes = await fetch("/api/daily-challenge");
        if (dailyChallengeRes.ok) {
          const dailyChallengeData: DailyChallengeData = await dailyChallengeRes.json();
          setDailyChallenge(dailyChallengeData);
        }

        // Load flavor-based recommendations
        const flavorRes = await fetch("/api/flavor-recs");
        if (flavorRes.ok) {
          const flavorData: FlavorRecsResponse = await flavorRes.json();
          setFlavorRecs(flavorData.recommendations || []);
          setUserTopFlavors(flavorData.userTopFlavors || []);
        }

        // Load onboarding tasks (for new users)
        const onboardingRes = await fetch("/api/onboarding");
        if (onboardingRes.ok) {
          const onboardingData: OnboardingResponse = await onboardingRes.json();
          setOnboardingTasks(onboardingData.tasks || []);
          setShowOnboarding(onboardingData.showOnboarding || false);
          setOnboardingProgress({
            completed: onboardingData.completedCount || 0,
            total: onboardingData.totalCount || 0,
          });
        }

        // Load community milestones
        const milestonesRes = await fetch("/api/community-milestones");
        if (milestonesRes.ok) {
          const milestonesData: CommunityMilestonesResponse = await milestonesRes.json();
          setCommunityMilestones(milestonesData);
        }

        // Load community goals
        const communityGoalsRes = await fetch("/api/community-goals");
        if (communityGoalsRes.ok) {
          const communityGoalsData = await communityGoalsRes.json() as { 
            goals: { id: string; name: string; icon: string; target: number; current: number }[]; 
            summary: { overallProgress: number; completedGoals: number; totalGoals: number; daysRemaining: number; encouragement: string } 
          };
          setCommunityGoals(communityGoalsData);
        }

        // Load suggested follows (People Like You)
        const suggestedRes = await fetch("/api/suggested-follows");
        if (suggestedRes.ok) {
          const suggestedData: SuggestedFollowsResponse = await suggestedRes.json();
          setSuggestedFollows(suggestedData.suggestions || []);
        }
      } catch (error) {
        console.error("Load error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const toggleFlavor = (flavorId: string) => {
    setSelectedFlavors(prev => 
      prev.includes(flavorId) 
        ? prev.filter(f => f !== flavorId)
        : [...prev, flavorId]
    );
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    if (!brand.trim()) {
      setSubmitError("Please enter a brand name");
      return;
    }

    setSubmitting(true);
    
    // Capture earned badges before check-in for comparison
    const earnedBadgeIdsBefore = new Set(badges.filter(b => b.earned).map(b => b.id));

    try {
      let imageUrl: string | undefined;

      // Upload image first if present
      if (imageFile) {
        setUploading(true);
        try {
          const formData = new FormData();
          formData.append("file", imageFile);
          
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          
          if (uploadRes.ok) {
            const uploadData: UploadResponse = await uploadRes.json();
            imageUrl = uploadData.imageUrl;
          } else {
            const errData = await uploadRes.json().catch(() => ({}));
            setSubmitError((errData as { error?: string }).error || "Failed to upload image");
            setUploading(false);
            setSubmitting(false);
            return;
          }
        } catch (uploadErr) {
          console.error("Upload error:", uploadErr);
          setSubmitError("Network error uploading image");
          setUploading(false);
          setSubmitting(false);
          return;
        }
        setUploading(false);
      }

      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          brand,
          product: product || undefined,
          rating: rating || undefined,
          review: review || undefined,
          imageUrl,
          mood: selectedMood || undefined,
          smokeSpot: selectedSpot || undefined,
          drinkPairing: selectedDrink || undefined,
          // Cigar fields
          flavorNotes: category === 'cigar' && selectedFlavors.length > 0 ? JSON.stringify(selectedFlavors) : undefined,
          drawRating: category === 'cigar' ? (drawRating || undefined) : undefined,
          burnRating: category === 'cigar' ? (burnRating || undefined) : undefined,
          aromaRating: category === 'cigar' ? (aromaRating || undefined) : undefined,
          smokeTimeMins: smokeTime ? parseInt(smokeTime) : undefined,
          // Cannabis fields
          strainName: category === 'cannabis' ? (strainName || undefined) : undefined,
          strainType: category === 'cannabis' ? (strainType || undefined) : undefined,
          effects: category === 'cannabis' ? (effects || undefined) : undefined,
          thcPercent: category === 'cannabis' && thcPercent ? parseFloat(thcPercent) : undefined,
        }),
      });

      if (res.ok) {
        const result = await res.json() as { success: boolean; id: string };
        
        // Reload check-ins
        const checkinsRes = await fetch("/api/checkins");
        const checkinsData: CheckinsResponse = await checkinsRes.json();
        setCheckins(checkinsData.checkins || []);

        // Store the new checkin info for success screen
        setLastCheckin({ 
          id: result.id, 
          user_id: user?.id || '', 
          brand, 
          product: product || undefined, 
          rating: rating || undefined,
          created_at: Math.floor(Date.now() / 1000)
        });
        
        // Check for newly earned badges
        const badgesRes = await fetch("/api/badges");
        const badgesData: BadgesResponse = await badgesRes.json();
        if (badgesData.badges) {
          setBadges(badgesData.badges);
          setBadgeStats({ earned: badgesData.earned_count || 0, total: badgesData.total_count || 0 });
          // Find badges that are now earned but weren't before
          const newBadges = badgesData.badges.filter(b => b.earned && !earnedBadgeIdsBefore.has(b.id));
          setNewlyEarnedBadges(newBadges);
        }
        
        // Reset form fields
        setCategory('cigar');
        setBrand("");
        setProduct("");
        setRating(0);
        setReview("");
        // Cigar
        setSelectedFlavors([]);
        setDrawRating(0);
        setBurnRating(0);
        setAromaRating(0);
        setSmokeTime("");
        // Cannabis
        setStrainName("");
        setStrainType('');
        setEffects("");
        setThcPercent("");
        // Mood
        setSelectedMood('');
        // Drink
        setSelectedDrink('');
        // Smoke spot
        setSelectedSpot('');
        // Image
        setImageFile(null);
        setImagePreview(null);
        
        // Show success screen instead of just closing
        setShowForm(false);
        setShowSuccess(true);
      } else {
        // Handle API error response
        const errData = await res.json().catch(() => ({}));
        setSubmitError((errData as { error?: string }).error || "Failed to save check-in");
      }
    } catch (error) {
      console.error("Submit error:", error);
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full"
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        username={user?.username}
        unreadCount={unreadCount}
        onLogout={handleLogout}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-white/5 text-gray-400 md:hidden"
            >
              <FiMenu size={22} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <span className="text-lg">🚬</span>
            </div>
            <div>
              <h1 className="font-semibold">Puffed</h1>
              <p className="text-xs text-gray-400">@{user?.username}</p>
            </div>
          </div>
          {/* Desktop nav - hidden on mobile */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/discover"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
              title="Discover"
            >
              <FiCompass size={20} />
            </Link>
            <Link
              href="/hidden-gems"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-emerald-400 transition-all"
              title="Hidden Gems"
            >
              💎
            </Link>
            <Link
              href="/people"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-pink-400 transition-all"
              title="Discover People"
            >
              <FiUsers size={20} />
            </Link>
            <Link
              href="/spread-love"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-rose-400 transition-all"
              title="Spread the Love"
            >
              <FiHeart size={20} />
            </Link>
            <Link
              href="/twins"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-cyan-400 transition-all"
              title="Smoke Time Twins"
            >
              👯
            </Link>
            <Link
              href="/following"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-cyan-400 transition-all"
              title="Following Feed"
            >
              <FiRss size={20} />
            </Link>
            <Link
              href="/search"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
              title="Search"
            >
              <FiSearch size={20} />
            </Link>
            <Link
              href="/compare"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-green-400 transition-all"
              title="Compare Brands"
            >
              <FiLayers size={20} />
            </Link>
            <Link
              href="/smoke-spots"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-sky-400 transition-all"
              title="Smoke Spots Explorer"
            >
              <FiMapPin size={20} />
            </Link>
            <Link
              href="/wishlist"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-pink-400 transition-all"
              title="Want to Try"
            >
              <FiBookmark size={20} />
            </Link>
            <Link
              href="/humidor"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-amber-400 transition-all"
              title="My Humidor"
            >
              🗄️
            </Link>
            <Link
              href="/suggest"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-purple-400 transition-all"
              title="What to Smoke?"
            >
              <FiZap size={20} />
            </Link>
            <Link
              href="/roulette"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-fuchsia-400 transition-all"
              title="Smoke Roulette"
            >
              🎰
            </Link>
            <Link
              href="/mood-match"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-pink-400 transition-all"
              title="Mood Match - Cigars for your vibe"
            >
              🎯
            </Link>
            <Link
              href="/mystats"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-cyan-400 transition-all"
              title="My Stats"
            >
              <FiBarChart2 size={20} />
            </Link>
            <Link
              href="/smoke-oclock"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-amber-400 transition-all"
              title="Smoke O'Clock - When You Smoke"
            >
              🕐
            </Link>
            <Link
              href="/records"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-yellow-400 transition-all"
              title="Personal Records"
            >
              🏆
            </Link>
            <Link
              href="/milestones"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-orange-400 transition-all"
              title="Milestones"
            >
              <FiTarget size={20} />
            </Link>
            <Link
              href="/goals"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-emerald-400 transition-all"
              title="Community Goals"
            >
              🎯
            </Link>
            <Link
              href="/personality"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-purple-400 transition-all"
              title="Smoke Personality"
            >
              🔮
            </Link>
            <Link
              href="/calendar"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-emerald-400 transition-all"
              title="Smoke Calendar"
            >
              <FiCalendar size={20} />
            </Link>
            <Link
              href="/thursday-hub"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-violet-400 transition-all"
              title="Thursday Hub"
            >
              🍻
            </Link>
            <Link
              href="/friday-eve"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-pink-400 transition-all"
              title="Friday Eve - Weekend Countdown!"
            >
              🎉
            </Link>
            <Link
              href="/tgif"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-amber-400 transition-all"
              title="TGIF Lounge - Friday Night Party!"
            >
              🍺
            </Link>
            <Link
              href="/happy-hour"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-orange-400 transition-all"
              title="Happy Hour Club (5-8 PM)"
            >
              🕔
            </Link>
            <Link
              href="/wind-down"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-indigo-400 transition-all"
              title="Wind Down (9 PM - Midnight)"
            >
              🌙
            </Link>
            <Link
              href="/timer"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-rose-400 transition-all"
              title="Smoke Timer"
            >
              ⏱️
            </Link>
            <Link
              href="/heatmap"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-orange-400 transition-all"
              title="Activity Heatmap"
            >
              🔥
            </Link>
            <Link
              href="/leaderboard"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-amber-500 transition-all"
              title="Leaderboard"
            >
              <FiAward size={20} />
            </Link>
            <Link
              href="/achievements"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-yellow-500 transition-all"
              title="Achievement Showcase"
            >
              🏆
            </Link>
            <Link
              href="/brand-loyalty"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-amber-400 transition-all"
              title="Brand Loyalty"
            >
              💎
            </Link>
            <Link
              href="/throne"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-amber-400 transition-all"
              title="Throne Room"
            >
              👑
            </Link>
            <Link
              href="/conversations"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-cyan-400 transition-all"
              title="Hot Conversations"
            >
              💬
            </Link>
            <Link
              href="/battle"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-red-400 transition-all"
              title="Brand Battle"
            >
              🥊
            </Link>
            <Link
              href="/race"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-orange-400 transition-all"
              title="Today's Smoke Race"
            >
              🏁
            </Link>
            <Link
              href="/first-light"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-yellow-400 transition-all"
              title="First Light - First Smoke of the Day"
            >
              ☀️
            </Link>
            <Link
              href="/goodnight"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-indigo-400 transition-all"
              title="Goodnight Lounge - Last Smoke Before Bed"
            >
              😴
            </Link>
            <Link
              href="/midnight-society"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-purple-400 transition-all"
              title="Midnight Society - 12 AM - 2 AM Club"
            >
              🌑
            </Link>
            <Link
              href="/dead-of-night"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-indigo-400 transition-all"
              title="Dead of Night Diary - 2-5 AM"
            >
              📓
            </Link>
            <Link
              href="/roulette"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-purple-400 transition-all"
              title="Lucky Cigar"
            >
              🎰
            </Link>
            <Link
              href="/bingo"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-fuchsia-400 transition-all"
              title="Smoke Bingo - Weekly Challenges"
            >
              🎲
            </Link>
            <Link
              href="/fortune"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-amber-400 transition-all"
              title="Smoke Fortune - Daily Wisdom"
            >
              🥠
            </Link>
            <Link
              href="/time-capsule"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-violet-400 transition-all"
              title="Time Capsule - Messages to Future You"
            >
              📦
            </Link>
            <Link
              href="/pulse"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-pink-500 transition-all"
              title="Platform Pulse"
            >
              <FiActivity size={20} />
            </Link>
            <Link
              href="/gallery"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-pink-400 transition-all"
              title="Photo Gallery"
            >
              <FiCamera size={20} />
            </Link>
            <Link
              href="/flavor-dna"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-purple-400 transition-all"
              title="Your Flavor DNA"
            >
              🧬
            </Link>
            <Link
              href="/pairing-guide"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-purple-400 transition-all"
              title="Pairing Guide"
            >
              🥃
            </Link>
            <Link
              href="/mood"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-purple-400 transition-all"
              title="Mood Analytics"
            >
              🎭
            </Link>
            <Link
              href="/fortune"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-violet-400 transition-all"
              title="Smoke Fortune"
            >
              ✨
            </Link>
            <Link
              href="/tonight"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-indigo-400 transition-all"
              title="Tonight's Pick"
            >
              <FiMoon size={20} />
            </Link>
            <Link
              href="/invite"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-green-400 transition-all"
              title="Invite Friends"
            >
              <FiShare2 size={20} />
            </Link>
            <Link
              href="/rising-stars"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-yellow-400 transition-all"
              title="Rising Stars - New Active Members"
            >
              🌟
            </Link>
            <Link
              href="/dawn-patrol"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-orange-400 transition-all"
              title="Dawn Patrol - Early Bird Club (4-7 AM)"
            >
              🌅
            </Link>
            <Link
              href="/share"
              className="p-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-400 transition-all"
              title="Share Your Week"
            >
              📸
            </Link>
            <Link
              href="/notifications"
              className="relative p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <FiBell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-amber-500 text-black text-xs font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/settings"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <FiSettings size={20} />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <FiLogOut size={20} />
            </button>
          </div>
          {/* Mobile quick actions - only essential items */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/notifications"
              className="relative p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <FiBell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] bg-amber-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/discover"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <FiCompass size={20} />
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Personalized Greeting */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            {(() => {
              const greeting = getGreeting(user.username);
              return (
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{greeting.emoji}</span>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{greeting.message}</h2>
                    <p className="text-xs text-gray-400">{greeting.subtext}</p>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* Getting Started Checklist - Shows for new users */}
        {showOnboarding && onboardingTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.02 }}
            className="glass rounded-2xl p-5 mb-6 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚀</span>
                <div>
                  <h2 className="text-sm font-medium text-emerald-400">Getting Started</h2>
                  <p className="text-xs text-gray-500">{onboardingProgress.completed}/{onboardingProgress.total} complete</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(onboardingProgress.completed / onboardingProgress.total) * 100}%` }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              {onboardingTasks.map((task, idx) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                    task.completed 
                      ? 'bg-emerald-500/10' 
                      : 'bg-white/5 hover:bg-white/10 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (!task.completed && task.action) {
                      if (task.action === 'log_smoke') {
                        setShowForm(true);
                      } else {
                        router.push(task.action);
                      }
                    }
                  }}
                >
                  <span className={`text-lg ${task.completed ? '' : 'grayscale opacity-50'}`}>
                    {task.emoji}
                  </span>
                  <span className={`flex-1 text-sm ${
                    task.completed ? 'text-emerald-400 line-through opacity-70' : 'text-gray-300'
                  }`}>
                    {task.label}
                  </span>
                  {task.completed ? (
                    <span className="text-emerald-500 text-xs font-medium">✓ Done</span>
                  ) : (
                    <span className="text-xs text-gray-500">→</span>
                  )}
                </motion.div>
              ))}
            </div>

            {onboardingProgress.completed >= 3 && onboardingProgress.completed < onboardingProgress.total && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-emerald-400/70 mt-3 text-center"
              >
                🎉 Almost there! Just {onboardingProgress.total - onboardingProgress.completed} more to go!
              </motion.p>
            )}
          </motion.div>
        )}

        {/* Community Milestones 🏆 */}
        {communityMilestones && communityMilestones.platform.currentMilestone && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.025 }}
            className={`glass rounded-2xl p-5 mb-6 border ${
              communityMilestones.platform.justAchieved 
                ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/10' 
                : 'border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-blue-500/5'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{communityMilestones.platform.currentMilestone.emoji}</span>
                <div>
                  <h2 className={`text-sm font-medium ${
                    communityMilestones.platform.justAchieved ? 'text-amber-400' : 'text-cyan-400'
                  }`}>
                    {communityMilestones.platform.justAchieved ? '🎉 Milestone Reached!' : 'Community Progress'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {communityMilestones.platform.currentMilestone.title}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${
                  communityMilestones.platform.justAchieved ? 'text-amber-400' : 'text-cyan-400'
                }`}>
                  {communityMilestones.platform.totalCheckins}
                </p>
                <p className="text-xs text-gray-500">total smokes</p>
              </div>
            </div>

            {/* Celebration message for just achieved */}
            {communityMilestones.platform.justAchieved && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-500/20 rounded-lg p-3 mb-3 text-center"
              >
                <p className="text-sm text-amber-300">
                  {communityMilestones.platform.currentMilestone.message}
                </p>
                <p className="text-xs text-amber-400/70 mt-1">
                  🙌 Thanks for being part of this!
                </p>
              </motion.div>
            )}

            {/* Progress to next milestone */}
            {communityMilestones.platform.nextMilestone && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Next: {communityMilestones.platform.nextMilestone.title}</span>
                  <span>{communityMilestones.platform.totalCheckins}/{communityMilestones.platform.nextMilestone.count}</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${communityMilestones.platform.progress}%` }}
                    transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      communityMilestones.platform.justAchieved 
                        ? 'bg-gradient-to-r from-amber-500 to-orange-400' 
                        : 'bg-gradient-to-r from-cyan-500 to-blue-400'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Top Contributors */}
            {communityMilestones.platform.topContributors.length > 0 && (
              <div className="pt-3 border-t border-white/5">
                <p className="text-xs text-gray-500 mb-2">🏆 Top Contributors</p>
                <div className="flex gap-3">
                  {communityMilestones.platform.topContributors.map((contributor, idx) => (
                    <Link
                      key={contributor.username}
                      href={`/user/${contributor.username}`}
                      className="flex items-center gap-1.5 text-sm hover:text-amber-400 transition-colors"
                    >
                      <span className="text-base">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                      <span className="text-gray-300">@{contributor.username}</span>
                      <span className="text-gray-500 text-xs">({contributor.count})</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Platform stats row */}
            <div className="pt-3 mt-3 border-t border-white/5 flex justify-around text-center">
              <div>
                <p className="text-lg font-bold text-gray-300">{communityMilestones.platform.totalUsers}</p>
                <p className="text-xs text-gray-500">Smokers</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-300">{communityMilestones.platform.totalBrands}</p>
                <p className="text-xs text-gray-500">Brands</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-300">
                  {(communityMilestones.platform.totalCheckins / Math.max(communityMilestones.platform.totalUsers, 1)).toFixed(1)}
                </p>
                <p className="text-xs text-gray-500">Per User</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Community Goals 🎯🌐 */}
        {communityGoals && communityGoals.summary && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.03 }}
            className="glass rounded-2xl p-5 mb-6 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <div>
                  <h2 className="text-sm font-medium text-emerald-400">Community Goals</h2>
                  <p className="text-xs text-gray-500">{communityGoals.summary.daysRemaining} days left this week</p>
                </div>
              </div>
              <Link
                href="/goals"
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View all →
              </Link>
            </div>

            {/* Overall progress ring */}
            <div className="flex items-center gap-4 mb-3">
              <div className="relative w-16 h-16">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-zinc-800" />
                  <circle
                    cx="32" cy="32" r="28" stroke="url(#goalsGradient)" strokeWidth="4" fill="transparent"
                    strokeDasharray={`${communityGoals.summary.overallProgress * 1.76} 176`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="goalsGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-white">{communityGoals.summary.overallProgress}%</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-emerald-400">{communityGoals.summary.encouragement}</p>
                <p className="text-xs text-gray-500 mt-1">{communityGoals.summary.completedGoals}/{communityGoals.summary.totalGoals} goals complete</p>
              </div>
            </div>

            {/* Mini goal cards */}
            <div className="grid grid-cols-2 gap-2">
              {communityGoals.goals.slice(0, 4).map((goal) => {
                const progress = Math.min((goal.current / goal.target) * 100, 100);
                const isComplete = goal.current >= goal.target;
                return (
                  <div key={goal.id} className={`rounded-lg p-2 ${isComplete ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-white/5'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">{goal.icon}</span>
                      <span className="text-xs text-gray-300 truncate">{goal.name}</span>
                      {isComplete && <span className="text-emerald-400">✓</span>}
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{goal.current}/{goal.target}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 mb-6"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm text-gray-400">Your Stats</h2>
            <Link
              href="/mystats"
              className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
            >
              See detailed stats →
            </Link>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-3xl font-bold text-amber-500">{checkins.length}</p>
              <p className="text-xs text-gray-400">Check-ins</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-500">
                {checkins.length > 0
                  ? (checkins.filter(c => c.rating).reduce((sum, c) => sum + (c.rating || 0), 0) / checkins.filter(c => c.rating).length || 0).toFixed(1)
                  : "0"}
              </p>
              <p className="text-xs text-gray-400">Avg Rating</p>
            </div>
            {/* Streak */}
            <div className="ml-auto text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className={`text-3xl font-bold ${streak.active ? 'text-orange-500' : 'text-gray-500'}`}>
                  {streak.current}
                </span>
                <span className="text-2xl">{streak.active ? '🔥' : '❄️'}</span>
              </div>
              <p className="text-xs text-gray-400">
                {streak.active ? 'Day Streak' : 'Streak Frozen'}
              </p>
              {streak.best > 0 && streak.best > streak.current && (
                <p className="text-xs text-gray-500">Best: {streak.best} days</p>
              )}
            </div>
          </div>
          {/* Time Since Last Smoke */}
          {(() => {
            const lastSmoke = getTimeSinceLastSmoke(user?.last_smoke_at);
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-3 pt-3 border-t border-white/5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{lastSmoke.emoji}</span>
                    <div>
                      <p className="text-sm text-gray-300">Last smoke: <span className={`font-medium ${
                        lastSmoke.urgency === 'fresh' ? 'text-green-400' :
                        lastSmoke.urgency === 'overdue' ? 'text-amber-500' :
                        'text-gray-400'
                      }`}>{lastSmoke.text}</span></p>
                    </div>
                  </div>
                  {lastSmoke.urgency === 'overdue' && (
                    <button
                      onClick={() => setShowForm(true)}
                      className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-500 text-xs font-medium hover:bg-amber-500/30 transition-all"
                    >
                      Log one now
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })()}
          {/* Streak encouragement */}
          {streak.current > 0 && streak.active && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-3 pt-3 border-t border-white/5 text-sm"
            >
              <span className="text-gray-400">
                {streak.current === 1 && "🌟 Great start! Log tomorrow to build your streak!"}
                {streak.current === 2 && "⚡ Two days in a row! Keep it going!"}
                {streak.current >= 3 && streak.current < 7 && `💪 ${streak.current} days strong! You're on fire!`}
                {streak.current >= 7 && streak.current < 14 && `🏆 A whole week! You're a true enthusiast!`}
                {streak.current >= 14 && streak.current < 30 && `👑 ${streak.current} days! You're legendary!`}
                {streak.current >= 30 && `🔥 ${streak.current} days! Unstoppable!`}
              </span>
            </motion.div>
          )}
          {!streak.active && checkins.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-3 pt-3 border-t border-white/5 text-sm text-gray-500"
            >
              <span>❄️ Log a smoke today to start a new streak!</span>
            </motion.div>
          )}
        </motion.div>

        {/* Quick Smoke Success Toast */}
        <AnimatePresence>
          {quickSmokeSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-black px-4 py-2 rounded-full text-sm font-medium shadow-lg"
            >
              {quickSmokeSuccess}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tonight's Pick 🎯 - Personalized Recommendation */}
        {tonightsPick && tonightsPick.brand !== "Your First Pick" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.025 }}
            className="glass rounded-2xl p-5 mb-6 border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-blue-500/5"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-cyan-400 flex items-center gap-2">
                <FiTarget className="text-cyan-500" size={14} />
                Tonight&apos;s Pick
              </h2>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                tonightsPick.confidence === 'perfect' ? 'bg-cyan-500/20 text-cyan-400' :
                tonightsPick.confidence === 'strong' ? 'bg-blue-500/20 text-blue-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {tonightsPick.confidence === 'perfect' ? '🎯 Perfect Match' : 
                 tonightsPick.confidence === 'strong' ? '💪 Strong Pick' : '👍 Good Choice'}
              </span>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-3xl border border-cyan-500/30">
                {tonightsPick.reasonEmoji}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-white truncate">{tonightsPick.brand}</h3>
                {tonightsPick.product && (
                  <p className="text-sm text-gray-400 truncate">{tonightsPick.product}</p>
                )}
                <p className="text-xs text-cyan-400 mt-1">{tonightsPick.reason}</p>
                
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  {tonightsPick.avgRating && (
                    <span className="flex items-center gap-1">
                      <FiStar size={10} className="text-amber-500" fill="currentColor" />
                      Your avg: {tonightsPick.avgRating.toFixed(1)}
                    </span>
                  )}
                  {tonightsPick.timesSmoked > 0 && (
                    <span>×{tonightsPick.timesSmoked} times</span>
                  )}
                  {tonightsPick.lastSmoked && (
                    <span>{getTimeAgo(new Date(tonightsPick.lastSmoked))}</span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-400 mt-3 italic">
              &ldquo;{tonightsPick.suggestion}&rdquo;
            </p>

            {/* Flavor profile tags */}
            {tonightsPick.flavorProfile.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {tonightsPick.flavorProfile.slice(0, 4).map(flavor => {
                  const tag = getFlavorTag(flavor);
                  return (
                    <span key={flavor} className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {tag?.emoji || '🌿'} {tag?.label || flavor}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setBrand(tonightsPick.brand);
                  if (tonightsPick.product) setProduct(tonightsPick.product);
                  setShowForm(true);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <FiPlus size={16} />
                Log This Smoke
              </button>
              <Link
                href={`/cigar/${encodeURIComponent(tonightsPick.brand)}`}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all flex items-center"
              >
                <FiCompass size={16} />
              </Link>
            </div>

            {/* Alternatives */}
            {tonightsPick.alternatives.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <p className="text-xs text-gray-500 mb-2">Also consider:</p>
                <div className="flex gap-2">
                  {tonightsPick.alternatives.map(alt => (
                    <button
                      key={alt.brand}
                      onClick={() => {
                        setBrand(alt.brand);
                        setShowForm(true);
                      }}
                      className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all truncate max-w-[150px]"
                      title={alt.reason}
                    >
                      {alt.brand}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Quick Smoke Section ⚡ */}
        {recentBrands.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 }}
            className="glass rounded-2xl p-5 mb-6 border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-amber-400 flex items-center gap-2">
                <FiZap className="text-amber-500" size={14} />
                Quick Smoke
              </h2>
              <span className="text-xs text-amber-500/70">One-tap log</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {recentBrands.map((rb) => (
                <div key={rb.brand} className="flex-shrink-0 group relative">
                  {/* Quick smoke button - one tap to log */}
                  <button
                    onClick={() => handleQuickSmoke(rb.brand, rb.product)}
                    disabled={quickSmoking === rb.brand}
                    className={`w-20 h-20 rounded-xl border transition-all overflow-hidden flex items-center justify-center ${
                      quickSmoking === rb.brand 
                        ? 'bg-amber-500/20 border-amber-500/50 animate-pulse' 
                        : 'bg-white/5 border-white/10 group-hover:border-amber-500/50 group-hover:bg-amber-500/10'
                    }`}
                  >
                    {quickSmoking === rb.brand ? (
                      <span className="text-2xl animate-bounce">⚡</span>
                    ) : rb.last_image ? (
                      <img 
                        src={rb.last_image} 
                        alt={rb.brand}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">🚬</span>
                    )}
                  </button>
                  <div className="mt-1.5 text-center">
                    <p className="text-xs font-medium truncate w-20">{rb.brand}</p>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500">
                      {rb.last_rating && (
                        <span className="flex items-center gap-0.5">
                          <FiStar size={8} className="text-amber-500" fill="currentColor" />
                          {rb.last_rating}
                        </span>
                      )}
                      <span>×{rb.times_smoked}</span>
                    </div>
                  </div>
                  {/* Long-press hint on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBrand(rb.brand);
                      if (rb.product) setProduct(rb.product);
                      setShowForm(true);
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-stone-700 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] hover:bg-amber-500 hover:text-black"
                    title="Add details"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-500/50 mt-3 text-center">
              ⚡ Tap to instantly log • Hover + tap <span className="bg-stone-700 px-1 rounded">+</span> for details
            </p>
          </motion.div>
        )}

        {/* Weekly Recap Section (shows on weekends) */}
        {weeklyRecap && weeklyRecap.isSunday && weeklyRecap.weekStats.checkins > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.045 }}
            className="glass rounded-2xl p-5 mb-6 border border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-indigo-500/5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎉</span>
                <div>
                  <h2 className="text-sm font-medium text-purple-400">Your Week in Smoke</h2>
                  <p className="text-xs text-gray-500">Weekly recap</p>
                </div>
              </div>
              <Link
                href="/share"
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5"
              >
                📸 Share Card
              </Link>
            </div>

            {/* Week Stats Grid */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-400">{weeklyRecap.weekStats.checkins}</p>
                <p className="text-xs text-gray-500">Smokes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-400">{weeklyRecap.weekStats.uniqueBrands}</p>
                <p className="text-xs text-gray-500">Brands</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-pink-400">
                  {weeklyRecap.weekStats.avgRating ? weeklyRecap.weekStats.avgRating.toFixed(1) : '-'}
                </p>
                <p className="text-xs text-gray-500">Avg ⭐</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">
                  {weeklyRecap.engagement.likesReceived + weeklyRecap.engagement.reactionsReceived + weeklyRecap.engagement.commentsReceived}
                </p>
                <p className="text-xs text-gray-500">Engaged</p>
              </div>
            </div>

            {/* Highlights */}
            {weeklyRecap.highlights.length > 0 && (
              <div className="space-y-1.5 mb-4">
                {weeklyRecap.highlights.map((highlight, idx) => (
                  <p key={idx} className="text-xs text-gray-400">{highlight}</p>
                ))}
              </div>
            )}

            {/* Top Brand */}
            {weeklyRecap.weekStats.topBrand && (
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👑</span>
                  <span className="text-sm text-gray-300">Fave this week:</span>
                </div>
                <Link
                  href={`/brand/${encodeURIComponent(weeklyRecap.weekStats.topBrand)}`}
                  className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {weeklyRecap.weekStats.topBrand} ({weeklyRecap.weekStats.topBrandCount}×)
                </Link>
              </div>
            )}

            {/* New Brands Tried */}
            {weeklyRecap.weekStats.newBrands.length > 0 && (
              <div className="pt-3 mt-3 border-t border-white/5">
                <p className="text-xs text-gray-500 mb-2">✨ New brands explored:</p>
                <div className="flex flex-wrap gap-2">
                  {weeklyRecap.weekStats.newBrands.map((brand, idx) => (
                    <Link
                      key={idx}
                      href={`/brand/${encodeURIComponent(brand)}`}
                      className="px-2 py-1 rounded-full bg-white/5 text-xs text-gray-300 hover:bg-white/10 transition-colors"
                    >
                      {brand}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Top Check-in */}
            {weeklyRecap.topCheckin && (weeklyRecap.topCheckin.likes > 0 || weeklyRecap.topCheckin.reactions > 0 || weeklyRecap.topCheckin.comments > 0) && (
              <div className="pt-3 mt-3 border-t border-white/5">
                <p className="text-xs text-gray-500 mb-2">🔥 Your top post:</p>
                <Link
                  href={`/checkin/${weeklyRecap.topCheckin.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                >
                  {weeklyRecap.topCheckin.imageUrl ? (
                    <img 
                      src={weeklyRecap.topCheckin.imageUrl} 
                      alt={weeklyRecap.topCheckin.brand}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-xl">
                      🚬
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-200">{weeklyRecap.topCheckin.brand}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {weeklyRecap.topCheckin.rating && (
                        <span className="flex items-center gap-0.5">
                          <FiStar size={10} className="text-amber-500" fill="currentColor" />
                          {weeklyRecap.topCheckin.rating}
                        </span>
                      )}
                      <span>❤️ {weeklyRecap.topCheckin.likes}</span>
                      <span>⚡ {weeklyRecap.topCheckin.reactions}</span>
                      <span>💬 {weeklyRecap.topCheckin.comments}</span>
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </motion.div>
        )}

        {/* Badges Section */}
        {badges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass rounded-2xl p-5 mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FiAward className="text-amber-500" />
                <h2 className="text-sm text-gray-400">Badges</h2>
              </div>
              <span className="text-xs text-gray-500">{badgeStats.earned}/{badgeStats.total} earned</span>
            </div>
            
            {/* Earned badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {badges.filter(b => b.earned).map(badge => (
                <div
                  key={badge.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30"
                  title={badge.description}
                >
                  <span className="text-lg">{badge.emoji}</span>
                  <span className="text-xs font-medium text-amber-500">{badge.name}</span>
                </div>
              ))}
              {badges.filter(b => b.earned).length === 0 && (
                <p className="text-xs text-gray-500">No badges earned yet. Keep smoking! 🔥</p>
              )}
            </div>

            {/* Next badge to unlock */}
            {badges.filter(b => !b.earned).length > 0 && (
              <div className="pt-3 border-t border-white/5">
                <p className="text-xs text-gray-500 mb-2">Next up:</p>
                {(() => {
                  const nextBadge = badges.find(b => !b.earned && b.progress !== undefined);
                  if (!nextBadge) return null;
                  const progressPct = Math.min(100, Math.round((nextBadge.progress! / nextBadge.target!) * 100));
                  return (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl grayscale opacity-50">{nextBadge.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-300">{nextBadge.name}</span>
                          <span className="text-xs text-gray-500">{nextBadge.progress}/{nextBadge.target}</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{nextBadge.description}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </motion.div>
        )}

        {/* Smoke Calendar Heatmap */}
        <div className="mb-6">
          <SmokeHeatmap />
        </div>

        {/* Smoking Now Section - Who's active */}
        {activeSmokers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.052 }}
            className="glass rounded-2xl p-5 mb-6 border border-green-500/20"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="relative">
                  <span className="text-lg">🟢</span>
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </span>
                <div>
                  <h2 className="text-sm font-medium text-green-400">Smoking Now</h2>
                  <p className="text-xs text-gray-500">
                    {activeSmokersStats.smokersToday} smoker{activeSmokersStats.smokersToday !== 1 ? 's' : ''} today • {activeSmokersStats.checkinsToday} check-in{activeSmokersStats.checkinsToday !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <span className="text-xs text-green-400 animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Live
              </span>
            </div>

            {/* Active smokers horizontal scroll */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {activeSmokers.map((smoker, idx) => (
                <Link
                  key={`${smoker.user_id}-${smoker.checkin_id}`}
                  href={`/checkin/${smoker.checkin_id}`}
                  className="flex-shrink-0 group"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="relative w-24 h-24 rounded-xl bg-white/5 border border-green-500/30 group-hover:border-green-500 transition-all overflow-hidden"
                  >
                    {smoker.image_url ? (
                      <img 
                        src={smoker.image_url} 
                        alt={smoker.brand}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        🚬
                      </div>
                    )}
                    {/* Smoke animation overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    {/* Time badge */}
                    <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-green-500/80 text-black text-[10px] font-medium">
                      {smoker.minutes_ago < 1 ? 'now' : `${smoker.minutes_ago}m`}
                    </div>
                    {/* Rating if available */}
                    {smoker.rating && (
                      <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/80 text-black text-[10px] font-medium">
                        <FiStar size={8} fill="currentColor" />
                        {smoker.rating}
                      </div>
                    )}
                    {/* User info */}
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-xs font-medium text-white truncate">@{smoker.username}</p>
                      <p className="text-[10px] text-gray-300 truncate">{smoker.brand}</p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>

            {activeSmokers.length > 0 && (
              <p className="text-xs text-gray-500 mt-3 text-center">
                🤝 Join them! Log a smoke to show up here
              </p>
            )}
          </motion.div>
        )}

        {/* Late Night Lounge - Only visible during night hours (10 PM - 4 AM) */}
        {loungeData?.loungeOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.053 }}
            className="glass rounded-2xl p-5 mb-6 border border-indigo-500/30 bg-gradient-to-br from-indigo-900/20 to-purple-900/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="text-2xl">{loungeData.vibes.emoji}</span>
                  <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-indigo-300">Late Night Lounge</h2>
                  <p className="text-xs text-purple-400">{loungeData.vibes.message}</p>
                </div>
              </div>
              <Link 
                href="/leaderboard" 
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                🦉 Night Owls
              </Link>
            </div>

            {/* Night stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 rounded-xl bg-white/5">
                <div className="text-lg font-bold text-indigo-300">{loungeData.stats.yourNightSmokes}</div>
                <div className="text-[10px] text-gray-500">Your Night Smokes</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/5">
                <div className="text-lg font-bold text-purple-300">{loungeData.stats.loungeMembers}</div>
                <div className="text-[10px] text-gray-500">Night Owls</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/5">
                <div className="text-lg font-bold text-pink-300">{loungeData.stats.nightOwlPercentile}%</div>
                <div className="text-[10px] text-gray-500">Percentile</div>
              </div>
            </div>

            {/* Active night owls */}
            {loungeData.nightOwls.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">🌙 Fellow night owls recently:</p>
                <div className="flex flex-wrap gap-2">
                  {loungeData.nightOwls.slice(0, 6).map((owl) => (
                    <Link
                      key={owl.username}
                      href={`/user/${owl.username}`}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                        owl.isActive 
                          ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/50" 
                          : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {owl.isActive && <span className="mr-1">🦉</span>}
                      @{owl.username}
                      <span className="ml-1 text-gray-500">{owl.lastSmoke}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {loungeData.nightOwls.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-2">
                🌙 You&apos;re the first night owl! Log a smoke to join the lounge.
              </p>
            )}

            {/* Night Thoughts - Share your late night reflections */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-gray-500 mb-3">💭 Night Thoughts</p>
              
              {/* Submit form */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newThought}
                  onChange={(e) => setNewThought(e.target.value.slice(0, 140))}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitThought()}
                  placeholder="What's on your mind tonight?"
                  className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 border border-white/10 focus:border-indigo-500/50 focus:outline-none"
                  maxLength={140}
                  disabled={submittingThought}
                />
                <button
                  onClick={handleSubmitThought}
                  disabled={!newThought.trim() || submittingThought}
                  className="px-3 py-2 bg-indigo-500/30 text-indigo-300 rounded-lg text-sm hover:bg-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {submittingThought ? "..." : "Share"}
                </button>
              </div>
              <p className="text-[10px] text-gray-600 mb-3">{newThought.length}/140</p>

              {/* Thoughts list */}
              {nightThoughts.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {nightThoughts.slice(0, 8).map((thought) => (
                    <div 
                      key={thought.id} 
                      className="bg-white/5 rounded-lg p-3 border border-white/5"
                    >
                      <p className="text-sm text-gray-300 leading-relaxed">&ldquo;{thought.thought}&rdquo;</p>
                      <div className="flex justify-between items-center mt-2">
                        <Link 
                          href={`/user/${thought.username}`}
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          @{thought.username}
                        </Link>
                        <span className="text-[10px] text-gray-600">{thought.timeAgo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-600 text-center py-2 italic">
                  No thoughts shared yet tonight. Be the first! 🌙
                </p>
              )}
              
              {/* View all link */}
              <div className="mt-3 pt-3 border-t border-white/5 flex justify-center gap-4">
                <Link 
                  href="/night-thoughts"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  View all thoughts →
                </Link>
                <Link 
                  href="/witching-hour"
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  🕯️ Witching Hour
                </Link>
                <Link 
                  href="/twilight-zone"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  🌌 Twilight Zone
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* On This Day - Memories Section */}
        {memories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.053 }}
            className="glass rounded-2xl p-5 mb-6 border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-pink-900/20"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📸</span>
              <div>
                <h2 className="text-sm font-medium text-purple-300">On This Day</h2>
                <p className="text-xs text-pink-400">Your smoking memories</p>
              </div>
            </div>

            <div className="space-y-4">
              {memories.map((memory) => (
                <div key={memory.period} className="p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{memory.emoji}</span>
                    <span className="text-xs text-purple-300 font-medium">{memory.label}</span>
                  </div>
                  <div className="space-y-2">
                    {memory.checkins.map((checkin) => (
                      <Link
                        key={checkin.id}
                        href={`/checkin/${checkin.id}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-all group"
                      >
                        {checkin.image_url ? (
                          <img 
                            src={checkin.image_url} 
                            alt={checkin.brand}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <span className="text-lg">🚬</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-purple-300 transition-colors">
                            {checkin.brand}
                          </p>
                          {checkin.product && (
                            <p className="text-xs text-gray-500 truncate">{checkin.product}</p>
                          )}
                        </div>
                        {checkin.rating && (
                          <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded text-xs">
                            <FiStar className="text-amber-500" size={10} fill="currentColor" />
                            <span className="text-amber-500">{checkin.rating}</span>
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 text-center">
              <p className="text-xs text-purple-400/80 italic">
                ✨ Every smoke tells a story
              </p>
            </div>
          </motion.div>
        )}

        {/* Morning Coffee Section - Early Bird Lounge */}
        {morningData?.loungeOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.054 }}
            className="glass rounded-2xl p-5 mb-6 border border-amber-500/30 bg-gradient-to-br from-amber-900/20 to-orange-900/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="text-2xl">{morningData.vibes.emoji}</span>
                  <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-amber-300">Morning Coffee ☕</h2>
                  <p className="text-xs text-orange-400">{morningData.vibes.message}</p>
                </div>
              </div>
              <span className="text-xs text-amber-400/60">5 AM - 10 AM</span>
            </div>

            {/* Morning stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 rounded-xl bg-white/5">
                <div className="text-lg font-bold text-amber-300">{morningData.stats.yourMorningSmokes}</div>
                <div className="text-[10px] text-gray-500">Your AM Smokes</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/5">
                <div className="text-lg font-bold text-orange-300">{morningData.stats.morningRisers}</div>
                <div className="text-[10px] text-gray-500">Early Birds</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/5">
                <div className="text-lg font-bold text-yellow-300">{morningData.stats.earlyBirdPercentile}%</div>
                <div className="text-[10px] text-gray-500">Percentile</div>
              </div>
            </div>

            {/* Active early birds */}
            {morningData.earlyBirds.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">🌅 Fellow early risers:</p>
                <div className="flex flex-wrap gap-2">
                  {morningData.earlyBirds.slice(0, 6).map((bird) => (
                    <Link
                      key={bird.username}
                      href={`/user/${bird.username}`}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                        bird.isActive 
                          ? "bg-amber-500/30 text-amber-300 border border-amber-500/50" 
                          : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {bird.isActive && <span className="mr-1">☕</span>}
                      @{bird.username}
                      <span className="ml-1 text-gray-500">{bird.lastSmoke}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {morningData.earlyBirds.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-2">
                ☕ Be the first early bird! Log a smoke to join the morning crew.
              </p>
            )}

            {/* Morning motivation + link to full page */}
            <div className="mt-4 pt-4 border-t border-white/10 text-center">
              <p className="text-xs text-amber-400/80 italic mb-2">
                &quot;The early bird catches the smoke&quot; 🌄
              </p>
              <Link 
                href="/coffee"
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                View Morning Coffee Lounge →
              </Link>
            </div>
          </motion.div>
        )}

        {/* Evening Lounge Section - Sunset Smokers */}
        {eveningData?.loungeOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.054 }}
            className="glass rounded-2xl p-5 mb-6 border border-orange-500/30 bg-gradient-to-br from-orange-900/20 to-purple-900/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="text-2xl">{eveningData.vibes.emoji}</span>
                  <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-orange-300">Sunset Lounge 🌅</h2>
                  <p className="text-xs text-purple-400">{eveningData.vibes.message}</p>
                </div>
              </div>
              <span className="text-xs text-orange-400/60">6 PM - 10 PM</span>
            </div>

            {/* Evening stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 rounded-xl bg-white/5">
                <div className="text-lg font-bold text-orange-300">{eveningData.stats.yourEveningSmokes}</div>
                <div className="text-[10px] text-gray-500">Your PM Smokes</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/5">
                <div className="text-lg font-bold text-purple-300">{eveningData.stats.eveningRegulars}</div>
                <div className="text-[10px] text-gray-500">Sunset Regulars</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/5">
                <div className="text-lg font-bold text-pink-300">{eveningData.stats.sunsetPercentile}%</div>
                <div className="text-[10px] text-gray-500">Percentile</div>
              </div>
            </div>

            {/* Active evening smokers */}
            {eveningData.eveningSmokers.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">🌇 Winding down with:</p>
                <div className="flex flex-wrap gap-2">
                  {eveningData.eveningSmokers.slice(0, 6).map((smoker) => (
                    <Link
                      key={smoker.username}
                      href={`/user/${smoker.username}`}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                        smoker.isActive 
                          ? "bg-orange-500/30 text-orange-300 border border-orange-500/50" 
                          : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {smoker.isActive && <span className="mr-1">🌅</span>}
                      @{smoker.username}
                      <span className="ml-1 text-gray-500">{smoker.lastSmoke}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {eveningData.eveningSmokers.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-2">
                🌅 Be the first! Log a smoke to join the sunset crew.
              </p>
            )}

            {/* Evening motivation + link to full page */}
            <div className="mt-4 pt-4 border-t border-white/10 text-center">
              <p className="text-xs text-orange-400/80 italic mb-2">
                &quot;Unwind with the setting sun&quot; 🌇
              </p>
              <Link 
                href="/evening"
                className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                View Sunset Lounge →
              </Link>
            </div>
          </motion.div>
        )}

        {/* Midweek Momentum - Wednesday Celebration */}
        {midweekData?.isWednesday && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.055 }}
            className="glass rounded-2xl p-5 mb-6 border border-amber-500/30 bg-gradient-to-br from-amber-900/20 to-orange-900/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="text-2xl animate-bounce">🐪</span>
                  <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-amber-300">Hump Day!</h2>
                  <p className="text-xs text-orange-400">{midweekData.motivationalMessage}</p>
                </div>
              </div>
              <Link 
                href="/midweek"
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                View →
              </Link>
            </div>

            {/* Week Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-amber-400 mb-1">
                <span>Week Progress</span>
                <span className="font-medium">{midweekData.weekProgress}%</span>
              </div>
              <div className="h-2 bg-amber-900/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                  style={{ width: `${midweekData.weekProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-amber-500/60 mt-1">
                <span>Mon</span>
                <span className="text-amber-300 font-bold">🐪 Wed</span>
                <span>Sun</span>
              </div>
            </div>

            {/* Community stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl bg-white/5">
                <div className="text-lg font-bold text-amber-300">{midweekData.communityStats.smokesThisWeek}</div>
                <div className="text-[10px] text-gray-500">Smokes This Week</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/5">
                <div className="text-lg font-bold text-orange-300">{midweekData.communityStats.activeSmokersThisWeek}</div>
                <div className="text-[10px] text-gray-500">Active Smokers</div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 text-center">
              <Link 
                href="/midweek"
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                View Midweek Momentum →
              </Link>
            </div>
          </motion.div>
        )}

        {/* First Smoke Today - Daily Race */}
        {firstSmokeData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.054 }}
            className={`glass rounded-2xl p-5 mb-6 border ${
              firstSmokeData.claimed 
                ? "border-yellow-500/30 bg-gradient-to-br from-yellow-900/20 to-orange-900/20" 
                : "border-green-500/30 bg-gradient-to-br from-green-900/20 to-emerald-900/20"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="text-2xl">{firstSmokeData.claimed ? "🥇" : "🏁"}</span>
                  {!firstSmokeData.claimed && (
                    <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-medium text-yellow-300">First Smoke Today</h2>
                  <p className="text-xs text-gray-500">{firstSmokeData.dayOfWeek}&apos;s Champion</p>
                </div>
              </div>
              <Link 
                href="/first-smoke"
                className="text-xs text-yellow-400 hover:text-yellow-300"
              >
                View →
              </Link>
            </div>

            {firstSmokeData.claimed && firstSmokeData.winner ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <span className="text-3xl">🏆</span>
                <div className="flex-1">
                  <Link 
                    href={`/user/${firstSmokeData.winner.username}`}
                    className="font-bold text-yellow-400 hover:text-yellow-300"
                  >
                    @{firstSmokeData.winner.username}
                  </Link>
                  <p className="text-sm text-gray-400">{firstSmokeData.winner.brand}</p>
                  <p className="text-xs text-gray-500">{firstSmokeData.winner.time} • {firstSmokeData.winner.timeAgo}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-green-400 font-medium mb-2">🏁 Unclaimed!</p>
                <p className="text-sm text-gray-400 mb-3">Be the first to log a smoke today</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  🚬 Claim First Smoke!
                </button>
              </div>
            )}

            {firstSmokeData.totalSmokesToday > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10 text-center">
                <span className="text-xs text-gray-500">
                  {firstSmokeData.totalSmokesToday} smoke{firstSmokeData.totalSmokesToday !== 1 ? "s" : ""} logged today
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Daily Prompt Section */}
        {dailyPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.055 }}
            className="glass rounded-2xl p-5 mb-6 border border-purple-500/20"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{dailyPrompt.emoji}</span>
                <div>
                  <h2 className="text-sm font-medium text-purple-400">Today's Prompt</h2>
                  <p className="text-xs text-gray-500">
                    {dailyPrompt.category === 'challenge' ? 'Daily Challenge' :
                     dailyPrompt.category === 'recommendation' ? 'Share a Pick' :
                     dailyPrompt.category === 'memory' ? 'Share a Memory' : 'Question of the Day'}
                  </p>
                </div>
              </div>
              {hasRespondedToPrompt && (
                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
                  ✓ Answered
                </span>
              )}
            </div>
            
            <p className="text-lg font-medium mb-4">{dailyPrompt.prompt}</p>
            
            {/* Response button */}
            {!hasRespondedToPrompt && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full py-3 rounded-xl bg-purple-500/20 text-purple-400 font-medium hover:bg-purple-500/30 transition-all flex items-center justify-center gap-2"
              >
                <FiPlus size={16} />
                Log a smoke and answer
              </button>
            )}
            
            {/* Show recent responses */}
            {promptResponses.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-xs text-gray-500 mb-3">
                  💬 {promptResponses.length} {promptResponses.length === 1 ? 'response' : 'responses'} today
                </p>
                <div className="space-y-2">
                  {promptResponses.slice(0, 3).map((response) => (
                    <Link
                      key={response.id}
                      href={`/checkin/${response.id}`}
                      className="block p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-purple-400 font-medium text-sm">@{response.username}</span>
                        <span className="text-gray-400 text-sm">on {response.brand}</span>
                      </div>
                      {response.review && (
                        <p className="text-sm text-gray-300 mt-1 line-clamp-2">"{response.review}"</p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Weekly Insights Section */}
        {insights && insights.thisWeek.checkins > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="glass rounded-2xl p-5 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">📊</span>
                <h2 className="text-sm text-gray-400">This Week</h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                {insights.trend === 'up' && (
                  <>
                    <FiTrendingUp className="text-green-400" />
                    <span className="text-green-400">+{insights.thisWeek.checkins - insights.lastWeek.checkins} vs last week</span>
                  </>
                )}
                {insights.trend === 'down' && (
                  <>
                    <FiTrendingDown className="text-red-400" />
                    <span className="text-red-400">{insights.thisWeek.checkins - insights.lastWeek.checkins} vs last week</span>
                  </>
                )}
                {insights.trend === 'same' && (
                  <>
                    <FiMinus className="text-gray-400" />
                    <span className="text-gray-400">Same as last week</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-500">{insights.thisWeek.checkins}</p>
                <p className="text-xs text-gray-500">Smokes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">{insights.thisWeek.brands}</p>
                <p className="text-xs text-gray-500">Brands</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{insights.thisWeek.newBrands}</p>
                <p className="text-xs text-gray-500">New</p>
              </div>
            </div>

            {insights.thisWeek.topBrand && (
              <div className="pt-3 border-t border-white/5">
                <p className="text-xs text-gray-500">
                  🏆 Top brand this week: <span className="text-amber-500 font-medium">{insights.thisWeek.topBrand}</span>
                </p>
              </div>
            )}
            
            {insights.thisWeek.newBrands > 0 && (
              <div className="mt-2">
                <p className="text-xs text-green-400">
                  🆕 You tried {insights.thisWeek.newBrands} new brand{insights.thisWeek.newBrands > 1 ? 's' : ''} this week!
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Daily Challenge - Personal daily goal */}
        {dailyChallenge && !dailyChallenge.progress.completed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.063 }}
            className="glass rounded-2xl p-5 mb-6 border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5"
          >
            <Link href="/challenge" className="block">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{dailyChallenge.challenge.emoji}</span>
                  <div>
                    <h2 className="text-sm font-medium text-amber-400">Daily Challenge</h2>
                    <p className="text-xs text-gray-500">{dailyChallenge.challenge.title}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-amber-400">{dailyChallenge.progress.current}/{dailyChallenge.progress.target}</p>
                  <p className="text-xs text-gray-500">{dailyChallenge.progress.percent}%</p>
                </div>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${dailyChallenge.progress.percent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">{dailyChallenge.challenge.description}</p>
            </Link>
          </motion.div>
        )}

        {/* Daily Challenge Complete! */}
        {dailyChallenge?.progress.completed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-4 mb-6 border border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/5"
          >
            <Link href="/challenge" className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎉</span>
                <div>
                  <p className="text-sm font-medium text-green-400">Daily Challenge Complete!</p>
                  <p className="text-xs text-gray-500">{dailyChallenge.challenge.title}</p>
                </div>
              </div>
              <span className="text-green-400">✓</span>
            </Link>
          </motion.div>
        )}

        {/* Weekly Goals Section - Monday Motivation! */}
        {weeklyGoals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.065 }}
            className="glass rounded-2xl p-5 mb-6 border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-blue-500/5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <div>
                  <h2 className="text-sm font-medium text-cyan-400">Weekly Goals</h2>
                  <p className="text-xs text-gray-500">Reset every Monday</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-lg font-bold text-cyan-400">{goalsCompleted}/{weeklyGoals.length}</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
                {goalsCompleted === weeklyGoals.length && (
                  <span className="text-2xl">🏆</span>
                )}
              </div>
            </div>

            {/* Goals Progress */}
            <div className="space-y-3">
              {weeklyGoals.map((goal) => (
                <div key={goal.id} className="flex items-center gap-3">
                  <span className="text-lg w-8 text-center flex-shrink-0">{goal.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${goal.completed ? 'text-green-400 line-through' : 'text-gray-300'}`}>
                        {goal.title}
                      </span>
                      <span className={`text-xs ${goal.completed ? 'text-green-400' : 'text-gray-500'}`}>
                        {goal.current}/{goal.target}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          goal.completed 
                            ? 'bg-green-500' 
                            : goal.category === 'smoke' 
                              ? 'bg-amber-500' 
                              : goal.category === 'social' 
                                ? 'bg-pink-500' 
                                : 'bg-cyan-500'
                        }`}
                      />
                    </div>
                  </div>
                  {goal.completed && (
                    <span className="text-green-400 flex-shrink-0">✓</span>
                  )}
                </div>
              ))}
            </div>

            {/* Encouragement */}
            <div className="mt-4 pt-3 border-t border-white/5 text-center">
              {goalsCompleted === 0 && (
                <p className="text-xs text-gray-500">🌟 Start your week strong! Complete a goal to get momentum.</p>
              )}
              {goalsCompleted > 0 && goalsCompleted < weeklyGoals.length && (
                <p className="text-xs text-gray-500">💪 {weeklyGoals.length - goalsCompleted} more to go! You&apos;ve got this.</p>
              )}
              {goalsCompleted === weeklyGoals.length && (
                <p className="text-xs text-green-400">🎉 All goals complete! You crushed it this week!</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Brand of the Week Challenge */}
        {brandOfWeek && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.068 }}
            className="glass rounded-2xl p-5 mb-6 border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-red-500/5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <h2 className="text-sm font-medium text-orange-400">Brand of the Week</h2>
                  <p className="text-xs text-gray-500">{brandOfWeek.daysRemaining} day{brandOfWeek.daysRemaining !== 1 ? 's' : ''} left</p>
                </div>
              </div>
              {brandOfWeek.userTriedThisWeek && (
                <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1">
                  ✓ Participated
                </span>
              )}
            </div>

            {/* Featured Brand */}
            <Link
              href={`/cigar/${encodeURIComponent(brandOfWeek.brand)}`}
              className="block p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30 hover:border-orange-500/50 transition-all mb-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-orange-400">{brandOfWeek.brand}</p>
                  <p className="text-xs text-gray-500 mt-1">This week&apos;s community challenge</p>
                </div>
                <div className="text-4xl">🚬</div>
              </div>
              
              {/* Platform stats */}
              {brandOfWeek.platformStats.totalCheckins > 0 && (
                <div className="flex gap-4 mt-3 pt-3 border-t border-white/5">
                  <div>
                    <p className="text-lg font-bold text-gray-300">{brandOfWeek.platformStats.totalCheckins}</p>
                    <p className="text-xs text-gray-500">Check-ins</p>
                  </div>
                  {brandOfWeek.platformStats.avgRating && (
                    <div>
                      <div className="flex items-center gap-1">
                        <FiStar className="text-amber-500" fill="currentColor" size={14} />
                        <p className="text-lg font-bold text-gray-300">{brandOfWeek.platformStats.avgRating}</p>
                      </div>
                      <p className="text-xs text-gray-500">Avg Rating</p>
                    </div>
                  )}
                  <div>
                    <p className="text-lg font-bold text-gray-300">{brandOfWeek.platformStats.uniqueSmokers}</p>
                    <p className="text-xs text-gray-500">Smokers</p>
                  </div>
                </div>
              )}
            </Link>

            {/* This week's participants */}
            {brandOfWeek.participants.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">🔥 This week&apos;s participants:</p>
                <div className="flex flex-wrap gap-2">
                  {brandOfWeek.participants.map((p, idx) => (
                    <Link
                      key={`${p.username}-${idx}`}
                      href={`/user/${p.username}`}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <span className="text-xs text-gray-300">@{p.username}</span>
                      {p.rating && (
                        <span className="flex items-center gap-0.5 text-amber-500 text-xs">
                          <FiStar size={10} fill="currentColor" />
                          {p.rating}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            {!brandOfWeek.userTriedThisWeek && (
              <button
                onClick={() => {
                  setBrand(brandOfWeek.brand);
                  setShowForm(true);
                }}
                className="w-full py-3 rounded-xl bg-orange-500/20 text-orange-400 font-medium hover:bg-orange-500/30 transition-all flex items-center justify-center gap-2"
              >
                <FiPlus size={16} />
                {brandOfWeek.userHasTried ? 'Log this week\'s smoke' : 'Try it this week!'}
              </button>
            )}

            {/* Encouragement for participants */}
            {brandOfWeek.userTriedThisWeek && (
              <div className="text-center pt-2">
                <p className="text-xs text-green-400">🎉 You&apos;re part of this week&apos;s challenge!</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Community Challenge - Collective Goal */}
        {communityChallenge && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.0695 }}
            className="glass rounded-2xl p-5 mb-6 border border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-cyan-500/5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{communityChallenge.challenge.icon}</span>
                <div>
                  <h2 className="text-sm font-medium text-teal-400">{communityChallenge.challenge.name}</h2>
                  <p className="text-xs text-gray-500">{communityChallenge.challenge.description} • {communityChallenge.daysRemaining} day{communityChallenge.daysRemaining !== 1 ? 's' : ''} left</p>
                </div>
              </div>
              {communityChallenge.completed && (
                <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1">
                  🎉 Complete!
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <span className="text-2xl font-bold text-teal-400">{communityChallenge.current}</span>
                  <span className="text-gray-500 text-sm"> / {communityChallenge.target}</span>
                </div>
                <span className="text-xs text-gray-500">{communityChallenge.progress}%</span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${communityChallenge.progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${communityChallenge.completed ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-teal-500 to-cyan-500'}`}
                />
              </div>
            </div>

            {/* Milestones */}
            <div className="flex justify-between mb-4">
              {communityChallenge.milestones.map((milestone) => (
                <div
                  key={milestone.percent}
                  className={`flex flex-col items-center ${milestone.reached ? 'text-teal-400' : 'text-gray-600'}`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${milestone.reached ? 'bg-teal-500/30' : 'bg-gray-800'}`}>
                    {milestone.reached ? '✓' : ''}
                  </span>
                  <span className="text-[10px] mt-1">{milestone.percent}%</span>
                </div>
              ))}
            </div>

            {/* Motivational message */}
            <div className="text-center mb-4">
              <p className="text-sm text-gray-300">{communityChallenge.message}</p>
            </div>

            {/* Top contributors */}
            {communityChallenge.contributors.length > 0 && (
              <div className="border-t border-white/5 pt-4">
                <p className="text-xs text-gray-500 mb-2">🏅 Top Contributors</p>
                <div className="flex flex-wrap gap-2">
                  {communityChallenge.contributors.slice(0, 5).map((c, idx) => (
                    <Link
                      key={c.username}
                      href={`/user/${c.username}`}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      {idx === 0 && <span className="text-xs">🥇</span>}
                      {idx === 1 && <span className="text-xs">🥈</span>}
                      {idx === 2 && <span className="text-xs">🥉</span>}
                      <span className="text-xs text-gray-300">@{c.username}</span>
                      <span className="text-xs text-teal-400">+{c.contribution}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* User contribution */}
            {communityChallenge.userContribution > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5 text-center">
                <p className="text-xs text-teal-400">
                  🙌 You&apos;ve contributed {communityChallenge.userContribution} to this challenge!
                </p>
              </div>
            )}

            {/* CTA for non-contributors */}
            {communityChallenge.userContribution === 0 && !communityChallenge.completed && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 w-full py-3 rounded-xl bg-teal-500/20 text-teal-400 font-medium hover:bg-teal-500/30 transition-all flex items-center justify-center gap-2"
              >
                <FiPlus size={16} />
                Join the challenge!
              </button>
            )}
          </motion.div>
        )}

        {/* Daily Poll - Quick Vote */}
        {dailyPoll && !dailyPoll.error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="glass rounded-2xl p-5 mb-6 border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-purple-500/5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🗳️</span>
                <div>
                  <h2 className="text-sm font-medium text-indigo-400">Daily Poll</h2>
                  <p className="text-xs text-gray-500">{dailyPoll.totalVotes} vote{dailyPoll.totalVotes !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <Link href="/poll" className="text-xs text-indigo-400 hover:text-indigo-300">
                View all →
              </Link>
            </div>

            <h3 className="text-lg font-semibold text-center mb-4 text-indigo-200">
              {dailyPoll.poll.question}
            </h3>

            <div className="space-y-2">
              {dailyPoll.poll.options.map((option) => {
                const result = dailyPoll.results.find((r) => r.option === option);
                const isSelected = dailyPoll.userVote === option;
                const isWinner = dailyPoll.winners.includes(option) && dailyPoll.hasVoted;
                const percentage = result?.percentage || 0;

                return (
                  <button
                    key={option}
                    onClick={async () => {
                      if (dailyPoll.hasVoted || pollVoting) return;
                      setPollVoting(true);
                      try {
                        const res = await fetch("/api/daily-poll", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ vote: option }),
                        });
                        if (res.ok) {
                          const pollRes = await fetch("/api/daily-poll");
                          if (pollRes.ok) {
                            const pollData: DailyPollData = await pollRes.json();
                            setDailyPoll(pollData);
                          }
                        }
                      } catch (error) {
                        console.error("Vote error:", error);
                      } finally {
                        setPollVoting(false);
                      }
                    }}
                    disabled={dailyPoll.hasVoted || pollVoting}
                    className={`relative w-full p-3 rounded-xl text-left overflow-hidden transition-all ${
                      dailyPoll.hasVoted ? "cursor-default" : "hover:bg-indigo-500/10 cursor-pointer"
                    } ${isSelected ? "border-2 border-indigo-400" : "border border-white/10"} ${isWinner ? "ring-1 ring-amber-400" : ""}`}
                  >
                    {dailyPoll.hasVoted && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.6 }}
                        className={`absolute inset-y-0 left-0 ${isWinner ? "bg-amber-500/20" : "bg-indigo-500/15"}`}
                      />
                    )}
                    <div className="relative flex items-center justify-between">
                      <span className={`text-sm ${isWinner ? "text-amber-300 font-medium" : ""}`}>
                        {isWinner && "👑 "}{option}
                      </span>
                      {dailyPoll.hasVoted && (
                        <span className={`text-xs font-medium ${isWinner ? "text-amber-400" : "text-indigo-400"}`}>
                          {percentage}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {dailyPoll.hasVoted ? (
              <p className="text-center text-xs text-indigo-300 mt-3">
                ✅ You voted! New poll tomorrow at midnight.
              </p>
            ) : (
              <p className="text-center text-xs text-gray-500 mt-3">
                Tap to vote
              </p>
            )}
          </motion.div>
        )}

        {/* Flavor-Based Recommendations */}
        {flavorRecs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.069 }}
            className="glass rounded-2xl p-5 mb-6 border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎨</span>
                <div>
                  <h2 className="text-sm font-medium text-purple-400">Flavor Picks For You</h2>
                  <p className="text-xs text-gray-500">Based on your taste profile</p>
                </div>
              </div>
            </div>

            {/* User's top flavors */}
            {userTopFlavors.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className="text-xs text-gray-500">Your flavors:</span>
                {userTopFlavors.map((flavor) => {
                  const flavorTag = getFlavorTag(flavor);
                  return (
                    <span
                      key={flavor}
                      className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs"
                    >
                      {flavorTag?.emoji || ''} {flavor}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Recommendations horizontal scroll */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {flavorRecs.map((rec, idx) => (
                <Link
                  key={rec.brand}
                  href={`/cigar/${encodeURIComponent(rec.brand)}`}
                  className="flex-shrink-0 group"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="w-40 p-3 rounded-xl bg-white/5 border border-purple-500/30 group-hover:border-purple-500 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">
                        {rec.matchScore}% match
                      </span>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        <FiStar size={12} fill="currentColor" />
                        <span className="text-xs">{rec.avgRating}</span>
                      </div>
                    </div>
                    <p className="font-medium text-sm text-gray-200 truncate group-hover:text-purple-400 transition-colors">
                      {rec.brand}
                    </p>
                    {rec.topProduct && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        Try: {rec.topProduct}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rec.matchingFlavors.slice(0, 2).map((f) => {
                        const ft = getFlavorTag(f);
                        return (
                          <span key={f} className="text-xs text-purple-400">
                            {ft?.emoji || ''}{f}
                          </span>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {rec.checkinCount} check-in{rec.checkinCount !== 1 ? 's' : ''}
                    </p>
                  </motion.div>
                </Link>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-4 pt-3 border-t border-white/5 text-center">
              <p className="text-xs text-gray-500">
                💡 Log more smokes with flavor tags to improve recommendations!
              </p>
            </div>
          </motion.div>
        )}

        {/* Following Feed - Show recent check-ins from people you follow */}
        {followStats.following > 0 && followingFeed.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="glass rounded-2xl p-5 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">👥</span>
                <h2 className="text-sm text-gray-400">From People You Follow</h2>
              </div>
              <Link
                href="/discover"
                className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
              >
                See all →
              </Link>
            </div>
            
            <div className="space-y-3">
              {followingFeed.slice(0, 3).map((checkin) => (
                <Link
                  key={checkin.id}
                  href={`/checkin/${checkin.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
                >
                  {checkin.image_url ? (
                    <img
                      src={checkin.image_url}
                      alt={checkin.brand}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
                      🚬
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-amber-500 transition-colors">
                      @{checkin.username} smoked {checkin.brand}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {checkin.rating && (
                        <span className="flex items-center gap-0.5">
                          <FiStar className="text-amber-500" fill="currentColor" size={10} />
                          {checkin.rating}
                        </span>
                      )}
                      <span>{getTimeAgo(new Date(checkin.created_at * 1000))}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {followingFeed.length > 3 && (
              <Link
                href="/discover"
                className="block mt-3 pt-3 border-t border-white/5 text-center text-xs text-gray-500 hover:text-amber-500 transition-colors"
              >
                +{followingFeed.length - 3} more from your feed
              </Link>
            )}
          </motion.div>
        )}

        {/* Prompt to follow people if not following anyone */}
        {followStats.following === 0 && checkins.length > 0 && suggestedFollows.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="glass rounded-2xl p-4 mb-6 border border-blue-500/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <span className="text-xl">👥</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-400">Find people to follow</p>
                <p className="text-xs text-gray-500">See what other smokers are enjoying</p>
              </div>
              <Link
                href="/discover"
                className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-colors"
              >
                Discover
              </Link>
            </div>
          </motion.div>
        )}

        {/* People Like You - Suggested Follows */}
        {suggestedFollows.length > 0 && followStats.following < 5 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="glass rounded-2xl p-5 mb-6 border border-pink-500/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">💕</span>
                <h2 className="text-sm font-semibold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">People Like You</h2>
              </div>
              <Link href="/people" className="text-xs text-gray-500 hover:text-pink-400 transition-colors">
                See all →
              </Link>
            </div>
            
            <div className="space-y-3">
              {suggestedFollows.map((user, idx) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <Link href={`/user/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-sm font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">@{user.username}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {user.tasteMatchScore > 0 && (
                          <span className="text-pink-400">{user.tasteMatchScore}% match</span>
                        )}
                        {user.commonBrands > 0 && (
                          <span>• {user.commonBrands} brand{user.commonBrands > 1 ? 's' : ''} in common</span>
                        )}
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={async () => {
                      if (followingUser === user.id) return;
                      setFollowingUser(user.id);
                      try {
                        const res = await fetch("/api/follow", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ targetId: user.id }),
                        });
                        if (res.ok) {
                          setSuggestedFollows(prev => prev.filter(u => u.id !== user.id));
                          setFollowStats(prev => ({ ...prev, following: prev.following + 1 }));
                        }
                      } catch (e) {
                        console.error("Follow error:", e);
                      } finally {
                        setFollowingUser(null);
                      }
                    }}
                    disabled={followingUser === user.id}
                    className="px-3 py-1.5 rounded-lg bg-pink-500/20 text-pink-400 text-xs font-medium hover:bg-pink-500/30 transition-colors disabled:opacity-50"
                  >
                    {followingUser === user.id ? "..." : "Follow"}
                  </button>
                </motion.div>
              ))}
            </div>
            
            {suggestedFollows.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5 text-center">
                <Link href="/people" className="text-xs text-gray-500 hover:text-pink-400 transition-colors">
                  Discover more people with similar taste →
                </Link>
              </div>
            )}
          </motion.div>
        )}

        {/* Community Activity Feed - Shows what's happening across the platform */}
        {communityActivity.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.075 }}
            className="glass rounded-2xl p-5 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <h2 className="text-sm text-gray-400">Happening Now</h2>
              </div>
              <span className="text-xs text-gray-500 animate-pulse">Live</span>
            </div>
            
            <div className="space-y-2">
              {communityActivity.slice(0, 6).map((activity, idx) => {
                const timeAgo = getTimeAgo(new Date(activity.created_at * 1000));
                const activityIcon = activity.type === 'checkin' ? '🚬' :
                                    activity.type === 'like' ? '❤️' :
                                    activity.type === 'reaction' ? activity.emoji || '⚡' :
                                    activity.type === 'follow' ? '👤' :
                                    activity.type === 'comment' ? '💬' : '📣';
                
                return (
                  <motion.div
                    key={`${activity.type}-${activity.created_at}-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-all"
                  >
                    <span className="text-base">{activityIcon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        <Link 
                          href={`/user/${activity.username}`} 
                          className="font-medium text-amber-500 hover:text-amber-400"
                        >
                          @{activity.username}
                        </Link>
                        <span className="text-gray-400 ml-1">{activity.details.replace(`@${activity.username}`, '').trim()}</span>
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{timeAgo}</span>
                  </motion.div>
                );
              })}
            </div>

            <Link
              href="/discover"
              className="block mt-3 pt-3 border-t border-white/5 text-center text-xs text-gray-500 hover:text-amber-500 transition-colors"
            >
              See all activity →
            </Link>
          </motion.div>
        )}

        {/* Community Engagement Prompts - show when user hasn't engaged yet */}
        {(() => {
          // Find engagement-related badges to check progress
          const firstLoveBadge = badges.find(b => b.id === 'first_love');
          const socialiteBadge = badges.find(b => b.id === 'socialite');
          const commentatorBadge = badges.find(b => b.id === 'commentator');
          
          const hasLiked = firstLoveBadge?.earned || false;
          const hasFollowed = (socialiteBadge?.progress || 0) > 0 || socialiteBadge?.earned;
          const hasCommented = (commentatorBadge?.progress || 0) > 0 || commentatorBadge?.earned;
          
          // Only show if user has check-ins but hasn't engaged
          const showEngagementPrompts = checkins.length > 0 && (!hasLiked || !hasFollowed || !hasCommented);
          
          if (!showEngagementPrompts) return null;
          
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="glass rounded-2xl p-4 mb-6 border border-pink-500/20"
            >
              <h3 className="text-sm font-medium text-pink-400 mb-3 flex items-center gap-2">
                <span>💫</span> Join the Community
              </h3>
              <p className="text-xs text-gray-400 mb-3">
                Engage with other smokers to unlock badges and make friends!
              </p>
              <div className="space-y-2">
                {!hasLiked && (
                  <Link
                    href="/discover"
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-pink-500/10 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                      <span className="text-lg">❤️</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium group-hover:text-pink-400 transition-colors">Like your first check-in</p>
                      <p className="text-xs text-gray-500">Show some love on Discover → earn the First Love badge!</p>
                    </div>
                  </Link>
                )}
                {!hasFollowed && (
                  <Link
                    href="/discover"
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-blue-500/10 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <span className="text-lg">👥</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium group-hover:text-blue-400 transition-colors">Follow someone</p>
                      <p className="text-xs text-gray-500">Find interesting smokers to follow on Discover</p>
                    </div>
                  </Link>
                )}
                {!hasCommented && (
                  <Link
                    href="/discover"
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-green-500/10 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <span className="text-lg">💬</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium group-hover:text-green-400 transition-colors">Leave a comment</p>
                      <p className="text-xs text-gray-500">Start a conversation about someone's smoke</p>
                    </div>
                  </Link>
                )}
              </div>
            </motion.div>
          );
        })()}

        {/* Quick Actions / Tips for new users */}
        {checkins.length < 5 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-4 mb-6 border border-amber-500/20"
          >
            <h3 className="text-sm font-medium text-amber-500 mb-3 flex items-center gap-2">
              <span>🔥</span> Get Started
            </h3>
            <div className="space-y-2">
              <Link
                href="/discover"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
                  <FiCompass size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium group-hover:text-amber-500 transition-colors">See what others are smoking</p>
                  <p className="text-xs text-gray-500">Discover popular cigars and reviews</p>
                </div>
              </Link>
              <Link
                href="/leaderboard"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
                  <FiAward size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium group-hover:text-amber-500 transition-colors">Check the leaderboard</p>
                  <p className="text-xs text-gray-500">See top smokers this week</p>
                </div>
              </Link>
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 transition-all group border border-amber-500/30"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black">
                  <FiPlus size={16} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-amber-500">Log your {checkins.length === 0 ? "first" : "next"} smoke</p>
                  <p className="text-xs text-gray-500">Track flavors, ratings & more</p>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* Check-ins */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent Smokes</h2>
        </div>

        {checkins.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-gray-400"
          >
            <p className="text-4xl mb-3">🚬</p>
            <p>No smokes logged yet</p>
            <p className="text-sm">Tap + to add your first check-in</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {checkins.map((checkin) => (
                <CheckinCard 
                  key={checkin.id} 
                  checkin={checkin}
                  onDelete={(id) => setCheckins(prev => prev.filter(c => c.id !== id))}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* FAB */}
      <motion.button
        onClick={() => setShowForm(true)}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center shadow-lg ember-glow"
      >
        <FiPlus size={24} />
      </motion.button>

      {/* Check-in Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#1a1a1a] rounded-t-3xl sm:rounded-3xl p-6 modal-scroll"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Log a Smoke</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Category Selector */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">What are you smoking?</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { id: 'cigar', label: 'Cigar', emoji: '🚬' },
                      { id: 'cannabis', label: 'Cannabis', emoji: '🌿' },
                      { id: 'hookah', label: 'Hookah', emoji: '💨' },
                      { id: 'vape', label: 'Vape', emoji: '🌫️' },
                      { id: 'snus', label: 'Snus', emoji: '🫦' },
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id as typeof category)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                          category === cat.id
                            ? "bg-amber-500 text-black"
                            : "bg-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                      >
                        <span className="text-xl">{cat.emoji}</span>
                        <span className="text-xs font-medium">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Photo (optional)</label>
                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                      <button
                        type="button"
                        onClick={clearImage}
                        className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-all"
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 w-full py-8 rounded-xl bg-white/5 border border-dashed border-white/20 cursor-pointer hover:border-amber-500/50 transition-all">
                      <FiCamera size={20} className="text-gray-400" />
                      <span className="text-gray-400">Add a photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    {category === 'cannabis' ? 'Dispensary / Brand *' : 'Brand *'}
                  </label>
                  <BrandAutocomplete
                    value={brand}
                    onChange={setBrand}
                    category={category}
                    required
                    placeholder={
                      category === 'cannabis' ? "e.g., Cookies, Stiiizy" :
                      category === 'hookah' ? "e.g., Al Fakher, Starbuzz" :
                      category === 'vape' ? "e.g., Pax, Juul" :
                      "e.g., Padron, Arturo Fuente"
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    {category === 'cannabis' ? 'Strain Name' : 'Product / Line'}
                  </label>
                  <input
                    type="text"
                    value={category === 'cannabis' ? strainName : product}
                    onChange={(e) => category === 'cannabis' ? setStrainName(e.target.value) : setProduct(e.target.value)}
                    placeholder={
                      category === 'cannabis' ? "e.g., Blue Dream, OG Kush" :
                      category === 'hookah' ? "e.g., Double Apple, Mint" :
                      category === 'vape' ? "e.g., Mango, Mint" :
                      "e.g., 1926 Serie, Opus X"
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all"
                  />
                </div>

                <StarRating value={rating} onChange={setRating} label="Overall Rating" />

                {/* Cannabis-specific fields */}
                {category === 'cannabis' && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Strain Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'indica', label: 'Indica', emoji: '😴' },
                          { id: 'sativa', label: 'Sativa', emoji: '⚡' },
                          { id: 'hybrid', label: 'Hybrid', emoji: '🔄' },
                        ].map(type => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setStrainType(type.id as typeof strainType)}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-all ${
                              strainType === type.id
                                ? "bg-green-500 text-black"
                                : "bg-white/5 text-gray-400 hover:bg-white/10"
                            }`}
                          >
                            <span>{type.emoji}</span>
                            <span className="text-sm font-medium">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">THC %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={thcPercent}
                        onChange={(e) => setThcPercent(e.target.value)}
                        placeholder="e.g., 22.5"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Effects</label>
                      <input
                        type="text"
                        value={effects}
                        onChange={(e) => setEffects(e.target.value)}
                        placeholder="e.g., Relaxed, Euphoric, Creative"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all"
                      />
                    </div>
                  </>
                )}

                {/* Cigar-specific fields */}
                {category === 'cigar' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <StarRating value={drawRating} onChange={setDrawRating} label="Draw" />
                      <StarRating value={burnRating} onChange={setBurnRating} label="Burn" />
                      <StarRating value={aromaRating} onChange={setAromaRating} label="Aroma" />
                    </div>

                    {/* Flavor Tags */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Flavor Notes</label>
                      <div className="flex flex-wrap gap-2">
                        {FLAVOR_TAGS.map(tag => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleFlavor(tag.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                              selectedFlavors.includes(tag.id)
                                ? "bg-amber-500 text-black font-medium"
                                : "bg-white/5 text-gray-400 hover:bg-white/10"
                            }`}
                          >
                            <span>{tag.emoji}</span>
                            <span>{tag.label}</span>
                          </button>
                        ))}
                      </div>
                      {selectedFlavors.length > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                          {selectedFlavors.length} flavor{selectedFlavors.length !== 1 ? 's' : ''} selected
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    {category === 'cannabis' ? 'Session Time (minutes)' : 'Smoke Time (minutes)'}
                  </label>
                  <input
                    type="number"
                    value={smokeTime}
                    onChange={(e) => setSmokeTime(e.target.value)}
                    placeholder="e.g., 45"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all"
                  />
                </div>

                {/* Mood Selector - All categories */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">How are you feeling? 🎭</label>
                  <div className="flex flex-wrap gap-2">
                    {MOOD_TAGS.map(mood => (
                      <button
                        key={mood.id}
                        type="button"
                        onClick={() => setSelectedMood(selectedMood === mood.id ? '' : mood.id as SmokeMood)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                          selectedMood === mood.id
                            ? mood.color.replace('/20', '/40') + ' font-medium ring-2 ring-white/20'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <span>{mood.emoji}</span>
                        <span>{mood.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Drink Pairing Selector 🥃 */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Pairing with? 🥃</label>
                  <div className="flex flex-wrap gap-2">
                    {DRINK_TAGS.map(drink => (
                      <button
                        key={drink.id}
                        type="button"
                        onClick={() => setSelectedDrink(selectedDrink === drink.id ? '' : drink.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                          selectedDrink === drink.id
                            ? drink.category === 'coffee' 
                              ? 'bg-amber-700/40 text-amber-300 font-medium ring-2 ring-amber-500/30'
                              : drink.category === 'alcohol'
                              ? 'bg-purple-700/40 text-purple-300 font-medium ring-2 ring-purple-500/30'
                              : 'bg-gray-700/40 text-gray-300 font-medium ring-2 ring-gray-500/30'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <span>{drink.emoji}</span>
                        <span>{drink.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Smoke Spot Selector 📍 */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Where are you smoking? 📍</label>
                  <div className="flex flex-wrap gap-2">
                    {SMOKE_SPOTS.map(spot => (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={() => setSelectedSpot(selectedSpot === spot.id ? '' : spot.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                          selectedSpot === spot.id
                            ? 'bg-cyan-700/40 text-cyan-300 font-medium ring-2 ring-cyan-500/30'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <span>{spot.emoji}</span>
                        <span>{spot.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Review / Notes</label>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    rows={3}
                    placeholder="How was it? Flavor notes, pairing..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all resize-none"
                  />
                </div>

                {/* Error display */}
                {submitError && (
                  <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                    {submitError}
                  </div>
                )}

                {/* Submit button with extra bottom padding for mobile */}
                <div className="pb-4">
                  <button
                    type="submit"
                    disabled={submitting || uploading || !brand.trim()}
                    className={`w-full px-5 py-4 rounded-xl text-white font-semibold btn-glow transition-all active:scale-95 disabled:opacity-50 touch-manipulation ${
                      category === 'cannabis' 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                        : 'bg-gradient-to-r from-amber-500 to-orange-600'
                    }`}
                  >
                    {uploading ? "Uploading image..." : submitting ? "Logging..." : 
                      category === 'cannabis' ? "Log Session 🌿" :
                      category === 'hookah' ? "Log Session 💨" :
                      category === 'vape' ? "Log Session 🌫️" :
                      category === 'snus' ? "Log Pouch 🫦" :
                      "Log Smoke 🚬"
                    }
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Celebration Modal */}
      <AnimatePresence>
        {showSuccess && lastCheckin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => { setShowSuccess(false); setNewlyEarnedBadges([]); }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#1a1a1a] rounded-3xl p-6 text-center"
            >
              {/* Celebration emoji */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1, damping: 10 }}
                className="text-6xl mb-4"
              >
                🔥
              </motion.div>
              
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-bold mb-2"
              >
                Nice smoke logged!
              </motion.h2>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-gray-400 mb-4"
              >
                {lastCheckin.brand}{lastCheckin.product ? ` ${lastCheckin.product}` : ''}
                {lastCheckin.rating ? ` • ${lastCheckin.rating}★` : ''}
              </motion.p>
              
              {/* Newly Earned Badges Celebration */}
              {newlyEarnedBadges.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35, type: "spring", damping: 15 }}
                  className="mb-6"
                >
                  <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                      className="text-3xl mb-2"
                    >
                      🏆
                    </motion.div>
                    <p className="text-amber-400 font-semibold text-sm mb-3">
                      {newlyEarnedBadges.length === 1 ? 'Badge Unlocked!' : `${newlyEarnedBadges.length} Badges Unlocked!`}
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      {newlyEarnedBadges.map((badge, index) => (
                        <motion.div
                          key={badge.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          className="flex flex-col items-center gap-1"
                        >
                          <motion.span 
                            className="text-3xl"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ delay: 0.6 + index * 0.1, duration: 0.3 }}
                          >
                            {badge.emoji}
                          </motion.span>
                          <span className="text-xs text-gray-300 font-medium">{badge.name}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-3"
              >
                {/* Share button */}
                <button
                  onClick={async () => {
                    const shareUrl = `${window.location.origin}/checkin/${lastCheckin.id}`;
                    const shareText = lastCheckin.rating 
                      ? `I just smoked a ${lastCheckin.brand}${lastCheckin.product ? ` ${lastCheckin.product}` : ''} and rated it ${lastCheckin.rating}/5! 🚬 #Puffed`
                      : `Check out my ${lastCheckin.brand}${lastCheckin.product ? ` ${lastCheckin.product}` : ''} smoke session! 🚬 #Puffed`;
                    
                    if (navigator.share) {
                      try {
                        await navigator.share({ title: `${lastCheckin.brand} - Puffed`, text: shareText, url: shareUrl });
                      } catch (err) {
                        if ((err as Error).name !== "AbortError") {
                          await navigator.clipboard.writeText(shareUrl);
                        }
                      }
                    } else {
                      await navigator.clipboard.writeText(shareUrl);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold btn-glow transition-all active:scale-95"
                >
                  <FiShare2 size={18} />
                  Share with friends
                </button>
                
                {/* Discover button */}
                <Link
                  href="/discover"
                  onClick={() => { setShowSuccess(false); setNewlyEarnedBadges([]); }}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 font-medium transition-all active:scale-95"
                >
                  <FiCompass size={18} />
                  See what others are smoking
                </Link>
                
                {/* Dismiss */}
                <button
                  onClick={() => { setShowSuccess(false); setNewlyEarnedBadges([]); }}
                  className="w-full px-5 py-2 text-gray-500 hover:text-gray-300 text-sm transition-all"
                >
                  Done
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Install Banner */}
      <InstallBanner />
    </main>
  );
}
