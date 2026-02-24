// Request body types

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  password: string;
}

export type CheckinCategory = 'cigar' | 'cannabis' | 'hookah' | 'vape';
export type StrainType = 'indica' | 'sativa' | 'hybrid';

export type SmokeMood = 'relaxed' | 'social' | 'celebratory' | 'thoughtful' | 'stressed' | 'creative' | 'tired' | 'focused' | 'bored' | 'adventurous';

export interface CheckinRequest {
  category?: CheckinCategory;
  // Common fields
  brand: string;
  product?: string;
  rating?: number;
  review?: string;
  imageUrl?: string;
  mood?: SmokeMood;
  // Cigar-specific
  flavorNotes?: string;
  drawRating?: number;
  burnRating?: number;
  aromaRating?: number;
  smokeTimeMins?: number;
  // Cannabis-specific
  strainName?: string;
  strainType?: StrainType;
  effects?: string;
  thcPercent?: number;
}

// Response types

export interface AuthResponse {
  success?: boolean;
  username?: string;
  error?: string;
}

export interface User {
  id: string;
  username: string;
  last_smoke_at?: number | null;
}

export interface Checkin {
  id: string;
  user_id: string;
  username?: string;
  category?: CheckinCategory;
  // Common
  brand: string;
  product?: string;
  rating?: number;
  review?: string;
  image_url?: string;
  mood?: SmokeMood;
  created_at: number;
  // Cigar-specific
  flavor_notes?: string;
  draw_rating?: number;
  burn_rating?: number;
  aroma_rating?: number;
  smoke_time_mins?: number;
  // Cannabis-specific
  strain_name?: string;
  strain_type?: StrainType;
  effects?: string;
  thc_percent?: number;
}

export interface MeResponse {
  user?: User;
  error?: string;
}

export interface CheckinsResponse {
  checkins?: Checkin[];
  error?: string;
}

export interface UploadResponse {
  success?: boolean;
  imageUrl?: string;
  error?: string;
}

export interface DiscoverResponse {
  checkins?: Checkin[];
  error?: string;
}

export interface LikeResponse {
  liked: boolean;
  error?: string;
}

export interface TrendingBrand {
  brand: string;
  checkin_count: number;
  avg_rating: number;
}

export interface TrendingResponse {
  trending?: TrendingBrand[];
  topRated?: TrendingBrand[];
  recentCheckins24h?: number;
  error?: string;
}

export interface UserProfileResponse {
  user?: {
    username: string;
    bio: string | null;
    joinedAt: number;
  };
  stats?: {
    totalCheckins: number;
    avgRating: number;
    uniqueBrands: number;
    following: number;
    followers: number;
  };
  isFollowing?: boolean;
  isOwnProfile?: boolean;
  checkins?: Checkin[];
  badges?: Badge[];
  error?: string;
}

export interface FollowResponse {
  following: boolean;
  error?: string;
}

export interface FeedResponse {
  checkins?: Checkin[];
  stats?: {
    following: number;
    followers: number;
  };
  error?: string;
}

// Comments
export interface Comment {
  id: string;
  checkin_id: string;
  user_id: string;
  username: string;
  text: string;
  created_at: number;
}

export interface CommentRequest {
  checkinId: string;
  text: string;
}

export interface CommentsResponse {
  comments?: Comment[];
  error?: string;
}

export interface CommentResponse {
  comment?: Comment;
  error?: string;
}

// Notifications
export interface Notification {
  id: string;
  user_id: string;
  type: 'like' | 'follow' | 'comment' | 'featured' | 'reaction' | 'welcome' | 'smoke_buddy' | 'digest' | 'nudge' | 'milestone' | 'streak_alert' | 'first-smoke-nudge';
  from_user_id: string;
  from_username: string;
  checkin_id?: string;
  checkin_brand?: string;
  comment_id?: string;
  comment_text?: string;
  reaction_emoji?: string;
  message?: string; // For digest notifications
  read: boolean;
  created_at: number;
}

export interface NotificationsResponse {
  notifications?: Notification[];
  unread_count?: number;
  error?: string;
}

export interface NotificationCountResponse {
  unread_count: number;
  error?: string;
}

// Leaderboard
export interface LeaderboardEntry {
  username: string;
  checkin_count: number;
  avg_rating: number;
  unique_brands: number;
  total_likes_received: number;
  rank: number;
}

export interface StreakLeaderEntry {
  username: string;
  currentStreak: number;
  bestStreak: number;
  rank: number;
}

export interface LeaderboardResponse {
  allTime?: LeaderboardEntry[];
  thisWeek?: LeaderboardEntry[];
  thisMonth?: LeaderboardEntry[];
  streaks?: StreakLeaderEntry[];
  error?: string;
}

// Suggested Users
export interface SuggestedUser {
  username: string;
  bio: string | null;
  checkin_count: number;
  follower_count: number;
  is_following: boolean;
}

export interface SuggestedUsersResponse {
  users?: SuggestedUser[];
  error?: string;
}

// Badges/Achievements
export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  earned: boolean;
  progress?: number;
  target?: number;
}

export interface BadgesResponse {
  badges?: Badge[];
  earned_count?: number;
  total_count?: number;
  error?: string;
}

// Streak
export interface StreakResponse {
  currentStreak: number;
  bestStreak: number;
  lastCheckinDate: string | null;
  streakActive: boolean;
  freezeAvailable?: boolean;
  freezeUsedToday?: boolean;
  freezesRemaining?: number;
  error?: string;
}

// Weekly Insights
export interface WeeklyInsights {
  thisWeek: {
    checkins: number;
    brands: number;
    avgRating: number | null;
    topBrand: string | null;
    newBrands: number;
  };
  lastWeek: {
    checkins: number;
    brands: number;
    avgRating: number | null;
  };
  allTime: {
    totalCheckins: number;
    uniqueBrands: number;
    avgRating: number | null;
    topBrand: string | null;
    topBrandCount: number;
  };
  trend: 'up' | 'down' | 'same';
  error?: string;
}

// Featured Checkin of the Day
export interface FeaturedCheckin {
  id: string;
  user_id: string;
  username: string;
  brand: string;
  product?: string;
  rating?: number;
  review?: string;
  image_url?: string;
  category: string;
  created_at: number;
  like_count: number;
  comment_count: number;
  flavor_notes?: string;
}

export interface FeaturedResponse {
  featured: FeaturedCheckin | null;
  date: string;
  error?: string;
}

// Community Activity
export interface Activity {
  type: 'checkin' | 'like' | 'reaction' | 'follow' | 'comment';
  username: string;
  user_id: string;
  details: string;
  created_at: number;
  target_user?: string;
  brand?: string;
  checkin_id?: string;
  emoji?: string;
}

export interface ActivityResponse {
  activities?: Activity[];
  count?: number;
  error?: string;
}

// Wishlist
export interface WishlistItem {
  id: string;
  brand: string;
  notes: string | null;
  created_at: number;
  smoked?: boolean;
}

export interface WishlistResponse {
  wishlist?: WishlistItem[];
  count?: number;
  error?: string;
}

// Daily Prompt
export interface DailyPrompt {
  id: string;
  prompt: string;
  emoji: string;
  category?: 'question' | 'challenge' | 'recommendation' | 'memory';
}

export interface PromptResponse {
  id: string;
  brand: string;
  product: string | null;
  rating: number | null;
  review: string | null;
  image_url: string | null;
  created_at: number;
  user_id: string;
  username: string;
}

export interface DailyPromptResponse {
  prompt: DailyPrompt;
  responses?: PromptResponse[];
  responseCount: number;
  hasResponded: boolean;
  todayDate: string;
  error?: string;
}

export interface RecentBrand {
  brand: string;
  product: string | null;
  last_smoked: number;
  times_smoked: number;
  last_rating: number | null;
  last_image: string | null;
}

export interface RecentBrandsResponse {
  brands: RecentBrand[];
  count: number;
  error?: string;
}

// Active Smokers (Smoking Now feature)
export interface ActiveSmoker {
  user_id: string;
  username: string;
  brand: string;
  product: string | null;
  image_url: string | null;
  rating: number | null;
  minutes_ago: number;
  checkin_id: string;
}

export interface ActiveSmokersResponse {
  smokers: ActiveSmoker[];
  count: number;
  stats: {
    activeNow: number;
    smokersToday: number;
    checkinsToday: number;
  };
  error?: string;
}

// Late Night Lounge (night owl feature)
export interface NightOwlUser {
  username: string;
  lastSmoke: string;
  nightSmokes: number;
  isActive: boolean;
}

export interface LoungeResponse {
  isNightTime: boolean;
  currentHour: number;
  loungeOpen: boolean;
  nightOwls: NightOwlUser[];
  stats: {
    totalNightSmokes: number;
    yourNightSmokes: number;
    nightOwlPercentile: number;
    mostActiveHour: number;
    loungeMembers: number;
  };
  vibes: {
    message: string;
    emoji: string;
  };
  error?: string;
}

// Night Thoughts (ephemeral thoughts in Late Night Lounge)
export interface NightThought {
  id: string;
  username: string;
  thought: string;
  createdAt: number;
  timeAgo: string;
}

export interface NightThoughtsResponse {
  thoughts: NightThought[];
  message?: string;
  error?: string;
}

// Trending Week (momentum tracking)
export interface TrendingWeekBrand {
  brand: string;
  thisWeekCount: number;
  lastWeekCount: number;
  change: number;
  direction: 'up' | 'down' | 'new' | 'same';
  avgRating: number | null;
  uniqueSmokers: number;
}

export interface TrendingWeekResponse {
  trending: TrendingWeekBrand[];
  period: {
    thisWeekStart: string;
    lastWeekStart: string;
  };
  error?: string;
}

// Weekly Recap (Sunday feature)
export interface WeeklyRecap {
  weekStats: {
    checkins: number;
    uniqueBrands: number;
    avgRating: number | null;
    totalSmokeTime: number;
    topBrand: string | null;
    topBrandCount: number;
    newBrands: string[];
  };
  engagement: {
    likesReceived: number;
    reactionsReceived: number;
    commentsReceived: number;
    newFollowers: number;
  };
  topCheckin: {
    id: string;
    brand: string;
    rating: number | null;
    imageUrl: string | null;
    likes: number;
    reactions: number;
    comments: number;
  } | null;
  highlights: string[];
  shareText: string;
  isSunday: boolean;
}

export interface WeeklyRecapResponse extends WeeklyRecap {
  error?: string;
}

// Weekly Goals (Monday motivation)
export interface WeeklyGoal {
  id: string;
  title: string;
  description: string;
  icon: string;
  current: number;
  target: number;
  completed: boolean;
  category: 'smoke' | 'social' | 'explore';
}

export interface WeeklyGoalsResponse {
  goals?: WeeklyGoal[];
  weekStart?: number;
  weekEnd?: number;
  totalCompleted?: number;
  error?: string;
}

// Brand of the Week Challenge
export interface BrandOfWeekParticipant {
  username: string;
  rating: number | null;
  checkedInAt: number;
}

export interface BrandOfWeek {
  brand: string;
  weekNumber: number;
  year: number;
  platformStats: {
    totalCheckins: number;
    avgRating: number | null;
    uniqueSmokers: number;
  };
  userHasTried: boolean;
  userTriedThisWeek: boolean;
  participants: BrandOfWeekParticipant[];
  daysRemaining: number;
}

export interface BrandOfWeekResponse extends BrandOfWeek {
  error?: string;
}

// Flavor-based Recommendations
export interface FlavorRecommendation {
  brand: string;
  matchScore: number;
  matchingFlavors: string[];
  avgRating: number;
  checkinCount: number;
  topProduct: string | null;
}

export interface FlavorRecsResponse {
  userTopFlavors: string[];
  recommendations: FlavorRecommendation[];
  message: string;
  error?: string;
}

// Onboarding (Getting Started Checklist)
export interface OnboardingTask {
  id: string;
  label: string;
  emoji: string;
  completed: boolean;
  action?: string;
}

export interface OnboardingResponse {
  tasks?: OnboardingTask[];
  completedCount?: number;
  totalCount?: number;
  allComplete?: boolean;
  showOnboarding?: boolean;
  error?: string;
}

// Community Milestones
export interface Milestone {
  count: number;
  emoji: string;
  title: string;
  message: string;
}

export interface MilestoneContributor {
  username: string;
  count: number;
}

export interface CommunityMilestonesResponse {
  platform: {
    totalCheckins: number;
    totalUsers: number;
    totalBrands: number;
    currentMilestone: Milestone | null;
    nextMilestone: Milestone | null;
    progress: number;
    justAchieved: boolean;
    topContributors: MilestoneContributor[];
  };
  user: {
    totalCheckins: number;
    currentMilestone: Milestone | null;
    nextMilestone: Milestone | null;
    progress: number;
    justAchieved: boolean;
  };
  error?: string;
}
