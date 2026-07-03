import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isActive = (path: string) =>
    location.pathname === path ? "nav-link active" : "nav-link";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container">
        <Link className="navbar-brand" to="/">
          <span className="brand-text">CINEMA</span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-lg-center">
            <li className="nav-item">
              <Link className={isActive("/")} to="/">
                Home
              </Link>
            </li>
            <li className="nav-item">
              <Link className={isActive("/my-bookings")} to="/my-bookings">
                Mis Reservas
              </Link>
            </li>

            {isAuthenticated && user ? (
              <>
                {user.role === "admin" && (
                  <li className="nav-item">
                    <Link className={isActive("/admin")} to="/admin">
                      Admin
                    </Link>
                  </li>
                )}
                <li className="nav-item">
                  <span className="nav-link text-secondary small">
                    {user.email}
                  </span>
                </li>
                <li className="nav-item">
                  <button
                    className="nav-link btn btn-link text-secondary border-0"
                    onClick={handleLogout}
                    style={{ cursor: "pointer" }}
                  >
                    Cerrar sesión
                  </button>
                </li>
              </>
            ) : (
              <li className="nav-item">
                <Link className={isActive("/login")} to="/login">
                  Iniciar sesión
                </Link>
              </li>
            )}

            {/* Theme toggle */}
            <li className="nav-item ms-2">
              <button
                className="btn btn-sm theme-toggle"
                onClick={toggleTheme}
                title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
                aria-label="Cambiar tema"
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
