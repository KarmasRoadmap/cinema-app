export interface Movie {
  id: number;
  imdb_id?: string;
  tmdb_id?: number;
  title: string;
  description: string;
  poster_url: string;
  duration_min: number;
  genre: string;
  rating: number;
  release_date: string;
  is_now_showing: boolean;
}

export interface Theater {
  id: number;
  name: string;
  capacity: number;
}

export interface Showtime {
  id: number;
  movie: number;
  movie_title?: string;
  theater: number;
  theater_name?: string;
  theater_capacity?: number;
  start_time: string;
  price: number;
  language: string;
  format: string;
  occupied_seats?: string[];
}

export interface Seat {
  id: number;
  seat_label: string;
}

export interface Booking {
  id: number;
  showtime: number;
  showtime_detail?: Showtime;
  user_email: string;
  status: "confirmed" | "cancelled";
  seats: Seat[];
  created_at: string;
}

export interface CreateBookingPayload {
  showtime_id: number;
  user_email: string;
  seats: string[];
}

// ── TMDB ──────────────────────────────────────────────────

export interface TMDBSearchResult {
  tmdb_id: number;
  title: string;
  year: string;
  poster_url: string;
  overview: string;
}

// ── Auth ──────────────────────────────────────────────────

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user_id: number;
  email: string;
}

// ── Admin ─────────────────────────────────────────────────

export interface AdminSeat {
  id: number;
  seat_label: string;
}

export interface AdminBooking {
  id: number;
  showtime_id: number;
  movie_title: string;
  theater_name: string;
  start_time: string;
  user_email: string;
  status: string;
  seats: AdminSeat[];
  created_at: string;
}
