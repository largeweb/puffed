"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiSearch, FiStar, FiClock, FiWind, FiDroplet, FiSmile, FiHome, FiHeart, FiTrendingUp, FiMessageCircle, FiSend, FiAward, FiUsers, FiUserPlus, FiUserCheck, FiCamera, FiMenu } from "react-icons/fi";
import Link from "next/link";
import type { Checkin, DiscoverResponse, LikeResponse, TrendingResponse, TrendingBrand, Comment, CommentsResponse, CommentResponse, SuggestedUser, SuggestedUsersResponse, FollowResponse, CheckinCategory, FeaturedCheckin, FeaturedResponse, TrendingWeekBrand, TrendingWeekResponse, MostLovedCheckin, MostLovedResponse, NeedsLoveCheckin, NeedsLoveResponse, WeekendChallengeResponse, WeeklyProgressResponse } from "@/lib/types";
import WeeklyProgress from "@/components/WeeklyProgress";
import TimeOfDayBanner from "@/components/TimeOfDayBanner";
import ShareMenu from "@/components/ShareMenu";
import QuickReactions from "@/components/QuickReactions";
import QuickComments from "@/components/QuickComments";
import MobileSidebar from "@/app/components/MobileSidebar";
import { FLAVOR_TAGS } from "@/lib/flavors";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { getTodaysTip } from "@/lib/daily-tips";

interface CheckinWithLikes extends Checkin {
  like_count?: number;
  liked_by_me?: boolean;
  comment_count?: number;
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function CheckinCard({ checkin, onLike }: { checkin: CheckinWithLikes; onLike: (id: string) => void }) {
  const date = new Date(checkin.created_at * 1000);
  const timeAgo = getTimeAgo(date);
  const [liked, setLiked] = useState(checkin.liked_by_me || false);
  const [likeCount, setLikeCount] = useState(checkin.like_count || 0);
  const [liking, setLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(checkin.comment_count || 0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  const category = getCategory(checkin.category);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinId: checkin.id }),
      });
      if (res.ok) {
        const data: LikeResponse = await res.json();
        setLiked(data.liked);
        setLikeCount(prev => data.liked ? prev + 1 : prev - 1);
      }
    } catch (err) {
      console.error("Like error:", err);
    } finally {
      setLiking(false);
    }
  };

  const loadComments = async () => {
    if (loadingComments) return;
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/comments?checkinId=${checkin.id}`);
      if (res.ok) {
        const data: CommentsResponse = await res.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error("Load comments error:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleComments = () => {
    if (!showComments && comments.length === 0) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinId: checkin.id, text: newComment.trim() }),
      });
      if (res.ok) {
        const data: CommentResponse = await res.json();
        if (data.comment) {
          setComments(prev => [...prev, data.comment!]);
          setCommentCount(prev => prev + 1);
          setNewComment("");
        }
      }
    } catch (err) {
      console.error("Post comment error:", err);
    } finally {
      setPosting(false);
    }
  };

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/checkin/${checkin.id}` : `/checkin/${checkin.id}`;
  const shareText = checkin.rating 
    ? `I just smoked a ${checkin.brand}${checkin.product ? ` ${checkin.product}` : ''} and rated it ${checkin.rating}/5! ${category.emoji} #Puffed`
    : `Check out this ${checkin.brand}${checkin.product ? ` ${checkin.product}` : ''} smoke session! ${category.emoji} #Puffed`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5"
    >
      {/* User info + Category badge */}
      <div className="flex items-center gap-2 mb-3 text-sm">
        <Link 
          href={`/user/${checkin.username}`}
          className="text-amber-500 hover:underline font-medium"
        >
          @{checkin.username}
        </Link>
        <span className="text-gray-500">•</span>
        <span className="text-gray-500">{timeAgo}</span>
        <span className={`ml-auto px-2 py-0.5 rounded-full text-xs ${category.bgColor} ${category.color}`}>
          {category.emoji} {category.label}
        </span>
      </div>

      {/* Image */}
      {checkin.image_url && (
        <div className="mb-3 rounded-xl overflow-hidden">
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
          {/* Cannabis strain info */}
          {checkin.category === "cannabis" && checkin.strain_name && (
            <p className="text-green-400 text-sm mt-1">
              {checkin.strain_name}
              {checkin.strain_type && <span className="text-gray-500"> ({checkin.strain_type})</span>}
              {checkin.thc_percent && <span className="text-gray-500"> • {checkin.thc_percent}% THC</span>}
            </p>
          )}
        </div>
        {checkin.rating && (
          <div className={`flex items-center gap-1 ${category.bgColor} px-2 py-1 rounded-lg`}>
            <FiStar className={category.color} fill="currentColor" />
            <span className={`${category.color} font-semibold`}>{checkin.rating}</span>
          </div>
        )}
      </div>

      {checkin.review && (
        <p className="text-gray-300 text-sm mb-3">{checkin.review}</p>
      )}

      {/* Cannabis effects */}
      {checkin.category === "cannabis" && checkin.effects && (
        <p className="text-gray-400 text-sm mb-3">
          <span className="text-green-400">Effects:</span> {checkin.effects}
        </p>
      )}

      {/* Cigar-specific ratings */}
      {checkin.category === "cigar" && (
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
      )}

      {/* Flavor tags (cigar) */}
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
                    <Link
                      key={tagId}
                      href={`/flavor/${tagId}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs hover:bg-amber-500/20 transition-all"
                    >
                      <span>{tag.emoji}</span>
                      <span>{tag.label}</span>
                    </Link>
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

      {/* Quick Reactions */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <QuickReactions checkinId={checkin.id} compact />
      </div>

      {/* Like & Comment buttons */}
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={handleLike}
          disabled={liking}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            liked 
              ? "text-red-400 bg-red-500/10" 
              : "text-gray-400 hover:text-red-400 hover:bg-red-500/10"
          }`}
        >
          <FiHeart size={16} fill={liked ? "currentColor" : "none"} />
          <span className="text-sm">{likeCount > 0 ? likeCount : "Like"}</span>
        </button>
        <button
          onClick={toggleComments}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            showComments 
              ? "text-amber-400 bg-amber-500/10" 
              : "text-gray-400 hover:text-amber-400 hover:bg-amber-500/10"
          }`}
        >
          <FiMessageCircle size={16} />
          <span className="text-sm">{commentCount > 0 ? commentCount : "Comment"}</span>
        </button>
        <ShareMenu
          url={shareUrl}
          text={shareText}
          title={`${checkin.brand} - Puffed`}
          className="ml-auto"
        />
      </div>

      {/* Comments section */}
      {showComments && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 pt-3 border-t border-white/5"
        >
          {loadingComments ? (
            <div className="flex justify-center py-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full"
              />
            </div>
          ) : (
            <>
              {/* Existing comments */}
              <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
                {comments.length === 0 ? (
                  <div className="text-center py-2">
                    <p className="text-gray-500 text-sm mb-3">No comments yet. Be the first!</p>
                    <QuickComments 
                      onSelect={(text) => {
                        setNewComment(text);
                      }}
                      disabled={posting}
                    />
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2 text-sm">
                      <Link 
                        href={`/user/${comment.username}`}
                        className="text-amber-500 hover:underline font-medium flex-shrink-0"
                      >
                        @{comment.username}
                      </Link>
                      <p className="text-gray-300">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add comment form */}
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                />
                <button
                  type="submit"
                  disabled={posting || !newComment.trim()}
                  className="p-2 rounded-lg bg-amber-500 text-black disabled:opacity-50 transition-all hover:bg-amber-400"
                >
                  <FiSend size={16} />
                </button>
              </form>
            </>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

interface TodayStats {
  newUsers: number;
  newCheckins: number;
  newLikes: number;
  newFollows: number;
  newComments: number;
  newReactions: number;
  totalUsers: number;
}

export default function DiscoverPage() {
  const router = useRouter();
  const [checkins, setCheckins] = useState<CheckinWithLikes[]>([]);
  const [trending, setTrending] = useState<TrendingBrand[]>([]);
  const [momentum, setMomentum] = useState<TrendingWeekBrand[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [featured, setFeatured] = useState<FeaturedCheckin | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [followingAll, setFollowingAll] = useState(false);
  const [followAllMessage, setFollowAllMessage] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | undefined>();
  const [unreadCount, setUnreadCount] = useState(0);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [sundayDigest, setSundayDigest] = useState<{
    thisWeek: { newUsers: number; checkins: number; likes: number; follows: number };
    growth: { usersGrowth: number; checkinsGrowth: number; engagementGrowth: number };
    topBrandThisWeek: string | null;
    mostActiveUser: string | null;
    communityMessage: string;
    weekendWarriors?: Array<{ username: string; checkins: number; likes: number; totalActivity: number }>;
    weekendStats?: { totalCheckins: number; totalLikes: number; activeUsers: number };
    newMembers?: Array<{ username: string; joinedAt: number; checkins: number; followers: number }>;
    streakChampions?: Array<{ username: string; currentStreak: number; bestStreak: number }>;
    sundaySuggestion?: { brand: string; cigar: string; avgRating: number; totalSmokes: number; topFlavors: string[] } | null;
  } | null>(null);
  const [isSunday, setIsSunday] = useState(false);
  const [isAprilFirstWeek, setIsAprilFirstWeek] = useState(false);
  const [aprilStats, setAprilStats] = useState<{ smokesThisMonth: number; daysActive: number } | null>(null);
  const [mostLoved, setMostLoved] = useState<MostLovedCheckin[]>([]);
  const [needsLove, setNeedsLove] = useState<NeedsLoveCheckin[]>([]);
  const [tasteTwin, setTasteTwin] = useState<{
    twin: { username: string; shared_brands: string[]; overlap_count: number; is_following: boolean } | null;
    all_matches?: Array<{ username: string; shared_brands: string[]; overlap_count: number; is_following: boolean }>;
  } | null>(null);
  const [isNightOwlHours, setIsNightOwlHours] = useState(false);
  const [nightOwlMessage, setNightOwlMessage] = useState("");
  const [isFriday, setIsFriday] = useState(false);
  const [fridayMessage, setFridayMessage] = useState("");
  const [isSaturday, setIsSaturday] = useState(false);
  const [saturdayMessage, setSaturdayMessage] = useState("");
  const [sundayMessage, setSundayMessage] = useState("");
  const [isMonday, setIsMonday] = useState(false);
  const [mondayMessage, setMondayMessage] = useState("");
  const [isWednesday, setIsWednesday] = useState(false);
  const [wednesdayMessage, setWednesdayMessage] = useState("");
  const [isTuesday, setIsTuesday] = useState(false);
  const [tuesdayMessage, setTuesdayMessage] = useState("");
  const [isThursday, setIsThursday] = useState(false);
  const [thursdayMessage, setThursdayMessage] = useState("");
  const [weekendChallenge, setWeekendChallenge] = useState<WeekendChallengeResponse | null>(null);
  const [checkinsThisWeek, setCheckinsThisWeek] = useState<number | null>(null);
  const [lastCheckinAt, setLastCheckinAt] = useState<number | null>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgressResponse | null>(null);
  const [weeklyProgressLoading, setWeeklyProgressLoading] = useState(true);

  // Load user for sidebar
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data: { user?: { username: string } } = await res.json();
          setCurrentUser(data.user?.username);
          // Load notification count
          const notifRes = await fetch("/api/notifications/count");
          if (notifRes.ok) {
            const notifData: { count?: number } = await notifRes.json();
            setUnreadCount(notifData.count || 0);
          }
        }
      } catch { /* ignore */ }
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  useEffect(() => {
    loadFeed();
    loadTrending();
    loadMomentum();
    loadSuggestedUsers();
    loadFeatured();
    loadMostLoved();
    loadNeedsLove();
    loadTasteTwin();
    loadWeekendChallenge();
    loadWeeklyActivity();
    loadTodayStats();
    loadWeeklyProgress();
    
    // Check if it's Sunday and load special content
    const today = new Date();
    const isSundayNow = today.getDay() === 0;
    setIsSunday(isSundayNow);
    if (isSundayNow) {
      loadSundayDigest();
      const hour = today.getHours();
      const isMorning = hour < 12;
      const isEvening = hour >= 17;
      const morningMessages = [
        "Sunday morning slow burn — savor the quiet ☕",
        "Lazy Sunday vibes — take your time 🌅",
        "Sunday Funday! What's lighting up? ✨",
        "Perfect morning for a reflective smoke 🍃"
      ];
      const afternoonMessages = [
        "Sunday afternoon session — relax and enjoy 🌤️",
        "Weekend's almost over — make it count 💨",
        "Sunday chill: good smoke, good vibes 🎶",
        "Afternoon wind-down — log your smoke 🌿"
      ];
      const eveningMessages = [
        "Sunday wind-down — one last smoke before the week 🌙",
        "End the weekend right with something special ✨",
        "Sunday evening reflections — what a week! 💭",
        "Peaceful Sunday night — perfect smoke weather 🌠",
        "Ease into Monday with a Sunday night smoke 😌"
      ];
      const sundayMsgs = isMorning ? morningMessages : (isEvening ? eveningMessages : afternoonMessages);
      setSundayMessage(sundayMsgs[Math.floor(Math.random() * sundayMsgs.length)]);
    }
    
    // Check if it's the first week of April
    const isApril = today.getMonth() === 3; // 0-indexed, April = 3
    const dayOfMonth = today.getDate();
    if (isApril && dayOfMonth <= 7) {
      setIsAprilFirstWeek(true);
      loadAprilStats();
    }
    
    // Check if it's Night Owl hours (8pm - 4am)
    const hour = today.getHours();
    const isNightTime = hour >= 20 || hour < 4;
    setIsNightOwlHours(isNightTime);
    if (isNightTime) {
      const messages = [
        "The best smokes happen after dark 🌙",
        "Night owls unite — log your late-night smoke 🦉",
        "Quiet hours, quality smokes ✨",
        "The moon's out, time to light up 🌑",
        "Late night crew checking in? 🔥"
      ];
      setNightOwlMessage(messages[Math.floor(Math.random() * messages.length)]);
    }
    
    // Check if it's Friday (TGIF vibes!)
    const isFridayNow = today.getDay() === 5;
    setIsFriday(isFridayNow);
    if (isFridayNow) {
      const isEvening = hour >= 17;
      const morningMessages = [
        "Happy Friday! The weekend starts now 🎉",
        "Friday morning — treat yourself to something good ☕",
        "You made it! Any weekend smoke plans? 🙌",
        "TGIF! What's on the menu this weekend? ✨"
      ];
      const eveningMessages = [
        "TGIF! Time to celebrate with your favorite smoke 🎉",
        "Friday night, perfect for something special 🔥",
        "Cheers to the weekend! What's lighting up tonight? 🍻",
        "Friday vibes: Good company, great smoke 🌙"
      ];
      const messages = isEvening ? eveningMessages : morningMessages;
      setFridayMessage(messages[Math.floor(Math.random() * messages.length)]);
    }
    
    // Check if it's Saturday (Weekend Warrior mode!)
    const isSaturdayNow = today.getDay() === 6;
    setIsSaturday(isSaturdayNow);
    if (isSaturdayNow) {
      const isEvening = hour >= 17;
      const isMorning = hour < 12;
      const morningMessages = [
        "Saturday morning — perfect time for a slow smoke ☕",
        "Weekend warrior mode: activated 🏆",
        "Lazy Saturday vibes — what's first on the list? 🌅",
        "Saturday brunch & a good smoke? Yes please ✨"
      ];
      const afternoonMessages = [
        "Saturday afternoon smoke session 🔥",
        "Peak weekend energy — enjoy it! 🌞",
        "The weekend is yours. Light something good 💨",
        "Saturday chill: relax, unwind, smoke 🍃"
      ];
      const eveningMessages = [
        "Saturday night lights — time to shine 🌟",
        "Weekend warrior: still going strong 🔥",
        "Saturday evening = premium smoke time 🌙",
        "The night is young — what's in the humidor? ✨"
      ];
      const messages = isMorning ? morningMessages : (isEvening ? eveningMessages : afternoonMessages);
      setSaturdayMessage(messages[Math.floor(Math.random() * messages.length)]);
    }

    // Check if it's Monday (Start the week right!)
    const isMondayNow = today.getDay() === 1;
    setIsMonday(isMondayNow);
    if (isMondayNow) {
      const isMorning = hour < 12;
      const isEvening = hour >= 17;
      const morningMessages = [
        "Monday morning — start the week with a good smoke ☕",
        "New week, new smokes. What's first? 🚀",
        "Monday motivation: log your first smoke of the week ✨",
        "Rise and grind — then unwind with a quality smoke 🌅"
      ];
      const afternoonMessages = [
        "Midday Monday break? You've earned it 💨",
        "Monday momentum building — keep it going 🔥",
        "Power through the week with a quick smoke session 💪",
        "Monday afternoon vibes — log a smoke 🌤️"
      ];
      const eveningMessages = [
        "Monday survived — time for a victory smoke 🏆",
        "You made it through Monday. Celebrate! 🎉",
        "Monday evening wind-down time 🌙",
        "Start the week strong — end the day stronger 💫"
      ];
      const messages = isMorning ? morningMessages : (isEvening ? eveningMessages : afternoonMessages);
      setMondayMessage(messages[Math.floor(Math.random() * messages.length)]);
    }
    
    // Check if it's Wednesday (Hump Day!)
    const isWednesdayNow = today.getDay() === 3;
    setIsWednesday(isWednesdayNow);
    if (isWednesdayNow) {
      const isWedMorning = hour < 12;
      const isWedEvening = hour >= 17;
      const morningMessages = [
        "Happy Hump Day! 🐫 Halfway there!",
        "Wednesday morning — the week's peak is here ⛰️",
        "Midweek momentum — keep it rolling ☕",
        "Wednesday vibes: downhill from here! 🎢"
      ];
      const afternoonMessages = [
        "Hump Day afternoon — you've got this! 💪",
        "Wednesday halfway mark — treat yourself 🔥",
        "Peak of the week — enjoy the view 🌄",
        "Midweek smoke break? Earned it 🍃"
      ];
      const eveningMessages = [
        "Wednesday evening — downhill from here! 🌙",
        "Hump Day conquered — celebrate! 🎉",
        "Midweek wind-down — almost weekend 🌆",
        "Wednesday night smoke — you made it 🏆"
      ];
      const messages = isWedMorning ? morningMessages : (isWedEvening ? eveningMessages : afternoonMessages);
      setWednesdayMessage(messages[Math.floor(Math.random() * messages.length)]);
    }
    
    // Check if it's Tuesday (Tasty Tuesday - explore flavors!)
    const isTuesdayNow = today.getDay() === 2;
    setIsTuesday(isTuesdayNow);
    if (isTuesdayNow) {
      const isTuesMorning = hour < 12;
      const isTuesEvening = hour >= 17;
      const morningMessages = [
        "Tasty Tuesday! 🍫 What flavors are you craving?",
        "Tuesday morning — explore a new flavor profile ☕",
        "Try something different today 🌿",
        "Flavor adventure awaits — what's your pick? 🎨"
      ];
      const afternoonMessages = [
        "Tasty Tuesday afternoon — time to taste-test 🔥",
        "Midday flavor break? Perfect timing 💨",
        "Tuesday vibes: chase those tasting notes 📝",
        "Explore the flavor wheel today 🎯"
      ];
      const eveningMessages = [
        "Tuesday evening — savor something special 🌙",
        "Tasty Tuesday wind-down — what's your go-to? 🍃",
        "Evening flavor session — notes & relaxation 🎶",
        "Tuesday night treat yourself 🏆"
      ];
      const tuesdayMessages = isTuesMorning ? morningMessages : (isTuesEvening ? eveningMessages : afternoonMessages);
      setTuesdayMessage(tuesdayMessages[Math.floor(Math.random() * tuesdayMessages.length)]);
    }
    
    // Check if it's Thursday (Throwback Thursday - reminisce!)
    const isThursdayNow = today.getDay() === 4;
    setIsThursday(isThursdayNow);
    if (isThursdayNow) {
      const isThursMorning = hour < 12;
      const isThursEvening = hour >= 17;
      const morningMessages = [
        "Throwback Thursday! 📸 What's your all-time favorite smoke?",
        "Thursday morning — revisit a classic ☕",
        "Remember that perfect smoke? Light it up again 🔥",
        "Nostalgic vibes — what got you into smoking? 🌅"
      ];
      const afternoonMessages = [
        "Throwback Thursday! 🎬 Share your smoke story",
        "Afternoon throwback — pair with memories 💭",
        "That smoke you'll never forget? Today's the day 🏆",
        "Classic choices for a classic Thursday 🎯"
      ];
      const eveningMessages = [
        "Thursday evening throwback — old favorites 🌙",
        "Revisit the classics tonight 🌆",
        "Throwback time — what's your origin story? 📖",
        "Almost Friday — celebrate with a nostalgic pick 🎉"
      ];
      const thursdayMessages = isThursMorning ? morningMessages : (isThursEvening ? eveningMessages : afternoonMessages);
      setThursdayMessage(thursdayMessages[Math.floor(Math.random() * thursdayMessages.length)]);
    }
  }, []);
  
  async function loadAprilStats() {
    try {
      const res = await fetch("/api/my-month-stats");
      if (res.ok) {
        const data = await res.json() as { smokesThisMonth?: number; daysActive?: number };
        setAprilStats({
          smokesThisMonth: data.smokesThisMonth || 0,
          daysActive: data.daysActive || 0
        });
      }
    } catch (error) {
      console.error("April stats error:", error);
    }
  }

  async function loadSundayDigest() {
    try {
      const res = await fetch("/api/sunday-digest");
      if (res.ok) {
        const data = await res.json() as {
          thisWeek: { newUsers: number; checkins: number; likes: number; follows: number };
          growth: { usersGrowth: number; checkinsGrowth: number; engagementGrowth: number };
          topBrandThisWeek: string | null;
          mostActiveUser: string | null;
          communityMessage: string;
        };
        setSundayDigest(data);
      }
    } catch (error) {
      console.error("Sunday digest error:", error);
    }
  }

  async function loadTodayStats() {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json() as { 
        today?: Omit<TodayStats, 'totalUsers'>; 
        overall?: { total_users: number } 
      };
      if (data.today) {
        setTodayStats({
          ...data.today,
          totalUsers: data.overall?.total_users || 0
        });
      }
    } catch (error) {
      console.error("Stats error:", error);
    }
  }

  async function loadFeed(query = "", category = activeCategory) {
    try {
      setSearching(true);
      let url = "/api/discover";
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (category && category !== "all") params.set("category", category);
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await fetch(url);
      const data: DiscoverResponse = await res.json();
      setCheckins(data.checkins || []);
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }

  async function loadTrending() {
    try {
      const res = await fetch("/api/trending");
      const data: TrendingResponse = await res.json();
      setTrending(data.trending || []);
    } catch (error) {
      console.error("Trending error:", error);
    }
  }

  async function loadMomentum() {
    try {
      const res = await fetch("/api/trending-week?limit=6");
      const data: TrendingWeekResponse = await res.json();
      // Only show brands that are UP or NEW
      const upOrNew = (data.trending || []).filter(b => b.direction === 'up' || b.direction === 'new');
      setMomentum(upOrNew);
    } catch (error) {
      console.error("Momentum error:", error);
    }
  }

  async function loadSuggestedUsers() {
    try {
      const res = await fetch("/api/users/suggested");
      const data: SuggestedUsersResponse = await res.json();
      setSuggestedUsers(data.users || []);
      // Track which users are already followed
      const followedSet = new Set(
        (data.users || []).filter(u => u.is_following).map(u => u.username)
      );
      setFollowingUsers(followedSet);
    } catch (error) {
      console.error("Suggested users error:", error);
    }
  }

  async function loadFeatured() {
    try {
      const res = await fetch("/api/featured");
      const data: FeaturedResponse = await res.json();
      setFeatured(data.featured);
    } catch (error) {
      console.error("Featured error:", error);
    }
  }

  async function loadMostLoved() {
    try {
      const res = await fetch("/api/most-loved");
      const data: MostLovedResponse = await res.json();
      setMostLoved(data.checkins || []);
    } catch (error) {
      console.error("Most loved error:", error);
    }
  }

  async function loadNeedsLove() {
    try {
      const res = await fetch("/api/needs-love");
      const data: NeedsLoveResponse = await res.json();
      setNeedsLove(data.checkins || []);
    } catch (error) {
      console.error("Needs love error:", error);
    }
  }

  async function loadTasteTwin() {
    try {
      const res = await fetch("/api/taste-twin");
      const data = await res.json() as {
        twin: { username: string; shared_brands: string[]; overlap_count: number; is_following: boolean } | null;
        all_matches?: Array<{ username: string; shared_brands: string[]; overlap_count: number; is_following: boolean }>;
      };
      setTasteTwin(data);
    } catch (error) {
      console.error("Taste twin error:", error);
    }
  }

  async function loadWeekendChallenge() {
    try {
      const res = await fetch("/api/weekend-challenge");
      const data: WeekendChallengeResponse = await res.json();
      setWeekendChallenge(data);
    } catch (error) {
      console.error("Weekend challenge error:", error);
    }
  }

  async function loadWeeklyActivity() {
    try {
      const res = await fetch("/api/public-stats");
      const data: { activity?: { checkinsThisWeek?: number; lastCheckinAt?: number | null } } = await res.json();
      setCheckinsThisWeek(data.activity?.checkinsThisWeek ?? 0);
      setLastCheckinAt(data.activity?.lastCheckinAt ?? null);
    } catch (error) {
      console.error("Weekly activity error:", error);
    }
  }

  async function loadWeeklyProgress() {
    setWeeklyProgressLoading(true);
    try {
      const res = await fetch("/api/my-weekly-progress");
      if (res.ok) {
        const data: WeeklyProgressResponse = await res.json();
        setWeeklyProgress(data);
      }
    } catch (error) {
      console.error("Weekly progress error:", error);
    } finally {
      setWeeklyProgressLoading(false);
    }
  }

  async function handleFollow(username: string) {
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (res.ok) {
        const data: FollowResponse = await res.json();
        setFollowingUsers(prev => {
          const next = new Set(prev);
          if (data.following) {
            next.add(username);
          } else {
            next.delete(username);
          }
          return next;
        });
      }
    } catch (error) {
      console.error("Follow error:", error);
    }
  }

  async function handleFollowAll() {
    if (followingAll) return;
    setFollowingAll(true);
    setFollowAllMessage(null);
    try {
      const res = await fetch("/api/follow-all", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json() as { message: string; followedCount: number };
        setFollowAllMessage(data.message);
        // Mark all suggested users as followed
        if (data.followedCount > 0) {
          setFollowingUsers(prev => {
            const next = new Set(prev);
            suggestedUsers.forEach(u => next.add(u.username));
            return next;
          });
        }
        // Clear message after 3 seconds
        setTimeout(() => setFollowAllMessage(null), 3000);
      }
    } catch (error) {
      console.error("Follow all error:", error);
      setFollowAllMessage("Something went wrong");
    } finally {
      setFollowingAll(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadFeed(searchQuery, activeCategory);
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    loadFeed(searchQuery, category);
  };

  const handleLike = (checkinId: string) => {
    // Handled in CheckinCard
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
    <>
      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        username={currentUser}
        unreadCount={unreadCount}
        onLogout={handleLogout}
      />
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Open menu"
              >
                <FiMenu size={24} />
              </button>
              <div>
                <h1 className="font-semibold flex items-center gap-2">
                  Discover
                  {todayStats && todayStats.newCheckins > 0 && (
                    <span className="flex items-center gap-1.5 text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      {todayStats.newCheckins} today
                    </span>
                  )}
                </h1>
                <p className="text-xs text-gray-400">
                  {todayStats && todayStats.totalUsers > 0 
                    ? `${todayStats.totalUsers} smokers • ${todayStats.newLikes + todayStats.newReactions} engagements today`
                    : "See what everyone's smoking"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link 
                href="/search"
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                title="Search"
              >
                <FiSearch size={20} />
              </Link>
              <Link 
                href="/leaderboard"
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-amber-500 transition-all"
                title="Leaderboard"
              >
                <FiAward size={20} />
              </Link>
              <Link 
                href="/gallery"
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-pink-400 transition-all"
                title="Photo Gallery"
              >
                <FiCamera size={20} />
              </Link>
              <Link 
                href="/hidden-gems"
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-emerald-400 transition-all"
                title="Hidden Gems"
              >
                💎
              </Link>
              <Link 
                href="/dashboard"
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                title="Dashboard"
              >
                <FiHome size={20} />
              </Link>
            </div>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="relative mb-3">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search brands, products, reviews..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all"
            />
          </form>

          {/* Category Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => handleCategoryChange("all")}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm transition-all ${
                activeCategory === "all"
                  ? "bg-amber-500 text-black font-medium"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  activeCategory === cat.id
                    ? `${cat.bgColor} ${cat.color} font-medium border border-current`
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Community Pulse - Shows last activity */}
        {lastCheckinAt && !searchQuery && (
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>
              Last smoke logged {(() => {
                const seconds = Math.floor(Date.now() / 1000 - lastCheckinAt);
                if (seconds < 60) return "just now";
                if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
                if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
                return `${Math.floor(seconds / 86400)}d ago`;
              })()}
            </span>
          </div>
        )}

        {/* Weekly Progress Card */}
        {!searchQuery && activeCategory === "all" && (
          <div className="mb-4">
            <WeeklyProgress data={weeklyProgress} loading={weeklyProgressLoading} />
          </div>
        )}

        {/* Time of Day Banner */}
        {!searchQuery && activeCategory === "all" && (
          <div className="mb-4">
            <TimeOfDayBanner />
          </div>
        )}

        {/* Daily Tip */}
        {!searchQuery && activeCategory === "all" && (() => {
          const tip = getTodaysTip();
          return (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{tip.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">💡 Tip of the Day</span>
                    <span className="text-xs text-gray-500 capitalize">• {tip.category}</span>
                  </div>
                  <p className="text-sm text-gray-300">{tip.tip}</p>
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* Sunday Coffee Banner - Only on Sundays */}
        {isSunday && sundayDigest && !searchQuery && activeCategory === "all" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-600/20 via-orange-500/15 to-yellow-500/10 border border-amber-500/30"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">☕</span>
              <div>
                <h3 className="font-semibold text-amber-200">Sunday Coffee</h3>
                <p className="text-xs text-amber-400/80">{sundayDigest.communityMessage}</p>
              </div>
              <Link 
                href="/weekly-wrap"
                className="ml-auto text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-all"
              >
                Your Week →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-lg bg-black/20">
                <div className="text-lg font-bold text-white">{sundayDigest.thisWeek.newUsers}</div>
                <div className="text-xs text-gray-400">New Smokers</div>
                {sundayDigest.growth.usersGrowth > 0 && (
                  <div className="text-xs text-green-400">↑{sundayDigest.growth.usersGrowth}%</div>
                )}
              </div>
              <div className="p-2 rounded-lg bg-black/20">
                <div className="text-lg font-bold text-white">{sundayDigest.thisWeek.checkins}</div>
                <div className="text-xs text-gray-400">Smokes</div>
                {sundayDigest.growth.checkinsGrowth > 0 && (
                  <div className="text-xs text-green-400">↑{sundayDigest.growth.checkinsGrowth}%</div>
                )}
              </div>
              <div className="p-2 rounded-lg bg-black/20">
                <div className="text-lg font-bold text-amber-400 truncate">
                  {sundayDigest.topBrandThisWeek || "—"}
                </div>
                <div className="text-xs text-gray-400">Top Brand</div>
              </div>
              <div className="p-2 rounded-lg bg-black/20">
                <div className="text-lg font-bold text-purple-400 truncate">
                  @{sundayDigest.mostActiveUser || "—"}
                </div>
                <div className="text-xs text-gray-400">MVP</div>
              </div>
            </div>
            
            {/* Weekend Warriors Section */}
            {sundayDigest.weekendWarriors && sundayDigest.weekendWarriors.length > 0 && (
              <div className="mt-4 pt-3 border-t border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚔️</span>
                  <span className="text-sm font-medium text-amber-200">Weekend Warriors</span>
                  {sundayDigest.weekendStats && (
                    <span className="text-xs text-amber-400/60 ml-auto">
                      {sundayDigest.weekendStats.totalCheckins} smokes this weekend
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sundayDigest.weekendWarriors.slice(0, 3).map((warrior, idx) => (
                    <Link
                      key={warrior.username}
                      href={`/u/${warrior.username}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 transition-all border border-amber-500/20"
                    >
                      <span className="text-sm">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                      </span>
                      <span className="text-sm text-amber-100 font-medium">@{warrior.username}</span>
                      <span className="text-xs text-amber-400/70">
                        {warrior.checkins > 0 && `${warrior.checkins} 🚬`}
                        {warrior.likes > 0 && ` ${warrior.likes} ❤️`}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* Welcome New Members Section */}
            {sundayDigest.newMembers && sundayDigest.newMembers.length > 0 && (
              <div className="mt-4 pt-3 border-t border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎊</span>
                  <span className="text-sm font-medium text-amber-200">Welcome New Members</span>
                  <span className="text-xs text-amber-400/60 ml-auto">
                    {sundayDigest.newMembers.length} joined this week
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sundayDigest.newMembers.slice(0, 5).map((member) => (
                    <Link
                      key={member.username}
                      href={`/user/${member.username}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 hover:bg-green-500/20 transition-all border border-green-500/20"
                    >
                      <span className="text-sm">👋</span>
                      <span className="text-sm text-green-100 font-medium">@{member.username}</span>
                      {member.checkins > 0 && (
                        <span className="text-xs text-green-400/70">{member.checkins} 🚬</span>
                      )}
                      {member.followers > 0 && (
                        <span className="text-xs text-green-400/70">{member.followers} 👥</span>
                      )}
                    </Link>
                  ))}
                </div>
                <p className="mt-2 text-xs text-amber-400/60 text-center">
                  Give them a follow and help them feel at home! 💛
                </p>
              </div>
            )}
            
            {/* Streak Champions Section */}
            {sundayDigest.streakChampions && sundayDigest.streakChampions.length > 0 && (
              <div className="mt-4 pt-3 border-t border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🔥</span>
                  <span className="text-sm font-medium text-amber-200">Streak Champions</span>
                  <span className="text-xs text-amber-400/60 ml-auto">
                    Logging daily!
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sundayDigest.streakChampions.map((champ, idx) => (
                    <Link
                      key={champ.username}
                      href={`/user/${champ.username}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 hover:bg-orange-500/20 transition-all border border-orange-500/20"
                    >
                      <span className="text-sm">
                        {idx === 0 ? '🔥' : idx === 1 ? '✨' : '💨'}
                      </span>
                      <span className="text-sm text-orange-100 font-medium">@{champ.username}</span>
                      <span className="text-xs text-orange-400/70">
                        {champ.currentStreak} day{champ.currentStreak !== 1 ? 's' : ''}
                        {champ.bestStreak > champ.currentStreak && ` (best: ${champ.bestStreak})`}
                      </span>
                    </Link>
                  ))}
                </div>
                <p className="mt-2 text-xs text-amber-400/60 text-center">
                  Keep the streak alive — log a smoke every day! 🔥
                </p>
              </div>
            )}

            {/* Sunday Suggestion - Try This Today */}
            {sundayDigest.sundaySuggestion && (
              <div className="mt-4 pt-3 border-t border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💡</span>
                  <span className="text-sm font-medium text-amber-200">Try This Sunday</span>
                  <span className="text-xs text-amber-400/60 ml-auto">
                    Community favorite
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-amber-100">{sundayDigest.sundaySuggestion.brand}</div>
                      <div className="text-sm text-amber-200/80">{sundayDigest.sundaySuggestion.cigar}</div>
                      {sundayDigest.sundaySuggestion.topFlavors.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {sundayDigest.sundaySuggestion.topFlavors.map((flavor) => (
                            <span key={flavor} className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                              {flavor}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-amber-300">
                        {sundayDigest.sundaySuggestion.avgRating}★
                      </div>
                      <div className="text-xs text-amber-400/60">
                        {sundayDigest.sundaySuggestion.totalSmokes} smoke{sundayDigest.sundaySuggestion.totalSmokes !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/checkin"
                    className="mt-3 block text-center px-4 py-2 rounded-lg bg-amber-500/20 text-amber-200 text-sm font-medium hover:bg-amber-500/30 transition-all border border-amber-500/30"
                  >
                    Log Your Sunday Smoke →
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* April Fresh Start Banner - First week of April only */}
        {isAprilFirstWeek && !searchQuery && activeCategory === "all" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-green-500/15 via-emerald-500/10 to-teal-500/15 border border-green-500/30"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🌱</span>
              <div className="flex-1">
                <h3 className="font-semibold text-green-200">April Fresh Start</h3>
                <p className="text-xs text-green-400/80">
                  {aprilStats && aprilStats.smokesThisMonth > 0 
                    ? `You've logged ${aprilStats.smokesThisMonth} smoke${aprilStats.smokesThisMonth === 1 ? '' : 's'} this month across ${aprilStats.daysActive} day${aprilStats.daysActive === 1 ? '' : 's'}!`
                    : "New month, fresh vibes. Log your first April smoke! 🚬"
                  }
                </p>
              </div>
              {aprilStats && aprilStats.smokesThisMonth === 0 && (
                <Link
                  href="/checkin"
                  className="px-4 py-2 rounded-lg bg-green-500/20 text-green-300 text-sm font-medium hover:bg-green-500/30 transition-all border border-green-500/30"
                >
                  Log First Smoke →
                </Link>
              )}
              {aprilStats && aprilStats.smokesThisMonth > 0 && aprilStats.smokesThisMonth < 5 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-300">{5 - aprilStats.smokesThisMonth}</div>
                  <div className="text-xs text-green-400/60">to April 5 badge</div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Night Owl Mode - 8pm to 4am */}
        {isNightOwlHours && !searchQuery && activeCategory === "all" && !isAprilFirstWeek && !isSunday && !isFriday && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-violet-500/15 border border-indigo-500/30"
          >
            <div className="flex items-center gap-3">
              <motion.span 
                className="text-3xl"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              >
                🦉
              </motion.span>
              <div className="flex-1">
                <h3 className="font-semibold text-indigo-200">Night Owl Mode</h3>
                <p className="text-xs text-indigo-400/80">{nightOwlMessage}</p>
              </div>
              <Link
                href="/checkin"
                className="px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-300 text-sm font-medium hover:bg-indigo-500/30 transition-all border border-indigo-500/30 flex items-center gap-2"
              >
                <span>Log Smoke</span>
                <span className="text-lg">🌙</span>
              </Link>
            </div>
          </motion.div>
        )}

        {/* TGIF Friday Banner */}
        {isFriday && !searchQuery && activeCategory === "all" && !isAprilFirstWeek && !isSunday && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-500/15 via-pink-500/10 to-amber-500/15 border border-purple-500/30"
          >
            <div className="flex items-center gap-3">
              <motion.span 
                className="text-3xl"
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                🎊
              </motion.span>
              <div className="flex-1">
                <h3 className="font-semibold text-purple-200">TGIF!</h3>
                <p className="text-xs text-purple-400/80">{fridayMessage}</p>
              </div>
              <Link
                href="/checkin"
                className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 text-sm font-medium hover:bg-purple-500/30 transition-all border border-purple-500/30 flex items-center gap-2"
              >
                <span>Celebrate</span>
                <span className="text-lg">🎉</span>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Sunday Wind-Down Banner */}
        {isSunday && sundayMessage && !searchQuery && activeCategory === "all" && !isAprilFirstWeek && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-blue-500/15 border border-purple-500/30"
          >
            <div className="flex items-center gap-3">
              <motion.span 
                className="text-3xl"
                animate={{ scale: [1, 1.05, 1], opacity: [1, 0.8, 1] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              >
                🌙
              </motion.span>
              <div className="flex-1">
                <h3 className="font-semibold text-purple-200">Sunday Vibes</h3>
                <p className="text-xs text-purple-400/80">{sundayMessage}</p>
              </div>
              <Link
                href="/checkin"
                className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 text-sm font-medium hover:bg-purple-500/30 transition-all border border-purple-500/30 flex items-center gap-2"
              >
                <span>Log It</span>
                <span className="text-lg">💭</span>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Saturday Smoke Banner */}
        {isSaturday && !searchQuery && activeCategory === "all" && !isAprilFirstWeek && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-yellow-500/15 border border-amber-500/30"
          >
            <div className="flex items-center gap-3">
              <motion.span 
                className="text-3xl"
                animate={{ scale: [1, 1.1, 1], y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              >
                🏆
              </motion.span>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-200">Saturday Smoke!</h3>
                <p className="text-xs text-amber-400/80">{saturdayMessage}</p>
              </div>
              <Link
                href="/checkin"
                className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-all border border-amber-500/30 flex items-center gap-2"
              >
                <span>Log It</span>
                <span className="text-lg">🔥</span>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Be the First This Week Banner - Shows when no check-ins yet this week */}
        {isMonday && checkinsThisWeek === 0 && !searchQuery && activeCategory === "all" && !isAprilFirstWeek && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-green-500/15 to-teal-500/20 border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/10"
          >
            <div className="flex items-center gap-4">
              <motion.div 
                className="text-4xl"
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              >
                🏆
              </motion.div>
              <div className="flex-1">
                <h3 className="font-bold text-emerald-200 text-lg">Be the First This Week!</h3>
                <p className="text-sm text-emerald-400/80">No one has logged a smoke yet — claim the crown! 👑</p>
              </div>
              <Link
                href="/checkin"
                className="px-5 py-3 rounded-xl bg-emerald-500/30 text-emerald-200 text-sm font-bold hover:bg-emerald-500/40 transition-all border border-emerald-400/40 flex items-center gap-2 shadow-lg"
              >
                <span>Log First Smoke</span>
                <motion.span 
                  className="text-xl"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                >
                  🔥
                </motion.span>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Monday Momentum Banner - Only show if there are already check-ins */}
        {isMonday && checkinsThisWeek !== 0 && !searchQuery && activeCategory === "all" && !isAprilFirstWeek && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-500/15 via-cyan-500/10 to-teal-500/15 border border-blue-500/30"
          >
            <div className="flex items-center gap-3">
              <motion.span 
                className="text-3xl"
                animate={{ scale: [1, 1.1, 1], x: [0, 2, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                🚀
              </motion.span>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-200">Monday Momentum!</h3>
                <p className="text-xs text-blue-400/80">{mondayMessage}</p>
              </div>
              <Link
                href="/checkin"
                className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-300 text-sm font-medium hover:bg-blue-500/30 transition-all border border-blue-500/30 flex items-center gap-2"
              >
                <span>Start Week</span>
                <span className="text-lg">💪</span>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Tasty Tuesday Banner */}
        {isTuesday && !searchQuery && activeCategory === "all" && !isAprilFirstWeek && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-yellow-500/15 border border-amber-500/30"
          >
            <div className="flex items-center gap-3">
              <motion.span 
                className="text-3xl"
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              >
                🍫
              </motion.span>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-200">Tasty Tuesday!</h3>
                <p className="text-xs text-amber-400/80">{tuesdayMessage}</p>
              </div>
              <Link
                href="/flavor-dna"
                className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-all border border-amber-500/30 flex items-center gap-2"
              >
                <span>My Flavor DNA</span>
                <span className="text-lg">🧬</span>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Hump Day Wednesday Banner */}
        {isWednesday && !searchQuery && activeCategory === "all" && !isAprilFirstWeek && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-green-500/10 to-teal-500/15 border border-emerald-500/30"
          >
            <div className="flex items-center gap-3">
              <motion.span 
                className="text-3xl"
                animate={{ y: [0, -5, 0], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                🐫
              </motion.span>
              <div className="flex-1">
                <h3 className="font-semibold text-emerald-200">Hump Day!</h3>
                <p className="text-xs text-emerald-400/80">{wednesdayMessage}</p>
              </div>
              <Link
                href="/checkin"
                className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-sm font-medium hover:bg-emerald-500/30 transition-all border border-emerald-500/30 flex items-center gap-2"
              >
                <span>Log It</span>
                <span className="text-lg">⛰️</span>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Throwback Thursday Banner */}
        {isThursday && !searchQuery && activeCategory === "all" && !isAprilFirstWeek && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-500/15 via-violet-500/10 to-fuchsia-500/15 border border-purple-500/30"
          >
            <div className="flex items-center gap-3">
              <motion.span 
                className="text-3xl"
                animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              >
                📸
              </motion.span>
              <div className="flex-1">
                <h3 className="font-semibold text-purple-200">Throwback Thursday!</h3>
                <p className="text-xs text-purple-400/80">{thursdayMessage}</p>
              </div>
              <Link
                href="/history"
                className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 text-sm font-medium hover:bg-purple-500/30 transition-all border border-purple-500/30 flex items-center gap-2"
              >
                <span>My History</span>
                <span className="text-lg">📖</span>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Weekend Challenge Banner */}
        {weekendChallenge?.active && weekendChallenge.challenge && !searchQuery && activeCategory === "all" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-pink-500/15 border border-indigo-500/30"
          >
            <div className="flex items-center gap-3 mb-3">
              <motion.span 
                className="text-3xl"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              >
                {weekendChallenge.challenge.emoji}
              </motion.span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-indigo-200">{weekendChallenge.challenge.title}</h3>
                  {weekendChallenge.challenge.completed && (
                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">✓ Complete!</span>
                  )}
                </div>
                <p className="text-xs text-indigo-400/80">{weekendChallenge.challenge.description}</p>
              </div>
              <span className="text-xs text-indigo-400/60">{weekendChallenge.timeRemaining}</span>
            </div>
            {/* Progress Bar */}
            <div className="relative h-3 rounded-full bg-indigo-900/40 overflow-hidden">
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-full ${weekendChallenge.challenge.completed ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${weekendChallenge.challenge.progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between items-center mt-2 text-xs">
              <span className="text-indigo-300">
                {weekendChallenge.challenge.current} / {weekendChallenge.challenge.goal}
              </span>
              <span className="text-indigo-400/60">
                🏆 {weekendChallenge.challenge.reward}
              </span>
            </div>
          </motion.div>
        )}

        {/* Live Activity Pulse - Saturday Night Edition */}
        {todayStats && !searchQuery && activeCategory === "all" && (todayStats.newUsers > 0 || todayStats.newCheckins > 0 || todayStats.newLikes > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-amber-500/10 border border-purple-500/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-lg"
              >
                🔴
              </motion.span>
              <span className="font-semibold text-white">Live Today</span>
              {todayStats.totalUsers > 0 && (
                <span className="text-xs text-amber-400 font-medium">
                  🚀 {todayStats.totalUsers} smokers strong
                </span>
              )}
              <span className="text-xs text-gray-400 ml-auto">Auto-updates</span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {todayStats.newUsers > 0 && (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300">
                  <FiUsers size={14} />
                  <span>+{todayStats.newUsers} new {todayStats.newUsers === 1 ? 'smoker' : 'smokers'}</span>
                </span>
              )}
              {todayStats.newCheckins > 0 && (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300">
                  🚬
                  <span>{todayStats.newCheckins} {todayStats.newCheckins === 1 ? 'smoke' : 'smokes'}</span>
                </span>
              )}
              {todayStats.newLikes > 0 && (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/20 text-red-300">
                  <FiHeart size={14} />
                  <span>{todayStats.newLikes} {todayStats.newLikes === 1 ? 'like' : 'likes'}</span>
                </span>
              )}
              {todayStats.newFollows > 0 && (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-pink-500/20 text-pink-300">
                  <FiUserPlus size={14} />
                  <span>{todayStats.newFollows} follows</span>
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Featured Check-in of the Day */}
        {featured && !searchQuery && activeCategory === "all" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-amber-500">⭐</span>
              <h2 className="font-semibold">Featured Today</h2>
              <span className="text-xs text-gray-500 ml-auto">Updated daily</span>
            </div>
            <Link
              href={`/checkin/${featured.id}`}
              className="block glass rounded-2xl overflow-hidden border border-amber-500/30 hover:border-amber-500/50 transition-all group"
            >
              {/* Featured Image or Gradient Header */}
              {featured.image_url ? (
                <div className="relative h-40 overflow-hidden">
                  <img 
                    src={featured.image_url} 
                    alt={featured.brand}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="font-bold text-lg text-white">{featured.brand}</h3>
                    {featured.product && <p className="text-gray-300 text-sm">{featured.product}</p>}
                  </div>
                  {featured.rating && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-amber-500 px-2 py-1 rounded-lg">
                      <FiStar className="text-black" fill="currentColor" size={14} />
                      <span className="text-black font-bold text-sm">{featured.rating}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative h-32 bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-4xl mb-2">🚬</span>
                    <h3 className="font-bold text-lg">{featured.brand}</h3>
                    {featured.product && <p className="text-gray-400 text-sm">{featured.product}</p>}
                  </div>
                  {featured.rating && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-amber-500 px-2 py-1 rounded-lg">
                      <FiStar className="text-black" fill="currentColor" size={14} />
                      <span className="text-black font-bold text-sm">{featured.rating}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="p-4">
                {featured.review && (
                  <p className="text-gray-300 text-sm mb-3 line-clamp-2">"{featured.review}"</p>
                )}
                <div className="flex items-center justify-between">
                  <Link 
                    href={`/user/${featured.username}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-amber-500 hover:underline text-sm font-medium"
                  >
                    @{featured.username}
                  </Link>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {featured.like_count > 0 && (
                      <span className="flex items-center gap-1">
                        <FiHeart size={12} /> {featured.like_count}
                      </span>
                    )}
                    {featured.comment_count > 0 && (
                      <span className="flex items-center gap-1">
                        <FiMessageCircle size={12} /> {featured.comment_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
            {/* Prominent share CTA for featured check-in */}
            <div className="mt-3 flex justify-center" onClick={(e) => e.stopPropagation()}>
              <ShareMenu
                url={typeof window !== "undefined" ? `${window.location.origin}/checkin/${featured.id}` : `/checkin/${featured.id}`}
                text={`Check out today's featured smoke on Puffed! ${featured.brand}${featured.product ? ` ${featured.product}` : ''} 🚬 #Puffed`}
                title={`${featured.brand} - Featured on Puffed`}
                prominent
              />
            </div>
          </motion.div>
        )}

        {/* Needs Love Section - Recent check-ins with no engagement */}
        {!searchQuery && needsLove.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-4 mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-pink-400">💕</span>
              <h2 className="font-semibold">Show Some Love</h2>
              <span className="text-xs text-gray-500 ml-auto">No engagement yet</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">These recent smokes need some appreciation!</p>
            <div className="space-y-3">
              {needsLove.slice(0, 3).map((checkin) => {
                const category = getCategory(checkin.category as import("@/lib/types").CheckinCategory);
                return (
                  <Link
                    key={checkin.id}
                    href={`/checkin/${checkin.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-pink-500/10 border border-white/10 hover:border-pink-500/30 transition-all group"
                  >
                    {checkin.photo_url ? (
                      <img
                        src={checkin.photo_url}
                        alt={checkin.brand}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-lg ${category.bgColor} flex items-center justify-center text-xl`}>
                        {category.emoji}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-500 text-sm">@{checkin.username}</span>
                        {checkin.rating && (
                          <span className="text-yellow-500 text-xs flex items-center gap-0.5">
                            <FiStar className="w-3 h-3" /> {checkin.rating}
                          </span>
                        )}
                      </div>
                      <div className="font-medium truncate">
                        {checkin.brand}{checkin.product ? ` ${checkin.product}` : ''}
                      </div>
                    </div>
                    <div className="text-pink-400 group-hover:scale-110 transition-transform">
                      <FiHeart className="w-5 h-5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Browse by Flavor Section - only show for cigars or all */}
        {!searchQuery && (activeCategory === "all" || activeCategory === "cigar") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-amber-500">🍂</span>
              <h2 className="font-semibold">Browse by Flavor</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {FLAVOR_TAGS.slice(0, 10).map((flavor) => (
                <Link
                  key={flavor.id}
                  href={`/flavor/${flavor.id}`}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-amber-500/20 hover:border-amber-500/50 border border-white/10 transition-all"
                >
                  <span className="text-lg">{flavor.emoji}</span>
                  <span className="text-sm font-medium">{flavor.label}</span>
                </Link>
              ))}
              <Link
                href="/search"
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-gray-400"
              >
                <span className="text-sm">More →</span>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Most Loved This Week */}
        {mostLoved.length > 0 && !searchQuery && activeCategory === "all" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-pink-500">💕</span>
              <h2 className="font-semibold">Most Loved This Week</h2>
            </div>
            <div className="space-y-2">
              {mostLoved.slice(0, 3).map((checkin, index) => (
                <Link
                  key={checkin.id}
                  href={`/checkin/${checkin.id}`}
                  className="block glass rounded-xl p-3 hover:border-pink-500/50 border border-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{checkin.brand}</span>
                        {checkin.rating && (
                          <span className="flex items-center gap-0.5 text-amber-500 text-sm">
                            <FiStar size={12} fill="currentColor" />
                            {checkin.rating}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/user/${checkin.username}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-400 text-sm hover:text-amber-500"
                      >
                        @{checkin.username}
                      </Link>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {checkin.like_count > 0 && (
                        <span className="flex items-center gap-1">
                          <FiHeart size={12} className="text-pink-500" /> {checkin.like_count}
                        </span>
                      )}
                      {checkin.reaction_count > 0 && (
                        <span className="flex items-center gap-1">
                          💨 {checkin.reaction_count}
                        </span>
                      )}
                      {checkin.comment_count > 0 && (
                        <span className="flex items-center gap-1">
                          <FiMessageCircle size={12} /> {checkin.comment_count}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Trending Section */}
        {trending.length > 0 && !searchQuery && activeCategory === "all" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <FiTrendingUp className="text-amber-500" />
              <h2 className="font-semibold">Trending This Week</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {trending.map((brand, index) => (
                <Link
                  key={brand.brand}
                  href={`/cigar/${encodeURIComponent(brand.brand)}`}
                  className="flex-shrink-0 glass px-4 py-2 rounded-xl hover:border-amber-500/50 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🔥"}</span>
                    <div className="text-left">
                      <p className="font-medium text-sm">{brand.brand}</p>
                      <p className="text-xs text-gray-400">
                        {brand.checkin_count} {brand.checkin_count === 1 ? "smoke" : "smokes"}
                        {brand.avg_rating && ` • ${brand.avg_rating}★`}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Gaining Momentum Section - Brands trending up vs last week */}
        {momentum.length > 0 && !searchQuery && activeCategory === "all" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-green-400">📈</span>
              <h2 className="font-semibold">Gaining Momentum</h2>
              <span className="text-xs text-gray-500 ml-auto">vs last week</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {momentum.map((brand) => (
                <Link
                  key={brand.brand}
                  href={`/cigar/${encodeURIComponent(brand.brand)}`}
                  className="flex-shrink-0 glass px-4 py-3 rounded-xl hover:border-green-500/50 border border-green-500/20 transition-all min-w-[140px]"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{brand.brand}</p>
                    {brand.direction === 'new' ? (
                      <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400">
                        NEW
                      </span>
                    ) : (
                      <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400">
                        ↑{brand.change}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{brand.thisWeekCount} smoke{brand.thisWeekCount !== 1 ? 's' : ''}</span>
                    {brand.avgRating && (
                      <span className="flex items-center gap-0.5">
                        <FiStar size={10} className="text-amber-500" fill="currentColor" />
                        {brand.avgRating}
                      </span>
                    )}
                  </div>
                  {brand.direction !== 'new' && brand.lastWeekCount > 0 && (
                    <p className="text-[10px] text-gray-500 mt-1">
                      was {brand.lastWeekCount} last week
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Taste Twin Section - Find your smoking buddy */}
        {tasteTwin?.twin && !searchQuery && activeCategory === "all" && !tasteTwin.twin.is_following && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-blue-500/10 border border-pink-500/25">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">👯</span>
                <div>
                  <h3 className="font-semibold text-pink-200">Your Taste Twin</h3>
                  <p className="text-xs text-pink-400/80">Someone who smokes what you smoke!</p>
                </div>
              </div>
              <Link
                href={`/user/${tasteTwin.twin.username}`}
                className="flex items-center justify-between p-3 rounded-xl bg-black/30 hover:bg-black/40 transition-all"
              >
                <div>
                  <p className="font-medium text-white">@{tasteTwin.twin.username}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    You both enjoy: {tasteTwin.twin.shared_brands.join(', ')}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleFollow(tasteTwin.twin!.username);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-pink-500 text-white hover:bg-pink-400 transition-all"
                >
                  <FiUserPlus size={14} />
                  <span>Follow</span>
                </button>
              </Link>
              {tasteTwin.all_matches && tasteTwin.all_matches.length > 1 && (
                <p className="text-xs text-pink-400/60 mt-2 text-center">
                  +{tasteTwin.all_matches.length - 1} more with similar taste
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* People to Follow Section */}
        {suggestedUsers.length > 0 && !searchQuery && activeCategory === "all" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FiUsers className="text-amber-500" />
                <h2 className="font-semibold">People to Follow</h2>
              </div>
              {suggestedUsers.some(u => !followingUsers.has(u.username)) && (
                <button
                  onClick={handleFollowAll}
                  disabled={followingAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50 transition-all"
                >
                  <FiUserPlus size={14} />
                  {followingAll ? "Following..." : "Follow All"}
                </button>
              )}
            </div>
            {followAllMessage && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm text-center">
                {followAllMessage}
              </div>
            )}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {suggestedUsers.map((user) => {
                const isFollowing = followingUsers.has(user.username);
                return (
                  <div
                    key={user.username}
                    className="flex-shrink-0 glass px-4 py-3 rounded-xl min-w-[160px]"
                  >
                    <Link 
                      href={`/user/${user.username}`}
                      className="block mb-2"
                    >
                      <p className="font-medium text-amber-500 hover:underline">@{user.username}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {user.checkin_count} {user.checkin_count === 1 ? "smoke" : "smokes"}
                        {user.follower_count > 0 && ` • ${user.follower_count} followers`}
                      </p>
                      {user.bio && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{user.bio}</p>
                      )}
                    </Link>
                    <button
                      onClick={() => handleFollow(user.username)}
                      className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                        isFollowing
                          ? "bg-amber-500/20 text-amber-500 hover:bg-red-500/20 hover:text-red-400"
                          : "bg-amber-500 text-black hover:bg-amber-400"
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <FiUserCheck size={14} />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <FiUserPlus size={14} />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Feed */}
        {searching ? (
          <div className="flex justify-center py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full"
            />
          </div>
        ) : checkins.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-gray-400"
          >
            <p className="text-4xl mb-3">🔍</p>
            <p>No smokes found</p>
            {(searchQuery || activeCategory !== "all") && (
              <button 
                onClick={() => { setSearchQuery(""); setActiveCategory("all"); loadFeed("", "all"); }}
                className="mt-2 text-amber-500 hover:underline text-sm"
              >
                Clear filters
              </button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-4">
            {checkins.map((checkin, index) => (
              <motion.div
                key={checkin.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <CheckinCard checkin={checkin} onLike={handleLike} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
    </>
  );
}
