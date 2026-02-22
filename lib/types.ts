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

export interface CheckinRequest {
  category?: CheckinCategory;
  // Common fields
  brand: string;
  product?: string;
  rating?: number;
  review?: string;
  imageUrl?: string;
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
  type: 'like' | 'follow' | 'comment' | 'featured' | 'reaction';
  from_user_id: string;
  from_username: string;
  checkin_id?: string;
  checkin_brand?: string;
  comment_id?: string;
  comment_text?: string;
  reaction_emoji?: string;
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

export interface LeaderboardResponse {
  allTime?: LeaderboardEntry[];
  thisWeek?: LeaderboardEntry[];
  thisMonth?: LeaderboardEntry[];
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
