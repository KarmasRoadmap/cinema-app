export interface Movie {
  id: number;
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
