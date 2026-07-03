import { useEffect, useState } from "react";
import MovieCard from "../components/MovieCard";
import { getMovies, searchTmdb, importFromTmdb } from "../services/api";
import type { Movie, TMDBSearchResult } from "../types";

export default function Home() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── TMDB search state ──────────────────────────────────
  const [tmdbQuery, setTmdbQuery] = useState("");
  const [tmdbResults, setTmdbResults] = useState<TMDBSearchResult[]>([]);
  const [tmdbSearching, setTmdbSearching] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  const [tmdbError, setTmdbError] = useState("");

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

  const handleTmdbSearch = async () => {
    if (!tmdbQuery.trim()) return;
    setTmdbSearching(true);
    setTmdbError("");
    try {
      const results = await searchTmdb(tmdbQuery.trim());
      setTmdbResults(results);
      if (results.length === 0) {
        setTmdbError("No se encontraron resultados en TMDB.");
      }
    } catch {
      setTmdbError("Error al buscar en TMDB. ¿Backend corriendo?");
    } finally {
      setTmdbSearching(false);
    }
  };

  const handleImport = async (tmdbId: number) => {
    setImporting(tmdbId);
    try {
      const movie = await importFromTmdb(tmdbId);
      setMovies((prev) => [movie, ...prev]);
      setTmdbResults((prev) => prev.filter((r) => r.tmdb_id !== tmdbId));
    } catch {
      setTmdbError("Error al importar película.");
    } finally {
      setImporting(null);
    }
  };

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

          {/* ── TMDB Search ─────────────────────────────── */}
          <div className="row justify-content-center mt-4">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="input-group input-group-lg">
                <input
                  type="text"
                  className="form-control bg-dark text-white border-secondary"
                  placeholder="Buscar película en TMDB..."
                  value={tmdbQuery}
                  onChange={(e) => setTmdbQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTmdbSearch()}
                />
                <button
                  className="btn btn-accent"
                  onClick={handleTmdbSearch}
                  disabled={tmdbSearching}
                >
                  {tmdbSearching ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : (
                    "Buscar"
                  )}
                </button>
              </div>
              {tmdbError && (
                <div className="alert alert-danger py-2 mt-2 small">{tmdbError}</div>
              )}
            </div>
          </div>

          {/* ── TMDB Results ──────────────────────────────── */}
          {tmdbResults.length > 0 && (
            <div className="row justify-content-center mt-3">
              <div className="col-12 col-md-10 col-lg-8">
                <div className="card p-3 text-start">
                  <h6 className="text-accent mb-2">
                    Resultados TMDB — click para agregar a cartelera
                  </h6>
                  <div className="d-flex flex-wrap gap-2">
                    {tmdbResults.map((r) => (
                      <button
                        key={r.tmdb_id}
                        className="btn btn-sm btn-outline-light"
                        disabled={importing === r.tmdb_id}
                        onClick={() => handleImport(r.tmdb_id)}
                      >
                        {importing === r.tmdb_id ? (
                          <span className="spinner-border spinner-border-sm me-1" />
                        ) : (
                          "➕"
                        )}{" "}
                        {r.title} ({r.year})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
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
            No hay películas en cartelera. Usa la búsqueda TMDB para agregar películas.
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
