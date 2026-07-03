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
  qr_code?: string;
}

export interface Booking {
  id: number;
  showtime: number;
  movie_title?: string;
  theater_name?: string;
  start_time?: string;
  showtime_detail?: Showtime;
  user_email: string;
  status: "confirmed" | "cancelled";
  total: number;
  discount: number;
  has_membership: boolean;
  seats: Seat[];
  created_at: string;
}

export interface CreateBookingPayload {
  showtime_id: number;
  user_email: string;
  seats: string[];
  has_membership?: boolean;
  card_holder?: string;
  card_number?: string;
  card_expiry?: string;
  card_cvv?: string;
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
  has_membership: boolean;
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
  qr_code?: string;
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

// ── Dashboard ─────────────────────────────────────────────

export interface DashboardKPIs {
  total_sales: number;
  total_revenue: number;
  total_tickets: number;
  total_clients: number;
  with_membership: number;
  without_membership: number;
  total_discounts: number;
  avg_tickets_per_booking: number;
}

export interface ChartDataPoint {
  date?: string;
  movie?: string;
  theater?: string;
  count: number;
  revenue: number;
}

export interface OccupancyPoint {
  theater: string;
  capacity: number;
  booked_seats: number;
  total_showtimes: number;
  occupancy_pct: number;
}

export interface DashboardCharts {
  sales_by_day: ChartDataPoint[];
  sales_by_movie: ChartDataPoint[];
  sales_by_theater: ChartDataPoint[];
  top3_movies: ChartDataPoint[];
  most_sold: ChartDataPoint | null;
  least_sold: ChartDataPoint | null;
  occupancy: OccupancyPoint[];
  revenue_by_movie: ChartDataPoint[];
}

export interface DashboardStats {
  kpis: DashboardKPIs;
  charts: DashboardCharts;
}
