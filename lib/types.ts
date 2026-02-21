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
  brand: string;
  product?: string;
  rating?: number;
  review?: string;
  flavor_notes?: string;
  draw_rating?: number;
  burn_rating?: number;
  aroma_rating?: number;
  smoke_time_mins?: number;
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
