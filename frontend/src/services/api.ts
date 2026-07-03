import type { Movie, Showtime, Booking, CreateBookingPayload, TMDBSearchResult, AuthTokens, UserProfile, AdminBooking } from "../types";

const BASE_URL: string =
  (import.meta.env.VITE_API_URL as string) || "http://localhost:8000/api";

function getToken(): string | null {
  try {
    return localStorage.getItem("access_token");
  } catch {
    return null;
  }
}

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers,
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

// ── Movies ────────────────────────────────────────────────

export function getMovies(): Promise<Movie[]> {
  return request<Movie[]>("/movies/");
}

export function getMovie(id: number): Promise<Movie> {
  return request<Movie>(`/movies/${id}/`);
}

// ── TMDB ─────────────────────────────────────────────────

export function searchTmdb(query: string, page = 1): Promise<TMDBSearchResult[]> {
  return request<TMDBSearchResult[]>(
    `/movies/search_tmdb/?q=${encodeURIComponent(query)}&page=${page}`
  );
}

export function importFromTmdb(tmdbId: number): Promise<Movie> {
  return request<Movie>("/movies/import_tmdb/", {
    method: "POST",
    body: JSON.stringify({ tmdb_id: tmdbId }),
  });
}

// ── Showtimes ─────────────────────────────────────────────

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

// ── Bookings ──────────────────────────────────────────────

export function createBooking(
  payload: CreateBookingPayload
): Promise<Booking> {
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

export function getMyBookingsAuth(): Promise<Booking[]> {
  return request<Booking[]>("/bookings/mine/");
}

// ── Auth ──────────────────────────────────────────────────

export function loginApi(email: string, password: string): Promise<AuthTokens> {
  return request<AuthTokens>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function registerApi(
  email: string,
  password: string,
  name: string
): Promise<AuthTokens> {
  return request<AuthTokens>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export function getMe(): Promise<UserProfile> {
  return request<UserProfile>("/users/me");
}

// ── Admin ─────────────────────────────────────────────────

export function getAdminUsers(params?: {
  search?: string;
  role?: string;
  is_active?: boolean;
  date_from?: string;
  date_to?: string;
}): Promise<UserProfile[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.role) qs.set("role", params.role);
  if (params?.is_active !== undefined) qs.set("is_active", String(params.is_active));
  if (params?.date_from) qs.set("date_from", params.date_from);
  if (params?.date_to) qs.set("date_to", params.date_to);
  const query = qs.toString();
  return request<UserProfile[]>(`/users/${query ? `?${query}` : ""}`);
}

export function getAdminUserBookings(userId: number): Promise<AdminBooking[]> {
  return request<AdminBooking[]>(`/users/${userId}/bookings`);
}
