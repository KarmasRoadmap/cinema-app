import { useEffect, useState } from "react";
import MovieCard from "../components/MovieCard";
import { getMovies, searchOmdb, importFromOmdb } from "../services/api";
import type { Movie, OMDbSearchResult } from "../types";

export default function Home() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── OMDb search state ──────────────────────────────────
  const [omdbQuery, setOmdbQuery] = useState("");
  const [omdbResults, setOmdbResults] = useState<OMDbSearchResult[]>([]);
  const [omdbSearching, setOmdbSearching] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [omdbError, setOmdbError] = useState("");

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

  const handleOmdbSearch = async () => {
    if (!omdbQuery.trim()) return;
    setOmdbSearching(true);
    setOmdbError("");
    try {
      const results = await searchOmdb(omdbQuery.trim());
      setOmdbResults(results);
      if (results.length === 0) {
        setOmdbError("No se encontraron resultados en OMDb.");
      }
    } catch {
      setOmdbError("Error al buscar en OMDb. ¿Backend corriendo?");
    } finally {
      setOmdbSearching(false);
    }
  };

  const handleImport = async (imdbId: string) => {
    setImporting(imdbId);
    try {
      const movie = await importFromOmdb(imdbId);
      setMovies((prev) => [movie, ...prev]);
      setOmdbResults((prev) => prev.filter((r) => r.imdb_id !== imdbId));
    } catch {
      setOmdbError("Error al importar película.");
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

          {/* ── OMDb Search ─────────────────────────────── */}
          <div className="row justify-content-center mt-4">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="input-group input-group-lg">
                <input
                  type="text"
                  className="form-control bg-dark text-white border-secondary"
                  placeholder="Buscar película en OMDb..."
                  value={omdbQuery}
                  onChange={(e) => setOmdbQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleOmdbSearch()}
                />
                <button
                  className="btn btn-accent"
                  onClick={handleOmdbSearch}
                  disabled={omdbSearching}
                >
                  {omdbSearching ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : (
                    "Buscar"
                  )}
                </button>
              </div>
              {omdbError && (
                <div className="alert alert-danger py-2 mt-2 small">{omdbError}</div>
              )}
            </div>
          </div>

          {/* ── OMDb Results ──────────────────────────────── */}
          {omdbResults.length > 0 && (
            <div className="row justify-content-center mt-3">
              <div className="col-12 col-md-10 col-lg-8">
                <div className="card p-3 text-start">
                  <h6 className="text-accent mb-2">
                    Resultados OMDb — click para agregar a cartelera
                  </h6>
                  <div className="d-flex flex-wrap gap-2">
                    {omdbResults.map((r) => (
                      <button
                        key={r.imdb_id}
                        className="btn btn-sm btn-outline-light"
                        disabled={importing === r.imdb_id}
                        onClick={() => handleImport(r.imdb_id)}
                      >
                        {importing === r.imdb_id ? (
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
            No hay películas en cartelera. Usa la búsqueda OMDb para agregar películas.
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
