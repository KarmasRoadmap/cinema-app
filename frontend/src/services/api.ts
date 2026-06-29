import type { Movie, Showtime, Booking, CreateBookingPayload } from "../types";

const BASE_URL: string =
  (import.meta.env.VITE_API_URL as string) || "http://localhost:8000/api";

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`API error ${res.status}: ${errorBody}`);
  }

  return res.json() as Promise<T>;
}

export function getMovies(): Promise<Movie[]> {
  return request<Movie[]>("/movies/");
}

export function getMovie(id: number): Promise<Movie> {
  return request<Movie>(`/movies/${id}/`);
}

export function getShowtimes(
  movieId?: number,
  date?: string
): Promise<Showtime[]> {
  const params = new URLSearchParams();
  if (movieId) params.set("movie_id", String(movieId));
  if (date) params.set("date", date);
  const qs = params.toString();
  return request<Showtime[]>(`/showtimes/${qs ? `?${qs}` : ""}`);
}

export function getShowtimeDetail(id: number): Promise<Showtime> {
  return request<Showtime>(`/showtimes/${id}/`);
}

export function createBooking(
  payload: CreateBookingPayload
): Promise<Booking> {
  // Transform seats: string[] → [{seat_label: "A1"}, ...] (backend format)
  const backendPayload = {
    showtime: payload.showtime_id,
    user_email: payload.user_email,
    seats: payload.seats.map((label) => ({ seat_label: label })),
  };
  return request<Booking>("/bookings/", {
    method: "POST",
    body: JSON.stringify(backendPayload),
  });
}

export function getMyBookings(email: string): Promise<Booking[]> {
  return request<Booking[]>(`/bookings/?user_email=${encodeURIComponent(email)}`);
}
