import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // Validaciones client-side
    if (!email.trim() || !name.trim() || !password || !confirmPassword) {
      setError("Todos los campos son obligatorios");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Ingresa un email válido");
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      navigate("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al registrarse"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card p-4">
            <h2 className="text-center mb-4" style={{ color: "var(--accent)" }}>
              Crear Cuenta
            </h2>

            {error && (
              <div className="alert alert-danger py-2 small">{error}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label" htmlFor="reg-name">
                  Nombre
                </label>
                <input
                  id="reg-name"
                  type="text"
                  className="form-control bg-dark text-white border-secondary"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  autoComplete="name"
                />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="reg-email">
                  Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  className="form-control bg-dark text-white border-secondary"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="reg-password">
                  Contraseña
                </label>
                <input
                  id="reg-password"
                  type="password"
                  className="form-control bg-dark text-white border-secondary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="reg-confirm">
                  Confirmar Contraseña
                </label>
                <input
                  id="reg-confirm"
                  type="password"
                  className="form-control bg-dark text-white border-secondary"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="btn btn-accent w-100 mb-3"
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm me-2" />
                ) : null}
                Registrarse
              </button>
            </form>

            <p className="text-center text-secondary mb-0 small">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" style={{ color: "var(--accent)" }}>
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
