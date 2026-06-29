import { useState } from "react";
import { getMyBookings } from "../services/api";
import type { Booking } from "../types";

export default function MyBookings() {
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBookings([]);

    if (!email.trim()) {
      setError("Ingresa tu correo electrónico.");
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const data = await getMyBookings(email.trim());
      setBookings(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al buscar reservas"
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      confirmed: "bg-success",
      cancelled: "bg-danger",
    };
    return map[status] || "bg-secondary";
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      confirmed: "Confirmada",
      cancelled: "Cancelada",
    };
    return map[status] || status;
  };

  return (
    <div className="container py-4">
      <h2 className="section-title mb-4">Mis Reservas</h2>

      <div className="card p-4 mb-4">
        <form onSubmit={handleSearch}>
          <div className="row align-items-end g-3">
            <div className="col-12 col-sm-8 col-md-9">
              <label htmlFor="booking-email" className="form-label">
                Correo electrónico
              </label>
              <input
                type="email"
                id="booking-email"
                className="form-control"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="col-12 col-sm-4 col-md-3">
              <button
                type="submit"
                className="btn btn-accent w-100"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Buscando...
                  </>
                ) : (
                  "Buscar"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {searched && !loading && !error && bookings.length === 0 && (
        <div className="alert alert-secondary text-center">
          No se encontraron reservas para <strong>{email}</strong>.
        </div>
      )}

      {bookings.length > 0 && (
        <div className="row g-3">
          {bookings.map((booking) => (
            <div key={booking.id} className="col-12 col-md-6">
              <div className="card p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h5 className="mb-0">
                    Reserva #{booking.id}
                  </h5>
                  <span className={`badge ${statusBadge(booking.status)}`}>
                    {statusLabel(booking.status)}
                  </span>
                </div>

                <div className="small text-secondary mb-2">
                  Creada: {formatDate(booking.created_at)}
                </div>

                {booking.showtime_detail && (
                  <div className="small mb-2">
                    <div>
                      <strong>Película:</strong>{" "}
                      {booking.showtime_detail.movie_title || `#${booking.showtime_detail.movie}`}
                    </div>
                    <div>
                      <strong>Sala:</strong>{" "}
                      {booking.showtime_detail.theater?.name || "N/A"}
                    </div>
                    <div>
                      <strong>Horario:</strong>{" "}
                      {formatDate(booking.showtime_detail.start_time)}
                    </div>
                  </div>
                )}

                <div className="small mt-2">
                  <strong>Asientos:</strong>{" "}
                  {booking.seats && booking.seats.length > 0
                    ? booking.seats.map((s) => s.seat_label).join(", ")
                    : "—"}
                </div>

                <div className="small text-secondary mt-1">
                  <strong>Email:</strong> {booking.user_email}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
