import { useEffect, useState, useCallback, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getAdminUserBookings,
  getDashboardStats,
  downloadReportPdf,
} from "../services/api";
import type { UserProfile, AdminBooking, DashboardStats } from "../types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const BASE_URL =
  (import.meta.env.VITE_API_URL as string) || "/api";

// ── Chart colors ────────────────────────────────────────
const chartColors = {
  accent: "#e94560",
  secondary: "#0f3460",
  purple: "#533483",
  green: "#00b894",
  orange: "#e17055",
  blue: "#0984e3",
  yellow: "#fdcb6e",
};

export default function AdminPage() {
  const { token, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // ── Tab ────────────────────────────────────────────
  const [tab, setTab] = useState<"users" | "dashboard">("users");

  // ── Users tab state ──────────────────────────────────
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [userBookings, setUserBookings] = useState<
    Map<number, AdminBooking[]>
  >(new Map());
  const [bookingsLoading, setBookingsLoading] = useState<Set<number>>(
    new Set()
  );

  // ── Dashboard state ──────────────────────────────────
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

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

  // ── Fetch users ──────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    if (!token) return;
    const params: Record<string, string | undefined> = {};
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (roleFilter) params.role = roleFilter;
    if (activeFilter !== "")
      params.is_active = activeFilter === "true" ? "true" : "false";
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    setLoading(true);
    setError("");
    try {
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
      setUsers((await res.json()) as UserProfile[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar usuarios"
      );
    } finally {
      setLoading(false);
    }
  }, [token, debouncedSearch, roleFilter, activeFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (token && isAuthenticated && user?.role === "admin") {
      fetchUsers();
    }
  }, [fetchUsers, token, isAuthenticated, user]);

  // ── Fetch dashboard ──────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const data = await getDashboardStats();
      setDashboard(data);
    } catch {
      // Dashboard may be empty
    } finally {
      setDashLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "dashboard" && !dashboard) fetchDashboard();
  }, [tab, dashboard, fetchDashboard]);

  // ── Toggle user ──────────────────────────────────────
  const toggleUser = async (userId: number) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(userId);
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

  if (loading && users.length === 0) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-accent" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  const adminCount = users.filter((u) => u.role === "admin").length;
  const userCount = users.filter((u) => u.role === "user").length;
  const activeCount = users.filter((u) => u.is_active).length;

  return (
    <div className="container py-4">
      <h2 className="section-title mb-4">Panel de Administración</h2>

      {/* ── Tab switcher ─────────────────────────────── */}
      <div className="mb-4">
        <div className="btn-group">
          <button
            className={`btn ${tab === "users" ? "btn-accent" : "btn-outline-light"}`}
            onClick={() => setTab("users")}
          >
            👥 Usuarios
          </button>
          <button
            className={`btn ${tab === "dashboard" ? "btn-accent" : "btn-outline-light"}`}
            onClick={() => setTab("dashboard")}
          >
            📊 Dashboard
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
           USERS TAB
          ════════════════════════════════════════════════ */}
      {tab === "users" && (
        <>
          {/* Filters */}
          <div className="card p-3 mb-4">
            <div className="row g-3 align-items-end">
              <div className="col-12 col-md-4">
                <label className="form-label small text-secondary mb-1">Buscar</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nombre o email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label small text-secondary mb-1">Rol</label>
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
                <label className="form-label small text-secondary mb-1">Estado</label>
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
                <label className="form-label small text-secondary mb-1">Desde</label>
                <input
                  type="date"
                  className="form-control"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label small text-secondary mb-1">Hasta</label>
                <input
                  type="date"
                  className="form-control"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>
          {error && <div className="alert alert-danger">{error}</div>}

          {/* Stats */}
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
                <strong>{adminCount}</strong>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card p-2 text-center">
                <small className="text-secondary">Usuarios</small>
                <strong>{userCount}</strong>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card p-2 text-center">
                <small className="text-secondary">Activos</small>
                <strong>{activeCount}</strong>
              </div>
            </div>
          </div>

          {users.length === 0 ? (
            <div className="alert alert-secondary text-center">
              No se encontraron usuarios.
            </div>
          ) : (
            <div className="card">
              <div className="table-responsive">
                <table className="table table-dark table-hover mb-0 align-middle">
                  <thead>
                    <tr>
                      <th style={{ width: "36px" }}></th>
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
                        <Fragment key={u.id}>
                          <tr
                            onClick={() => toggleUser(u.id)}
                            style={{ cursor: "pointer" }}
                            className={isExpanded ? "table-active" : ""}
                          >
                            <td>
                              <span
                                style={{
                                  display: "inline-block",
                                  transition: "transform 0.2s",
                                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                                }}
                              >
                                ▶
                              </span>
                            </td>
                            <td><strong>{u.email}</strong></td>
                            <td>{u.name || "—"}</td>
                            <td>
                              <span
                                className={`badge ${u.role === "admin" ? "" : "bg-secondary"}`}
                                style={u.role === "admin" ? { backgroundColor: "var(--accent)" } : undefined}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${u.is_active ? "bg-success" : "bg-danger"}`}>
                                {u.is_active ? "Sí" : "No"}
                              </span>
                            </td>
                            <td>{formatDate(u.created_at)}</td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="p-0 border-0">
                                <div className="px-4 py-3" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
                                  <h6 className="mb-3" style={{ color: "var(--accent)" }}>
                                    Reservas de {u.name || u.email}
                                  </h6>
                                  {isLoadingBookings ? (
                                    <div className="text-center py-2">
                                      <div className="spinner-border spinner-border-sm text-accent" role="status" />
                                    </div>
                                  ) : bookings && bookings.length > 0 ? (
                                    <div className="row g-2">
                                      {bookings.map((b) => (
                                        <div key={b.id} className="col-12 col-lg-6">
                                          <div className="p-2 rounded" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                                            <div className="d-flex justify-content-between align-items-start">
                                              <div>
                                                <strong className="small">#{b.id}</strong>{" "}
                                                <span className="small">{b.movie_title}</span>
                                              </div>
                                              <span className={`badge ${b.status === "confirmed" ? "bg-success" : "bg-danger"} small`}>
                                                {b.status === "confirmed" ? "Confirmada" : "Cancelada"}
                                              </span>
                                            </div>
                                            <div className="small text-secondary mt-1">
                                              {b.theater_name} — {formatDateTime(b.start_time)}
                                            </div>
                                            <div className="small mt-1">
                                              <strong>Asientos:</strong> {b.seats.map((s) => s.seat_label).join(", ")}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-secondary small mb-0">No tiene reservas.</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════
           DASHBOARD TAB
          ════════════════════════════════════════════════ */}
      {tab === "dashboard" && (
        <>
          {dashLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-accent" role="status" />
            </div>
          ) : dashboard ? (
            <>
              {/* ── KPIs ── */}
              <div className="row g-2 mb-4">
                {[
                  ["Total ventas", dashboard.kpis.total_sales, ""],
                  ["Ingresos", `$${dashboard.kpis.total_revenue.toFixed(2)}`, "text-accent"],
                  ["Boletos", dashboard.kpis.total_tickets, ""],
                  ["Clientes", dashboard.kpis.total_clients, ""],
                  ["Con membresía", dashboard.kpis.with_membership, ""],
                  ["Sin membresía", dashboard.kpis.without_membership, ""],
                  ["Descuentos", `$${dashboard.kpis.total_discounts.toFixed(2)}`, "text-success"],
                  ["Prom. boletos", dashboard.kpis.avg_tickets_per_booking, ""],
                ].map(([label, value, cls]) => (
                  <div key={label as string} className="col-6 col-md-3">
                    <div className="card p-2 text-center">
                      <small className="text-secondary">{label}</small>
                      <strong className={cls as string}>{value}</strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Charts ── */}
              <div className="row g-3 mb-4">
                {/* Sales by day */}
                <div className="col-12">
                  <div className="card p-3">
                    <h6 style={{ color: "var(--accent)" }}>Ventas por día</h6>
                    <div style={{ height: "250px" }}>
                      <Line
                        data={{
                          labels: dashboard.charts.sales_by_day.map((d) =>
                            new Date(d.date!).toLocaleDateString("es-MX", { month: "short", day: "numeric" })
                          ),
                          datasets: [
                            {
                              label: "Ventas",
                              data: dashboard.charts.sales_by_day.map((d) => d.count),
                              borderColor: chartColors.accent,
                              backgroundColor: chartColors.accent + "33",
                              fill: true,
                              tension: 0.3,
                            },
                          ],
                        }}
                        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                      />
                    </div>
                  </div>
                </div>

                {/* Sales by movie */}
                <div className="col-12 col-lg-6">
                  <div className="card p-3">
                    <h6 style={{ color: "var(--accent)" }}>Ventas por película</h6>
                    <div style={{ height: "300px" }}>
                      <Bar
                        data={{
                          labels: dashboard.charts.sales_by_movie.map((d) => d.movie!.slice(0, 20)),
                          datasets: [
                            {
                              label: "Boletos",
                              data: dashboard.charts.sales_by_movie.map((d) => d.count),
                              backgroundColor: chartColors.accent + "99",
                            },
                          ],
                        }}
                        options={{
                          indexAxis: "y" as const,
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Sales by theater */}
                <div className="col-12 col-lg-6">
                  <div className="card p-3">
                    <h6 style={{ color: "var(--accent)" }}>Ventas por sala</h6>
                    <div style={{ height: "300px" }}>
                      <Pie
                        data={{
                          labels: dashboard.charts.sales_by_theater.map((d) => d.theater!),
                          datasets: [
                            {
                              data: dashboard.charts.sales_by_theater.map((d) => d.count),
                              backgroundColor: [
                                chartColors.accent,
                                chartColors.secondary,
                                chartColors.purple,
                                chartColors.blue,
                                chartColors.orange,
                              ],
                            },
                          ],
                        }}
                        options={{ responsive: true, maintainAspectRatio: false }}
                      />
                    </div>
                  </div>
                </div>

                {/* Occupancy */}
                <div className="col-12 col-lg-6">
                  <div className="card p-3">
                    <h6 style={{ color: "var(--accent)" }}>Ocupación por sala (%)</h6>
                    <div style={{ height: "250px" }}>
                      <Bar
                        data={{
                          labels: dashboard.charts.occupancy.map((d) => d.theater),
                          datasets: [
                            {
                              label: "% Ocupación",
                              data: dashboard.charts.occupancy.map((d) => d.occupancy_pct),
                              backgroundColor: chartColors.green + "99",
                            },
                          ],
                        }}
                        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { max: 100 } } }}
                      />
                    </div>
                  </div>
                </div>

                {/* Revenue by movie */}
                <div className="col-12 col-lg-6">
                  <div className="card p-3">
                    <h6 style={{ color: "var(--accent)" }}>Ingresos por película</h6>
                    <div style={{ height: "250px" }}>
                      <Bar
                        data={{
                          labels: dashboard.charts.revenue_by_movie.map((d) => d.movie!.slice(0, 20)),
                          datasets: [
                            {
                              label: "Ingresos $",
                              data: dashboard.charts.revenue_by_movie.map((d) => d.revenue),
                              backgroundColor: chartColors.purple + "99",
                            },
                          ],
                        }}
                        options={{ indexAxis: "y" as const, responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Top 3 / Highlights ── */}
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="card p-3">
                    <small className="text-secondary">Película más vendida</small>
                    <strong>{dashboard.charts.most_sold?.movie || "—"}</strong>
                    {dashboard.charts.most_sold && (
                      <span className="small text-secondary">{dashboard.charts.most_sold.count} boletos</span>
                    )}
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card p-3">
                    <small className="text-secondary">Película menos vendida</small>
                    <strong>{dashboard.charts.least_sold?.movie || "—"}</strong>
                    {dashboard.charts.least_sold && (
                      <span className="small text-secondary">{dashboard.charts.least_sold.count} boletos</span>
                    )}
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card p-3">
                    <small className="text-secondary">Top 3 películas</small>
                    {dashboard.charts.top3_movies.length > 0 ? (
                      <ol className="mb-0 ps-3 small">
                        {dashboard.charts.top3_movies.map((m, i) => (
                          <li key={i}>{m.movie} — {m.count} boletos</li>
                        ))}
                      </ol>
                    ) : (
                      <span className="text-secondary">Sin datos</span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Report downloads ── */}
              <div className="card p-4">
                <h6 style={{ color: "var(--accent)" }}>Reportes descargables</h6>
                <div className="d-flex gap-2 flex-wrap">
                  <button className="btn btn-outline-light" onClick={() => downloadReportPdf("sales")}>
                    📥 Reporte de ventas
                  </button>
                  <button className="btn btn-outline-light" onClick={() => downloadReportPdf("movies")}>
                    📥 Reporte por película
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="alert alert-secondary text-center">
              No hay datos de dashboard disponibles. Realiza algunas reservas primero.
            </div>
          )}
        </>
      )}
    </div>
  );
}
