// Request body types

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  password: string;
}

export interface CheckinRequest {
  brand: string;
  product?: string;
  rating?: number;
  review?: string;
  flavorNotes?: string;
  drawRating?: number;
  burnRating?: number;
  aromaRating?: number;
  smokeTimeMins?: number;
  imageUrl?: string;
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
  brand: string;
  product?: string;
  rating?: number;
  review?: string;
  flavor_notes?: string;
  draw_rating?: number;
  burn_rating?: number;
  aroma_rating?: number;
  smoke_time_mins?: number;
  image_url?: string;
  created_at: number;
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
    joinedAt: number;
  };
  stats?: {
    totalCheckins: number;
    avgRating: number;
    uniqueBrands: number;
  };
  checkins?: Checkin[];
  error?: string;
}
