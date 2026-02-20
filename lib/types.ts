// API Response types
export interface AuthResponse {
  success?: boolean;
  error?: string;
  username?: string;
}

export interface User {
  id: string;
  username: string;
}

export interface MeResponse {
  user: User | null;
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

export interface CheckinsResponse {
  checkins?: Checkin[];
  error?: string;
}

export interface CreateCheckinResponse {
  success?: boolean;
  id?: string;
  error?: string;
}
