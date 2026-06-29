import { Link } from "react-router-dom";
import type { Movie } from "../types";

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  const placeholderPoster =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' fill='%2316213e'%3E%3Crect width='300' height='450'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23e94560' font-size='20' font-family='sans-serif'%3E🎬%3C/text%3E%3C/svg%3E";

  return (
    <div className="col-6 col-sm-4 col-md-3 col-lg-2 mb-4">
      <div className="movie-card card h-100">
        <img
          src={movie.poster_url || placeholderPoster}
          className="card-img-top movie-poster"
          alt={movie.title}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = placeholderPoster;
          }}
        />
        <div className="card-body d-flex flex-column">
          <h6 className="card-title movie-title">{movie.title}</h6>
          <p className="card-text movie-genre small mb-1">{movie.genre}</p>
          <div className="movie-rating mb-2">
            <span className="star">★</span> {movie.rating.toFixed(1)}
          </div>
          <div className="mt-auto">
            <Link
              to={`/movie/${movie.id}`}
              className="btn btn-accent btn-sm w-100"
            >
              Ver más
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
