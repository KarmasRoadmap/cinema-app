import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { changePassword } from "../services/api";

export default function ChangePasswordPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      setSuccess(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6 col-lg-5">
          <h2 className="section-title mb-4">Cambiar contraseña</h2>

          {success ? (
            <div className="card p-4 text-center">
              <div className="mb-3" style={{ fontSize: "3rem" }}>🔐</div>
              <h5>Contraseña actualizada</h5>
              <p className="text-secondary small">
                Tu contraseña ha sido cambiada exitosamente.
              </p>
              <button
                className="btn btn-accent"
                onClick={() => navigate("/")}
              >
                Volver al inicio
              </button>
            </div>
          ) : (
            <div className="card p-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="old-password" className="form-label">
                    Contraseña actual
                  </label>
                  <input
                    type="password"
                    id="old-password"
                    className="form-control"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="new-password" className="form-label">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    id="new-password"
                    className="form-control"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="confirm-password" className="form-label">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    id="confirm-password"
                    className="form-control"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="alert alert-danger py-2 small">{error}</div>
                )}

                <button
                  type="submit"
                  className="btn btn-accent w-100"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Cambiando...
                    </>
                  ) : (
                    "Cambiar contraseña"
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
