import { Link } from "react-router-dom";
import type { Showtime } from "../types";

interface ShowtimeListProps {
  showtimes: Showtime[];
  loading: boolean;
}

export default function ShowtimeList({ showtimes, loading }: ShowtimeListProps) {
  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-accent" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (showtimes.length === 0) {
    return (
      <div className="alert alert-secondary text-center">
        No hay horarios disponibles para esta película.
      </div>
    );
  }

  const formatTime = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString("es-MX", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="showtime-list">
      {showtimes.map((st) => (
        <div key={st.id} className="showtime-item">
          <div className="row align-items-center g-2">
            <div className="col-12 col-sm-3">
              <div className="showtime-date small text-secondary">
                {formatDate(st.start_time)}
              </div>
              <div className="showtime-time">{formatTime(st.start_time)}</div>
            </div>
            <div className="col-6 col-sm-3">
              <div className="showtime-label">Sala</div>
              <div className="showtime-value">{st.theater_name || "N/A"}</div>
            </div>
            <div className="col-6 col-sm-2">
              <div className="showtime-label">Formato</div>
              <span className="badge format-badge">{st.format}</span>
            </div>
            <div className="col-6 col-sm-2">
              <div className="showtime-label">Idioma</div>
              <div className="showtime-value">{st.language}</div>
            </div>
            <div className="col-6 col-sm-2 text-sm-end mt-2 mt-sm-0">
              <div className="showtime-price">${Number(st.price).toFixed(2)}</div>
              <Link
                to={`/booking/${st.id}`}
                className="btn btn-accent btn-sm mt-1"
              >
                Reservar
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
