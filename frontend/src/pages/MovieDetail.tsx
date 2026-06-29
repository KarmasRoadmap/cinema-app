import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getMovie, getShowtimes } from "../services/api";
import ShowtimeList from "../components/ShowtimeList";
import type { Movie, Showtime } from "../types";

export default function MovieDetail() {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [loadingMovie, setLoadingMovie] = useState(true);
  const [loadingShowtimes, setLoadingShowtimes] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const placeholderPoster =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' fill='%2316213e'%3E%3Crect width='300' height='450'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23e94560' font-size='40' font-family='sans-serif'%3E🎬%3C/text%3E%3C/svg%3E";

  useEffect(() => {
    if (!id) return;
    const movieId = parseInt(id, 10);

    setLoadingMovie(true);
    getMovie(movieId)
      .then(setMovie)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error al cargar película")
      )
      .finally(() => setLoadingMovie(false));

    setLoadingShowtimes(true);
    getShowtimes(movieId)
      .then(setShowtimes)
      .catch(() => {})
      .finally(() => setLoadingShowtimes(false));
  }, [id]);

  if (loadingMovie) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-accent" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">{error || "Película no encontrada"}</div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Movie Info */}
      <div className="row g-4 mb-5">
        <div className="col-12 col-md-4 col-lg-3">
          <img
            src={movie.poster_url || placeholderPoster}
            alt={movie.title}
            className="movie-detail-poster w-100 rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).src = placeholderPoster;
            }}
          />
        </div>
        <div className="col-12 col-md-8 col-lg-9">
          <h1 className="movie-detail-title">{movie.title}</h1>
          <div className="movie-detail-meta mb-3">
            <span className="badge genre-badge me-2">{movie.genre}</span>
            <span className="star me-2">★ {movie.rating.toFixed(1)}</span>
            <span className="me-2">⏱ {movie.duration_min} min</span>
            {movie.is_now_showing && (
              <span className="badge bg-success ms-1">En cartelera</span>
            )}
          </div>
          <p className="movie-description">{movie.description}</p>
          {movie.release_date && (
            <p className="text-secondary small">
              Estreno: {new Date(movie.release_date).toLocaleDateString("es-MX")}
            </p>
          )}
        </div>
      </div>

      {/* Showtimes */}
      <h3 className="section-title mb-3">Horarios disponibles</h3>
      <ShowtimeList showtimes={showtimes} loading={loadingShowtimes} />
    </div>
  );
}
