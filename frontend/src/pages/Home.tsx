import { useEffect, useState } from "react";
import MovieCard from "../components/MovieCard";
import { getMovies } from "../services/api";
import type { Movie } from "../types";

export default function Home() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const data = await getMovies();
        setMovies(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar películas");
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  return (
    <>
      {/* Hero Banner */}
      <section className="hero-banner">
        <div className="container text-center py-5">
          <h1 className="hero-title display-4 fw-bold">CINEMA</h1>
          <p className="hero-subtitle lead">
            Las mejores películas, la mejor experiencia
          </p>
          <div className="hero-accent-line"></div>
        </div>
      </section>

      {/* Movies Grid */}
      <section className="container py-4">
        <h2 className="section-title mb-4">En Cartelera</h2>

        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-accent" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-danger text-center">{error}</div>
        )}

        {!loading && !error && movies.length === 0 && (
          <div className="alert alert-secondary text-center">
            No hay películas en cartelera en este momento.
          </div>
        )}

        {!loading && !error && movies.length > 0 && (
          <div className="row">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
