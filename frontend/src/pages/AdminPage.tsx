import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserProfile } from "../types";

const BASE_URL =
  (import.meta.env.VITE_API_URL as string) || "http://localhost:8000/api";

export default function AdminPage() {
  const { token, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !token) {
      navigate("/login");
      return;
    }
    if (user && user.role !== "admin") {
      navigate("/");
      return;
    }

    const fetchUsers = async () => {
      try {
        const res = await fetch(`${BASE_URL}/users/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          throw new Error("No autorizado");
        }
        const data = (await res.json()) as UserProfile[];
        setUsers(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cargar usuarios"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isAuthenticated, token, user, navigate]);

  if (loading) {
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

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="card-body">
          <h5 className="card-title mb-3" style={{ color: "var(--accent)" }}>
            Usuarios Registrados
          </h5>

          {users.length === 0 ? (
            <p className="text-secondary">No hay usuarios registrados.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-dark table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Activo</th>
                    <th>Registrado</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>{u.name || "—"}</td>
                      <td>{u.email}</td>
                      <td>
                        <span
                          className={`badge ${
                            u.role === "admin" ? "bg-accent" : "bg-secondary"
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
                      <td>
                        {new Date(u.created_at).toLocaleDateString("es-MX")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
