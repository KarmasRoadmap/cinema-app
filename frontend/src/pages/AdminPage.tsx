import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAdminUsers, getAdminUserBookings } from "../services/api";
import type { UserProfile, AdminBooking } from "../types";

const BASE_URL =
  (import.meta.env.VITE_API_URL as string) || "http://localhost:8000/api";

export default function AdminPage() {
  const { token, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // ── Users list ────────────────────────────────────────
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Filters ──────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ── Expanded user → bookings ─────────────────────────
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [userBookings, setUserBookings] = useState<Map<number, AdminBooking[]>>(
    new Map()
  );
  const [bookingsLoading, setBookingsLoading] = useState<Set<number>>(new Set());

  // ── Auth guard ───────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !token) {
      navigate("/login");
      return;
    }
    if (user && user.role !== "admin") {
      navigate("/");
      return;
    }
  }, [isAuthenticated, token, user, navigate]);

  // ── Fetch users (with debounced filters) ─────────────
  const fetchUsers = useCallback(async () => {
    if (!token) return;

    const params: Record<string, string | undefined> = {};
    if (search.trim()) params.search = search.trim();
    if (roleFilter) params.role = roleFilter;
    if (activeFilter !== "") params.is_active = activeFilter === "true" ? "true" : "false";
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    setLoading(true);
    setError("");

    try {
      // Build query string manually since getAdminUsers expects typed params
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) qs.set(k, v);
      });
      const query = qs.toString();
      const res = await fetch(`${BASE_URL}/users/${query ? `?${query}` : ""}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error("No autorizado");
      const data = (await res.json()) as UserProfile[];
      setUsers(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar usuarios"
      );
    } finally {
      setLoading(false);
    }
  }, [token, search, roleFilter, activeFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (token && isAuthenticated && user?.role === "admin") {
      fetchUsers();
    }
  }, [fetchUsers, token, isAuthenticated, user]);

  // ── Toggle user row → load bookings ──────────────────
  const toggleUser = async (userId: number) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }

    setExpandedUserId(userId);

    // Already cached?
    if (userBookings.has(userId)) return;

    setBookingsLoading((prev) => new Set(prev).add(userId));
    try {
      const bookings = await getAdminUserBookings(userId);
      setUserBookings((prev) => new Map(prev).set(userId, bookings));
    } catch {
      setUserBookings((prev) => new Map(prev).set(userId, []));
    } finally {
      setBookingsLoading((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  // ── Helpers ──────────────────────────────────────────
  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatDateTime = (iso: string): string =>
    new Date(iso).toLocaleDateString("es-MX", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const statusBadge = (status: string) =>
    status === "confirmed" ? "bg-success" : "bg-danger";

  const statusLabel = (status: string) =>
    status === "confirmed" ? "Confirmada" : "Cancelada";

  // ── Loading ──────────────────────────────────────────
  if (loading && users.length === 0) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-accent" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="section-title mb-4">Panel de Administración</h2>

      {/* ── Filters bar ──────────────────────────────── */}
      <div className="card p-3 mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-4">
            <label className="form-label small text-secondary mb-1">
              Buscar
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small text-secondary mb-1">
              Rol
            </label>
            <select
              className="form-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small text-secondary mb-1">
              Estado
            </label>
            <select
              className="form-select"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small text-secondary mb-1">
              Desde
            </label>
            <input
              type="date"
              className="form-control"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small text-secondary mb-1">
              Hasta
            </label>
            <input
              type="date"
              className="form-control"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────── */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* ── Stats ─────────────────────────────────────── */}
      <div className="row g-2 mb-3">
        <div className="col-6 col-md-3">
          <div className="card p-2 text-center">
            <small className="text-secondary">Total</small>
            <strong className="text-accent">{users.length}</strong>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card p-2 text-center">
            <small className="text-secondary">Admins</small>
            <strong>{users.filter((u) => u.role === "admin").length}</strong>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card p-2 text-center">
            <small className="text-secondary">Usuarios</small>
            <strong>{users.filter((u) => u.role === "user").length}</strong>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card p-2 text-center">
            <small className="text-secondary">Activos</small>
            <strong>{users.filter((u) => u.is_active).length}</strong>
          </div>
        </div>
      </div>

      {/* ── Users table ───────────────────────────────── */}
      {users.length === 0 ? (
        <div className="alert alert-secondary text-center">
          No se encontraron usuarios con esos filtros.
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table table-dark table-hover mb-0">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}></th>
                  <th>Email</th>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Activo</th>
                  <th>Registrado</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isExpanded = expandedUserId === u.id;
                  const bookings = userBookings.get(u.id);
                  const isLoadingBookings = bookingsLoading.has(u.id);

                  return (
                    <tr key={u.id}>
                      <td colSpan={6} className="p-0">
                        {/* Main row */}
                        <table className="table table-dark table-hover mb-0 w-100">
                          <tbody>
                            <tr
                              onClick={() => toggleUser(u.id)}
                              style={{ cursor: "pointer" }}
                              className={isExpanded ? "table-active" : ""}
                            >
                              <td style={{ width: "40px" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    transition: "transform 0.2s",
                                    transform: isExpanded
                                      ? "rotate(90deg)"
                                      : "rotate(0deg)",
                                  }}
                                >
                                  ▶
                                </span>
                              </td>
                              <td>
                                <strong>{u.email}</strong>
                              </td>
                              <td>{u.name || "—"}</td>
                              <td>
                                <span
                                  className={`badge ${
                                    u.role === "admin"
                                      ? ""
                                      : "bg-secondary"
                                  }`}
                                  style={
                                    u.role === "admin"
                                      ? { backgroundColor: "var(--accent)" }
                                      : undefined
                                  }
                                >
                                  {u.role}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    u.is_active ? "bg-success" : "bg-danger"
                                  }`}
                                >
                                  {u.is_active ? "Sí" : "No"}
                                </span>
                              </td>
                              <td>{formatDate(u.created_at)}</td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Expanded: bookings panel */}
                        {isExpanded && (
                          <div className="px-4 pb-3">
                            <div
                              className="rounded p-3"
                              style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                            >
                              <h6 className="mb-3" style={{ color: "var(--accent)" }}>
                                Reservas de {u.name || u.email}
                              </h6>

                              {isLoadingBookings ? (
                                <div className="text-center py-2">
                                  <div
                                    className="spinner-border spinner-border-sm text-accent"
                                    role="status"
                                  >
                                    <span className="visually-hidden">
                                      Cargando...
                                    </span>
                                  </div>
                                </div>
                              ) : bookings && bookings.length > 0 ? (
                                <div className="row g-2">
                                  {bookings.map((b) => (
                                    <div
                                      key={b.id}
                                      className="col-12 col-lg-6"
                                    >
                                      <div
                                        className="p-2 rounded"
                                        style={{
                                          backgroundColor:
                                            "rgba(255,255,255,0.05)",
                                        }}
                                      >
                                        <div className="d-flex justify-content-between align-items-start">
                                          <div>
                                            <strong className="small">
                                              #{b.id}
                                            </strong>{" "}
                                            <span className="small">
                                              {b.movie_title}
                                            </span>
                                          </div>
                                          <span
                                            className={`badge ${statusBadge(
                                              b.status
                                            )} small`}
                                          >
                                            {statusLabel(b.status)}
                                          </span>
                                        </div>
                                        <div className="small text-secondary mt-1">
                                          {b.theater_name} —{" "}
                                          {formatDateTime(b.start_time)}
                                        </div>
                                        <div className="small mt-1">
                                          <strong>Asientos:</strong>{" "}
                                          {b.seats
                                            .map((s) => s.seat_label)
                                            .join(", ")}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-secondary small mb-0">
                                  No tiene reservas.
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
