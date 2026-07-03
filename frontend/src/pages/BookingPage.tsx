import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getShowtimeDetail, createBooking, downloadTicketPdf } from "../services/api";
import { useAuth } from "../context/AuthContext";
import SeatPicker from "../components/SeatPicker";
import type { Showtime, Booking } from "../types";

export default function BookingPage() {
  const { showtimeId } = useParams<{ showtimeId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [showtime, setShowtime] = useState<Showtime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Seat selection
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // Membership
  const [hasMembership, setHasMembership] = useState(false);

  // Payment
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!showtimeId) return;
    const id = parseInt(showtimeId, 10);
    setLoading(true);
    getShowtimeDetail(id)
      .then(setShowtime)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error al cargar horario")
      )
      .finally(() => setLoading(false));
  }, [showtimeId]);

  // Pre-fill membership if user has it
  useEffect(() => {
    if (user?.has_membership) setHasMembership(true);
  }, [user]);

  const handleToggleSeat = (seat: string) => {
    setSelectedSeats((prev) =>
      prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const userEmail = isAuthenticated && user ? user.email : "";
    if (!userEmail) {
      setSubmitError("Debes iniciar sesión para reservar.");
      return;
    }
    if (selectedSeats.length === 0) {
      setSubmitError("Selecciona al menos un asiento.");
      return;
    }
    if (!cardHolder.trim() || !cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
      setSubmitError("Completa todos los datos de pago.");
      return;
    }

    const payload = {
      showtime_id: parseInt(showtimeId!, 10),
      user_email: userEmail,
      seats: selectedSeats,
      has_membership: hasMembership,
      card_holder: cardHolder.trim(),
      card_number: cardNumber.replace(/\s/g, ""),
      card_expiry: cardExpiry.trim(),
      card_cvv: cardCvv.trim(),
    };

    setSubmitting(true);
    try {
      const booking = await createBooking(payload);
      setSuccessBooking(booking);
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
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString("es-MX", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

  // ── Loading ──────────────────────────────────────────
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
        <div className="alert alert-danger">{error || "Horario no encontrado"}</div>
      </div>
    );
  }

  // ── Success: show QR + booking details ───────────────
  if (successBooking) {
    const total = Number(successBooking.total ?? (selectedSeats.length * Number(showtime.price)));
    const discount = Number(successBooking.discount ?? 0);

    return (
      <div className="container py-5">
        <div className="card p-4 text-center">
          <div className="mb-3" style={{ fontSize: "4rem" }}>✅</div>
          <h2>¡Reserva confirmada!</h2>
          <p className="text-secondary">
            Boleto #{successBooking.id} — {successBooking.movie_title || showtime.movie_title}
          </p>

          {discount > 0 && (
            <div className="mb-2">
              <span className="badge bg-success">
                Membresía aplicada — 20% descuento (−${discount.toFixed(2)})
              </span>
            </div>
          )}

          <div className="mb-3">
            <strong>Total pagado:</strong>{" "}
            <span style={{ color: "var(--accent)", fontSize: "1.4rem" }}>
              ${total.toFixed(2)}
            </span>
          </div>

          {/* QR Codes */}
          {successBooking.seats && successBooking.seats.length > 0 && (
            <div className="row justify-content-center g-3 mb-4">
              {successBooking.seats.map((s) => (
                <div key={s.id} className="col-auto">
                  <div className="card p-2" style={{ width: "140px" }}>
                    {s.qr_code ? (
                      <img
                        src={`data:image/svg+xml;base64,${s.qr_code}`}
                        alt={`QR ${s.seat_label}`}
                        style={{ width: "120px", height: "120px" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "120px",
                          height: "120px",
                          background: "#333",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                          color: "#999",
                        }}
                      >
                        QR no disponible
                      </div>
                    )}
                    <small className="text-center mt-1 d-block">
                      {s.seat_label}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="small text-secondary mb-4">
            <div>
              <strong>Sala:</strong> {showtime.theater_name}
            </div>
            <div>
              <strong>Horario:</strong> {formatDate(showtime.start_time)}{" "}
              {formatTime(showtime.start_time)}
            </div>
            <div>
              <strong>Asientos:</strong> {selectedSeats.join(", ")}
            </div>
            <div>
              <strong>Formato:</strong> {showtime.format}
            </div>
          </div>

          <div className="d-flex gap-2 justify-content-center flex-wrap">
            <button
              className="btn btn-accent"
              onClick={() => downloadTicketPdf(successBooking.id)}
            >
              📥 Descargar PDF
            </button>
            <button
              className="btn btn-outline-light"
              onClick={() => navigate("/my-bookings")}
            >
              Mis Reservas
            </button>
            <button
              className="btn btn-outline-light"
              onClick={() => navigate("/")}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Booking form ─────────────────────────────────────
  const occupiedSeats = showtime.occupied_seats || [];
  const subtotal = selectedSeats.length * Number(showtime.price);
  const discountAmount = hasMembership ? subtotal * 0.20 : 0;
  const totalAmount = subtotal - discountAmount;

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
        <div className="col-12 col-lg-7">
          <SeatPicker
            occupied={occupiedSeats}
            selected={selectedSeats}
            onToggle={handleToggleSeat}
          />
        </div>

        <div className="col-12 col-lg-5 mt-4 mt-lg-0">
          <div className="card p-4">
            <h5 className="mb-3">Resumen de compra</h5>

            <form onSubmit={handleSubmit}>
              {/* Account info */}
              {isAuthenticated && user ? (
                <div className="mb-3">
                  <label className="form-label">Cuenta</label>
                  <p className="text-secondary small mb-0">
                    Reservando como <strong>{user.email}</strong>
                  </p>
                </div>
              ) : null}

              {/* Membership */}
              <div className="mb-3">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="membership"
                    checked={hasMembership}
                    onChange={(e) => setHasMembership(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="membership">
                    Tengo membresía (20% descuento)
                  </label>
                </div>
              </div>

              {/* Seats */}
              <div className="mb-3">
                <label className="form-label">Asientos seleccionados</label>
                {selectedSeats.length === 0 ? (
                  <p className="text-secondary small mb-0">
                    Haz clic en los asientos disponibles.
                  </p>
                ) : (
                  <p className="mb-0">
                    <strong>{selectedSeats.length} asiento{selectedSeats.length !== 1 ? "s" : ""}</strong>
                    : {selectedSeats.join(", ")}
                  </p>
                )}
              </div>

              {/* Price */}
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {hasMembership && (
                  <div className="d-flex justify-content-between text-success">
                    <span>Descuento (20%)</span>
                    <span>−${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <hr />
                <div className="d-flex justify-content-between fw-bold">
                  <span>Total</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment form */}
              <div className="mb-3">
                <label className="form-label small text-secondary">
                  Datos de pago
                </label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Titular de la tarjeta"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                />
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Número de tarjeta (16 dígitos)"
                  maxLength={19}
                  value={cardNumber}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
                    // Format with spaces every 4 digits
                    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
                    setCardNumber(formatted);
                  }}
                />
                <div className="row g-2">
                  <div className="col-6">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="MM/AA"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => {
                        let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
                        if (raw.length >= 3) {
                          raw = raw.slice(0, 2) + "/" + raw.slice(2);
                        }
                        setCardExpiry(raw);
                      }}
                    />
                  </div>
                  <div className="col-6">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="CVV"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setCardCvv(raw.slice(0, 4));
                      }}
                    />
                  </div>
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
                    Procesando pago...
                  </>
                ) : (
                  `Pagar $${totalAmount.toFixed(2)}`
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
