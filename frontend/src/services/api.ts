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

  const data = await res.json();
  // DRF pagination: {count, results: [...]} → unwrap results array
  if (data && typeof data === "object" && "results" in data && Array.isArray(data.results)) {
    return data.results as T;
  }
  return data as T;
}

export function getMovies(): Promise<Movie[]> {
  return request<Movie[]>("/movies/");
}

export function getMovie(id: number): Promise<Movie> {
  return request<Movie>(`/movies/${id}/`);
}

// ── OMDb ────────────────────────────────────────────────

export interface OMDbSearchResult {
  imdb_id: string;
  title: string;
  year: string;
  poster_url: string;
  type: string;
}

export function searchOmdb(query: string, page = 1): Promise<OMDbSearchResult[]> {
  return request<OMDbSearchResult[]>(
    `/movies/search_omdb/?q=${encodeURIComponent(query)}&page=${page}`
  );
}

export function importFromOmdb(imdbId: string): Promise<Movie> {
  return request<Movie>("/movies/import_omdb/", {
    method: "POST",
    body: JSON.stringify({ imdb_id: imdbId }),
  });
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
