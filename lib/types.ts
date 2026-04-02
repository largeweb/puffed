// Request body types

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  password: string;
}

export type CheckinCategory = 'cigar' | 'cannabis' | 'hookah' | 'vape' | 'snus';
export type StrainType = 'indica' | 'sativa' | 'hybrid';

export type SmokeMood = 'relaxed' | 'social' | 'celebratory' | 'thoughtful' | 'stressed' | 'creative' | 'tired' | 'focused' | 'bored' | 'adventurous';

export type SmokeSpot = 'backyard' | 'porch' | 'balcony' | 'lounge' | 'home' | 'walking' | 'car' | 'golf' | 'beach' | 'camping' | 'rooftop' | 'office' | 'bar' | 'other';

export interface CheckinRequest {
  category?: CheckinCategory;
  // Common fields
  brand: string;
  product?: string;
  rating?: number;
  review?: string;
  imageUrl?: string;
  mood?: SmokeMood;
  smokeSpot?: SmokeSpot; // Where they're smoking from
  drinkPairing?: string; // Drink pairing (coffee, bourbon, etc.)
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
  smoke_spot?: SmokeSpot; // Where they smoked
  drink_pairing?: string; // What drink they paired with
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

// Morning Coffee (early bird tracking)
export interface EarlyBirdUser {
  username: string;
  lastSmoke: string;
  morningSmokes: number;
  isActive: boolean;
}

export interface MorningCoffeeResponse {
  isMorningTime: boolean;
  currentHour: number;
  loungeOpen: boolean;
  earlyBirds: EarlyBirdUser[];
  stats: {
    totalMorningSmokes: number;
    yourMorningSmokes: number;
    earlyBirdPercentile: number;
    mostActiveHour: number;
    morningRisers: number;
  };
  vibes: {
    message: string;
    emoji: string;
  };
  error?: string;
}

// Evening Lounge (sunset smokers 6-10 PM)
export interface EveningSmoker {
  username: string;
  lastSmoke: string;
  eveningSmokes: number;
  isActive: boolean;
}

export interface EveningLoungeResponse {
  isEveningTime: boolean;
  currentHour: number;
  loungeOpen: boolean;
  eveningSmokers: EveningSmoker[];
  stats: {
    totalEveningSmokes: number;
    yourEveningSmokes: number;
    sunsetPercentile: number;
    mostActiveHour: number;
    eveningRegulars: number;
  };
  vibes: {
    message: string;
    emoji: string;
  };
  error?: string;
}

// Lunch Break Lounge (11am - 2pm)
export interface LunchSmoker {
  user_id: string;
  username: string;
  avatar_url: string | null;
  lunch_smokes: number;
  first_lunch_smoke: number;
}

export interface LunchLoungeResponse {
  isLunchTime: boolean;
  currentHour: number;
  vibeText: string;
  todaySmokers: LunchSmoker[];
  todayCount: number;
  platformStats: {
    totalLunchSmokes: number;
    uniqueLunchSmokers: number;
    lunchDays: number;
  };
  leaderboard: Array<{
    id: string;
    username: string;
    avatar_url: string | null;
    total_lunch_smokes: number;
  }>;
  personalStats: {
    totalLunchSmokes: number;
    favoriteLunchBrand: string | null;
    percentile: number;
  } | null;
  error?: string;
}

// Happy Hour (4pm-7pm EST)
export interface HappyHourSmoker {
  user_id: string;
  username: string;
  avatar_url: string | null;
  happy_hour_smokes: number;
  first_happy_hour_smoke: number;
}

export interface HappyHourResponse {
  isHappyHour: boolean;
  currentHour: number;
  vibeText: string;
  todaySmokers: HappyHourSmoker[];
  todayCount: number;
  platformStats: {
    totalHappyHourSmokes: number;
    uniqueHappyHourSmokers: number;
    happyHourDays: number;
  };
  leaderboard: Array<{
    id: string;
    username: string;
    avatar_url: string | null;
    total_happy_hour_smokes: number;
    favorite_brand: string | null;
  }>;
  personalStats: {
    totalHappyHourSmokes: number;
    favoriteHappyHourBrand: string | null;
    percentile: number;
  } | null;
  popularBrands: Array<{
    brand: string;
    count: number;
    avg_rating: number;
  }>;
  error?: string;
}

// Afternoon Break (2pm-4pm EST)
export interface AfternoonSmoker {
  user_id: string;
  username: string;
  avatar_url: string | null;
  afternoon_smokes: number;
  first_afternoon_smoke: number;
}

export interface AfternoonBreakResponse {
  isAfternoonBreak: boolean;
  currentHour: number;
  vibeText: string;
  isWeekday: boolean;
  productivityTip: string;
  todaySmokers: AfternoonSmoker[];
  todayCount: number;
  platformStats: {
    totalAfternoonSmokes: number;
    uniqueAfternoonSmokers: number;
    afternoonDays: number;
  };
  leaderboard: Array<{
    id: string;
    username: string;
    avatar_url: string | null;
    total_afternoon_smokes: number;
    favorite_brand: string | null;
  }>;
  personalStats: {
    totalAfternoonSmokes: number;
    favoriteAfternoonBrand: string | null;
    percentile: number;
  } | null;
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

// Community Challenge
export interface CommunityChallengeMilestone {
  percent: number;
  reached: boolean;
  label: string;
}

export interface CommunityChallengeContributor {
  username: string;
  contribution: number;
}

export interface CommunityChallenge {
  challenge: {
    type: string;
    name: string;
    description: string;
    icon: string;
  };
  weekNumber: number;
  year: number;
  target: number;
  current: number;
  progress: number;
  completed: boolean;
  milestones: CommunityChallengeMilestone[];
  contributors: CommunityChallengeContributor[];
  userContribution: number;
  daysRemaining: number;
  message: string;
  totalParticipants: number;
}

export interface CommunityChallengeResponse extends CommunityChallenge {
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

// On This Day - Memories
export interface MemoryCheckin {
  id: string;
  brand: string;
  product: string | null;
  rating: number | null;
  image_url: string | null;
  created_at: number;
  review: string | null;
}

export interface OnThisDayMemory {
  period: 'last_week' | 'last_month' | 'last_year';
  label: string;
  emoji: string;
  checkins: MemoryCheckin[];
  daysAgo: number;
}

export interface OnThisDayResponse {
  memories: OnThisDayMemory[];
  hasMemories: boolean;
  message?: string;
}

// Suggested Follows - People Like You
export interface SuggestedUser {
  id: string;
  username: string;
  totalSmokes: number;
  commonBrands: number;
  tasteMatchScore: number;
  topBrand?: string;
}

export interface SuggestedFollowsResponse {
  suggestions?: SuggestedUser[];
  error?: string;
}

// Brand Battle - Weekly Voting
export interface BrandBattleResponse {
  brandA: string;
  brandB: string;
  weekNumber: number;
  votesA: number;
  votesB: number;
  totalVotes: number;
  userVote: string | null;
  votersA: string[];
  votersB: string[];
  endsAt: number;
  error?: string;
}

// Daily Poll
export interface DailyPollResult {
  option: string;
  count: number;
  percentage: number;
}

export interface DailyPollData {
  poll: {
    id: string;
    question: string;
    options: string[];
  };
  results: DailyPollResult[];
  totalVotes: number;
  userVote: string | null;
  hasVoted: boolean;
  winners: string[];
  error?: string;
}

// Tonight's Pick
export interface TonightsPick {
  brand: string;
  product?: string;
  reason: string;
  reasonEmoji: string;
  confidence: "perfect" | "strong" | "good";
  lastSmoked?: number;
  avgRating?: number;
  communityAvgRating?: number;
  timesSmoked: number;
  flavorProfile: string[];
  suggestion: string;
  alternatives: {
    brand: string;
    reason: string;
  }[];
}

// Daily Tip
export interface DailyTip {
  id: string;
  category: string;
  emoji: string;
  tip: string;
  detail: string;
}

export interface DailyTipResponse {
  tip: DailyTip;
  dayOfYear: number;
}

// Brand Reunion - Missed Brands
export interface MissedBrand {
  brand: string;
  lastSmokedAt: number;
  daysSince: number;
  totalSmokes: number;
  avgRating: number | null;
  bestRating: number | null;
  lastProduct: string | null;
  lastImageUrl: string | null;
}

export interface BrandReunionResponse {
  missedBrands: MissedBrand[];
  stats: {
    totalBrands: number;
    oldestMiss: string | null;
    longestAway: number;
  };
}

// Daily Challenge
export interface DailyChallengeData {
  challenge: {
    id: string;
    title: string;
    description: string;
    emoji: string;
    category: "social" | "activity" | "explore" | "quality" | "timing";
  };
  progress: {
    current: number;
    target: number;
    completed: boolean;
    percent: number;
  };
  refreshesAt: string;
  stats: {
    checkinsToday: number;
    likesToday: number;
    photosToday: number;
  };
}

// Most Loved This Week
export interface MostLovedCheckin {
  id: string;
  user_id: string;
  username: string;
  brand: string;
  rating: number;
  review: string | null;
  photo_url: string | null;
  like_count: number;
  reaction_count: number;
  comment_count: number;
  total_engagement: number;
  created_at: number;
}

export interface MostLovedResponse {
  checkins: MostLovedCheckin[];
  count: number;
}

export interface NeedsLoveCheckin {
  id: string;
  user_id: string;
  username: string;
  brand: string;
  product: string | null;
  rating: number;
  review: string | null;
  photo_url: string | null;
  category: string;
  created_at: number;
}

export interface NeedsLoveResponse {
  checkins: NeedsLoveCheckin[];
  count: number;
}
