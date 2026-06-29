import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getShowtimeDetail, createBooking } from "../services/api";
import SeatPicker from "../components/SeatPicker";
import type { Showtime, CreateBookingPayload } from "../types";

export default function BookingPage() {
  const { showtimeId } = useParams<{ showtimeId: string }>();
  const navigate = useNavigate();

  const [showtime, setShowtime] = useState<Showtime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!showtimeId) return;
    const id = parseInt(showtimeId, 10);

    setLoading(true);
    getShowtimeDetail(id)
      .then((data) => {
        setShowtime(data);
      })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Error al cargar horario"
        )
      )
      .finally(() => setLoading(false));
  }, [showtimeId]);

  const handleToggleSeat = (seat: string) => {
    setSelectedSeats((prev) =>
      prev.includes(seat)
        ? prev.filter((s) => s !== seat)
        : [...prev, seat]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!email.trim()) {
      setSubmitError("Ingresa tu correo electrónico.");
      return;
    }
    if (selectedSeats.length === 0) {
      setSubmitError("Selecciona al menos un asiento.");
      return;
    }
    if (!showtimeId) return;

    const payload: CreateBookingPayload = {
      showtime_id: parseInt(showtimeId, 10),
      user_email: email.trim(),
      seats: selectedSeats,
    };

    setSubmitting(true);
    try {
      await createBooking(payload);
      setSuccess(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Error al crear reserva"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (iso: string): string =>
    new Date(iso).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString("es-MX", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-accent" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (error || !showtime) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          {error || "Horario no encontrado"}
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container py-5">
        <div className="card p-4 text-center">
          <div className="mb-3" style={{ fontSize: "4rem" }}>
            ✅
          </div>
          <h2>¡Reserva confirmada!</h2>
          <p className="text-secondary">
            Se ha enviado un resumen a <strong>{email}</strong>.
          </p>
          <div className="mb-3">
            <strong>Asientos:</strong> {selectedSeats.join(", ")}
          </div>
          <div className="d-flex gap-2 justify-content-center">
            <button
              className="btn btn-accent"
              onClick={() => navigate("/")}
            >
              Volver al inicio
            </button>
            <button
              className="btn btn-outline-light"
              onClick={() => navigate("/my-bookings")}
            >
              Mis Reservas
            </button>
          </div>
        </div>
      </div>
    );
  }

  const occupiedSeats = showtime.occupied_seats || [];

  return (
    <div className="container py-4">
      <button
        className="btn btn-link text-secondary mb-3 ps-0"
        onClick={() => navigate(-1)}
      >
        ← Volver
      </button>

      <h2 className="section-title mb-1">Selección de asientos</h2>
      <p className="text-secondary mb-4">
        {showtime.movie_title || `Película #${showtime.movie}`} —{" "}
        {formatDate(showtime.start_time)} {formatTime(showtime.start_time)} —{" "}
        Sala {showtime.theater_name || "N/A"} —{" "}
        {showtime.format} — ${Number(showtime.price).toFixed(2)}
      </p>

      <div className="row">
        <div className="col-12 col-lg-8">
          <SeatPicker
            occupied={occupiedSeats}
            selected={selectedSeats}
            onToggle={handleToggleSeat}
          />
        </div>

        <div className="col-12 col-lg-4 mt-4 mt-lg-0">
          <div className="card p-4">
            <h5 className="mb-3">Resumen de compra</h5>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  id="email"
                  className="form-control"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Asientos seleccionados</label>
                {selectedSeats.length === 0 ? (
                  <p className="text-secondary small mb-0">
                    Haz clic en los asientos disponibles para seleccionarlos.
                  </p>
                ) : (
                  <p className="mb-0">
                    <strong>
                      {selectedSeats.length} asiento
                      {selectedSeats.length !== 1 ? "s" : ""}
                    </strong>
                    : {selectedSeats.join(", ")}
                  </p>
                )}
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Precio por boleto</span>
                  <span>${Number(showtime.price).toFixed(2)}</span>
                </div>
                <hr />
                <div className="d-flex justify-content-between fw-bold">
                  <span>Total</span>
                  <span>
                    $
                    {(selectedSeats.length * Number(showtime.price)).toFixed(2)}
                  </span>
                </div>
              </div>

              {submitError && (
                <div className="alert alert-danger py-2 small">{submitError}</div>
              )}

              <button
                type="submit"
                className="btn btn-accent w-100"
                disabled={submitting || selectedSeats.length === 0}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Reservando...
                  </>
                ) : (
                  "Confirmar reserva"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
